import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  type ClipboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { AppShell } from "@/components/app-shell";
import { useChatState } from "@/contexts/chat-state-context";
import { WorkbenchMainLayout } from "@/components/workbench-main-layout";
import { getDesktop } from "@/lib/desktop-api";
import {
  AUTO_MODEL_ID,
  chatModelPoolCombined,
  isAutoModelSelection,
  loadChatModelPools,
  loadConfiguredModelPools,
  resolveModelForExecution,
} from "@/lib/model-catalog";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { isAutoAgentBasename } from "@/lib/agent-basename";
import {
  useOrchestrationExecution,
  useChatSessionRevision,
} from "@/hooks/use-orchestration-execution";
import { buildClaudeCodePrompt } from "@/lib/claude-prompt";
import {
  collectAtSkillStems,
  loadComposerSkillSnippet,
  prependSkillSnippet,
} from "@/lib/composer-skill-inject";
import { dedupeSkillStems } from "@/lib/agent-skill-defaults";
import { expandAtMentionsInUserLine } from "@/lib/composer-at-mention";
import { getEditorSelectionSnapshot } from "@/lib/editor-selection-snapshot";
import { autoAcceptPendingFromAssistantReply } from "@/lib/agent-auto-accept-pending";
import { toastMcpHealthIfDegraded } from "@/lib/mcp-health-hint";
import {
  agentForceContinueInstruction,
  hasAgentWriteEvidence,
  looksLikeAgentAskingConfirmation,
} from "@/lib/agent-no-confirm";
import {
  formatAgentTurnMetaAppendix,
  lastAgentTurnMeta,
} from "@/lib/agent-turn-meta";
import {
  cliPermissionModeForInteraction,
  getWorkbenchInteractionMode,
  setWorkbenchInteractionMode,
} from "@/lib/workbench-interaction-mode";
import { setPlanBuildHandler } from "@/lib/plan-build-request";
import { setAgentFixHandler } from "@/lib/agent-fix-request";
import { PLAN_BUILD_ASK_BLOCKED } from "@/lib/ui-copy";
import { toast } from "sonner";
import { toastWorkspaceWriteSuccess } from "@/lib/toast-workspace-write";
import {
  buildShortAgentSummary,
  extractStreamEventsFromContent,
  extractWrittenPathsFromAgentContent,
  isPlausibleWorkspaceRelPath,
  mergeStreamEvents,
  looksLikeAgentTurnReport,
  shapeAgentTurnDisplay,
  toolTraceToStreamEvents,
} from "@/lib/compress-agent-display";
import {
  collectPriorUserAttachments,
  mergeInlineAttachments,
  modelSupportsChatVision,
  normalizePendingImageFiles,
  visionRequiredError,
} from "@/lib/chat-image-attach";
import { type PriorTurn, type UserImageAttachment } from "@/lib/ollama-messages";
import {
  applyPendingWorkspaceWrite,
  collapseAcceptedWorkspaceWriteForHistory,
  collapseWorkspaceWriteForHistory,
  ingestWorkspaceWritesAndCollapseDisplay,
  ingestChainStepWorkspaceWrites,
  stripLargeAssistantArtifacts,
} from "@/lib/assistant-reply";
import { parseChatFileEdits } from "@/lib/parse-chat-file-edits";
import { stripStreamEventsBlock } from "@/lib/stream-agent-events";
import {
  clearPendingWritesState,
  setPendingWritesState,
  type PendingWriteItem,
} from "@/lib/workbench-pending-writes";
import {
  clearRejectedWorkspaceWrite,
  rejectWorkspaceWrite,
} from "@/lib/rejected-workspace-writes";
import { resolveWorkspaceEditContent } from "@/lib/resolve-workspace-edit-content";
import { stashWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";
import {
  clearSessionHistoryCheckpoint,
  loadSessionHistoryCheckpoint,
  saveSessionHistoryCheckpoint,
  subscribeRestoreSessionCheckpoint,
} from "@/lib/session-history-checkpoint";
import { parseActiveChainFromBubbleText } from "@/lib/parse-active-chain";
import {
  autoSaveChainFromReply,
  notifyAutoSavedChain,
  saveChainFromBubbleText,
} from "@/lib/auto-save-chain-from-reply";
import {
  formatWbsChainSyncAssistantReply,
  parseWbsChainIntent,
  registerParsedChainInList,
  WBS_GENERATE_PM_PROMPT,
  type WbsChainSyncResult,
} from "@/lib/wbs-chain-registry";
import { discoverWbsDocument } from "@/lib/discover-wbs-document";
import { handleChainChatCommand } from "@/lib/run-chain-from-chat";
import { syncOfficialGenericChains } from "@/lib/sync-official-chains";
import { buildAgentChainCatalogMarkdown } from "@/lib/agent-chain-catalog";
import { parseChainCommand } from "@/lib/parse-chain-command";
import { resolveAgentForTurn } from "@/lib/resolve-agent-for-turn";
import { parseParallelIntent } from "@/lib/parse-parallel-intent";
import {
  ParallelDispatchDialog,
  type ParallelDispatchConfig,
} from "@/components/parallel-dispatch-dialog";
import { resolveAgentDisplayName } from "@/lib/agent-display-name";
import { maybeToastMissingWorkspaceWrite } from "@/lib/maybe-toast-workspace-write";
import { restoreUserMsgToComposer } from "@/lib/restore-user-composer";
import {
  buildConfirmWriteItems,
  buildFenceOnlyWriteItems,
  isBulkWriteProjectMessage,
} from "@/lib/confirm-write";
import { performBulkWriteFromHistory } from "@/lib/bulk-write-from-history";
import { runProjectFromChat } from "@/lib/run-project-in-terminal";
import { MSG_BRIDGE_OFFLINE } from "@/lib/user-messages";
import { BROWSER_MODE_CHAT_MESSAGE, COMPOSER_PLACEHOLDER, LOCAL_ONLY_HINT } from "@/lib/ui-copy";
import {
  isProjectPreviewMessage,
  isStopPreviewMessage,
  performStopPreview,
} from "@/lib/project-preview";
import { isOpenTerminalMessage } from "@/lib/workspace-terminal-client";
import {
  expandUserLineWithWorkspaceFiles,
  preReadInstructedWorkspaceFiles,
  buildDocsFileListHint,
} from "@/lib/expand-user-line-workspace-files";
import { buildAgentRoutedInstruction } from "@/lib/agent-skill-routing";
import { buildSubagentUserLine, parseAgentCommand } from "@/lib/parse-agent-command";
import {
  Plus,
  Send,
  X,
  Check,
  ArrowLeftRight,
  Flashlight,
  Disc,
  Music,
  CheckSquare,
  PieChart,
  Sparkle,
  ChevronDown,
} from "lucide-react";
import { WorkbenchChatComposer } from "@/components/workbench-chat-composer";
import type { ChatComposerShellProps } from "@/components/chat-composer-shell";
import { type PendingFileEntry } from "@/components/composer-file-attachments";
import { ChatMessagesPane } from "@/components/chat-messages-pane";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useChatStream } from "@/hooks/use-chat-stream";
import {
  mergeLiveToolEventIntoAssistantMessages,
  useAgentToolStream,
} from "@/hooks/use-agent-tool-stream";
import { useChatSend } from "@/hooks/use-chat-send";
import { WorkbenchPanelToolbar } from "@/components/workbench-panel-toolbar";
import { focusBottomPanel } from "@/lib/workbench-panel-init";
import {
  requestWorkbenchCommandPalette,
  requestWorkbenchQuickOpen,
  requestWorkbenchSideTab,
  subscribeWorkbenchSideTab,
} from "@/lib/workbench-side-tab";
import { ChatPanelToolbar } from "@/components/chat-panel-toolbar";
import { ChatResendConfirmDialog } from "@/components/chat-resend-confirm-dialog";
import { GithubDialog } from "@/components/chat/github-dialog";
import { toChatHistoryListItem } from "@/lib/chat-history-groups";
import { sortSessionsByLatest } from "@/lib/chat-session-activity";
import {
  CHAIN_TEMPLATES,
  applyChainTemplate,
  getChainTemplate,
  officialChainId,
} from "@/lib/chain-templates";
import type { QuickChainOption } from "@/components/chain-quick-trigger";
import { shouldSkipCheckpointConfirm } from "@/lib/chat-checkpoint-prefs";
import {
  filterSessionsForWorkspace,
  filterSessionsForWorkspaceTabs,
  pickActiveSessionId,
  pruneDuplicateEmptySessions,
  resolveWorkspaceChatSessions,
  agentBasenameForWorkspace,
  sessionMatchesWorkspaceTab,
  backfillSessionWorkspaceFromActiveMap,
  stampSessionWorkspaceIfMissing,
  workspaceSessionKey,
  chatSessionsCacheMatchesWorkspace,
} from "@/lib/chat-session-workspace";
import {
  clearExplicitEmptyChatSession,
  clearExplicitEmptyChatSessionIf,
  getChatSessionsCache,
  markExplicitEmptyChatSession,
  setChatSessionsCache,
  syncExplicitEmptyInCache,
} from "@/lib/chat-sessions-store";
import { type PendingTerminalSnippet } from "@/components/composer-terminal-attachments";
import { type DomElementPayload, type PendingDomElement } from "@/lib/dom-element-meta";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";
import { chatRouteSearch, EMPTY_CHAT_SEARCH } from "@/lib/chat-route-search";
import type { DesktopApi } from "@/types/desktop";
import {
  assistantBubbleName,
  buildComposerUserLine,
  buildPlainChatPrompt,
  countUserMessages,
  diskToDisplay,
  extractPreviewUrlFromText,
  formatAssistantFailure,
  fullChatSettingsPayload,
  genSessionId,
  mergeSessionsPreferLongerHistory,
  needsCheckpointConfirm,
  newLocalId,
  pickOrchestratorModel,
  priorTurnsToOrchestrationMessages,
  toastIfLocalOrchestrationHints,
  toastIngestWorkspaceHint,
  userMessageForHistoryIndex,
  type ChatSession,
  type DiskMsg,
  type Msg,
  type OrchMode,
} from "@/lib/chat-send-helpers";
import { chooseWorkspaceWithFeedback } from "@/lib/choose-workspace";

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
  head: () => ({ meta: [{ title: "聊天 · Claude Orchestrator" }] }),
  component: ChatPage,
});

const EMPTY_SESSION_WELCOME = "新对话已开始。";

function ChatPage() {
  const hasDesktopApi = useHasDesktop();
  const navigate = useNavigate();
  const {
    session: urlSessionId,
    new: urlNewSession,
    claudeResume: urlClaudeResume,
  } = Route.useSearch();
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
  const chatCtx = useChatState();
  const sessionRevision = useChatSessionRevision();

  // ---- 通知上下文 ChatPage 已挂载（GlobalChatPanel 据此决定是否接管流） ----
  useEffect(() => {
    chatCtx.syncChatPageMounted(true);
    return () => chatCtx.syncChatPageMounted(false);
  }, [chatCtx]); // eslint-disable-line

  const [input, setInput] = useState("");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [parallelDialogOpen, setParallelDialogOpen] = useState(false);
  const [parallelDialogPreset, setParallelDialogPreset] = useState<string[] | undefined>(undefined);
  const [parallelDialogDefaultTask, setParallelDialogDefaultTask] = useState<string | undefined>(
    undefined,
  );
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
  /** 当前已打开（显示为标签页）的会话 ID 列表；仅活跃会话默认打开，其余需从历史中唤醒 */
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [imageModel, setImageModel] = useState("");
  const [videoModel, setVideoModel] = useState("");
  const [imgModelOpen, setImgModelOpen] = useState(false);
  const [vidModelOpen, setVidModelOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const inlineTaRef = useRef<HTMLTextAreaElement>(null);
  /** 非 Electron（浏览器预览）时的附件兜底 */
  const attachInputRef = useRef<HTMLInputElement>(null);
  /** 输入框内待发送的图片（粘贴 / 选图） */
  const [pendingImages, setPendingImages] = useState<(UserImageAttachment & { id: string })[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFileEntry[]>([]);
  const [pendingTerminalSnippets, setPendingTerminalSnippets] = useState<PendingTerminalSnippet[]>(
    [],
  );
  const [pendingDomElements, setPendingDomElements] = useState<PendingDomElement[]>([]);
  /** Composer 本轮可选 Skill（空 = 发送路径与改前一致） */
  const [selectedSkillStems, setSelectedSkillStems] = useState<string[]>([]);
  const [editHistoryIndex, setEditHistoryIndex] = useState<number | null>(null);
  const editHistoryIndexRef = useRef<number | null>(null);

  // ---- settings 缓存：减少 IPC 重复调用 ----
  type ChatSettings = Awaited<ReturnType<DesktopApi["getChatSettings"]>>;
  const settingsCacheRef = useRef<ChatSettings | null>(null);
  const getCachedSettings = useCallback(async (api: DesktopApi): Promise<ChatSettings> => {
    if (settingsCacheRef.current) return settingsCacheRef.current;
    const s = await api.getChatSettings();
    settingsCacheRef.current = s;
    return s;
  }, []);
  useEffect(() => {
    const api = getDesktop();
    if (!api?.onChatSettingsChanged) return;
    return api.onChatSettingsChanged(() => {
      settingsCacheRef.current = null;
    });
  }, []);

  const [editComposer, setEditComposer] = useState<{
    input: string;
    pendingImages: (UserImageAttachment & { id: string })[];
    pendingFiles: PendingFileEntry[];
    pendingTerminalSnippets: PendingTerminalSnippet[];
    pendingDomElements: PendingDomElement[];
  } | null>(null);
  const editComposerRef = useRef<typeof editComposer>(null);
  const sendPayloadOverrideRef = useRef<{
    text: string;
    pendingImages: (UserImageAttachment & { id: string })[];
    pendingFiles: PendingFileEntry[];
    pendingTerminalSnippets: PendingTerminalSnippet[];
    pendingDomElements?: PendingDomElement[];
    /** 省略则保留完整历史；0 表示截断为空（如 WBS 生成） */
    editCutoff?: number;
  } | null>(null);
  const newSessionInFlightRef = useRef(false);
  const closingSessionTargetRef = useRef<string | null>(null);
  const streamContextRef = useRef<{ sessionId: string; requestId: string } | null>(null);
  const activeStreamRequestIdRef = useRef<string | null>(null);
  const [activeStreamRequestId, setActiveStreamRequestId] = useState<string | null>(null);
  const sendingSessionsRef = useRef<Record<string, boolean>>({});
  const chainRunningRef = useRef(false);
  const chainDocsInjectedRef = useRef(false);
  const expandInjectedPathsRef = useRef<string[]>([]);
  const runWorkflowFromWbsRef = useRef<
    ((opts?: {
      preferredPath?: string;
      quietPickToast?: boolean;
      wbsOnly?: boolean;
      autoRun?: boolean;
      recordUserLine?: string;
    }) => Promise<WbsChainSyncResult | null>) | null
  >(null);
  const composerDraftsRef = useRef<
    Record<
      string,
      {
        input: string;
        pendingImages: (UserImageAttachment & { id: string })[];
        pendingFiles: PendingFileEntry[];
        pendingTerminalSnippets: PendingTerminalSnippet[];
      }
    >
  >({});
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const insertDomElement = useCallback((payload: DomElementPayload) => {
    if (!payload.selector) return;
    setPendingDomElements((prev) => [...prev, { ...payload, id: newLocalId() }]);
    requestAnimationFrame(() => taRef.current?.focus());
  }, []);

  const openChatPanel = useCallback(() => {
    setChatPanelOpen(true);
  }, []);

  const prefillComposer = useCallback((text: string) => {
    const t = String(text || "").trim();
    if (!t) return;
    setChatPanelOpen(true);
    setInput(t);
    requestAnimationFrame(() => taRef.current?.focus());
  }, []);

  const pickLocalFiles = useCallback(async (opts?: { onlyImages?: boolean }) => {
    const onlyImages = opts?.onlyImages ?? false;
    const api = getDesktop();
    if (api?.chooseReferenceFiles) {
      const r = await api.chooseReferenceFiles({ multiple: true, onlyImages });
      if (r.canceled || !r.filePaths.length) return;
      if (onlyImages && api.readReferenceFilesAsImageAttachments) {
        const read = await api.readReferenceFilesAsImageAttachments(r.filePaths);
        const items = read?.items ?? [];
        if (read?.ok && items.length) {
          setPendingImages((p) => {
            const mapped = items.map((it) => ({
              kind: "image" as const,
              name: it.name,
              mime: it.mime,
              dataUrl: it.dataUrl,
              id: newLocalId(),
            }));
            return [...p, ...mapped];
          });
        }
        return;
      }
      // 非纯图片 → 读入正文后再挂附件（无正文则不挂）
      if (!api.readReferenceTextFiles) {
        toast.error("无法读取附件");
        return;
      }
      const read = await api.readReferenceTextFiles(r.filePaths);
      const items = read?.items ?? [];
      if (!items.length) {
        toast.error(read?.errors?.[0] || "无法读取附件");
        return;
      }
      const fileEntries: PendingFileEntry[] = items.map((it) => ({
        id: newLocalId(),
        name: it.name,
        path: it.path,
        content: it.content,
      }));
      setPendingFiles((p) => [...p, ...fileEntries]);
      return;
    }
    // 浏览器模式：hidden input
    const inp = attachInputRef.current;
    if (inp) {
      inp.accept = onlyImages ? "image/*" : "";
      inp.multiple = true;
      inp.click();
    }
  }, []);

  const appendComposerImageFiles = useCallback(async (files: File[], _cursor?: number) => {
    let startLen = 0;
    setPendingImages((p) => {
      startLen = p.length;
      return p;
    });
    const newItems = await normalizePendingImageFiles(files, startLen);
    if (!newItems.length) return;
    setPendingImages((p) => [...p, ...newItems]);
    requestAnimationFrame(() => taRef.current?.focus());
  }, []);

  const onAttachInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (!files?.length) return;
      const list = Array.from(files);
      const allImg = list.every((f) => f.type.startsWith("image/"));
      if (allImg) {
        void appendComposerImageFiles(list);
        e.target.value = "";
        return;
      }
      // 非图片：读 File 正文；过大/失败则跳过
      void (async () => {
        const MAX = 200 * 1024;
        const entries: PendingFileEntry[] = [];
        for (const f of list) {
          if (f.size > MAX) continue;
          try {
            const content = await f.text();
            if (!content || content.includes("\u0000")) continue;
            entries.push({ id: newLocalId(), name: f.name, content });
          } catch {
            /* skip */
          }
        }
        if (!entries.length) {
          toast.error("无法读取附件");
          return;
        }
      setPendingFiles((p) => [...p, ...entries]);
      })();
      e.target.value = "";
    },
    [appendComposerImageFiles],
  );

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState("s0");
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const workspacePathRef = useRef<string | null>(null);
  const activeByWorkspaceRef = useRef<Record<string, string>>({});
  const pendingHistorySessionRef = useRef<string | null>(null);
  const sessionsHydratedRef = useRef(false);
  const [checkpointConfirm, setCheckpointConfirm] = useState<{
    historyIndex: number;
    action: "edit" | "resend";
  } | null>(null);
  const activeIdRef = useRef(activeId);
  const sessionsRef = useRef<ChatSession[]>([]);
  const prevStreamReqRef = useRef<string | null>(null);
  /** hydration 恢复了流状态时置 true，阻止其他 effect 覆盖 */
  const streamInProgressRef = useRef(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const messagesRef = useRef<Msg[]>([]);
  const [sendingSessions, setSendingSessions] = useState<Record<string, boolean>>({});
  const setSessionSending = useCallback(
    (sessionId: string, value: boolean) => {
      const prev = sendingSessionsRef.current;
      const next = !value
        ? (() => {
            const { [sessionId]: _removed, ...rest } = prev;
            return rest;
          })()
        : { ...prev, [sessionId]: true };
      sendingSessionsRef.current = next;
      setSendingSessions(next);
      chatCtx.syncSendingSessions(next);
    },
    [chatCtx],
  );
  const switchActiveSession = useCallback(
    (id: string) => {
      activeIdRef.current = id;
      setActiveId(id);
      // 直接同步上下文，不依赖 useEffect（可能在组件卸载前未执行）
      chatCtx.syncActiveId(id);
    },
    [chatCtx],
  );

  // ---- 同步上下文的流式状态到本地：当上下文确认流已结束时，确保本地状态也清空 ----
  // 解决 ChatPage 跨路由重新挂载时 sendChat 的 finally 块可能尚未清理完成的状态不一致问题。
  useEffect(() => {
    if (!sessionsHydratedRef.current) return;
    if (chatCtx.activeStreamRequestId) return;
    if (Object.keys(chatCtx.sendingSessions).length > 0) return;
    // 上下文确认流已结束：同步清理本地残留的流式状态
    if (activeStreamRequestId !== null) {
      activeStreamRequestIdRef.current = null;
      setActiveStreamRequestId(null);
    }
    if (Object.keys(sendingSessions).length > 0) {
      sendingSessionsRef.current = {};
      setSendingSessions({});
    }
  }, [
    chatCtx.activeStreamRequestId,
    chatCtx.sendingSessions,
    activeStreamRequestId,
    sendingSessions,
  ]);

  // ---- 同步 openTabIds 到上下文，跨路由切换保留 ----
  useEffect(() => {
    if (!sessionsHydratedRef.current) return;
    chatCtx.syncOpenTabIds(openTabIds);
  }, [chatCtx, openTabIds]);

  // 流式 requestId 也算 busy，避免 sending 标志竞态时仍显示发送钮
  const sending = Boolean(sendingSessions[activeId]) || Boolean(activeStreamRequestId);
  const [stopRequested, setStopRequested] = useState(false);
  useEffect(() => {
    chainRunningRef.current = chainRunning;
    if (chainRunning) chainDocsInjectedRef.current = false;
  }, [chainRunning]);

  const workflowBusy = sending || chainRunning;

  const [globalModel, setGlobalModel] = useState("");
  /** Claude Code CLI `--model` 别名列表（编排层，来自 claudeCodeListModels） */
  const [orchestratorModels, setOrchestratorModels] = useState<string[]>([]);
  /** 本机 Ollama `/api/tags` 模型名（仅展示与写入 MCP 建议，对话不经桌面直连 Ollama） */
  const [localOllamaTags, setLocalOllamaTags] = useState<string[]>([]);
  const configuredPoolsRef = useRef<{ cloudModels: string[]; localModels: string[] }>({
    cloudModels: [],
    localModels: [],
  });
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
  });

  useChatStream({
    activeSessionId: activeId,
    requestId: activeStreamRequestId,
    requestIdRef: activeStreamRequestIdRef,
    enabled: sending,
    onDelta: (_sessionId, chunk, _requestId) => {
      if (!chunk) return;
      if (activeIdRef.current !== _sessionId) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        // 已停止 / 错误气泡不再拼接 delta（避免 Thinking 已清后仍被流式刷回）
        if (last.requestError || last.content === "（生成已停止）") return prev;
        const nextContent = last.content === "__WAITING__" ? chunk : `${last.content}${chunk}`;
        const updated = [...prev.slice(0, -1), { ...last, content: nextContent }];
        // 写入 per-session 累积池（切换菜单/对话后 GlobalChatPanel 通过此池恢复）
        chatCtx.syncSessionMessages(activeIdRef.current, updated);
        return updated;
      });
    },
  });

  useAgentToolStream({
    activeSessionId: activeId,
    requestId: activeStreamRequestId,
    requestIdRef: activeStreamRequestIdRef,
    enabled: sending,
    onToolEvent: (_sessionId, event, _requestId) => {
      if (activeIdRef.current !== _sessionId) return;
      setMessages((prev) => {
        const next = mergeLiveToolEventIntoAssistantMessages(prev, event);
        if (next === prev) return prev;
        chatCtx.syncSessionMessages(activeIdRef.current, next);
        return next;
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
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sendingRef.current = sending || chainRunning;
    if (!sending) setStopRequested(false);
  }, [sending, chainRunning]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const mod = ev.metaKey || ev.ctrlKey;
      const key = ev.key.toLowerCase();
      const t = ev.target;
      const inField =
        t instanceof HTMLElement &&
        (t.isContentEditable ||
          t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT");

      // Cmd/Ctrl+Shift+P：命令面板
      if (mod && ev.shiftKey && !ev.altKey && key === "p") {
        ev.preventDefault();
        requestWorkbenchCommandPalette();
        return;
      }
      // Cmd/Ctrl+P：转到文件（输入框内也允许，对齐 Cursor）
      if (mod && !ev.shiftKey && !ev.altKey && key === "p") {
        ev.preventDefault();
        requestWorkbenchQuickOpen();
        return;
      }
      // Cmd/Ctrl+Shift+F：打开侧栏搜索
      if (mod && ev.shiftKey && !ev.altKey && key === "f") {
        ev.preventDefault();
        setLeftSidebarOpen(true);
        requestWorkbenchSideTab("search");
        return;
      }
      // Cmd/Ctrl+B：切换左侧栏
      if (mod && !ev.shiftKey && !ev.altKey && key === "b") {
        if (inField) return;
        ev.preventDefault();
        setLeftSidebarOpen((v) => !v);
        return;
      }
      if (ev.key !== "`" || !mod) return;
      if (inField) return;
      ev.preventDefault();
      setTerminalOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 活动栏切视图时确保左侧栏展开（Cursor：点 Explorer/Search/SCM 必须可见）
  useEffect(() => {
    return subscribeWorkbenchSideTab(() => {
      setLeftSidebarOpen(true);
    });
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
    if (!nextSessions.length) return;
    const wsKey = workspaceSessionKey(workspacePathRef.current);
    activeByWorkspaceRef.current = {
      ...activeByWorkspaceRef.current,
      [wsKey]: nextActive,
    };
    await api.saveChatSessions({
      activeId: nextActive,
      activeByWorkspace: activeByWorkspaceRef.current,
      sessions: nextSessions,
      composerDrafts: composerDraftsRef.current,
    });
    const cached = getChatSessionsCache();
    setChatSessionsCache({
      sessions: nextSessions,
      activeId: nextActive,
      activeByWorkspace: activeByWorkspaceRef.current,
      workspacePath: workspacePathRef.current,
      composerDrafts: composerDraftsRef.current,
      explicitEmptySessionId: cached?.explicitEmptySessionId ?? null,
      localAgentBasename: cached?.localAgentBasename,
    });
  }, []);

  const flushComposerDraftsToDb = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    await api.saveChatSessions({
      activeId: activeIdRef.current,
      activeByWorkspace: activeByWorkspaceRef.current,
      sessions: sessionsRef.current,
      composerDrafts: composerDraftsRef.current,
    });
  }, []);

  const scheduleComposerDraftsSave = useCallback(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      void flushComposerDraftsToDb();
    }, 400);
  }, [flushComposerDraftsToDb]);

  /** 单会话增量更新并落盘，避免并发 send 用陈旧 sessions 覆盖其它 tab 历史 */
  const patchSession = useCallback(
    async (
      sessionId: string,
      patch: (session: ChatSession) => ChatSession,
      persistActiveId = activeIdRef.current,
    ): Promise<ChatSession[]> => {
      // CRITICAL: Read from sessionsRef.current directly, NOT from setSessions updater.
      // After component unmount (user navigated away), React ignored setSessions updater,
      // leaving nextSessions empty → persist skips → context reset → messages lost.
      const prev = sessionsRef.current;
      const nextSessions = prev.map((s) => (s.id === sessionId ? patch(s) : s));
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
      await persist(nextSessions, persistActiveId);
      // Sync to context after persist, so GlobalChatPanel & re-mounted ChatPage get latest data
      chatCtx.syncSessions(nextSessions);
      return nextSessions;
    },
    [persist], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** 首条消息写入后移除多余空 tab，避免「新对话」与已命名 tab 并存 */
  const pruneWorkspaceSessions = useCallback(
    async (keepId: string) => {
      const cached = getChatSessionsCache();
      const ctxExplicit = chatCtx.explicitEmptySessionId;
      const explicitId = cached?.explicitEmptySessionId ?? ctxExplicit;
      const preserveIds = explicitId ? [explicitId] : undefined;
      const pruned = pruneDuplicateEmptySessions(
        sessionsRef.current,
        workspacePathRef.current,
        keepId,
        preserveIds,
      );
      if (pruned.length !== sessionsRef.current.length) {
        sessionsRef.current = pruned;
        setSessions(pruned);
        await persist(pruned, keepId);
      }
      return pruned;
    },
    [chatCtx, persist],
  );

  /** 本地命令（如生成任务链）写入会话历史，不调用模型 */
  const appendLocalChatExchange = useCallback(
    async (sessionId: string, userLine: string, assistantLine: string) => {
      const sess = sessionsRef.current.find((s) => s.id === sessionId);
      if (!sess) return;
      const hist: DiskMsg[] = [
        ...sess.history,
        { role: "user", content: userLine, ts: Date.now() } as DiskMsg,
        { role: "assistant", content: assistantLine, ts: Date.now(), name: "系统" } as DiskMsg,
      ];
      let title = sess.title;
      if (sess.history.length === 0) {
        const t = userLine.trim();
        title = t.length > 28 ? `${t.slice(0, 28)}…` : t;
      }
      await patchSession(sessionId, (s) => ({ ...s, title, history: hist }));
      if (sessionId === activeIdRef.current) {
        const ml = sess.modelId?.trim() || globalModel || "模型";
        setMessages(diskToDisplay(hist, ml));
      }
      clearExplicitEmptyChatSessionIf(sessionId);
      chatCtx.syncExplicitEmptySessionId(null);
      if (sess.history.length === 0) {
        await pruneWorkspaceSessions(sessionId);
      }
    },
    [chatCtx, patchSession, globalModel, pruneWorkspaceSessions],
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
      const settings = await getCachedSettings(api);
      const defaultPath = settings.defaultConfirmWritePath?.trim() || "";
      const sess = sessions.find((s) => s.id === activeId);
      if (!sess) return;
      const items = buildConfirmWriteItems(trimmed, defaultPath);
      if (!items.length) {
        toast.error(
          "无法写入：正文中无 workspace-write 围栏，且未配置默认写入路径。请先在回复中使用围栏，或在设置中配置默认确认写入路径。",
        );
        return;
      }
      setStopRequested(false);
      setSessionSending(activeId, true);
      try {
        const res = await api.workspaceApplyWriteFence(items);
        const written = res?.written ?? [];
        if (written.length > 0) {
          const summary =
            `【一键写入】已将内容写入当前工作区：\n` +
            written.map((p) => `- \`${p}\``).join("\n");
          const writtenSet = new Set(written.map((p) => p.replace(/\\/g, "/")));
          const hist = sess.history.map((m) => {
            if (m.role !== "assistant") return m;
            // 仅折叠：正文完全等于本条气泡，或围栏 path 命中本次写入列表
            if (m.content.trim() === trimmed) {
              return { ...m, content: collapseWorkspaceWriteForHistory(m.content, written) };
            }
            if (!m.content.includes("```workspace-write")) return m;
            const hit = [...writtenSet].some(
              (p) =>
                m.content.includes(`"path":"${p}"`) ||
                m.content.includes(`"path": "${p}"`) ||
                m.content.includes(`\`${p}\``),
            );
            if (!hit) return m;
            return {
              ...m,
              content: collapseWorkspaceWriteForHistory(m.content, written),
            };
          });
          const userLine: DiskMsg = { role: "user", content: userLineContent, ts: Date.now() };
          const asstLine: DiskMsg = { role: "assistant", content: summary, ts: Date.now() };
          hist.push(userLine, asstLine);
          const modelLabel = sess.modelId?.trim() || settings.model || "模型";
          const nextSessions = sessions.map((s) =>
            s.id === activeId ? { ...s, history: hist } : s,
          );
          setSessions(nextSessions);
          setMessages(diskToDisplay(hist, modelLabel));
          await persist(nextSessions, activeId);
          toastWorkspaceWriteSuccess("", {
            writtenPaths: written,
          });
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

  /** 气泡右键写入：仅 workspace-write 围栏（无关键词硬编码路径） */
  const handleBubbleWriteToWorkspace = useCallback(
    (content: string) => {
      const items = buildFenceOnlyWriteItems(content);
      if (!items.length) {
        toast.error("本条无 workspace-write 围栏，无法写入工作区。");
        return;
      }
      void (async () => {
        const api = getDesktop();
        if (!api?.workspaceApplyWriteFence) {
          toast.error("当前无法写入工作区。");
          return;
        }
        const sess = sessions.find((s) => s.id === activeId);
        if (!sess) return;
        setStopRequested(false);
        setSessionSending(activeId, true);
        try {
          const res = await api.workspaceApplyWriteFence(items);
          const written = res?.written ?? [];
          if (written.length > 0) {
            const summary =
              `【一键写入】已将内容写入当前工作区：\n` +
              written.map((p) => `- \`${p}\``).join("\n");
            const writtenSet = new Set(written.map((p) => p.replace(/\\/g, "/")));
            const hist = sess.history.map((m) => {
              if (m.role !== "assistant") return m;
              if (!m.content.includes("```workspace-write")) return m;
              const hit = [...writtenSet].some(
                (p) =>
                  m.content.includes(`"path":"${p}"`) ||
                  m.content.includes(`"path": "${p}"`) ||
                  m.content.includes(`\`${p}\``),
              );
              if (!hit) return m;
              return {
                ...m,
                content: collapseWorkspaceWriteForHistory(m.content, written),
              };
            });
            const userLine: DiskMsg = {
              role: "user",
              content: "确认写入（本条气泡）",
              ts: Date.now(),
            };
            const asstLine: DiskMsg = { role: "assistant", content: summary, ts: Date.now() };
            hist.push(userLine, asstLine);
            const settings = await getCachedSettings(api);
            const modelLabel = sess.modelId?.trim() || settings.model || "模型";
            const nextSessions = sessions.map((s) =>
              s.id === activeId ? { ...s, history: hist } : s,
            );
            setSessions(nextSessions);
            setMessages(diskToDisplay(hist, modelLabel));
            await persist(nextSessions, activeId);
            toastWorkspaceWriteSuccess("", {
              writtenPaths: written,
            });
          } else if (res?.error) {
            toast.error(`未能写入：${res.error}`);
          } else if (res?.errors?.length) {
            toast.error(res.errors.slice(0, 2).join("; "));
          } else {
            toast.error("未写入任何路径（请检查工作区是否已选择）。");
          }
        } finally {
          setSessionSending(activeId, false);
        }
      })();
    },
    [activeId, sessions, persist],
  );

  const handleBubbleGenerateChain = useCallback(
    async (content: string) => {
      const api = getDesktop();
      const r = await saveChainFromBubbleText(api, content);
      if (!r.ok) {
        toast.error(r.error, { duration: 5000 });
        return;
      }
      notifyAutoSavedChain(
        { stepCount: r.stepCount, chainName: r.chainName, wbsPath: r.wbsPath },
        () => navigate({ to: "/chains", search: { q: "WBS" } }),
      );
    },
    [navigate],
  );

  /** Accept workspace-write 后折叠围栏并写回会话历史 */
  const handleAssistantContentPatch = useCallback(
    async (historyIndex: number, nextContent: string) => {
      const sid = activeIdRef.current;
      if (!sid || historyIndex < 0) return;
      const nextSessions = await patchSession(sid, (s) => {
        const msg = s.history[historyIndex];
        if (!msg || msg.role !== "assistant") return s;
        const hist = s.history.slice();
        hist[historyIndex] = { ...msg, content: nextContent };
        return { ...s, history: hist };
      });
      const sess = nextSessions.find((s) => s.id === sid);
      if (!sess || sid !== activeIdRef.current) return;
      const ml = sess.modelId?.trim() || globalModel || "模型";
      const display = diskToDisplay(sess.history, ml);
      setMessages(display);
      chatCtx.syncMessages(display);
      chatCtx.syncSessionMessages(sid, display);
    },
    [patchSession, globalModel, chatCtx],
  );

  /** 侧栏「待确认写入」与聊天卡共享队列 */
  useEffect(() => {
    const items: PendingWriteItem[] = [];
    for (const m of messages) {
      if (m.role !== "assistant" || m.historyIndex == null) continue;
      if (!m.content || m.content === "__WAITING__") continue;
      // 只读问答：禁止侧栏再解析出待写队列
      if (m.suppressFileEdits || m.requestError) continue;
      const { edits } = parseChatFileEdits(stripStreamEventsBlock(m.content));
      for (const e of edits) {
        if (e.summaryOnly) continue;
        if (e.writeContent == null) continue;
        if (e.status === "rejected" || e.status === "applied") continue;
        items.push({
          path: e.path,
          content: e.writeContent,
          historyIndex: m.historyIndex,
          source: e.source,
          diffBody: e.diffBody,
        });
      }
    }

    const applyOne = async (item: PendingWriteItem) => {
      const api = getDesktop();
      if (!api) return;
      const resolved = await resolveWorkspaceEditContent({
        path: item.path,
        content: item.content,
        source: item.source,
        diffBody: item.diffBody,
        readFile: api.readWorkspaceTextFile
          ? (p) => api.readWorkspaceTextFile!(p)
          : undefined,
      });
      if (!resolved.ok) {
        toast.error(resolved.error);
        return;
      }
      stashWorkspaceWriteCheckpoint(item.path, resolved.previous);
      const r = await applyPendingWorkspaceWrite(api, {
        path: item.path,
        content: resolved.text,
      });
      if (!r.ok) {
        toast.error(r.error || "写入失败");
        return;
      }
      clearRejectedWorkspaceWrite(item.path, item.diffBody || item.content);
      const sess = sessionsRef.current.find((s) => s.id === activeIdRef.current);
      const msg = sess?.history[item.historyIndex];
      if (msg?.role === "assistant") {
        const next = collapseAcceptedWorkspaceWriteForHistory(msg.content, item.path);
        await handleAssistantContentPatch(item.historyIndex, next);
      }
    };

    const rejectOne = (item: PendingWriteItem) => {
      rejectWorkspaceWrite(item.path, item.content);
      setMessages((prev) => prev.map((m) => ({ ...m })));
    };

    const applyAll = async () => {
      for (const item of items) await applyOne(item);
    };
    const rejectAll = () => {
      for (const item of items) rejectWorkspaceWrite(item.path, item.content);
      setMessages((prev) => prev.map((m) => ({ ...m })));
    };

    const focusHistoryIndex = (historyIndex: number) => {
      const root = scrollAreaRef.current;
      if (!root) return;
      const el = root.querySelector(`[data-history-index="${historyIndex}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.add("chat-message-row--flash");
        window.setTimeout(() => el.classList.remove("chat-message-row--flash"), 1200);
      }
    };

    setPendingWritesState({
      items,
      applyOne,
      rejectOne,
      applyAll,
      rejectAll,
      focusHistoryIndex,
    });
    return () => clearPendingWritesState();
  }, [messages, handleAssistantContentPatch]);

  const performBulkWriteProject = useCallback(
    async (userLineContent: string) => {
      const api = getDesktop();
      if (!api) return;
      const sess = sessions.find((s) => s.id === activeId);
      if (!sess) return;
      setStopRequested(false);
      setSessionSending(activeId, true);
      try {
        const res = await performBulkWriteFromHistory(api, sess.history);
        const written = res.written ?? [];
        let hist = sess.history.slice();
        if (res.ok && written.length > 0) {
          hist = hist.map((m) => {
            if (m.role !== "assistant" || !m.content.includes("```workspace-write")) return m;
            return { ...m, content: collapseWorkspaceWriteForHistory(m.content, written) };
          });
        }
        const userLine: DiskMsg = { role: "user", content: userLineContent, ts: Date.now() };
        const asstLine: DiskMsg = {
          role: "assistant",
          content:
            res.displayText ||
            (res.ok
              ? `【批量落盘】已写入 ${written.length} 个文件。`
              : res.error || "批量落盘未写入任何文件。"),
          ts: Date.now(),
          ...(res.ok ? {} : { requestError: true }),
        };
        hist = [...hist, userLine, asstLine];
        const settings = await getCachedSettings(api);
        const modelLabel = sess.modelId?.trim() || settings.model || "模型";
        const nextSessions = sessions.map((s) => (s.id === activeId ? { ...s, history: hist } : s));
        setSessions(nextSessions);
        setMessages(diskToDisplay(hist, modelLabel));
        await persist(nextSessions, activeId);
        if (res.ok && written.length > 0) {
          toastWorkspaceWriteSuccess("", { writtenPaths: written });
        } else {
          toast.warning(res.error || "未找到可落盘的代码块");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setSessionSending(activeId, false);
      }
    },
    [activeId, sessions, persist],
  );

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
        const settings = await getCachedSettings(api);
        const modelLabel = sess.modelId?.trim() || settings.model || "模型";
        const nextSessions = sessions.map((s) => (s.id === activeId ? { ...s, history: hist } : s));
        setSessions(nextSessions);
        setMessages(diskToDisplay(hist, modelLabel));
        await persist(nextSessions, activeId);
        if (res.ranInTerminal) toast.success("已在集成终端执行命令");
        else if (res.ok && res.url) {
          // 在浏览器中打开预览 URL
          try {
            window.open(res.url, "_blank");
          } catch {
            /* ignore */
          }
          toast.success("已在系统浏览器打开预览");
        } else if (!res.ok) toast.warning("服务启动失败，请查看错误信息或手动执行");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setSessionSending(activeId, false);
      }
    },
    [activeId, sessions, persist],
  );

  // ---- 挂载时优先从 ChatStateContext 恢复（跨导航保持最新数据） ----
  // 当用户从设置页等返回聊天页时，context 中保存了最新会话（包括 patchSession 异步完成后的更新）
  const contextRestoredRef = useRef(false);

  useEffect(() => {
    if (!hasDesktopApi) return;
    if (sessionsHydratedRef.current) return;
    if (contextRestoredRef.current) return;
    if (urlNewSession) return; // 用户请求新对话，不恢复旧数据
    if (chatCtx.sessions.length === 0) return; // 首次加载，让正常 hydration 执行

    contextRestoredRef.current = true;

    void (async () => {
      const api = getDesktop();
      let workspace: string | null = workspacePathRef.current;
      if (api) {
        try {
          workspace = await api.getWorkspace();
        } catch {
          /* 仍以 ref 为准 */
        }
      }
      workspacePathRef.current = workspace;
      setWorkspacePath(workspace);

      const cachedExplicitId =
        getChatSessionsCache()?.explicitEmptySessionId ?? chatCtx.explicitEmptySessionId ?? null;
      const ctxSessions = chatCtx.sessions as unknown as ChatSession[];
      const resolved = resolveWorkspaceChatSessions(
        ctxSessions,
        workspace,
        activeByWorkspaceRef.current,
        () => ({
          id: genSessionId(),
          title: "新对话",
          modelId: chatCtx.globalModel?.trim() || globalModel || AUTO_MODEL_ID,
          history: [],
          workspacePath: workspaceSessionKey(workspace) || null,
        }),
        {
          resume: true,
          explicitEmptySessionId: cachedExplicitId,
          cachedActiveId: chatCtx.activeId,
        },
      );

      const ctxAid = resolved.activeId;
      sessionsRef.current = resolved.sessions;
      activeIdRef.current = ctxAid;
      activeByWorkspaceRef.current = resolved.activeByWorkspace;
      setSessions(resolved.sessions);
      setActiveId(ctxAid);

      const visibleIds = new Set(
        filterSessionsForWorkspaceTabs(resolved.sessions, workspace).map((s) => s.id),
      );
      const ctxTabIds = chatCtx.openTabIds.filter((id) => visibleIds.has(id));
      if (ctxTabIds.length > 0 && ctxTabIds.some((tid) => resolved.sessions.some((s) => s.id === tid))) {
        setOpenTabIds(ctxTabIds.includes(ctxAid) ? ctxTabIds : [...new Set([...ctxTabIds, ctxAid])]);
      } else {
        setOpenTabIds([ctxAid]);
      }

      if (chatCtx.activeStreamRequestId) {
        activeStreamRequestIdRef.current = chatCtx.activeStreamRequestId;
        setActiveStreamRequestId(chatCtx.activeStreamRequestId);
        streamInProgressRef.current = true;
      }
      const ctxSending = chatCtx.sendingSessions;
      if (Object.keys(ctxSending).length > 0) {
        sendingSessionsRef.current = ctxSending;
        setSendingSessions(ctxSending);
      }

      const perSessionMsgs = chatCtx.perSessionMessagesRef.current[ctxAid];
      if (perSessionMsgs?.length) {
        setMessages(perSessionMsgs);
        chatCtx.syncMessages(perSessionMsgs);
      } else {
        const active = resolved.sessions.find((s) => s.id === ctxAid) ?? resolved.sessions[0];
        syncMessagesFromSession(active);
      }

      setChatSessionsCache({
        sessions: resolved.sessions,
        activeId: ctxAid,
        activeByWorkspace: resolved.activeByWorkspace,
        workspacePath: workspace,
        composerDrafts: composerDraftsRef.current,
        explicitEmptySessionId: cachedExplicitId,
        localAgentBasename: getChatSessionsCache()?.localAgentBasename,
      });
      if (cachedExplicitId) {
        chatCtx.syncExplicitEmptySessionId(cachedExplicitId);
      }

      if (chatCtx.globalModel) {
        setGlobalModel(chatCtx.globalModel);
      }
      const cachedAgent = getChatSessionsCache()?.localAgentBasename;
      if (cachedAgent) {
        setLocalAgentBasename(cachedAgent);
      }

      sessionsHydratedRef.current = true;
    })();
  }, [hasDesktopApi, urlNewSession, chatCtx.sessions.length, chatCtx.messages.length]); // eslint-disable-line

  useEffect(() => {
    if (!hasDesktopApi) return;
    if (sessionsHydratedRef.current) return; // 上下文恢复已处理，跳过磁盘 hydration
    void (async () => {
      if (sessionsHydratedRef.current) return;
      const api = getDesktop();
      if (!api) {
        setMessages([
          {
            role: "assistant",
            content: BROWSER_MODE_CHAT_MESSAGE,
          },
        ]);
        return;
      }
      let bridgeOk = true;
      let settings: Awaited<ReturnType<typeof api.getChatSettings>>;
      try {
        settings = await getCachedSettings(api);
      } catch (e) {
        bridgeOk = false;
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`${MSG_BRIDGE_OFFLINE} 模型列表使用默认项。`, {
          description: msg.slice(0, 120),
          duration: 8000,
        });
        settings = {
          ollamaBase: "http://127.0.0.1:11434",
          model: AUTO_MODEL_ID,
          localOllamaModel: "",
          claudeCliPath: "",
          orchestrationMode: "claude-code",
          localAgentBasename: "",
          defaultConfirmWritePath: "",
          mcpConfigAbsolutePath: "",
          devMcpOrchDebug: false,
          localModelCatalog: [],
        };
      }
      const mode: OrchMode =
        settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
      setOrchMode(mode);
      setLocalAgentBasename(
        agentBasenameForWorkspace(settings, workspacePathRef.current),
      );

      let claudePool: string[] = [];
      let localPool: string[] = [];
      if (bridgeOk) {
        try {
          const pools = await loadChatModelPools(api);
          claudePool = pools.cloudModels;
          localPool = pools.localModels;
          configuredPoolsRef.current = await loadConfiguredModelPools(api);
        } catch {
          /* ignore */
        }
      }
      setOrchestratorModels(claudePool);
      setLocalOllamaTags(localPool);

      const sessionPool = chatModelPoolCombined({
        cloudModels: claudePool,
        localModels: localPool,
      });
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
      let diskSessionsBackfilled = false;
      if (bridgeOk) {
        try {
          const disk = await api.loadChatSessions();
          const rawActiveByWorkspace = disk.activeByWorkspace ?? { "": disk.activeId || "s0" };
          const backfilled = backfillSessionWorkspaceFromActiveMap(
            disk.sessions,
            rawActiveByWorkspace,
          );
          if (backfilled !== disk.sessions) diskSessionsBackfilled = true;
          list = backfilled;
          activeByWorkspace = rawActiveByWorkspace;
          activeByWorkspaceRef.current = activeByWorkspace;
          aid = pickActiveSessionId(list, activeByWorkspace, workspace, disk.activeId);
          if (disk.composerDrafts && typeof disk.composerDrafts === "object") {
            composerDraftsRef.current = Object.fromEntries(
              Object.entries(disk.composerDrafts).map(([id, draft]) => [
                id,
                {
                  input: typeof draft?.input === "string" ? draft.input : "",
                  pendingImages: Array.isArray(draft?.pendingImages)
                    ? (draft.pendingImages as (UserImageAttachment & { id: string })[])
                    : [],
                  pendingFiles: Array.isArray(draft?.pendingFiles)
                    ? (draft.pendingFiles as PendingFileEntry[])
                    : [],
                  pendingTerminalSnippets: Array.isArray(draft?.pendingTerminalSnippets)
                    ? (draft.pendingTerminalSnippets as PendingTerminalSnippet[])
                    : [],
                },
              ]),
            );
          }
        } catch {
          bridgeOk = false;
        }
      }

      const cached = getChatSessionsCache();
      const cacheMatchesWorkspace =
        cached &&
        chatSessionsCacheMatchesWorkspace(cached.workspacePath, workspace);
      const explicitEmptyId = cacheMatchesWorkspace
        ? cached.explicitEmptySessionId
        : (chatCtx.explicitEmptySessionId ?? null);

      if (cacheMatchesWorkspace && cached.sessions.length) {
        list = mergeSessionsPreferLongerHistory(
          cached.sessions as ChatSession[],
          list,
          sendingSessionsRef.current,
        );
        activeByWorkspace = { ...activeByWorkspace, ...cached.activeByWorkspace };
        activeByWorkspaceRef.current = activeByWorkspace;
        if (cached.composerDrafts && typeof cached.composerDrafts === "object") {
          composerDraftsRef.current = {
            ...composerDraftsRef.current,
            ...Object.fromEntries(
              Object.entries(cached.composerDrafts).map(([id, draft]) => [
                id,
                {
                  input: typeof draft?.input === "string" ? draft.input : "",
                  pendingImages: Array.isArray(draft?.pendingImages)
                    ? (draft.pendingImages as (UserImageAttachment & { id: string })[])
                    : [],
                  pendingFiles: Array.isArray(draft?.pendingFiles)
                    ? (draft.pendingFiles as PendingFileEntry[])
                    : [],
                  pendingTerminalSnippets: Array.isArray(draft?.pendingTerminalSnippets)
                    ? (draft.pendingTerminalSnippets as PendingTerminalSnippet[])
                    : [],
                },
              ]),
            ),
          };
        }
      }

      // 缓存合并后补齐 workspacePath（缓存中的旧数据可能缺少此字段）
      list = backfillSessionWorkspaceFromActiveMap(list, activeByWorkspace);

      const createEmptySession = (): ChatSession => ({
        id: genSessionId(),
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
        {
          resume: true,
          explicitEmptySessionId: explicitEmptyId,
          cachedActiveId: cacheMatchesWorkspace ? cached!.activeId : null,
        },
      );
      list = resolved.sessions;
      aid = resolved.activeId;
      activeByWorkspace = resolved.activeByWorkspace;
      activeByWorkspaceRef.current = activeByWorkspace;

      if (bridgeOk && typeof api.orchestrationGetChainRunStatus === "function") {
        try {
          const chainSt = await api.orchestrationGetChainRunStatus();
          const pinned = chainSt?.pinnedSessionId?.trim();
          if (pinned && list.some((s) => s.id === pinned)) {
            const pinnedSess = list.find((s) => s.id === pinned);
            const cachedActive =
              cacheMatchesWorkspace && cached!.activeId ? cached!.activeId : null;
            const cachedSess = cachedActive ? list.find((s) => s.id === cachedActive) : undefined;
            if (cachedSess && cachedSess.history.length > 0) {
              aid = cachedActive!;
            } else if (pinnedSess && pinnedSess.history.length > 0) {
              aid = pinned;
            } else if (cachedActive && list.some((s) => s.id === cachedActive)) {
              aid = cachedActive;
            } else if ((pinnedSess?.history.length ?? 0) === 0) {
              const withHist = sortSessionsByLatest(
                filterSessionsForWorkspaceTabs(list, workspace).filter((s) => s.history.length > 0),
              );
              if (withHist[0]) aid = withHist[0].id;
              else aid = pinned;
            } else {
              aid = pinned;
            }
            const wsKey = workspaceSessionKey(workspace);
            activeByWorkspace = { ...activeByWorkspace, [wsKey]: aid };
            activeByWorkspaceRef.current = activeByWorkspace;
          }
        } catch {
          /* ignore */
        }
      }

      if (cached?.explicitEmptySessionId === aid) {
        markExplicitEmptyChatSession(aid);
      } else if (
        cached?.explicitEmptySessionId &&
        list.some((s) => s.id === cached.explicitEmptySessionId)
      ) {
        // 显式创建的空会话仍存在，保留标记以便跨 reload 保护
        markExplicitEmptyChatSession(cached.explicitEmptySessionId);
      } else {
        clearExplicitEmptyChatSession();
        syncExplicitEmptyInCache(null);
      }

      let sessionsNeedSave = beforeResolveLen !== list.length || diskSessionsBackfilled;
      list = list.map((s) => {
        if (isAutoModelSelection(migratedGlobal)) {
          if (s.modelId !== AUTO_MODEL_ID) sessionsNeedSave = true;
          return { ...s, modelId: AUTO_MODEL_ID };
        }
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
      // 初始只打开活跃会话的标签页，其余通过历史下拉唤醒；
      // 优先从 context 恢复已打开的标签页（跨路由切换保留）
      const ctxTabIds = chatCtx.openTabIds;
      if (ctxTabIds.length > 0 && ctxTabIds.some((tid) => list.some((s) => s.id === tid))) {
        const merged = [...new Set([...ctxTabIds, aid])].filter((tid) =>
          list.some((s) => s.id === tid),
        );
        setOpenTabIds(merged);
      } else {
        setOpenTabIds([aid]);
      }
      sessionsRef.current = list;
      const active = list.find((s) => s.id === aid) ?? list[0];
      setChatSessionsCache({
        sessions: list,
        activeId: aid,
        activeByWorkspace: activeByWorkspaceRef.current,
        workspacePath: workspacePathRef.current,
        composerDrafts: composerDraftsRef.current,
        explicitEmptySessionId: getChatSessionsCache()?.explicitEmptySessionId === aid ? aid : null,
        localAgentBasename: getChatSessionsCache()?.localAgentBasename,
      });
      const explicitId = getChatSessionsCache()?.explicitEmptySessionId;
      if (explicitId) chatCtx.syncExplicitEmptySessionId(explicitId);
      // 优先使用 context 消息（GlobalChatPanel 持续累积的流内容 / sendChat 写入的最终回复）
      // 只有 context 没有数据时才回退到磁盘。绝不是用磁盘数据覆盖 context！
      if (aid && chatCtx.activeId === aid && chatCtx.messages.length > 0) {
        setMessages(chatCtx.messages);
        if (chatCtx.activeStreamRequestId) {
          setActiveStreamRequestId(chatCtx.activeStreamRequestId);
          activeStreamRequestIdRef.current = chatCtx.activeStreamRequestId;
          sendingSessionsRef.current[aid] = true;
          setSendingSessions((prev) => ({ ...prev, [aid]: true }));
          streamInProgressRef.current = true;
        }
      } else if (chatCtx.perSessionMessagesRef.current[aid]?.length > 0) {
        // 从 per-session 累积池恢复（切换了对话页签后回到正在流的会话）
        const restored = chatCtx.perSessionMessagesRef.current[aid];
        setMessages(restored);
        chatCtx.syncMessages(restored);
        chatCtx.syncActiveId(aid);
        if (chatCtx.activeStreamRequestId) {
          setActiveStreamRequestId(chatCtx.activeStreamRequestId);
          activeStreamRequestIdRef.current = chatCtx.activeStreamRequestId;
          sendingSessionsRef.current[aid] = true;
          setSendingSessions((prev) => ({ ...prev, [aid]: true }));
          streamInProgressRef.current = true;
        }
      } else {
        syncMessagesFromSession(active);
        if (active) {
          const ml = active.modelId?.trim() || globalModel || "模型";
          chatCtx.syncMessages(diskToDisplay(active.history, ml));
        }
        // 仅首次加载用磁盘数据初始化 context
        chatCtx.syncSessions(list);
      }
      sessionsHydratedRef.current = true;
    })();
  }, [hasDesktopApi]);

  /** 离开聊天页时写入内存缓存并落盘，避免切换侧栏后丢失会话与草稿 */
  useEffect(() => {
    if (!hasDesktopApi) return;
    return () => {
      if (!sessionsHydratedRef.current) return;
      // 如果任何会话有进行中的流请求，skip persist（sendChat 会通过 patchSession 落盘最终数据）
      if (
        chatCtx.activeRequestIdsRef.current.size > 0 ||
        Object.keys(sendingSessionsRef.current).length > 0
      ) {
        return;
      }
      // 不在清理时清除 activeStreamRequestId/sending，GlobalChatPanel 需要它们继续处理流式更新
      const list = sessionsRef.current;
      const cacheHasHistory = getChatSessionsCache()?.sessions?.some(
        (s) => (s.history?.length ?? 0) > 0,
      );
      const hasHistory = list.some((s) => s.history.length > 0);
      if (!list.length && !cacheHasHistory) return;
      const cached = getChatSessionsCache();
      setChatSessionsCache({
        sessions: sessionsRef.current,
        activeId: activeIdRef.current,
        activeByWorkspace: activeByWorkspaceRef.current,
        workspacePath: workspacePathRef.current,
        composerDrafts: composerDraftsRef.current,
        explicitEmptySessionId: cached?.explicitEmptySessionId ?? null,
        localAgentBasename: cached?.localAgentBasename,
      });
      // 同步 openTabIds 到 context，跨路由切换保留标签页状态
      chatCtx.syncOpenTabIds(openTabIds);
      void persist(sessionsRef.current, activeIdRef.current);
    };
  }, [hasDesktopApi, persist]);

  /** 从设置页返回、供应商同步或 Bridge 恢复后重新拉取模型列表 */
  useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api) return;
    const sync = () => {
      void api
        .getChatSettings()
        .then((s) =>
          setOrchMode(s.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code"),
        );
      void loadChatModelPools(api).then((pools) => {
        setOrchestratorModels(pools.cloudModels);
        setLocalOllamaTags(pools.localModels);
      });
      void loadConfiguredModelPools(api).then((pools) => {
        configuredPoolsRef.current = pools;
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
        setSpeedOpen(false);
        setLengthOpen(false);
        setRatioOpen(false);
        setMoreOpen(false);
        setStyleOpen(false);
        setTplOpen(false);
        setImgModelOpen(false);
        setVidModelOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /** 监听流完成事件：从非空 → null 时，从 context 重新同步最终回复 */
  useEffect(() => {
    if (!sessionsHydratedRef.current) return;
    const prev = prevStreamReqRef.current;
    prevStreamReqRef.current = chatCtx.activeStreamRequestId;
    // 流刚结束：最终消息已通过 chatCtx.syncMessages 写入 context
    if (prev !== null && chatCtx.activeStreamRequestId === null) {
      streamInProgressRef.current = false;
      if (chatCtx.messages.length > 0) {
        setMessages(chatCtx.messages);
      }
    }
  }, [chatCtx.activeStreamRequestId]);

  /** 持续从 context 同步最新累积消息（GlobalChatPanel 写入的 delta / sendChat 完成的最终回复） */
  useEffect(() => {
    if (!sessionsHydratedRef.current) return;
    if (chatCtx.activeId === activeIdRef.current && chatCtx.messages.length > 0) {
      setMessages(chatCtx.messages);
    }
  }, [chatCtx.messages, chatCtx.activeId]);

  const visibleSessions = useMemo(
    () => filterSessionsForWorkspaceTabs(sessions, workspacePath),
    [sessions, workspacePath],
  );
  /** 标签栏只显示已打开的标签页（默认仅活跃会话），其余从历史下拉唤醒 */
  const tabSessions = useMemo(
    () => visibleSessions.filter((s) => openTabIds.includes(s.id)),
    [visibleSessions, openTabIds],
  );
  const activeSession =
    visibleSessions.find((s) => s.id === activeId) ?? sessions.find((s) => s.id === activeId);
  const projectHistoryItems = useMemo(
    () => visibleSessions.filter((s) => s.history.length > 0).map((s) => toChatHistoryListItem(s)),
    [visibleSessions],
  );
  const allHistoryItems = useMemo(
    () =>
      sortSessionsByLatest(sessions.filter((s) => s.history.length > 0)).map((s) =>
        toChatHistoryListItem(s),
      ),
    [sessions],
  );
  /** 快速触发任务链的选项列表（内置模板） */
  const chainOptions = useMemo((): QuickChainOption[] => {
    return CHAIN_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      stepCount: t.steps.length,
      group: t.id === "pipeline-agent-self-learning" ? "self-learning" : t.category,
    }));
  }, []);
  const displayModel = activeSession?.modelId?.trim() || globalModel || "未选模型";
  const primaryModelFallback = AUTO_MODEL_ID;

  const handleAgentChange = async (basename: string) => {
    const api = getDesktop();
    if (!api) return;
    const nextBasename = basename.trim();
    setLocalAgentBasename(nextBasename);
    const s = await api.getChatSettings();
    const wsKey = workspaceSessionKey(workspacePathRef.current);
    const byWs = {
      ...(s.agentBasenameByWorkspace && typeof s.agentBasenameByWorkspace === "object"
        ? s.agentBasenameByWorkspace
        : {}),
    } as Record<string, string>;
    if (wsKey) byWs[wsKey] = nextBasename;
    await api.saveChatSettings({
      ...fullChatSettingsPayload(s),
      localAgentBasename: nextBasename,
      agentBasenameByWorkspace: byWs,
    });
    // 同步到 sessionStorage 缓存，确保跨路由切换后立即恢复
    const cached = getChatSessionsCache();
    if (cached) {
      setChatSessionsCache({ ...cached, localAgentBasename: nextBasename });
    }
  };

  const handleWorkspaceChipClick = useCallback(() => {
    const api = getDesktop();
    if (!api) return;
    void chooseWorkspaceWithFeedback(api);
  }, []);

  const handleModelPick = async (pick: { mode: OrchMode; model: string }) => {
    const api = getDesktop();
    if (!api) return;
    const nextModel = isAutoModelSelection(pick.model) ? AUTO_MODEL_ID : pick.model;
    const nextMode = isAutoModelSelection(pick.model) ? orchMode : pick.mode;
    if (nextMode !== orchMode) {
      setOrchMode(nextMode);
      const s = await api.getChatSettings();
      await api.saveChatSettings({ ...fullChatSettingsPayload(s), orchestrationMode: nextMode });
    }
    if (
      nextMode === "claude-code" &&
      nextModel &&
      !isAutoModelSelection(nextModel) &&
      api.cloudProvidersListProviders &&
      api.cloudProvidersSetCurrentProvider
    ) {
      try {
        const listed = await api.cloudProvidersListProviders();
        const matches = (listed.providers || []).filter((p) => p.models?.includes(nextModel));
        const provider = matches.find((p) => p.isCurrent) || matches[0];
        if (provider) {
          await api.cloudProvidersSetCurrentProvider({
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
    setGlobalModel(nextModel);
    chatCtx.syncSessions(next);
    chatCtx.syncGlobalModel(nextModel);
    const s = await api.getChatSettings();
    await api.saveChatSettings({ ...fullChatSettingsPayload(s), model: nextModel });
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
      let source = sess;
      const live = sessionsRef.current.find((s) => s.id === sess.id);
      if (live) {
        if (
          live.history.length > sess.history.length ||
          countUserMessages(live.history) > countUserMessages(sess.history) ||
          Boolean(sendingSessionsRef.current[sess.id])
        ) {
          source = {
            ...live,
            title: sess.title || live.title,
            modelId: sess.modelId || live.modelId,
          };
        }
      }
      if (source.id === activeIdRef.current) {
        const uiUsers = messagesRef.current.filter((m) => m.role === "user").length;
        const sourceUsers = countUserMessages(source.history);
        if (uiUsers > sourceUsers) {
          const liveAgain = sessionsRef.current.find((s) => s.id === source.id);
          if (liveAgain && countUserMessages(liveAgain.history) >= uiUsers) {
            source = liveAgain;
          }
          // NOTE: 不要 return 提前退出；切换会话时 messagesRef 可能仍持有上个会话的用户消息，
          // 导致 uiUsers > sourceUsers 误判，应始终走到底部的 setMessages(msgs) 更新显示。
        }
      }
      const ml = source.modelId?.trim() || globalModel || "模型";
      let msgs = diskToDisplay(source.history, ml);
      if (!msgs.length && !sendingSessionsRef.current[source.id]) {
        msgs = [{ role: "assistant", content: EMPTY_SESSION_WELCOME }];
      }
      if (sendingSessionsRef.current[source.id]) {
        const last = msgs[msgs.length - 1];
        if (!last || last.role !== "assistant") {
          msgs = [...msgs, { role: "assistant", name: ml, content: "__WAITING__" }];
        } else if (last.content === "__WAITING__") {
          /* 已在等待中 */
        }
        /* 已有 assistant 正文（含 requestError）时不再追加 __WAITING__ */
      }
      setMessages(msgs);
    },
    [globalModel],
  );

  /** 客户端 hydration 后、首帧绘制前从 sessionStorage 恢复（SSR 与首屏 state 保持一致，避免 mismatch） */
  useLayoutEffect(() => {
    if (sessionsHydratedRef.current) return;
    const cached = getChatSessionsCache();
    if (!cached?.sessions?.length) return;
    const list = cached.sessions as ChatSession[];
    sessionsRef.current = list;
    activeIdRef.current = cached.activeId;
    setSessions(list);
    setActiveId(cached.activeId);
    if (cached.activeByWorkspace) {
      activeByWorkspaceRef.current = { ...cached.activeByWorkspace };
    }
    const sess = list.find((s) => s.id === cached.activeId);
    if (sess?.history?.length) {
      const ml = sess.modelId?.trim() || globalModel || "模型";
      setMessages(diskToDisplay(sess.history, ml));
    }
    // 优先从 context 恢复已打开的标签页（跨路由切换保留），否则回退到仅打开活跃会话
    const ctxTabIds = chatCtx.openTabIds;
    if (ctxTabIds.length > 0 && ctxTabIds.some((tid) => list.some((s) => s.id === tid))) {
      const merged = [...new Set([...ctxTabIds, cached.activeId])].filter((tid) =>
        list.some((s) => s.id === tid),
      );
      setOpenTabIds(merged);
    } else {
      setOpenTabIds([cached.activeId]);
    }
  }, [globalModel, chatCtx.openTabIds]);

  /** 后台任务链写入会话后同步 UI（切换页签返回聊天页亦生效） */
  const refreshSessionsFromDisk = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    try {
      const disk = await api.loadChatSessions();
      // 如果 ChatPage 正在恢复流状态，不覆盖消息
      if (streamInProgressRef.current) return;
      let merged: ChatSession[] = [];
      const _preserve1 =
        getChatSessionsCache()?.explicitEmptySessionId || chatCtx.explicitEmptySessionId;
      const preserveIds1: string[] | undefined = _preserve1 ? [_preserve1] : undefined;
      setSessions((prev) => {
        merged = mergeSessionsPreferLongerHistory(prev, disk.sessions, sendingSessionsRef.current);
        merged = backfillSessionWorkspaceFromActiveMap(merged, {
          ...disk.activeByWorkspace,
          ...activeByWorkspaceRef.current,
        });
        merged = pruneDuplicateEmptySessions(
          merged,
          workspacePathRef.current,
          activeIdRef.current,
          preserveIds1,
        );
        sessionsRef.current = merged;
        return merged;
      });
      if (disk.activeByWorkspace) {
        activeByWorkspaceRef.current = {
          ...disk.activeByWorkspace,
          ...activeByWorkspaceRef.current,
        };
      }
      const cached = getChatSessionsCache();
      setChatSessionsCache({
        sessions: merged,
        activeId: activeIdRef.current,
        activeByWorkspace: activeByWorkspaceRef.current,
        workspacePath: workspacePathRef.current,
        composerDrafts: composerDraftsRef.current,
        explicitEmptySessionId: cached?.explicitEmptySessionId ?? null,
        localAgentBasename: cached?.localAgentBasename,
      });
      const viewId = activeIdRef.current;
      if (sendingSessionsRef.current[viewId]) return;
      const sess =
        merged.find((s) => s.id === viewId) ??
        merged.find(
          (s) => s.history.length > 0 && sessionMatchesWorkspaceTab(s, workspacePathRef.current),
        );
      if (sess) syncMessagesFromSession(sess);
    } catch {
      /* ignore */
    }
  }, [syncMessagesFromSession]);

  useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api) return;
    void syncExecutionState();
    void api.loadChatSessions().then((disk) => {
      // 关闭会话后刚切换了目标会话，旧闭包的 loadChatSessions 应跳过，
      // 防止 ctxHasBetter 因陈旧 chatCtx.activeId 失效而走到 syncMessagesFromSession 覆盖正确消息
      if (
        closingSessionTargetRef.current &&
        closingSessionTargetRef.current === activeIdRef.current
      ) {
        closingSessionTargetRef.current = null;
        return;
      }
      // 如果 context 有该活动会话的更新数据（流进行中、或已有 assistant 回复），跳过磁盘覆盖
      const ctxHasBetter =
        activeIdRef.current &&
        chatCtx.activeId === activeIdRef.current &&
        chatCtx.messages.length > 0 &&
        (chatCtx.activeStreamRequestId !== null ||
          chatCtx.messages.some((m) => m.role === "assistant" && m.content !== "__WAITING__"));
      if (ctxHasBetter) {
        return;
      }
      let merged: ChatSession[] = [];
      const _preserve2 =
        getChatSessionsCache()?.explicitEmptySessionId || chatCtx.explicitEmptySessionId;
      const preserveIds2: string[] | undefined = _preserve2 ? [_preserve2] : undefined;
      setSessions((prev) => {
        merged = mergeSessionsPreferLongerHistory(prev, disk.sessions, sendingSessionsRef.current);
        merged = backfillSessionWorkspaceFromActiveMap(merged, {
          ...disk.activeByWorkspace,
          ...activeByWorkspaceRef.current,
        });
        merged = pruneDuplicateEmptySessions(
          merged,
          workspacePathRef.current,
          activeIdRef.current,
          preserveIds2,
        );
        sessionsRef.current = merged;
        return merged;
      });
      if (disk.activeByWorkspace) {
        activeByWorkspaceRef.current = {
          ...disk.activeByWorkspace,
          ...activeByWorkspaceRef.current,
        };
      }
      const viewId = activeIdRef.current;
      if (sendingSessionsRef.current[viewId]) return;
      if (!chainRunning && Object.keys(sendingSessionsRef.current).length > 0) return;
      const live = sessionsRef.current.find((s) => s.id === viewId);
      const fromMerged =
        merged.find((s) => s.id === viewId) ?? disk.sessions.find((s) => s.id === viewId);
      const sess =
        live && fromMerged && live.history.length >= fromMerged.history.length ? live : fromMerged;
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
        pendingFiles,
        pendingTerminalSnippets,
      };
      scheduleComposerDraftsSave();
    },
    [input, pendingImages, pendingFiles, pendingTerminalSnippets, scheduleComposerDraftsSave],
  );

  const loadComposerDraft = useCallback((sessionId: string) => {
    const draft = composerDraftsRef.current[sessionId];
    setInput(draft?.input ?? "");
    setPendingImages(draft?.pendingImages ?? []);
    setPendingFiles(draft?.pendingFiles ?? []);
    setPendingTerminalSnippets(draft?.pendingTerminalSnippets ?? []);
  }, []);

  const cancelEditUserMessage = useCallback(() => {
    if (editHistoryIndexRef.current == null) return;
    const sessionId = activeIdRef.current;
    setEditHistoryIndex(null);
    editHistoryIndexRef.current = null;
    setEditComposer(null);
    // 已发起退回（检查点已存）：取消编辑 = 终止退回，把后续消息接回去（对齐 Cursor）
    const cp = loadSessionHistoryCheckpoint(sessionId);
    if (cp?.sessionId === sessionId && Array.isArray(cp.discarded) && cp.discarded.length > 0) {
      void (async () => {
        try {
          const nextSessions = await patchSession(sessionId, (s) => {
            const head = s.history.slice(0, cp.keepUntil);
            return { ...s, history: [...head, ...(cp.discarded as DiskMsg[])] };
          });
          clearSessionHistoryCheckpoint();
          const updated = nextSessions.find((s) => s.id === sessionId);
          if (updated && sessionId === activeIdRef.current) {
            syncMessagesFromSession(updated);
            loadComposerDraft(sessionId);
            return;
          }
        } catch {
          /* fall through */
        }
        const sess = sessionsRef.current.find((s) => s.id === sessionId);
        syncMessagesFromSession(sess);
        loadComposerDraft(sessionId);
      })();
      return;
    }
    const sess = sessionsRef.current.find((s) => s.id === sessionId);
    syncMessagesFromSession(sess);
    loadComposerDraft(sessionId);
  }, [loadComposerDraft, syncMessagesFromSession, patchSession]);

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
        pendingFiles: [],
        pendingTerminalSnippets: restored.terminalSnippets,
        pendingDomElements: [],
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

  const composerPlaceholder = COMPOSER_PLACEHOLDER;

  const appendEditComposerImageFiles = useCallback(
    async (files: File[], _cursor?: number) => {
      const startLen = editComposer?.pendingImages.length ?? 0;
      const newItems = await normalizePendingImageFiles(files, startLen);
      if (!newItems.length) return;
      setEditComposer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingImages: [...prev.pendingImages, ...newItems],
        };
      });
      requestAnimationFrame(() => inlineTaRef.current?.focus());
    },
    [editComposer?.pendingImages.length],
  );

  /** 拖拽：图片 → 缩略图；非图片 → 读正文后挂附件 */
  const handleComposerDropFiles = useCallback(
    async (files: File[], _cursor?: number) => {
      const imgFiles = files.filter((f) => f.type.startsWith("image/"));
      const otherFiles = files.filter((f) => !f.type.startsWith("image/"));
      if (imgFiles.length) void appendComposerImageFiles(imgFiles);
      if (!otherFiles.length) return;
      const MAX = 200 * 1024;
      const entries: PendingFileEntry[] = [];
      for (const f of otherFiles) {
        if (f.size > MAX) continue;
        try {
          const content = await f.text();
          if (!content || content.includes("\u0000")) continue;
          entries.push({ id: newLocalId(), name: f.name, content });
        } catch {
          /* skip */
        }
      }
      if (!entries.length) {
        toast.error("无法读取附件");
        return;
      }
      setPendingFiles((p) => [...p, ...entries]);
    },
    [appendComposerImageFiles],
  );

  const handleInlineComposerDropFiles = useCallback(
    async (files: File[], _cursor?: number) => {
      const imgFiles = files.filter((f) => f.type.startsWith("image/"));
      const otherFiles = files.filter((f) => !f.type.startsWith("image/"));
      if (imgFiles.length) void appendEditComposerImageFiles(imgFiles);
      if (!otherFiles.length) return;
      const MAX = 200 * 1024;
      const entries: PendingFileEntry[] = [];
      for (const f of otherFiles) {
        if (f.size > MAX) continue;
        try {
          const content = await f.text();
          if (!content || content.includes("\u0000")) continue;
          entries.push({ id: newLocalId(), name: f.name, content });
        } catch {
          /* skip */
        }
      }
      if (!entries.length) {
        toast.error("无法读取附件");
        return;
      }
        setEditComposer((prev) =>
          prev ? { ...prev, pendingFiles: [...prev.pendingFiles, ...entries] } : prev,
        );
    },
    [appendEditComposerImageFiles],
  );

  const handleInlineComposerPaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind !== "file") continue;
        const f = it.getAsFile();
        if (f?.type.startsWith("image/")) imageFiles.push(f);
      }
      if (!imageFiles.length) return;
      e.preventDefault();
      const cursor = e.currentTarget.selectionStart ?? editComposer?.input.length ?? 0;
      void appendEditComposerImageFiles(imageFiles, cursor);
    },
    [appendEditComposerImageFiles, editComposer?.input.length],
  );

  const handleComposerPaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind !== "file") continue;
        const f = it.getAsFile();
        if (f?.type.startsWith("image/")) imageFiles.push(f);
      }
      if (!imageFiles.length) return;
      e.preventDefault();
      const cursor = e.currentTarget.selectionStart ?? input.length;
      void appendComposerImageFiles(imageFiles, cursor);
    },
    [appendComposerImageFiles, input.length],
  );

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
    setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    switchActiveSession(id);
    loadComposerDraft(id);
    syncMessagesFromSession(s);
    // 优先使用 per-session 累积消息（跨会话切换后正在流的回复仍可见）
    const perSession = chatCtx.perSessionMessagesRef.current[id];
    if (perSession?.length) {
      setMessages(perSession);
      chatCtx.syncMessages(perSession);
    } else if (s) {
      const ml = s.modelId?.trim() || globalModel || "模型";
      chatCtx.syncMessages(diskToDisplay(s.history, ml));
    }
    if (api) await persist(sessionsRef.current, id);
    setChatSessionsCache({
      sessions: sessionsRef.current,
      activeId: id,
      activeByWorkspace: activeByWorkspaceRef.current,
      workspacePath: workspacePathRef.current,
      composerDrafts: composerDraftsRef.current,
      explicitEmptySessionId: getChatSessionsCache()?.explicitEmptySessionId ?? null,
      localAgentBasename: getChatSessionsCache()?.localAgentBasename,
    });
    // 直接同步上下文，不依赖 useLayoutEffect（可能在组件卸载前未执行）
    chatCtx.syncSessions(sessionsRef.current);
  };

  const handleDeleteHistorySession = useCallback(
    async (sessionId: string) => {
      const prev = sessionsRef.current;
      const next = prev.filter((s) => s.id !== sessionId);
      if (next.length === prev.length) return;
      sessionsRef.current = next;
      setSessions(next);
      chatCtx.syncSessions(next);
      const nextActiveId = activeId === sessionId ? (next[0]?.id ?? "") : activeId;
      if (nextActiveId !== activeId) {
        await handleSessionChange(nextActiveId);
      }
      await persist(next, nextActiveId);
    },
    [chatCtx, activeId, handleSessionChange, persist],
  );

  /** 快速触发任务链：同步模板 → 创建链 → 激活 → 执行 */
  const handleAddTask = useCallback(
    async (templateId: string) => {
      const api = getDesktop();
      if (!api?.orchestrationCreateChain || !api.orchestrationActivateChain) {
        toast.error("任务链功能不可用，请重启应用。");
        return;
      }
      if (chainRunningRef.current) {
        toast.info("任务链已在后台执行中。");
        return;
      }
      await syncOfficialGenericChains();
      const template = getChainTemplate(templateId);
      if (!template) {
        toast.error("未找到对应的任务链模板。");
        return;
      }
      const steps = applyChainTemplate(template, {});
      const chainR = await api.orchestrationCreateChain({
        name: template.name,
        description: template.description,
        category: template.category,
        templateId: template.id,
        state: { status: "idle", currentIndex: 0, steps },
      });
      if (!chainR.ok || !chainR.chain) {
        toast.error(chainR.error ?? "创建任务链失败");
        return;
      }
      const actR = await api.orchestrationActivateChain(chainR.chain.id);
      if (!actR.ok) {
        toast.error(actR.error ?? "激活任务链失败");
        return;
      }
      await runOrchestrationChain({ skipConfirm: true });
    },
    [runOrchestrationChain],
  );

  const activateHistorySession = useCallback(
    async (sessionId: string) => {
      let sess = sessionsRef.current.find((s) => s.id === sessionId);
      if (!sess) return;

      resetScrollFollow();
      saveComposerDraft(activeIdRef.current);
      setEditHistoryIndex(null);
      editHistoryIndexRef.current = null;
      setEditComposer(null);

      const targetWs = sess.workspacePath ?? null;
      let sameWorkspace = sessionMatchesWorkspaceTab(sess, workspacePathRef.current);
      const api = getDesktop();

      if (!sameWorkspace && api && !targetWs) {
        const ws = workspaceSessionKey(workspacePathRef.current);
        if (!ws) {
          toast.warning("该对话未关联工作区，请先打开对应项目。");
          return;
        }
        const stamped = stampSessionWorkspaceIfMissing(sess, ws);
        let next = sessionsRef.current.map((s) => (s.id === sessionId ? stamped : s));
        const explicitId = getChatSessionsCache()?.explicitEmptySessionId;
        next = pruneDuplicateEmptySessions(
          next,
          ws,
          sessionId,
          explicitId ? [explicitId] : undefined,
        );
        sessionsRef.current = next;
        setSessions(next);
        sess = stamped;
        sameWorkspace = true;
      }

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

      setOpenTabIds((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
      switchActiveSession(sessionId);
      loadComposerDraft(sessionId);
      syncMessagesFromSession(sess);
      // 优先使用 per-session 累积消息（跨会话切换后正在流的回复仍可见）
      const perSession2 = chatCtx.perSessionMessagesRef.current[sessionId];
      if (perSession2?.length) {
        setMessages(perSession2);
        chatCtx.syncMessages(perSession2);
      } else if (sess) {
        const ml2 = sess.modelId?.trim() || globalModel || "模型";
        chatCtx.syncMessages(diskToDisplay(sess.history, ml2));
      }
      if (api) await persist(sessionsRef.current, sessionId);
      // 直接同步上下文
      chatCtx.syncSessions(sessionsRef.current);
    },
    [
      resetScrollFollow,
      saveComposerDraft,
      loadComposerDraft,
      syncMessagesFromSession,
      persist,
      chatCtx,
    ],
  );
  const handleNewSession = async () => {
    if (newSessionInFlightRef.current) return;
    newSessionInFlightRef.current = true;
    try {
      resetScrollFollow();
      saveComposerDraft(activeIdRef.current);
      setEditHistoryIndex(null);
      editHistoryIndexRef.current = null;
      setEditComposer(null);
      const api = getDesktop();
      if (!api) return;

      const ws = workspacePathRef.current;
      const settings = await getCachedSettings(api);
      const mode: OrchMode =
        settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
      const id = genSessionId();
      const ns: ChatSession = {
        id,
        title: "新对话",
        modelId: pickOrchestratorModel(
          settings.model,
          chatModelPoolCombined({
            cloudModels: orchestratorModels,
            localModels: localOllamaTags,
          }),
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
      setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      markExplicitEmptyChatSession(id);
      chatCtx.syncExplicitEmptySessionId(id);
      setInput("");
      setPendingImages([]);
      setPendingTerminalSnippets([]);
      setPendingDomElements([]);
      setMessages([{ role: "assistant", content: EMPTY_SESSION_WELCOME }]);
      chatCtx.syncMessages([{ role: "assistant", content: EMPTY_SESSION_WELCOME }]);
      await persist(next, id);
      chatCtx.syncSessions(next);
    } finally {
      newSessionInFlightRef.current = false;
    }
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
      const id = genSessionId();
      const ws = workspacePathRef.current;
      const settings = await getCachedSettings(api);
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
      setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setMessages([
        { role: "assistant", content: "已绑定 Claude CLI 会话，继续对话将使用 --resume。" },
      ]);
      await persist(next, id);
      navigate({ to: "/", search: EMPTY_CHAT_SEARCH, replace: true });
    })();
  }, [
    urlClaudeResume,
    sessions,
    hasDesktopApi,
    activateHistorySession,
    globalModel,
    navigate,
    persist,
    switchActiveSession,
  ]);

  const handleCloseSession = async (id: string) => {
    const visible = filterSessionsForWorkspaceTabs(sessionsRef.current, workspacePathRef.current);
    if (visible.length <= 1) return;
    setOpenTabIds((prev) => prev.filter((tid) => tid !== id));
    resetScrollFollow();
    const reqId = chatCtx.activeRequestIdsRef.current.get(id);
    const api = getDesktop();
    if (reqId && api?.claudeCodeAbort) void api.claudeCodeAbort(reqId);
    if (reqId && api?.localOrchestrationAbort) void api.localOrchestrationAbort(reqId);
    if (reqId && api?.hostAgentAbort) void api.hostAgentAbort(reqId);
    chatCtx.activeRequestIdsRef.current.delete(id);
    setSessionSending(id, false);
    delete composerDraftsRef.current[id];

    // 关闭标签页 ≠ 删除对话：保留 session 在内存中，以便历史下拉仍可访问
    const nextActiveCandidates = sessionsRef.current.filter((s) => s.id !== id);
    const visibleAfter = filterSessionsForWorkspaceTabs(
      nextActiveCandidates,
      workspacePathRef.current,
    );
    const aid =
      id === activeIdRef.current
        ? (sortSessionsByLatest(visibleAfter)[0]?.id ?? visibleAfter[0]?.id ?? "")
        : activeIdRef.current;
    const _preserve3 =
      getChatSessionsCache()?.explicitEmptySessionId || chatCtx.explicitEmptySessionId;
    const preserveIds3: string[] | undefined = _preserve3 ? [_preserve3] : undefined;
    // 仅修剪空会话（无历史的），有内容的会话全部保留
    const pruned = pruneDuplicateEmptySessions(
      sessionsRef.current,
      workspacePathRef.current,
      aid || activeIdRef.current,
      preserveIds3,
    );
    if (id === activeIdRef.current && aid) {
      closingSessionTargetRef.current = aid;
      switchActiveSession(aid);
      loadComposerDraft(aid);
      const targetSess = pruned.find((s) => s.id === aid);
      if (targetSess) {
        const ml = targetSess.modelId?.trim() || globalModel || "模型";
        const displayMsgs = diskToDisplay(targetSess.history, ml);
        const welcomeMsg: Msg = { role: "assistant", content: EMPTY_SESSION_WELCOME };
        const finalMsgs = displayMsgs.length > 0 ? displayMsgs : [welcomeMsg];
        chatCtx.syncMessages(finalMsgs);
        setMessages(finalMsgs);
      } else {
        setMessages([]);
      }
    }
    setSessions(pruned);
    sessionsRef.current = pruned;
    if (api) await persist(pruned, aid || activeIdRef.current);
    closingSessionTargetRef.current = null;
  };

  const runPmDelegationRuntime = useCallback(async () => {
    const api = getDesktop();
    if (!api?.multiAgentExecuteDelegation) {
      toast.error("请完全退出并重启桌面应用以加载 Multi-Agent Runtime（委派执行）。");
      return;
    }
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    const settings = await getCachedSettings(api);
    const resolved = resolveModelForExecution({
      selectedModel: sess.modelId || settings.model,
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
      allCloudModels: configuredPoolsRef.current.cloudModels,
      allLocalModels: configuredPoolsRef.current.localModels,
      preferredMode: orchMode,
      preferredCloudModel: settings.preferredCloudModel,
      preferredLocalModel: settings.preferredLocalModel,
    });
    if (!resolved) {
      toast.error("请先在「模型配置」添加云或本地模型。");
      return;
    }
    const { mode, modelId } = resolved;
    const hist = [...(sess.history ?? [])];
    const lastAssistant = [...hist]
      .reverse()
      .find(
        (m) =>
          m.role === "assistant" && m.content && m.content !== "__WAITING__" && !m.requestError,
      );
    if (!lastAssistant?.content?.trim()) {
      toast.error(
        "未找到可用的上一条助手消息（须含 delegation-v1 或 delegate_to / steps 的 JSON）。",
      );
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
      const nextHist = [...hist];
      nextHist.push({
        role: "user",
        content:
          "【Multi-Agent Runtime】/delegation-run — 解析上一条助手气泡中的 delegation-v1 并顺序执行子 Agent",
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
        const lastUserLine = [...hist]
          .reverse()
          .find((m) => m.role === "user" && String(m.content || "").trim());
        const chainDisplayLine = String(lastUserLine?.content || "").trim();
        let block = "【Multi-Agent Runtime · delegation-v1】\n\n";
        for (const step of r.stepResults ?? []) {
          if (step.ok) {
            const raw = String(step.output ?? "").trim();
            if (raw) {
              maybeToastMissingWorkspaceWrite(raw);
              const chainIngest = await ingestChainStepWorkspaceWrites(
                api,
                raw,
                {
                  agentName: step.agentName,
                  taskId: step.taskId,
                  displayLine: chainDisplayLine,
                },
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
              {
                agentName: r.synthesis.agentName,
                taskId: "synthesis",
                displayLine: chainDisplayLine,
              },
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

  const runParallelDelegation = useCallback(
    async (config: ParallelDispatchConfig) => {
      const api = getDesktop();
      if (!api?.multiAgentExecuteParallel) {
        toast.error("请完全退出并重启桌面应用以加载并行执行功能。");
        return;
      }
      const sess = sessions.find((s) => s.id === activeId);
      if (!sess) return;
      const settings = await getCachedSettings(api);
      const modelId = sess.modelId?.trim() || settings.model?.trim() || "";
      const hist = [...(sess.history || [])];

      setSessionSending(activeId, true);
      try {
        hist.push({
          role: "user",
          content: `【并行执行】以下任务将同时分发给 ${config.agents.length} 个 Agent：${config.agents.join("、")}\n\n${config.task}`,
          ts: Date.now(),
        });
        const nextSessions0 = sessions.map((s) =>
          s.id === activeId ? { ...s, history: hist } : s,
        );
        setSessions(nextSessions0);
        setMessages(diskToDisplay(hist, modelId));
        await persist(nextSessions0, activeId);

        const r = await api.multiAgentExecuteParallel({
          agents: config.agents,
          task: config.task,
          modelId,
          needSynthesis: config.needSynthesis,
          synthesisStem: config.synthesisStem,
        });

        let block = `【并行执行结果】${r.totalElapsed ? `（耗时 ${Math.round(r.totalElapsed / 1000)}s）` : ""}\n\n`;
        for (const output of r.outputs ?? []) {
          if (output.ok) {
            const raw = String(output.output ?? "").trim();
            if (raw) {
              maybeToastMissingWorkspaceWrite(raw);
              const chainIngest = await ingestChainStepWorkspaceWrites(
                api,
                raw,
                {
                  agentName: output.agentName,
                  taskId: "parallel",
                  displayLine: config.task,
                },
                toastIngestWorkspaceHint,
              );
              const collapsed = stripLargeAssistantArtifacts(chainIngest.displayText);
              block += `### ${output.agentName} ✅\n${collapsed}\n\n`;
            } else {
              block += `### ${output.agentName} ✅\n（无正文输出）\n\n`;
            }
          } else {
            block += `### ${output.agentName} ❌\n失败：${output.error ?? ""}\n\n`;
          }
        }
        if (r.synthesis?.output) {
          const synCollapsed = stripLargeAssistantArtifacts(r.synthesis.output);
          block += `### 汇总\n${synCollapsed}\n`;
        }
        hist.push({
          role: "assistant",
          content: stripLargeAssistantArtifacts(block.trim()),
          ts: Date.now(),
        });
        const nextSessions = sessions.map((s) => (s.id === activeId ? { ...s, history: hist } : s));
        setSessions(nextSessions);
        setMessages(diskToDisplay(hist, modelId));
        await persist(nextSessions, activeId);
        toast.success("并行执行完成（见最新消息）。");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setSessionSending(activeId, false);
      }
    },
    [activeId, persist, sessions],
  );

  const { sendChat, stopChat, resendUserMessageImpl } = useChatSend({
    navigate,
    chatCtx,
    getCachedSettings,
    resetScrollFollow,
    patchSession,
    persist,
    clearExplicitEmptyChatSessionIf,
    pruneWorkspaceSessions,
    appendLocalChatExchange,
    appendAgentExecEvent,
    runPmDelegationRuntime,
    runOrchestrationChain,
    performBulkWriteProject,
    runProjectPreview,
    stemAgentMeta,
    runWorkflowFromWbsRef,
    input,
    pendingImages,
    pendingFiles,
    pendingTerminalSnippets,
    pendingDomElements,
    selectedSkillStems,
    activeId,
    globalModel,
    localAgentBasename,
    orchMode,
    orchestratorModels,
    localOllamaTags,
    setInput,
    setPendingImages,
    setPendingFiles,
    setPendingTerminalSnippets,
    setPendingDomElements,
    setSelectedSkillStems,
    setStopRequested,
    setSessionSending,
    setEditComposer,
    setEditHistoryIndex,
    setSessions,
    setMessages,
    setActiveStreamRequestId,
    setTerminalOpen,
    setParallelDialogPreset,
    setParallelDialogDefaultTask,
    setParallelDialogOpen,
    sendPayloadOverrideRef,
    editComposerRef,
    editHistoryIndexRef,
    activeIdRef,
    sendingSessionsRef,
    workspacePathRef,
    setWorkspacePath,
    activeByWorkspaceRef,
    sessionsRef,
    composerDraftsRef,
    streamContextRef,
    activeStreamRequestIdRef,
    chainRunningRef,
    chainDocsInjectedRef,
    expandInjectedPathsRef,
    configuredPoolsRef,
    stopChainExecution,
  });

  useEffect(() => {
    setPlanBuildHandler((path) => {
      const mode = getWorkbenchInteractionMode();
      if (mode === "ask") {
        toast.message(PLAN_BUILD_ASK_BLOCKED);
        return;
      }
      setWorkbenchInteractionMode("agent");
      sendPayloadOverrideRef.current = {
        text: `按方案执行：${path}`,
        pendingImages: [],
        pendingFiles: [],
        pendingTerminalSnippets: [],
        pendingDomElements: [],
      };
      void sendChat();
    });
    setAgentFixHandler((snippet) => {
      setWorkbenchInteractionMode("agent");
      sendPayloadOverrideRef.current = {
        text: `请根据以下终端失败输出修复相关代码并落盘：\n\n\`\`\`\n${snippet}\n\`\`\``,
        pendingImages: [],
        pendingFiles: [],
        pendingTerminalSnippets: [],
        pendingDomElements: [],
      };
      void sendChat();
    });
    return () => {
      setPlanBuildHandler(null);
      setAgentFixHandler(null);
    };
  }, [sendChat]);

  const restoreSessionCheckpoint = useCallback(
    async (preferSessionId?: string) => {
      const cp =
        (preferSessionId ? loadSessionHistoryCheckpoint(preferSessionId) : null) ??
        loadSessionHistoryCheckpoint();
      if (!cp?.discarded?.length) {
        toast.error("检查点不存在或已失效");
        return false;
      }
      const sessionId = cp.sessionId;
      try {
        const nextSessions = await patchSession(sessionId, (s) => {
          const head = s.history.slice(0, cp.keepUntil);
          const restored = [...head, ...(cp.discarded as DiskMsg[])];
          return { ...s, history: restored };
        });
        clearSessionHistoryCheckpoint();
        const updated = nextSessions.find((s) => s.id === sessionId);
        if (!updated) {
          toast.error("恢复检查点失败：会话不存在");
          return false;
        }
        if (sessionId === activeIdRef.current) {
          const ml = updated.modelId?.trim() || globalModel || "模型";
          const display = diskToDisplay(updated.history, ml);
          setMessages(display);
          chatCtx.syncMessages(display);
          chatCtx.syncSessionMessages(sessionId, display);
        } else {
          toast.success("已恢复检查点（请切换到对应会话查看）");
          return true;
        }
        toast.success("已恢复检查点之后的消息");
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "恢复检查点失败");
        return false;
      }
    },
    [patchSession, globalModel, chatCtx],
  );

  const runCheckpointAction = useCallback(
    (historyIndex: number, action: "edit" | "resend") => {
      const sessionId = activeIdRef.current;
      const sess = sessionsRef.current.find((s) => s.id === sessionId);
      if (sess && historyIndex < sess.history.length - 1) {
        const discarded = sess.history.slice(historyIndex);
        const saved = saveSessionHistoryCheckpoint({
          sessionId,
          savedAt: Date.now(),
          keepUntil: historyIndex,
          discarded,
        });
        if (!saved) {
          toast.error("无法保存检查点（存储失败），已取消截断。请重试或清理浏览器存储。");
          return;
        }
        // 检查点静默保存；恢复入口在命令面板「恢复会话检查点」/ 取消编辑
      }
      if (action === "edit") beginEditUserMessageImpl(historyIndex);
      else void resendUserMessageImpl(historyIndex);
    },
    [beginEditUserMessageImpl, resendUserMessageImpl],
  );

  useEffect(() => {
    return subscribeRestoreSessionCheckpoint(() => {
      const sessionId = activeIdRef.current;
      void restoreSessionCheckpoint(sessionId);
    });
  }, [restoreSessionCheckpoint]);

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

  /** 点气泡正文：直接进编辑，不弹确认框（确认框仅留给右下角 Icon / 重新发送） */
  const beginEditUserMessage = useCallback(
    (historyIndex: number) => {
      const sessionId = activeIdRef.current;
      if (sendingSessionsRef.current[sessionId]) {
        toast.warning("请等待当前回复完成后再编辑历史消息。");
        return;
      }
      runCheckpointAction(historyIndex, "edit");
    },
    [runCheckpointAction],
  );

  /** 点气泡 Icon / 右键「重新发送」：弹出检查点确认 */
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

        const settings = await getCachedSettings(api);
        const mode: OrchMode =
          settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
        setLocalAgentBasename(agentBasenameForWorkspace(settings, nextWs));
        const modelId = pickOrchestratorModel(
          settings.model,
          chatModelPoolCombined({
            cloudModels: orchestratorModels,
            localModels: localOllamaTags,
          }),
          mode,
        );
        const resolved = resolveWorkspaceChatSessions(
          all,
          nextWs,
          activeByWorkspaceRef.current,
          () => ({
            id: genSessionId(),
            title: "新对话",
            modelId,
            history: [],
            workspacePath: workspaceSessionKey(nextWs) || null,
          }),
          {
            resume: true,
            explicitEmptySessionId: getChatSessionsCache()?.explicitEmptySessionId ?? null,
            cachedActiveId: getChatSessionsCache()?.activeId ?? null,
          },
        );
        all = resolved.sessions;
        const aid = resolved.activeId;
        activeByWorkspaceRef.current = resolved.activeByWorkspace;

        setSessions(all);
        sessionsRef.current = all;
        switchActiveSession(aid);
        setOpenTabIds([aid]);
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

  /** 从工作区 WBS 文档生成项目任务链（可选自动执行） */
  const runWorkflowFromWbs = async (opts?: {
    preferredPath?: string;
    quietPickToast?: boolean;
    wbsOnly?: boolean;
    autoRun?: boolean;
    recordUserLine?: string;
  }): Promise<WbsChainSyncResult | null> => {
    const api = getDesktop();
    if (!api) {
      const error = LOCAL_ONLY_HINT;
      if (!opts?.recordUserLine) toast.error(error, { duration: 5000 });
      return { ok: false, error };
    }
    try {
      const runningNow = await syncExecutionState();
      if (opts?.autoRun && (runningNow || sending)) {
        stopChainExecution();
        stopChat();
        const deadline = Date.now() + 6000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 120));
          const running = await syncExecutionState();
          if (!running && !sendingRef.current) break;
        }
        const stillBusy = await syncExecutionState();
        if (stillBusy || sendingRef.current) {
          const error = "旧流程仍在收尾，请稍后再试。";
          return { ok: false, error };
        }
      }
      if (!api.orchestrationCreateChain || !api.orchestrationActivateChain) {
        const error = "当前版本未暴露任务链注册接口，请重启到最新桌面应用。";
        if (!opts?.recordUserLine) toast.error(error);
        return { ok: false, error };
      }
      const settings = await getCachedSettings(api);
      const readWorkspaceTextFile = api.readWorkspaceTextFile;
      if (typeof readWorkspaceTextFile !== "function") {
        const error = "当前版本未暴露工作区读文件接口，请重启到最新桌面应用。";
        if (!opts?.recordUserLine) toast.error(error);
        return { ok: false, error };
      }
      const listMd =
        typeof api.listWorkspaceMarkdownFiles === "function"
          ? async () => {
              const listed = await api.listWorkspaceMarkdownFiles!();
              return listed.ok && Array.isArray(listed.files) ? listed.files : [];
            }
          : async () => [];

      const discovered = await discoverWbsDocument(listMd, (p) => readWorkspaceTextFile(p), {
        preferredPath: opts?.preferredPath,
        extraCandidatePaths: [settings.defaultConfirmWritePath?.trim() || ""],
        wbsFilenameOnly: Boolean(opts?.wbsOnly),
      });

      let pickedPath = "";
      let pickedText = "";
      let wbsDiscoverSource: "filename" | "content-scan" | "" = "";

      if (discovered) {
        pickedPath = discovered.path;
        pickedText = discovered.text;
        wbsDiscoverSource = discovered.source;
      } else if (opts?.wbsOnly) {
        const fallback = await discoverWbsDocument(listMd, (p) => readWorkspaceTextFile(p), {
          preferredPath: opts?.preferredPath,
          extraCandidatePaths: [settings.defaultConfirmWritePath?.trim() || ""],
          wbsFilenameOnly: false,
        });
        if (fallback) {
          pickedPath = fallback.path;
          pickedText = fallback.text;
          wbsDiscoverSource = fallback.source;
        }
      }

      if (!pickedText) {
        const error =
          "未读取到可解析的 WBS。请确认项目中含有含「编号 | 工作摘要 | 执行 Agent」表格的文档。";
        if (!opts?.recordUserLine) {
          toast.error(
            "未读取到可解析的 WBS。请先用 `/agent project-manager` 生成含「编号 | 工作摘要 | 执行 Agent」表格的 WBS 文档。",
            { duration: 7200 },
          );
        }
        return { ok: false, error };
      }
      const parsed = parseActiveChainFromBubbleText(pickedText);
      if (!parsed.ok) {
        const error = `WBS 解析失败：${parsed.error}`;
        if (!opts?.recordUserLine) {
          toast.error(error, { duration: 5000 });
        }
        return { ok: false, error };
      }
      const saved = await registerParsedChainInList(api, {
        state: parsed.state,
        wbsPath: pickedPath,
        description: `WBS 来源：${pickedPath} · 工作区同步`,
        resetProgress: true,
      });
      if (!saved.ok) {
        const error = saved.error || "注册任务链失败";
        if (!opts?.recordUserLine) toast.error(error, { duration: 5000 });
        return { ok: false, error };
      }

      const autoRun = Boolean(opts?.autoRun);
      const result: WbsChainSyncResult = {
        ok: true,
        pickedPath,
        chainName: saved.chainName,
        chainId: saved.chainId,
        stepCount: saved.stepCount,
        autoRun,
      };

      if (autoRun) {
        if (!opts?.quietPickToast) {
          toast.success(
            `已基于 ${pickedPath} 同步任务链「${saved.chainName}」（${saved.stepCount} 步）到列表，开始执行…`,
          );
        }
        await runOrchestrationChain({ skipConfirm: true, pinnedSessionId: activeIdRef.current });
      } else if (!opts?.quietPickToast) {
        toast.success(
          `已生成任务链「${saved.chainName}」（${saved.stepCount} 步），可在侧栏「任务链」查看并执行`,
          { duration: 5500 },
        );
      }

      if (opts?.recordUserLine) {
        await appendLocalChatExchange(
          activeIdRef.current,
          opts.recordUserLine,
          `${formatWbsChainSyncAssistantReply(result)}\n\n可在侧栏 **任务链** 搜索 \`WBS\` 或筛选 **自定义** 查看。`,
        );
      }

      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("runWorkflowFromWbs", e);
      const error = `按 WBS 生成任务链失败：${msg || "未知错误"}`;
      if (!opts?.recordUserLine) toast.error(error, { duration: 6000 });
      return { ok: false, error };
    }
  };
  runWorkflowFromWbsRef.current = runWorkflowFromWbs;

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
      await runOrchestrationChain({ skipConfirm: true, pinnedSessionId: activeIdRef.current });
      return;
    }
    const hasCompleted =
      Boolean(st) &&
      Array.isArray(st?.steps) &&
      (st?.steps?.length ?? 0) > 0 &&
      (st?.currentIndex ?? 0) >= (st?.steps?.length ?? 0);
    if (hasCompleted) {
      return;
    }
    const sess = sessions.find((s) => s.id === activeId);
    const exitTs =
      [...(sess?.history ?? [])].reverse().find((m) => typeof m.ts === "number")?.ts ?? Date.now();
    if (typeof api.listWorkspaceMarkdownFiles !== "function") {
      await runWorkflowFromWbs({ wbsOnly: true });
      return;
    }
    let listed: {
      ok: boolean;
      files?: { relPath: string; mtimeMs: number; size: number }[];
      error?: string;
    } | null = null;
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

  // ---- inlineComposer 行内回调提取（避免 useMemo 每次重建时创建新引用） ----
  const inlineOnRemoveImage = useCallback(
    (id: string) =>
      setEditComposer((prev) =>
        prev ? { ...prev, pendingImages: prev.pendingImages.filter((x) => x.id !== id) } : prev,
      ),
    [],
  );
  const inlineOnRemoveFile = useCallback(
    (id: string) =>
      setEditComposer((prev) =>
        prev ? { ...prev, pendingFiles: prev.pendingFiles.filter((x) => x.id !== id) } : prev,
      ),
    [],
  );
  const inlineOnRemoveTerminalSnippet = useCallback(
    (id: string) =>
      setEditComposer((prev) =>
        prev
          ? {
              ...prev,
              pendingTerminalSnippets: prev.pendingTerminalSnippets.filter((x) => x.id !== id),
            }
          : prev,
      ),
    [],
  );
  const inlineOnRemoveDomElement = useCallback(
    (id: string) =>
      setEditComposer((prev) =>
        prev
          ? { ...prev, pendingDomElements: prev.pendingDomElements.filter((x) => x.id !== id) }
          : prev,
      ),
    [],
  );
  const inlineOnDropFiles = useCallback(
    (files: File[], cursor: number) => void handleInlineComposerDropFiles(files, cursor),
    [handleInlineComposerDropFiles],
  );
  const inlineOnPickFiles = useCallback(
    (opts?: { onlyImages?: boolean }) => void pickLocalFiles(opts),
    [pickLocalFiles],
  );
  const inlineOnAgentChange = useCallback(
    (b: string) => void handleAgentChange(b),
    [handleAgentChange],
  );
  const inlineOnModelPick = useCallback(
    (pick: { mode: OrchMode; model: string }) => void handleModelPick(pick),
    [handleModelPick],
  );

  const inlineComposer = useMemo((): ChatComposerShellProps | null => {
    if (editHistoryIndex == null || !editComposer) return null;
    return {
      textareaRef: inlineTaRef,
      input: editComposer.input,
      onInputChange: (v) => setEditComposer((prev) => (prev ? { ...prev, input: v } : prev)),
      onSend: () => void sendChat(),
      onStop: () => stopChat(),
      onPaste: handleInlineComposerPaste,
      onDropFiles: inlineOnDropFiles,
      placeholder: composerPlaceholder,
      disabled: workflowBusy,
      workflowBusy,
      hasDesktopApi,
      canSend: Boolean(
        editComposer.input.trim() ||
        editComposer.pendingImages.length ||
        editComposer.pendingFiles.length ||
        editComposer.pendingTerminalSnippets.length ||
        editComposer.pendingDomElements.length,
      ),
      pendingImages: editComposer.pendingImages,
      onRemoveImage: inlineOnRemoveImage,
      pendingFiles: editComposer.pendingFiles,
      onRemoveFile: inlineOnRemoveFile,
      pendingTerminalSnippets: editComposer.pendingTerminalSnippets,
      onRemoveTerminalSnippet: inlineOnRemoveTerminalSnippet,
      pendingDomElements: editComposer.pendingDomElements,
      onRemoveDomElement: inlineOnRemoveDomElement,
      onPickFiles: inlineOnPickFiles,
      orchMode,
      localAgentBasename,
      onAgentChange: inlineOnAgentChange,
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
      modelValue: activeSession?.modelId || globalModel || primaryModelFallback || "",
      modelFallback: primaryModelFallback,
      onModelPick: inlineOnModelPick,
      onCancelEdit: cancelEditUserMessage,
      selectedSkillStems,
      onSelectedSkillStemsChange: setSelectedSkillStems,
      workspacePath,
      onWorkspaceChipClick: handleWorkspaceChipClick,
      onParallelClick: () => {
        setParallelDialogPreset(undefined);
        setParallelDialogDefaultTask(undefined);
        setParallelDialogOpen(true);
      },
    };
  }, [
    editHistoryIndex,
    editComposer,
    workflowBusy,
    hasDesktopApi,
    orchMode,
    localAgentBasename,
    workspacePath,
    handleWorkspaceChipClick,
    orchestratorModels,
    localOllamaTags,
    activeSession?.modelId,
    globalModel,
    primaryModelFallback,
    inlineOnDropFiles,
    inlineOnPickFiles,
    inlineOnAgentChange,
    inlineOnModelPick,
    cancelEditUserMessage,
    stopChat,
    selectedSkillStems,
  ]);

  const editingUserMessage = useMemo((): Msg | null => {
    if (editHistoryIndex == null) return null;
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return null;
    const ml = sess.modelId?.trim() || globalModel || "模型";
    return userMessageForHistoryIndex(sess.history, editHistoryIndex, ml);
  }, [editHistoryIndex, sessions, activeId, globalModel]);

  return (
    <AppShell
      variant="workbench"
      headerToolbar={
        <WorkbenchPanelToolbar
          leftOpen={leftSidebarOpen}
          onLeftOpenChange={setLeftSidebarOpen}
          chatOpen={chatPanelOpen}
          onChatOpenChange={setChatPanelOpen}
          terminalOpen={terminalOpen}
          onTerminalOpenChange={setTerminalOpen}
        />
      }
    >
      <div className="workbench-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <WorkbenchMainLayout
          chatBodyMountRef={onChatBodyMountRef}
          onOpenChatPanel={openChatPanel}
          onInsertTerminalSelection={insertTerminalSelection}
          onInsertDomElement={insertDomElement}
          onPrefillComposer={prefillComposer}
          chatHeader={
            <ChatPanelToolbar
              sessions={tabSessions}
              activeId={activeId}
              sendingSessions={sendingSessions}
              activeStreamRequestId={activeStreamRequestId}
              onSessionChange={(id) => void handleSessionChange(id)}
              onNewSession={() => void handleNewSession()}
              onCloseSession={(id) => void handleCloseSession(id)}
              hasDesktopApi={hasDesktopApi}
              projectHistoryItems={projectHistoryItems}
              allHistoryItems={allHistoryItems}
              onSelectHistorySession={(id) => void activateHistorySession(id)}
              onDeleteHistorySession={(id) => void handleDeleteHistorySession(id)}
              onHistoryOpen={handleHistoryOpen}
              onCollapsePanel={() => setChatPanelOpen(false)}
            />
          }
          terminalOpen={terminalOpen}
          onTerminalOpenChange={setTerminalOpen}
          leftOpen={leftSidebarOpen}
          onLeftOpenChange={setLeftSidebarOpen}
          rightOpen={chatPanelOpen}
          onRightOpenChange={setChatPanelOpen}
          onOpenProblems={() => {
            setTerminalOpen(true);
            focusBottomPanel("problems");
          }}
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
                  onAssistantContentPatch={handleAssistantContentPatch}
                />

                <WorkbenchChatComposer
                  dockRef={composerDockRef}
                  textareaRef={taRef}
                  input={input}
                  onInputChange={setInput}
                  onSend={() => void sendChat()}
                  onStop={() => stopChat()}
                  onPaste={handleComposerPaste}
                  onDropFiles={(files, cursor) => void handleComposerDropFiles(files, cursor)}
                  placeholder={composerPlaceholder}
                  disabled={workflowBusy}
                  workflowBusy={workflowBusy}
                  hasDesktopApi={hasDesktopApi}
                  canSend={Boolean(
                    input.trim() ||
                    pendingImages.length ||
                    pendingFiles.length ||
                    pendingTerminalSnippets.length ||
                    pendingDomElements.length,
                  )}
                  pendingImages={pendingImages}
                  onRemoveImage={(id) => setPendingImages((p) => p.filter((x) => x.id !== id))}
                  pendingFiles={pendingFiles}
                  onRemoveFile={(id) => setPendingFiles((p) => p.filter((x) => x.id !== id))}
                  pendingTerminalSnippets={pendingTerminalSnippets}
                  onRemoveTerminalSnippet={(id) =>
                    setPendingTerminalSnippets((p) => p.filter((x) => x.id !== id))
                  }
                  pendingDomElements={pendingDomElements}
                  onRemoveDomElement={(id) =>
                    setPendingDomElements((p) => p.filter((x) => x.id !== id))
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
                  selectedSkillStems={selectedSkillStems}
                  onSelectedSkillStemsChange={setSelectedSkillStems}
                  workspacePath={workspacePath}
                  onWorkspaceChipClick={handleWorkspaceChipClick}
                  onParallelClick={() => {
                    setParallelDialogPreset(undefined);
                    setParallelDialogDefaultTask(undefined);
                    setParallelDialogOpen(true);
                  }}
                  chainStatusLabel={chainStatusBadge.label}
                  chainStatusTone={chainStatusBadge.tone}
                  onStopChain={
                    chainStatusBadge.tone === "active" || chainStatusBadge.tone === "paused"
                      ? () => stopChainExecution()
                      : undefined
                  }
                  onAddTask={handleAddTask}
                  chainOptions={chainOptions}
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
      <ParallelDispatchDialog
        open={parallelDialogOpen}
        presetAgents={parallelDialogPreset}
        defaultTask={parallelDialogDefaultTask}
        onConfirm={(config) => {
          setParallelDialogOpen(false);
          setParallelDialogPreset(undefined);
          setParallelDialogDefaultTask(undefined);
          runParallelDelegation(config);
        }}
        onCancel={() => {
          setParallelDialogOpen(false);
          setParallelDialogPreset(undefined);
          setParallelDialogDefaultTask(undefined);
        }}
      />
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
