import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ClipboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { AppShell } from "@/components/app-shell";
import { WorkbenchCursorLayout } from "@/components/workbench-cursor-layout";
import { getDesktop } from "@/lib/desktop-api";
import {
  AUTO_MODEL_ID,
  chatSettingsPreservePayload,
  isAutoModelSelection,
  loadChatModelPools,
  parseAgentModelFromFrontmatter,
  resolveModelForExecution,
} from "@/lib/model-catalog";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import {
  useOrchestrationExecution,
  useChatSessionRevision,
} from "@/hooks/use-orchestration-execution";
import { buildClaudeCodePrompt } from "@/lib/claude-prompt";
import { type PriorTurn, type UserImageAttachment } from "@/lib/ollama-messages";
import {
  ingestWorkspaceWritesAndCollapseDisplay,
  ingestChainStepWorkspaceWrites,
  stripLargeAssistantArtifacts,
} from "@/lib/assistant-reply";
import { parseActiveChainFromBubbleText } from "@/lib/parse-active-chain";
import { autoSaveChainFromReply, notifyAutoSavedChain, saveChainFromBubbleText } from "@/lib/auto-save-chain-from-reply";
import { discoverWbsDocument } from "@/lib/discover-wbs-document";
import { handleChainChatCommand } from "@/lib/run-chain-from-chat";
import { syncOfficialGenericChains } from "@/lib/sync-official-chains";
import { buildAgentChainCatalogMarkdown } from "@/lib/agent-chain-catalog";
import { parseChainCommand } from "@/lib/parse-chain-command";
import { resolveAgentForTurn } from "@/lib/resolve-agent-for-turn";
import { resolveAgentDisplayName } from "@/lib/agent-display-name";
import { maybeToastMissingWorkspaceWrite } from "@/lib/maybe-toast-workspace-write";
import { restoreUserMsgToComposer } from "@/lib/restore-user-composer";
import { buildConfirmWriteItems, isConfirmWriteOnlyMessage, isBulkWriteProjectMessage } from "@/lib/confirm-write";
import { performBulkWriteFromHistory } from "@/lib/bulk-write-from-history";
import { runProjectFromChat } from "@/lib/run-project-in-terminal";
import {
  isProjectPreviewMessage,
  isStopPreviewMessage,
  performStopPreview,
} from "@/lib/project-preview";
import { isOpenTerminalMessage } from "@/lib/workspace-terminal-client";
import { agentAutoWritesToProject } from "@/lib/write-policy";
import { defaultArtifactPathForAgent } from "@/lib/agent-artifact-paths";
import { expandUserLineWithWorkspaceFiles } from "@/lib/expand-user-line-workspace-files";
import { buildAgentRoutedInstruction } from "@/lib/agent-skill-routing";
import { toast } from "sonner";
import {
  Plus, Zap, PenLine, Code2, Image as ImageIcon, Presentation, Play, MoreHorizontal,
  Send, X, Paperclip, Github, Sparkles, Circle, Diamond, Check,
  ArrowLeftRight, Flashlight, Disc, Music, CheckSquare, PieChart, Sparkle,
  Square, AlignJustify, AlignLeft, Menu, ChevronDown, PanelRightOpen,
  StopCircle, RotateCcw, Save, Waypoints, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatComposerCursor } from "@/components/chat-composer-cursor";
import type { ChatComposerShellProps } from "@/components/chat-composer-shell";
import { ChatMessagesPane } from "@/components/chat-messages-pane";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ChatPanelToolbar } from "@/components/chat-panel-toolbar";
import { ChatResendConfirmDialog } from "@/components/chat-resend-confirm-dialog";
import { toChatHistoryListItem } from "@/lib/chat-history-groups";
import { sortSessionsByLatest } from "@/lib/chat-session-activity";
import { shouldSkipCheckpointConfirm } from "@/lib/chat-checkpoint-prefs";
import {
  filterSessionsForWorkspace,
  filterSessionsForWorkspaceTabs,
  findReusableEmptySession,
  pickActiveSessionId,
  pruneDuplicateEmptySessions,
  resolveWorkspaceChatSessions,
  sessionMatchesWorkspaceTab,
  stampSessionWorkspaceIfMissing,
  workspaceSessionKey,
} from "@/lib/chat-session-workspace";
import { type PendingTerminalSnippet } from "@/components/composer-terminal-attachments";
import { trimTerminalDisplay } from "@/lib/chat-terminal-paste";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";
import { chatRouteSearch, EMPTY_CHAT_SEARCH } from "@/lib/chat-route-search";
import type { DesktopApi } from "@/types/desktop";

type OrchMode = "claude-code" | "local-mcp";

function fullChatSettingsPayload(
  s: Awaited<ReturnType<DesktopApi["getChatSettings"]>>,
): Parameters<DesktopApi["saveChatSettings"]>[0] {
  return chatSettingsPreservePayload(s);
}

/** 本地 MCP 编排返回的 orchestrationHints（如 Ollama 曾拒绝 tools 而已降级重试） */
function toastIfLocalOrchestrationHints(res: unknown) {
  const hints = (res as { orchestrationHints?: string[] })?.orchestrationHints;
  if (!Array.isArray(hints) || !hints.some((s) => String(s ?? "").trim())) return;
  toast.warning(
    hints
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join("\n"),
    { duration: 10_000 },
  );
}

/** ingest 阶段解析/虚构落盘等提示（须先于气泡落库展示） */
function toastIngestWorkspaceHint(msg: string) {
  toast.warning(msg, { duration: 12_000 });
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    session:
      typeof search.session === "string" && search.session.trim()
        ? search.session.trim()
        : undefined,
    new: search.new === "1" || search.new === true ? true : undefined,
    claudeResume:
      typeof search.claudeResume === "string" && search.claudeResume.trim()
        ? search.claudeResume.trim()
        : undefined,
  }),
  head: () => ({ meta: [{ title: "聊天 · Claude Workbench" }] }),
  component: ChatPage,
});

type DiskMsg = {
  role: "user" | "assistant";
  content: string;
  ts?: number;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  /** 本轮若由 /agent 或底部 Agent pill 触发，记录 stem 便于气泡展示 */
  agentStem?: string;
  /** 界面展示用中文 Agent 名（与 agentStem 对应，不影响执行） */
  agentLabel?: string;
  /** Ollama /v1/chat/completions 返回的 usage，assistant 且模型上报时有值 */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latencyMs?: number;
  requestError?: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  modelId: string;
  history: DiskMsg[];
  workspacePath?: string | null;
  /** Claude Code CLI --resume / --session-id */
  claudeSessionId?: string | null;
};

function needsCheckpointConfirm(sess: ChatSession | undefined, historyIndex: number): boolean {
  if (!sess) return false;
  return historyIndex < sess.history.length - 1;
}

/** 磁盘同步时保留内存里更完整的 history，避免 save→reload 竞态清空当前 tab */
function mergeSessionsPreferLongerHistory(
  local: ChatSession[],
  disk: ChatSession[],
  sendingById: Record<string, boolean>,
): ChatSession[] {
  const localById = new Map(local.map((s) => [s.id, s]));
  const merged: ChatSession[] = [];
  for (const d of disk) {
    const l = localById.get(d.id);
    if (!l) {
      merged.push(d);
      continue;
    }
    const keepLocal =
      l.history.length > d.history.length ||
      (l.history.length === d.history.length && Boolean(sendingById[l.id]));
    merged.push(
      keepLocal
        ? { ...l, title: d.title || l.title, modelId: d.modelId || l.modelId }
        : { ...d, modelId: d.modelId || l.modelId },
    );
    localById.delete(d.id);
  }
  for (const l of localById.values()) merged.push(l);
  return merged;
}

const EMPTY_SESSION_WELCOME = "新对话已开始。";

type Msg = {
  role: "user" | "assistant";
  name?: string;
  time?: string;
  content: string;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  historyIndex?: number;
};

/** 旧版任务链写入的超长「用户」气泡，在列表中折叠为摘要（不改磁盘时可逆：仅展示层）。 */
function shortenLegacyChainUserBubbleForDisplay(raw: string): string {
  const t = raw.trim();
  if (t.length < 480) return raw;
  const hasVerboseHints =
    t.includes("【任务上下文】") ||
    t.includes("【自动路由】") ||
    t.includes("【执行约束】") ||
    /^\/agent\s+\S+/i.test(t) ||
    t.includes("【任务链 Agent 路由】");
  if (!hasVerboseHints) return raw;
  if (t.includes("【任务上下文】")) {
    const head = t.slice(0, 900);
    const ag = head.match(/\bagent\s*=\s*([^；\s\n]+)/i);
    const tid = head.match(/\btaskId\s*=\s*([^；\s\n]+)/i);
    if (ag && tid) {
      const snip = t
        .split("\n")
        .find((l) => {
          const s = l.trim();
          return s.length > 0 && !/^【任务上下文】/.test(s) && !/^【执行约束】/.test(s) && !/^【自动路由】/.test(s);
        })
        ?.replace(/\s+/g, " ")
        .trim()
        .slice(0, 140);
      return `【任务链】${ag[1]} · ${tid[1]}${snip ? `\n${snip}${snip.length >= 140 ? "…" : ""}` : ""}`;
    }
  }
  const claude = t.match(/【任务链 Agent 路由】global:\/\/(\S+)（任务\s*([^）]+)）/);
  if (claude) {
    const line = t.split("\n").find((l) => l.trim().startsWith("【任务】"))?.trim().slice(0, 120);
    return `【任务链】${claude[1]} · ${claude[2].trim()}${line ? `\n${line}${line.length >= 120 ? "…" : ""}` : ""}`;
  }
  const local = t.match(/^\/agent\s+(\S+)\s*（任务\s*([^）]+)）/);
  if (local) {
    const rest = t.slice(local[0].length).trim();
    const first = rest.split("\n").find((l) => l.trim().length > 0) ?? "";
    const snip = first.replace(/\s+/g, " ").slice(0, 140);
    return `【任务链】${local[1]} · ${local[2].trim()}${snip ? `\n${snip}${first.length > 140 ? "…" : ""}` : ""}`;
  }
  return raw;
}


function lastAgentStemFromHistory(hist: DiskMsg[]): string | undefined {
  for (let i = hist.length - 1; i >= 0; i--) {
    const m = hist[i];
    if (m.role === "assistant" && m.agentStem) return m.agentStem;
    if (m.role === "user") {
      const cmd = parseAgentCommand(m.content);
      if (cmd.matched) return cmd.stem;
    }
  }
  return undefined;
}

function assistantBubbleName(
  m: Pick<DiskMsg, "agentStem" | "agentLabel">,
  modelLabel: string,
): string {
  if (m.agentStem) {
    const label = m.agentLabel?.trim() || m.agentStem;
    return `@${label} · ${modelLabel}`;
  }
  return modelLabel;
}

function diskToDisplay(list: DiskMsg[], modelLabel: string): Msg[] {
  return list.map((m, historyIndex) => ({
    role: m.role,
    content:
      m.role === "user"
        ? shortenLegacyChainUserBubbleForDisplay(m.content)
        : stripLargeAssistantArtifacts(m.content),
    name: m.role === "assistant" ? assistantBubbleName(m, modelLabel) : undefined,
    time: m.ts ? new Date(m.ts).toLocaleString() : undefined,
    attachments: m.role === "user" && m.attachments?.length ? m.attachments : undefined,
    terminalSnippets:
      m.role === "user" && m.terminalSnippets?.length ? m.terminalSnippets : undefined,
    historyIndex: m.role === "user" ? historyIndex : undefined,
  }));
}

function userMessageForHistoryIndex(
  history: DiskMsg[],
  historyIndex: number,
  modelLabel: string,
): Msg | null {
  const msg = history[historyIndex];
  if (!msg || msg.role !== "user") return null;
  const users = diskToDisplay(history.slice(0, historyIndex + 1), modelLabel).filter(
    (m) => m.role === "user",
  );
  return users[users.length - 1] ?? null;
}

function newLocalId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildComposerUserLine(text: string, terminalSnippets: PendingTerminalSnippet[]): string {
  const terminalPart = terminalSnippets
    .map((s) => trimTerminalDisplay(s.text))
    .filter(Boolean)
    .join("\n\n");
  if (text && terminalPart) return `${text}\n\n${terminalPart}`;
  return text || terminalPart;
}

/** 按编排模式从池中选取会话 modelId；Auto 保留为 auto 哨兵值 */
function pickOrchestratorModel(raw: string | undefined, pool: string[], mode: OrchMode): string {
  const t = raw?.trim() ?? "";
  if (isAutoModelSelection(t)) return AUTO_MODEL_ID;
  const list = pool.filter(Boolean);
  if (t && list.includes(t)) return t;
  if (mode === "claude-code" && /^(sonnet|opus|haiku|claude-)/i.test(t)) return t;
  if (t) return t;
  return AUTO_MODEL_ID;
}

function extractPreviewUrlFromText(text: string): string | null {
  const t = String(text || "");
  const m = t.match(/\bhttps?:\/\/[^\s)]+/i);
  if (m?.[0]) return m[0];
  const m2 = t.match(/\blocalhost:\d{2,5}\b/i);
  if (m2?.[0]) return `http://${m2[0]}`;
  const m3 = t.match(/\b127\.0\.0\.1:\d{2,5}\b/i);
  if (m3?.[0]) return `http://${m3[0]}`;
  return null;
}

function priorTurnsToOrchestrationMessages(prior: PriorTurn[]): PriorTurn[] {
  return prior.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    ...(m.attachments?.length ? { attachments: m.attachments } : {}),
  }));
}

/** 将 RPC 失败映射为聊天区可见文案（超时/429 须展示具体原因，勿一律「生成已停止」） */
function formatAssistantFailure(res: {
  aborted?: boolean;
  error?: string | null;
}): string {
  const err = String(res.error || "").trim();
  if (res.aborted || res.error === "请求已取消") {
    if (err && (/超时|429|quota|配额|频率/i.test(err) || err.length > 20)) {
      return `请求失败：${err}`;
    }
    return "（生成已停止）";
  }
  return `请求失败：${err || "未知错误"}`;
}

function ChatPage() {
  const hasDesktopApi = useHasDesktop();
  const navigate = useNavigate();
  const { session: urlSessionId, new: urlNewSession, claudeResume: urlClaudeResume } =
    Route.useSearch();
  const urlSessionHandledRef = useRef<string | null>(null);
  const urlNewHandledRef = useRef(false);
  const urlClaudeResumeHandledRef = useRef<string | null>(null);
  const {
    chainRunning,
    chainStatusBadge,
    runOrchestrationChain,
    stopChainExecution,
    syncExecutionState,
  } = useOrchestrationExecution();
  const sessionRevision = useChatSessionRevision();
  const [input, setInput] = useState("");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string>("快速");
  /** 「图像生成」内 图像/视频 分段：选「视频」时工具栏与独立「视频生成」技能一致 */
  const [imageVideoSegment, setImageVideoSegment] = useState<"图像" | "视频">("图像");
  const [speedOpen, setSpeedOpen] = useState(false);
  const [lengthOpen, setLengthOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [ratio, setRatio] = useState("16:9");
  const [length, setLength] = useState("适中");
  const [speed, setSpeed] = useState("快速");
  const [styleOpen, setStyleOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [style, setStyle] = useState("电影写真");
  const [tpl, setTpl] = useState<string | null>(null);
  const [githubOpen, setGithubOpen] = useState(false);
  /** 图像/视频技能条上的「选用模型」标签，与本地 Ollama 列表一致（仅增强提示词，发送仍用上方会话模型） */
  const [imageModel, setImageModel] = useState("");
  const [videoModel, setVideoModel] = useState("");
  const [imgModelOpen, setImgModelOpen] = useState(false);
  const [vidModelOpen, setVidModelOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const inlineTaRef = useRef<HTMLTextAreaElement>(null);
  /** 非 Electron（浏览器预览）时的附件兜底 */
  const attachInputRef = useRef<HTMLInputElement>(null);
  /** 输入框内待发送的图片（粘贴 / 选图），样式贴近 Cursor 附件条 */
  const [pendingImages, setPendingImages] = useState<(UserImageAttachment & { id: string })[]>([]);
  const [pendingTerminalSnippets, setPendingTerminalSnippets] = useState<PendingTerminalSnippet[]>([]);
  const [editHistoryIndex, setEditHistoryIndex] = useState<number | null>(null);
  const editHistoryIndexRef = useRef<number | null>(null);
  const [editComposer, setEditComposer] = useState<{
    input: string;
    pendingImages: (UserImageAttachment & { id: string })[];
    pendingTerminalSnippets: PendingTerminalSnippet[];
  } | null>(null);
  const editComposerRef = useRef<typeof editComposer>(null);
  const sendPayloadOverrideRef = useRef<{
    text: string;
    pendingImages: (UserImageAttachment & { id: string })[];
    pendingTerminalSnippets: PendingTerminalSnippet[];
    editCutoff: number;
  } | null>(null);
  const activeRequestIdsRef = useRef<Map<string, string>>(new Map());
  const streamContextRef = useRef<{ sessionId: string; requestId: string } | null>(null);
  const sendingSessionsRef = useRef<Record<string, boolean>>({});
  const composerDraftsRef = useRef<
    Record<
      string,
      {
        input: string;
        pendingImages: (UserImageAttachment & { id: string })[];
        pendingTerminalSnippets: PendingTerminalSnippet[];
      }
    >
  >({});
  const chatBodyMountRef = useRef<HTMLDivElement | null>(null);
  const [chatBodyMountEl, setChatBodyMountEl] = useState<HTMLDivElement | null>(null);

  const onChatBodyMountRef = useCallback((el: HTMLDivElement | null) => {
    chatBodyMountRef.current = el;
    setChatBodyMountEl(el);
  }, []);

  const insertTerminalSelection = useCallback((payload: TerminalSelectionPayload) => {
    const trimmed = payload.text.trim();
    if (!trimmed) return;
    setPendingTerminalSnippets((prev) => [
      ...prev,
      {
        id: newLocalId(),
        text: trimmed,
        sourceLabel: payload.sourceLabel,
        startLine: payload.startLine,
        endLine: payload.endLine,
      },
    ]);
    requestAnimationFrame(() => taRef.current?.focus());
  }, []);

  const openChatPanel = useCallback(() => {
    setChatPanelOpen(true);
  }, []);

  const pickLocalFiles = useCallback(async (opts?: { onlyImages?: boolean }) => {
    const onlyImages = opts?.onlyImages ?? false;
    const api = getDesktop();
    const appendPaths = (paths: string[]) => {
      if (!paths.length) return;
      const note = paths.map((p) => `[附件: ${p}]`).join("\n");
      setInput((prev) => (prev.trim() ? `${prev.trim()}\n${note}` : note));
    };
    if (api?.chooseReferenceFiles) {
      const r = await api.chooseReferenceFiles({ multiple: true, onlyImages });
      if (r.canceled || !r.filePaths.length) return;
      if (onlyImages && api.readReferenceFilesAsImageAttachments) {
        const read = await api.readReferenceFilesAsImageAttachments(r.filePaths);
        const items = read?.items ?? [];
        if (read?.ok && items.length) {
          setPendingImages((p) => [
            ...p,
            ...items.map((it) => ({
              kind: "image" as const,
              name: it.name,
              mime: it.mime,
              dataUrl: it.dataUrl,
              id: newLocalId(),
            })),
          ]);
        }
        return;
      }
      appendPaths(r.filePaths);
      return;
    }
    const inp = attachInputRef.current;
    if (inp) {
      inp.accept = onlyImages ? "image/*" : "";
      inp.multiple = true;
      inp.click();
    }
  }, []);

  const onAttachInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!files?.length) return;
    const list = Array.from(files);
    const allImg = list.every((f) => f.type.startsWith("image/"));
    if (allImg) {
      for (const f of list) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setPendingImages((p) => [
            ...p,
            {
              id: newLocalId(),
              kind: "image",
              name: f.name,
              mime: f.type,
              dataUrl,
            },
          ]);
        };
        reader.readAsDataURL(f);
      }
      e.target.value = "";
      return;
    }
    const names = list.map((f) => f.name);
    const note = names.map((n) => `[附件: ${n}]`).join("\n");
    setInput((prev) => (prev.trim() ? `${prev.trim()}\n${note}` : note));
    e.target.value = "";
  }, []);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState("s0");
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const workspacePathRef = useRef<string | null>(null);
  const activeByWorkspaceRef = useRef<Record<string, string>>({});
  const pendingHistorySessionRef = useRef<string | null>(null);
  const [checkpointConfirm, setCheckpointConfirm] = useState<{
    historyIndex: number;
    action: "edit" | "resend";
  } | null>(null);
  const activeIdRef = useRef(activeId);
  const sessionsRef = useRef<ChatSession[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sendingSessions, setSendingSessions] = useState<Record<string, boolean>>({});
  const setSessionSending = useCallback((sessionId: string, value: boolean) => {
    setSendingSessions((prev) => {
      const next = !value
        ? (() => {
            const { [sessionId]: _removed, ...rest } = prev;
            return rest;
          })()
        : { ...prev, [sessionId]: true };
      sendingSessionsRef.current = next;
      return next;
    });
  }, []);
  const switchActiveSession = useCallback((id: string) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);
  const sending = Boolean(sendingSessions[activeId]);
  const [stopRequested, setStopRequested] = useState(false);
  const workflowBusy = sending || chainRunning;
  const [globalModel, setGlobalModel] = useState("");
  /** Claude Code CLI `--model` 别名列表（编排层，来自 claudeCodeListModels） */
  const [orchestratorModels, setOrchestratorModels] = useState<string[]>([]);
  /** 本机 Ollama `/api/tags` 模型名（仅展示与写入 MCP 建议，对话不经桌面直连 Ollama） */
  const [localOllamaTags, setLocalOllamaTags] = useState<string[]>([]);
  /** 编排：Claude Code CLI（需登录）或本机 Ollama + MCP（无需 Anthropic） */
  const [orchMode, setOrchMode] = useState<OrchMode>("claude-code");
  /** 默认注入的 ~/.claude/agents 规则文件 */
  const [localAgentBasename, setLocalAgentBasename] = useState("");

  const agentDisplayByStemRef = useRef<Map<string, string>>(new Map());

  const reloadAgentDisplayMap = useCallback(async () => {
    const api = getDesktop();
    if (!api?.listClaudeAgentMarkdown) return;
    const r = await api.listClaudeAgentMarkdown();
    if (!r.ok || !r.items) return;
    const map = new Map<string, string>();
    for (const row of r.items) {
      map.set(
        row.stem,
        row.displayName?.trim() ||
          resolveAgentDisplayName({
            stem: row.stem,
            basename: row.basename,
            name: row.name,
            nameZh: row.nameZh,
            heading: row.heading,
            description: row.description,
          }),
      );
    }
    agentDisplayByStemRef.current = map;
  }, []);

  const stemAgentMeta = useCallback((stem: string): Pick<DiskMsg, "agentStem" | "agentLabel"> => {
    return {
      agentStem: stem,
      agentLabel: agentDisplayByStemRef.current.get(stem) || stem,
    };
  }, []);

  const sendingRef = useRef(false);

  const streamScrollKey = (() => {
    const last = messages[messages.length - 1];
    if (!last) return "0";
    return `${messages.length}:${last.role}:${last.content.length}`;
  })();

  const {
    scrollAreaRef,
    messagesEndRef,
    composerDockRef,
    composerDockHeight,
    showJumpLatest,
    jumpToLatest,
    resetScrollFollow,
  } = useChatScroll({
    messages,
    activeId,
    sending: sending || chainRunning,
    streamScrollKey,
    layoutFreezeDeps: [terminalOpen, leftSidebarOpen, chatPanelOpen],
  });

  useChatStream({
    activeSessionId: activeId,
    requestId: streamContextRef.current?.requestId ?? null,
    enabled: sending,
    onDelta: (_sessionId, chunk) => {
      const ctx = streamContextRef.current;
      if (!ctx || !chunk) return;
      if (ctx.sessionId !== activeIdRef.current) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        const nextContent =
          last.content === "__WAITING__" ? chunk : `${last.content}${chunk}`;
        return [...prev.slice(0, -1), { ...last, content: nextContent }];
      });
    },
  });

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    sendingRef.current = sending || chainRunning;
    if (!sending) setStopRequested(false);
  }, [sending, chainRunning]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "`" || (!ev.metaKey && !ev.ctrlKey)) return;
      const t = ev.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
        return;
      }
      ev.preventDefault();
      setTerminalOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    editHistoryIndexRef.current = editHistoryIndex;
  }, [editHistoryIndex]);

  useEffect(() => {
    editComposerRef.current = editComposer;
  }, [editComposer]);

  const persist = useCallback(async (nextSessions: ChatSession[], nextActive: string) => {
    const api = getDesktop();
    if (!api) return;
    const wsKey = workspaceSessionKey(workspacePathRef.current);
    activeByWorkspaceRef.current = {
      ...activeByWorkspaceRef.current,
      [wsKey]: nextActive,
    };
    await api.saveChatSessions({
      activeId: nextActive,
      activeByWorkspace: activeByWorkspaceRef.current,
      sessions: nextSessions,
    });
  }, []);

  /** 单会话增量更新并落盘，避免并发 send 用陈旧 sessions 覆盖其它 tab 历史 */
  const patchSession = useCallback(
    async (
      sessionId: string,
      patch: (session: ChatSession) => ChatSession,
      persistActiveId = activeIdRef.current,
    ): Promise<ChatSession[]> => {
      let nextSessions: ChatSession[] = [];
      setSessions((prev) => {
        nextSessions = prev.map((s) => (s.id === sessionId ? patch(s) : s));
        sessionsRef.current = nextSessions;
        return nextSessions;
      });
      await persist(nextSessions, persistActiveId);
      return nextSessions;
    },
    [persist],
  );

  /** 统一写入 agent_exec，供日报与日志追踪 */
  const appendAgentExecEvent = useCallback(
    async (payload: {
      agent: string;
      mode: OrchMode;
      source: "chat_command" | "chain_step";
      phase?: "start" | "end";
      taskId?: string;
      instruction?: string;
      modelId?: string;
    }) => {
      const api = getDesktop();
      if (!api?.memoryAppendEvent) return;
      try {
        await api.memoryAppendEvent({
          type: "agent_exec",
          agent: payload.agent,
          mode: payload.mode,
          source: payload.source,
          phase: payload.phase ?? "exec",
          taskId: payload.taskId ?? "",
          modelId: payload.modelId ?? "",
          instruction_preview: String(payload.instruction ?? "").slice(0, 240),
        });
      } catch {
        /* ignore */
      }
    },
    [],
  );

  /** 将给定正文写入工作区（与底部「确认写入」同源）；`userLineContent` 记入账本的用户气泡文案 */
  const performConfirmWriteForText = useCallback(
    async (rawContent: string, userLineContent: string) => {
      const api = getDesktop();
      if (!api?.workspaceApplyWriteFence) {
        toast.error("当前无法写入工作区。");
        return;
      }
      const trimmed = typeof rawContent === "string" ? rawContent.trim() : "";
      if (!trimmed || trimmed === "__WAITING__") {
        toast.warning("无可写入的正文。");
        return;
      }
      const settings = await api.getChatSettings();
      const defaultPath = settings.defaultConfirmWritePath?.trim() || "docs/prd.md";
      const sess = sessions.find((s) => s.id === activeId);
      if (!sess) return;
      const agentStem = lastAgentStemFromHistory(sess.history);
      const items = buildConfirmWriteItems(trimmed, defaultPath, agentStem);
      if (!items.length) {
        toast.warning("内容经处理后为空，无法写入。");
        return;
      }
      setStopRequested(false);
      setSessionSending(activeId, true);
      try {
        const res = await api.workspaceApplyWriteFence(items);
        const written = res?.written ?? [];
        if (written.length > 0) {
          const pathNote = agentStem
            ? `\n（按 Agent \`${agentStem}\` → \`${defaultArtifactPathForAgent(agentStem)}\`）`
            : "";
          const summary =
            `【一键写入】已将内容写入当前工作区：${pathNote}\n` +
            written.map((p) => `- \`${p}\``).join("\n");
          const userLine: DiskMsg = { role: "user", content: userLineContent, ts: Date.now() };
          const asstLine: DiskMsg = { role: "assistant", content: summary, ts: Date.now() };
          const hist = [...sess.history, userLine, asstLine];
          const modelLabel = sess.modelId?.trim() || settings.model || "模型";
          const nextSessions = sessions.map((s) => (s.id === activeId ? { ...s, history: hist } : s));
          setSessions(nextSessions);
          setMessages(diskToDisplay(hist, modelLabel));
          await persist(nextSessions, activeId);
          toast.success(`已写入 ${written.length} 个文件`);
        } else if (res?.error) {
          toast.error(`未能写入：${res.error}`);
        } else if (res?.errors?.length) {
          toast.error(res.errors.slice(0, 2).join("; "));
        } else {
          toast.warning("未写入任何路径（请检查工作区是否已选择）。");
        }
      } finally {
        setSessionSending(activeId, false);
      }
    },
    [activeId, sessions, persist],
  );

  const performConfirmWrite = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    const lastAsst = [...sess.history]
      .reverse()
      .find(
        (m) =>
          m.role === "assistant" &&
          !m.requestError &&
          typeof m.content === "string" &&
          m.content.trim() &&
          m.content !== "__WAITING__",
      );
    if (!lastAsst) {
      toast.warning("没有可写入的上一条助手回复。请先让助手生成 PRD 等内容。");
      return;
    }
    await performConfirmWriteForText(lastAsst.content, "确认写入");
  }, [sessions, activeId, performConfirmWriteForText]);

  const handleBubbleWriteToWorkspace = useCallback(
    (content: string) => {
      void performConfirmWriteForText(content, "确认写入（本条气泡）");
    },
    [performConfirmWriteForText],
  );

  const handleBubbleGenerateChain = useCallback(async (content: string) => {
    const api = getDesktop();
    const r = await saveChainFromBubbleText(api, content);
    if (!r.ok) {
      toast.error(r.error, { duration: 5000 });
      return;
    }
    notifyAutoSavedChain(r.stepCount, () => navigate({ to: "/chains" }));
  }, [navigate]);

  const performBulkWriteProject = useCallback(async (userLineContent: string) => {
    const api = getDesktop();
    if (!api) return;
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    setStopRequested(false);
    setSessionSending(activeId, true);
    try {
      const res = await performBulkWriteFromHistory(api, sess.history);
      const userLine: DiskMsg = { role: "user", content: userLineContent, ts: Date.now() };
      const asstLine: DiskMsg = {
        role: "assistant",
        content:
          res.displayText ||
          (res.ok
            ? `【批量落盘】已写入 ${res.written.length} 个文件。`
            : res.error || "批量落盘未写入任何文件。"),
        ts: Date.now(),
        ...(res.ok ? {} : { requestError: true }),
      };
      const hist = [...sess.history, userLine, asstLine];
      const settings = await api.getChatSettings();
      const modelLabel = sess.modelId?.trim() || settings.model || "模型";
      const nextSessions = sessions.map((s) => (s.id === activeId ? { ...s, history: hist } : s));
      setSessions(nextSessions);
      setMessages(diskToDisplay(hist, modelLabel));
      await persist(nextSessions, activeId);
      if (res.ok && res.written.length > 0) {
        toast.success(`已从 ${res.scanned ?? "?"} 条历史回复写入 ${res.written.length} 个文件`);
      } else {
        toast.warning(res.error || "未找到可落盘的代码块");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSessionSending(activeId, false);
    }
  }, [activeId, sessions, persist]);

  const runProjectPreview = useCallback(
    async (userLineContent: string) => {
      const api = getDesktop();
      if (!api) return;
      const sess = sessions.find((s) => s.id === activeId);
      if (!sess) return;
      setStopRequested(false);
      setSessionSending(activeId, true);
      setTerminalOpen(true);
      try {
        const res = await runProjectFromChat(api, userLineContent, {
          openTerminal: () => setTerminalOpen(true),
        });
        const userLine: DiskMsg = { role: "user", content: userLineContent, ts: Date.now() };
        const asstLine: DiskMsg = {
          role: "assistant",
          content: res.displayText,
          ts: Date.now(),
          ...(res.ok ? {} : { requestError: true }),
        };
        const hist = [...sess.history, userLine, asstLine];
        const settings = await api.getChatSettings();
        const modelLabel = sess.modelId?.trim() || settings.model || "模型";
        const nextSessions = sessions.map((s) => (s.id === activeId ? { ...s, history: hist } : s));
        setSessions(nextSessions);
        setMessages(diskToDisplay(hist, modelLabel));
        await persist(nextSessions, activeId);
        if (res.ranInTerminal) toast.success("已在集成终端执行命令");
        else if (res.ok && res.url) toast.success("已在浏览器打开预览");
        else if (!res.ok) toast.warning("未能自动运行，请查看终端或手动执行");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setSessionSending(activeId, false);
      }
    },
    [activeId, sessions, persist],
  );

  useEffect(() => {
    if (!hasDesktopApi) return;
    void (async () => {
      const api = getDesktop();
      if (!api) {
        setMessages([
          {
            role: "assistant",
            content:
              "当前为浏览器预览模式：请在「本地代码助手」Electron 窗口中打开本应用，以使用 Claude Code CLI、工作区与对话持久化。",
          },
        ]);
        return;
      }
      let bridgeOk = true;
      let settings: Awaited<ReturnType<typeof api.getChatSettings>>;
      try {
        settings = await api.getChatSettings();
      } catch (e) {
        bridgeOk = false;
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("Web Bridge 未连接，模型列表使用默认项。请运行 npm run web:dev:full 或 npm run bridge", {
          description: msg.slice(0, 120),
          duration: 8000,
        });
        settings = {
          ollamaBase: "http://127.0.0.1:11434",
          model: AUTO_MODEL_ID,
          localOllamaModel: "qwen2.5-coder:14b",
          claudeCliPath: "/opt/homebrew/bin/claude",
          orchestrationMode: "claude-code",
          localAgentBasename: "product-manager.md",
          defaultConfirmWritePath: "docs/prd.md",
          mcpConfigAbsolutePath: "",
          devMcpOrchDebug: false,
          localModelCatalog: [],
        };
      }
      const mode: OrchMode = settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
      setOrchMode(mode);
      setLocalAgentBasename(settings.localAgentBasename?.trim() ?? "");

      let claudePool: string[] = [];
      let localPool: string[] = [];
      if (bridgeOk) {
        try {
          const pools = await loadChatModelPools(api);
          claudePool = pools.cloudModels;
          localPool = pools.localModels;
        } catch {
          /* ignore */
        }
      }
      setOrchestratorModels(claudePool);
      setLocalOllamaTags(localPool);

      const sessionPool = [...claudePool, ...localPool];
      const migratedGlobal = pickOrchestratorModel(settings.model, sessionPool, mode);
      setGlobalModel(migratedGlobal);
      if (bridgeOk && migratedGlobal !== (settings.model || "")) {
        try {
          await api.saveChatSettings({
            ...fullChatSettingsPayload(settings),
            model: migratedGlobal,
          });
        } catch {
          /* ignore */
        }
      }

      let list: ChatSession[] = [];
      let aid = "s0";
      let activeByWorkspace: Record<string, string> = {};
      let workspace: string | null = null;
      if (bridgeOk) {
        try {
          workspace = await api.getWorkspace();
        } catch {
          workspace = null;
        }
        workspacePathRef.current = workspace;
        setWorkspacePath(workspace);
      }
      if (bridgeOk) {
        try {
          const disk = await api.loadChatSessions();
          list = disk.sessions;
          activeByWorkspace = disk.activeByWorkspace ?? { "": disk.activeId || "s0" };
          activeByWorkspaceRef.current = activeByWorkspace;
          aid = pickActiveSessionId(list, activeByWorkspace, workspace, disk.activeId);
        } catch {
          bridgeOk = false;
        }
      }

      const createEmptySession = (): ChatSession => ({
        id: `s${Date.now()}`,
        title: "新对话",
        modelId: migratedGlobal,
        history: [],
        workspacePath: workspaceSessionKey(workspace) || null,
      });
      const beforeResolveLen = list.length;
      const resolved = resolveWorkspaceChatSessions(
        list,
        workspace,
        activeByWorkspaceRef.current,
        createEmptySession,
      );
      list = resolved.sessions;
      aid = resolved.activeId;
      activeByWorkspace = resolved.activeByWorkspace;
      activeByWorkspaceRef.current = activeByWorkspace;

      let sessionsNeedSave = beforeResolveLen !== list.length;
      list = list.map((s) => {
        const nextId = pickOrchestratorModel(s.modelId, sessionPool, mode);
        if (nextId !== s.modelId) sessionsNeedSave = true;
        return { ...s, modelId: nextId };
      });
      if (bridgeOk && sessionsNeedSave) {
        try {
          await api.saveChatSessions({
            activeId: aid,
            activeByWorkspace: activeByWorkspaceRef.current,
            sessions: list,
          });
        } catch {
          /* ignore */
        }
      }

      setSessions(list);
      switchActiveSession(aid);
      const active = list.find((s) => s.id === aid) ?? list[0];
      const modelLabel = active?.modelId?.trim() || settings.model || "模型";
      const welcome = bridgeOk ? "欢迎使用" : "";
      setMessages(
        active?.history?.length
          ? diskToDisplay(active.history, modelLabel)
          : welcome
            ? [{ role: "assistant", content: welcome }]
            : [],
      );
    })();
  }, [hasDesktopApi]);

  /** 从设置页返回、CC Switch 同步或 Bridge 恢复后重新拉取模型列表 */
  useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api) return;
    const sync = () => {
      void api.getChatSettings().then((s) =>
        setOrchMode(s.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code"),
      );
      void loadChatModelPools(api).then((pools) => {
        setOrchestratorModels(pools.cloudModels);
        setLocalOllamaTags(pools.localModels);
      });
    };
    window.addEventListener("focus", sync);
    const offSettings = api.onChatSettingsChanged?.(() => sync());
    return () => {
      window.removeEventListener("focus", sync);
      offSettings?.();
    };
  }, [hasDesktopApi]);

  useEffect(() => {
    if (!localOllamaTags.length) return;
    setImageModel((prev) => (prev && localOllamaTags.includes(prev) ? prev : localOllamaTags[0]));
    setVideoModel((prev) => (prev && localOllamaTags.includes(prev) ? prev : localOllamaTags[0]));
  }, [localOllamaTags]);

  useEffect(() => {
    if (!hasDesktopApi) return;
    void reloadAgentDisplayMap();
  }, [hasDesktopApi, reloadAgentDisplayMap]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 240;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [input, pendingImages.length, pendingTerminalSnippets.length]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) {
        setSpeedOpen(false); setLengthOpen(false); setRatioOpen(false); setMoreOpen(false);
        setStyleOpen(false); setTplOpen(false); setImgModelOpen(false); setVidModelOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visibleSessions = useMemo(
    () => filterSessionsForWorkspaceTabs(sessions, workspacePath),
    [sessions, workspacePath],
  );
  const activeSession =
    visibleSessions.find((s) => s.id === activeId) ?? sessions.find((s) => s.id === activeId);
  const projectHistoryItems = useMemo(
    () =>
      visibleSessions.filter((s) => s.history.length > 0).map((s) => toChatHistoryListItem(s)),
    [visibleSessions],
  );
  const allHistoryItems = useMemo(
    () =>
      sortSessionsByLatest(sessions.filter((s) => s.history.length > 0)).map((s) =>
        toChatHistoryListItem(s),
      ),
    [sessions],
  );
  const displayModel = activeSession?.modelId?.trim() || globalModel || "未选模型";
  const primaryModelFallback = AUTO_MODEL_ID;

  const handleAgentChange = async (basename: string) => {
    const api = getDesktop();
    if (!api) return;
    const nextBasename = basename.trim();
    setLocalAgentBasename(nextBasename);
    const s = await api.getChatSettings();
    await api.saveChatSettings({ ...fullChatSettingsPayload(s), localAgentBasename: nextBasename });
  };

  const handleModelPick = async (pick: { mode: OrchMode; model: string }) => {
    const api = getDesktop();
    if (!api) return;
    const nextModel = isAutoModelSelection(pick.model) ? AUTO_MODEL_ID : pick.model;
    const nextMode = isAutoModelSelection(pick.model) ? "claude-code" : pick.mode;
    if (nextMode !== orchMode) {
      setOrchMode(nextMode);
      const s = await api.getChatSettings();
      await api.saveChatSettings({ ...fullChatSettingsPayload(s), orchestrationMode: nextMode });
    }
    if (
      nextMode === "claude-code" &&
      nextModel &&
      !isAutoModelSelection(nextModel) &&
      api.ccSwitchListProviders &&
      api.ccSwitchSetCurrentProvider
    ) {
      try {
        const listed = await api.ccSwitchListProviders();
        const matches = (listed.providers || []).filter((p) => p.models?.includes(nextModel));
        const provider = matches.find((p) => p.isCurrent) || matches[0];
        if (provider) {
          await api.ccSwitchSetCurrentProvider({
            providerId: provider.id,
            model: nextModel,
            syncWorkbench: false,
          });
        }
      } catch {
        /* 后端 send 时仍会按模型解析供应商 env */
      }
    }
    const next = sessions.map((s) => (s.id === activeId ? { ...s, modelId: nextModel } : s));
    setSessions(next);
    await persist(next, activeId);
    const sess = next.find((s) => s.id === activeId);
    syncMessagesFromSession(sess);
  };

  const syncMessagesFromSession = useCallback(
    (sess: ChatSession | undefined) => {
      if (!sess) {
        setMessages([]);
        return;
      }
      const ml = sess.modelId?.trim() || globalModel || "模型";
      let msgs = diskToDisplay(sess.history, ml);
      if (!msgs.length && !sendingSessionsRef.current[sess.id]) {
        msgs = [{ role: "assistant", content: EMPTY_SESSION_WELCOME }];
      }
      if (sendingSessionsRef.current[sess.id]) {
        const last = msgs[msgs.length - 1];
        if (!last || last.role !== "assistant" || last.content !== "__WAITING__") {
          msgs = [...msgs, { role: "assistant", name: ml, content: "__WAITING__" }];
        }
      }
      setMessages(msgs);
    },
    [globalModel],
  );

  /** 后台任务链写入会话后同步 UI（切换页签返回聊天页亦生效） */
  const refreshSessionsFromDisk = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    try {
      const disk = await api.loadChatSessions();
      let merged: ChatSession[] = [];
      setSessions((prev) => {
        merged = mergeSessionsPreferLongerHistory(prev, disk.sessions, sendingSessionsRef.current);
        merged = pruneDuplicateEmptySessions(
          merged,
          workspacePathRef.current,
          activeIdRef.current,
        );
        sessionsRef.current = merged;
        return merged;
      });
      if (disk.activeByWorkspace) {
        activeByWorkspaceRef.current = {
          ...activeByWorkspaceRef.current,
          ...disk.activeByWorkspace,
        };
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api) return;
    void syncExecutionState();
    void api.loadChatSessions().then((disk) => {
      let merged: ChatSession[] = [];
      setSessions((prev) => {
        merged = mergeSessionsPreferLongerHistory(
          prev,
          disk.sessions,
          sendingSessionsRef.current,
        );
        merged = pruneDuplicateEmptySessions(
          merged,
          workspacePathRef.current,
          activeIdRef.current,
        );
        sessionsRef.current = merged;
        return merged;
      });
      if (disk.activeByWorkspace) {
        activeByWorkspaceRef.current = {
          ...activeByWorkspaceRef.current,
          ...disk.activeByWorkspace,
        };
      }
      const viewId = activeIdRef.current;
      const sess =
        merged.find((s) => s.id === viewId) ??
        disk.sessions.find((s) => s.id === viewId);
      if (sendingSessionsRef.current[viewId]) return;
      syncMessagesFromSession(sess);
    });
  }, [sessionRevision, chainRunning, hasDesktopApi, syncExecutionState, syncMessagesFromSession]);

  const handleHistoryOpen = useCallback(() => {
    void refreshSessionsFromDisk();
  }, [refreshSessionsFromDisk]);

  const saveComposerDraft = useCallback(
    (sessionId: string) => {
      composerDraftsRef.current[sessionId] = {
        input,
        pendingImages,
        pendingTerminalSnippets,
      };
    },
    [input, pendingImages, pendingTerminalSnippets],
  );

  const loadComposerDraft = useCallback((sessionId: string) => {
    const draft = composerDraftsRef.current[sessionId];
    setInput(draft?.input ?? "");
    setPendingImages(draft?.pendingImages ?? []);
    setPendingTerminalSnippets(draft?.pendingTerminalSnippets ?? []);
  }, []);

  const cancelEditUserMessage = useCallback(() => {
    if (editHistoryIndexRef.current == null) return;
    setEditHistoryIndex(null);
    editHistoryIndexRef.current = null;
    setEditComposer(null);
    const sess = sessionsRef.current.find((s) => s.id === activeIdRef.current);
    syncMessagesFromSession(sess);
    loadComposerDraft(activeIdRef.current);
  }, [loadComposerDraft, syncMessagesFromSession]);

  const beginEditUserMessageImpl = useCallback(
    (historyIndex: number) => {
      const sessionId = activeIdRef.current;
      const sess = sessionsRef.current.find((s) => s.id === sessionId);
      const msg = sess?.history[historyIndex];
      if (!msg || msg.role !== "user") return;

      saveComposerDraft(sessionId);
      const restored = restoreUserMsgToComposer(msg);
      setEditComposer({
        input: restored.input,
        pendingImages: restored.attachments,
        pendingTerminalSnippets: restored.terminalSnippets,
      });
      setEditHistoryIndex(historyIndex);
      editHistoryIndexRef.current = historyIndex;
      loadComposerDraft(sessionId);

      const ml = sess.modelId?.trim() || globalModel || "模型";
      setMessages(diskToDisplay(sess.history.slice(0, historyIndex), ml));
      requestAnimationFrame(() => inlineTaRef.current?.focus());
    },
    [globalModel, saveComposerDraft, loadComposerDraft],
  );

  const skills = [
    { icon: Zap, label: "快速" },
    { icon: PenLine, label: "帮我写作" },
    { icon: Code2, label: "编程" },
    { icon: ImageIcon, label: "图像生成" },
    { icon: Presentation, label: "PPT 生成" },
    { icon: Play, label: "视频生成" },
    { icon: MoreHorizontal, label: "更多" },
  ];

  const skillConfig: Record<string, { placeholder: string; chipIcon: typeof Zap; chipColor: string }> = {
    "快速": { placeholder: "发送消息或输入 '/' 选择技能", chipIcon: Zap, chipColor: "text-amber-500" },
    "帮我写作": { placeholder: "输入主题和写作要求…", chipIcon: PenLine, chipColor: "text-primary" },
    "编程": { placeholder: "输入「@」唤起常用语，或粘贴代码快速提问…", chipIcon: Code2, chipColor: "text-primary" },
    "图像生成": { placeholder: "描述你想要的图片，可附参考图…", chipIcon: ImageIcon, chipColor: "text-primary" },
    "PPT 生成": { placeholder: "输入主题，添加具体要求和参考…", chipIcon: Presentation, chipColor: "text-primary" },
    /** 技能横条中的独立「视频生成」入口（与「图像生成 → 视频」分段不同） */
    "视频生成": { placeholder: "添加照片，描述你想生成的视频…", chipIcon: Play, chipColor: "text-primary" },
  };

  const composerPlaceholder = "规划任务，@ 引用上下文，/ 输入命令";

  const handleInlineComposerPaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      const f = it.getAsFile();
      if (!f?.type.startsWith("image/")) continue;
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setEditComposer((prev) =>
          prev
            ? {
                ...prev,
                pendingImages: [
                  ...prev.pendingImages,
                  {
                    id: newLocalId(),
                    kind: "image",
                    name: f.name || "粘贴图片.png",
                    mime: f.type,
                    dataUrl,
                  },
                ],
              }
            : prev,
        );
      };
      reader.readAsDataURL(f);
    }
  }, []);

  const handleComposerPaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      const f = it.getAsFile();
      if (!f?.type.startsWith("image/")) continue;
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPendingImages((p) => [
          ...p,
          {
            id: newLocalId(),
            kind: "image",
            name: f.name || "粘贴图片.png",
            mime: f.type,
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(f);
    }
  }, []);

  const moreSkills = [
    { icon: ArrowLeftRight, label: "翻译" },
    { icon: Flashlight, label: "深入研究" },
    { icon: Disc, label: "AI 播客" },
    { icon: CheckSquare, label: "记录会议" },
    { icon: Music, label: "音乐生成" },
    { icon: Check, label: "解题答疑" },
    { icon: PieChart, label: "数据分析" },
    { icon: Sparkle, label: "超能模式" },
  ];

  const handleSessionChange = async (id: string) => {
    if (id === activeIdRef.current) return;
    resetScrollFollow();
    saveComposerDraft(activeIdRef.current);
    setEditHistoryIndex(null);
    editHistoryIndexRef.current = null;
    setEditComposer(null);
    const api = getDesktop();
    const s = sessionsRef.current.find((x) => x.id === id);
    switchActiveSession(id);
    loadComposerDraft(id);
    syncMessagesFromSession(s);
    if (api) await persist(sessionsRef.current, id);
  };

  const activateHistorySession = useCallback(
    async (sessionId: string) => {
      const sess = sessionsRef.current.find((s) => s.id === sessionId);
      if (!sess) return;

      resetScrollFollow();
      saveComposerDraft(activeIdRef.current);
      setEditHistoryIndex(null);
      editHistoryIndexRef.current = null;
      setEditComposer(null);

      const targetWs = sess.workspacePath ?? null;
      const sameWorkspace = sessionMatchesWorkspaceTab(sess, workspacePathRef.current);
      const api = getDesktop();

      if (!sameWorkspace && api && targetWs) {
        pendingHistorySessionRef.current = sessionId;
        try {
          await api.chooseWorkspace(targetWs);
        } catch (e) {
          pendingHistorySessionRef.current = null;
          toast.error(e instanceof Error ? e.message : String(e));
        }
        return;
      }

      if (!sameWorkspace && api && !targetWs) {
        toast.warning("该对话未关联工作区，无法打开。");
        return;
      }

      switchActiveSession(sessionId);
      loadComposerDraft(sessionId);
      syncMessagesFromSession(sess);
      if (api) await persist(sessionsRef.current, sessionId);
    },
    [resetScrollFollow, saveComposerDraft, loadComposerDraft, syncMessagesFromSession, persist],
  );

  const handleNewSession = async () => {
    resetScrollFollow();
    saveComposerDraft(activeIdRef.current);
    setEditHistoryIndex(null);
    editHistoryIndexRef.current = null;
    setEditComposer(null);
    const api = getDesktop();
    if (!api) return;

    const ws = workspacePathRef.current;
    const curId = activeIdRef.current;
    const current = sessionsRef.current.find((s) => s.id === curId);
    if (
      current &&
      sessionMatchesWorkspaceTab(current, ws) &&
      current.history.length === 0 &&
      !sendingSessionsRef.current[curId]
    ) {
      loadComposerDraft(curId);
      syncMessagesFromSession(current);
      return;
    }

    const reusable = findReusableEmptySession(
      sessionsRef.current,
      ws,
      sendingSessionsRef.current,
    );
    if (reusable) {
      switchActiveSession(reusable.id);
      loadComposerDraft(reusable.id);
      syncMessagesFromSession(reusable);
      await persist(sessionsRef.current, reusable.id);
      return;
    }

    const settings = await api.getChatSettings();
    const mode: OrchMode = settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
    const id = `s${Date.now()}`;
    const ns: ChatSession = {
      id,
      title: "新对话",
      modelId: pickOrchestratorModel(
        settings.model,
        [...orchestratorModels, ...localOllamaTags],
        mode,
      ),
      history: [],
      workspacePath: workspaceSessionKey(ws) || null,
    };
    let next: ChatSession[] = [];
    setSessions((prev) => {
      next = pruneDuplicateEmptySessions([...prev, ns], ws, id);
      sessionsRef.current = next;
      return next;
    });
    switchActiveSession(id);
    setInput("");
    setPendingImages([]);
    setPendingTerminalSnippets([]);
    setMessages([{ role: "assistant", content: EMPTY_SESSION_WELCOME }]);
    await persist(next, id);
  };

  useEffect(() => {
    if (!urlSessionId || !hasDesktopApi || sessions.length === 0) return;
    if (urlSessionHandledRef.current === urlSessionId) return;
    if (!sessions.some((s) => s.id === urlSessionId)) return;
    urlSessionHandledRef.current = urlSessionId;
    void activateHistorySession(urlSessionId).finally(() => {
      navigate({ to: "/", search: EMPTY_CHAT_SEARCH, replace: true });
    });
  }, [urlSessionId, sessions, hasDesktopApi, activateHistorySession, navigate]);

  useEffect(() => {
    if (!urlNewSession || !hasDesktopApi || sessions.length === 0) return;
    if (urlNewHandledRef.current) return;
    urlNewHandledRef.current = true;
    void handleNewSession().finally(() => {
      navigate({ to: "/", search: EMPTY_CHAT_SEARCH, replace: true });
    });
  }, [urlNewSession, hasDesktopApi, sessions.length, navigate]);

  useEffect(() => {
    if (!urlClaudeResume || !hasDesktopApi || sessions.length === 0) return;
    if (urlClaudeResumeHandledRef.current === urlClaudeResume) return;
    urlClaudeResumeHandledRef.current = urlClaudeResume;
    const existing = sessions.find((s) => s.claudeSessionId === urlClaudeResume);
    if (existing) {
      void activateHistorySession(existing.id).finally(() => {
        navigate({ to: "/", search: EMPTY_CHAT_SEARCH, replace: true });
      });
      return;
    }
    void (async () => {
      const api = getDesktop();
      if (!api) return;
      const id = `s${Date.now()}`;
      const ws = workspacePathRef.current;
      const settings = await api.getChatSettings();
      const ns: ChatSession = {
        id,
        title: "Claude 会话",
        modelId: settings.model || globalModel || AUTO_MODEL_ID,
        history: [],
        workspacePath: workspaceSessionKey(ws) || null,
        claudeSessionId: urlClaudeResume,
      };
      let next: ChatSession[] = [];
      setSessions((prev) => {
        next = [...prev, ns];
        sessionsRef.current = next;
        return next;
      });
      switchActiveSession(id);
      setMessages([{ role: "assistant", content: "已绑定 Claude CLI 会话，继续对话将使用 --resume。" }]);
      await persist(next, id);
      navigate({ to: "/", search: EMPTY_CHAT_SEARCH, replace: true });
    })();
  }, [urlClaudeResume, sessions, hasDesktopApi, activateHistorySession, globalModel, navigate, persist, switchActiveSession]);

  const handleCloseSession = async (id: string) => {
    const visible = filterSessionsForWorkspaceTabs(sessionsRef.current, workspacePathRef.current);
    if (visible.length <= 1) return;
    resetScrollFollow();
    const reqId = activeRequestIdsRef.current.get(id);
    const api = getDesktop();
    if (reqId && api?.claudeCodeAbort) void api.claudeCodeAbort(reqId);
    if (reqId && api?.localOrchestrationAbort) void api.localOrchestrationAbort(reqId);
    activeRequestIdsRef.current.delete(id);
    setSessionSending(id, false);
    delete composerDraftsRef.current[id];

    const next = sessionsRef.current.filter((s) => s.id !== id);
    const visibleAfter = filterSessionsForWorkspaceTabs(next, workspacePathRef.current);
    const aid =
      id === activeIdRef.current
        ? (sortSessionsByLatest(visibleAfter)[0]?.id ?? visibleAfter[0]?.id)
        : activeIdRef.current;
    if (id === activeIdRef.current) {
      switchActiveSession(aid);
      loadComposerDraft(aid);
      syncMessagesFromSession(next.find((s) => s.id === aid));
    }
    setSessions(next);
    sessionsRef.current = next;
    if (api) await persist(next, aid);
  };

  const stopChat = useCallback(() => {
    setStopRequested(true);
    if (chainRunning) {
      stopChainExecution();
    }
    const id = activeRequestIdsRef.current.get(activeId);
    const api = getDesktop();
    if (id && api?.claudeCodeAbort) void api.claudeCodeAbort(id);
    if (id && api?.localOrchestrationAbort) void api.localOrchestrationAbort(id);
  }, [activeId, chainRunning, stopChainExecution]);

  const runPmDelegationRuntime = useCallback(async () => {
    const api = getDesktop();
    if (!api?.multiAgentExecuteDelegation) {
      toast.error("请完全退出并重启桌面应用以加载 Multi-Agent Runtime（委派执行）。");
      return;
    }
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    const settings = await api.getChatSettings();
    const resolved = resolveModelForExecution({
      selectedModel: sess.modelId || settings.model,
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
    });
    if (!resolved) {
      toast.error("请先在「模型与连接」添加云或本地模型。");
      return;
    }
    const { mode, modelId } = resolved;
    const hist = [...(sess.history ?? [])];
    const lastAssistant = [...hist]
      .reverse()
      .find(
        (m) =>
          m.role === "assistant" &&
          m.content &&
          m.content !== "__WAITING__" &&
          !m.requestError,
      );
    if (!lastAssistant?.content?.trim()) {
      toast.error("未找到可用的上一条助手消息（须含 delegation-v1 或 delegate_to / steps 的 JSON）。");
      return;
    }
    if (
      !confirm(
        "将从最近一条助手气泡解析 delegation-v1，按顺序真实调用各子 Agent（独立 CLI / MCP 进程）。可能较久，是否继续？",
      )
    ) {
      return;
    }

    setSessionSending(activeId, true);
    try {
      const r = await api.multiAgentExecuteDelegation!({
        rawText: lastAssistant.content,
        orchestratorModel: modelId,
      });
      let nextHist = [...hist];
      nextHist.push({
        role: "user",
        content: "【Multi-Agent Runtime】/delegation-run — 解析上一条助手气泡中的 delegation-v1 并顺序执行子 Agent",
        ts: Date.now(),
      });
      if (!r.ok) {
        nextHist.push({
          role: "assistant",
          content: `【Multi-Agent Runtime】失败：${r.error || "未知错误"}`,
          ts: Date.now(),
          requestError: true,
        });
      } else {
        let block = "【Multi-Agent Runtime · delegation-v1】\n\n";
        for (const step of r.stepResults ?? []) {
          if (step.ok) {
            const raw = String(step.output ?? "").trim();
            if (raw) {
              maybeToastMissingWorkspaceWrite(raw);
              const chainIngest = await ingestChainStepWorkspaceWrites(
                api,
                raw,
                { agentName: step.agentName, taskId: step.taskId },
                toastIngestWorkspaceHint,
              );
              const collapsed = stripLargeAssistantArtifacts(chainIngest.displayText);
              block += `### ${step.agentName}（${step.taskId}）\n${collapsed}\n\n`;
            } else {
              block += `### ${step.agentName}（${step.taskId}）\n（本步无正文输出）\n\n`;
            }
          } else {
            block += `### ${step.agentName}（${step.taskId}）\n失败：${step.error ?? ""}\n\n`;
          }
        }
        if (r.synthesis?.output) {
          const synRaw = String(r.synthesis.output).trim();
          if (synRaw) {
            maybeToastMissingWorkspaceWrite(synRaw);
            const synIngest = await ingestChainStepWorkspaceWrites(
              api,
              synRaw,
              { agentName: r.synthesis.agentName, taskId: "synthesis" },
              toastIngestWorkspaceHint,
            );
            const synCollapsed = stripLargeAssistantArtifacts(synIngest.displayText);
            block += `### 汇总（${r.synthesis.agentName}）\n${synCollapsed}\n`;
          }
        }
        nextHist.push({
          role: "assistant",
          content: stripLargeAssistantArtifacts(block.trim()),
          ts: Date.now(),
        });
        toast.success("委派 Runtime 已跑完（见最新消息）。");
      }
      const nextSessions = sessions.map((s) =>
        s.id === activeId ? { ...s, history: nextHist } : s,
      );
      setSessions(nextSessions);
      setMessages(diskToDisplay(nextHist, modelId));
      await persist(nextSessions, activeId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSessionSending(activeId, false);
    }
  }, [activeId, persist, sessions, localOllamaTags, orchestratorModels]);

  const sendChat = async () => {
    const override = sendPayloadOverrideRef.current;
    if (override) sendPayloadOverrideRef.current = null;

    const editDraft = editComposerRef.current;
    const editingFromInline =
      !override && editHistoryIndexRef.current != null && editDraft != null;

    const text = (override?.text ?? (editingFromInline ? editDraft.input : input)).trim();
    const activePendingImages =
      override?.pendingImages ?? (editingFromInline ? editDraft.pendingImages : pendingImages);
    const activePendingTerminal =
      override?.pendingTerminalSnippets ??
      (editingFromInline ? editDraft.pendingTerminalSnippets : pendingTerminalSnippets);
    const presetEditCutoff = override?.editCutoff;

    const hasTerminal = activePendingTerminal.length > 0;
    const sendSessionId = activeIdRef.current;
    if ((!text && !activePendingImages.length && !hasTerminal) || sendingSessionsRef.current[sendSessionId]) return;
    const api = getDesktop();
    if (!api) {
      setMessages((m) => [...m, { role: "assistant", content: "请在 Electron 桌面窗口中运行本应用后再试。" }]);
      return;
    }
    const sess = sessionsRef.current.find((s) => s.id === sendSessionId);
    if (!sess) return;

    if (text === "/delegation-run") {
      setInput("");
      await runPmDelegationRuntime();
      return;
    }

    if (text && activePendingImages.length === 0 && !hasTerminal && parseChainCommand(text).matched) {
      setInput("");
      const route = resolveAgentForTurn(text, localAgentBasename);
      const chainResult = await handleChainChatCommand(text, route.stem, runOrchestrationChain);
      const hist = [
        ...sess.history,
        { role: "user" as const, content: text, ts: Date.now() },
        { role: "assistant" as const, content: chainResult.assistantText, ts: Date.now(), name: "系统" },
      ];
      const settings = await api.getChatSettings();
      const modelLabel = sess.modelId?.trim() || settings.model || "模型";
      const nextSessions = sessions.map((s) => (s.id === sendSessionId ? { ...s, history: hist } : s));
      setSessions(nextSessions);
      setMessages(diskToDisplay(hist, modelLabel));
      await persist(nextSessions, activeId);
      return;
    }

    if (text && activePendingImages.length === 0 && !hasTerminal && isConfirmWriteOnlyMessage(text)) {
      setInput("");
      await performConfirmWrite();
      return;
    }

    if (text && activePendingImages.length === 0 && !hasTerminal && isBulkWriteProjectMessage(text)) {
      setInput("");
      await performBulkWriteProject(text);
      return;
    }

    if (text && activePendingImages.length === 0 && !hasTerminal && isStopPreviewMessage(text)) {
      setInput("");
      const api = getDesktop();
      if (api) {
        const sess = sessions.find((s) => s.id === activeId);
        if (sess) {
          const summary = await performStopPreview(api);
          const hist = [
            ...sess.history,
            { role: "user" as const, content: text, ts: Date.now() },
            { role: "assistant" as const, content: summary, ts: Date.now() },
          ];
          const settings = await api.getChatSettings();
          const modelLabel = sess.modelId?.trim() || settings.model || "模型";
          const nextSessions = sessions.map((s) => (s.id === activeId ? { ...s, history: hist } : s));
          setSessions(nextSessions);
          setMessages(diskToDisplay(hist, modelLabel));
          await persist(nextSessions, activeId);
        }
      }
      return;
    }

    if (text && activePendingImages.length === 0 && !hasTerminal && isOpenTerminalMessage(text)) {
      setInput("");
      setTerminalOpen(true);
      const hist = [
        ...sess.history,
        { role: "user" as const, content: text, ts: Date.now() },
        {
          role: "assistant" as const,
          content: "已在底部打开**终端**面板（类 Cursor 布局），默认工作目录为当前项目根。可直接运行 `python3`、`npm run dev` 等命令。",
          ts: Date.now(),
        },
      ];
      const settings = await api.getChatSettings();
      const modelLabel = sess.modelId?.trim() || settings.model || "模型";
      const nextSessions = sessions.map((s) => (s.id === activeId ? { ...s, history: hist } : s));
      setSessions(nextSessions);
      setMessages(diskToDisplay(hist, modelLabel));
      await persist(nextSessions, activeId);
      return;
    }

    if (text && activePendingImages.length === 0 && !hasTerminal && isProjectPreviewMessage(text)) {
      setInput("");
      await runProjectPreview(text);
      return;
    }

    const settings = await api.getChatSettings();

    resetScrollFollow();

    const attachmentsToSave: UserImageAttachment[] | undefined =
      activePendingImages.length > 0
        ? activePendingImages.map(({ id: _id, ...rest }) => rest)
        : undefined;
    const displayLine = buildComposerUserLine(
      text || (attachmentsToSave?.length ? "请结合附图回答。" : ""),
      activePendingTerminal,
    );

    const route = resolveAgentForTurn(displayLine, localAgentBasename);
    const cmd = { matched: true as const, stem: route.stem, body: route.body };
    const turnAgent = stemAgentMeta(cmd.stem);

    let agentModel: string | undefined;
    let agentMarkdownMissing = false;
    if (api.readClaudeAgentMarkdown) {
      try {
        const agentDoc = await api.readClaudeAgentMarkdown(`${cmd.stem}.md`);
        if (agentDoc.ok && agentDoc.content?.trim()) {
          agentModel = parseAgentModelFromFrontmatter(agentDoc.content);
        } else {
          agentMarkdownMissing = true;
        }
      } catch {
        agentMarkdownMissing = true;
      }
    }

    const resolvedExec = resolveModelForExecution({
      selectedModel: sess.modelId || settings.model,
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
      agentModel,
    });
    if (!resolvedExec) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "请先在「设置 → 模型与连接」通过「添加云模型」或「配置本地模型」添加至少一个模型。",
          name: "系统",
        },
      ]);
      return;
    }
    const mode: OrchMode = resolvedExec.mode;
    const modelId = resolvedExec.modelId;

    if (mode === "local-mcp") {
      if (!api.localOrchestrationPrompt) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "当前预加载脚本未暴露本地 MCP 编排接口，请完全退出并重启桌面应用。",
            name: "系统",
          },
        ]);
        return;
      }
    } else if (!api.claudeCodePrompt) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "当前预加载脚本未暴露 Claude Code 接口，请完全退出并重启桌面应用。", name: "系统" },
      ]);
      return;
    }

    if (mode === "local-mcp" && agentMarkdownMissing) {
      toast.warning(
        `未读取到 ~/.claude/agents/${cmd.stem}.md（或 sanshengliubu 下同名），将以通用编排身份回复；请 npm run install-global-claude 或自行放置该文件。`,
        { duration: 6000 },
      );
    }

    const baseForExpand = route.body;
    const { expanded: expandedBase, injectedPaths } = await expandUserLineWithWorkspaceFiles(
      api,
      baseForExpand,
      { settings, cmd, displayLine },
    );
    if (injectedPaths.length > 0) {
      toast.info("已把文件内容并入本轮提示词（只读）", {
        description: `从工作区读取：${injectedPaths.join("，")}\n未修改磁盘上的任何文件；与底部「确认写入」「按WBS开工」无关。`,
        duration: 6500,
      });
    }
    const routedBase = buildAgentRoutedInstruction(cmd.stem, expandedBase, mode);
    await syncOfficialGenericChains();
    const chainListR = await api.orchestrationListChains?.();
    const chainCatalogSnippet = buildAgentChainCatalogMarkdown(
      cmd.stem,
      chainListR?.ok ? (chainListR.items ?? []) : [],
      [],
    );
    const localUserLineFinal = chainCatalogSnippet
      ? `${routedBase}\n\n${chainCatalogSnippet}`
      : routedBase;
    const cloudUserLineFinal = buildSubagentUserLine(cmd.stem, localUserLineFinal);

    setStopRequested(false);
    setSessionSending(sendSessionId, true);
    if (editingFromInline) {
      setEditComposer(null);
    } else {
      setInput("");
      setPendingImages([]);
      setPendingTerminalSnippets([]);
    }
    const terminalSnippetsToSave = activePendingTerminal.map(({ id: _id, ...rest }) => rest);
    const editCutoff =
      presetEditCutoff !== undefined
        ? presetEditCutoff
        : editingFromInline
          ? editHistoryIndexRef.current
          : null;
    if (editCutoff != null) {
      setEditHistoryIndex(null);
      editHistoryIndexRef.current = null;
      setEditComposer(null);
    }
    const historyBefore =
      editCutoff != null ? sess.history.slice(0, editCutoff) : sess.history;
    delete composerDraftsRef.current[sendSessionId];
    const userMsg: DiskMsg = {
      role: "user",
      content: displayLine,
      ts: Date.now(),
      ...(attachmentsToSave ? { attachments: attachmentsToSave } : {}),
      ...(terminalSnippetsToSave.length ? { terminalSnippets: terminalSnippetsToSave } : {}),
    };
    const priorForApi: PriorTurn[] = historyBefore.map((m) => {
      if (m.role === "user") {
        const t: PriorTurn = { role: "user", content: m.content };
        if (m.attachments?.length) t.attachments = m.attachments;
        return t;
      }
      return { role: "assistant", content: m.content };
    });
    let title = sess.title;
    if (historyBefore.length === 0) {
      const t = displayLine || "图片";
      title = t.length > 28 ? `${t.slice(0, 28)}…` : t;
    }
    let hist: DiskMsg[] = [...historyBefore, userMsg];
    const wsKey = workspaceSessionKey(workspacePathRef.current) || null;
    await patchSession(sendSessionId, (s) =>
      stampSessionWorkspaceIfMissing({ ...s, title, history: hist }, workspacePathRef.current),
    );
    if (sendSessionId === activeIdRef.current) {
      setMessages([
        ...diskToDisplay(hist, modelId),
        {
          role: "assistant",
          name: assistantBubbleName(turnAgent, modelId),
          content: "__WAITING__",
        },
      ]);
    }

    const reqId = newLocalId();
    activeRequestIdsRef.current.set(sendSessionId, reqId);
    streamContextRef.current = { sessionId: sendSessionId, requestId: reqId };

    try {
      const sendStarted = Date.now();
      let res: {
        ok: boolean;
        content?: string;
        error?: string | null;
        aborted?: boolean;
        claudeSessionId?: string;
      };
      const basenameOverride = `${cmd.stem}.md`;
      await appendAgentExecEvent({
        agent: cmd.stem,
        mode,
        source: "chat_command",
        phase: "start",
        instruction: route.body || displayLine,
        modelId,
      });

      if (mode === "local-mcp") {
        res = await api.localOrchestrationPrompt({
          priorMessages: priorTurnsToOrchestrationMessages(priorForApi),
          userLine: localUserLineFinal,
          userAttachments: attachmentsToSave,
          orchestratorModel: modelId,
          requestId: reqId,
          agentBasenameOverride: basenameOverride,
        });
      } else {
        const workspaceDir = await api.getWorkspace();
        let savedImagePaths: string[] | undefined;
        if (attachmentsToSave?.length && api.saveChatImageAttachments) {
          const saved = await api.saveChatImageAttachments(attachmentsToSave);
          if (saved.ok && saved.paths?.length) savedImagePaths = saved.paths;
        }
        const prompt = await buildClaudeCodePrompt(api, {
          workspaceDir,
          priorHistory: priorForApi,
          userLine: cloudUserLineFinal,
          userAttachments: attachmentsToSave,
          savedImagePaths,
          localAgentBasename: basenameOverride,
          skipDefaultRoleBlock: true,
          chainCatalogSnippet,
          orchestration: {
            orchestratorModel: modelId,
            localOllamaModel: settings.localOllamaModel,
            ollamaBase: settings.ollamaBase,
          },
        });
        res = await api.claudeCodePrompt({
          prompt,
          model: modelId,
          requestId: reqId,
          claudeSessionId: sess?.claudeSessionId ?? undefined,
          isNewClaudeSession: !sess?.claudeSessionId,
        });
      }
      toastIfLocalOrchestrationHints(res);
      if (!res.ok) {
        const line = formatAssistantFailure(res);
        hist = [
          ...hist,
          {
            role: "assistant",
            content: line,
            ts: Date.now(),
            requestError: true,
            ...turnAgent,
          },
        ];
      } else {
        const reply = res.content || "";
        maybeToastMissingWorkspaceWrite(reply);
        const agentStemForIngest = cmd.stem;
        const autoProjectWrite =
          Boolean(agentStemForIngest) && agentAutoWritesToProject(agentStemForIngest);
        const defaultConfirmWritePath =
          settings.defaultConfirmWritePath?.trim() || "docs/prd.md";
        const displayContent =
          stripLargeAssistantArtifacts(
            await ingestWorkspaceWritesAndCollapseDisplay(api, reply, toastIngestWorkspaceHint, {
              ...(agentStemForIngest ? { agentStem: agentStemForIngest } : {}),
              ...(autoProjectWrite ? { autoWriteProject: true } : {}),
              defaultConfirmWritePath,
            }),
          ) || "（助手未返回可见正文）";
        const am: DiskMsg = {
          role: "assistant",
          content: displayContent,
          ts: Date.now(),
          latencyMs: Math.max(0, Date.now() - sendStarted),
          ...turnAgent,
        };
        hist = [...hist, am];
        void autoSaveChainFromReply(api, reply).then((r) => {
          if (r.saved) notifyAutoSavedChain(r.stepCount, () => navigate({ to: "/chains" }));
        });
      }
      await patchSession(sendSessionId, (s) => ({
        ...s,
        history: hist,
        title,
        ...(res.claudeSessionId ? { claudeSessionId: res.claudeSessionId } : {}),
      }));
      if (sendSessionId === activeIdRef.current) {
        setMessages(diskToDisplay(hist, modelId));
      }
    } catch (e) {
      const errLine = e instanceof Error ? e.message : String(e);
      hist = [
        ...hist,
        {
          role: "assistant",
          content: `请求异常：${errLine}`,
          ts: Date.now(),
          requestError: true,
          ...turnAgent,
        },
      ];
      await patchSession(sendSessionId, (s) => ({ ...s, history: hist, title }));
      if (sendSessionId === activeIdRef.current) {
        setMessages(diskToDisplay(hist, modelId));
      }
      toast.error(errLine);
    } finally {
      await appendAgentExecEvent({
        agent: cmd.stem,
        mode,
        source: "chat_command",
        phase: "end",
        instruction: route.body || displayLine,
        modelId,
      });
      activeRequestIdsRef.current.delete(sendSessionId);
      if (streamContextRef.current?.sessionId === sendSessionId) {
        streamContextRef.current = null;
      }
      setSessionSending(sendSessionId, false);
      const pruned = pruneDuplicateEmptySessions(
        sessionsRef.current,
        workspacePathRef.current,
        activeIdRef.current,
      );
      if (pruned.length !== sessionsRef.current.length) {
        sessionsRef.current = pruned;
        setSessions(pruned);
        await persist(pruned, activeIdRef.current);
      }
    }
  };

  /** 箭头按钮：用原问题立即重新发起（不进入编辑态） */
  const resendUserMessageImpl = useCallback(
    async (historyIndex: number) => {
      const sessionId = activeIdRef.current;
      const sess = sessionsRef.current.find((s) => s.id === sessionId);
      const msg = sess?.history[historyIndex];
      if (!msg || msg.role !== "user") return;

      const restored = restoreUserMsgToComposer(msg);
      const ml = sess.modelId?.trim() || globalModel || "模型";
      setEditHistoryIndex(null);
      setMessages(diskToDisplay(sess.history.slice(0, historyIndex), ml));
      sendPayloadOverrideRef.current = {
        text: restored.input,
        pendingImages: restored.attachments,
        pendingTerminalSnippets: restored.terminalSnippets,
        editCutoff: historyIndex,
      };
      resetScrollFollow();
      await sendChat();
    },
    [globalModel, resetScrollFollow],
  );

  const runCheckpointAction = useCallback(
    (historyIndex: number, action: "edit" | "resend") => {
      if (action === "edit") beginEditUserMessageImpl(historyIndex);
      else void resendUserMessageImpl(historyIndex);
    },
    [beginEditUserMessageImpl, resendUserMessageImpl],
  );

  const requestCheckpointAction = useCallback(
    (historyIndex: number, action: "edit" | "resend") => {
      const sessionId = activeIdRef.current;
      if (sendingSessionsRef.current[sessionId]) {
        toast.warning(
          action === "edit"
            ? "请等待当前回复完成后再编辑历史消息。"
            : "请等待当前回复完成后再重新提问。",
        );
        return;
      }
      const sess = sessionsRef.current.find((s) => s.id === sessionId);
      if (!needsCheckpointConfirm(sess, historyIndex) || shouldSkipCheckpointConfirm()) {
        runCheckpointAction(historyIndex, action);
        return;
      }
      setCheckpointConfirm({ historyIndex, action });
    },
    [runCheckpointAction],
  );

  const beginEditUserMessage = useCallback(
    (historyIndex: number) => requestCheckpointAction(historyIndex, "edit"),
    [requestCheckpointAction],
  );

  const requestResendUserMessage = useCallback(
    (historyIndex: number) => requestCheckpointAction(historyIndex, "resend"),
    [requestCheckpointAction],
  );

  useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api?.onWorkspaceChanged) return;
    const off = api.onWorkspaceChanged((detail) => {
      void (async () => {
        const nextWs = detail.workspace ?? null;
        const prevKey = workspaceSessionKey(workspacePathRef.current);
        if (prevKey) {
          activeByWorkspaceRef.current = {
            ...activeByWorkspaceRef.current,
            [prevKey]: activeIdRef.current,
          };
        }
        workspacePathRef.current = nextWs;
        setWorkspacePath(nextWs);

        resetScrollFollow();
        saveComposerDraft(activeIdRef.current);
        setEditHistoryIndex(null);
        editHistoryIndexRef.current = null;
        setEditComposer(null);

        let all = sessionsRef.current;
        const pendingId = pendingHistorySessionRef.current;
        if (pendingId) {
          pendingHistorySessionRef.current = null;
          if (all.some((s) => s.id === pendingId && sessionMatchesWorkspaceTab(s, nextWs))) {
            activeByWorkspaceRef.current = {
              ...activeByWorkspaceRef.current,
              [workspaceSessionKey(nextWs)]: pendingId,
            };
          }
        }

        const settings = await api.getChatSettings();
        const mode: OrchMode =
          settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
        const modelId = pickOrchestratorModel(
          settings.model,
          [...orchestratorModels, ...localOllamaTags],
          mode,
        );
        const resolved = resolveWorkspaceChatSessions(
          all,
          nextWs,
          activeByWorkspaceRef.current,
          () => ({
            id: `s${Date.now()}`,
            title: "新对话",
            modelId,
            history: [],
            workspacePath: workspaceSessionKey(nextWs) || null,
          }),
        );
        all = resolved.sessions;
        const aid = resolved.activeId;
        activeByWorkspaceRef.current = resolved.activeByWorkspace;

        setSessions(all);
        sessionsRef.current = all;
        switchActiveSession(aid);
        loadComposerDraft(aid);
        syncMessagesFromSession(all.find((s) => s.id === aid));
        await persist(all, aid);
      })();
    });
    return () => {
      try {
        off?.();
      } catch {
        /* ignore */
      }
    };
  }, [
    hasDesktopApi,
    resetScrollFollow,
    saveComposerDraft,
    loadComposerDraft,
    syncMessagesFromSession,
    persist,
    localOllamaTags,
    orchestratorModels,
  ]);

  /** 从工作区 WBS 文档自动生成任务链并直接开跑 */
  const runWorkflowFromWbs = async (
    opts?: { preferredPath?: string; quietPickToast?: boolean; wbsOnly?: boolean },
  ) => {
    const api = getDesktop();
    if (!api) {
      toast.error(
        "未连接桌面能力（window.desktop 不可用）。请使用本应用打包的 Electron 窗口；浏览器仅预览时此按钮不会执行编排。",
        { duration: 5000 },
      );
      return;
    }
    try {
    const runningNow = await syncExecutionState();
    if (runningNow || sending) {
      stopChainExecution();
      stopChat();
      toast.info("已请求停止当前工作流，准备从 WBS 第 0 步重新开始…", { duration: 2600 });
      const deadline = Date.now() + 6000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 120));
        const running = await syncExecutionState();
        if (!running && !sendingRef.current) break;
      }
      const stillBusy = await syncExecutionState();
      if (stillBusy || sendingRef.current) {
        toast.warning("旧流程仍在收尾，请稍后再点一次「按WBS开工」。", { duration: 3600 });
        return;
      }
    }
    if (typeof api.orchestrationSaveChain !== "function") {
      toast.error("当前版本未暴露任务链写入接口，请重启到最新桌面应用。");
      return;
    }
    const settings = await api.getChatSettings();
    const readWorkspaceTextFile = api.readWorkspaceTextFile;
    if (typeof readWorkspaceTextFile !== "function") {
      toast.error("当前版本未暴露工作区读文件接口，请重启到最新桌面应用。");
      return;
    }
    const listMd =
      typeof api.listWorkspaceMarkdownFiles === "function"
        ? async () => {
            const listed = await api.listWorkspaceMarkdownFiles!();
            return listed.ok && Array.isArray(listed.files) ? listed.files : [];
          }
        : async () => [];

    const discovered = await discoverWbsDocument(
      listMd,
      (p) => readWorkspaceTextFile(p),
      {
        preferredPath: opts?.preferredPath,
        extraCandidatePaths: [settings.defaultConfirmWritePath?.trim() || ""],
        wbsFilenameOnly: Boolean(opts?.wbsOnly),
      },
    );

    let pickedPath = "";
    let pickedText = "";
    let wbsDiscoverSource: "filename" | "content-scan" | "" = "";

    if (discovered) {
      pickedPath = discovered.path;
      pickedText = discovered.text;
      wbsDiscoverSource = discovered.source;
    } else if (opts?.wbsOnly) {
      const fallback = await discoverWbsDocument(
        listMd,
        (p) => readWorkspaceTextFile(p),
        {
          preferredPath: opts?.preferredPath,
          extraCandidatePaths: [
            "docs/project-status.md",
            settings.defaultConfirmWritePath?.trim() || "",
          ],
          wbsFilenameOnly: false,
        },
      );
      if (fallback) {
        pickedPath = fallback.path;
        pickedText = fallback.text;
        wbsDiscoverSource = fallback.source;
        if (!opts?.quietPickToast) {
          toast.info(
            `未找到 docs/wbs*.md，已从 ${pickedPath} 识别任务分配（/agent 或 WBS 表格）并生成任务链。`,
            { duration: 5600 },
          );
        }
      }
    }

    if (!pickedText) {
      toast.error(
        "未读取到可解析的 WBS。请先用 `/agent project-manager` 生成含「编号 | 工作摘要 | 执行 Agent」表格并落盘到 docs/wbs.md；project-shepherd 默认写入 docs/project-status.md，不能替代 WBS。",
        { duration: 7200 },
      );
      return;
    }
    if (wbsDiscoverSource === "content-scan" && !opts?.quietPickToast) {
      toast.info(`未找到 docs/wbs*.md，已从 ${pickedPath} 识别 WBS 表格并生成任务链。`, {
        duration: 5200,
      });
    }
    if (opts?.preferredPath && !opts?.quietPickToast) {
      toast.info(`已按退出点优先匹配：${pickedPath}`);
    }
    const parsed = parseActiveChainFromBubbleText(pickedText);
    if (!parsed.ok) {
      toast.error(`WBS 解析失败：${parsed.error}`, { duration: 5000 });
      toast.info(`已尝试文件：${pickedPath}。建议先将 WBS 导出为 Markdown 表格（含“编号/工作摘要/执行 Agent”）。`, {
        duration: 5500,
      });
      return;
    }
    const saved = await api.orchestrationSaveChain({ state: parsed.state });
    if (!saved.ok) {
      toast.error(saved.error || "写入任务链失败", { duration: 5000 });
      return;
    }
    toast.success(`已基于 ${pickedPath} 生成任务链（${parsed.state.steps.length} 步），开始执行…`);
    await runOrchestrationChain({ skipConfirm: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("runWorkflowFromWbs", e);
      toast.error(`按 WBS 开工失败：${msg || "未知错误"}`, { duration: 6000 });
    }
  };

  /**
   * 继续执行（优先从 currentIndex 续跑）；若链缺失/已跑完，则按“退出时间”就近匹配工作区 .md 重建链并执行。
   */
  const runContinueFromExit = async () => {
    const api = getDesktop();
    if (!api) return;
    const loaded = await api.orchestrationLoadChain();
    const st = loaded.ok ? loaded.state : null;
    const hasPending =
      Boolean(st) &&
      Array.isArray(st?.steps) &&
      (st?.steps?.length ?? 0) > 0 &&
      (st?.currentIndex ?? 0) < (st?.steps?.length ?? 0);
    if (hasPending) {
      // 用户点击“继续执行”即视为确认继续，跳过二次确认弹窗
      await runOrchestrationChain({ skipConfirm: true });
      return;
    }
    const hasCompleted =
      Boolean(st) &&
      Array.isArray(st?.steps) &&
      (st?.steps?.length ?? 0) > 0 &&
      (st?.currentIndex ?? 0) >= (st?.steps?.length ?? 0);
    if (hasCompleted) {
      toast.info("当前任务链已完成。若要从第 0 步重跑，请点击「按WBS开工」。", { duration: 4200 });
      return;
    }
    const sess = sessions.find((s) => s.id === activeId);
    const exitTs = [...(sess?.history ?? [])].reverse().find((m) => typeof m.ts === "number")?.ts ?? Date.now();
    if (typeof api.listWorkspaceMarkdownFiles !== "function") {
      await runWorkflowFromWbs({ wbsOnly: true });
      return;
    }
    let listed:
      | { ok: boolean; files?: { relPath: string; mtimeMs: number; size: number }[]; error?: string }
      | null = null;
    try {
      listed = await api.listWorkspaceMarkdownFiles();
    } catch {
      // 兼容旧主进程：preload 已暴露函数，但主进程尚未注册 handler
      await runWorkflowFromWbs();
      return;
    }
    const files = listed.ok && Array.isArray(listed.files) ? listed.files : [];
    if (!files.length) {
      await runWorkflowFromWbs({ wbsOnly: true });
      return;
    }
    const score = (p: string) => {
      const l = p.toLowerCase();
      if (/(^|\/)wbs[^/]*\.md$/.test(l)) return 8;
      if (l.includes("qa") || l.includes("test")) return 4;
      if (l.includes("progress")) return 3;
      if (l.includes("risk") || l.includes("milestone")) return 2;
      if (l.includes("prd")) return 1;
      return 0;
    };
    let picked = files[0];
    let best = Number.NEGATIVE_INFINITY;
    for (const f of files.slice(0, 200)) {
      const dtMin = Math.abs((f.mtimeMs - exitTs) / 60000);
      const timeScore = dtMin <= 10 ? 6 : dtMin <= 60 ? 4 : dtMin <= 360 ? 2 : 0;
      const total = score(f.relPath) * 10 + timeScore;
      if (total > best) {
        best = total;
        picked = f;
      }
    }
    await runWorkflowFromWbs({ preferredPath: picked.relPath, wbsOnly: true });
  };

  const inlineComposer = useMemo((): ChatComposerShellProps | null => {
    if (editHistoryIndex == null || !editComposer) return null;
    return {
      textareaRef: inlineTaRef,
      input: editComposer.input,
      onInputChange: (v) => setEditComposer((prev) => (prev ? { ...prev, input: v } : prev)),
      onSend: () => void sendChat(),
      onStop: () => stopChat(),
      onPaste: handleInlineComposerPaste,
      placeholder: composerPlaceholder,
      disabled: workflowBusy,
      workflowBusy,
      hasDesktopApi,
      canSend: Boolean(
        editComposer.input.trim() ||
          editComposer.pendingImages.length ||
          editComposer.pendingTerminalSnippets.length,
      ),
      pendingImages: editComposer.pendingImages,
      onRemoveImage: (id) =>
        setEditComposer((prev) =>
          prev ? { ...prev, pendingImages: prev.pendingImages.filter((x) => x.id !== id) } : prev,
        ),
      pendingTerminalSnippets: editComposer.pendingTerminalSnippets,
      onRemoveTerminalSnippet: (id) =>
        setEditComposer((prev) =>
          prev
            ? {
                ...prev,
                pendingTerminalSnippets: prev.pendingTerminalSnippets.filter((x) => x.id !== id),
              }
            : prev,
        ),
      onPickFiles: (opts) => void pickLocalFiles(opts),
      orchMode,
      localAgentBasename,
      onAgentChange: (b) => void handleAgentChange(b),
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
      modelValue: activeSession?.modelId || globalModel || primaryModelFallback || "",
      modelFallback: primaryModelFallback,
      onModelPick: (pick) => void handleModelPick(pick),
      onCancelEdit: cancelEditUserMessage,
    };
  }, [
    editHistoryIndex,
    editComposer,
    workflowBusy,
    hasDesktopApi,
    orchMode,
    localAgentBasename,
    orchestratorModels,
    localOllamaTags,
    activeSession?.modelId,
    globalModel,
    primaryModelFallback,
    handleInlineComposerPaste,
    cancelEditUserMessage,
    pickLocalFiles,
    handleAgentChange,
    handleModelPick,
    stopChat,
  ]);

  const editingUserMessage = useMemo((): Msg | null => {
    if (editHistoryIndex == null) return null;
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return null;
    const ml = sess.modelId?.trim() || globalModel || "模型";
    return userMessageForHistoryIndex(sess.history, editHistoryIndex, ml);
  }, [editHistoryIndex, sessions, activeId, globalModel]);

  return (
    <AppShell variant="workbench">
      <div className="workbench-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <WorkbenchCursorLayout
          chatBodyMountRef={onChatBodyMountRef}
          onOpenChatPanel={openChatPanel}
          onInsertTerminalSelection={insertTerminalSelection}
          chatHeader={
            <ChatPanelToolbar
              sessions={visibleSessions}
              activeId={activeId}
              sendingSessions={sendingSessions}
              onSessionChange={(id) => void handleSessionChange(id)}
              onNewSession={() => void handleNewSession()}
              onCloseSession={(id) => void handleCloseSession(id)}
              hasDesktopApi={hasDesktopApi}
              onClosePanel={() => setChatPanelOpen(false)}
              terminalOpen={terminalOpen}
              onToggleTerminal={() => setTerminalOpen((v) => !v)}
              projectHistoryItems={projectHistoryItems}
              allHistoryItems={allHistoryItems}
              onSelectHistorySession={(id) => void activateHistorySession(id)}
              onHistoryOpen={handleHistoryOpen}
            />
          }
          centerToolbar={
            <div className="absolute left-1.5 top-1.5 z-20 flex items-center gap-1">
              {!leftSidebarOpen ? (
                <button
                  type="button"
                  onClick={() => setLeftSidebarOpen(true)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border/80 bg-surface/90 px-2 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition hover:bg-secondary hover:text-foreground"
                  title="显示文件树"
                >
                  <PanelRightOpen className="h-3.5 w-3.5 rotate-180" />
                  <span className="hidden sm:inline">文件</span>
                </button>
              ) : null}
              {!chatPanelOpen ? (
                <button
                  type="button"
                  onClick={() => setChatPanelOpen(true)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border/80 bg-surface/90 px-2 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition hover:bg-secondary hover:text-foreground"
                  title="显示聊天"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">聊天</span>
                </button>
              ) : null}
            </div>
          }
          terminalOpen={terminalOpen}
          onTerminalOpenChange={setTerminalOpen}
          leftOpen={leftSidebarOpen}
          onLeftOpenChange={setLeftSidebarOpen}
          rightOpen={chatPanelOpen}
          onRightOpenChange={setChatPanelOpen}
        />
        {chatBodyMountEl
          ? createPortal(
        <div
          className="chat-pane-layout h-full min-h-0"
          style={{ ["--composer-h" as string]: `${composerDockHeight}px` }}
        >
          <ChatMessagesPane
            messages={messages}
            editHistoryIndex={editHistoryIndex}
            editingUserMessage={editingUserMessage}
            inlineComposer={inlineComposer}
            scrollAreaRef={scrollAreaRef}
            messagesEndRef={messagesEndRef}
            showJumpLatest={showJumpLatest}
            onJumpToLatest={jumpToLatest}
            hasDesktopApi={hasDesktopApi}
            onWriteToWorkspace={handleBubbleWriteToWorkspace}
            onGenerateChain={handleBubbleGenerateChain}
            onEditUserMessage={beginEditUserMessage}
            onRequestResendUserMessage={requestResendUserMessage}
          />

          <ChatComposerCursor
            dockRef={composerDockRef}
            textareaRef={taRef}
            input={input}
            onInputChange={setInput}
            onSend={() => void sendChat()}
            onStop={() => stopChat()}
            onPaste={handleComposerPaste}
            placeholder={composerPlaceholder}
            disabled={workflowBusy}
            workflowBusy={workflowBusy}
            hasDesktopApi={hasDesktopApi}
            canSend={
              Boolean(input.trim() || pendingImages.length || pendingTerminalSnippets.length)
            }
            pendingImages={pendingImages}
            onRemoveImage={(id) => setPendingImages((p) => p.filter((x) => x.id !== id))}
            pendingTerminalSnippets={pendingTerminalSnippets}
            onRemoveTerminalSnippet={(id) =>
              setPendingTerminalSnippets((p) => p.filter((x) => x.id !== id))
            }
            onPickFiles={(opts) => void pickLocalFiles(opts)}
            orchMode={orchMode}
            localAgentBasename={localAgentBasename}
            onAgentChange={(b) => void handleAgentChange(b)}
            cloudModels={orchestratorModels}
            localModels={localOllamaTags}
            modelValue={activeSession?.modelId || globalModel || primaryModelFallback || ""}
            modelFallback={primaryModelFallback}
            onModelPick={(pick) => void handleModelPick(pick)}
            chainStatusLabel={chainStatusBadge.label}
            chainStatusTone={chainStatusBadge.tone}
            onCancelEdit={cancelEditUserMessage}
          />
        </div>,
              chatBodyMountEl,
            )
          : null}
      </div>
      <input
        ref={attachInputRef}
        type="file"
        multiple
        className="pointer-events-none fixed inset-0 h-0 w-0 opacity-0"
        aria-hidden
        tabIndex={-1}
        onChange={onAttachInputChange}
      />
      <GithubDialog open={githubOpen} onClose={() => setGithubOpen(false)} />
      <ChatResendConfirmDialog
        open={checkpointConfirm != null}
        onOpenChange={(open) => {
          if (!open) setCheckpointConfirm(null);
        }}
        onConfirm={() => {
          if (!checkpointConfirm) return;
          runCheckpointAction(checkpointConfirm.historyIndex, checkpointConfirm.action);
          setCheckpointConfirm(null);
        }}
      />
    </AppShell>
  );
}

function SkillChip({ label, icon: Icon, onRemove }: { label: string; icon: typeof Zap; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[11.5px] font-medium text-primary">
      <Icon className="h-3 w-3" />
      {label}
      <button onClick={onRemove} className="ml-0.5 rounded-full p-0.5 text-primary/60 transition hover:bg-primary/10 hover:text-primary">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function SpeedChip({ open, setOpen, speed, setSpeed }: { open: boolean; setOpen: (v: boolean) => void; speed: string; setSpeed: (v: string) => void }) {
  const opts = [
    { label: "快速", desc: "适用于大部分情况", icon: Zap, color: "text-amber-500" },
    { label: "思考", desc: "擅长解决更难的问题", icon: Circle, color: "text-foreground" },
    { label: "专家", desc: "研究级智能模型", icon: Diamond, color: "text-muted-foreground", badge: "新" },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground">
        <Zap className="h-3 w-3 text-amber-500" /> {speed} <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          {opts.map((o, i) => {
            const Icon = o.icon;
            const sel = o.label === speed;
            return (
              <button key={i} onClick={() => { setSpeed(o.label); setOpen(false); }} className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition", sel ? "bg-primary-soft/50" : "hover:bg-secondary")}>
                <Icon className={cn("mt-0.5 h-4 w-4", o.color)} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    {o.label}
                    {o.badge && <span className="rounded bg-primary-soft px-1 py-px text-[10px] font-medium text-primary">{o.badge}</span>}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">{o.desc}</div>
                </div>
                {sel && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UploadChip({ onClick, label, hasArrow }: { onClick: () => void; label: string; hasArrow?: boolean }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground">
      <Paperclip className="h-3.5 w-3.5" /> {label} {hasArrow && <ChevronDown className="h-2.5 w-2.5" />}
    </button>
  );
}

function ModelChip({
  label,
  open,
  setOpen,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  options: string[];
  onSelect: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" /> {label}{" "}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && !disabled && options.length > 0 && (
        <div className="absolute bottom-full left-1/2 z-30 mb-2 max-h-64 w-56 -translate-x-1/2 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-lg scrollbar-thin">
          {options.map((o) => {
            const sel = o === label;
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onSelect(o);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-mono text-[12px] transition",
                  sel ? "bg-primary-soft/50 font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" /> {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STYLE_OPTIONS = [
  "人像摄影", "电影写真", "中国风", "动漫", "3D 渲染", "赛博朋克",
  "平面插画", "风景", "像素风格", "水墨画", "油画", "水彩画",
];

function StylePopover({ open, setOpen, value, setValue }: { open: boolean; setOpen: (v: boolean) => void; value: string; setValue: (v: string) => void }) {
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground transition hover:text-foreground">
        <Disc className="h-3.5 w-3.5" /> {value || "风格"} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">风格</div>
          <div className="max-h-72 space-y-0.5 overflow-y-auto scrollbar-thin pr-1">
            {STYLE_OPTIONS.map((s) => {
              const sel = s === value;
              return (
                <button key={s} onClick={() => { setValue(s); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition", sel ? "bg-secondary" : "hover:bg-secondary/60")}>
                  <span className="h-10 w-10 shrink-0 rounded-xl border border-border bg-gradient-to-br from-secondary to-muted" />
                  <span className="text-[13px] text-foreground">{s}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const TEMPLATE_OPTIONS = ["社交媒体海报", "产品详情页", "故事板三栏", "简洁封面", "对比两栏", "时间线"];

function TemplatePopover({ open, setOpen, value, setValue }: { open: boolean; setOpen: (v: boolean) => void; value: string | null; setValue: (v: string | null) => void }) {
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground transition hover:text-foreground">
        <Square className="h-3.5 w-3.5" /> {value || "模板"}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-52 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">模板</div>
          {TEMPLATE_OPTIONS.map((t) => {
            const sel = t === value;
            return (
              <button key={t} onClick={() => { setValue(sel ? null : t); setOpen(false); }} className={cn("flex w-full items-center rounded-xl px-3 py-2 text-left text-[13px] transition", sel ? "bg-primary-soft/50 font-semibold text-foreground" : "text-foreground hover:bg-secondary")}>
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GithubDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const repos = [
    { name: "EPLB", desc: "EP 间并行动态负载均衡" },
    { name: "deepseek", desc: "面向 MoE 与 EP 的通信相关参考" },
    { name: "lighthouse", desc: "网络应用质量与性能" },
    { name: "blog", desc: "数据结构与算法笔记" },
    { name: "notekit", desc: "支持手绘的 Markdown 笔记" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-foreground">引入开源仓库</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              目前仅支持在终端手动克隆公开仓库；此处可记录常用 GitHub 链接便于复制。
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          type="text"
          placeholder="输入 GitHub 链接"
          className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="mt-5 text-[12px] font-semibold text-foreground">热门仓库</div>
        <div className="mt-2 divide-y divide-border">
          {repos.map((r) => (
            <div key={r.name} className="flex items-baseline gap-2 py-2.5 text-[13px]">
              <span className="font-semibold text-foreground">{r.name}</span>
              <span className="text-muted-foreground">：{r.desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary">
            取消
          </button>
          <button className="rounded-lg px-4 py-1.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-95" style={{ backgroundImage: "var(--gradient-primary)" }}>
            复制链接
          </button>
        </div>
      </div>
    </div>
  );
}

function SegmentToggle({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-secondary p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full px-3 py-0.5 text-[11.5px] font-medium transition",
            value === o ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function RatioChip({ open, setOpen, ratio, setRatio }: { open: boolean; setOpen: (v: boolean) => void; ratio: string; setRatio: (v: string) => void }) {
  const opts = [
    { v: "1:1", desc: "正方形，头像" },
    { v: "2:3", desc: "社交媒体，自拍" },
    { v: "3:4", desc: "经典比例，拍照" },
    { v: "4:3", desc: "文章配图，插画" },
    { v: "9:16", desc: "手机壁纸，人像" },
    { v: "16:9", desc: "桌面壁纸，风景" },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground">
        <Square className="h-3.5 w-3.5" /> 比例 · {ratio} <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">比例</div>
          {opts.map((o) => {
            const sel = o.v === ratio;
            return (
              <button key={o.v} onClick={() => { setRatio(o.v); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition", sel ? "bg-primary-soft/40" : "hover:bg-secondary")}>
                <Square className={cn("h-3.5 w-3.5", sel ? "fill-primary/30 text-primary" : "text-muted-foreground")} />
                <span className="text-[13px] font-semibold text-foreground">{o.v}</span>
                <span className="text-[12px] text-muted-foreground">{o.desc}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LengthChip({ open, setOpen, length, setLength }: { open: boolean; setOpen: (v: boolean) => void; length: string; setLength: (v: string) => void }) {
  const opts = [
    { v: "智能推荐", icon: Sparkles },
    { v: "精简", icon: Menu },
    { v: "适中", icon: AlignJustify },
    { v: "详细", icon: AlignLeft },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground">
        <AlignJustify className="h-3.5 w-3.5" /> 篇幅 <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-44 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">篇幅</div>
          {opts.map((o) => {
            const Icon = o.icon;
            const sel = o.v === length;
            return (
              <button key={o.v} onClick={() => { setLength(o.v); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition", sel ? "bg-primary-soft/40 font-semibold text-foreground" : "hover:bg-secondary")}>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {o.v}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
