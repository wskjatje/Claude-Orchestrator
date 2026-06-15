import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  CLAUDE_CODE_MODEL_ALIASES,
  ensureDefaultWorkspace,
  getProjectDbInfo,
  loadChatSessions,
  loadChatSettings,
  loadScheduledTasks,
  loadUiPrefs,
  loadWorkspace,
  loadWorkspaceHistory,
  ensureWorkspaceInHistory,
  recordWorkspaceOpen,
  removeWorkspaceHistoryEntry,
  clearWorkspaceHistory,
  saveChatSessions,
  saveChatSettings,
  saveScheduledTasks,
  saveUiPrefs,
  saveWorkspace,
} from './store.mjs'
import {
  abortClaudeCode,
  claudeCliStatus,
  runClaudeCodePrint,
  runClaudeDoctor,
} from './claude-cli.mjs'
import {
  checkUpstreamUpdates,
  getWorkbenchGitStatus,
  pullClaudeCodeFromGithub,
  pullFromPersonalGithub,
  pushClaudeCodeToPersonalGithub,
  savePersonalGithubSettings,
} from './workbench-git-sync.mjs'
import {
  aggregateClaudeProjectUsage,
  listRecentClaudeProjectSessions,
} from './claude-projects.mjs'
import {
  checkAllMcpServersAndPersist,
  checkOneMcpServerAndPersist,
  loadMcpHealthSnapshot,
  mcpConfigPathFromSettings,
  resolvedMcpConfigFile,
} from './mcp-health-persist.mjs'
import {
  buildMcpServerConfig,
  bundledMcpPresetCommandLines,
  readMcpConfigFile,
  removeMcpServer,
  setMcpServerEnabled,
  upsertMcpServer,
} from './claude-mcp-config.mjs'
import { formatUsd } from './token-pricing.mjs'
import { gitDiff, listPanelTree, readTextFile, shellSnapshot } from './workspace.mjs'
import { lintWorkspaceFiles } from './workspace-lint.mjs'
import { pickFolderNative } from './native-dialog.mjs'
import { startTaskScheduler } from './scheduler.mjs'
import {
  appLogFilePath,
  dailyReportsDir,
  orchestrationChainPath,
  readGlobalClaudeEnv,
  scheduledTasksPath,
} from './paths.mjs'

const require = createRequire(import.meta.url)
const cadBridge = require('./cad-bridge.cjs')
const ccSwitch = require('./cc-switch.cjs')
const projectLogs = require('./project-logs.cjs')
const agentExecRegistry = require('./agent-exec-registry.cjs')
const usageStats = require('./usage-stats.cjs')

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/** @type {Map<string, Set<(detail: unknown) => void>>} */
const eventSubs = new Map()

export function subscribeEvent(channel, fn) {
  if (!eventSubs.has(channel)) eventSubs.set(channel, new Set())
  eventSubs.get(channel).add(fn)
  return () => eventSubs.get(channel)?.delete(fn)
}

export function broadcast(channel, detail) {
  const subs = eventSubs.get(channel)
  if (!subs) return
  for (const fn of subs) {
    try {
      fn(detail)
    } catch {
      /* ignore */
    }
  }
}

cadBridge.init({
  loadWorkspace,
  loadChatSettings,
  loadChatSessions,
  saveChatSessions: (payload) => {
    const r = saveChatSessions(payload)
    broadcast('chat-sessions:changed', payload || {})
    return r
  },
  loadScheduledTasks,
  saveScheduledTasks,
  runClaudeCodePrint,
  broadcast,
  appLogFilePath,
  scheduledTasksPath,
  dailyReportsDir,
  orchestrationChainPath,
})

function appendBridgeAppLog(message) {
  try {
    const p = appLogFilePath()
    const ts = new Date().toISOString()
    const line = `[${ts}] ${String(message).replace(/\r?\n/g, ' ')}`
    if (p) {
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.appendFileSync(p, `${line}\n`, 'utf8')
    }
    projectLogs.appendLogEntry({ ts, message: String(message), source: 'app' })
  } catch {
    /* ignore */
  }
}

startTaskScheduler({
  loadScheduledTasks: () => cadBridge.listScheduledTasks(),
  runScheduledTaskWithMeta: cadBridge.runScheduledTaskWithMeta,
  appendAppLog: appendBridgeAppLog,
})

agentExecRegistry.reconcileWorkingOnStartup()

/** @type {Record<string, (...args: unknown[]) => Promise<unknown>>} */
export const handlers = {
  'workspace:get': async () => {
    const w = loadWorkspace() ?? ensureDefaultWorkspace()
    if (w) ensureWorkspaceInHistory(w)
    return w
  },

  'workspace:choose': async (args) => {
    const manual = typeof args?.[0] === 'string' ? args[0].trim() : ''
    const dir = manual || pickFolderNative() || ''
    if (!dir) return null
    if (!fs.existsSync(dir)) {
      throw new Error(`路径不存在：${dir}`)
    }
    const resolved = path.resolve(dir)
    saveWorkspace(resolved)
    recordWorkspaceOpen(resolved)
    broadcast('workspace:changed', { workspace: resolved })
    return resolved
  },

  'workspace:history:get': async () => loadWorkspaceHistory(),

  'workspace:history:remove': async (args) => {
    const target = typeof args?.[0] === 'string' ? args[0] : ''
    return removeWorkspaceHistoryEntry(target)
  },

  'workspace:history:clear': async () => clearWorkspaceHistory(),

  'workspace:clear': async () => {
    saveWorkspace(null)
    broadcast('workspace:changed', { workspace: null })
    return null
  },

  'workspace:listPanelTree': async () => listPanelTree(),
  'workspace:readTextFile': async (args) => readTextFile(args?.[0]),
  'workspace:lintFiles': async (args) =>
    lintWorkspaceFiles(args?.[0], { mode: args?.[1] === 'open' ? 'open' : 'full' }),
  'workspace:getShellSnapshot': async () => shellSnapshot(),
  'workspace:getGitDiff': async () => gitDiff(),

  'chat-settings:get': async () => loadChatSettings(),
  'chat-settings:save': async (args) => {
    const next = saveChatSettings(args?.[0])
    broadcast('chat-settings:changed', {})
    return next
  },

  'ui-prefs:get': async () => ({ ok: true, prefs: loadUiPrefs() }),
  'ui-prefs:save': async (args) => {
    const prefs = saveUiPrefs(args?.[0] || {})
    broadcast('chat-settings:changed', {})
    return { ok: true, prefs }
  },

  'project-db:info': async () => ({ ok: true, ...getProjectDbInfo() }),

  'chat-sessions:get': async () => loadChatSessions(),
  'chat-sessions:save': async (args) => {
    const r = saveChatSessions(args?.[0])
    broadcast('chat-sessions:changed', args?.[0] || {})
    return r
  },

  'usage:getSummary': async (args) => {
    const body = args?.[0] || {}
    const settings = loadChatSettings()
    const startMs = Number(body.startMs) > 0 ? Number(body.startMs) : 0
    const endMs = Number(body.endMs) > 0 ? Number(body.endMs) : Date.now()
    const data = usageStats.getUsageSummary({ startMs, endMs })
    const claude = aggregateClaudeProjectUsage({
      workspacePath: null,
      startMs,
      endMs,
      tokenPricing: settings.tokenPricing || {},
    })
    const sessionCloud = data.summary?.sessionCloudCostUsd ?? 0
    const cliCloud = claude.costUsd ?? 0
    const cloudCostUsd = cliCloud + sessionCloud
    const cloudTotalTok = Math.max(
      claude.totalTokens ?? 0,
      data.summary?.cloudTotalTok ?? 0,
    )
    const summary = {
      ...(data.summary || {}),
      cloudCostUsd,
      cliCostUsd: cliCloud,
      sessionCloudCostUsd: sessionCloud,
      localCostUsd: 0,
      cloudTotalTok,
      cloudTurns: Math.max(claude.turns ?? 0, data.summary?.cloudTurns ?? 0),
      cloudCostFormatted: formatUsd(cloudCostUsd),
      localCostFormatted: formatUsd(0),
    }
    return {
      ok: true,
      ...data,
      summary,
      claudeUsage: {
        inputTokens: claude.inputTokens,
        outputTokens: claude.outputTokens,
        totalTokens: claude.totalTokens,
        turns: claude.turns,
        costUsd: cliCloud,
        costUsdFormatted: formatUsd(cliCloud),
      },
    }
  },

  'usage:rebuild': async () => {
    const sess = loadChatSessions()
    const settings = loadChatSettings()
    const reg = usageStats.rebuildFromSessions(sess.sessions || [], {
      tokenPricing: settings.tokenPricing || {},
      cloudModelCatalog: settings.cloudModelCatalog || [],
    })
    return { ok: true, lastBuiltAt: reg.lastBuiltAt ?? null }
  },

  'claude-code:prompt': async (args) => {
    const p = args?.[0] || {}
    return runClaudeCodePrint({
      prompt: p.prompt,
      model: p.model,
      requestId: p.requestId,
      claudeSessionId: p.claudeSessionId,
      sessionName: p.sessionName,
      isNewClaudeSession: p.isNewClaudeSession,
    })
  },

  'claude-code:abort': async (args) => abortClaudeCode(args?.[0]),

  'claude-code:listModels': async (args) => {
    const settings = loadChatSettings()
    const fetchRemote = args?.[0]?.fetchRemote !== false
    try {
      const pool = await ccSwitch.collectCloudModelPool({
        aliases: CLAUDE_CODE_MODEL_ALIASES,
        settings,
        fetchRemote,
      })
      const env = readGlobalClaudeEnv()
      for (const k of [
        'ANTHROPIC_DEFAULT_SONNET_MODEL',
        'ANTHROPIC_DEFAULT_OPUS_MODEL',
        'ANTHROPIC_DEFAULT_HAIKU_MODEL',
      ]) {
        const m = String(env[k] || '').trim()
        if (m && m !== '#') pool.models.push(m)
      }
      const models = await ccSwitch.filterCloudModelList(
        [...new Set(pool.models)].filter((m) => m && m !== '#'),
        settings,
      )
      if (models.length) {
        const nextCatalog = await ccSwitch.filterCloudModelList(
          [...new Set([...(settings.cloudModelCatalog || []), ...models])],
          settings,
        )
        if (JSON.stringify(settings.cloudModelCatalog || []) !== JSON.stringify(nextCatalog)) {
          saveChatSettings({ ...settings, cloudModelCatalog: nextCatalog })
        }
      }
      return {
        ok: true,
        models: models.length ? models : [...CLAUDE_CODE_MODEL_ALIASES],
        providers: pool.providers,
        remoteModels: pool.remoteModels,
      }
    } catch (e) {
      const env = readGlobalClaudeEnv()
      const fromEnv = [
        env.ANTHROPIC_DEFAULT_SONNET_MODEL,
        env.ANTHROPIC_DEFAULT_OPUS_MODEL,
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
      ]
        .map((m) => String(m || '').trim())
        .filter((m) => m && m !== '#')
      const models = await ccSwitch.filterCloudModelList(
        [
          ...new Set([
            ...CLAUDE_CODE_MODEL_ALIASES,
            ...fromEnv,
            ...(settings.cloudModelCatalog || []),
            String(settings.model || '').trim(),
          ]),
        ].filter((m) => m && m !== '#'),
        settings,
      )
      return {
        ok: true,
        models: models.length ? models : [...CLAUDE_CODE_MODEL_ALIASES],
        error: e?.message || String(e),
      }
    }
  },

  'claude-code:cliStatus': async () => claudeCliStatus(),

  'claude-code:doctor': async () => runClaudeDoctor(),

  'claude-projects:listRecent': async (args) => {
    const body = args?.[0] || {}
    const workspace = typeof body.workspacePath === 'string' ? body.workspacePath : loadWorkspace()
    const limit = Number(body.limit) > 0 ? Number(body.limit) : 12
    const sessions = listRecentClaudeProjectSessions({ workspacePath: workspace, limit })
    return { ok: true, sessions }
  },

  'claude-projects:usageSummary': async (args) => {
    const body = args?.[0] || {}
    const settings = loadChatSettings()
    const workspace =
      typeof body.workspacePath === 'string' ? body.workspacePath : loadWorkspace()
    const startMs = Number(body.startMs) > 0 ? Number(body.startMs) : 0
    const endMs = Number(body.endMs) > 0 ? Number(body.endMs) : Date.now()
    const agg = aggregateClaudeProjectUsage({
      workspacePath: workspace,
      startMs,
      endMs,
      tokenPricing: settings.tokenPricing || {},
    })
    return {
      ok: true,
      ...agg,
      costUsdFormatted: formatUsd(agg.costUsd),
    }
  },

  'mcp:healthCheckAll': async () => {
    const configPath = mcpConfigPathFromSettings()
    const result = await checkAllMcpServersAndPersist(configPath)
    if (result.ok) {
      broadcast('mcp-health:changed', {
        configPath: result.path,
        okCount: result.okCount,
        total: result.total,
      })
    }
    return result
  },

  'mcp:healthCheckOne': async (args) => {
    const name = String(args?.[0]?.name || '').trim()
    if (!name) return { ok: false, error: '缺少 name' }
    const configPath = mcpConfigPathFromSettings()
    const result = await checkOneMcpServerAndPersist(configPath, name)
    if (result.ok && result.server) {
      broadcast('mcp-health:changed', { configPath: resolvedMcpConfigFile(configPath).path, name })
    }
    return result
  },

  'mcp:getHealthSnapshot': async () => {
    const configPath = mcpConfigPathFromSettings()
    const read = resolvedMcpConfigFile(configPath)
    if (!read.ok) return { ok: false, error: read.error, snapshot: null, configPath: read.path ?? null }
    const snapshot = loadMcpHealthSnapshot(read.path)
    return { ok: true, configPath: read.path, snapshot, missing: read.missing === true }
  },

  'claude-code:chooseCliExecutable': async () => ({
    ok: true,
    path: loadChatSettings().claudeCliPath || '/opt/homebrew/bin/claude',
  }),

  'claude-code:restartDesktop': async () => ({ ok: true }),

  'workbench-git:status': async () => getWorkbenchGitStatus(),

  'workbench-git:checkUpstream': async (args) => {
    const body = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
    return checkUpstreamUpdates({ upstreamGithubRepo: body.upstreamGithubRepo })
  },

  'workbench-git:pullUpstream': async (args) => {
    const body = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
    const r = await pullClaudeCodeFromGithub({
      upstreamGithubRepo: body.upstreamGithubRepo,
    })
    return r
  },

  'workbench-git:pullPersonal': async (args) => {
    const body = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
    const r = await pullFromPersonalGithub({
      personalGithubRepo: body.personalGithubRepo,
    })
    return r
  },

  'workbench-git:pushPersonal': async (args) => {
    const body = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
    const r = await pushClaudeCodeToPersonalGithub({
      reason: body.reason,
      message: body.message,
      personalGithubRepo: body.personalGithubRepo,
    })
    if (r.clearedConfig) {
      broadcast('chat-settings:changed', {})
      broadcast('chat-sessions:changed', {})
      broadcast('workspace:changed', { workspace: null })
    }
    return r
  },

  'workbench-git:saveGithubSettings': async (args) => {
    const body = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
    savePersonalGithubSettings(body)
    broadcast('chat-settings:changed', {})
    return { ok: true }
  },

  'ollama:listModels': async (args) => {
    const base = String(args?.[0] || 'http://127.0.0.1:11434').replace(/\/$/, '')
    try {
      const res = await fetch(`${base}/api/tags`)
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
      const data = await res.json()
      const models = (data.models || []).map((m) => m.name).filter(Boolean)
      return { ok: true, models }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  'system:localWallClock': async () => {
    const now = new Date()
    const tz = process.env.LOCAL_TIME_TZ || 'Asia/Shanghai'
    const full = now.toLocaleString('sv-SE', { timeZone: tz }).replace('T', ' ')
    return { ok: true, full, timezone: tz, timestamp: now.getTime() }
  },

  'shell:openExternal': async (args) => {
    const url = String(args?.[0] || '')
    if (url) {
      const { execFile } = await import('node:child_process')
      execFile('open', [url])
    }
    return { ok: true }
  },

  'claudeConfig:bundledMcpCommandLines': async () => ({
    ok: true,
    lines: bundledMcpPresetCommandLines(),
  }),

  'claudeConfig:readJson': async (args) => {
    const name = args?.[0]
    if (name !== 'mcp.json' && name !== 'settings.json') {
      return { ok: false, error: 'unsupported config' }
    }
    if (name === 'settings.json') {
      const p = path.join(os.homedir(), '.claude', name)
      try {
        if (!fs.existsSync(p)) return { ok: true, missing: true, raw: null }
        const raw = fs.readFileSync(p, 'utf8')
        return { ok: true, data: JSON.parse(raw), raw, path: p }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    }
    const settings = loadChatSettings()
    const customPath = settings.mcpConfigAbsolutePath?.trim() || ''
    const read = readMcpConfigFile(customPath)
    if (!read.ok) return { ok: false, error: read.error }
    if (read.missing) return { ok: true, missing: true, raw: null, path: read.path }
    return {
      ok: true,
      data: read.data,
      raw: read.raw,
      path: read.path,
      repaired: read.repaired === true,
      repairs: read.repairs ?? [],
      homeDir: os.homedir(),
    }
  },

  'claudeConfig:upsertMcpServer': async (args) => {
    const body = args?.[0] || {}
    const built = buildMcpServerConfig(body)
    if (!built.ok) return built
    const settings = loadChatSettings()
    const customPath = settings.mcpConfigAbsolutePath?.trim() || ''
    return upsertMcpServer(customPath, body.name, built.config)
  },

  'claudeConfig:removeMcpServer': async (args) => {
    const name = String(args?.[0]?.name || '').trim()
    if (!name) return { ok: false, error: '缺少 name' }
    const settings = loadChatSettings()
    const customPath = settings.mcpConfigAbsolutePath?.trim() || ''
    return removeMcpServer(customPath, name)
  },

  'claudeConfig:setMcpServerEnabled': async (args) => {
    const body = args?.[0] || {}
    const name = String(body.name || '').trim()
    if (!name) return { ok: false, error: '缺少 name' }
    const settings = loadChatSettings()
    const customPath = settings.mcpConfigAbsolutePath?.trim() || ''
    return setMcpServerEnabled(customPath, name, body.enabled !== false)
  },

  'dialog:chooseReferenceFiles': async () => ({ canceled: true, filePaths: [] }),

  'cc-switch:status': async () => ({
    ok: true,
    installed: ccSwitch.ccSwitchInstalled(),
    dbPath: ccSwitch.ccSwitchDbPath(),
  }),

  'cc-switch:listProviders': async () => {
    try {
      const providers = ccSwitch.listProviders()
      return { ok: true, providers }
    } catch (e) {
      return { ok: false, error: e?.message || String(e), providers: [] }
    }
  },

  'cc-switch:upsertProvider': async (args) => {
    try {
      const body = args?.[0] || {}
      const result = ccSwitch.upsertProvider(body)
      if (result.ok && result.providerId) {
        const settings = loadChatSettings()
        const nextCatalog = [
          ...new Set([...(settings.cloudProviderCatalog || []), result.providerId]),
        ]
        saveChatSettings({ ...settings, cloudProviderCatalog: nextCatalog })
      }
      if (body.syncWorkbench !== false) {
        try {
          ccSwitch.syncCcSwitchToWorkbench({
            loadChatSettings,
            saveChatSettings,
            loadChatSessions,
            saveChatSessions,
            projectRoot: PROJECT_ROOT,
          })
        } catch {
          /* 供应商已写入，同步可稍后手动 */
        }
      }
      broadcast('chat-settings:changed', {})
      return result
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  },

  'cc-switch:deleteProvider': async (args) => {
    try {
      const providerId = args?.[0]?.providerId
      const result = ccSwitch.deleteProvider(providerId)
      if (result.ok && result.providerId) {
        const settings = loadChatSettings()
        const nextCatalog = (settings.cloudProviderCatalog || []).filter(
          (id) => id !== result.providerId,
        )
        saveChatSettings({ ...settings, cloudProviderCatalog: nextCatalog })
      }
      broadcast('chat-settings:changed', {})
      return result
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  },

  'cc-switch:setCurrentProvider': async (args) => {
    try {
      const body = args?.[0] || {}
      const r = ccSwitch.setCurrentProvider(body.providerId, body.model)
      if (body.syncWorkbench !== false) {
        ccSwitch.syncCcSwitchToWorkbench({
          loadChatSettings,
          saveChatSettings,
          loadChatSessions,
          saveChatSessions,
          projectRoot: PROJECT_ROOT,
        })
      }
      broadcast('chat-settings:changed', {})
      return { ok: true, ...r }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  },

  'cc-switch:syncWorkbench': async () => {
    try {
      const r = await ccSwitch.syncCcSwitchToWorkbench({
        loadChatSettings,
        saveChatSettings,
        loadChatSessions,
        saveChatSessions,
        projectRoot: PROJECT_ROOT,
      })
      broadcast('chat-settings:changed', {})
      return r
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  },

  'cc-switch:refreshCloudModels': async (args) => {
    try {
      const settings = loadChatSettings()
      const fetchRemote = args?.[0]?.fetchRemote !== false
      const pool = await ccSwitch.collectCloudModelPool({
        aliases: CLAUDE_CODE_MODEL_ALIASES,
        settings,
        fetchRemote,
      })
      const nextCatalog = await ccSwitch.filterCloudModelList(
        [...new Set([...(settings.cloudModelCatalog || []), ...pool.models])],
        settings,
      )
      saveChatSettings({ ...settings, cloudModelCatalog: nextCatalog })
      broadcast('chat-settings:changed', {})
      return {
        ok: true,
        models: pool.models,
        remoteModels: pool.remoteModels,
        providers: pool.providers,
        cloudModelCatalog: nextCatalog,
      }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  },

  ...cadBridge.createHandlers(),
}

export async function dispatchRpc(channel, args = []) {
  const fn = handlers[channel]
  if (!fn) {
    return { ok: false, error: `未知 RPC: ${channel}` }
  }
  return fn(args)
}

ensureDefaultWorkspace()

try {
  const sess = loadChatSessions()
  const settings = loadChatSettings()
  usageStats.rebuildFromSessions(sess.sessions || [], {
    tokenPricing: settings.tokenPricing || {},
    cloudModelCatalog: settings.cloudModelCatalog || [],
  })
} catch {
  /* 启动时重建用量统计，失败不阻断 */
}
