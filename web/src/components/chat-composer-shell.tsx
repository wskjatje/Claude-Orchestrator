import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUp,
  FolderOpen,
  Split,
  MoreHorizontal,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ChatModelSelector, type ModelPick } from "@/components/chat-model-selector";
import { ComposerSessionChip } from "@/components/composer-session-chip";
import { ComposerOrchHint } from "@/components/composer-orch-hint";
import { ComposerContextUsageRing } from "@/components/composer-context-usage-ring";
import { ComposerContextUsageBreakdown } from "@/components/composer-context-usage-breakdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CodeIndexChip, GraphifyChip } from "@/components/chat/composer-chips";
import {
  getLiveExecChannelState,
  subscribeLiveExecChannel,
} from "@/lib/live-exec-channel";
import {
  getWorkbenchInteractionMode,
  subscribeWorkbenchInteractionMode,
} from "@/lib/workbench-interaction-mode";
import { isPlanDocumentRequest } from "@/lib/turn-policy";
import {
  CHAT_CONTEXT_USAGE_TITLE,
  COMPOSER_ASK_PLAN_HINT,
  COMPOSER_SEND_CONNECTING,
} from "@/lib/ui-copy";
import { estimateContextUsage } from "@/lib/context-usage";
import { CONTEXT_USAGE_CHIP_MIN_PERCENT } from "../../../shared/context-budget.mjs";
import {
  getCachedContextLength,
  getCachedModelCapability,
  getModelCapabilityCacheEpoch,
  rememberModelCapability,
  subscribeModelCapabilityCache,
} from "@/lib/model-capability-cache";
import { nextLocalContextOverride } from "@/lib/local-context-override";
import { chatSettingsPreservePayload, isAutoModelSelection } from "@/lib/model-catalog";
import { useDesktopGate } from "@/hooks/use-desktop-ready";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComposerFileAttachments, type PendingFileEntry } from "@/components/composer-file-attachments";
import {
  ComposerTerminalAttachments,
  type PendingTerminalSnippet,
} from "@/components/composer-terminal-attachments";
import { ComposerDomAttachments } from "@/components/composer-dom-attachments";
import { ImageLightbox } from "@/components/image-lightbox";
import { useGraphifyHealth } from "@/lib/use-graphify-status";
import { cn } from "@/lib/utils";
import { modelSupportsChatVision } from "@/lib/chat-image-attach";
import type { PendingDomElement } from "@/lib/dom-element-meta";
import type { UserImageAttachment } from "@/lib/ollama-messages";
import { getDesktop } from "@/lib/desktop-api";
import {
  atMentionPillLabel,
  detectAtMentionAtCursor,
  extractAtMentionTokens,
  formatAtMentionLabel,
  groupCodebaseHits,
  loadComposerMentionPaths,
  matchAtMentionQuery,
  removeAtMentionToken,
  type CodebaseHit,
} from "@/lib/composer-at-mention";
import { useWorkbenchWorkspaceOptional } from "@/contexts/workbench-workspace-context";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import {
  getCodebaseInjectPaths,
  setCodebaseInjectQuery,
  subscribeCodebaseInject,
  toggleCodebaseInjectPath,
} from "@/lib/codebase-inject-selection";

export type ChatComposerShellProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  /** 拖拽文件/图片到 Composer */
  onDropFiles?: (files: File[], cursor: number) => void;
  placeholder: string;
  disabled: boolean;
  workflowBusy: boolean;
  hasDesktopApi: boolean;
  canSend: boolean;
  pendingImages: (UserImageAttachment & { id: string })[];
  onRemoveImage: (id: string) => void;
  pendingFiles: PendingFileEntry[];
  onRemoveFile: (id: string) => void;
  pendingTerminalSnippets: PendingTerminalSnippet[];
  onRemoveTerminalSnippet: (id: string) => void;
  pendingDomElements: PendingDomElement[];
  onRemoveDomElement: (id: string) => void;
  onPickFiles: (opts?: { onlyImages?: boolean }) => void;
  orchMode: "claude-code" | "local-mcp";
  /**
   * 设置里的编排模式已读入。未就绪时不渲染占用环，避免默认 claude-code 误标「云窗」。
   * 禁止用默认云窗顶替未水合状态。
   */
  orchModeReady?: boolean;
  localAgentBasename: string;
  onAgentChange: (basename: string) => void;
  cloudModels: string[];
  localModels: string[];
  modelValue: string;
  modelFallback: string;
  onModelPick: (pick: ModelPick) => void;
  editHistoryActive?: boolean;
  onCancelEdit?: () => void;
  /** 顶部内联编辑 vs 底部 dock */
  variant?: "dock" | "inline";
  /** @ 补全优先路径（如最近打开的编辑器文件） */
  mentionPriorityPaths?: string[];
  /** 本轮可选注入的 Skill stem（空 = 不改发送路径） */
  selectedSkillStems?: string[];
  onSelectedSkillStemsChange?: (stems: string[]) => void;
  /** 当前工作区绝对路径（与发送读盘同源） */
  workspacePath?: string | null;
  /** 点击工作区芯片：跳转工作区页或选择目录 */
  onWorkspaceChipClick?: () => void;
  /** 打开本机多 Agent 并行派发 */
  onParallelClick?: () => void;
  /** 当前会话 history（用于粗略上下文占用条） */
  sessionHistory?: Array<{
    role?: string;
    content?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      estimated?: boolean;
    };
    contextParts?: {
      rulesEstTokens?: number;
      mcpEstTokens?: number;
      mcpCallCount?: number;
    } | null;
  }> | null;
};

/** Composer 主体（底栏与顶部内联编辑共用） */
export function ChatComposerShell({
  textareaRef,
  input,
  onInputChange,
  onSend,
  onStop,
  onPaste,
  onDropFiles,
  placeholder,
  disabled,
  workflowBusy,
  hasDesktopApi,
  canSend,
  pendingImages,
  onRemoveImage,
  pendingFiles,
  onRemoveFile,
  pendingTerminalSnippets,
  onRemoveTerminalSnippet,
  pendingDomElements,
  onRemoveDomElement,
  onPickFiles,
  orchMode,
  orchModeReady = false,
  localAgentBasename,
  onAgentChange,
  cloudModels,
  localModels,
  modelValue,
  modelFallback,
  onModelPick,
  editHistoryActive,
  onCancelEdit,
  variant = "dock",
  mentionPriorityPaths = [],
  selectedSkillStems = [],
  onSelectedSkillStemsChange,
  workspacePath = null,
  onWorkspaceChipClick,
  onParallelClick,
  sessionHistory = null,
}: ChatComposerShellProps) {
  const { phase: bridgePhase } = useDesktopGate();
  const pendingSendRef = useRef(false);
  const inline = variant === "inline";
  const [dragOver, setDragOver] = useState(false);
  const workspaceBasename = useMemo(() => {
    const p = String(workspacePath || "").trim().replace(/\/+$/, "");
    if (!p) return "";
    const parts = p.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] || p;
  }, [workspacePath]);
  const contextSuggestRef = useRef(false);
  const capsEpoch = useSyncExternalStore(
    subscribeModelCapabilityCache,
    getModelCapabilityCacheEpoch,
    getModelCapabilityCacheEpoch,
  );
  const contextUsage = useMemo(() => {
    // 编排就绪即可画环（空会话也显示窗种/上限；禁止等首轮才露「云窗/本窗」）
    if (!orchModeReady || !Array.isArray(sessionHistory)) return null;
    const mid = String(modelValue || modelFallback || "").trim();
    const snap = estimateContextUsage(sessionHistory, {
      contextLength: getCachedContextLength(mid),
      isLocal: orchMode === "local-mcp",
      prevSuggest: contextSuggestRef.current,
    });
    contextSuggestRef.current = snap.suggestSummarize;
    return snap;
  }, [sessionHistory, modelValue, modelFallback, orchMode, orchModeReady, capsEpoch]);
  // Cursor：占比就地变；环可轻闪。仅 windowKind 真变才写「已切换通道窗口」（勿把本窗覆盖档位误报成切通道）。
  // 关闪 timer 独立 effect：避免 windowTokens 连跳时 cleanup 清掉关闪导致文案永久卡住。
  const prevWindowKindRef = useRef<"local" | "cloud" | null>(null);
  const prevWindowTokensRef = useRef<number | null>(null);
  const windowUsageBootstrappedRef = useRef(false);
  const windowUsageMountAtRef = useRef(0);
  const [channelKindFlash, setChannelKindFlash] = useState(false);
  const [usageRingFlash, setUsageRingFlash] = useState(false);
  // 编排模式未就绪时清基准；就绪后首帧再记，禁止把默认云窗记成「真通道」
  useEffect(() => {
    if (!orchModeReady) {
      windowUsageBootstrappedRef.current = false;
      windowUsageMountAtRef.current = 0;
      prevWindowKindRef.current = null;
      prevWindowTokensRef.current = null;
      setChannelKindFlash(false);
      setUsageRingFlash(false);
    }
  }, [orchModeReady]);
  useEffect(() => {
    if (!orchModeReady) return;
    const kind = contextUsage?.windowKind ?? null;
    const tokens = contextUsage?.windowTokens ?? null;
    if (!kind && tokens == null) return;
    if (!windowUsageMountAtRef.current) windowUsageMountAtRef.current = Date.now();
    // 首帧 + 水合静默窗：只记基准，不闪（窗档跳变会误报）
    const inHydrateQuiet =
      !windowUsageBootstrappedRef.current ||
      Date.now() - windowUsageMountAtRef.current < 2000;
    if (inHydrateQuiet) {
      windowUsageBootstrappedRef.current = true;
      if (kind) prevWindowKindRef.current = kind;
      if (tokens != null) prevWindowTokensRef.current = tokens;
      return;
    }
    const prevKind = prevWindowKindRef.current;
    const prevTokens = prevWindowTokensRef.current;
    if (kind) prevWindowKindRef.current = kind;
    if (tokens != null) prevWindowTokensRef.current = tokens;
    const kindChanged = Boolean(prevKind && kind && prevKind !== kind);
    const tokensChanged = Boolean(
      prevTokens != null && tokens != null && prevTokens !== tokens,
    );
    if (kindChanged) setChannelKindFlash(true);
    if (kindChanged || tokensChanged) setUsageRingFlash(true);
  }, [orchModeReady, contextUsage?.windowKind, contextUsage?.windowTokens]);
  useEffect(() => {
    if (!channelKindFlash) return;
    const t = window.setTimeout(() => setChannelKindFlash(false), 1800);
    return () => window.clearTimeout(t);
  }, [channelKindFlash]);
  useEffect(() => {
    if (!usageRingFlash) return;
    const t = window.setTimeout(() => setUsageRingFlash(false), 1800);
    return () => window.clearTimeout(t);
  }, [usageRingFlash]);
  const cycleLocalWindowOverride = useCallback(async () => {
    if (orchMode !== "local-mcp" || !hasDesktopApi || workflowBusy) return;
    const mid = String(modelValue || modelFallback || "").trim();
    if (!mid || isAutoModelSelection(mid)) return;
    const api = getDesktop();
    if (!api?.getChatSettings || !api.saveChatSettings) return;
    try {
      const s = await api.getChatSettings();
      const prev = { ...(s.modelCapabilityOverrides || {}) };
      const cur = { ...(prev[mid] || {}) };
      const curCl = typeof cur.contextLength === "number" ? cur.contextLength : null;
      const nextCl = nextLocalContextOverride(curCl);
      if (nextCl == null) delete cur.contextLength;
      else cur.contextLength = nextCl;
      if (Object.keys(cur).length) prev[mid] = cur;
      else delete prev[mid];
      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        modelCapabilityOverrides: prev,
      });
      // 芯片经 capsEpoch 重算 %；无 toast（对齐 Cursor 就地反馈）
      rememberModelCapability(mid, {
        ...(getCachedModelCapability(mid) || {}),
        contextLength: nextCl,
      });
    } catch {
      /* 覆盖失败不打断发送 */
    }
  }, [orchMode, hasDesktopApi, workflowBusy, modelValue, modelFallback]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const { health: graphHealth, buildGraph, openGraphHtml } = useGraphifyHealth();
  const [codeIndex, setCodeIndex] = useState<{
    ready: boolean | null;
    hybrid: boolean;
    chunkCount?: number;
    error?: string | null;
    ensuring?: boolean;
  }>({ ready: null, hybrid: false });
  const [mentionPaths, setMentionPaths] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionHits, setMentionHits] = useState<string[]>([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [codebasePreview, setCodebasePreview] = useState<
    { query: string; groups: ReturnType<typeof groupCodebaseHits> } | null
  >(null);
  const mentionRangeRef = useRef<{ start: number; end: number } | null>(null);
  const codebaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priorityKey = mentionPriorityPaths.join("\0");
  const ws = useWorkbenchWorkspaceOptional();
  const codebaseSelected = useSyncExternalStore(
    subscribeCodebaseInject,
    getCodebaseInjectPaths,
    getCodebaseInjectPaths,
  );
  const interactionMode = useSyncExternalStore(
    subscribeWorkbenchInteractionMode,
    getWorkbenchInteractionMode,
    getWorkbenchInteractionMode,
  );
  const showAskPlanHint =
    interactionMode === "ask" && isPlanDocumentRequest(input.trim());
  const liveExec = useSyncExternalStore(
    subscribeLiveExecChannel,
    getLiveExecChannelState,
    getLiveExecChannelState,
  );

  /** hydrating 时可点发送：排队，桥就绪后自动发出；offline 仍禁用 */
  const sendBlockedOffline = bridgePhase === "offline" || (bridgePhase === "ready" && !hasDesktopApi);
  const sendConnecting = bridgePhase === "hydrating";
  const sendEnabled = canSend && !sendBlockedOffline;

  const trySend = useCallback(() => {
    if (!canSend || workflowBusy) return;
    if (sendBlockedOffline) return;
    if (!hasDesktopApi || bridgePhase === "hydrating") {
      pendingSendRef.current = true;
      return;
    }
    pendingSendRef.current = false;
    onSend();
  }, [canSend, workflowBusy, sendBlockedOffline, hasDesktopApi, bridgePhase, onSend]);

  useEffect(() => {
    if (!pendingSendRef.current) return;
    if (bridgePhase !== "ready" || !hasDesktopApi || !canSend || workflowBusy) return;
    pendingSendRef.current = false;
    onSend();
  }, [bridgePhase, hasDesktopApi, canSend, workflowBusy, onSend]);

  const refreshMentionPaths = () => {
    if (!hasDesktopApi) return;
    void loadComposerMentionPaths(getDesktop(), mentionPriorityPaths).then(setMentionPaths);
  };

  useEffect(() => {
    refreshMentionPaths();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- priorityKey 已概括数组
  }, [hasDesktopApi, priorityKey]);

  const refreshCodeIndex = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceCodeIndexStatus) {
      setCodeIndex({ ready: false, hybrid: false, error: "索引接口不可用" });
      return;
    }
    try {
      const st = await api.workspaceCodeIndexStatus();
      setCodeIndex({
        ready: Boolean(st?.ready),
        hybrid: Boolean(st?.hybrid),
        chunkCount: st?.chunkCount,
        error: st?.error || null,
        ensuring: false,
      });
    } catch (e) {
      setCodeIndex({
        ready: false,
        hybrid: false,
        error: e instanceof Error ? e.message : String(e),
        ensuring: false,
      });
    }
  }, []);

  useEffect(() => {
    if (!hasDesktopApi) return;
    void refreshCodeIndex();
  }, [hasDesktopApi, refreshCodeIndex]);

  const ensureCodeIndex = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceCodeIndexEnsureHybrid) {
      setCodeIndex((c) => ({ ...c, error: "EnsureHybrid 不可用" }));
      return;
    }
    setCodeIndex((c) => ({ ...c, ensuring: true, error: null }));
    try {
      const r = await api.workspaceCodeIndexEnsureHybrid({});
      if (!r?.ok) {
        setCodeIndex((c) => ({
          ...c,
          ensuring: false,
          error: r?.error || "索引构建失败",
        }));
        await refreshCodeIndex();
        return;
      }
      setCodeIndex({
        ready: true,
        hybrid: Boolean(r.hybrid),
        chunkCount: r.chunkCount,
        ensuring: false,
        error: null,
      });
    } catch (e) {
      setCodeIndex((c) => ({
        ...c,
        ensuring: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [refreshCodeIndex]);

  const scheduleCodebasePreview = (query: string) => {
    if (codebaseTimerRef.current) clearTimeout(codebaseTimerRef.current);
    const q = query.trim();
    if (!q || !hasDesktopApi) {
      setCodebasePreview(null);
      return;
    }
    setCodebaseInjectQuery(q);
    codebaseTimerRef.current = setTimeout(() => {
      const api = getDesktop();
      if (!api?.workspaceRipgrep && !api?.workspaceCodeIndexSearch) return;
      void Promise.all([
        api.workspaceRipgrep
          ? api.workspaceRipgrep({ query: q, maxResults: 24 })
          : Promise.resolve(null),
        api.workspaceCodeIndexSearch
          ? api.workspaceCodeIndexSearch({ query: q, maxResults: 12 })
          : Promise.resolve(null),
      ]).then(([rg, sem]) => {
        const merged = new Map<string, CodebaseHit>();
        for (const h of (sem?.hits || []) as CodebaseHit[]) {
          const key = `${h.relPath}:${h.line}`;
          if (!merged.has(key)) merged.set(key, h);
        }
        for (const h of (rg?.hits || []) as CodebaseHit[]) {
          const key = `${h.relPath}:${h.line}`;
          if (!merged.has(key)) merged.set(key, h);
        }
        setCodebasePreview({
          query: q,
          groups: groupCodebaseHits([...merged.values()]),
        });
      });
    }, 280);
  };

  const updateMentionFromInput = (value: string, cursor: number) => {
    const at = detectAtMentionAtCursor(value, cursor);
    if (!at || !mentionPaths.length) {
      setMentionOpen(false);
      mentionRangeRef.current = null;
      setCodebasePreview(null);
      return;
    }
    const hits = matchAtMentionQuery(mentionPaths, at.query);
    setMentionHits(hits);
    setMentionIdx(0);
    setMentionOpen(hits.length > 0);
    mentionRangeRef.current = { start: at.start, end: cursor };
    const m = at.query.match(/^codebase:?([\s\S]*)$/i);
    if (m) scheduleCodebasePreview(m[1] || "");
    else setCodebasePreview(null);
  };

  const insertMention = (path: string) => {
    const range = mentionRangeRef.current;
    if (!range) return;
    // codebase：插入 @codebase: 并把光标留在冒号后，便于继续敲关键词
    const isCodebaseBare = path === "codebase";
    const token = isCodebaseBare ? "codebase:" : path;
    const suffix = isCodebaseBare ? "" : " ";
    const next = `${input.slice(0, range.start)}@${token}${suffix}${input.slice(range.end)}`;
    onInputChange(next);
    setMentionOpen(false);
    mentionRangeRef.current = null;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = range.start + 1 + token.length + suffix.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && mentionHits.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionHits.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => (i - 1 + mentionHits.length) % mentionHits.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionHits[mentionIdx]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }
    // 编辑历史提问时 Esc = 终止退回/退出编辑（对齐 Cursor）
    if (e.key === "Escape" && editHistoryActive && onCancelEdit) {
      e.preventDefault();
      onCancelEdit();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!workflowBusy && canSend) trySend();
    }
  };

  const handleDragOver = (e: DragEvent) => {
    if (!onDropFiles || disabled || workflowBusy) return;
    if (!Array.from(e.dataTransfer.types).some((t) => t === "Files" || t === "application/x-moz-file")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    setDragOver(false);
    if (!onDropFiles || disabled || workflowBusy) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    const cursor = textareaRef.current?.selectionStart ?? input.length;
    onDropFiles(files, cursor);
  };

  const visionUnsupported = useMemo(() => {
    if (!pendingImages.length) return false;
    const v = modelValue || modelFallback || "";
    if (!v || v.toLowerCase() === "auto") return false;
    return !modelSupportsChatVision({ orchMode, modelId: v });
  }, [pendingImages.length, orchMode, modelValue, modelFallback]);

  const atMentionTokens = useMemo(() => extractAtMentionTokens(input), [input]);

  return (
    <div
      data-workbench-composer=""
      className={cn(
        "chat-composer-cursor relative overflow-hidden border bg-background transition-all",
        dragOver
          ? "border-primary/55 ring-2 ring-primary/12"
          : "border-border/70 focus-within:border-primary/40",
        editHistoryActive && "ring-1 ring-primary/20",
        inline && "chat-composer-cursor--inline",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽高亮蒙层 */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/5">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 px-6 py-3">
            <ArrowUp className="h-5 w-5 rotate-180 text-primary/60" />
            <span className="text-[12px] font-medium text-primary/70">拖放图片或文件到此处</span>
          </div>
        </div>
      )}

      {/* 模型不支持视觉时的提示 */}
      {visionUnsupported ? (
        <div className="flex items-start gap-1.5 border-b border-amber-400/20 bg-amber-500/6 px-3 py-1.5 text-[11.5px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>当前模型不支持图片。可切换支持视觉的模型（如 Claude Sonnet、Gemini），或移除图片后发送。</span>
        </div>
      ) : null}

      {showAskPlanHint ? (
        <div className="border-b border-border/40 px-3 py-0.5 text-[11px] text-muted-foreground/80">
          {COMPOSER_ASK_PLAN_HINT}
        </div>
      ) : null}

      {editHistoryActive ? (
        <div className="chat-composer-edit-banner flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-3 py-1.5 text-[11.5px] text-foreground">
          <span>{inline ? "编辑此提问 · 发送后将从此处重新对话" : "正在编辑历史消息 · 发送后将从此处重新对话"}</span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            title="终止退回并退出编辑 (Esc)"
            onClick={onCancelEdit}
          >
            <X className="h-3 w-3" />
            取消 (Esc)
          </button>
        </div>
      ) : null}

      <div className="chat-composer-body px-3 pt-2">
        {atMentionTokens.length > 0 ? (
          <div className="composer-at-pills" aria-label="上下文引用">
            {atMentionTokens.map((token) => (
              <span key={token} className="composer-at-pill" title={`@${token}`}>
                <span className="truncate">{atMentionPillLabel(token)}</span>
                <button
                  type="button"
                  aria-label={`移除 @${token}`}
                  onClick={() => onInputChange(removeAtMentionToken(input, token))}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {/* 图片缩略图 — 56×56，无文件名，X 在图片上方 */}
        {pendingImages.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pendingImages.map((img) => (
              <div
                key={img.id}
                className="group/img relative shrink-0 cursor-pointer overflow-hidden rounded-md border border-border/60 bg-muted/10 transition-shadow hover:shadow-sm"
                title={img.name || "图片"}
                onClick={() => setLightboxSrc(img.dataUrl)}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name || ""}
                  className="h-14 w-14 object-cover"
                />
                {/* 删除按钮 — 图片右上角半透明圆形 */}
                <button
                  type="button"
                  className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/45 text-white/90 opacity-0 shadow transition hover:bg-black/65 group-hover/img:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(img.id);
                  }}
                  aria-label="移除图片"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {/* 非图片文件 chip — 带 File 图标的 pill */}
        <ComposerFileAttachments files={pendingFiles} onRemove={onRemoveFile} className="mb-2" />

        <ComposerTerminalAttachments
          snippets={pendingTerminalSnippets}
          onRemove={onRemoveTerminalSnippet}
          className="!px-0 !pt-0 !pb-0 mb-2"
        />
        <ComposerDomAttachments
          elements={pendingDomElements}
          onRemove={onRemoveDomElement}
          className="!px-0 !pt-0 !pb-0 mb-2"
        />

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              onInputChange(v);
              updateMentionFromInput(v, e.target.selectionStart ?? v.length);
            }}
            onClick={(e) => {
              const t = e.currentTarget;
              updateMentionFromInput(t.value, t.selectionStart ?? t.value.length);
            }}
            onFocus={() => refreshMentionPaths()}
            onPaste={onPaste}
            onKeyDown={onComposerKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="scrollbar-thin box-border block w-full min-w-0 resize-none bg-transparent py-1 text-[13px] leading-[1.45] outline-none placeholder:text-muted-foreground disabled:opacity-60"
            style={{ minHeight: "24px", maxHeight: inline ? "160px" : "200px" }}
          />
          {mentionOpen && mentionHits.length > 0 && !codebasePreview?.query ? (
            <ul
              className="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-full max-w-md overflow-auto rounded-md border border-border/80 bg-popover py-1 text-[12px] shadow-md"
              role="listbox"
            >
              {mentionHits.map((p, i) => (
                <li key={p}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === mentionIdx}
                    className={cn(
                      "flex w-full px-2.5 py-1 text-left font-mono hover:bg-muted/60",
                      i === mentionIdx && "bg-muted/50",
                    )}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      insertMention(p);
                    }}
                  >
                    {formatAtMentionLabel(p)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {codebasePreview && codebasePreview.query ? (
            <div className="absolute bottom-full left-0 z-20 mb-1 max-h-56 w-full max-w-lg overflow-auto rounded-md border border-border/80 bg-popover px-2 py-1.5 text-[12px] shadow-md">
              <p className="mb-1 text-[12px] text-muted-foreground">
                @{`codebase:${codebasePreview.query}`} ·{" "}
                {codebasePreview.groups.length
                  ? `${codebasePreview.groups.length} 个文件`
                  : "无匹配"}
                {codebaseSelected.size
                  ? ` · 已选 ${codebaseSelected.size}（仅注入所选）`
                  : " · 勾选文件可限制注入"}
              </p>
              {codebasePreview.groups.slice(0, 8).map((g) => (
                <details key={g.relPath} className="mb-0.5" open={codebasePreview.groups.length <= 3}>
                  <summary className="flex cursor-pointer items-center gap-1.5 font-mono text-foreground/90">
                    <input
                      type="checkbox"
                      checked={codebaseSelected.has(g.relPath)}
                      onChange={() => toggleCodebaseInjectPath(g.relPath)}
                      onClick={(ev) => ev.stopPropagation()}
                      aria-label={`注入 ${g.relPath}`}
                    />
                    <span>
                      {g.relPath}
                      <span className="ml-1 text-muted-foreground">({g.lines.length})</span>
                    </span>
                  </summary>
                  <ul className="mt-0.5 space-y-0.5 pl-2 font-mono text-[11px] text-muted-foreground">
                    {g.lines.map((l) => (
                      <li key={`${g.relPath}:${l.line}`}>
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            setPendingLineGoto(g.relPath, l.line, 1);
                            void ws?.openFile?.(g.relPath);
                          }}
                        >
                          L{l.line}: {l.text.slice(0, 80)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="composer-cursor-footer flex min-w-0 items-center gap-0.5 px-1.5 pb-1.5 pt-0">
        <div className="composer-cursor-controls flex min-w-0 flex-1 items-center gap-0.5 overflow-visible">
          <button
            type="button"
            className="composer-chrome-chip inline-flex max-w-[10rem] shrink items-center gap-1 truncate"
            title={workspacePath?.trim() || "未选择工作区（点击选择）"}
            disabled={!hasDesktopApi || workflowBusy}
            onClick={() => onWorkspaceChipClick?.()}
            aria-label={
              workspaceBasename
                ? `当前工作区 ${workspaceBasename}`
                : "选择工作区"
            }
          >
            <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{workspaceBasename || "未选工作区"}</span>
          </button>
          {liveExec.channel !== "idle" && liveExec.label ? (
            <span
              className="composer-chrome-chip composer-chrome-chip--active inline-flex max-w-[10rem] shrink truncate"
              title={
                liveExec.terminalSessionId
                  ? `执行通道：${liveExec.label} → 终端 ${liveExec.terminalSessionId}`
                  : `执行通道：${liveExec.label}`
              }
            >
              {liveExec.label}
              {liveExec.terminalSessionId ? (
                <span className="ml-1 opacity-70">
                  ·{liveExec.terminalSessionId.replace(/^term-/, "").slice(-4)}
                </span>
              ) : null}
            </span>
          ) : null}
          <ComposerSessionChip
            agentBasename={localAgentBasename}
            onAgentChange={onAgentChange}
            selectedSkillStems={selectedSkillStems}
            onSelectedSkillStemsChange={onSelectedSkillStemsChange}
            disabled={!hasDesktopApi || workflowBusy}
          />
          <ChatModelSelector
            orchMode={orchMode}
            cloudModels={cloudModels}
            localModels={localModels}
            modelValue={modelValue}
            onModelPick={onModelPick}
            modelFallback={modelFallback}
            disabled={!hasDesktopApi || workflowBusy}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "composer-chrome-chip relative",
                  (graphHealth.needsUpdate ||
                    graphHealth.buildError ||
                    graphHealth.cli === false ||
                    codeIndex.ready === false) &&
                    "text-amber-700 dark:text-amber-300",
                )}
                title={
                  graphHealth.buildError
                    ? `扩展 · 图谱：${graphHealth.buildError}`
                    : graphHealth.needsUpdate
                      ? "扩展 · 结构索引陈旧，请更新图谱"
                      : graphHealth.cli === false
                        ? "扩展 · 未安装 graphify"
                        : codeIndex.ready === false
                          ? "扩展 · 语义索引未就绪"
                          : "扩展"
                }
                aria-label="扩展：MCP 与图谱"
                disabled={workflowBusy}
              >
                <MoreHorizontal className="h-3 w-3" />
                {graphHealth.needsUpdate ||
                graphHealth.buildError ||
                graphHealth.cli === false ||
                codeIndex.ready === false ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
                    aria-hidden
                  />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[min(100vw-2rem,18rem)] p-2">
              <DropdownMenuLabel className="px-1 text-[12px] font-medium text-muted-foreground">
                扩展
              </DropdownMenuLabel>
              <div className="flex flex-wrap items-center gap-1 px-0.5 py-1">
                <ComposerOrchHint orchMode={orchMode} />
                <GraphifyChip
                  graphJson={graphHealth.graphJson}
                  graphHtml={graphHealth.graphHtml}
                  needsUpdate={graphHealth.needsUpdate}
                  cli={graphHealth.cli}
                  building={graphHealth.building}
                  buildError={graphHealth.buildError}
                  onOpen={openGraphHtml}
                  onBuild={buildGraph}
                />
                <CodeIndexChip
                  ready={codeIndex.ready}
                  hybrid={codeIndex.hybrid}
                  chunkCount={codeIndex.chunkCount}
                  ensuring={codeIndex.ensuring}
                  error={codeIndex.error}
                  onEnsure={ensureCodeIndex}
                />
              </div>
              <DropdownMenuSeparator />
              {onParallelClick ? (
                <DropdownMenuItem
                  disabled={!hasDesktopApi || workflowBusy}
                  onSelect={() => onParallelClick()}
                >
                  <Split className="mr-2 h-3.5 w-3.5 opacity-70" aria-hidden />
                  多 Agent 并行
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link to="/chains" search={{ q: "" }}>
                  任务链
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/comms">MCP 连接</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {contextUsage ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="composer-context-usage-chip"
                  className={cn(
                    "composer-context-usage-btn gap-1",
                    usageRingFlash && "composer-context-usage-btn--flash",
                  )}
                  title={`${CHAT_CONTEXT_USAGE_TITLE(
                    contextUsage.percent,
                    contextUsage.suggestSummarize,
                    contextUsage.source,
                    contextUsage.windowKind,
                    contextUsage.windowSource,
                    channelKindFlash,
                    CONTEXT_USAGE_CHIP_MIN_PERCENT,
                  )} · 窗 ${Math.round(contextUsage.windowTokens / 1024)}k`}
                  aria-label={CHAT_CONTEXT_USAGE_TITLE(
                    contextUsage.percent,
                    contextUsage.suggestSummarize,
                    contextUsage.source,
                    contextUsage.windowKind,
                    contextUsage.windowSource,
                    channelKindFlash,
                    CONTEXT_USAGE_CHIP_MIN_PERCENT,
                  )}
                >
                  <ComposerContextUsageRing
                    percent={contextUsage.percent}
                    warn={contextUsage.suggestSummarize}
                    flash={usageRingFlash}
                    aria-hidden
                  />
                  {contextUsage.suggestSummarize || contextUsage.percent >= 50 ? (
                    <span className="composer-context-usage-pct tabular-nums">
                      {contextUsage.percent < CONTEXT_USAGE_CHIP_MIN_PERCENT
                        ? `<${CONTEXT_USAGE_CHIP_MIN_PERCENT}`
                        : contextUsage.percent}
                      %
                    </span>
                  ) : null}
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-[17.5rem] p-3">
                <ComposerContextUsageBreakdown
                  usage={contextUsage}
                  canStepLocalWindow={
                    orchMode === "local-mcp" &&
                    hasDesktopApi &&
                    !workflowBusy &&
                    !isAutoModelSelection(modelValue || modelFallback)
                  }
                  onStepLocalWindow={() => void cycleLocalWindowOverride()}
                />
              </PopoverContent>
            </Popover>
          ) : null}
          <button
            type="button"
            title="添加文件"
            disabled={!hasDesktopApi || workflowBusy}
            onClick={() => onPickFiles({ onlyImages: false })}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground disabled:opacity-40"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>

          {workflowBusy ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition hover:opacity-90"
              title="停止生成"
              aria-label="停止生成"
            >
              <Square className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
            </button>
          ) : (
            <button
              type="button"
              data-testid="composer-send"
              onClick={trySend}
              disabled={!sendEnabled}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-35",
                sendConnecting && canSend && "animate-pulse",
              )}
              title={sendConnecting ? COMPOSER_SEND_CONNECTING : "发送 (Enter)"}
              aria-label="发送"
              aria-busy={sendConnecting && canSend ? true : undefined}
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      <ImageLightbox
        src={lightboxSrc || ""}
        open={Boolean(lightboxSrc)}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
