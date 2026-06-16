/**
 * Electron preload：暴露 window.desktop（与 web/src/types/desktop.d.ts 对齐）
 * 不设置 __WEB_BRIDGE__，以便前端识别为桌面客户端。
 */
const { contextBridge, ipcRenderer } = require('electron')

const RPC_BASE = 'http://127.0.0.1:18790/rpc'
const WS_URL = 'ws://127.0.0.1:18789'

async function rpc(channel, ...args) {
  const res = await fetch(RPC_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, args }),
  })
  const text = await res.text()
  let data = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* plain text */
  }
  if (!res.ok) {
    const err =
      data && typeof data === 'object' && data.error
        ? String(data.error)
        : text || `RPC ${channel} failed (${res.status})`
    throw new Error(err)
  }
  return data
}

const eventHandlers = new Map()

function onEvent(channel, fn) {
  if (!eventHandlers.has(channel)) eventHandlers.set(channel, new Set())
  eventHandlers.get(channel).add(fn)
  return () => eventHandlers.get(channel)?.delete(fn)
}

function connectBridgeEvents() {
  let ws
  const connect = () => {
    try {
      ws = new WebSocket(WS_URL)
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data))
          if (msg.type === 'event' && msg.channel) {
            eventHandlers.get(msg.channel)?.forEach((fn) => fn(msg.detail))
          }
        } catch {
          /* ignore */
        }
      }
      ws.onclose = () => {
        setTimeout(connect, 3000)
      }
    } catch {
      setTimeout(connect, 3000)
    }
  }
  connect()
}

const desktop = {
  getWorkspace: () => rpc('workspace:get'),
  chooseWorkspace: (manualPath) =>
    rpc('workspace:choose', typeof manualPath === 'string' ? manualPath : undefined),
  getWorkspaceHistory: () => rpc('workspace:history:get'),
  removeWorkspaceHistoryEntry: (p) => rpc('workspace:history:remove', p),
  clearWorkspaceHistory: () => rpc('workspace:history:clear'),
  chooseReferenceFiles: (opts) => ipcRenderer.invoke('dialog:chooseReferenceFiles', opts || {}),
  clearWorkspace: () => rpc('workspace:clear'),
  workspaceApplyWriteFence: (items) => rpc('workspace:applyWriteFence', items),
  workspaceIngestFromAssistantText: (payload) => rpc('workspace:ingestFromAssistantText', payload),
  workspaceBulkIngestFromHistory: (payload) => rpc('workspace:bulkIngestFromHistory', payload),
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
  onWorkspaceChanged: (fn) => onEvent('workspace:changed', fn),
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
  workbenchGitCheckUpstream: (payload) =>
    rpc('workbench-git:checkUpstream', payload ? [payload] : []),
  workbenchGitPullUpstream: (payload) =>
    rpc('workbench-git:pullUpstream', payload ? [payload] : []),
  workbenchGitPullPersonal: (payload) =>
    rpc('workbench-git:pullPersonal', payload ? [payload] : []),
  workbenchGitDeployPersonal: (payload) =>
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
  openClaudeAgentMarkdownFile: (basename) => rpc('claudeAgents:openMarkdownFile', basename),
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
  orchestrationStartChainRun: (payload) => rpc('orchestration:startChainRun', payload),
  orchestrationStopChainRun: () => rpc('orchestration:stopChainRun'),
  orchestrationGetChainRunStatus: () => rpc('orchestration:getChainRunStatus'),
  multiAgentExecuteDelegation: (payload) => rpc('multi-agent:executeDelegation', payload),
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
  onSchedulerToast: (fn) => onEvent('scheduler:toast', fn),
  onScheduledTasksChanged: (fn) => onEvent('scheduled-tasks:changed', fn),
  onAgentExecChanged: (fn) => onEvent('agent-exec:changed', fn),
  onChatSessionsChanged: (fn) => onEvent('chat-sessions:changed', fn),
  onChatSettingsChanged: (fn) => onEvent('chat-settings:changed', fn),
  onOrchestrationChainStatus: (fn) => onEvent('orchestration:chain-status', fn),
  getOpenclawGatewayToken: () => Promise.resolve({ ok: false, error: '未配置', token: undefined }),
  logout: () => rpc('reset:logout'),
}

contextBridge.exposeInMainWorld('__ELECTRON_DESKTOP__', true)
contextBridge.exposeInMainWorld('desktop', desktop)
connectBridgeEvents()
