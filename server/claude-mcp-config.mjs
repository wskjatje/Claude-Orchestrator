import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function expandHome(p) {
  if (typeof p !== 'string') return p
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

/** 写入 mcp.json 时把本机绝对路径折叠为 ~/，便于阅读与迁移 */
export function collapseHome(p) {
  if (typeof p !== 'string') return p
  const home = os.homedir()
  if (p === home) return '~'
  if (p.startsWith(`${home}${path.sep}`)) return `~/${p.slice(home.length + 1)}`
  return p
}

function normalizeStoredArg(raw) {
  return collapseHome(expandHome(String(raw)))
}

/** 固定 npx 包版本，避免 ~/.npm/_npx 缓存拉取不完整导致 SDK 模块缺失 */
export const PINNED_MCP_NPX_ARGS = {
  '@modelcontextprotocol/server-filesystem': '@modelcontextprotocol/server-filesystem@2026.1.14',
  '@modelcontextprotocol/server-memory': '@modelcontextprotocol/server-memory@2026.1.26',
}

/** 官方 fetch 为 Python 包（PyPI），无 npm 版 @modelcontextprotocol/server-fetch */
export const CANONICAL_FETCH_MCP = {
  command: 'uvx',
  args: ['mcp-server-fetch==2026.6.4'],
}

export const CANONICAL_FILESYSTEM_MCP = {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem@2026.1.14', '~/'],
}

export const CANONICAL_MEMORY_MCP = {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-memory@2026.1.26'],
}

function isBrokenFetchNpxEntry(cfg) {
  if (!cfg || typeof cfg !== 'object') return false
  if (String(cfg.command || '').trim() !== 'npx') return false
  const args = Array.isArray(cfg.args) ? cfg.args.map(String) : []
  return args.some(
    (a) => a === '@modelcontextprotocol/server-fetch' || a.includes('@modelcontextprotocol/server-fetch'),
  )
}

export function normalizeMcpServerEntry(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg
  if (isBrokenFetchNpxEntry(cfg)) {
    const out = { ...CANONICAL_FETCH_MCP }
    if (cfg.env && typeof cfg.env === 'object') out.env = cfg.env
    return out
  }
  const out = { ...cfg }
  const cmd = typeof out.command === 'string' ? out.command.trim() : ''
  if ((cmd === 'npx' || cmd === 'uvx') && Array.isArray(out.args)) {
    out.args = out.args.map((a) => {
      const s = String(a)
      if (cmd === 'npx') {
        const pinned = PINNED_MCP_NPX_ARGS[s]
        if (pinned) return pinned
      }
      return normalizeStoredArg(s)
    })
  }
  return out
}

export function formatMcpCommandLine(cfg, homeDir = os.homedir()) {
  if (!cfg || typeof cfg !== 'object') return ''
  const command = typeof cfg.command === 'string' ? cfg.command.trim() : ''
  if (!command) return ''
  const args = Array.isArray(cfg.args)
    ? cfg.args.map((a) => collapseHome(expandHome(String(a))))
    : []
  return [command, ...args].join(' ')
}

/** 升级 mcp.json 中已知有问题的 MCP 引用 */
export function repairMcpConfigData(data) {
  if (!data?.mcpServers || typeof data.mcpServers !== 'object') {
    return { data, changed: false, repairs: [] }
  }
  let changed = false
  const repairs = []
  const mcpServers = {}
  for (const [name, raw] of Object.entries(data.mcpServers)) {
    let next = normalizeMcpServerEntry(raw)
    if (isBrokenFetchNpxEntry(raw)) {
      next = { ...CANONICAL_FETCH_MCP }
      if (raw.env && typeof raw.env === 'object') next.env = raw.env
      repairs.push(`${name}: fetch 改为 uvx（npm 无 server-fetch 包）`)
      changed = true
    } else if (name === 'filesystem' && String(raw?.command || '').trim() === 'npx') {
      const normalized = normalizeMcpServerEntry(raw)
      const canonical = JSON.stringify(CANONICAL_FILESYSTEM_MCP)
      const current = JSON.stringify({ command: normalized.command, args: normalized.args })
      if (current !== canonical) {
        next = { ...CANONICAL_FILESYSTEM_MCP }
        if (raw.env && typeof raw.env === 'object') next.env = raw.env
        repairs.push('filesystem: 使用固定版本 @2026.1.14 与 ~/ 路径')
        changed = true
      }
    } else if (name === 'memory' && String(raw?.command || '').trim() === 'npx') {
      const normalized = normalizeMcpServerEntry(raw)
      const canonical = JSON.stringify(CANONICAL_MEMORY_MCP)
      const current = JSON.stringify({ command: normalized.command, args: normalized.args })
      if (current !== canonical) {
        next = { ...CANONICAL_MEMORY_MCP }
        if (raw.env && typeof raw.env === 'object') next.env = raw.env
        repairs.push('memory: 固定 @2026.1.26')
        changed = true
      }
    } else if (JSON.stringify(next) !== JSON.stringify(raw)) {
      if (name === 'filesystem') repairs.push('filesystem: 规范化启动参数')
      else if (name === 'memory') repairs.push('memory: 规范化启动参数')
      else repairs.push(`${name}: 规范化启动参数`)
      changed = true
    }
    mcpServers[name] = next
  }
  return { data: { ...data, mcpServers }, changed, repairs }
}

/** 与 health check / 本地编排一致：自定义路径 → config.json（含 mcpServers）→ mcp.json */
export function resolveMcpConfigPath(customPath) {
  const custom = expandHome(String(customPath || '').trim())
  if (custom) return custom
  const configJson = path.join(os.homedir(), '.claude', 'config.json')
  const mcpJson = path.join(os.homedir(), '.claude', 'mcp.json')
  if (fs.existsSync(configJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(configJson, 'utf8'))
      if (data?.mcpServers && typeof data.mcpServers === 'object') return configJson
    } catch {
      /* fall through */
    }
  }
  return mcpJson
}

export function readMcpConfigFile(customPath) {
  const filePath = resolveMcpConfigPath(customPath)
  if (!fs.existsSync(filePath)) {
    return { ok: true, missing: true, path: filePath, data: { mcpServers: {} } }
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') {
      return { ok: false, path: filePath, error: '配置文件根节点须为 JSON 对象' }
    }
    if (!data.mcpServers || typeof data.mcpServers !== 'object') data.mcpServers = {}
    const { data: repaired, changed, repairs } = repairMcpConfigData(data)
    if (changed) {
      writeMcpConfigFile(customPath, repaired)
    }
    return { ok: true, path: filePath, data: repaired, raw, repaired: changed, repairs }
  } catch (e) {
    return { ok: false, path: filePath, error: e.message }
  }
}

export function writeMcpConfigFile(customPath, data) {
  const filePath = resolveMcpConfigPath(customPath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  return { ok: true, path: filePath }
}

export function validateMcpServerName(name) {
  const key = String(name || '').trim()
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) {
    return { ok: false, error: '名称须以字母开头，仅含字母、数字、-、_' }
  }
  return { ok: true, name: key }
}

export function buildMcpServerConfig(body) {
  const transport = body?.transport === 'http' || body?.transport === 'sse' ? body.transport : 'stdio'
  if (transport === 'http' || transport === 'sse') {
    const url = String(body?.url || '').trim()
    if (!url) return { ok: false, error: '请填写 URL' }
    return { ok: true, config: { type: transport, url } }
  }
  const command = String(body?.command || '').trim()
  if (!command) return { ok: false, error: '请填写启动命令' }
  const cfg = { command }
  const args = Array.isArray(body?.args)
    ? body.args.map(String).filter(Boolean).map((a) => normalizeStoredArg(a))
    : []
  if (args.length) cfg.args = args
  if (body?.env && typeof body.env === 'object' && Object.keys(body.env).length) {
    cfg.env = Object.fromEntries(Object.entries(body.env).map(([k, v]) => [k, String(v)]))
  }
  return { ok: true, config: normalizeMcpServerEntry(cfg) }
}

export function upsertMcpServer(customPath, name, serverConfig) {
  const validated = validateMcpServerName(name)
  if (!validated.ok) return validated
  const read = readMcpConfigFile(customPath)
  if (!read.ok) return read
  const data = read.data || { mcpServers: {} }
  const prev = data.mcpServers[validated.name]
  const next = { ...serverConfig }
  if (prev && typeof prev === 'object' && prev.disabled === true) {
    next.disabled = true
  }
  data.mcpServers[validated.name] = next
  const written = writeMcpConfigFile(customPath, data)
  return { ok: true, path: written.path, name: validated.name, data }
}

export function removeMcpServer(customPath, name) {
  const nameKey = String(name || '').trim()
  if (!nameKey) return { ok: false, error: '缺少 name' }
  const read = readMcpConfigFile(customPath)
  if (!read.ok) return read
  if (read.missing) return { ok: false, error: '配置文件不存在' }
  const data = read.data
  if (!data.mcpServers?.[nameKey]) return { ok: false, error: `未找到 MCP：${nameKey}` }
  delete data.mcpServers[nameKey]
  const written = writeMcpConfigFile(customPath, data)
  return { ok: true, path: written.path, name: nameKey }
}

export function setMcpServerEnabled(customPath, name, enabled) {
  const nameKey = String(name || '').trim()
  if (!nameKey) return { ok: false, error: '缺少 name' }
  const read = readMcpConfigFile(customPath)
  if (!read.ok) return read
  if (read.missing) return { ok: false, error: '配置文件不存在' }
  const raw = read.data?.mcpServers?.[nameKey]
  if (!raw || typeof raw !== 'object') return { ok: false, error: `未找到 MCP：${nameKey}` }
  const next = { ...raw }
  if (enabled) {
    delete next.disabled
  } else {
    next.disabled = true
  }
  read.data.mcpServers[nameKey] = next
  const written = writeMcpConfigFile(customPath, read.data)
  return { ok: true, path: written.path, name: nameKey, enabled: Boolean(enabled) }
}
