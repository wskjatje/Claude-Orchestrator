import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readMcpConfigFile } from './claude-mcp-config.mjs'
import { checkAllMcpServers, checkOneMcpServer } from './mcp-health.mjs'
import { loadChatSettings } from './store.mjs'

const require = createRequire(import.meta.url)
const projectDb = require('./project-db.cjs')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_DATA_DIR = path.join(__dirname, '..', '.claudecode')
const PROJECT_DB_PATH = path.join(PROJECT_DATA_DIR, 'workbench.db')
const KV_KEY = 'mcp_health_snapshot'

function db() {
  return projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR)
}

export function mcpConfigPathFromSettings() {
  return loadChatSettings().mcpConfigAbsolutePath?.trim() || ''
}

export function resolvedMcpConfigFile(customPath = mcpConfigPathFromSettings()) {
  return readMcpConfigFile(customPath)
}

function normalizeServerRow(server) {
  return {
    status: String(server?.status || 'unknown'),
    transport: server?.transport ? String(server.transport) : 'stdio',
    error: server?.error ?? null,
    last_health_at: server?.last_health_at ?? new Date().toISOString(),
  }
}

export function saveMcpHealthSnapshot(configPath, servers) {
  const filePath = String(configPath || '').trim()
  /** @type {Record<string, ReturnType<typeof normalizeServerRow>>} */
  const byName = {}
  for (const s of servers || []) {
    if (!s?.name) continue
    byName[String(s.name)] = normalizeServerRow(s)
  }
  const payload = {
    version: 1,
    configPath: filePath,
    checkedAt: new Date().toISOString(),
    servers: byName,
  }
  projectDb.saveKv(db(), KV_KEY, payload)
  return payload
}

export function upsertMcpHealthServer(configPath, server) {
  const filePath = String(configPath || '').trim()
  const name = String(server?.name || '').trim()
  if (!name) return null
  const prev = projectDb.loadKv(db(), KV_KEY, null)
  const base =
    prev && typeof prev === 'object' && String(prev.configPath || '').trim() === filePath
      ? prev
      : { version: 1, configPath: filePath, checkedAt: '', servers: {} }
  const servers =
    base.servers && typeof base.servers === 'object' && !Array.isArray(base.servers)
      ? { ...base.servers }
      : {}
  servers[name] = normalizeServerRow(server)
  const payload = {
    version: 1,
    configPath: filePath,
    checkedAt: new Date().toISOString(),
    servers,
  }
  projectDb.saveKv(db(), KV_KEY, payload)
  return payload
}

export function loadMcpHealthSnapshot(configPath) {
  const filePath = String(configPath || '').trim()
  const snap = projectDb.loadKv(db(), KV_KEY, null)
  if (!snap || typeof snap !== 'object') return null
  if (String(snap.configPath || '').trim() !== filePath) return null
  return snap
}

export async function runStartupMcpHealthCheck() {
  if (process.env.MCP_SKIP_STARTUP_HEALTH === '1') {
    return { ok: true, skipped: true }
  }
  const customPath = mcpConfigPathFromSettings()
  const read = resolvedMcpConfigFile(customPath)
  if (!read.ok) {
    return { ok: false, error: read.error || '读取 MCP 配置失败' }
  }
  if (read.missing) {
    saveMcpHealthSnapshot(read.path, [])
    return { ok: true, missing: true, okCount: 0, total: 0, configPath: read.path }
  }
  const result = await checkAllMcpServers(customPath || undefined)
  if (!result.ok) {
    return { ok: false, error: result.error || '健康检查失败' }
  }
  saveMcpHealthSnapshot(read.path, result.servers || [])
  return {
    ok: true,
    configPath: read.path,
    okCount: result.okCount ?? 0,
    total: result.total ?? 0,
    checkedAt: new Date().toISOString(),
  }
}

export async function checkAllMcpServersAndPersist(customPath) {
  const read = resolvedMcpConfigFile(customPath)
  if (!read.ok) return read
  if (read.missing) {
    saveMcpHealthSnapshot(read.path, [])
    return { ok: true, missing: true, servers: [], okCount: 0, total: 0, path: read.path }
  }
  const result = await checkAllMcpServers(customPath || undefined)
  if (!result.ok) return result
  saveMcpHealthSnapshot(read.path, result.servers || [])
  return { ...result, path: read.path }
}

export async function checkOneMcpServerAndPersist(customPath, name) {
  const read = resolvedMcpConfigFile(customPath)
  if (!read.ok) return read
  if (read.missing) return { ok: false, error: '配置文件不存在', server: null }
  const result = await checkOneMcpServer(customPath || undefined, name)
  const repairMeta = {
    repaired: read.repaired === true,
    repairs: read.repairs ?? [],
  }
  if (!result.ok || !result.server) return { ...result, ...repairMeta }
  upsertMcpHealthServer(read.path, result.server)
  return { ...result, ...repairMeta }
}
