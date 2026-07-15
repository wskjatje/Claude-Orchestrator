/**
 * Electron preload：暴露 window.desktop（与 web/src/types/desktop.d.ts 对齐）
 * 不设置 __WEB_BRIDGE__，以便前端识别为桌面客户端。
 */
const { contextBridge, ipcRenderer } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const bridgeConstantsUrl = pathToFileURL(
  path.join(__dirname, '../server/bridge-constants.mjs'),
).href
const bridgeConstantsPromise = import(bridgeConstantsUrl)

let WS_URL = null
async function getWsUrl() {
  if (WS_URL) return WS_URL
  const bc = await bridgeConstantsPromise
  WS_URL = bc.getBridgeWsUrl()
  return WS_URL
}

let rpcBaseCache = null

async function getRpcBase() {
  if (rpcBaseCache) return rpcBaseCache
  const bc = await bridgeConstantsPromise
  rpcBaseCache = bc.getUiProxyRpcUrl()
  return rpcBaseCache
}

async function rpc(channel, ...args) {
  const bc = await bridgeConstantsPromise
  const RPC_BASE = await getRpcBase()
  let res
  try {
    res = await fetch(RPC_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, args }),
    })
  } catch (e) {
    throw new Error(bc.normalizeRpcErrorMessage(e instanceof Error ? e.message : String(e)))
  }
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
    throw new Error(bc.normalizeRpcErrorMessage(err))
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return bc.normalizeRpcPayload(data)
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
  const connect = async () => {
    try {
      const url = await getWsUrl()
      ws = new WebSocket(url)
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
        setTimeout(() => {
          void connect()
        }, 3000)
      }
    } catch {
      setTimeout(() => {
        void connect()
      }, 3000)
    }
  }
  void connect()
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
  workspaceGetGitCommitLog: (limit?: number) => rpc('workspace:getGitCommitLog', limit != null ? { limit } : {}),
  workspaceGetGitDiff: () => rpc('workspace:getGitDiff'),
  workspaceGetGitDiffVsBase: (payload) => rpc('workspace:getGitDiffVsBase', payload ?? {}),
  workspaceGitCommit: (payload) => rpc('workspace:gitCommit', payload),
  workspaceGitRemoteSync: (payload) => rpc('workspace:gitRemoteSync', payload),
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
  cloudProvidersStatus: () => rpc('cloud-providers:status'),
  cloudProvidersListProviders: () => rpc('cloud-providers:listProviders'),
  cloudProvidersGetModelPools: () => rpc('cloud-providers:getModelPools'),
  cloudProvidersUpsertProvider: (body) => rpc('cloud-providers:upsertProvider', body),
  cloudProvidersDeleteProvider: (body) => rpc('cloud-providers:deleteProvider', body),
  cloudProvidersSetCurrentProvider: (body) => rpc('cloud-providers:setCurrentProvider', body),
  cloudProvidersSyncWorkbench: () => rpc('cloud-providers:syncWorkbench'),
  cloudProvidersRefreshCloudModels: (opts) => rpc('cloud-providers:refreshCloudModels', opts),
  cloudProvidersProviderNeedsCcr: (opts) => rpc('cloud-providers:providerNeedsCcr', opts),
  cloudProvidersListKnownProviders: () => rpc('cloud-providers:listKnownProviders'),
  cloudProvidersFetchProviderModels: (body) => rpc('cloud-providers:fetchProviderModels', body),
  readReferenceFilesAsImageAttachments: (filePaths) =>
    rpc('reference-files:readAsImageAttachments', filePaths),
  saveChatImageAttachments: (attachments) => rpc('chat:saveImageAttachments', attachments),
  enrichChatUserLineForImages: (payload) => rpc('chat:enrichUserLineForImages', payload),
  openExternal: (url) => rpc('shell:openExternal', url),
  launchDesktopApp: (opts) => rpc('shell:launchDesktopApp', opts ?? {}),
  consumePendingDesktopBrowser: () => rpc('shell:consumePendingDesktopBrowser'),
  onDesktopOpenBrowser: (fn) => onEvent('desktop:openBrowser', fn),
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
  workbenchGitCommitBranch: (payload) => rpc('workbench-git:commitBranch', payload ?? {}),
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
  fileStat: (relPath) => rpc('workspace:fileStat', relPath),
  buildGraph: () => rpc('workspace:buildGraph'),
  buildStatusViz: () => rpc('workspace:buildStatusViz'),
  nodeStatus: () => rpc('workspace:nodeStatus'),
  graphDecomposeAndExecute: (payload) => rpc('graph:decomposeAndExecute', payload),
  logout: () => rpc('reset:logout'),

  envDeployCheck: () => rpc('env:deployCheck'),
  envDeployInstall: () => rpc('env:deployInstall'),
  envDeployVerify: () => rpc('env:deployVerify'),
}

function onEmbeddedBrowserEvent(channel, fn) {
  const handler = (_event, detail) => fn(detail)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const embeddedBrowser = {
  create: (tabId) => ipcRenderer.invoke('embedded-browser:create', tabId),
  destroy: (tabId) => ipcRenderer.invoke('embedded-browser:destroy', tabId),
  setLayout: (tabId, layout) => ipcRenderer.invoke('embedded-browser:setLayout', tabId, layout),
  focus: (tabId) => ipcRenderer.invoke('embedded-browser:focus', tabId),
  loadURL: (tabId, url) => ipcRenderer.invoke('embedded-browser:loadURL', tabId, url),
  reload: (tabId) => ipcRenderer.invoke('embedded-browser:reload', tabId),
  goBack: (tabId) => ipcRenderer.invoke('embedded-browser:goBack', tabId),
  goForward: (tabId) => ipcRenderer.invoke('embedded-browser:goForward', tabId),
  canNav: (tabId) => ipcRenderer.invoke('embedded-browser:canNav', tabId),
  openDevTools: (tabId) => ipcRenderer.invoke('embedded-browser:openDevTools', tabId),
  setPickerActive: (tabId, active) => ipcRenderer.invoke('embedded-browser:setPickerActive', tabId, active),
  onNavigated: (fn) => onEmbeddedBrowserEvent('embedded-browser:navigated', fn),
  onDomReady: (fn) => onEmbeddedBrowserEvent('embedded-browser:dom-ready', fn),
  onLoadingState: (fn) => onEmbeddedBrowserEvent('embedded-browser:loading-state', fn),
  onLoadFailed: (fn) => onEmbeddedBrowserEvent('embedded-browser:load-failed', fn),
  onTitleUpdated: (fn) => onEmbeddedBrowserEvent('embedded-browser:title-updated', fn),
  onElementPicked: (fn) => onEmbeddedBrowserEvent('embedded-browser:element-picked', fn),
}

contextBridge.exposeInMainWorld('__ELECTRON_DESKTOP__', true)
contextBridge.exposeInMainWorld('desktop', desktop)
contextBridge.exposeInMainWorld('embeddedBrowser', embeddedBrowser)
connectBridgeEvents()
