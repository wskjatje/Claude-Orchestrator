import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

/** 已知 MCP 包：写入/读取时去掉版本号，由 npx/uvx 拉取最新 */
function stripKnownMcpPackageVersion(command, arg) {
  const s = String(arg)
  if (command === 'npx') {
    if (/^@modelcontextprotocol\/server-filesystem@/.test(s)) return '@modelcontextprotocol/server-filesystem'
    if (/^@modelcontextprotocol\/server-memory@/.test(s)) return '@modelcontextprotocol/server-memory'
  }
  if (command === 'uvx' && /^mcp-server-fetch(==|$)/.test(s)) return 'mcp-server-fetch'
  return s
}

/** 官方 fetch 为 Python 包（PyPI）；仓库内固定 venv：tools/mcp-fetch/.venv */
export function bundledFetchMcpServerPath() {
  return path.join(__dirname, '..', 'tools', 'mcp-fetch', '.venv', 'bin', 'mcp-server-fetch')
}

export function canonicalFetchMcp() {
  return {
    command: bundledFetchMcpServerPath(),
    args: [],
  }
}

/** 兼容旧引用：本地 bin 存在则用固定路径，否则退回 uvx */
export const CANONICAL_FETCH_MCP = fs.existsSync(bundledFetchMcpServerPath())
  ? canonicalFetchMcp()
  : { command: 'uvx', args: ['mcp-server-fetch'] }

/** 仓库内固定 npm 包：tools/mcp-npx（由 scripts/ensure-mcp-npx.mjs 安装） */
export function bundledOfficialMcpBinPath(binName) {
  return path.join(__dirname, '..', 'tools', 'mcp-npx', 'node_modules', '.bin', binName)
}

export function canonicalFilesystemMcp() {
  return {
    command: bundledOfficialMcpBinPath('mcp-server-filesystem'),
    args: ['~'],
  }
}

export function canonicalMemoryMcp() {
  return {
    command: bundledOfficialMcpBinPath('mcp-server-memory'),
    args: [],
  }
}

export function canonicalSequentialThinkingMcp() {
  return {
    command: bundledOfficialMcpBinPath('mcp-server-sequential-thinking'),
    args: [],
  }
}

export function canonicalPuppeteerMcp() {
  return {
    command: bundledOfficialMcpBinPath('mcp-server-puppeteer'),
    args: [],
  }
}

/** @deprecated 保留旧名：repair / 测试若仍引用 */
export const CANONICAL_FILESYSTEM_MCP = canonicalFilesystemMcp()
export const CANONICAL_MEMORY_MCP = canonicalMemoryMcp()

export function bundledSanshengliubuMcpServerPath() {
  return path.join(__dirname, 'mcp-sanshengliubu', 'server.mjs')
}

export function bundledExternalAppsMcpServerPath() {
  return path.join(__dirname, 'mcp-external-apps', 'server.mjs')
}

/** 仓库内固定 venv：tools/mcp-sqlite/.venv（由 scripts/ensure-mcp-sqlite.mjs 安装） */
export function bundledSqliteMcpServerPath() {
  return path.join(__dirname, '..', 'tools', 'mcp-sqlite', '.venv', 'bin', 'mcp-server-sqlite')
}

export function bundledSqliteDemoDbPath() {
  return path.join(__dirname, '..', 'data', 'mcp', 'sqlite', 'demo.db')
}

export function canonicalSqliteMcp() {
  return {
    command: bundledSqliteMcpServerPath(),
    args: ['--db-path', bundledSqliteDemoDbPath()],
  }
}

export const CANONICAL_SANSHENGLIUBU_MCP = {
  command: 'node',
  args: [bundledSanshengliubuMcpServerPath()],
}

export const CANONICAL_EXTERNAL_APPS_MCP = {
  command: 'node',
  args: [bundledExternalAppsMcpServerPath()],
}

/** 为 external-apps 注入工作区根白名单（不覆盖用户已设 EXTERNAL_APPS_ALLOW_PREFIXES） */
export function withExternalAppsWorkspaceEnv(cfg, workspaceRoot) {
  if (!cfg || typeof cfg !== 'object') return cfg
  const root = String(workspaceRoot || '').trim()
  if (!root) return { ...cfg }
  const env =
    cfg.env && typeof cfg.env === 'object' ? { ...cfg.env } : {}
  if (!String(env.EXTERNAL_APPS_ALLOW_PREFIXES || '').trim()) {
    env.EXTERNAL_APPS_ALLOW_PREFIXES = path.resolve(root)
  }
  return { ...cfg, env }
}

export function bundledMcpPresetCommandLines() {
  const lines = {
    sanshengliubu: formatMcpCommandLine(CANONICAL_SANSHENGLIUBU_MCP),
    'external-apps': formatMcpCommandLine(CANONICAL_EXTERNAL_APPS_MCP),
  }
  if (fs.existsSync(bundledSqliteMcpServerPath())) {
    lines.sqlite = formatMcpCommandLine(canonicalSqliteMcp())
  }
  if (fs.existsSync(bundledOfficialMcpBinPath('mcp-server-filesystem'))) {
    lines.filesystem = formatMcpCommandLine(canonicalFilesystemMcp())
  }
  if (fs.existsSync(bundledOfficialMcpBinPath('mcp-server-memory'))) {
    lines.memory = formatMcpCommandLine(canonicalMemoryMcp())
  }
  if (fs.existsSync(bundledOfficialMcpBinPath('mcp-server-sequential-thinking'))) {
    lines['sequential-thinking'] = formatMcpCommandLine(canonicalSequentialThinkingMcp())
  }
  if (fs.existsSync(bundledOfficialMcpBinPath('mcp-server-puppeteer'))) {
    lines.puppeteer = formatMcpCommandLine(canonicalPuppeteerMcp())
  }
  if (fs.existsSync(bundledFetchMcpServerPath())) {
    lines.fetch = formatMcpCommandLine(canonicalFetchMcp())
  }
  return lines
}

function isLegacyUvxSqliteEntry(cfg) {
  if (!cfg || typeof cfg !== 'object') return false
  if (String(cfg.command || '').trim() !== 'uvx') return false
  const args = Array.isArray(cfg.args) ? cfg.args.map(String) : []
  return args.some((a) => a === 'mcp-server-sqlite' || a.includes('mcp-server-sqlite'))
}

function isLegacyNpxOfficialMcpEntry(cfg, packageName) {
  if (!cfg || typeof cfg !== 'object') return false
  if (String(cfg.command || '').trim() !== 'npx') return false
  const args = Array.isArray(cfg.args) ? cfg.args.map(String) : []
  return args.some((a) => a === packageName || a.includes(packageName))
}

function maybeRepairToBundled(name, raw, want, binPath, repairs) {
  if (!fs.existsSync(binPath)) return { next: null, changed: false }
  const cmd = String(raw?.command || '').trim()
  const isNpx = cmd === 'npx'
  const already =
    expandHome(cmd) === want.command ||
    path.resolve(expandHome(cmd)) === path.resolve(want.command)
  if (!isNpx && already) {
    // args 也可能漂移（如 filesystem 缺 ~）
    const curArgs = Array.isArray(raw.args) ? raw.args.map((a) => expandHome(String(a))) : []
    const wantArgs = Array.isArray(want.args) ? want.args.map((a) => expandHome(String(a))) : []
    if (JSON.stringify(curArgs) === JSON.stringify(wantArgs)) {
      return { next: null, changed: false }
    }
  }
  if (!isNpx && !already) return { next: null, changed: false }
  const next = { ...want }
  if (raw.env && typeof raw.env === 'object') next.env = raw.env
  repairs.push(`${name}: 改用仓库内固定 MCP 二进制（免运行时 npx 拉包）`)
  return { next, changed: true }
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
      const stripped = stripKnownMcpPackageVersion(cmd, s)
      return normalizeStoredArg(stripped)
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
      next = fs.existsSync(bundledFetchMcpServerPath())
        ? { ...canonicalFetchMcp() }
        : { command: 'uvx', args: ['mcp-server-fetch'] }
      if (raw.env && typeof raw.env === 'object') next.env = raw.env
      repairs.push(
        fs.existsSync(bundledFetchMcpServerPath())
          ? `${name}: fetch 改为仓库内固定 mcp-server-fetch`
          : `${name}: fetch 改为 uvx（npm 无 server-fetch 包）`,
      )
      changed = true
    } else if (
      name === 'fetch' &&
      fs.existsSync(bundledFetchMcpServerPath()) &&
      String(raw?.command || '').trim() === 'uvx'
    ) {
      next = { ...canonicalFetchMcp() }
      if (raw.env && typeof raw.env === 'object') next.env = raw.env
      repairs.push('fetch: 改用仓库内固定 mcp-server-fetch（免 uvx 冷拉）')
      changed = true
    } else if (
      name === 'filesystem' &&
      isLegacyNpxOfficialMcpEntry(raw, '@modelcontextprotocol/server-filesystem')
    ) {
      const r = maybeRepairToBundled(
        name,
        raw,
        canonicalFilesystemMcp(),
        bundledOfficialMcpBinPath('mcp-server-filesystem'),
        repairs,
      )
      if (r.changed) {
        next = r.next
        changed = true
      }
    } else if (
      name === 'memory' &&
      isLegacyNpxOfficialMcpEntry(raw, '@modelcontextprotocol/server-memory')
    ) {
      const r = maybeRepairToBundled(
        name,
        raw,
        canonicalMemoryMcp(),
        bundledOfficialMcpBinPath('mcp-server-memory'),
        repairs,
      )
      if (r.changed) {
        next = r.next
        changed = true
      }
    } else if (
      name === 'sequential-thinking' &&
      isLegacyNpxOfficialMcpEntry(raw, '@modelcontextprotocol/server-sequential-thinking')
    ) {
      const r = maybeRepairToBundled(
        name,
        raw,
        canonicalSequentialThinkingMcp(),
        bundledOfficialMcpBinPath('mcp-server-sequential-thinking'),
        repairs,
      )
      if (r.changed) {
        next = r.next
        changed = true
      }
    } else if (
      name === 'puppeteer' &&
      isLegacyNpxOfficialMcpEntry(raw, '@modelcontextprotocol/server-puppeteer')
    ) {
      const r = maybeRepairToBundled(
        name,
        raw,
        canonicalPuppeteerMcp(),
        bundledOfficialMcpBinPath('mcp-server-puppeteer'),
        repairs,
      )
      if (r.changed) {
        next = r.next
        changed = true
      }
    } else if (name === 'sanshengliubu' && String(raw?.command || '').trim() === 'node') {
      const normalized = normalizeMcpServerEntry(raw)
      const canonical = JSON.stringify(CANONICAL_SANSHENGLIUBU_MCP)
      const current = JSON.stringify({ command: normalized.command, args: normalized.args })
      if (current !== canonical) {
        next = { ...CANONICAL_SANSHENGLIUBU_MCP }
        if (raw.env && typeof raw.env === 'object') next.env = raw.env
        repairs.push('sanshengliubu: 使用内置 Bridge 脚本路径')
        changed = true
      }
    } else if (name === 'external-apps' && String(raw?.command || '').trim() === 'node') {
      const normalized = normalizeMcpServerEntry(raw)
      const canonical = JSON.stringify(CANONICAL_EXTERNAL_APPS_MCP)
      const current = JSON.stringify({ command: normalized.command, args: normalized.args })
      if (current !== canonical) {
        next = { ...CANONICAL_EXTERNAL_APPS_MCP }
        if (raw.env && typeof raw.env === 'object') next.env = raw.env
        repairs.push('external-apps: 使用内置外部应用 MCP 脚本路径')
        changed = true
      }
      // 工作区白名单在 read/write 路径由调用方注入；此处仅保证结构
    } else if (
      name === 'sqlite' &&
      fs.existsSync(bundledSqliteMcpServerPath()) &&
      isLegacyUvxSqliteEntry(raw)
    ) {
      const want = canonicalSqliteMcp()
      next = { ...want }
      if (raw.env && typeof raw.env === 'object') next.env = raw.env
      repairs.push('sqlite: 改用仓库内固定 mcp-server-sqlite（免 uvx --with 冷拉）')
      changed = true
    } else if (JSON.stringify(next) !== JSON.stringify(raw)) {
      if (name === 'filesystem') repairs.push('filesystem: 规范化启动参数')
      else if (name === 'memory') repairs.push('memory: 规范化启动参数')
      else repairs.push(`${name}: 规范化启动参数`)
      changed = true
    }
    mcpServers[name] = next
  }
  if (!mcpServers.sanshengliubu && fs.existsSync(bundledSanshengliubuMcpServerPath())) {
    mcpServers.sanshengliubu = { ...CANONICAL_SANSHENGLIUBU_MCP }
    repairs.push('sanshengliubu: 已补全内置三省六部 MCP')
    changed = true
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
  let next = { ...serverConfig }
  if (prev && typeof prev === 'object' && prev.disabled === true) {
    next.disabled = true
  }
  if (validated.name === 'external-apps') {
    try {
      const { getWorkspaceCwd } = require('./store.mjs')
      next = withExternalAppsWorkspaceEnv(next, getWorkspaceCwd())
    } catch {
      /* cwd 默认由 MCP 进程 process.cwd() 兜底 */
    }
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

function mcpServerHasAngleBracketPlaceholder(cfg) {
  if (!cfg || typeof cfg !== 'object') return false
  const parts = []
  if (typeof cfg.command === 'string') parts.push(cfg.command)
  if (Array.isArray(cfg.args)) {
    for (const a of cfg.args) parts.push(String(a ?? ''))
  }
  if (typeof cfg.url === 'string') parts.push(cfg.url)
  return parts.some((p) => /<[^>]+>/.test(p))
}

export function setMcpServerEnabled(customPath, name, enabled) {
  const nameKey = String(name || '').trim()
  if (!nameKey) return { ok: false, error: '缺少 name' }
  const read = readMcpConfigFile(customPath)
  if (!read.ok) return read
  if (read.missing) return { ok: false, error: '配置文件不存在' }
  const raw = read.data?.mcpServers?.[nameKey]
  if (!raw || typeof raw !== 'object') return { ok: false, error: `未找到 MCP：${nameKey}` }
  if (enabled && mcpServerHasAngleBracketPlaceholder(raw)) {
    return {
      ok: false,
      error: '命令或 URL 仍含 <…> 占位符，请先编辑为真实路径/连接串后再启用',
    }
  }
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
