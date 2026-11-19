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

/**
 * 探测结束后必须释放 stdio 子进程，否则 ChildProcess/Socket 句柄会挂住事件循环。
 * @param {InstanceType<typeof StdioClientTransport> | null} transport
 */
async function forceReleaseStdioProbe(transport) {
  if (!transport) return
  const pid = typeof transport.pid === 'number' ? transport.pid : null
  const stderrStream = transport.stderr
  if (stderrStream && typeof stderrStream.removeAllListeners === 'function') {
    try {
      stderrStream.removeAllListeners('data')
      stderrStream.removeAllListeners('error')
    } catch {
      /* ignore */
    }
  }
  if (stderrStream && typeof stderrStream.destroy === 'function') {
    try {
      stderrStream.destroy()
    } catch {
      /* ignore */
    }
  }
  try {
    await transport.close?.()
  } catch {
    /* ignore */
  }
  if (pid == null || pid <= 0) return
  const alive = () => {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }
  if (!alive()) return
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 80).unref())
  if (!alive()) return
  try {
    // 负 pid：尽量打掉同组子孙（部分 MCP 会再 spawn）
    if (process.platform !== 'win32') process.kill(-pid, 'SIGKILL')
  } catch {
    /* ignore */
  }
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    /* ignore */
  }
}

/** 与 local-mcp-orchestrator 一致：用 MCP SDK stdio 传输做 initialize + listTools */
async function probeStdioWithSdk(command, args, envExtra = {}, timeoutMs = 20000) {
  /** @type {InstanceType<typeof Client> | null} */
  let client = null
  /** @type {InstanceType<typeof StdioClientTransport> | null} */
  let transport = null

  const slowNpx = timeoutMs > 20000
  /** @type {ReturnType<typeof setTimeout>[]} */
  const raceTimers = []
  const raceTimeout = (ms, errFactory) =>
    new Promise((_, reject) => {
      const t = setTimeout(() => reject(errFactory()), ms)
      raceTimers.push(t)
    })

  /** @type {string[]} */
  const stderrChunks = []
  try {
    client = new Client({ name: 'claudecode-mcp-health', version: '1.0.0' })
    const env = { ...process.env, ...envExtra }
    augmentSearchPath(env)
    transport = new StdioClientTransport({
      command,
      args,
      env,
      stderr: 'pipe',
    })
    const stderrStream = transport.stderr
    if (stderrStream && typeof stderrStream.on === 'function') {
      stderrStream.on('data', (chunk) => {
        stderrChunks.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk))
      })
    }

    await Promise.race([
      client.connect(transport),
      raceTimeout(timeoutMs, () =>
        new Error(
          slowNpx
            ? 'npx/uvx 冷启动超时。本仓库规范 MCP 请改用本地固定包：npm run mcp:ensure，并确认命令指向 tools/mcp-npx|mcp-fetch|mcp-sqlite。'
            : '检查超时',
        ),
      ),
    ])

    await Promise.race([
      client.listTools(),
      raceTimeout(Math.min(15000, timeoutMs), () => new Error('listTools 超时')),
    ])

    return { ok: true, error: null }
  } catch (e) {
    const msg = e?.message || String(e)
    const cmdLine = [command, ...(Array.isArray(args) ? args : [])].join(' ')
    // Python traceback 关键错误在尾部；截断时保留尾部，避免只剩无信息的 File 头
    const stderrJoined = stderrChunks.join('').trim().replace(/\s+/g, ' ')
    const stderrText =
      stderrJoined.length <= 320
        ? stderrJoined
        : /Traceback \(most recent call last\)|AttributeError:|Error:/i.test(stderrJoined)
          ? stderrJoined.slice(-320)
          : stderrJoined.slice(0, 320)
    let hint = ''
    const usesBundledLocal =
      /tools\/mcp-(?:npx|fetch|sqlite)\b/.test(cmdLine) ||
      /mcp-server-(?:filesystem|memory|sequential-thinking|puppeteer|fetch|sqlite)\b/.test(cmdLine)
    if (/@modelcontextprotocol\/server-fetch/i.test(cmdLine)) {
      hint =
        '（npm 上无 @modelcontextprotocol/server-fetch；请改用仓库本地包：npm run mcp:ensure 后指向 tools/mcp-fetch/.venv/bin/mcp-server-fetch）'
    } else if (usesBundledLocal && /ENOENT|not found|spawn /i.test(msg)) {
      hint = '（本地 MCP 二进制缺失：请在仓库根目录执行 npm run mcp:ensure 后重试健康检查）'
    } else if (/\buvx\b/.test(cmdLine) && /ENOENT|not found|spawn uvx/i.test(msg)) {
      hint =
        '（检测到遗留 uvx 启动方式。请改为 npm run mcp:ensure 生成的 tools/mcp-fetch|mcp-sqlite 本地命令，勿依赖运行时 uvx 冷拉）'
    } else if (/\buvx\b/.test(cmdLine) && /timed? ?out|Failed to fetch|resolve.*dependency/i.test(msg)) {
      hint =
        '（uvx 冷拉依赖失败。请改为本地固定包：npm run mcp:ensure，命令指向 tools/mcp-fetch 或 tools/mcp-sqlite）'
    } else if (/\bnpx\b/.test(cmdLine) && /ENOENT|not found|spawn npx/i.test(msg)) {
      hint =
        '（检测到遗留 npx 启动方式。请改为 npm run mcp:ensure 生成的 tools/mcp-npx/node_modules/.bin 本地命令）'
    } else if (/\bnpx\b/.test(cmdLine) && /timed? ?out|Failed to fetch|resolve.*dependency/i.test(msg)) {
      hint =
        '（npx 冷拉依赖失败。请改为本地固定包：npm run mcp:ensure，命令指向 tools/mcp-npx）'
    } else if (
      /\bnpx\b/.test(cmdLine) &&
      /Connection closed|ERR_MODULE_NOT_FOUND|Cannot find module/i.test(msg)
    ) {
      // 仅 npx 命令才附 npx 缓存提示；uvx/其他命令禁止套用
      hint =
        '（npx 缓存可能损坏：可删除 ~/.npm/_npx 后重试；filesystem/memory 等请改用 npm run mcp:ensure 本地 bin，勿继续 npx）'
    }
    const withStderr = stderrText ? `${msg}${hint}；stderr: ${stderrText}` : `${msg}${hint}`
    return { ok: false, error: withStderr.slice(0, 520) }
  } finally {
    for (const t of raceTimers) {
      try {
        clearTimeout(t)
      } catch {
        /* ignore */
      }
    }
    try {
      await client?.close?.()
    } catch {
      /* ignore */
    }
    await forceReleaseStdioProbe(transport)
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
