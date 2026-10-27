import {
  useCallback,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getDesktop } from "@/lib/desktop-api";
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
import {
  assertMcpHealthForTurn,
  toastMcpHealthIfDegraded,
} from "@/lib/mcp-health-hint";
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
  resetLiveComposerTurnSignals,
  snapshotComposerTurnFooter,
} from "@/lib/workbench-composer-turn-footer";
import {
  cliPermissionModeForTurn,
  getWorkbenchInteractionMode,
} from "@/lib/workbench-interaction-mode";
import { toastWorkspaceWriteSuccess } from "@/lib/toast-workspace-write";
import {
  mergeAgentFilePatches,
  normalizeWritePatches,
  type AgentFilePatch,
} from "@/lib/agent-file-patch";
import { stashWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";
import {
  buildShortAgentSummary,
  extractStreamEventsFromContent,
  extractWrittenPathsFromAgentContent,
  isPlausibleWorkspaceRelPath,
  mergeStreamEvents,
  looksLikeAgentTurnReport,
  shapeAgentTurnDisplay,
  eventsHaveMcpTool,
  toolTraceToStreamEvents,
} from "@/lib/compress-agent-display";
import {
  collectPriorUserAttachments,
  mergeInlineAttachments,
  modelSupportsChatVision,
  visionRequiredError,
} from "@/lib/chat-image-attach";
import { type PriorTurn, type UserImageAttachment } from "@/lib/ollama-messages";
import {
  ingestWorkspaceWritesDetailed,
  parseWorkspaceWriteItemsFromBubble,
  stripLargeAssistantArtifacts,
  stripAllWorkspaceWritePayloads,
} from "@/lib/assistant-reply";
import { buildLineDiffPreview, parseChatFileEdits } from "@/lib/parse-chat-file-edits";
import { sanitizeReadonlyAssistantContent } from "@/lib/readonly-turn-display";
import { autoSaveChainFromReply, notifyAutoSavedChain } from "@/lib/auto-save-chain-from-reply";
import { parseWbsChainIntent, WBS_GENERATE_PM_PROMPT, type WbsChainSyncResult } from "@/lib/wbs-chain-registry";
import { handleChainChatCommand } from "@/lib/run-chain-from-chat";
import { syncOfficialGenericChains } from "@/lib/sync-official-chains";
import { buildAgentChainCatalogMarkdown } from "@/lib/agent-chain-catalog";
import { parseChainCommand } from "@/lib/parse-chain-command";
import { resolveAgentForTurn } from "@/lib/resolve-agent-for-turn";
import { parseParallelIntent } from "@/lib/parse-parallel-intent";
import { type ParallelDispatchConfig } from "@/components/parallel-dispatch-dialog";
import { maybeToastMissingWorkspaceWrite } from "@/lib/maybe-toast-workspace-write";
import { restoreUserMsgToComposer } from "@/lib/restore-user-composer";
import { isBulkWriteProjectMessage } from "@/lib/confirm-write";
import {
  BROWSER_MODE_CHAT_MESSAGE,
  RPC_REQUEST_CANCELLED,
  RPC_REQUEST_INTERRUPTED,
} from "@/lib/ui-copy";
import {
  isRpcUserAbortError,
  normalizeRpcErrorMessage,
} from "@/lib/bridge-connection-error";
import {
  isProjectPreviewMessage,
  isStopPreviewMessage,
  performStopPreview,
} from "@/lib/project-preview";
import { isOpenTerminalMessage } from "@/lib/workspace-terminal-client";
import {
  enabledMcpNamesRequiringCliChannel,
  mcpCliGateFailureMessage,
} from "@/lib/mcp-cli-gate";
import {
  expandUserLineWithWorkspaceFiles,
  preReadInstructedWorkspaceFiles,
  buildDocsFileListHint,
  buildSlimProjectBrief,
} from "@/lib/expand-user-line-workspace-files";
import { resolveTurnPolicy } from "@/lib/turn-policy";
import { assertAgentWriteCloseLoop } from "@/lib/turn-write-close";
import { echoAgentRunsInWorkbenchTerminal } from "@/lib/workbench-terminal-run-bridge";
import { formatTurnAuditMessage } from "../../../shared/turn-audit.mjs";
import { buildAgentRoutedInstruction } from "@/lib/agent-skill-routing";
import { buildSubagentUserLine } from "@/lib/parse-agent-command";
import { isAutoAgentBasename } from "@/lib/agent-basename";
import { loadAgentContextAppendix } from "@/lib/agent-context-appendix";
import {
  inferModelRouteHint,
  isAutoModelSelection,
  isClaudeCliModel,
  resolveModelForExecution,
  CLOUD_PROVIDER_REQUIRED_ERROR,
  LOCAL_PROVIDER_REQUIRED_ERROR,
  LOCAL_MODEL_NOT_INSTALLED_ERROR,
  MODEL_NOT_IN_POOL_ERROR,
} from "@/lib/model-catalog";
import {
  getCachedContextLength,
  getCachedModelCapability,
  rememberModelCapability,
} from "@/lib/model-capability-cache";
import { resolvePriorBudget, slimPriorMessagesForApi } from "@/lib/slim-prior-messages";
import {
  isSummarizeSlashCommand,
  nextModelHistoryPatch,
  resolveModelPriorBase,
  summarizeSessionHistory,
} from "@/lib/session-summarize";
import {
  CHAT_CLI_CONTEXT_HINT,
  CHAT_SUMMARIZE_CLI_SESSION_RESET,
  CHAT_SUMMARIZE_TOO_SHORT,
} from "@/lib/ui-copy";
import { estimateContextUsage } from "@/lib/context-usage";
import { buildContextParts } from "@/lib/context-parts";
import { loadProjectRulesSnippet } from "@/lib/project-rules";
import { resolveTurnUsage } from "@/lib/turn-usage";
import {
  clearLiveExecChannel,
  setLiveExecChannel,
} from "@/lib/live-exec-channel";
import { type PendingFileEntry } from "@/components/composer-file-attachments";
import { type PendingTerminalSnippet } from "@/components/composer-terminal-attachments";
import { type PendingDomElement } from "@/lib/dom-element-meta";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";
import type { DesktopApi } from "@/types/desktop";
import {
  clearExplicitEmptyChatSessionIf,
  getChatSessionsCache,
  setChatSessionsCache,
} from "@/lib/chat-sessions-store";
import { workspaceSessionKey, stampSessionWorkspaceIfMissing } from "@/lib/chat-session-workspace";
import type { ChatStateValue } from "@/contexts/chat-state-context";
import {
  assistantBubbleName,
  buildComposerUserLine,
  buildPlainChatPrompt,
  diskToDisplay,
  formatAssistantFailure,
  newLocalId,
  priorTurnsToOrchestrationMessages,
  toastIfLocalOrchestrationHints,
  toastIngestWorkspaceHint,
  type ChatSession,
  type DiskMsg,
  type OrchMode,
} from "@/lib/chat-send-helpers";

export type UseChatSendArgs = {
  navigate: ReturnType<typeof useNavigate>;
  chatCtx: ChatStateValue;
  getCachedSettings: (api: DesktopApi) => Promise<Awaited<ReturnType<DesktopApi["getChatSettings"]>>>;
  resetScrollFollow: () => void;
  patchSession: (
    sessionId: string,
    patch: (session: ChatSession) => ChatSession,
    persistActiveId?: string,
  ) => Promise<ChatSession[]>;
  persist: (nextSessions: ChatSession[], nextActive: string) => Promise<void>;
  clearExplicitEmptyChatSessionIf: (sessionId: string) => void;
  pruneWorkspaceSessions: (keepId: string) => Promise<ChatSession[]>;
  appendLocalChatExchange: (
    sessionId: string,
    userLine: string,
    assistantLine: string,
  ) => Promise<void>;
  appendAgentExecEvent: (payload: {
    agent: string;
    mode: OrchMode;
    source: "chat_command" | "chain_step";
    phase?: "start" | "end";
    taskId?: string;
    instruction?: string;
    modelId?: string;
  }) => Promise<void>;
  runPmDelegationRuntime: () => Promise<void>;
  runOrchestrationChain: (opts?: import("@/lib/orchestration-chain-runner").ChainRunOptions) => Promise<void>;
  performBulkWriteProject: (text: string) => Promise<void>;
  runProjectPreview: (text: string) => Promise<void>;
  stemAgentMeta: (stem: string) => Pick<DiskMsg, "agentStem" | "agentLabel">;
  runWorkflowFromWbsRef: RefObject<
    ((opts?: {
      preferredPath?: string;
      quietPickToast?: boolean;
      wbsOnly?: boolean;
      autoRun?: boolean;
      recordUserLine?: string;
    }) => Promise<WbsChainSyncResult | null>) | null
  >;
  input: string;
  pendingImages: (UserImageAttachment & { id: string })[];
  pendingFiles: PendingFileEntry[];
  pendingTerminalSnippets: PendingTerminalSnippet[];
  pendingDomElements: PendingDomElement[];
  selectedSkillStems: string[];
  activeId: string;
  globalModel: string;
  localAgentBasename: string;
  orchMode: OrchMode;
  orchestratorModels: string[];
  localOllamaTags: string[];
  setInput: Dispatch<SetStateAction<string>>;
  setPendingImages: Dispatch<SetStateAction<(UserImageAttachment & { id: string })[]>>;
  setPendingFiles: Dispatch<SetStateAction<PendingFileEntry[]>>;
  setPendingTerminalSnippets: Dispatch<SetStateAction<PendingTerminalSnippet[]>>;
  setPendingDomElements: Dispatch<SetStateAction<PendingDomElement[]>>;
  setSelectedSkillStems: Dispatch<SetStateAction<string[]>>;
  setStopRequested: Dispatch<SetStateAction<boolean>>;
  setSessionSending: (sessionId: string, value: boolean) => void;
  setEditComposer: Dispatch<
    SetStateAction<{
      input: string;
      pendingImages: (UserImageAttachment & { id: string })[];
      pendingFiles: PendingFileEntry[];
      pendingTerminalSnippets: PendingTerminalSnippet[];
      pendingDomElements: PendingDomElement[];
    } | null>
  >;
  setEditHistoryIndex: Dispatch<SetStateAction<number | null>>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  setMessages: Dispatch<SetStateAction<import("@/lib/chat-send-helpers").Msg[]>>;
  setActiveStreamRequestId: Dispatch<SetStateAction<string | null>>;
  setTerminalOpen: Dispatch<SetStateAction<boolean>>;
  setParallelDialogPreset: Dispatch<SetStateAction<string[] | undefined>>;
  setParallelDialogDefaultTask: Dispatch<SetStateAction<string | undefined>>;
  setParallelDialogOpen: Dispatch<SetStateAction<boolean>>;
  sendPayloadOverrideRef: RefObject<{
    text: string;
    pendingImages: (UserImageAttachment & { id: string })[];
    pendingFiles: PendingFileEntry[];
    pendingTerminalSnippets: PendingTerminalSnippet[];
    pendingDomElements?: PendingDomElement[];
    /** 省略则保留完整历史 */
    editCutoff?: number;
  } | null>;
  editComposerRef: RefObject<{
    input: string;
    pendingImages: (UserImageAttachment & { id: string })[];
    pendingFiles: PendingFileEntry[];
    pendingTerminalSnippets: PendingTerminalSnippet[];
    pendingDomElements: PendingDomElement[];
  } | null>;
  editHistoryIndexRef: RefObject<number | null>;
  activeIdRef: RefObject<string>;
  sendingSessionsRef: RefObject<Record<string, boolean>>;
  workspacePathRef: RefObject<string | null>;
  /** 发送前与磁盘工作区对齐时刷新 Composer 芯片 */
  setWorkspacePath?: Dispatch<SetStateAction<string | null>>;
  activeByWorkspaceRef: RefObject<Record<string, string>>;
  sessionsRef: RefObject<ChatSession[]>;
  composerDraftsRef: RefObject<
    Record<
      string,
      {
        input: string;
        pendingImages: (UserImageAttachment & { id: string })[];
        pendingFiles: PendingFileEntry[];
        pendingTerminalSnippets: PendingTerminalSnippet[];
      }
    >
  >;
  streamContextRef: RefObject<{ sessionId: string; requestId: string } | null>;
  activeStreamRequestIdRef: RefObject<string | null>;
  chainRunningRef: RefObject<boolean>;
  chainDocsInjectedRef: RefObject<boolean>;
  expandInjectedPathsRef: RefObject<string[]>;
  configuredPoolsRef: RefObject<{ cloudModels: string[]; localModels: string[] }>;
  /** 停止链执行（与 stopChat 共用） */
  stopChainExecution: () => void;
};

export function useChatSend(args: UseChatSendArgs) {
  const argsRef = useRef(args);
  argsRef.current = args;
  /** 本轮用户点了停止：await 返回后勿再覆盖「生成已停止」气泡 */
  const userStoppedRef = useRef(false);

  const stopChat = useCallback(() => {
    const {
      setStopRequested,
      chainRunningRef,
      stopChainExecution,
      activeIdRef,
      chatCtx,
      setSessionSending,
      setMessages,
      activeStreamRequestIdRef,
      setActiveStreamRequestId,
    } = argsRef.current;
    userStoppedRef.current = true;
    setStopRequested(true);
    if (chainRunningRef.current) {
      stopChainExecution();
    }
    const sessionId = activeIdRef.current;
    const id = chatCtx.activeRequestIdsRef.current.get(sessionId);
    const api = getDesktop();
    // 与 Cursor 一致：先 abort 后端（含本地 Ollama destroy），再收 UI
    if (id && api?.claudeCodeAbort) void api.claudeCodeAbort(id);
    if (id && api?.localOrchestrationAbort) void api.localOrchestrationAbort(id);
    if (id && api?.hostAgentAbort) void api.hostAgentAbort(id);
    if (id && api?.cloudDirectAbort) void api.cloudDirectAbort(id);
    // 立刻去掉 Thinking / busy，避免「钮已恢复但模型还在跑」的错觉
    const markStopped = (msgs: any[]) => {
      if (!msgs.length) return msgs;
      const next = [...msgs];
      const last = next[next.length - 1];
      if (last?.role === "assistant" && last.content === "__WAITING__") {
        next[next.length - 1] = {
          ...last,
          content: "（生成已停止）",
          requestError: true,
        };
      }
      return next;
    };
    setMessages?.((prev) => {
      const next = markStopped(prev as any[]);
      chatCtx.syncMessages?.(next as any);
      if (sessionId) chatCtx.syncSessionMessages?.(sessionId, next as any);
      return next;
    });
    if (sessionId) {
      chatCtx.activeRequestIdsRef.current.delete(sessionId);
      setSessionSending?.(sessionId, false);
    }
    if (activeStreamRequestIdRef) activeStreamRequestIdRef.current = null;
    setActiveStreamRequestId?.(null);
    chatCtx.syncActiveStreamRequestId?.(null);
  }, []);

  const sendChat = useCallback(async function sendChat() {
    const {
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
    } = argsRef.current;

    const override = sendPayloadOverrideRef.current;
    if (override) sendPayloadOverrideRef.current = null;

    const editDraft = editComposerRef.current;
    const editingFromInline = !override && editHistoryIndexRef.current != null && editDraft != null;

    const text = (override?.text ?? (editingFromInline ? editDraft.input : input)).trim();
    const activePendingImages =
      override?.pendingImages ?? (editingFromInline ? editDraft.pendingImages : pendingImages);
    const activePendingFiles =
      override?.pendingFiles ?? (editingFromInline ? editDraft.pendingFiles : pendingFiles);
    const activePendingTerminal =
      override?.pendingTerminalSnippets ??
      (editingFromInline ? editDraft.pendingTerminalSnippets : pendingTerminalSnippets);
    const activePendingDom =
      override?.pendingDomElements ??
      (editingFromInline ? editDraft.pendingDomElements : pendingDomElements);
    const presetEditCutoff = override?.editCutoff;

    const hasTerminal = activePendingTerminal.length > 0;
    const hasDom = activePendingDom.length > 0;
    const hasFiles = activePendingFiles.length > 0;
    const sendSessionId = activeIdRef.current;
    if (
      (!text && !activePendingImages.length && !activePendingFiles.length && !hasTerminal && !hasDom) ||
      sendingSessionsRef.current[sendSessionId]
    )
      return;
    const wsKeySend = workspaceSessionKey(workspacePathRef.current);
    if (wsKeySend) {
      activeByWorkspaceRef.current = {
        ...activeByWorkspaceRef.current,
        [wsKeySend]: sendSessionId,
      };
    }
    setChatSessionsCache({
      sessions: sessionsRef.current,
      activeId: sendSessionId,
      activeByWorkspace: activeByWorkspaceRef.current,
      workspacePath: workspacePathRef.current,
      composerDrafts: composerDraftsRef.current,
      explicitEmptySessionId: getChatSessionsCache()?.explicitEmptySessionId ?? null,
      localAgentBasename: getChatSessionsCache()?.localAgentBasename,
    });
    const api = getDesktop();
    if (!api) {
      setMessages((m) => [...m, { role: "assistant", content: BROWSER_MODE_CHAT_MESSAGE }]);
      return;
    }
    // 发送前对齐读盘根与 UI：不一致则同步；无工作区则阻断
    try {
      const diskWs =
        typeof api.getWorkspace === "function" ? await api.getWorkspace() : null;
      const diskKey = workspaceSessionKey(diskWs);
      const uiKey = workspaceSessionKey(workspacePathRef.current);
      if (!diskKey) {
        toast.error("请先选择工作区", {
          description: "聊天读盘与写盘都依赖当前工作区根目录。",
        });
        return;
      }
      if (diskKey !== uiKey) {
        workspacePathRef.current = diskWs;
        setWorkspacePath?.(diskWs);
        // 静默对齐工作区根，不弹 toast（扩展菜单可看索引状态）
      }
      // 索引冷启动 / 陈旧：不阻断、不弹框；用户可在扩展菜单手动更新
    } catch {
      /* getWorkspace 失败时仍尝试发送，由后续 RPC 报错 */
    }
    const sess = sessionsRef.current.find((s) => s.id === sendSessionId);
    if (!sess) return;

    if (text === "/delegation-run") {
      setInput("");
      await runPmDelegationRuntime();
      return;
    }

    const wbsIntent = parseWbsChainIntent(text);
    if (wbsIntent.matched && activePendingImages.length === 0 && !hasTerminal && !hasFiles) {
      setInput("");
      if (wbsIntent.action === "generate-wbs") {
        sendPayloadOverrideRef.current = {
          text: WBS_GENERATE_PM_PROMPT,
          pendingImages: [],
          pendingFiles: [],
          pendingTerminalSnippets: [],
          editCutoff: 0,
        };
        await sendChat();
        return;
      }
      const syncResult = await runWorkflowFromWbsRef.current!({
        quietPickToast: true,
        autoRun: wbsIntent.autoRun,
        recordUserLine: text,
      });
      if (syncResult && !syncResult.ok) {
        // 未找到现有 WBS 时自动降级为生成流程，保留用户原文作为上下文
        sendPayloadOverrideRef.current = {
          text: `${text}\n\n${WBS_GENERATE_PM_PROMPT}`,
          pendingImages: [],
          pendingFiles: [],
          pendingTerminalSnippets: [],
          editCutoff: 0,
        };
        await sendChat();
        return;
      }
      return;
    }

    const parallelIntent = parseParallelIntent(text);
    if (parallelIntent.matched) {
      setInput("");
      if (
        parallelIntent.targetAgents.length >= 2 &&
        activePendingImages.length === 0 &&
        !hasTerminal &&
        !hasFiles
      ) {
        // 有明确的多 Agent 目标 → 直接弹对话框确认后执行
        setParallelDialogPreset(parallelIntent.targetAgents);
        setParallelDialogDefaultTask(parallelIntent.rawTask || undefined);
        setParallelDialogOpen(true);
      } else if (text.startsWith("/parallel")) {
        // 空 /parallel → 弹出选人对话框
        setParallelDialogPreset(undefined);
        setParallelDialogDefaultTask(undefined);
        setParallelDialogOpen(true);
      }
      // 自然语言但 Agent 不足 2 个 → 忽略并行意图，走正常对话
      return;
    }

    if (
      text &&
      activePendingImages.length === 0 &&
      !hasTerminal &&
      !hasFiles &&
      parseChainCommand(text).matched
    ) {
      setInput("");
      const route = resolveAgentForTurn(text, localAgentBasename);
      let chainTitle = sess.title;
      if (sess.history.length === 0) {
        const t = text.trim();
        chainTitle = t.length > 28 ? `${t.slice(0, 28)}…` : t;
      }
      const hist = [...sess.history, { role: "user" as const, content: text, ts: Date.now() }];
      const settings = await getCachedSettings(api);
      const modelLabel = sess.modelId?.trim() || settings.model || "模型";
      const nextSessions = sessionsRef.current.map((s) =>
        s.id === sendSessionId ? { ...s, title: chainTitle, history: hist } : s,
      );
      setSessions(nextSessions);
      sessionsRef.current = nextSessions;
      setMessages(diskToDisplay(hist, modelLabel));
      chatCtx.syncSessions(nextSessions);
      await persist(nextSessions, sendSessionId);
      clearExplicitEmptyChatSessionIf(sendSessionId);
      chatCtx.syncExplicitEmptySessionId(null);
      await pruneWorkspaceSessions(sendSessionId);
      const chainResult = await handleChainChatCommand(text, route.stem, (opts) =>
        runOrchestrationChain({ ...opts, pinnedSessionId: sendSessionId }),
      );
      if (!chainResult.handled) return;
      const histWithReply = [
        ...hist,
        {
          role: "assistant" as const,
          content: chainResult.assistantText,
          ts: Date.now(),
          name: "系统",
        },
      ];
      const finalSessions = sessionsRef.current.map((s) =>
        s.id === sendSessionId ? { ...s, history: histWithReply, title: chainTitle } : s,
      );
      setSessions(finalSessions);
      sessionsRef.current = finalSessions;
      setMessages(diskToDisplay(histWithReply, modelLabel));
      await persist(finalSessions, sendSessionId);
      return;
    }

    // 对齐 Cursor /summarize：界面保留全文；modelHistory 换成摘要+近尾
    if (
      text &&
      activePendingImages.length === 0 &&
      !hasTerminal &&
      !hasFiles &&
      isSummarizeSlashCommand(text)
    ) {
      setInput("");
      const settingsSum = await getCachedSettings(api);
      const modelLabel = sess.modelId?.trim() || settingsSum.model || "模型";
      const packed = summarizeSessionHistory(sess.history);
      if (!packed) {
        await appendLocalChatExchange(activeId, text.trim(), CHAT_SUMMARIZE_TOO_SHORT);
        return;
      }
      const hadCliSession = Boolean(sess.claudeSessionId);
      let notice = packed.notice;
      if (hadCliSession) {
        notice = `${notice}\n${CHAT_SUMMARIZE_CLI_SESSION_RESET}`;
      }
      const ts = Date.now();
      const displayHist: DiskMsg[] = [
        ...sess.history,
        { role: "user", content: text.trim(), ts },
        { role: "assistant", content: notice, name: "系统", ts },
      ];
      const modelHist: DiskMsg[] = packed.modelHistory.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: String(m.content || ""),
        ts: typeof m.ts === "number" ? m.ts : ts,
        ...(m.name ? { name: String(m.name) } : {}),
      }));
      const nextSessions = sessionsRef.current.map((s) =>
        s.id === sendSessionId
          ? {
              ...s,
              history: displayHist,
              modelHistory: modelHist,
              modelHistoryCoreLen: modelHist.length,
              ...(hadCliSession ? { claudeSessionId: null } : {}),
            }
          : s,
      );
      setSessions(nextSessions);
      sessionsRef.current = nextSessions;
      setMessages(diskToDisplay(displayHist, modelLabel));
      chatCtx.syncSessions(nextSessions);
      await persist(nextSessions, sendSessionId);
      clearExplicitEmptyChatSessionIf(sendSessionId);
      chatCtx.syncExplicitEmptySessionId(null);
      return;
    }

    if (
      text &&
      activePendingImages.length === 0 &&
      !hasTerminal &&
      !hasFiles &&
      isBulkWriteProjectMessage(text)
    ) {
      setInput("");
      await performBulkWriteProject(text);
      return;
    }

    if (
      text &&
      activePendingImages.length === 0 &&
      !hasTerminal &&
      !hasFiles &&
      isStopPreviewMessage(text)
    ) {
      setInput("");
      const api = getDesktop();
      if (api) {
        const summary = await performStopPreview(api);
        await appendLocalChatExchange(activeId, text, summary);
      }
      return;
    }

    if (
      text &&
      activePendingImages.length === 0 &&
      !hasTerminal &&
      !hasFiles &&
      isOpenTerminalMessage(text)
    ) {
      setInput("");
      setTerminalOpen(true);
      await appendLocalChatExchange(activeId, text, "已在底部打开终端面板，工作目录为当前项目根。");
      return;
    }

    if (
      text &&
      activePendingImages.length === 0 &&
      !hasTerminal &&
      !hasFiles &&
      isProjectPreviewMessage(text)
    ) {
      setInput("");
      await runProjectPreview(text);
      return;
    }

    const settings = await getCachedSettings(api);

    resetScrollFollow();

    let attachmentsToSave: UserImageAttachment[] | undefined =
      activePendingImages.length > 0
        ? activePendingImages.map(({ id: _id, ...rest }) => rest)
        : undefined;
    const baseText = text || (attachmentsToSave?.length ? "请结合附图回答。" : "");
    const filesWithContent = activePendingFiles.filter(
      (f) => typeof f.content === "string" && f.content.length > 0,
    );
    const filePrefix = filesWithContent.length
      ? filesWithContent
          .map(
            (f) =>
              `【附件: ${f.name}】\n\`\`\`\n${f.content}\n\`\`\``,
          )
          .join("\n\n") + "\n\n"
      : "";
    const displayLineRaw = buildComposerUserLine(
      filePrefix + baseText,
      activePendingTerminal,
      activePendingDom,
    );
    const atSkill = collectAtSkillStems(displayLineRaw);
    const displayLine = atSkill.text || displayLineRaw;
    const turnSkillStems = dedupeSkillStems([...selectedSkillStems, ...atSkill.stems]);

    const route = resolveAgentForTurn(displayLine, localAgentBasename);
    // 底栏「通用」/ auto / stem=__general__：普通聊天，禁止走 Agent 注入（工作区强制指令会导致模型用英文复述规范）
    const isGeneralTurn =
      route.stem === "__general__" ||
      route.stem === "general" ||
      (isAutoAgentBasename(localAgentBasename) && route.source !== "slash");
    const isAgentMode =
      !isGeneralTurn &&
      (route.source === "slash" || !isAutoAgentBasename(localAgentBasename));
    const ixModeForTurn = getWorkbenchInteractionMode();
    const turnPolicy = resolveTurnPolicy({
      displayLine,
      interactionMode: ixModeForTurn,
      isGeneralTurn,
      isNamedAgent: isAgentMode,
    });
    const readOnlyTurn = !turnPolicy.allowWrites;
    // cmd.stem 在非 Agent 模式下使用无害的标记值 "__auto__"，确保下游代码不报错
    const cmd = isAgentMode
      ? ({ matched: true as const, stem: route.stem, body: route.body } as const)
      : ({ matched: true as const, stem: "__auto__", body: displayLine } as const);
    const turnAgent = isAgentMode ? stemAgentMeta(route.stem) : { agentStem: "", agentLabel: "" };

    let localUserLineFinal = displayLine;
    let cloudUserLineFinal = displayLine;
    let chainCatalogSnippet = "";

    // 手选模型优先；Auto 时：改码偏云、问答偏本地
    const selectedRaw = sess.modelId || settings.model;
    const routeHint = inferModelRouteHint({
      allowWrites: turnPolicy.allowWrites,
      forceDirectChat: turnPolicy.forceDirectChat,
      allowTools: turnPolicy.allowTools,
      intent: turnPolicy.intent,
    });
    const resolvedExec = resolveModelForExecution({
      selectedModel: selectedRaw,
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
      allCloudModels: configuredPoolsRef.current.cloudModels,
      allLocalModels: configuredPoolsRef.current.localModels,
      // 手选时不传 agentModel，避免 frontmatter 覆盖用户指定
      preferredMode: orchMode,
      routeHint,
      preferredCloudModel: settings.preferredCloudModel,
      preferredLocalModel: settings.preferredLocalModel,
    });
    if (!resolvedExec) {
      const cloudEmpty =
        !(configuredPoolsRef.current.cloudModels?.length || orchestratorModels?.length);
      const localEmpty = !(configuredPoolsRef.current.localModels?.length || localOllamaTags?.length);
      const selectedPin =
        selectedRaw && !isAutoModelSelection(selectedRaw) ? String(selectedRaw).trim() : "";
      const inAnyPool =
        !!selectedPin &&
        (configuredPoolsRef.current.cloudModels?.includes(selectedPin) ||
          configuredPoolsRef.current.localModels?.includes(selectedPin) ||
          orchestratorModels?.includes(selectedPin) ||
          localOllamaTags?.includes(selectedPin));
      let errMsg =
        "请先在「设置 → 模型配置」通过「添加云模型」或「配置本地模型」添加至少一个模型。";
      if (selectedPin && !inAnyPool) {
        // 本地模式或非 Claude 系标签：优先提示「未安装到 Ollama」，避免误导成笼统池外
        const likelyLocal =
          orchMode === "local-mcp" || !/^(sonnet|opus|haiku|claude)/i.test(selectedPin);
        errMsg = likelyLocal ? LOCAL_MODEL_NOT_INSTALLED_ERROR : MODEL_NOT_IN_POOL_ERROR;
      } else if (routeHint === "prefer-cloud" && cloudEmpty) errMsg = CLOUD_PROVIDER_REQUIRED_ERROR;
      else if (routeHint === "prefer-local" && localEmpty) errMsg = LOCAL_PROVIDER_REQUIRED_ERROR;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: errMsg,
          name: "系统",
        },
      ]);
      return;
    }
    const mode: OrchMode = resolvedExec.mode;
    const modelId = resolvedExec.modelId;
    const userPinnedModel =
      Boolean(resolvedExec.userPinned) || !isAutoModelSelection(selectedRaw);

    // 写码工具环：发送前 assert tools（本地必查；云端有缓存 false 也拦）
    const needsToolsGate =
      turnPolicy.allowTools &&
      !turnPolicy.forceDirectChat &&
      (turnPolicy.allowWrites || mode === "local-mcp");
    if (needsToolsGate && typeof api.modelsCapabilities === "function") {
      const cached = getCachedModelCapability(modelId);
      if (cached?.tools === false) {
        toast.error("当前模型不支持工具调用", {
          description: `${modelId}：请换支持 tools 的模型，或改用 Ask 纯问答。`,
          duration: 8_000,
        });
        return;
      }
      if (mode === "local-mcp" || cached?.tools !== true) {
        try {
          const gate = await api.modelsCapabilities({
            action: "assert",
            modelId,
            pool: mode === "local-mcp" ? "local" : "cloud",
            needsTools: true,
          });
          if (gate?.record) {
            rememberModelCapability(modelId, {
              ...(gate.record.capabilities || {}),
              contextLength: gate.record.contextLength ?? undefined,
            });
          }
          if (!gate?.ok) {
            toast.error(gate?.error || "模型未通过 tools 能力检测", {
              duration: 8_000,
            });
            return;
          }
        } catch (e) {
          if (mode === "local-mcp") {
            toast.error(e instanceof Error ? e.message : "模型能力探测失败", {
              duration: 8_000,
            });
            return;
          }
        }
      }
    }

    const editCutoff =
      presetEditCutoff !== undefined
        ? presetEditCutoff
        : editingFromInline
          ? editHistoryIndexRef.current
          : null;
    // 界面 history 始终保留全文；prior 在有 modelHistory 时用压缩基线
    const displayHistoryBefore =
      editCutoff != null ? sess.history.slice(0, editCutoff) : sess.history;
    const clearModelHistory = editCutoff != null;
    const priorBase = resolveModelPriorBase(sess, editCutoff);
    const priorBudget = resolvePriorBudget({
      forceDirectChat: turnPolicy.forceDirectChat,
      allowTools: turnPolicy.allowTools,
      contextLevel: turnPolicy.contextLevel,
    });
    const priorForApi: PriorTurn[] = slimPriorMessagesForApi(
      priorBase
        .filter((m) => {
          // Auto 模式：过滤掉携带 Agent 标签的旧助手回复（避免跨模式污染）
          if (isAgentMode) return true;
          return m.role === "user" || !m.agentStem;
        })
        .map((m) => {
          if (m.role === "user") {
            const t: PriorTurn = { role: "user", content: m.content };
            // Ask/直聊不带历史附图，避免视觉/base64 把输入 token 打爆
            if (m.attachments?.length && !turnPolicy.forceDirectChat) {
              t.attachments = m.attachments;
            }
            return t;
          }
          return { role: "assistant" as const, content: m.content };
        })
        // __general__ 模式：滤除含 workspace-write fence 的旧助手回复，防止历史污染驱动重复写盘
        .filter((m): m is PriorTurn => {
          if (route.stem !== "__general__" || m.role === "user") return true;
          return !/```workspace-write\b[\s\S]*?```/i.test(m.content);
        }),
      priorBudget,
    );

    let visionEnrichedNote: string | undefined;
    if (
      (attachmentsToSave?.length ||
        (!sess?.claudeSessionId && collectPriorUserAttachments(priorForApi).length)) &&
      !modelSupportsChatVision({ orchMode: mode, modelId })
    ) {
      if (api.enrichChatUserLineForImages) {
        try {
          const enriched = await api.enrichChatUserLineForImages({
            userLine: displayLine,
            userAttachments: attachmentsToSave || [],
            orchestratorModel: modelId,
          });
          attachmentsToSave = undefined;
          // 提取 enrichment 追加的描述段（后端已 append 到 userLine 末尾）
          if (enriched.userLine && enriched.userLine !== displayLine) {
            const idx = enriched.userLine.indexOf("\n\n【系统·附图");
            if (idx >= 0) visionEnrichedNote = enriched.userLine.slice(idx);
            else visionEnrichedNote = enriched.userLine.slice(displayLine.length);
          }
        } catch (e) {
          toast.error(visionRequiredError(modelId), { duration: 8000 });
          return;
        }
      } else {
        toast.error(visionRequiredError(modelId), { duration: 8000 });
        return;
      }
    }

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
        { role: "assistant", content: "Claude Code 接口不可用，请重启应用后重试。", name: "系统" },
      ]);
      return;
    }

    const selSnap = getEditorSelectionSnapshot();
    const expandSpecialMentions = async (line: string) => {
      if (!api) return line;
      const { getProblemsSnapshot } = await import("@/lib/problems-snapshot");
      const { getCodebaseInjectPaths } = await import("@/lib/codebase-inject-selection");
      const { getActiveEditorRelPath } = await import("@/lib/active-editor-path");
      const { getWorkbenchInteractionMode } = await import("@/lib/workbench-interaction-mode");
      const { formatProblemsForPrompt } = await import("@/lib/format-problems-for-prompt");
      const { getOpenEditorRelPaths } = await import("@/lib/active-editor-path");
      const problems = getProblemsSnapshot();
      const activePath = getActiveEditorRelPath();
      const openPaths = getOpenEditorRelPaths();
      const preferPaths = [activePath, selSnap?.relPath, ...openPaths].filter(
        Boolean,
      ) as string[];
      const injectPaths = [...getCodebaseInjectPaths()];
      let next = line;
      const ixMode = getWorkbenchInteractionMode();
      // Agent/Ask/Plan：注入 Problems + 打开文件（上下文）
      if (
        (ixMode === "ask" || ixMode === "agent" || ixMode === "plan") &&
        problems.length &&
        !/@problems\b/i.test(next)
      ) {
        const auto = formatProblemsForPrompt(problems, {
          preferPaths,
          maxLines: 12,
        });
        if (auto) next = `${next}\n\n${auto}`;
      }
      if (
        (ixMode === "ask" || ixMode === "agent" || ixMode === "plan") &&
        openPaths.length &&
        !/【打开文件】/.test(next)
      ) {
        next = `${next}\n\n【打开文件】${openPaths.slice(0, 8).join(", ")}`;
      }
      if (!/@[a-zA-Z]/.test(next)) return next;
      try {
        return await expandAtMentionsInUserLine(next, api, {
          selectionText: selSnap?.text,
          selectionPath: selSnap?.relPath,
          selectionRange: selSnap
            ? `${selSnap.fromLine}-${selSnap.toLine}`
            : null,
          problems,
          preferPaths,
          codebaseOnlyPaths: injectPaths,
        });
      } catch {
        return next;
      }
    };

    // 非 Agent：普通聊天。仅展开显式 @文件；勿注入「工作区强制指令 / git 快照」整包
    if (!isAgentMode) {
      if (visionEnrichedNote) {
        localUserLineFinal += `\n${visionEnrichedNote}`;
        cloudUserLineFinal = localUserLineFinal;
      }
      localUserLineFinal = await expandSpecialMentions(localUserLineFinal);
      cloudUserLineFinal = localUserLineFinal;
      if (api && /@[a-zA-Z0-9_.\-/]+\.\w+/.test(localUserLineFinal)) {
        try {
          const { expanded } = await expandUserLineWithWorkspaceFiles(api, localUserLineFinal, {
            settings,
            cmd,
            displayLine,
            chainRunning: false,
          });
          localUserLineFinal = expanded;
          cloudUserLineFinal = expanded;
        } catch {
          /* ignore */
        }
      } else if (api && turnPolicy.contextLevel === "slim-product") {
        // 问项目做什么：只附产品事实轻量摘录，不附 Agent 强制指令包
        try {
          const brief = await buildSlimProjectBrief(api);
          if (brief) {
            localUserLineFinal = `${localUserLineFinal}${brief}`;
            cloudUserLineFinal = localUserLineFinal;
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (isAgentMode) {
      if (api.readClaudeAgentMarkdown) {
        try {
          await api.readClaudeAgentMarkdown(`${route.stem}.md`);
        } catch {
          /* ignore */
        }
      }

      // 只读/项目问句：优先 slim 产品摘录，避免 chain-steps / 重附录冒充产品事实
      if (turnPolicy.contextLevel === "slim-product" && !turnPolicy.allowWrites) {
        let slimLine = await expandSpecialMentions(route.body || displayLine);
        try {
          const brief = await buildSlimProjectBrief(api);
          if (brief) slimLine = `${slimLine}${brief}`;
        } catch {
          /* ignore */
        }
        if (visionEnrichedNote) slimLine = `${slimLine}\n${visionEnrichedNote}`;
        localUserLineFinal = slimLine;
        cloudUserLineFinal = slimLine;
      } else {
        const baseForExpand = await expandSpecialMentions(route.body);
        const { expanded: expandedBase, injectedPaths: expandInjectedPaths } =
          await expandUserLineWithWorkspaceFiles(api, baseForExpand, {
            settings,
            cmd,
            displayLine,
            chainRunning: chainRunningRef.current,
          });
        expandInjectedPathsRef.current = expandInjectedPaths || [];
        const routedBase = buildAgentRoutedInstruction(route.stem, expandedBase, mode, {
          mcpChatToolName: settings.mcpChatToolName || undefined,
          mcpListModelsToolName: settings.mcpListModelsToolName || undefined,
        });
        await syncOfficialGenericChains();
        const chainListR = await api.orchestrationListChains?.();
        chainCatalogSnippet = buildAgentChainCatalogMarkdown(
          route.stem,
          chainListR?.ok ? (chainListR.items ?? []) : [],
          [],
        );
        // 链模式：追加真实 docs/ 文件清单（每链第一轮注入一次，避免后续追问重复注入）
        if (chainRunningRef.current && !chainDocsInjectedRef.current) {
          const docsHint = await buildDocsFileListHint(api);
          if (docsHint) {
            chainCatalogSnippet += docsHint;
            chainDocsInjectedRef.current = true;
          }
        }
        localUserLineFinal = visionEnrichedNote
          ? `${chainCatalogSnippet ? `${routedBase}\n\n${chainCatalogSnippet}` : routedBase}\n${visionEnrichedNote}`
          : chainCatalogSnippet
            ? `${routedBase}\n\n${chainCatalogSnippet}`
            : routedBase;
        cloudUserLineFinal = buildSubagentUserLine(route.stem, localUserLineFinal);
      }
    }

    // 续跑：注入上轮 Agent 写盘/验证元数据（逻辑上下文，非占位）
    if (getWorkbenchInteractionMode() === "agent") {
      const turnAppendix = formatAgentTurnMetaAppendix(lastAgentTurnMeta(displayHistoryBefore));
      if (turnAppendix) {
        localUserLineFinal = `${localUserLineFinal}\n\n${turnAppendix}`;
        cloudUserLineFinal = `${cloudUserLineFinal}\n\n${turnAppendix}`;
      }
    }

    // P1：仅选用 Skill 时注入；未选用则跳过（零行为变化）
    let skillSnippet = "";
    if (turnSkillStems.length) {
      skillSnippet = await loadComposerSkillSnippet(api, turnSkillStems);
      if (skillSnippet) {
        // local-mcp / Host 走 userLine；CLI 另经 buildClaudeCodePrompt.skillSnippet
        localUserLineFinal = prependSkillSnippet(localUserLineFinal, skillSnippet);
      }
    }

    // MCP：部分降级 toast；本轮需 MCP 且全挂 → 硬失败（禁静默 Host）
    void toastMcpHealthIfDegraded(api);
    {
      const needsMcp =
        turnPolicy.allowTools &&
        !turnPolicy.forceDirectChat &&
        (turnPolicy.allowWrites || mode === "local-mcp");
      const mcpGate = await assertMcpHealthForTurn(api, { needsMcp });
      if (!mcpGate.ok) {
        toast.error(mcpGate.error, { duration: 10_000 });
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: mcpGate.error,
            name: "系统",
            requestError: true,
          },
        ]);
        return;
      }
    }

    // 偏好/规则 + 跨 Agent 记忆：勿拼进 userLine（会污染意图检测，导致「你好」误走工具环）
    // 仅 agent-full（可写具名 Agent）注入；只读/slim 不问改不灌跨仓记忆
    const contextAppendix =
      turnPolicy.contextLevel === "agent-full"
        ? await loadAgentContextAppendix(api, {
            workspacePath: workspacePathRef.current,
          })
        : "";

    userStoppedRef.current = false;
    setStopRequested(false);
    setSessionSending(sendSessionId, true);
    if (editingFromInline) {
      setEditComposer(null);
    }
    const terminalSnippetsToSave = activePendingTerminal.map(({ id: _id, ...rest }) => rest);
    if (editCutoff != null) {
      setEditHistoryIndex(null);
      editHistoryIndexRef.current = null;
      setEditComposer(null);
    }
    delete composerDraftsRef.current[sendSessionId];
    const userMsg: DiskMsg = {
      role: "user",
      content: displayLine,
      ts: Date.now(),
      ...(attachmentsToSave ? { attachments: attachmentsToSave } : {}),
      ...(terminalSnippetsToSave.length ? { terminalSnippets: terminalSnippetsToSave } : {}),
    };
    let title = sess.title;
    if (displayHistoryBefore.length === 0) {
      const t = displayLine || "图片";
      title = t.length > 28 ? `${t.slice(0, 28)}…` : t;
      // 立即更新 React 会话状态，让页签立刻显示新标题
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === sendSessionId ? { ...s, title } : s));
        sessionsRef.current = next;
        return next;
      });
      chatCtx.syncSessions(sessionsRef.current);
      // 异步调用 AI 生成更智能的标题
      const _api = getDesktop();
      if (_api?.claudeCodePrompt) {
        const _sid = sendSessionId;
        const _model = modelId;
        const _userLine = displayLine;
        _api
          .claudeCodePrompt({
            prompt: `为这个编程对话生成一个简洁的标题（3-8个字）。标题要准确反映用户的请求意图。
要求：
- 使用中文
- 只返回标题本身，不要任何额外内容、引号或标点

用户的第一条消息：${_userLine.trim().slice(0, 500)}`,
            model: _model,
            timeoutMs: 15000,
          })
          .then((r) => {
            if (r.ok && r.content?.trim()) {
              let nt = r.content
                .trim()
                .replace(/^["'「」『』\s]|["'「」『』\s]$/g, "")
                .slice(0, 40);
              if (nt) {
                void patchSession(_sid, (s) => ({ ...s, title: nt }));
              }
            }
          })
          .catch(() => {
            /* 保留临时标题 */
          });
      }
    }
    let hist: DiskMsg[] = [...displayHistoryBefore, userMsg];
    const displayBeforeLen = displayHistoryBefore.length;
    const wsKey = workspaceSessionKey(workspacePathRef.current) || null;
    await patchSession(sendSessionId, (s) =>
      stampSessionWorkspaceIfMissing(
        {
          ...s,
          title,
          history: hist,
          ...nextModelHistoryPatch(
            s.modelHistory,
            s.modelHistoryCoreLen,
            displayBeforeLen,
            hist,
            { clear: clearModelHistory },
          ),
        },
        workspacePathRef.current,
      ),
    );
    clearExplicitEmptyChatSessionIf(sendSessionId);
    chatCtx.syncExplicitEmptySessionId(null);
    if (displayHistoryBefore.length === 0) {
      await pruneWorkspaceSessions(sendSessionId);
    }
    if (!editingFromInline) {
      setInput("");
      setPendingImages([]);
      setPendingFiles([]);
      setPendingTerminalSnippets([]);
      setPendingDomElements([]);
      setSelectedSkillStems([]);
    }
    if (sendSessionId === activeIdRef.current) {
      const waitingMsgs: any[] = [
        ...diskToDisplay(hist, modelId),
        {
          role: "assistant",
          name: assistantBubbleName(turnAgent, modelId),
          content: "__WAITING__",
          // 流式阶段也标只读，避免 delta 正文被解析成 Edit 卡 / 「本地MCP」
          ...(readOnlyTurn
            ? {
                suppressFileEdits: true,
                ...(turnPolicy.forceDirectChat || !turnPolicy.allowTools
                  ? { localChannel: "direct" as const }
                  : { localChannel: "orch" as const }),
              }
            : {}),
        },
      ];
      setMessages(waitingMsgs);
      chatCtx.syncMessages(waitingMsgs as any);
      chatCtx.syncSessionMessages(sendSessionId, waitingMsgs as any);
      queueMicrotask(() => resetScrollFollow());
    }

    const reqId = newLocalId();
    chatCtx.activeRequestIdsRef.current.set(sendSessionId, reqId);
    streamContextRef.current = { sessionId: sendSessionId, requestId: reqId };
    activeStreamRequestIdRef.current = reqId;
    setActiveStreamRequestId(reqId);
    chatCtx.syncActiveStreamRequestId(reqId);

    try {
      const sendStarted = Date.now();
      let res: {
        ok: boolean;
        content?: string;
        error?: string | null;
        aborted?: boolean;
        claudeSessionId?: string;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        toolWrittenPaths?: string[];
        filePatches?: AgentFilePatch[];
        deferredWritePaths?: string[];
        writeMode?: "ask" | "plan" | "agent";
        writtenPaths?: string[];
        toolsTrace?: { offered: string[]; called: number };
      } = { ok: false, content: "", error: "未执行" };
      /** Host / 本地工具直写路径（无 workspace-write 围栏亦可闭环） */
      let hostWrittenPaths: string[] = [];
      let turnFilePatches: AgentFilePatch[] = [];
      let hostVerified: boolean | undefined;
      let hostToolTrace: Array<{
        tool: string;
        detail?: string;
        path?: string;
        args?: Record<string, unknown>;
        ok?: boolean;
        output?: string;
        exitCode?: number;
      }> = [];
      /** Agent 本轮执行后端：cli | host | local（气泡标注） */
      let agentExecBackend: "cli" | "host" | "local" | null = null;
      const basenameOverride = `${cmd.stem}.md`;
      /** P1-B：已启用非内置 MCP 时，禁止 CLI/本地编排失败后静默 Host（Host 无 MCP） */
      let mcpNamesRequiringCli: string[] = [];
      if (typeof api.readClaudeConfigJson === "function") {
        try {
          const mcpRead = await api.readClaudeConfigJson("mcp.json");
          const ms =
            mcpRead?.ok && mcpRead.data && typeof mcpRead.data === "object"
              ? (mcpRead.data as { mcpServers?: Record<string, unknown> }).mcpServers
              : undefined;
          mcpNamesRequiringCli = enabledMcpNamesRequiringCliChannel(ms);
        } catch {
          mcpNamesRequiringCli = [];
        }
      }
      const blockHostWhenMcpEnabled = mcpNamesRequiringCli.length > 0;
      if (isAgentMode) {
        await appendAgentExecEvent({
          agent: cmd.stem,
          mode,
          source: "chat_command",
          phase: "start",
          instruction: route.body || displayLine,
          modelId,
        });
      }

      if (turnPolicy.forceDirectChat || !turnPolicy.allowTools) {
        setLiveExecChannel("direct");
      }

      if (mode === "local-mcp") {
        setLiveExecChannel("local");
        // 本地池：只走 Ollama 编排/直连 chat；失败明确报错，禁止静默改 Host（Host 会注入编码 Agent 人格）
        let localOrchError: string | null = null;
        if (typeof api.localOrchestrationPrompt === "function") {
          try {
            res = await api.localOrchestrationPrompt({
              priorMessages: priorTurnsToOrchestrationMessages(priorForApi),
              userLine: localUserLineFinal,
              /** 语言/意图只用用户原文，避免摘录里的 .md/docs 污染检测与 tools 误判 */
              languageSourceLine: displayLine,
              userAttachments: attachmentsToSave,
              orchestratorModel: modelId,
              requestId: reqId,
              // 通用对话必须显式 __general__，禁止回落 settings.localAgentBasename 注入 Agent 人格
              agentBasenameOverride: isAgentMode ? basenameOverride : "__general__",
              interactionMode: turnPolicy.interactionMode,
              allowWrites: turnPolicy.allowWrites,
              autoApplyWrites: turnPolicy.autoApplyWrites,
              ...(readOnlyTurn ? { readOnlyTurn: true } : {}),
              ...(turnPolicy.forceDirectChat ? { forceDirectChat: true } : {}),
              ...(turnPolicy.systemConstraint
                ? { systemConstraint: turnPolicy.systemConstraint }
                : {}),
              ...(contextAppendix && isAgentMode && turnPolicy.contextLevel === "agent-full"
                ? { contextAppendix }
                : {}),
            });
            if (res?.ok) {
              agentExecBackend = "local";
              const fromTools = Array.isArray(res.toolWrittenPaths)
                ? res.toolWrittenPaths
                    .map((p) => String(p || "").trim().replace(/\\/g, "/"))
                    .filter(Boolean)
                : [];
              if (fromTools.length) {
                hostWrittenPaths = [...new Set([...hostWrittenPaths, ...fromTools])];
              }
              const fromPatches = normalizeWritePatches(res.filePatches);
              if (fromPatches.length) {
                for (const p of fromPatches) {
                  if (p.before !== undefined) {
                    stashWorkspaceWriteCheckpoint(p.path, p.before);
                  }
                }
                turnFilePatches = mergeAgentFilePatches(turnFilePatches, fromPatches);
              }
            } else {
              localOrchError = String(res?.error || "本地模型调用失败");
              res = {
                ok: false,
                content: "",
                error: localOrchError,
                aborted: Boolean(res?.aborted),
              };
            }
          } catch (e) {
            localOrchError = e instanceof Error ? e.message : "本地模型调用异常";
            res = { ok: false, content: "", error: localOrchError };
          }
        } else {
          localOrchError = "localOrchestrationPrompt 不可用（请重启应用以加载桌面 API）";
          res = { ok: false, content: "", error: localOrchError };
        }
        if (!res?.ok && blockHostWhenMcpEnabled) {
          res = {
            ok: false,
            content: "",
            error: mcpCliGateFailureMessage(localOrchError, mcpNamesRequiringCli),
          };
        }
      } else {
        const workspaceDir = await api.getWorkspace();
        const claudeSessionResume = Boolean(sess?.claudeSessionId);
        if (claudeSessionResume) {
          const cliUsage = estimateContextUsage(
            sess.modelHistory?.length ? sess.modelHistory : sess.history,
            {
              contextLength: getCachedContextLength(modelId),
              isLocal: false,
            },
          );
          if (cliUsage.suggestSummarize) {
            toast.message(CHAT_CLI_CONTEXT_HINT, { id: "cli-context-hint", duration: 5_000 });
          }
        }
        let savedImagePaths: string[] | undefined;
        let inlineAttachments = attachmentsToSave;
        if (!claudeSessionResume) {
          const priorImages = collectPriorUserAttachments(priorForApi);
          if (priorImages.length || attachmentsToSave?.length) {
            const merged = mergeInlineAttachments(priorImages, attachmentsToSave);
            inlineAttachments = merged.attachments.length ? merged.attachments : undefined;
          }
        }
        const useInlineVision = Boolean(inlineAttachments?.length);
        if (!useInlineVision && attachmentsToSave?.length && api.saveChatImageAttachments) {
          const saved = await api.saveChatImageAttachments(attachmentsToSave);
          if (saved.ok && saved.paths?.length) savedImagePaths = saved.paths;
        }
        const ixMode = getWorkbenchInteractionMode();
        // Cursor：手选的云供应商模型（DeepSeek / Gemini / GPT 等）本轮直接打该 API。
        // 只有 Claude 系进入 CLI 工具环。CLI 失败仍硬报错，不改道到别的模型。
        // 附图不整轨跳过：Claude 的 Agent/Plan 仍走 CLI。
        if (!isClaudeCliModel(modelId)) {
          setLiveExecChannel("direct", modelId);
        }
        const wantsToolLoop =
          isClaudeCliModel(modelId) &&
          turnPolicy.allowTools &&
          !turnPolicy.forceDirectChat &&
          (ixMode === "agent" || ixMode === "plan");
        const cliPerm = cliPermissionModeForTurn({
          interactionMode: ixMode,
          allowWrites: turnPolicy.allowWrites,
          autoApplyWrites: turnPolicy.autoApplyWrites,
        });
        const skipCloudRoleBody =
          turnPolicy.forceDirectChat || !turnPolicy.allowWrites || !isAgentMode;

        // Agent/Plan 工具环：优先 Claude CLI；失败硬报错，禁止静默 Host/cloudDirect
        let usedToolLoop = false;
        let toolLoopError: string | null = null;
        if (wantsToolLoop) {
          let cliReady = false;
          if (typeof api.claudeCodePrompt === "function") {
            if (api.claudeCodeCliStatus) {
              try {
                const st = await api.claudeCodeCliStatus();
                cliReady = Boolean(st?.claudePath && !st?.hint?.includes?.("不存在"));
              } catch {
                cliReady = false;
              }
            }
            if (!cliReady && typeof api.claudeCodeEnsureCli === "function") {
              try {
                if (ixMode === "agent" && turnPolicy.allowWrites) {
                  toast.message("正在安装 / 修复 Claude CLI…");
                }
                const ens = await api.claudeCodeEnsureCli();
                if (ens?.ok && ens?.claudePath) {
                  cliReady = true;
                  if (ixMode === "agent" && turnPolicy.allowWrites) {
                    toast.success("Claude CLI 已就绪");
                  }
                } else {
                  const ensErr = String(ens?.error || ens?.hint || "ensureCli 未得到可执行 claude");
                  toolLoopError = `Claude CLI：${ensErr}`;
                }
              } catch (e) {
                toolLoopError = `Claude CLI ensureCli：${
                  e instanceof Error ? e.message : String(e)
                }`;
              }
            }
          }
          if (cliReady && api.claudeCodePrompt) {
            setLiveExecChannel("cli");
            const prompt = await buildClaudeCodePrompt(api, {
              workspaceDir,
              priorHistory: priorForApi,
              userLine: cloudUserLineFinal,
              userAttachments: useInlineVision ? undefined : attachmentsToSave,
              savedImagePaths: useInlineVision ? undefined : savedImagePaths,
              inlineVision: useInlineVision,
              sessionResume: claudeSessionResume,
              localAgentBasename: basenameOverride,
              skipDefaultRoleBlock: true,
              skipAgentRoleBody: skipCloudRoleBody,
              systemConstraint: turnPolicy.systemConstraint || undefined,
              chainCatalogSnippet,
              skillSnippet: skillSnippet || undefined,
              mcpChatToolName: settings.mcpChatToolName || undefined,
              mcpListModelsToolName: settings.mcpListModelsToolName || undefined,
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
              attachmentCount: inlineAttachments?.length ?? attachmentsToSave?.length ?? 0,
              attachments: useInlineVision ? inlineAttachments : attachmentsToSave,
              permissionMode: cliPerm,
            });
            usedToolLoop = Boolean(res?.ok);
            if (usedToolLoop) {
              agentExecBackend = "cli";
              // CLI Edit/Write：写前快照 → filePatches（对齐 Host/本地 Diff 卡）
              const cliPaths = [
                ...(Array.isArray(res?.writtenPaths) ? res.writtenPaths : []),
                ...(Array.isArray(res?.toolWrittenPaths) ? res.toolWrittenPaths : []),
              ]
                .map((p) => String(p || "").trim().replace(/\\/g, "/"))
                .filter(Boolean);
              if (cliPaths.length) {
                hostWrittenPaths = [...new Set([...hostWrittenPaths, ...cliPaths])];
              }
              const cliPatches = normalizeWritePatches(res?.filePatches);
              if (cliPatches.length) {
                for (const p of cliPatches) {
                  if (p.before !== undefined) {
                    stashWorkspaceWriteCheckpoint(p.path, p.before);
                  }
                }
                turnFilePatches = mergeAgentFilePatches(turnFilePatches, cliPatches);
              }
              // 仅可写 Agent：征求确认且未写盘时强制续写（只读/Ask 禁止）
              const cliText = String(res?.content || "");
              if (
                turnPolicy.allowWrites &&
                turnPolicy.autoApplyWrites &&
                ixMode === "agent" &&
                looksLikeAgentAskingConfirmation(cliText) &&
                !hasAgentWriteEvidence(cliText)
              ) {
                const forceLine = agentForceContinueInstruction();
                const contPrompt = await buildClaudeCodePrompt(api, {
                  workspaceDir,
                  priorHistory: [
                    ...priorForApi,
                    { role: "assistant" as const, content: cliText },
                  ],
                  userLine: forceLine,
                  sessionResume: Boolean(res?.claudeSessionId || sess?.claudeSessionId),
                  localAgentBasename: basenameOverride,
                  skipDefaultRoleBlock: true,
                  systemConstraint: turnPolicy.systemConstraint || undefined,
                  chainCatalogSnippet,
                  skillSnippet: skillSnippet || undefined,
                  mcpChatToolName: settings.mcpChatToolName || undefined,
                  mcpListModelsToolName: settings.mcpListModelsToolName || undefined,
                  orchestration: {
                    orchestratorModel: modelId,
                    localOllamaModel: settings.localOllamaModel,
                    ollamaBase: settings.ollamaBase,
                  },
                });
                const contRes = await api.claudeCodePrompt({
                  prompt: contPrompt,
                  model: modelId,
                  requestId: reqId,
                  claudeSessionId:
                    res?.claudeSessionId ?? sess?.claudeSessionId ?? undefined,
                  isNewClaudeSession: false,
                  permissionMode: cliPerm,
                });
                if (contRes?.ok) {
                  const contPaths = [
                    ...(Array.isArray(contRes.writtenPaths) ? contRes.writtenPaths : []),
                    ...(Array.isArray(contRes.toolWrittenPaths)
                      ? contRes.toolWrittenPaths
                      : []),
                  ]
                    .map((p) => String(p || "").trim().replace(/\\/g, "/"))
                    .filter(Boolean);
                  if (contPaths.length) {
                    hostWrittenPaths = [...new Set([...hostWrittenPaths, ...contPaths])];
                  }
                  const contPatches = normalizeWritePatches(contRes.filePatches);
                  if (contPatches.length) {
                    for (const p of contPatches) {
                      if (p.before !== undefined) {
                        stashWorkspaceWriteCheckpoint(p.path, p.before);
                      }
                    }
                    turnFilePatches = mergeAgentFilePatches(turnFilePatches, contPatches);
                  }
                  res = {
                    ...contRes,
                    // 勿用 ⋯ 前缀：会被当成工具行渲染成扳手「系统强制续写」
                    content: `${cliText}\n\n${contRes.content || ""}`,
                    claudeSessionId: contRes.claudeSessionId || res?.claudeSessionId,
                    writtenPaths: [
                      ...new Set([
                        ...(Array.isArray(res?.writtenPaths) ? res.writtenPaths : []),
                        ...contPaths,
                      ]),
                    ],
                    filePatches: mergeAgentFilePatches(
                      normalizeWritePatches(res?.filePatches),
                      contPatches,
                    ),
                  };
                }
              }
            } else {
              toolLoopError = String(res?.error || "Claude CLI 执行失败");
            }
          }
          if (!usedToolLoop && blockHostWhenMcpEnabled) {
            // 已启用需 MCP 的服务器 → 禁止 Host / cloudDirect 静默兜底
            res = {
              ok: false,
              content: "",
              error: mcpCliGateFailureMessage(toolLoopError, mcpNamesRequiringCli),
            };
            usedToolLoop = true;
          }
          // Agent/Plan 已进入工具环意图：CLI 失败硬报错，禁止静默 Host / cloudDirect
          if (!usedToolLoop && wantsToolLoop) {
            res = {
              ok: false,
              content: "",
              error: toolLoopError
                ? `工具环不可用（Claude CLI）：${toolLoopError}。不会自动改用 Host 或直聊。`
                : "工具环不可用（Claude CLI 未成功）。不会自动改用 Host 或直聊。",
            };
            usedToolLoop = true; // 阻断下方 cloudDirect
          }
        }

        if (!usedToolLoop) {
          let prompt: string;
          prompt = await buildPlainChatPrompt(
            priorForApi,
            cloudUserLineFinal,
            workspaceDir,
            api,
            { systemConstraint: turnPolicy.systemConstraint || undefined },
          );
          // 问答/Ask/只读：cloudDirect；可写 Agent 已在上方硬失败
          if (api.cloudDirectPrompt) {
            let finalPrompt = prompt;
            const preReadAppendix = await preReadInstructedWorkspaceFiles(
              api,
              prompt,
              expandInjectedPathsRef.current,
            ).catch(() => "");
            if (preReadAppendix) {
              finalPrompt = `${preReadAppendix}\n\n---\n\n${prompt}`;
            }
            res = await api.cloudDirectPrompt({
              prompt: finalPrompt,
              model: modelId,
              requestId: reqId,
            });
          } else if (api.claudeCodePrompt) {
            res = await api.claudeCodePrompt({
              prompt,
              model: modelId,
              requestId: reqId,
              claudeSessionId: sess?.claudeSessionId ?? undefined,
              isNewClaudeSession: !sess?.claudeSessionId,
              attachmentCount: inlineAttachments?.length ?? attachmentsToSave?.length ?? 0,
              attachments: useInlineVision ? inlineAttachments : attachmentsToSave,
              permissionMode: cliPerm,
            });
          } else {
            res = { ok: false, error: "无可用发送后端", content: "" };
          }
        }
      }
      toastIfLocalOrchestrationHints(res);

      // 用户已点停止：以中止为准，勿用迟到正文盖掉「生成已停止」
      if (userStoppedRef.current) {
        res = {
          ok: false,
          content: "",
          error: "请求已取消",
          aborted: true,
        };
      }

      const resolveAuditChannel = (): string => {
        if (mode === "local-mcp") {
          if (turnPolicy.forceDirectChat || !turnPolicy.allowTools) return "direct";
          return agentExecBackend || "orch";
        }
        return agentExecBackend || "cloud";
      };
      const appendTurnAudit = async (fields: {
        writeParsed?: number;
        writeApplied?: number;
        writeFailed?: number;
        ok: boolean;
        error?: string;
      }) => {
        try {
          const line = formatTurnAuditMessage({
            interactionMode: turnPolicy.interactionMode,
            intent: turnPolicy.intent,
            allowWrites: turnPolicy.allowWrites,
            autoApplyWrites: turnPolicy.autoApplyWrites,
            forceDirectChat: turnPolicy.forceDirectChat,
            modelId,
            channel: resolveAuditChannel(),
            writeParsed: fields.writeParsed ?? 0,
            writeApplied: fields.writeApplied ?? 0,
            writeFailed: fields.writeFailed ?? 0,
            ok: fields.ok,
            error: fields.error,
            latencyMs: Math.max(0, Date.now() - sendStarted),
          });
          await api.logsAppend?.({ level: "INFO", message: line, source: "app" });
        } catch {
          /* 审计失败不阻断 */
        }
      };

      if (!res.ok) {
        // 失败回合：只保留错误文案，禁止解析 fence/diff 成「待应用」卡片
        const line = formatAssistantFailure({
          ...res,
          error: String(res.error || "").slice(0, 1200),
        });
        void appendTurnAudit({
          ok: false,
          error: String(res.error || line).slice(0, 240),
        });
        hist = [
          ...hist,
          {
            role: "assistant",
            content: line,
            ts: Date.now(),
            requestError: true,
            billingSource: mode === "local-mcp" ? "local" : "cloud",
            modelId,
            // 失败也如实标通道，避免写盘 tools 失败却显示「本地直聊」
            ...(mode === "local-mcp"
              ? {
                  localChannel: (turnPolicy.forceDirectChat || !turnPolicy.allowTools
                    ? "direct"
                    : "orch") as "direct" | "orch",
                }
              : {}),
            ...(!turnPolicy.allowWrites ? { suppressFileEdits: true as const } : {}),
            ...turnAgent,
          },
        ];
      } else {
        let reply = res.content || "";
        // Ask：仅 toast 提醒；Agent 自动写盘走硬闭环（禁止 toast 后当成功）
        if (!turnPolicy.autoApplyWrites) {
          maybeToastMissingWorkspaceWrite(reply);
        }
        // 回合策略：Ask/只读意图禁止自动落盘，并剥掉全部写盘载荷（避免 UI 刷文件卡）
        let auto: {
          nextContent: string;
          written: string[];
          failed: string[];
          patches?: import("@/lib/agent-file-patch").AgentFilePatch[];
        } = {
          nextContent: reply,
          written: [],
          failed: [],
          patches: [],
        };
        let replyBeforeWrite = reply;
        if (!turnPolicy.allowWrites) {
          reply = stripAllWorkspaceWritePayloads(reply);
          const { edits: dumpEdits, stripped } = parseChatFileEdits(reply);
          if (dumpEdits.length) {
            reply = stripped.trim() || reply;
          }
          auto = { nextContent: reply, written: [], failed: [] };
        } else if (!turnPolicy.autoApplyWrites) {
          auto = { nextContent: reply, written: [], failed: [] };
        } else {
          auto = await autoAcceptPendingFromAssistantReply(reply, {
            alreadyWrittenPaths: hostWrittenPaths,
            alreadyPatches: turnFilePatches,
          });
          reply = auto.nextContent;
          if (auto.patches?.length) {
            turnFilePatches = mergeAgentFilePatches(turnFilePatches, auto.patches);
          }
        }
        // 只读：禁止从正文/脏 git 树合成「本轮写入」
        const pathsFromReply =
          !turnPolicy.allowWrites ? [] : extractWrittenPathsFromAgentContent(reply);
        let writtenForTurn = !turnPolicy.allowWrites
          ? []
          : [
              ...new Set(
                [...hostWrittenPaths, ...auto.written, ...pathsFromReply].filter(
                  isPlausibleWorkspaceRelPath,
                ),
              ),
            ];
        // 仅 CLI Agent 可写意图：用 git status 补路径；禁止无 commit 脏树冒充问答写入
        if (
          turnPolicy.allowWrites &&
          turnPolicy.autoApplyWrites &&
          !writtenForTurn.length &&
          agentExecBackend === "cli" &&
          typeof api.workspaceGetGitDiff === "function"
        ) {
          try {
            const gd = await api.workspaceGetGitDiff();
            const statusLine = String(gd?.statusLine || "").trim();
            const gitUsable =
              gd?.ok !== false &&
              statusLine &&
              !/^(fatal|error|（git status)/i.test(statusLine) &&
              !/not a git repository|Command failed|不可用|no commits yet/i.test(
                statusLine,
              );
            if (gitUsable) {
              const dirty = statusLine
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith("##"))
                .map((l) =>
                  l
                    .replace(/^[ MADRCU?!]{1,2}\s+/, "")
                    .replace(/^.*\s->\s/, "")
                    .replace(/\\/g, "/"),
                )
                .filter(isPlausibleWorkspaceRelPath)
                .slice(0, 40);
              if (dirty.length) writtenForTurn = dirty;
            }
          } catch {
            /* ignore */
          }
        }

        // Finalize：只读回合禁止 ingest 落盘；Agent 自动落盘走 detailed + 硬闭环
        const ingest = await ingestWorkspaceWritesDetailed(
          api,
          reply || "（助手未返回可见正文）",
          toastIngestWorkspaceHint,
          { allowApply: turnPolicy.autoApplyWrites },
        );
        if (ingest.written.length) {
          writtenForTurn = [...new Set([...writtenForTurn, ...ingest.written])];
        }
        if (ingest.patches?.length) {
          turnFilePatches = mergeAgentFilePatches(turnFilePatches, ingest.patches);
        }
        if (ingest.failed.length) {
          auto = {
            ...auto,
            failed: [...new Set([...auto.failed, ...ingest.failed])],
          };
        }
        let displayContent =
          stripLargeAssistantArtifacts(ingest.text) ||
          reply ||
          "（助手未返回可见正文）";
        if (!turnPolicy.allowWrites) {
          displayContent = sanitizeReadonlyAssistantContent(displayContent);
        }

        // 仅真实变更意图才强制「至少写 1 个文件」；咨询/方案口述对齐 Cursor，零写入不算失败
        const requireAppliedWrite =
          Boolean(turnPolicy.autoApplyWrites) && turnPolicy.intent === "write";
        let closeLoop = assertAgentWriteCloseLoop({
          allowWrites: turnPolicy.allowWrites,
          autoApplyWrites: turnPolicy.autoApplyWrites,
          replyRaw: replyBeforeWrite,
          written: writtenForTurn,
          failed: auto.failed,
          requireAppliedWrite,
        });
        // 仅本地编排：围栏无法解析 / 0 写入时再问一次，只要一块 JSON。不改云端通道，也不把说明文字兜底写成文件。
        if (
          !closeLoop.ok &&
          mode === "local-mcp" &&
          requireAppliedWrite &&
          /未能写入文件|未写入任何|声称已改文件/.test(closeLoop.error) &&
          typeof api.localOrchestrationPrompt === "function"
        ) {
          try {
            const repair = await api.localOrchestrationPrompt({
              priorMessages: priorTurnsToOrchestrationMessages([
                ...priorForApi,
                { role: "assistant", content: replyBeforeWrite.slice(0, 6000) },
              ]),
              userLine:
                "上一轮未成功落盘。只重新输出一个 ```workspace-write 围栏，正文必须是 JSON 对象 " +
                '{"path":"<相对路径>","content":"完整文件内容"}。不要在围栏外写说明；禁止空落盘收尾。',
              languageSourceLine: displayLine,
              orchestratorModel: modelId,
              requestId: reqId,
              agentBasenameOverride: isAgentMode ? basenameOverride : "__general__",
              interactionMode: turnPolicy.interactionMode,
              allowWrites: true,
              autoApplyWrites: true,
              systemConstraint:
                "只输出一个 ```workspace-write JSON 围栏。path 与 content 都必须是 JSON 字符串。",
            });
            const repaired = String(repair?.content || "");
            if (repair?.ok && parseWorkspaceWriteItemsFromBubble(repaired).length) {
              const repairedIngest = await ingestWorkspaceWritesDetailed(
                api,
                repaired,
                toastIngestWorkspaceHint,
                { allowApply: true },
              );
              if (repairedIngest.written.length) {
                reply = repaired;
                replyBeforeWrite = repaired;
                writtenForTurn = [
                  ...new Set([...writtenForTurn, ...repairedIngest.written]),
                ];
                displayContent =
                  stripLargeAssistantArtifacts(repairedIngest.text) || repaired;
                closeLoop = assertAgentWriteCloseLoop({
                  allowWrites: true,
                  autoApplyWrites: true,
                  replyRaw: repaired,
                  written: writtenForTurn,
                  failed: repairedIngest.failed,
                  requireAppliedWrite: true,
                });
              }
            }
          } catch {
            /* 补救失败则保留原来的硬错误 */
          }
        }
        const writeParsed =
          closeLoop.parsed ||
          (turnPolicy.allowWrites
            ? parseWorkspaceWriteItemsFromBubble(replyBeforeWrite).length
            : 0);

        void appendTurnAudit({
          writeParsed,
          writeApplied: writtenForTurn.length,
          writeFailed: auto.failed.length,
          ok: closeLoop.ok && Boolean(res.ok),
          error: closeLoop.ok ? undefined : closeLoop.error,
        });

        if (!closeLoop.ok) {
          // 对齐 Cursor：硬失败可 toast / 标红，但必须保留助手正文，禁止用错误文案整段替换气泡
          toast.error(closeLoop.error, { duration: 10_000 });
          hist = [
            ...hist,
            {
              role: "assistant",
              content: displayContent,
              ts: Date.now(),
              requestError: true,
              requestErrorDetail: closeLoop.error,
              billingSource: mode === "local-mcp" ? "local" : "cloud",
              modelId,
              ...(mode === "local-mcp"
                ? { localChannel: "orch" as const }
                : {}),
              ...turnAgent,
            },
          ];
          await patchSession(sendSessionId, (s) => ({
            ...s,
            history: hist,
            ...nextModelHistoryPatch(
              s.modelHistory,
              s.modelHistoryCoreLen,
              displayBeforeLen,
              hist,
              { clear: clearModelHistory },
            ),
            modelId,
          }));
          if (sendSessionId === activeIdRef.current) {
            setMessages(diskToDisplay(hist, modelId));
          }
          const errMsgs = diskToDisplay(hist, modelId);
          chatCtx.syncMessages(errMsgs);
          chatCtx.syncSessionMessages(sendSessionId, errMsgs);
          return;
        }

        // 对齐 Cursor：成功写盘不弹常驻 toast；仅登记路径供「查看改动」/底栏，安静刷新
        if (writtenForTurn.length && turnPolicy.allowWrites) {
          toastWorkspaceWriteSuccess("", {
            writtenPaths: writtenForTurn,
            quiet: true,
          });
        }
        if (auto.failed.length) {
          toast.error(
            `${auto.failed.length} 个文件未能自动应用：${auto.failed.slice(0, 3).join(", ")}${auto.failed.length > 3 ? "…" : ""}`,
            { duration: 8000 },
          );
        }
        const verifiedForTurn =
          hostVerified === true ||
          /测试[：:].*已跑|· verified|143 passed|\d+ passed/i.test(displayContent);
        let streamEvents = turnPolicy.allowWrites
          ? mergeStreamEvents(
              extractStreamEventsFromContent(reply),
              extractStreamEventsFromContent(displayContent),
              toolTraceToStreamEvents(hostToolTrace),
            )
          : [];
        const summary = buildShortAgentSummary(
          writtenForTurn,
          verifiedForTurn,
          displayContent,
        );
        // Cursor 执行反馈：有实写 / Agent 通道 / 执行报告 → 统一整形（云端 fence 与本地同模板）
        if (
          turnPolicy.allowWrites &&
          (writtenForTurn.length ||
            agentExecBackend ||
            getWorkbenchInteractionMode() === "agent" ||
            looksLikeAgentTurnReport(displayContent))
        ) {
          const shaped = shapeAgentTurnDisplay({
            content: displayContent,
            streamEvents,
            writtenPaths: writtenForTurn,
            verified: verifiedForTurn,
            summary,
          });
          displayContent = shaped.content;
          streamEvents = shaped.streamEvents;
        }
        // Cursor 体感：Agent Bash/run_command 回显到底栏终端（不重跑）
        if (turnPolicy.allowWrites && getWorkbenchInteractionMode() === "agent") {
          const fromTrace = hostToolTrace
            .filter((t) => /^(run_command|run_tests)$/i.test(String(t.tool || "")))
            .map((t) => ({
              command: String(t.detail || t.args?.command || "").trim(),
              output: String(t.output || ""),
              ok: t.ok !== false,
            }))
            .filter((r) => r.command);
          const fromEvents = (streamEvents || [])
            .filter((e) => /^(Bash|Ran|run_command|run_tests)$/i.test(String(e.name || "")))
            .map((e) => ({
              command: String(e.arg || "").trim(),
              output: String(e.output || ""),
              ok: e.status !== "fail",
            }))
            .filter((r) => r.command);
          const seen = new Set<string>();
          const runs = [...fromTrace, ...fromEvents].filter((r) => {
            if (seen.has(r.command)) return false;
            seen.add(r.command);
            return true;
          });
          if (runs.length) {
            void echoAgentRunsInWorkbenchTerminal(runs);
          }
        }
        const mcpUsed =
          eventsHaveMcpTool(streamEvents, hostToolTrace) || /mcp__/i.test(reply || "");
        // 只读问答不写 agentTurn；只读但进了工具环时保留后端与 MCP 轨迹（写盘路径另由 suppressFileEdits 丢掉）
        const attachAgentTurn =
          (turnPolicy.allowWrites &&
            (agentExecBackend || writtenForTurn.length || streamEvents.length || mcpUsed)) ||
          (!turnPolicy.allowWrites &&
            turnPolicy.allowTools &&
            (Boolean(agentExecBackend) || streamEvents.length > 0 || mcpUsed));
        const localChannel: DiskMsg["localChannel"] =
          mode === "local-mcp" && res?.ok
            ? turnPolicy.forceDirectChat || !turnPolicy.allowTools
              ? "direct"
              : "orch"
            : undefined;
        const turnUsage = resolveTurnUsage(res?.usage, hist, displayContent);
        // 规则分桶：复用缓存的注入片段实测字数（无注入则不写）
        let rulesSnippetForParts = "";
        try {
          rulesSnippetForParts = (await loadProjectRulesSnippet(api)) || "";
        } catch {
          rulesSnippetForParts = "";
        }
        const contextParts = buildContextParts({
          rulesSnippet: rulesSnippetForParts,
          streamEvents,
          toolTrace: hostToolTrace,
        });
        const toolsTraceRaw =
          res &&
          typeof res === "object" &&
          res.toolsTrace &&
          typeof res.toolsTrace === "object" &&
          Array.isArray(res.toolsTrace.offered)
            ? {
                offered: res.toolsTrace.offered.map(String).filter(Boolean),
                called: Math.max(0, Number(res.toolsTrace.called) || 0),
              }
            : undefined;
        const am: DiskMsg = {
          role: "assistant",
          content: displayContent,
          ts: Date.now(),
          latencyMs: Math.max(0, Date.now() - sendStarted),
          billingSource: mode === "local-mcp" ? "local" : "cloud",
          modelId,
          usage: turnUsage,
          ...(contextParts ? { contextParts } : {}),
          ...(!turnPolicy.allowWrites ? { suppressFileEdits: true } : {}),
          ...(localChannel ? { localChannel } : {}),
          ...(toolsTraceRaw ? { toolsTrace: toolsTraceRaw } : {}),
          ...(attachAgentTurn
            ? {
                agentTurn: {
                  writtenPaths: writtenForTurn,
                  ...(turnFilePatches.length
                    ? { filePatches: turnFilePatches }
                    : {}),
                  verified: verifiedForTurn,
                  ...(agentExecBackend ? { backend: agentExecBackend } : {}),
                  ...(mcpUsed ? { mcpUsed: true } : {}),
                  ...(streamEvents.length ? { streamEvents } : {}),
                  ...(summary ? { summary } : {}),
                  ...(() => {
                    const turnFooter = snapshotComposerTurnFooter(
                      writtenForTurn.map((path) => {
                        const patch = turnFilePatches.find((p) => p.path === path);
                        if (!patch || (patch.before == null && patch.after == null)) {
                          return { path };
                        }
                        const stats = buildLineDiffPreview(
                          patch.before || "",
                          patch.after || "",
                          8,
                          { allowFullAdd: !patch.before },
                        );
                        return {
                          path,
                          added: stats.added,
                          removed: stats.removed,
                        };
                      }),
                    );
                    resetLiveComposerTurnSignals();
                    return turnFooter ? { turnFooter } : {};
                  })(),
                },
              }
            : {}),
          ...turnAgent,
        };
        hist = [...hist, am];
        void autoSaveChainFromReply(api, reply).then((r) => {
          if (r.saved) {
            notifyAutoSavedChain(
              { stepCount: r.stepCount, chainName: r.chainName, wbsPath: r.wbsPath },
              () => navigate({ to: "/chains", search: { q: "WBS" } }),
            );
          }
        });
      }
      await patchSession(sendSessionId, (s) => ({
        ...s,
        history: hist,
        ...nextModelHistoryPatch(
          s.modelHistory,
          s.modelHistoryCoreLen,
          displayBeforeLen,
          hist,
          { clear: clearModelHistory },
        ),
        modelId,
        ...(res.claudeSessionId ? { claudeSessionId: res.claudeSessionId } : {}),
      }));
      if (sendSessionId === activeIdRef.current) {
        setMessages(diskToDisplay(hist, modelId));
      }
      // 即使组件卸载，仍通过上下文同步最终消息，以便返回时恢复
      const finalMsgs = diskToDisplay(hist, modelId);
      chatCtx.syncMessages(finalMsgs);
      chatCtx.syncSessionMessages(sendSessionId, finalMsgs);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const normalized = normalizeRpcErrorMessage(raw) || raw;
      const userCancel =
        isRpcUserAbortError(e) ||
        normalized === RPC_REQUEST_CANCELLED ||
        normalized === "生成已停止";
      const interrupted = normalized === RPC_REQUEST_INTERRUPTED;
      // 仅用户取消可静默收束；中断/桥离线/其它错误一律硬展示（禁 Failed to fetch 兜底软化）
      const quietStop = userCancel;
      const display = quietStop
        ? formatAssistantFailure({ aborted: true, error: normalized })
        : formatAssistantFailure({ error: normalized });
      hist = [
        ...hist,
        {
          role: "assistant",
          content: display,
          ts: Date.now(),
          requestError: !quietStop,
          billingSource: mode === "local-mcp" ? "local" : "cloud",
          modelId,
          ...turnAgent,
        },
      ];
      await patchSession(sendSessionId, (s) => ({
        ...s,
        history: hist,
        ...nextModelHistoryPatch(
          s.modelHistory,
          s.modelHistoryCoreLen,
          displayBeforeLen,
          hist,
          { clear: clearModelHistory },
        ),
        modelId,
      }));
      if (sendSessionId === activeIdRef.current) {
        setMessages(diskToDisplay(hist, modelId));
      }
      const errorMsgs = diskToDisplay(hist, modelId);
      chatCtx.syncMessages(errorMsgs);
      chatCtx.syncSessionMessages(sendSessionId, errorMsgs);
      if (!quietStop) toast.error(normalized);
    } finally {
      clearLiveExecChannel();
      await appendAgentExecEvent({
        agent: cmd.stem,
        mode,
        source: "chat_command",
        phase: "end",
        instruction: route.body || displayLine,
        modelId,
      });
      chatCtx.activeRequestIdsRef.current.delete(sendSessionId);
      if (streamContextRef.current?.sessionId === sendSessionId) {
        streamContextRef.current = null;
      }
      activeStreamRequestIdRef.current = null;
      setActiveStreamRequestId(null);
      // 即使 ChatPage 已卸载，也同步到上下文让 GlobalChatPanel 知道流已结束
      chatCtx.syncActiveStreamRequestId(null);
      setSessionSending(sendSessionId, false);
      await pruneWorkspaceSessions(activeIdRef.current);
    }

  }, []);

  const resendUserMessageImpl = useCallback(
    async (historyIndex: number) => {
      const { globalModel, resetScrollFollow, sendPayloadOverrideRef, activeIdRef, sessionsRef, setEditHistoryIndex, setMessages } =
        argsRef.current;
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
        pendingFiles: [],
        pendingTerminalSnippets: restored.terminalSnippets,
        editCutoff: historyIndex,
      };
      resetScrollFollow();
      await sendChat();
    },
    [sendChat],
  );

  return { sendChat, stopChat, resendUserMessageImpl };
}
