import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_CLAUDE_CLI,
  DEFAULT_WORKSPACE,
  LEGACY_DATA_DIR,
  PROJECT_DATA_DIR,
  PROJECT_DB_PATH,
  appLogFilePath,
  dailyReportsDir,
  ensureProjectDataDir,
  globalDefaultModel,
  orchestrationChainPath,
} from './paths.mjs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const projectDb = require('./project-db.cjs')
const usageStats = require('./usage-stats.cjs')

const KV = {
  workspace: 'workspace',
  workspaceHistory: 'workspace_history',
  chatSettings: 'chat_settings',
  chatSessions: 'chat_sessions',
  scheduledTasks: 'scheduled_tasks',
  uiPrefs: 'ui_prefs',
}

const MAX_WORKSPACE_HISTORY = 30

let migrationDone = false

function readJsonFileIfExists(filePath) {
  return projectDb.readJsonFileIfExists(filePath)
}

function countSessionMessages(sessions) {
  if (!Array.isArray(sessions)) return 0
  return sessions.reduce(
    (n, s) => n + (Array.isArray(s?.history) ? s.history.length : 0),
    0,
  )
}

function countUserMessages(hist) {
  return (Array.isArray(hist) ? hist : []).filter((m) => m?.role === 'user').length
}

function lastUserMessageTs(hist) {
  const h = Array.isArray(hist) ? hist : []
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i]?.role === 'user') return h[i].ts ?? 0
  }
  return 0
}

/** 落盘前合并，避免空数组或未 hydrate 的 UI 覆盖已有聊天记录 */
function mergeSessionsOnSave(incoming, existing) {
  const localById = new Map((Array.isArray(incoming) ? incoming : []).map((s) => [s.id, s]))
  const merged = []
  for (const d of Array.isArray(existing) ? existing : []) {
    const l = localById.get(d.id)
    if (!l) {
      merged.push(d)
      continue
    }
    const lHist = Array.isArray(l.history) ? l.history : []
    const dHist = Array.isArray(d.history) ? d.history : []
    const keepLocal =
      lHist.length > dHist.length ||
      countUserMessages(lHist) > countUserMessages(dHist) ||
      (lHist.length === dHist.length && lastUserMessageTs(lHist) >= lastUserMessageTs(dHist))
    merged.push(
      keepLocal
        ? { ...d, ...l, title: d.title || l.title, history: lHist }
        : { ...l, ...d, modelId: d.modelId || l.modelId, history: dHist },
    )
    localById.delete(d.id)
  }
  for (const l of localById.values()) merged.push(l)
  return merged
}

function normalizeComposerDrafts(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [sessionId, draft] of Object.entries(raw)) {
    if (typeof sessionId !== 'string' || !sessionId.trim() || !draft || typeof draft !== 'object') continue
    const input = typeof draft.input === 'string' ? draft.input.slice(0, 50_000) : ''
    const pendingImages = Array.isArray(draft.pendingImages)
      ? draft.pendingImages.slice(0, 12).map((img) => ({
          kind: img?.kind === 'image' ? 'image' : 'image',
          name: typeof img?.name === 'string' ? img.name.slice(0, 500) : '',
          mime: typeof img?.mime === 'string' ? img.mime.slice(0, 120) : '',
          dataUrl: typeof img?.dataUrl === 'string' ? img.dataUrl.slice(0, 2_000_000) : '',
          id: typeof img?.id === 'string' ? img.id.slice(0, 80) : '',
        }))
      : []
    const pendingTerminalSnippets = Array.isArray(draft.pendingTerminalSnippets)
      ? draft.pendingTerminalSnippets.slice(0, 20).map((sn) => ({
          id: typeof sn?.id === 'string' ? sn.id.slice(0, 80) : '',
          text: typeof sn?.text === 'string' ? sn.text.slice(0, 20_000) : '',
          sourceLabel: typeof sn?.sourceLabel === 'string' ? sn.sourceLabel.slice(0, 200) : '',
          startLine: typeof sn?.startLine === 'number' ? sn.startLine : undefined,
          endLine: typeof sn?.endLine === 'number' ? sn.endLine : undefined,
        }))
      : []
    if (!input && !pendingImages.length && !pendingTerminalSnippets.length) continue
    out[sessionId.trim().slice(0, 120)] = { input, pendingImages, pendingTerminalSnippets }
  }
  return out
}

function normalizeChatSessionsPayload(raw) {
  const sessions = Array.isArray(raw?.sessions) ? raw.sessions : []
  const activeId =
    typeof raw?.activeId === 'string' && raw.activeId.trim()
      ? raw.activeId.trim()
      : sessions[0]?.id || `s-${Date.now()}`
  const activeByWorkspace =
    raw?.activeByWorkspace && typeof raw.activeByWorkspace === 'object'
      ? raw.activeByWorkspace
      : { '': activeId }
  return {
    version: 2,
    activeId,
    activeByWorkspace,
    sessions: sessions.map((s) => ({
      ...s,
      workspacePath: s?.workspacePath ?? null,
    })),
    composerDrafts: normalizeComposerDrafts(raw?.composerDrafts),
  }
}

/** 将 ~/.claude-workbench 旧 JSON 与会话工作区路径补进 SQLite（一次性/增量） */
function ensureWorkbenchDataMigrated(conn) {
  const legacySessionsPath = path.join(LEGACY_DATA_DIR, 'chat-sessions.json')
  const legacyRaw = readJsonFileIfExists(legacySessionsPath)
  const currentRaw = projectDb.loadKv(conn, KV.chatSessions, null)

  let sessionsPayload = currentRaw
  if (legacyRaw && Array.isArray(legacyRaw.sessions) && legacyRaw.sessions.length) {
    const legacyCount = countSessionMessages(legacyRaw.sessions)
    const currentCount = countSessionMessages(currentRaw?.sessions)
    const currentEmpty = !currentRaw || !Array.isArray(currentRaw.sessions) || !currentRaw.sessions.length
    if (currentEmpty || legacyCount > currentCount) {
      sessionsPayload = normalizeChatSessionsPayload(legacyRaw)
      projectDb.saveKv(conn, KV.chatSessions, sessionsPayload)
    }
  }

  const historyEntries = readWorkspaceHistoryRaw()
  if (!historyEntries.length) {
    const sessions = Array.isArray(sessionsPayload?.sessions) ? sessionsPayload.sessions : []
    const seen = new Set()
    const seeded = []
    for (const s of sessions) {
      const wp = typeof s?.workspacePath === 'string' ? s.workspacePath.trim() : ''
      if (!wp) continue
      try {
        const resolved = path.resolve(wp)
        if (seen.has(resolved) || !fs.existsSync(resolved)) continue
        seen.add(resolved)
        const entry = normalizeWorkspaceHistoryEntry({ path: resolved, openedAt: Date.now() })
        if (entry) seeded.push(entry)
      } catch {
        /* ignore */
      }
    }
    const curWs = loadWorkspace()
    if (curWs) {
      const entry = normalizeWorkspaceHistoryEntry({ path: curWs, openedAt: Date.now() })
      if (entry && !seen.has(entry.path)) seeded.unshift(entry)
    }
    if (seeded.length) saveWorkspaceHistoryEntries(seeded)
  }
}

function db() {
  ensureProjectDataDir()
  if (!migrationDone) {
    const conn = projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR)
    const orch = orchestrationChainPath()
    projectDb.ensureMigrated(conn, PROJECT_DB_PATH, PROJECT_DATA_DIR, LEGACY_DATA_DIR, orch.primary)
    migrationDone = true
    ensureWorkbenchDataMigrated(conn)
  }
  return projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR)
}

const CLAUDE_CODE_MODEL_ALIASES = ['sonnet', 'opus', 'haiku']

function defaultChatSettings() {
  return {
    ollamaBase: 'http://127.0.0.1:11434',
    model: 'auto',
    localOllamaModel: 'qwen2.5-coder:14b',
    claudeCliPath: DEFAULT_CLAUDE_CLI,
    orchestrationMode: 'claude-code',
    localAgentBasename: '',
    defaultConfirmWritePath: 'docs/prd.md',
    mcpConfigAbsolutePath: '',
    devMcpOrchDebug: false,
    cloudModelCatalog: [],
    localModelCatalog: [],
    cloudProviderCatalog: [],
    tokenPricing: {},
    /** 个人 fork：push 与个人 pull 共用（origin） */
    personalGithubRepo: '',
    /** Git 提交身份：push / 个人 pull 共用 */
    gitUserName: '',
    gitUserEmail: '',
    /** 官方 upstream，仅官方 path-scoped pull */
    upstreamGithubRepo: 'https://github.com/anthropics/claude-code.git',
    /** 上次 path-scoped 同步时的 upstream commit（用于检测官方更新） */
    lastUpstreamSyncSha: '',
  }
}

function defaultUiPrefs() {
  return {
    themeMode: 'system',
    bridgeUrl: '',
    /** 仅保存在项目 SQLite，不上传 */
    localSecret: '',
    defaultSessionTag: 'claude:main',
    /** react-resizable-panels 布局 JSON，key → value */
    layoutStorage: {},
    skipCheckpointConfirm: false,
    defaultTerminalShell: 'zsh',
  }
}

function defaultChatSessions() {
  const id = `s-${Date.now()}`
  return {
    activeId: id,
    sessions: [
      {
        id,
        title: '新对话',
        modelId: globalDefaultModel(),
        history: [],
      },
    ],
  }
}

export function loadWorkspace() {
  try {
    const raw = projectDb.loadKv(db(), KV.workspace, null)
    if (!raw || typeof raw.workspace !== 'string') return null
    return raw.workspace.trim() || null
  } catch {
    return null
  }
}

export function saveWorkspace(dir) {
  projectDb.saveKv(db(), KV.workspace, { workspace: dir ? String(dir) : null })
}

function defaultWorkspaceHistory() {
  return { version: 1, entries: [] }
}

function normalizeWorkspaceHistoryEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const p = typeof raw.path === 'string' ? raw.path.trim() : ''
  if (!p) return null
  try {
    const resolved = path.resolve(p)
    if (!fs.existsSync(resolved)) return null
    return {
      path: resolved,
      openedAt: typeof raw.openedAt === 'number' && raw.openedAt > 0 ? raw.openedAt : Date.now(),
    }
  } catch {
    return null
  }
}

function readWorkspaceHistoryRaw() {
  try {
    const data = projectDb.loadKv(db(), KV.workspaceHistory, null)
    if (!data || !Array.isArray(data.entries)) return []
    return data.entries.map(normalizeWorkspaceHistoryEntry).filter(Boolean)
  } catch {
    return []
  }
}

/** 最近打开的工作区列表（SQLite kv，跨项目全局） */
export function loadWorkspaceHistory() {
  try {
    let entries = readWorkspaceHistoryRaw()
    if (!entries.length) {
      const current = loadWorkspace()
      const seeded = normalizeWorkspaceHistoryEntry({ path: current, openedAt: Date.now() })
      if (seeded) {
        entries = [seeded]
        saveWorkspaceHistoryEntries(entries)
      }
    }
    return { version: 1, entries }
  } catch {
    return defaultWorkspaceHistory()
  }
}

function saveWorkspaceHistoryEntries(entries) {
  const next = {
    version: 1,
    entries: entries.slice(0, MAX_WORKSPACE_HISTORY),
  }
  projectDb.saveKv(db(), KV.workspaceHistory, next)
  return next
}

/** 当前工作区若尚未在列表中则追加（不每次 get 都置顶） */
export function ensureWorkspaceInHistory(dir) {
  const entry = normalizeWorkspaceHistoryEntry({ path: dir, openedAt: Date.now() })
  if (!entry) return loadWorkspaceHistory()
  const entries = readWorkspaceHistoryRaw()
  if (entries.some((e) => e.path === entry.path)) {
    return { version: 1, entries }
  }
  return saveWorkspaceHistoryEntries([entry, ...entries])
}

/** 记录一次打开（去重后置顶） */
export function recordWorkspaceOpen(dir) {
  const entry = normalizeWorkspaceHistoryEntry({ path: dir, openedAt: Date.now() })
  if (!entry) return loadWorkspaceHistory()
  const filtered = readWorkspaceHistoryRaw().filter((e) => e.path !== entry.path)
  return saveWorkspaceHistoryEntries([entry, ...filtered])
}

export function removeWorkspaceHistoryEntry(dir) {
  let resolved = ''
  try {
    resolved = path.resolve(String(dir || '').trim())
  } catch {
    return loadWorkspaceHistory()
  }
  if (!resolved) return loadWorkspaceHistory()
  return saveWorkspaceHistoryEntries(
    readWorkspaceHistoryRaw().filter((e) => e.path !== resolved),
  )
}

export function clearWorkspaceHistory() {
  return saveWorkspaceHistoryEntries([])
}

export function loadChatSettings() {
  const defaults = defaultChatSettings()
  try {
    const data = projectDb.loadKv(db(), KV.chatSettings, null)
    if (!data || typeof data !== 'object') return defaults
    const merged = { ...defaults, ...data }
    const legacyAgent = String(merged.localAgentBasename || '')
      .trim()
      .toLowerCase()
    if (legacyAgent === 'product-manager.md' || legacyAgent === 'product-manager') {
      merged.localAgentBasename = ''
      if (legacyAgent) {
        projectDb.saveKv(db(), KV.chatSettings, { ...data, localAgentBasename: '' })
      }
    }
    return merged
  } catch {
    return defaults
  }
}

export function saveChatSettings(body) {
  const cur = loadChatSettings()
  const next = {
    ollamaBase:
      typeof body?.ollamaBase === 'string' && body.ollamaBase.trim()
        ? body.ollamaBase.trim().replace(/\/$/, '')
        : cur.ollamaBase,
    model:
      typeof body?.model === 'string' && body.model.trim() ? body.model.trim() : cur.model,
    localOllamaModel:
      typeof body?.localOllamaModel === 'string'
        ? body.localOllamaModel.trim().slice(0, 200)
        : cur.localOllamaModel,
    claudeCliPath:
      typeof body?.claudeCliPath === 'string' ? body.claudeCliPath.trim() : cur.claudeCliPath,
    orchestrationMode:
      body?.orchestrationMode === 'local-mcp' ? 'local-mcp' : 'claude-code',
    localAgentBasename:
      typeof body?.localAgentBasename === 'string'
        ? body.localAgentBasename.trim().slice(0, 200)
        : cur.localAgentBasename,
    defaultConfirmWritePath:
      typeof body?.defaultConfirmWritePath === 'string' && body.defaultConfirmWritePath.trim()
        ? body.defaultConfirmWritePath.trim().replace(/^[/\\]+/, '').slice(0, 400)
        : cur.defaultConfirmWritePath,
    mcpConfigAbsolutePath:
      typeof body?.mcpConfigAbsolutePath === 'string'
        ? body.mcpConfigAbsolutePath.trim().slice(0, 2000)
        : cur.mcpConfigAbsolutePath,
    devMcpOrchDebug: body?.devMcpOrchDebug === true,
    cloudModelCatalog: Array.isArray(body?.cloudModelCatalog)
      ? [...new Set(body.cloudModelCatalog.map((m) => String(m || '').trim()).filter(Boolean))]
      : cur.cloudModelCatalog || [],
    localModelCatalog: Array.isArray(body?.localModelCatalog)
      ? [...new Set(body.localModelCatalog.map((m) => String(m || '').trim()).filter(Boolean))]
      : cur.localModelCatalog || [],
    cloudProviderCatalog: Array.isArray(body?.cloudProviderCatalog)
      ? [...new Set(body.cloudProviderCatalog.map((id) => String(id || '').trim()).filter(Boolean))]
      : cur.cloudProviderCatalog || [],
    personalGithubRepo:
      typeof body?.personalGithubRepo === 'string'
        ? body.personalGithubRepo.trim().slice(0, 500)
        : cur.personalGithubRepo || '',
    gitUserName:
      typeof body?.gitUserName === 'string'
        ? body.gitUserName.trim().slice(0, 200)
        : cur.gitUserName || '',
    gitUserEmail:
      typeof body?.gitUserEmail === 'string'
        ? body.gitUserEmail.trim().slice(0, 320)
        : cur.gitUserEmail || '',
    upstreamGithubRepo:
      typeof body?.upstreamGithubRepo === 'string' && body.upstreamGithubRepo.trim()
        ? body.upstreamGithubRepo.trim().slice(0, 500)
        : cur.upstreamGithubRepo || defaultChatSettings().upstreamGithubRepo,
    lastUpstreamSyncSha:
      typeof body?.lastUpstreamSyncSha === 'string'
        ? body.lastUpstreamSyncSha.trim().slice(0, 64)
        : cur.lastUpstreamSyncSha || '',
  }
  projectDb.saveKv(db(), KV.chatSettings, next)
  return next
}

/** 推送到个人 GitHub 前清空本地敏感数据（保留 GitHub 身份与 CLI 路径） */
export function resetPersonalWorkbenchData() {
  const cur = loadChatSettings()
  const defaults = defaultChatSettings()
  const curUi = loadUiPrefs()
  const uiDefaults = defaultUiPrefs()

  saveChatSettings({
    ...defaults,
    claudeCliPath: cur.claudeCliPath,
    orchestrationMode: cur.orchestrationMode,
    personalGithubRepo: cur.personalGithubRepo || '',
    gitUserName: cur.gitUserName || '',
    gitUserEmail: cur.gitUserEmail || '',
    upstreamGithubRepo: cur.upstreamGithubRepo || defaults.upstreamGithubRepo,
    lastUpstreamSyncSha: cur.lastUpstreamSyncSha || '',
    devMcpOrchDebug: false,
  })
  saveChatSessions(defaultChatSessions())
  saveWorkspace(null)
  clearWorkspaceHistory()
  saveUiPrefs({
    themeMode: curUi.themeMode,
    bridgeUrl: uiDefaults.bridgeUrl,
    localSecret: uiDefaults.localSecret,
    defaultSessionTag: uiDefaults.defaultSessionTag,
    layoutStorage: curUi.layoutStorage,
    skipCheckpointConfirm: uiDefaults.skipCheckpointConfirm,
    defaultTerminalShell: curUi.defaultTerminalShell,
  })
  saveScheduledTasks([])
  try {
    const conn = db()
    conn.prepare('DELETE FROM log_entries').run()
  } catch {
    /* ignore */
  }
  try {
    projectDb.saveKv(db(), 'cloud_providers', { version: 1, currentProviderId: '', providers: {} })
  } catch {
    /* ignore */
  }
  try {
    projectDb.saveKv(db(), 'usage_stats_registry', { version: 1, days: {}, lastBuiltAt: null })
  } catch {
    /* ignore */
  }
  try {
    projectDb.saveKv(db(), 'mcp_health_snapshot', {
      version: 1,
      configPath: '',
      checkedAt: null,
      servers: {},
    })
  } catch {
    /* ignore */
  }
  try {
    projectDb.saveKv(db(), 'agent_exec_registry', { version: 1, days: {} })
  } catch {
    /* ignore */
  }
  try {
    const reportsDir = dailyReportsDir()
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true })
    }
  } catch {
    /* ignore */
  }
  try {
    const { primary } = orchestrationChainPath()
    if (fs.existsSync(primary)) {
      fs.unlinkSync(primary)
    }
  } catch {
    /* ignore */
  }
  try {
    const logPath = appLogFilePath()
    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '', 'utf8')
    }
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    cleared: [
      '云/本地模型与供应商（含 SQLite cloud_providers）',
      '全部聊天会话与草稿',
      '当前工作区路径与打开记录',
      'Bridge 令牌与本机密钥',
      '定时任务',
      'Agent 执行统计与智能体执行日报',
      '应用日志与用量统计',
      'MCP 健康检查快照',
      '任务链运行进度（任务链定义保留，供导出后推送）',
    ],
  }
}

export function loadChatSessions() {
  const defaults = defaultChatSessions()
  try {
    const data = projectDb.loadKv(db(), KV.chatSessions, null)
    if (!data || !Array.isArray(data.sessions) || !data.sessions.length) {
      return { ...defaults, composerDrafts: {} }
    }
    const composerDrafts = normalizeComposerDrafts(data.composerDrafts)
    if (data.version >= 2 && data.activeByWorkspace && typeof data.activeByWorkspace === 'object') {
      return {
        version: 2,
        activeId: data.activeId || data.sessions[0].id,
        activeByWorkspace: data.activeByWorkspace,
        sessions: data.sessions,
        composerDrafts,
      }
    }
    const activeId = data.activeId || data.sessions[0].id
    return {
      version: 2,
      activeId,
      activeByWorkspace: { '': activeId },
      sessions: data.sessions.map((s) => ({
        ...s,
        workspacePath: s?.workspacePath ?? null,
      })),
      composerDrafts,
    }
  } catch {
    return { ...defaults, composerDrafts: {} }
  }
}

export function saveChatSessions(payload) {
  try {
    const cur = loadChatSessions()
    const incoming = Array.isArray(payload?.sessions) ? payload.sessions : null
    let sessions = incoming ?? cur.sessions
    if (incoming) {
      const curHasHistory = countSessionMessages(cur.sessions) > 0
      const incomingHasHistory = countSessionMessages(incoming) > 0
      if (!incoming.length && curHasHistory) {
        sessions = cur.sessions
      } else if (incoming.length && cur.sessions?.length) {
        sessions = mergeSessionsOnSave(incoming, cur.sessions)
      }
      if (!incomingHasHistory && curHasHistory && countSessionMessages(sessions) === 0) {
        sessions = cur.sessions
      }
    }
    const activeId =
      typeof payload?.activeId === 'string' && payload.activeId.trim()
        ? payload.activeId.trim()
        : cur.activeId || sessions[0]?.id
    const activeByWorkspace =
      payload?.activeByWorkspace && typeof payload.activeByWorkspace === 'object'
        ? payload.activeByWorkspace
        : cur.activeByWorkspace || { '': activeId }
    const composerDrafts =
      payload?.composerDrafts && typeof payload.composerDrafts === 'object'
        ? normalizeComposerDrafts(payload.composerDrafts)
        : cur.composerDrafts || {}
    projectDb.saveKv(db(), KV.chatSessions, {
      version: 2,
      activeId,
      activeByWorkspace,
      sessions,
      composerDrafts,
    })
    try {
      const settings = loadChatSettings()
      usageStats.rebuildFromSessions(sessions, {
        tokenPricing: settings.tokenPricing || {},
        cloudModelCatalog: settings.cloudModelCatalog || [],
      })
    } catch {
      /* 用量统计失败不阻断会话保存 */
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
}

export function loadScheduledTasks() {
  try {
    const data = projectDb.loadKv(db(), KV.scheduledTasks, { version: 1, tasks: [] })
    const list = Array.isArray(data?.tasks) ? data.tasks : []
    return list
  } catch {
    return []
  }
}

export function saveScheduledTasks(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  projectDb.saveKv(db(), KV.scheduledTasks, { version: 1, tasks: list })
  return { ok: true, tasks: list }
}

export function loadUiPrefs() {
  const defaults = defaultUiPrefs()
  try {
    const data = projectDb.loadKv(db(), KV.uiPrefs, null)
    if (!data || typeof data !== 'object') return defaults
    const themeMode =
      data.themeMode === 'light' || data.themeMode === 'dark' || data.themeMode === 'system'
        ? data.themeMode
        : defaults.themeMode
    const layoutStorage =
      data.layoutStorage && typeof data.layoutStorage === 'object' && !Array.isArray(data.layoutStorage)
        ? Object.fromEntries(
            Object.entries(data.layoutStorage)
              .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
              .map(([k, v]) => [k.slice(0, 200), v.slice(0, 20_000)]),
          )
        : defaults.layoutStorage
    const defaultTerminalShell =
      data.defaultTerminalShell === 'bash' || data.defaultTerminalShell === 'zsh'
        ? data.defaultTerminalShell
        : defaults.defaultTerminalShell
    return {
      themeMode,
      bridgeUrl: typeof data.bridgeUrl === 'string' ? data.bridgeUrl.trim() : defaults.bridgeUrl,
      localSecret:
        typeof data.localSecret === 'string' ? data.localSecret.slice(0, 500) : defaults.localSecret,
      defaultSessionTag:
        typeof data.defaultSessionTag === 'string' && data.defaultSessionTag.trim()
          ? data.defaultSessionTag.trim().slice(0, 120)
          : defaults.defaultSessionTag,
      layoutStorage,
      skipCheckpointConfirm: data.skipCheckpointConfirm === true,
      defaultTerminalShell,
    }
  } catch {
    return defaults
  }
}

export function saveUiPrefs(body) {
  const cur = loadUiPrefs()
  const themeMode =
    body?.themeMode === 'light' || body?.themeMode === 'dark' || body?.themeMode === 'system'
      ? body.themeMode
      : cur.themeMode
  const layoutStorage =
    body?.layoutStorage && typeof body.layoutStorage === 'object' && !Array.isArray(body.layoutStorage)
      ? Object.fromEntries(
          Object.entries(body.layoutStorage)
            .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
            .map(([k, v]) => [k.slice(0, 200), v.slice(0, 20_000)]),
        )
      : cur.layoutStorage
  const defaultTerminalShell =
    body?.defaultTerminalShell === 'bash' || body?.defaultTerminalShell === 'zsh'
      ? body.defaultTerminalShell
      : cur.defaultTerminalShell
  const next = {
    themeMode,
    bridgeUrl:
      typeof body?.bridgeUrl === 'string' ? body.bridgeUrl.trim().slice(0, 500) : cur.bridgeUrl,
    localSecret:
      typeof body?.localSecret === 'string' ? body.localSecret.slice(0, 500) : cur.localSecret,
    defaultSessionTag:
      typeof body?.defaultSessionTag === 'string' && body.defaultSessionTag.trim()
        ? body.defaultSessionTag.trim().slice(0, 120)
        : cur.defaultSessionTag,
    layoutStorage,
    skipCheckpointConfirm:
      typeof body?.skipCheckpointConfirm === 'boolean'
        ? body.skipCheckpointConfirm
        : cur.skipCheckpointConfirm,
    defaultTerminalShell,
  }
  projectDb.saveKv(db(), KV.uiPrefs, next)
  return next
}

export function getWorkspaceCwd() {
  const w = loadWorkspace()
  if (w) {
    try {
      const resolved = path.resolve(w)
      if (fs.existsSync(resolved)) return resolved
    } catch {
      /* ignore */
    }
  }
  if (fs.existsSync(DEFAULT_WORKSPACE)) return path.resolve(DEFAULT_WORKSPACE)
  return process.cwd()
}

export function ensureDefaultWorkspace() {
  let w = loadWorkspace()
  if (!w || !fs.existsSync(w)) {
    w = fs.existsSync(DEFAULT_WORKSPACE) ? DEFAULT_WORKSPACE : process.cwd()
    saveWorkspace(w)
  }
  return w
}

export function getProjectDbInfo() {
  ensureProjectDataDir()
  return {
    dbPath: PROJECT_DB_PATH,
    dataDir: PROJECT_DATA_DIR,
    legacyDir: LEGACY_DATA_DIR,
  }
}

export { CLAUDE_CODE_MODEL_ALIASES }
