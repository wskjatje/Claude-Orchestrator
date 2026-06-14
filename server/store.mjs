import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_CLAUDE_CLI,
  DEFAULT_WORKSPACE,
  LEGACY_DATA_DIR,
  PROJECT_DATA_DIR,
  PROJECT_DB_PATH,
  ensureProjectDataDir,
  globalDefaultModel,
  orchestrationChainPath,
} from './paths.mjs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const projectDb = require('./project-db.cjs')

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

function db() {
  ensureProjectDataDir()
  if (!migrationDone) {
    const conn = projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR)
    const orch = orchestrationChainPath()
    projectDb.ensureMigrated(conn, PROJECT_DB_PATH, PROJECT_DATA_DIR, LEGACY_DATA_DIR, orch.primary)
    migrationDone = true
  }
  return projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR)
}

const CLAUDE_CODE_MODEL_ALIASES = ['sonnet', 'opus', 'haiku']

function defaultChatSettings() {
  return {
    ollamaBase: 'http://127.0.0.1:11434',
    model: globalDefaultModel(),
    localOllamaModel: 'qwen2.5-coder:14b',
    claudeCliPath: DEFAULT_CLAUDE_CLI,
    orchestrationMode: 'claude-code',
    localAgentBasename: 'product-manager.md',
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
  }
}

function defaultUiPrefs() {
  return {
    themeMode: 'system',
    bridgeUrl: '',
    /** 仅保存在项目 SQLite，不上传 */
    localSecret: '',
    defaultSessionTag: 'claude:main',
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
    return { ...defaults, ...data }
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
      typeof body?.localAgentBasename === 'string' && body.localAgentBasename.trim()
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
  }
  projectDb.saveKv(db(), KV.chatSettings, next)
  return next
}

/** 推送到个人 GitHub 前清空模型/会话/工作区历史等本地配置（保留 CLI 路径与 GitHub 地址） */
export function resetPersonalWorkbenchData() {
  const cur = loadChatSettings()
  const defaults = defaultChatSettings()
  saveChatSettings({
    ...defaults,
    claudeCliPath: cur.claudeCliPath,
    orchestrationMode: cur.orchestrationMode,
    personalGithubRepo: cur.personalGithubRepo || '',
    gitUserName: cur.gitUserName || '',
    gitUserEmail: cur.gitUserEmail || '',
    upstreamGithubRepo: cur.upstreamGithubRepo || defaults.upstreamGithubRepo,
    devMcpOrchDebug: false,
  })
  saveChatSessions(defaultChatSessions())
  clearWorkspaceHistory()
  try {
    projectDb.saveKv(db(), 'agent_exec_registry', { version: 1, days: {} })
  } catch {
    /* ignore */
  }
  return { ok: true }
}

export function loadChatSessions() {
  const defaults = defaultChatSessions()
  try {
    const data = projectDb.loadKv(db(), KV.chatSessions, null)
    if (!data || !Array.isArray(data.sessions) || !data.sessions.length) return defaults
    if (data.version >= 2 && data.activeByWorkspace && typeof data.activeByWorkspace === 'object') {
      return {
        version: 2,
        activeId: data.activeId || data.sessions[0].id,
        activeByWorkspace: data.activeByWorkspace,
        sessions: data.sessions,
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
    }
  } catch {
    return defaults
  }
}

export function saveChatSessions(payload) {
  try {
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : []
    const activeId =
      typeof payload?.activeId === 'string' && payload.activeId.trim()
        ? payload.activeId.trim()
        : sessions[0]?.id
    const activeByWorkspace =
      payload?.activeByWorkspace && typeof payload.activeByWorkspace === 'object'
        ? payload.activeByWorkspace
        : { '': activeId }
    projectDb.saveKv(db(), KV.chatSessions, {
      version: 2,
      activeId,
      activeByWorkspace,
      sessions,
    })
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
    return {
      themeMode,
      bridgeUrl: typeof data.bridgeUrl === 'string' ? data.bridgeUrl.trim() : defaults.bridgeUrl,
      localSecret:
        typeof data.localSecret === 'string' ? data.localSecret.slice(0, 500) : defaults.localSecret,
      defaultSessionTag:
        typeof data.defaultSessionTag === 'string' && data.defaultSessionTag.trim()
          ? data.defaultSessionTag.trim().slice(0, 120)
          : defaults.defaultSessionTag,
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
