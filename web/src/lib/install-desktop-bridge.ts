/**
 * 浏览器模式下注入 window.desktop，通过本机 Web Bridge RPC 调用 Claude Code CLI。
 * 需先启动：npm run bridge（或 npm run web:dev:full）
 */
import type { DesktopApi } from "@/types/desktop";
import { appendOutput } from "@/lib/workbench-output-log";
import { installEmbeddedBrowserBridge } from "@/lib/install-embedded-browser-bridge";
import {
  formatBridgeConnectionError,
  formatRpcAbortError,
  formatRpcInterruptedError,
  getBridgeWsUrl,
  isBridgeConnectionError,
  isRpcUserAbortError,
  normalizeRpcErrorMessage,
  normalizeRpcPayload,
} from "@/lib/bridge-connection-error";
import { RPC_CONNECTION_ERROR, RPC_CONNECTION_TIMEOUT_HINT } from "@/lib/ui-copy";
import { dispatchBridgeEvent, onBridgeEvent } from "@/lib/bridge-events";

const RPC_BASE = "/api";

const QUIET_RPC = new Set([
  "workspace:get",
  "workspace:history:get",
  "workspace:listPanelTree",
  "workspace:getShellSnapshot",
  "workspace:getGitCommitLog",
  "workspace:getGitDiff",
  "workspace:getGitDiffPaths",
  "workspace:getGitDiffVsBase",
  "workspace:gitCommit",
  "workspace:gitDiscardFile",
  "workspace:gitRemoteSync",
  "ui-prefs:get",
  "chat-settings:get",
  "chat-sessions:get",
  "claude-code:cliStatus",
  "cloud-providers:status",
  "system:localWallClock",
]);

async function pingHealthQuick(): Promise<boolean> {
  try {
    const res = await fetch(`${RPC_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function rpc<T>(channel: string, ...args: unknown[]): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${RPC_BASE}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, args }),
    });
  } catch (e) {
    if (isRpcUserAbortError(e)) {
      throw new Error(formatRpcAbortError());
    }
    const msg = e instanceof Error ? e.message : String(e);
    appendOutput("bridge", `RPC ${channel} 不可达: ${msg}`);
    // 裸 Failed to fetch 常见于切页中断；桥仍健康时勿报「无法连接本机服务」
    if (/^Failed to fetch$/i.test(msg) || /^NetworkError when attempting to fetch resource\.?$/i.test(msg)) {
      const healthy = await pingHealthQuick();
      if (healthy) throw new Error(formatRpcInterruptedError());
      throw new Error(formatBridgeConnectionError(msg));
    }
    if (isBridgeConnectionError(msg)) {
      throw new Error(formatBridgeConnectionError(msg));
    }
    const hint = /fetch failed|ECONNREFUSED|ETIMEDOUT|socket hang up|network/i.test(msg)
      ? `（${RPC_CONNECTION_TIMEOUT_HINT}）`
      : "";
    throw new Error(`${RPC_CONNECTION_ERROR(msg)}${hint}`);
  }
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) {
    const errObj =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : text;
    appendOutput("bridge", `RPC ${channel} 失败 (${res.status}): ${errObj || text}`);
    throw new Error(normalizeRpcErrorMessage(errObj) || `RPC ${channel} failed (${res.status})`);
  }
  if (!QUIET_RPC.has(channel)) {
    appendOutput("bridge", `RPC ${channel} 完成`);
  }
  if (data && typeof data === "object") {
    return normalizeRpcPayload(data as Record<string, unknown>) as T;
  }
  return data as T;
}

export async function pingWebBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${RPC_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

function connectBridgeEvents() {
  if (typeof window === "undefined") return;
  const wsUrl = getBridgeWsUrl();
  try {
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type?: string;
          channel?: string;
          detail?: unknown;
        };
        if (msg.type === "event" && msg.channel) {
          dispatchBridgeEvent(msg.channel, msg.detail);
        }
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      window.setTimeout(connectBridgeEvents, 3000);
    };
  } catch {
    window.setTimeout(connectBridgeEvents, 3000);
  }
}

/** 与 web:dev / 打包 Electron 共用的相对路径 RPC API（同源 /api/rpc） */
export function createDesktopRpcApi(): DesktopApi {
  const desktop: DesktopApi = {
    getWorkspace: () => rpc("workspace:get"),
    chooseWorkspace: (manualPath?: string) =>
      rpc("workspace:choose", typeof manualPath === "string" ? manualPath : undefined),
    getWorkspaceHistory: () => rpc("workspace:history:get"),
    removeWorkspaceHistoryEntry: (path: string) => rpc("workspace:history:remove", path),
    clearWorkspaceHistory: () => rpc("workspace:history:clear"),
    chooseReferenceFiles: (opts) => rpc("dialog:chooseReferenceFiles", opts ?? {}),
    readReferenceTextFiles: (filePaths: string[]) =>
      rpc("files:readTextPaths", { paths: filePaths }),
    clearWorkspace: () => rpc("workspace:clear"),
    workspaceApplyWriteFence: (items) => rpc("workspace:applyWriteFence", items),
    workspaceIngestFromAssistantText: (payload) =>
      rpc("workspace:ingestFromAssistantText", payload),
    workspaceBulkIngestFromHistory: (payload) => rpc("workspace:bulkIngestFromHistory", payload),
    workspaceStartPreview: (payload) => rpc("workspace:startPreview", payload),
    workspaceStopPreview: () => rpc("workspace:stopPreview"),
    workspaceGetPreviewStatus: () => rpc("workspace:getPreviewStatus"),
    workspaceDetectRunPlan: (payload) => rpc("workspace:detectRunPlan", payload),
    workspaceGetExecutionSnapshot: () => rpc("workspace:getExecutionSnapshot"),
    readWorkspaceTextFile: (relPath) => rpc("workspace:readTextFile", relPath),
    workspaceLintFiles: (relPaths, mode) => rpc("workspace:lintFiles", relPaths, mode),
    listWorkspaceProjectRules: () => rpc("workspace:listProjectRules"),
    workspaceTsDefinition: (payload) => rpc("workspace:tsDefinition", payload),
    workspaceTsTypeDefinition: (payload) => rpc("workspace:tsTypeDefinition", payload),
    workspaceTsImplementation: (payload) => rpc("workspace:tsImplementation", payload),
    workspaceTsHover: (payload) => rpc("workspace:tsHover", payload),
    workspaceTsNavigationTree: (payload) => rpc("workspace:tsNavigationTree", payload),
    workspaceTsSignatureHelp: (payload) => rpc("workspace:tsSignatureHelp", payload),
    workspaceTsCompletions: (payload) => rpc("workspace:tsCompletions", payload),
    workspaceTsReferences: (payload) => rpc("workspace:tsReferences", payload),
    workspaceTsCallHierarchy: (payload) => rpc("workspace:tsCallHierarchy", payload),
    workspaceTsRename: (payload) => rpc("workspace:tsRename", payload),
    workspaceTsOrganizeImports: (payload) => rpc("workspace:tsOrganizeImports", payload),
    workspaceTsFormatDocument: (payload) => rpc("workspace:tsFormatDocument", payload),
    workspaceRipgrep: (payload) => rpc("workspace:ripgrep", payload),
    workspaceGraphifyQuery: (payload) => rpc("workspace:graphifyQuery", payload),
    graphifyStatus: () => rpc("workspace:graphifyStatus"),
    graphifyUpdateFiles: (payload) => rpc("workspace:graphifyUpdateFiles", payload || {}),
    workspaceCodeIndexBuild: (payload) =>
      rpc("workspace:codeIndexBuild", payload || {}),
    workspaceCodeIndexSearch: (payload) => rpc("workspace:codeIndexSearch", payload),
    workspaceCodeIndexStatus: () => rpc("workspace:codeIndexStatus"),
    workspaceCodeIndexUpdateFiles: (payload) =>
      rpc("workspace:codeIndexUpdateFiles", payload || {}),
    workspaceCodeIndexEnsureHybrid: (payload) =>
      rpc("workspace:codeIndexEnsureHybrid", payload || {}),
    hostAgentPrompt: (payload) => rpc("host-agent:prompt", payload),
    hostAgentAbort: (requestId) => rpc("host-agent:abort", requestId),
    workspaceAbortRunCommand: (runId) =>
      rpc("workspace:abortRunCommand", runId ? { runId } : {}),
    claudeCodeEnsureCli: () => rpc("claude-code:ensureCli"),
    workspaceTsCodeFixes: (payload) => rpc("workspace:tsCodeFixes", payload),
    workspaceTsApplyCodeFix: (payload) => rpc("workspace:tsApplyCodeFix", payload),
    workspaceDetectExternalLsp: () => rpc("workspace:detectExternalLsp"),
    workspaceExternalLspStatus: () => rpc("workspace:externalLspStatus"),
    workspacePythonDefinition: (payload) => rpc("workspace:pythonDefinition", payload),
    workspacePythonHover: (payload) => rpc("workspace:pythonHover", payload),
    workspacePythonCompletions: (payload) => rpc("workspace:pythonCompletions", payload),
    workspacePythonReferences: (payload) => rpc("workspace:pythonReferences", payload),
    workspacePythonRename: (payload) => rpc("workspace:pythonRename", payload),
    workspaceExternalLspDefinition: (payload) => rpc("workspace:externalLspDefinition", payload),
    workspaceExternalLspHover: (payload) => rpc("workspace:externalLspHover", payload),
    workspaceExternalLspCompletions: (payload) =>
      rpc("workspace:externalLspCompletions", payload),
    workspaceExternalLspReferences: (payload) => rpc("workspace:externalLspReferences", payload),
    workspaceExternalLspRename: (payload) => rpc("workspace:externalLspRename", payload),
    workspaceExternalLspDocumentSymbols: (payload) =>
      rpc("workspace:externalLspDocumentSymbols", payload),
    workspaceExternalLspCallHierarchy: (payload) =>
      rpc("workspace:externalLspCallHierarchy", payload),
    listWorkspaceMarkdownFiles: () => rpc("workspace:listMarkdownFiles"),
    listWorkspacePanelTree: () => rpc("workspace:listPanelTree"),
    workspaceGetShellSnapshot: () => rpc("workspace:getShellSnapshot"),
    workspaceGetGitCommitLog: (limit?: number) =>
      rpc("workspace:getGitCommitLog", limit != null ? { limit } : {}),
    workspaceGetGitDiff: () => rpc("workspace:getGitDiff"),
    workspaceGetGitDiffPaths: (payload: { paths: string[] }) =>
      rpc("workspace:getGitDiffPaths", payload),
    workspaceGetGitDiffVsBase: (payload?: { base?: string }) =>
      rpc("workspace:getGitDiffVsBase", payload ?? {}),
    workspaceGitCommit: (payload: { message: string; stageAll?: boolean }) =>
      rpc("workspace:gitCommit", payload),
    workspaceGitDiscardFile: (payload: { path: string }) =>
      rpc("workspace:gitDiscardFile", payload),
    workspaceGitRemoteSync: (payload: { action: "fetch" | "pull" | "push" }) =>
      rpc("workspace:gitRemoteSync", payload),
    onWorkspaceChanged: (fn) => onBridgeEvent("workspace:changed", fn),
    onWorkspaceRulesChanged: (fn) => onBridgeEvent("workspace:rules-changed", fn),
    getCrossAgentContext: (opts) =>
      rpc("memory:getCrossAgentContextText", opts || {}),
    getChatSettings: () => rpc("chat-settings:get"),
    saveChatSettings: (body) => rpc("chat-settings:save", body),
    getUiPrefs: () => rpc("ui-prefs:get"),
    saveUiPrefs: (body) => rpc("ui-prefs:save", body),
    getProjectDbInfo: () => rpc("project-db:info"),
    loadChatSessions: () => rpc("chat-sessions:get"),
    saveChatSessions: (payload) => rpc("chat-sessions:save", payload),
    listOllamaModels: (base) => rpc("ollama:listModels", base),
    modelsCapabilities: (payload) => rpc("models:capabilities", payload),
    claudeCodePrompt: (payload) => rpc("claude-code:prompt", payload),
    claudeCodeAbort: (requestId) => rpc("claude-code:abort", requestId),
    localOrchestrationPrompt: (payload) => rpc("local-orchestration:prompt", payload),
    localOrchestrationAbort: (requestId) => rpc("local-orchestration:abort", requestId),
    cloudDirectPrompt: (payload) => rpc("cloud-direct:prompt", payload),
    cloudDirectAbort: (requestId) => rpc("cloud-direct:abort", { requestId }),
    claudeCodeListModels: () => rpc("claude-code:listModels"),
    cloudProvidersStatus: () => rpc("cloud-providers:status"),
    cloudProvidersListProviders: () => rpc("cloud-providers:listProviders"),
    cloudProvidersGetModelPools: () => rpc("cloud-providers:getModelPools"),
    cloudProvidersUpsertProvider: (body) => rpc("cloud-providers:upsertProvider", body),
    cloudProvidersDeleteProvider: (body) => rpc("cloud-providers:deleteProvider", body),
    cloudProvidersSetCurrentProvider: (body) => rpc("cloud-providers:setCurrentProvider", body),
    cloudProvidersSyncWorkbench: () => rpc("cloud-providers:syncWorkbench"),
    cloudProvidersRefreshCloudModels: (opts) => rpc("cloud-providers:refreshCloudModels", opts),
    cloudProvidersProviderNeedsCcr: (opts) => rpc("cloud-providers:providerNeedsCcr", opts),
    cloudProvidersListKnownProviders: () => rpc("cloud-providers:listKnownProviders"),
    cloudProvidersFetchProviderModels: (body) => rpc("cloud-providers:fetchProviderModels", body),
    getDefaultModelPricing: () => rpc("default-model-pricing:get"),
    readReferenceFilesAsImageAttachments: (filePaths) =>
      rpc("reference-files:readAsImageAttachments", filePaths),
    saveChatImageAttachments: (attachments) => rpc("chat:saveImageAttachments", attachments),
    enrichChatUserLineForImages: (payload) => rpc("chat:enrichUserLineForImages", payload),
    openExternal: (url) => rpc("shell:openExternal", url),
    launchDesktopApp: (opts?: { browserUrl?: string; browserHostOnly?: boolean; mode?: string }) =>
      rpc("shell:launchDesktopApp", opts ?? {}),
    consumePendingDesktopBrowser: () => rpc("shell:consumePendingDesktopBrowser"),
    onDesktopOpenBrowser: (fn: (detail: { url?: string }) => void) =>
      onBridgeEvent("desktop:openBrowser", fn as (detail: unknown) => void),
    restartClaudeCodeDesktop: () => rpc("claude-code:restartDesktop"),
    claudeCodeCliStatus: () => rpc("claude-code:cliStatus"),
    claudeCodeDoctor: () => rpc("claude-code:doctor"),
    claudeProjectsListRecent: (opts) => rpc("claude-projects:listRecent", opts),
    claudeProjectsUsageSummary: (opts) => rpc("claude-projects:usageSummary", opts),
    getUsageSummary: (opts) => rpc("usage:getSummary", opts),
    rebuildUsageStats: () => rpc("usage:rebuild"),
    mcpHealthCheckAll: () => rpc("mcp:healthCheckAll"),
    mcpHealthCheckOne: (name) => rpc("mcp:healthCheckOne", { name }),
    mcpGetHealthSnapshot: () => rpc("mcp:getHealthSnapshot"),
    claudeCodeCliUpdate: () => rpc("claude-code:cliUpdate"),
    workbenchGitStatus: () => rpc("workbench-git:status"),
    workbenchGitCheckUpstream: (payload?: { upstreamGithubRepo?: string }) =>
      rpc("workbench-git:checkUpstream", payload ? [payload] : []),
    workbenchGitPullUpstream: (payload?: { upstreamGithubRepo?: string }) =>
      rpc("workbench-git:pullUpstream", payload ? [payload] : []),
    workbenchGitPullPersonal: (payload?: { personalGithubRepo?: string }) =>
      rpc("workbench-git:pullPersonal", payload ? [payload] : []),
    workbenchGitDeployPersonal: (payload?: { overwrite?: boolean }) =>
      rpc("workbench-git:deployPersonal", payload ? [payload] : []),
    workbenchGitPushPersonal: (payload) => rpc("workbench-git:pushPersonal", payload ?? {}),
    workbenchGitCommitBranch: (payload) => rpc("workbench-git:commitBranch", payload ?? {}),
    workbenchGitSaveGithubSettings: (body) => rpc("workbench-git:saveGithubSettings", body),
    chooseClaudeCliExecutable: () => rpc("claude-code:chooseCliExecutable"),
    claudeCodeRunChainStep: (payload) => rpc("claude-code:runChainStep", payload),
    getLocalWallClock: () => rpc("system:localWallClock"),
    readClaudeAgentMarkdown: (basename) => rpc("claudeAgents:readMarkdown", basename),
    readClaudeSkillMarkdown: (basename) => rpc("claudeSkills:readMarkdown", basename),
    saveClaudeSkillMarkdown: (body) => rpc("claudeSkills:saveMarkdown", body),
    syncAgentSkillsFromGithub: (body) => rpc("agents:syncSkillsFromGithub", body ? [body] : []),
    readClaudeDotfileMarkdown: (basename) => rpc("claudeDotfiles:readMarkdown", basename),
    listClaudeAgentMarkdown: () => rpc("claudeAgents:listMarkdown"),
    openClaudeUserSubdir: (which) => rpc("claude:openUserSubdir", which),
    createClaudeAgentMarkdown: (stem) => rpc("claudeAgents:createMarkdown", stem),
    saveClaudeAgentMarkdown: (body) => rpc("claudeAgents:saveMarkdown", body),
    setClaudeAgentMarkdownEnabled: (body) => rpc("claudeAgents:setMarkdownEnabled", body),
    openClaudeAgentMarkdownFile: (basename) => rpc("claudeAgents:openMarkdownFile", basename),
    listClaudeSkillMarkdown: () => rpc("claudeSkills:listMarkdown"),
    setClaudeSkillMarkdownEnabled: (body) => rpc("claudeSkills:setMarkdownEnabled", body),
    readClaudeConfigJson: (name) => rpc("claudeConfig:readJson", name),
    bundledMcpCommandLines: () => rpc("claudeConfig:bundledMcpCommandLines"),
    upsertClaudeMcpServer: (payload) => rpc("claudeConfig:upsertMcpServer", payload),
    removeClaudeMcpServer: (name) => rpc("claudeConfig:removeMcpServer", { name }),
    setClaudeMcpServerEnabled: (payload) => rpc("claudeConfig:setMcpServerEnabled", payload),
    peekWorkspaceMcp: () => rpc("claudeConfig:peekWorkspaceMcp"),
    importWorkspaceMcp: () => rpc("claudeConfig:importWorkspaceMcp"),
    orchestrationLoadChain: () => rpc("orchestration:loadChain"),
    orchestrationAdvanceChain: () => rpc("orchestration:advanceChain"),
    orchestrationSaveChain: (payload) => rpc("orchestration:saveChain", payload),
    orchestrationClearChain: () => rpc("orchestration:clearChain"),
    orchestrationListChains: () => rpc("orchestration:listChains"),
    orchestrationEnsureOfficialChains: (payload) =>
      rpc("orchestration:ensureOfficialChains", payload),
    orchestrationListChainsForAgent: (agentStem) =>
      rpc("orchestration:listChainsForAgent", agentStem),
    orchestrationGetChain: (id) => rpc("orchestration:getChain", { id }),
    orchestrationCreateChain: (payload) => rpc("orchestration:createChain", payload),
    orchestrationUpdateChain: (payload) => rpc("orchestration:updateChain", payload),
    orchestrationDeleteChain: (id) => rpc("orchestration:deleteChain", { id }),
    orchestrationActivateChain: (id) => rpc("orchestration:activateChain", { id }),
    orchestrationToggleChainEnabled: (payload) => rpc("orchestration:toggleChainEnabled", payload),
    orchestrationStartChainRun: (payload?: { pinnedSessionId?: string }) =>
      rpc("orchestration:startChainRun", payload),
    orchestrationStopChainRun: () => rpc("orchestration:stopChainRun"),
    orchestrationGetChainRunStatus: () => rpc("orchestration:getChainRunStatus"),
    multiAgentExecuteDelegation: (payload) => rpc("multi-agent:executeDelegation", payload),
    multiAgentExecuteParallel: (payload) => rpc("multi-agent:executeParallel", payload),
    agentOsMetaAnalyze: () => rpc("agent-os:metaAnalyze"),
    agentOsWorkflowRun: (payload) => rpc("agent-os:workflowRun", payload),
    agentOsQualityReport: () => rpc("agent-os:qualityReport"),
    agentOsRuntimeVersion: () => rpc("agent-os:runtimeVersion"),
    memoryAppendEvent: (payload) => rpc("memory:appendEvent", payload),
    scheduledTasksGet: () => rpc("scheduled-tasks:get"),
    scheduledTasksSave: (tasks) => rpc("scheduled-tasks:save", tasks),
    scheduledTasksRunNow: (taskId) => rpc("scheduled-tasks:runNow", taskId),
    logsReadTail: (opts) => rpc("logs:readTail", opts),
    logsOverviewSnapshot: () => rpc("logs:overviewSnapshot"),
    logsClear: () => rpc("logs:clear"),
    logsAppend: (opts) => rpc("logs:append", opts),
    agentDailyReportsListDates: () => rpc("agent-daily-reports:listDates"),
    agentDailyReportsListAgents: (date) => rpc("agent-daily-reports:listAgents", date),
    agentDailyReportsListAgentRegistry: (date) =>
      rpc("agent-daily-reports:listAgentRegistry", date),
    agentDailyReportsGet: (payload) => rpc("agent-daily-reports:get", payload),
    agentDailyReportsSave: (payload) => rpc("agent-daily-reports:save", payload),
    agentDailyReportsBuildFromEvents: (payload) =>
      rpc("agent-daily-reports:buildFromEvents", payload),
    agentDailyReportsGenerate: (payload) => rpc("agent-daily-reports:generate", payload),
    dailyReportsList: () => rpc("daily-reports:list"),
    dailyReportsGet: (date) => rpc("daily-reports:get", date),
    dailyReportsSave: (payload) => rpc("daily-reports:save", payload),
    dailyReportsTemplate: () => rpc("daily-reports:template"),
    claudeMemoryTodayEventsSummary: (date) => rpc("claude-memory:todayEventsSummary", date),
    claudeLogsBundleMarkdown: (opts) => rpc("claude-logs:bundleMarkdown", opts),
    readAgentExecutionLog: (stem) => rpc("agentExecution:readTail", stem),
    onSchedulerToast: (fn) => onBridgeEvent("scheduler:toast", fn),
    onScheduledTasksChanged: (fn) => onBridgeEvent("scheduled-tasks:changed", fn),
    onAgentExecChanged: (fn) => onBridgeEvent("agent-exec:changed", fn),
    onChatSessionsChanged: (fn) => onBridgeEvent("chat-sessions:changed", fn),
    onChatSettingsChanged: (fn) => onBridgeEvent("chat-settings:changed", fn),
    onMcpHealthChanged: (fn) => onBridgeEvent("mcp-health:changed", fn),
    onOrchestrationChainStatus: (fn) => onBridgeEvent("orchestration:chain-status", fn),
    getOpenclawGatewayToken: () =>
      Promise.resolve({ ok: false, error: "未配置", token: undefined }),
    fileStat: (relPath) => rpc("workspace:fileStat", relPath),
    buildGraph: () => rpc("workspace:buildGraph"),
    buildStatusViz: () => rpc("workspace:buildStatusViz"),
    nodeStatus: () => rpc("workspace:nodeStatus"),
    graphDecomposeAndExecute: (payload) => rpc("graph:decomposeAndExecute", payload),
    logout: () => rpc("reset:logout"),
  };
  return desktop;
}

/** Electron preload 保留的原生能力（勿被相对路径 RPC 覆盖） */
const ELECTRON_NATIVE_DESKTOP_KEYS = ["chooseReferenceFiles"] as const;

/**
 * contextBridge / 宿主环境可能把 window.desktop 做成只读；
 * 禁止 `window.desktop = …` 硬赋值，改为就地合并或 defineProperty。
 */
function attachDesktopApi(api: DesktopApi): void {
  const prev = window.desktop;
  const desc = Object.getOwnPropertyDescriptor(window, "desktop");
  const canReassign =
    !desc || (desc.writable === true && desc.configurable !== false);

  if (prev && typeof prev === "object") {
    try {
      Object.assign(prev, api);
      return;
    } catch {
      /* frozen proxy：继续尝试重挂 */
    }
  }

  if (canReassign) {
    try {
      window.desktop = api;
      return;
    } catch {
      /* fall through */
    }
  }

  try {
    Object.defineProperty(window, "desktop", {
      value: api,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch {
    // 宿主完全锁死时挂旁路，getDesktop 仍读 window.desktop；至少不抛 Unhandled Rejection
    (window as Window & { __DESKTOP_API_FALLBACK__?: DesktopApi }).__DESKTOP_API_FALLBACK__ =
      api;
  }
}

export function installDesktopBridge() {
  if (typeof window === "undefined") return;

  const rpcApi = createDesktopRpcApi();

  if (window.__ELECTRON_DESKTOP__) {
    const native: Partial<DesktopApi> = {};
    const prev = window.desktop;
    if (prev) {
      for (const k of ELECTRON_NATIVE_DESKTOP_KEYS) {
        if (typeof prev[k] === "function") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (native as any)[k] = prev[k].bind(prev);
        }
      }
    }
    attachDesktopApi(Object.assign({}, prev || {}, rpcApi, native) as DesktopApi);
    return;
  }

  if (window.desktop) {
    attachDesktopApi(rpcApi);
    return;
  }

  window.__WEB_BRIDGE__ = true;
  attachDesktopApi(rpcApi);
  installEmbeddedBrowserBridge();
  connectBridgeEvents();
}

/** HMR 时补全 window.desktop 上新增的 API（避免旧实例缺少新方法） */
if (import.meta.hot) {
  import.meta.hot.accept();
  if (typeof window !== "undefined" && window.desktop) {
    installDesktopBridge();
  }
}

export { onBridgeEvent } from "@/lib/bridge-events";
