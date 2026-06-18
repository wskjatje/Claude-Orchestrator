/**
 * 浏览器模式下注入 window.desktop，通过本机 Web Bridge RPC 调用 Claude Code CLI。
 * 需先启动：npm run bridge（或 npm run web:dev:full）
 */
import type { DesktopApi } from '@/types/desktop'
import { appendOutput } from '@/lib/workbench-output-log'
import { RPC_CONNECTION_ERROR, RPC_CONNECTION_TIMEOUT_HINT } from '@/lib/ui-copy'

const RPC_BASE = '/api'

const QUIET_RPC = new Set([
  'workspace:get',
  'workspace:history:get',
  'workspace:listPanelTree',
  'workspace:getShellSnapshot',
  'workspace:getGitDiff',
  'ui-prefs:get',
  'chat-settings:get',
  'chat-sessions:get',
  'claude-code:cliStatus',
  'cc-switch:status',
  'system:localWallClock',
])

async function rpc<T>(channel: string, ...args: unknown[]): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${RPC_BASE}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, args }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    appendOutput('bridge', `RPC ${channel} 不可达: ${msg}`)
    const hint =
      /fetch failed|ECONNREFUSED|ETIMEDOUT|socket hang up|network/i.test(msg)
        ? `（${RPC_CONNECTION_TIMEOUT_HINT}）`
        : ""
    throw new Error(`${RPC_CONNECTION_ERROR(msg)}${hint}`)
  }
  const text = await res.text()
  let data: unknown = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) {
    const errObj = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : text
    appendOutput('bridge', `RPC ${channel} 失败 (${res.status}): ${errObj || text}`)
    throw new Error(errObj || `RPC ${channel} failed (${res.status})`)
  }
  if (!QUIET_RPC.has(channel)) {
    appendOutput('bridge', `RPC ${channel} 完成`)
  }
  return data as T
}

export async function pingWebBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${RPC_BASE}/health`, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}

type EventHandler = (detail: unknown) => void
const eventHandlers = new Map<string, Set<EventHandler>>()

function onEvent(channel: string, fn: EventHandler) {
  if (!eventHandlers.has(channel)) eventHandlers.set(channel, new Set())
  eventHandlers.get(channel)!.add(fn)
  return () => eventHandlers.get(channel)?.delete(fn)
}

/** 订阅 Bridge WebSocket 推送（如 message_delta 流式输出） */
export function onBridgeEvent(channel: string, fn: EventHandler) {
  return onEvent(channel, fn)
}

function connectBridgeEvents() {
  if (typeof window === 'undefined') return
  const wsUrl =
    (import.meta.env.VITE_BRIDGE_WS_URL as string | undefined) || 'ws://127.0.0.1:18789'
  try {
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type?: string
          channel?: string
          detail?: unknown
        }
        if (msg.type === 'event' && msg.channel) {
          eventHandlers.get(msg.channel)?.forEach((fn) => fn(msg.detail))
        }
      } catch {
        /* ignore */
      }
    }
    ws.onclose = () => {
      window.setTimeout(connectBridgeEvents, 3000)
    }
  } catch {
    window.setTimeout(connectBridgeEvents, 3000)
  }
}

export function installDesktopBridge() {
  if (typeof window === 'undefined') return
  if (window.__ELECTRON_DESKTOP__) return

  const desktop: DesktopApi = {
    getWorkspace: () => rpc('workspace:get'),
    chooseWorkspace: (manualPath?: string) =>
      rpc('workspace:choose', typeof manualPath === 'string' ? manualPath : undefined),
    getWorkspaceHistory: () => rpc('workspace:history:get'),
    removeWorkspaceHistoryEntry: (path: string) => rpc('workspace:history:remove', path),
    clearWorkspaceHistory: () => rpc('workspace:history:clear'),
    chooseReferenceFiles: () => rpc('dialog:chooseReferenceFiles'),
    clearWorkspace: () => rpc('workspace:clear'),
    workspaceApplyWriteFence: (items) => rpc('workspace:applyWriteFence', items),
    workspaceIngestFromAssistantText: (payload) =>
      rpc('workspace:ingestFromAssistantText', payload),
    workspaceBulkIngestFromHistory: (payload) =>
      rpc('workspace:bulkIngestFromHistory', payload),
    workspaceStartPreview: (payload) => rpc('workspace:startPreview', payload),
    workspaceStopPreview: () => rpc('workspace:stopPreview'),
    workspaceGetPreviewStatus: () => rpc('workspace:getPreviewStatus'),
    workspaceDetectRunPlan: (payload) => rpc('workspace:detectRunPlan', payload),
    workspaceGetExecutionSnapshot: () => rpc('workspace:getExecutionSnapshot'),
    readWorkspaceTextFile: (relPath) => rpc('workspace:readTextFile', relPath),
    workspaceLintFiles: (relPaths, mode) => rpc('workspace:lintFiles', relPaths, mode),
    listWorkspaceMarkdownFiles: () => rpc('workspace:listMarkdownFiles'),
    listWorkspacePanelTree: () => rpc('workspace:listPanelTree'),
    workspaceGetShellSnapshot: () => rpc('workspace:getShellSnapshot'),
    workspaceGetGitDiff: () => rpc('workspace:getGitDiff'),
    onWorkspaceChanged: (fn) => onEvent('workspace:changed', fn as EventHandler),
    getCrossAgentContext: () => rpc('memory:getCrossAgentContextText'),
    getChatSettings: () => rpc('chat-settings:get'),
    saveChatSettings: (body) => rpc('chat-settings:save', body),
    getUiPrefs: () => rpc('ui-prefs:get'),
    saveUiPrefs: (body) => rpc('ui-prefs:save', body),
    getProjectDbInfo: () => rpc('project-db:info'),
    loadChatSessions: () => rpc('chat-sessions:get'),
    saveChatSessions: (payload) => rpc('chat-sessions:save', payload),
    listOllamaModels: (base) => rpc('ollama:listModels', base),
    claudeCodePrompt: (payload) => rpc('claude-code:prompt', payload),
    claudeCodeAbort: (requestId) => rpc('claude-code:abort', requestId),
    localOrchestrationPrompt: (payload) => rpc('local-orchestration:prompt', payload),
    localOrchestrationAbort: (requestId) => rpc('local-orchestration:abort', requestId),
    claudeCodeListModels: () => rpc('claude-code:listModels'),
    ccSwitchStatus: () => rpc('cc-switch:status'),
    ccSwitchListProviders: () => rpc('cc-switch:listProviders'),
    ccSwitchUpsertProvider: (body) => rpc('cc-switch:upsertProvider', body),
    ccSwitchDeleteProvider: (body) => rpc('cc-switch:deleteProvider', body),
    ccSwitchSetCurrentProvider: (body) => rpc('cc-switch:setCurrentProvider', body),
    ccSwitchSyncWorkbench: () => rpc('cc-switch:syncWorkbench'),
    ccSwitchRefreshCloudModels: (opts) => rpc('cc-switch:refreshCloudModels', opts),
    readReferenceFilesAsImageAttachments: (filePaths) =>
      rpc('reference-files:readAsImageAttachments', filePaths),
    saveChatImageAttachments: (attachments) => rpc('chat:saveImageAttachments', attachments),
    enrichChatUserLineForImages: (payload) => rpc('chat:enrichUserLineForImages', payload),
    openExternal: (url) => rpc('shell:openExternal', url),
    restartClaudeCodeDesktop: () => rpc('claude-code:restartDesktop'),
    claudeCodeCliStatus: () => rpc('claude-code:cliStatus'),
    claudeCodeDoctor: () => rpc('claude-code:doctor'),
    claudeProjectsListRecent: (opts) => rpc('claude-projects:listRecent', opts),
    claudeProjectsUsageSummary: (opts) => rpc('claude-projects:usageSummary', opts),
    getUsageSummary: (opts) => rpc('usage:getSummary', opts),
    rebuildUsageStats: () => rpc('usage:rebuild'),
    mcpHealthCheckAll: () => rpc('mcp:healthCheckAll'),
    mcpHealthCheckOne: (name) => rpc('mcp:healthCheckOne', { name }),
    mcpGetHealthSnapshot: () => rpc('mcp:getHealthSnapshot'),
    claudeCodeCliUpdate: () => rpc('claude-code:cliUpdate'),
    workbenchGitStatus: () => rpc('workbench-git:status'),
    workbenchGitCheckUpstream: (payload?: { upstreamGithubRepo?: string }) =>
      rpc('workbench-git:checkUpstream', payload ? [payload] : []),
    workbenchGitPullUpstream: (payload?: { upstreamGithubRepo?: string }) =>
    rpc('workbench-git:pullUpstream', payload ? [payload] : []),
    workbenchGitPullPersonal: (payload?: { personalGithubRepo?: string }) =>
      rpc('workbench-git:pullPersonal', payload ? [payload] : []),
    workbenchGitDeployPersonal: (payload?: { overwrite?: boolean }) =>
      rpc('workbench-git:deployPersonal', payload ? [payload] : []),
    workbenchGitPushPersonal: (payload) => rpc('workbench-git:pushPersonal', payload ?? {}),
    workbenchGitSaveGithubSettings: (body) => rpc('workbench-git:saveGithubSettings', body),
    chooseClaudeCliExecutable: () => rpc('claude-code:chooseCliExecutable'),
    claudeCodeRunChainStep: (payload) => rpc('claude-code:runChainStep', payload),
    getLocalWallClock: () => rpc('system:localWallClock'),
    readClaudeAgentMarkdown: (basename) => rpc('claudeAgents:readMarkdown', basename),
    readClaudeSkillMarkdown: (basename) => rpc('claudeSkills:readMarkdown', basename),
    saveClaudeSkillMarkdown: (body) => rpc('claudeSkills:saveMarkdown', body),
    syncAgentSkillsFromGithub: (body) => rpc('agents:syncSkillsFromGithub', body ? [body] : []),
    readClaudeDotfileMarkdown: (basename) => rpc('claudeDotfiles:readMarkdown', basename),
    listClaudeAgentMarkdown: () => rpc('claudeAgents:listMarkdown'),
    openClaudeUserSubdir: (which) => rpc('claude:openUserSubdir', which),
    createClaudeAgentMarkdown: (stem) => rpc('claudeAgents:createMarkdown', stem),
    saveClaudeAgentMarkdown: (body) => rpc('claudeAgents:saveMarkdown', body),
    openClaudeAgentMarkdownFile: (basename) =>
      rpc('claudeAgents:openMarkdownFile', basename),
    listClaudeSkillMarkdown: () => rpc('claudeSkills:listMarkdown'),
    readClaudeConfigJson: (name) => rpc('claudeConfig:readJson', name),
    bundledMcpCommandLines: () => rpc('claudeConfig:bundledMcpCommandLines'),
    upsertClaudeMcpServer: (payload) => rpc('claudeConfig:upsertMcpServer', payload),
    removeClaudeMcpServer: (name) => rpc('claudeConfig:removeMcpServer', { name }),
    setClaudeMcpServerEnabled: (payload) => rpc('claudeConfig:setMcpServerEnabled', payload),
    orchestrationLoadChain: () => rpc('orchestration:loadChain'),
    orchestrationAdvanceChain: () => rpc('orchestration:advanceChain'),
    orchestrationSaveChain: (payload) => rpc('orchestration:saveChain', payload),
    orchestrationClearChain: () => rpc('orchestration:clearChain'),
    orchestrationListChains: () => rpc('orchestration:listChains'),
    orchestrationEnsureOfficialChains: (payload) => rpc('orchestration:ensureOfficialChains', payload),
    orchestrationListChainsForAgent: (agentStem) => rpc('orchestration:listChainsForAgent', agentStem),
    orchestrationGetChain: (id) => rpc('orchestration:getChain', { id }),
    orchestrationCreateChain: (payload) => rpc('orchestration:createChain', payload),
    orchestrationUpdateChain: (payload) => rpc('orchestration:updateChain', payload),
    orchestrationDeleteChain: (id) => rpc('orchestration:deleteChain', { id }),
    orchestrationActivateChain: (id) => rpc('orchestration:activateChain', { id }),
    orchestrationToggleChainEnabled: (payload) => rpc('orchestration:toggleChainEnabled', payload),
    orchestrationStartChainRun: (payload?: { pinnedSessionId?: string }) =>
      rpc('orchestration:startChainRun', payload),
    orchestrationStopChainRun: () => rpc('orchestration:stopChainRun'),
    orchestrationGetChainRunStatus: () => rpc('orchestration:getChainRunStatus'),
    multiAgentExecuteDelegation: (payload) =>
      rpc('multi-agent:executeDelegation', payload),
    agentOsMetaAnalyze: () => rpc('agent-os:metaAnalyze'),
    agentOsWorkflowRun: (payload) => rpc('agent-os:workflowRun', payload),
    agentOsQualityReport: () => rpc('agent-os:qualityReport'),
    agentOsRuntimeVersion: () => rpc('agent-os:runtimeVersion'),
    memoryAppendEvent: (payload) => rpc('memory:appendEvent', payload),
    scheduledTasksGet: () => rpc('scheduled-tasks:get'),
    scheduledTasksSave: (tasks) => rpc('scheduled-tasks:save', tasks),
    scheduledTasksRunNow: (taskId) => rpc('scheduled-tasks:runNow', taskId),
    logsReadTail: (opts) => rpc('logs:readTail', opts),
    logsOverviewSnapshot: () => rpc('logs:overviewSnapshot'),
    logsClear: () => rpc('logs:clear'),
    agentDailyReportsListDates: () => rpc('agent-daily-reports:listDates'),
    agentDailyReportsListAgents: (date) => rpc('agent-daily-reports:listAgents', date),
    agentDailyReportsListAgentRegistry: (date) => rpc('agent-daily-reports:listAgentRegistry', date),
    agentDailyReportsGet: (payload) => rpc('agent-daily-reports:get', payload),
    agentDailyReportsSave: (payload) => rpc('agent-daily-reports:save', payload),
    agentDailyReportsBuildFromEvents: (payload) => rpc('agent-daily-reports:buildFromEvents', payload),
    agentDailyReportsGenerate: (payload) => rpc('agent-daily-reports:generate', payload),
    dailyReportsList: () => rpc('daily-reports:list'),
    dailyReportsGet: (date) => rpc('daily-reports:get', date),
    dailyReportsSave: (payload) => rpc('daily-reports:save', payload),
    dailyReportsTemplate: () => rpc('daily-reports:template'),
    claudeMemoryTodayEventsSummary: (date) => rpc('claude-memory:todayEventsSummary', date),
    claudeLogsBundleMarkdown: (opts) => rpc('claude-logs:bundleMarkdown', opts),
    readAgentExecutionLog: (stem) => rpc('agentExecution:readTail', stem),
    onSchedulerToast: (fn) => onEvent('scheduler:toast', fn as EventHandler),
    onScheduledTasksChanged: (fn) => onEvent('scheduled-tasks:changed', fn as EventHandler),
    onAgentExecChanged: (fn) => onEvent('agent-exec:changed', fn as EventHandler),
    onChatSessionsChanged: (fn) => onEvent('chat-sessions:changed', fn as EventHandler),
    onChatSettingsChanged: (fn) => onEvent('chat-settings:changed', fn as EventHandler),
    onOrchestrationChainStatus: (fn) => onEvent('orchestration:chain-status', fn as EventHandler),
    getOpenclawGatewayToken: () =>
      Promise.resolve({ ok: false, error: '未配置', token: undefined }),
    logout: () => rpc('reset:logout'),
  }

  if (window.desktop) {
    Object.assign(window.desktop, desktop)
    return
  }

  window.__WEB_BRIDGE__ = true
  window.desktop = desktop
  connectBridgeEvents()
}

/** HMR 时补全 window.desktop 上新增的 API（避免旧实例缺少新方法） */
if (import.meta.hot) {
  import.meta.hot.accept()
  if (typeof window !== 'undefined' && window.desktop) {
    installDesktopBridge()
  }
}
