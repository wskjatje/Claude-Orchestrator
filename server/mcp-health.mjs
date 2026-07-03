import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { expandHome, readMcpConfigFile } from './claude-mcp-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const sdkClientDir = path.join(
  __dirname,
  'vendor/cad/node_modules/@modelcontextprotocol/sdk/dist/cjs/client',
)
const { Client } = require(path.join(sdkClientDir, 'index.js'))
const { StdioClientTransport } = require(path.join(sdkClientDir, 'stdio.js'))

/**
 * 将常见 node 目录 prepend 到 PATH（目录存在才加入）。
 * 与 local-mcp-orchestrator.js 中 augmentSearchPath 保持一致。
 * @param {Record<string, string>} env
 */
function augmentSearchPath(env) {
  const sep = process.platform === 'win32' ? ';' : ':'
  const extraDirs =
    process.platform === 'win32'
      ? [
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs'),
        ].filter(Boolean)
      : [
          '/opt/homebrew/bin',
          '/usr/local/bin',
          '/usr/bin',
          '/bin',
          '/sbin',
          path.join(process.env.HOME || '', '.local', 'bin'),
          path.join(process.env.HOME || '', '.cargo', 'bin'),
        ]
  const cur = env.PATH || env.Path || ''
  const parts = String(cur)
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean)
  const seen = new Set(parts)
  for (const dir of extraDirs) {
    try {
      if (dir && fs.existsSync(dir) && !seen.has(dir)) {
        parts.unshift(dir)
        seen.add(dir)
      }
    } catch {
      /* ignore */
    }
  }
  env.PATH = parts.join(sep)
  if (process.platform === 'win32') env.Path = env.PATH
}

function stdioProbeTimeoutMs(command, args) {
  const joined = [command, ...(Array.isArray(args) ? args : [])].join(' ').toLowerCase()
  if (/\bnpx\b/.test(joined) || /\buvx\b/.test(joined)) return 90000
  return 20000
}

function readMcpServers(configPath) {
  const parsed = readMcpConfigFile(configPath)
  if (!parsed.ok) return { ok: false, error: parsed.error, servers: [] }
  if (parsed.missing) return { ok: true, missing: true, servers: [] }
  const ms = parsed.data?.mcpServers
  if (!ms || typeof ms !== 'object') return { ok: true, servers: [] }
  return { ok: true, servers: Object.entries(ms).map(([name, cfg]) => ({ name, cfg })) }
}

function probeHttp(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    fetch(url, { method: 'GET', signal: ctrl.signal })
      .then((res) => {
        clearTimeout(timer)
        resolve({ ok: res.ok || res.status < 500, status: res.status })
      })
      .catch((e) => {
        clearTimeout(timer)
        resolve({ ok: false, error: e.message })
      })
  })
}

/** 与 local-mcp-orchestrator 一致：用 MCP SDK stdio 传输做 initialize + listTools */
async function probeStdioWithSdk(command, args, envExtra = {}, timeoutMs = 20000) {
  /** @type {InstanceType<typeof Client> | null} */
  let client = null
  /** @type {InstanceType<typeof StdioClientTransport> | null} */
  let transport = null

  const slowNpx = timeoutMs > 20000

  try {
    client = new Client({ name: 'claudecode-mcp-health', version: '1.0.0' })
    const env = { ...process.env, ...envExtra }
    augmentSearchPath(env)
    transport = new StdioClientTransport({
      command,
      args,
      env,
    })

    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              slowNpx
                ? 'npx/uvx 首次启动需拉取依赖，当前超时时间已到。若网络较慢可稍后点「健康检查」重试；国内用户可配置 npm/pypi 镜像加速。'
                : '检查超时',
            ),
          )
        }, timeoutMs)
      }),
    ])

    await Promise.race([
      client.listTools(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('listTools 超时')), Math.min(15000, timeoutMs))
      }),
    ])

    return { ok: true, error: null }
  } catch (e) {
    const msg = e?.message || String(e)
    const cmdLine = [command, ...(Array.isArray(args) ? args : [])].join(' ')
    let hint = ''
    if (/server-fetch|@modelcontextprotocol\/server-fetch/i.test(cmdLine)) {
      hint =
        '（npm 上无 @modelcontextprotocol/server-fetch；官方 fetch 为 Python 包，请改用 uvx mcp-server-fetch，并安装 uv）'
    } else if (/uvx|mcp-server-fetch/i.test(cmdLine) && /ENOENT|not found|spawn uvx/i.test(msg)) {
      hint = '（请先安装 uv：curl -LsSf https://astral.sh/uv/install.sh | sh，或确认 uvx 在 PATH 中（常见路径：~/.local/bin/uvx、~/.cargo/bin/uvx），安装后重试健康检查）'
    } else if (/uvx|mcp-server-fetch/i.test(cmdLine) && /timed? ?out|Failed to fetch|resolve.*dependency/i.test(msg)) {
      hint = '（uvx 解析依赖超时，无法连接 PyPI。国内用户可尝试：① 配置 PyPI 镜像 `pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple`；② 检查代理 HTTP_PROXY/HTTPS_PROXY 是否正确；③ 稍后重试）'
    } else if (/\bnpx\b/.test(cmdLine) && /ENOENT|not found|spawn npx/i.test(msg)) {
      hint = '（npx 未在 PATH 中，请确认 Node.js 已安装；使用桌面打包版请确保应用有 /opt/homebrew/bin 等系统 PATH 访问权限）'
    } else if (/\bnpx\b/.test(cmdLine) && /timed? ?out|Failed to fetch|resolve.*dependency/i.test(msg)) {
      hint = '（npx 拉包超时，无法连接 npm 源。国内用户可尝试：① 配置 npm 镜像 `npm config set registry https://registry.npmmirror.com`；② 检查代理；③ 稍后重试）'
    } else if (/Connection closed|ERR_MODULE_NOT_FOUND|Cannot find module/i.test(msg)) {
      hint =
        '（npx 缓存可能损坏：可删除 ~/.npm/_npx 后重试；filesystem/memory 建议使用固定版本号）'
    }
    return { ok: false, error: `${msg}${hint}`.slice(0, 420) }
  } finally {
    try {
      await client?.close?.()
    } catch {
      /* ignore */
    }
    try {
      await transport?.close?.()
    } catch {
      /* ignore */
    }
  }
}

export async function checkMcpServerEntry(name, cfg) {
  const c = cfg && typeof cfg === 'object' ? cfg : {}
  const type = typeof c.type === 'string' ? c.type : 'stdio'
  const checkedAt = new Date().toISOString()

  if (c.disabled === true) {
    return {
      name,
      status: 'disabled',
      transport: type === 'sse' ? 'sse' : type === 'http' ? 'http' : 'stdio',
      error: null,
      last_health_at: checkedAt,
    }
  }

  if (typeof c.url === 'string' && c.url.trim()) {
    const r = await probeHttp(c.url.trim())
    return {
      name,
      status: r.ok ? 'ok' : 'error',
      transport: type === 'sse' ? 'sse' : 'http',
      error: r.ok ? null : r.error || `HTTP ${r.status ?? '?'}`,
      last_health_at: checkedAt,
    }
  }

  if (typeof c.command !== 'string' || !c.command.trim()) {
    return {
      name,
      status: 'unknown',
      transport: type,
      error: '无 command 或 url',
      last_health_at: checkedAt,
    }
  }

  const command = expandHome(c.command.trim())
  const args = Array.isArray(c.args) ? c.args.map((a) => expandHome(String(a))) : []
  const envExtra = {}
  if (c.env && typeof c.env === 'object') {
    for (const [k, v] of Object.entries(c.env)) envExtra[k] = expandHome(String(v))
  }

  // 提前检查 Puppeteer 依赖的浏览器环境
  const cmdLine = [command, ...args].join(' ').toLowerCase()
  if (/\b(?:server-puppeteer|puppeteer)\b/.test(cmdLine) && !/puppeteer-browsers/.test(cmdLine)) {
    const browserHint = detectPuppeteerBrowser()
    if (browserHint) {
      const r = await probeStdioWithSdk(command, args, envExtra, stdioProbeTimeoutMs(command, args))
      return {
        name,
        status: r.ok ? 'ok' : 'error',
        transport: 'stdio',
        error: r.error || null,
        last_health_at: checkedAt,
      }
    }
    return {
      name,
      status: 'error',
      transport: 'stdio',
      error: '系统未检测到 Chrome/Chromium 浏览器。Puppeteer MCP 需浏览器环境才能运行。安装方法：① macOS 安装 Chrome；② 或执行 `npx puppeteer browsers install chrome` 下载无头浏览器。',
      last_health_at: checkedAt,
    }
  }

  const r = await probeStdioWithSdk(command, args, envExtra, stdioProbeTimeoutMs(command, args))
  return {
    name,
    status: r.ok ? 'ok' : 'error',
    transport: 'stdio',
    error: r.error,
    last_health_at: checkedAt,
  }
}

/** 检测系统是否可用 Chrome/Chromium（Puppeteer MCP 所需） */
function detectPuppeteerBrowser() {
  try {
    if (process.platform === 'darwin') {
      const chromePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        path.join(os.homedir(), 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
      ]
      for (const p of chromePaths) {
        if (fs.existsSync(p)) return p
      }
    } else if (process.platform === 'linux') {
      const linuxPaths = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium']
      for (const p of linuxPaths) {
        if (fs.existsSync(p)) return p
      }
    } else if (process.platform === 'win32') {
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
      const localAppData = process.env.LOCALAPPDATA || ''
      const winPaths = [
        path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFiles, 'Chromium', 'Application', 'chrome.exe'),
      ]
      for (const p of winPaths) {
        if (fs.existsSync(p)) return p
      }
    }
  } catch { /* ignore */ }
  return ''
}

/**
 * 用有限并发执行所有 MCP 健康检查，避免一个超时服务阻塞全部。
 * @param {string} configPath
 * @param {{ concurrency?: number }} [opts]
 */
export async function checkAllMcpServers(configPath, opts = {}) {
  const parsed = readMcpServers(configPath)
  if (!parsed.ok) return { ok: false, error: parsed.error, servers: [] }
  if (parsed.missing) return { ok: true, missing: true, servers: [] }
  const concurrency = Math.max(1, Math.min(6, opts.concurrency ?? 4))

  const entries = parsed.servers.slice()
  const servers = []
  let idx = 0

  /** @param {number} _workerId */
  const worker = async (_workerId) => {
    while (idx < entries.length) {
      const item = entries[idx++]
      if (!item) continue
      try {
        const r = await checkMcpServerEntry(item.name, item.cfg)
        servers.push(r)
      } catch (e) {
        servers.push({
          name: item.name,
          status: 'error',
          transport: 'stdio',
          error: `健康检查异常：${e?.message || String(e)}`,
          last_health_at: new Date().toISOString(),
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, (_, i) => worker(i)))

  const okCount = servers.filter((s) => s.status === 'ok').length
  return { ok: true, servers, okCount, total: servers.length }
}

export async function checkOneMcpServer(configPath, nameKey) {
  const name = String(nameKey || '').trim()
  if (!name) return { ok: false, error: '缺少 name', server: null }
  const parsed = readMcpServers(configPath)
  if (!parsed.ok) return { ok: false, error: parsed.error, server: null }
  if (parsed.missing) return { ok: false, error: '配置文件不存在', server: null }
  const hit = parsed.servers.find((s) => s.name === name)
  if (!hit) return { ok: false, error: `未找到 MCP：${name}`, server: null }
  const server = await checkMcpServerEntry(hit.name, hit.cfg)
  return { ok: true, server }
}
