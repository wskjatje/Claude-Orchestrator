#!/usr/bin/env node
/**
 * 统一开发入口：Bridge + Vite（可选 Electron）
 * - npm run web:dev:full → Bridge + Vite + 应用壳（与 desktop 相同浏览器逻辑）
 * - npm run desktop → Bridge + Vite + 应用壳
 */
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getWorkbenchHttpPort, getWorkbenchUiPort, getWorkbenchWsPort } from '../server/bridge-constants.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DESKTOP_DIR = __dirname
const BRIDGE_HTTP_PORT = getWorkbenchHttpPort()
const BRIDGE_WS_PORT = getWorkbenchWsPort()
const BRIDGE_HEALTH = `http://127.0.0.1:${BRIDGE_HTTP_PORT}/health`
const WEB_URL = `http://127.0.0.1:${getWorkbenchUiPort()}/`

/** @type {import('node:child_process').ChildProcess[]} */
const children = []
/** @type {import('node:child_process').ChildProcess | null} */
let bridgeProcess = null
let bridgeRestarting = false
let bridgeUnhealthyStreak = 0
let shuttingDown = false

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
    stdio: opts.stdio || 'inherit',
    shell: false,
    detached: opts.detached === true,
  })
  if (!opts.detached) children.push(child)
  return child
}

function portPids(port) {
  try {
    const out = execFileSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' }).trim()
    if (!out) return []
    return out.split(/\s+/).map(Number).filter(Boolean)
  } catch {
    return []
  }
}

function freePort(port, { label = 'port', force = false } = {}) {
  const pids = portPids(port)
  if (!pids.length) return
  console.log(`[dev] 释放 ${label} ${port}（PID ${pids.join(', ')}）`)
  for (const pid of pids) {
    try {
      process.kill(pid, force ? 'SIGKILL' : 'SIGTERM')
    } catch {
      /* ignore */
    }
  }
}

async function waitPortFree(port, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!portPids(port).length) return true
    await sleep(150)
  }
  freePort(port, { force: true })
  await sleep(300)
  return !portPids(port).length
}

async function isBridgeHealthy() {
  try {
    const res = await fetch(BRIDGE_HEALTH, { signal: AbortSignal.timeout(1200) })
    return res.ok
  } catch {
    return false
  }
}

async function waitUrl(url, attempts = 120, ms = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return true
    } catch {
      /* retry */
    }
    await sleep(ms)
  }
  return false
}

function ensureDeps() {
  if (!fs.existsSync(path.join(ROOT, 'web/node_modules'))) {
    console.log('[dev] 安装 web 依赖…')
    execFileSync('npm', ['run', 'web:install'], { cwd: ROOT, stdio: 'inherit' })
  }
  if (!fs.existsSync(path.join(ROOT, 'node_modules/ws'))) {
    execFileSync('npm', ['install'], { cwd: ROOT, stdio: 'inherit' })
  }
  execFileSync('node', ['scripts/fix-node-pty-perms.mjs'], { cwd: ROOT, stdio: 'inherit' })
  if (!fs.existsSync(path.join(ROOT, 'server/vendor/cad/node_modules/@modelcontextprotocol'))) {
    execFileSync('npm', ['run', 'vendor:install'], { cwd: ROOT, stdio: 'inherit' })
  } else {
    execFileSync('node', ['scripts/fix-vendor-native-modules.mjs'], { cwd: ROOT, stdio: 'inherit' })
  }
}

async function stopBridge() {
  if (!bridgeProcess) return
  const proc = bridgeProcess
  bridgeProcess = null
  try {
    proc.kill('SIGTERM')
  } catch {
    /* ignore */
  }
  await sleep(400)
  if (proc.exitCode == null && !proc.killed) {
    try {
      proc.kill('SIGKILL')
    } catch {
      /* ignore */
    }
    await sleep(200)
  }
}

async function startBridge({ initial = false, reason = 'startup' } = {}) {
  if (bridgeRestarting) return bridgeProcess
  bridgeRestarting = true

  if (!initial) {
    await stopBridge()
  }

  await waitPortFree(BRIDGE_HTTP_PORT)
  await waitPortFree(BRIDGE_WS_PORT)

  if (initial) {
    freePort(BRIDGE_HTTP_PORT, { label: 'Bridge HTTP' })
    freePort(BRIDGE_WS_PORT, { label: 'Bridge WS' })
    await waitPortFree(BRIDGE_HTTP_PORT)
    await waitPortFree(BRIDGE_WS_PORT)
  }

  console.log(`[dev] 启动 Bridge（${reason}）…`)

  /** @type {string[]} */
  const bridgeArgs = ['--import', './scripts/ensure-dev-native-preload.mjs']
  // 默认不用 --watch：EADDRINUSE 崩溃后 watch 会卡住不重试，导致 :18790 长期无监听
  if (process.env.CLAUDE_BRIDGE_WATCH === '1') {
    bridgeArgs.push('--watch')
  }
  bridgeArgs.push('server/index.mjs')

  const child = spawn('node', bridgeArgs, {
    cwd: ROOT,
    env: { ...process.env, MCP_STARTUP_HEALTH: 'defer' },
    stdio: 'inherit',
  })
  bridgeProcess = child
  children.push(child)

  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    if (bridgeProcess !== child) return
    bridgeProcess = null
    bridgeRestarting = false
    const why = signal || code
    console.warn(`[dev] Bridge 进程退出 (${why})，2s 后自动重启…`)
    setTimeout(() => {
      if (!shuttingDown) void restartBridge('process-exit')
    }, 2000)
  })

  child.on('spawn', () => {
    bridgeRestarting = false
  })

  return child
}

async function restartBridge(reason) {
  if (shuttingDown || bridgeRestarting) return
  await startBridge({ reason })
  const ok = await waitUrl(BRIDGE_HEALTH, 60, 200)
  if (ok) {
    bridgeUnhealthyStreak = 0
    console.log(`[dev] Bridge 已恢复 http://127.0.0.1:${BRIDGE_HTTP_PORT}`)
  } else {
    console.warn('[dev] Bridge 重启后仍未就绪，看门狗将继续重试')
  }
}

function startBridgeWatchdog() {
  const timer = setInterval(() => {
    void (async () => {
      if (shuttingDown || bridgeRestarting) return
      const healthy = await isBridgeHealthy()
      if (healthy) {
        bridgeUnhealthyStreak = 0
        return
      }
      bridgeUnhealthyStreak++
      // 容忍短暂重启窗口（含 stopBridge + bind retry）
      if (bridgeUnhealthyStreak < 6) return
      console.warn(
        `[dev] Bridge ${bridgeUnhealthyStreak * 2}s 无响应，正在重启（可能因代码热更新或进程崩溃）…`,
      )
      bridgeUnhealthyStreak = 0
      await restartBridge('health-timeout')
    })()
  }, 2000)
  timer.unref()
  return timer
}

function triggerMcpStartupHealth() {
  void fetch(`http://127.0.0.1:${BRIDGE_HTTP_PORT}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: 'mcp:healthCheckAll', args: [] }),
  }).catch(() => {})
}

async function isBrowserHostReady() {
  try {
    const res = await fetch(`${BRIDGE_HEALTH.replace('/health', '')}/workbench-browser/capabilities`)
    if (!res.ok) return false
    const data = await res.json()
    return data?.browserHostConnected === true
  } catch {
    return false
  }
}

function startBackgroundBrowserHost() {
  const electronBin = path.join(DESKTOP_DIR, 'node_modules', '.bin', 'electron')
  if (!fs.existsSync(electronBin)) {
    console.warn('[dev] 未安装 desktop 依赖，Web 内嵌浏览器不可用。请运行 npm run desktop:install')
    return null
  }
  console.log('[dev] 启动后台 browser-host（无桌面窗口）…')
  return run(electronBin, ['.'], {
    cwd: DESKTOP_DIR,
    env: { ...process.env, CLAUDE_ORCHESTRATOR_BROWSER_HOST_ONLY: '1' },
  })
}
function focusElectronOnMac() {
  if (process.platform !== 'darwin') return
  setTimeout(() => {
    try {
      execFileSync(
        'osascript',
        [
          '-e',
          'tell application "System Events" to set frontmost of first process whose name is "Electron" or name is "Claude Orchestrator" to true',
        ],
        { stdio: 'ignore' },
      )
    } catch {
      /* ignore */
    }
  }, 1500)
}

function cleanup() {
  shuttingDown = true
  void stopBridge()
  for (const c of children) {
    try {
      c.kill('SIGTERM')
    } catch {
      /* ignore */
    }
  }
}

process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})
process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})

ensureDeps()

await startBridge({ initial: true })
startBridgeWatchdog()

await waitPortFree(5188)
console.log('[dev] 启动 Vite…')
const vite = run('npm', ['run', 'web:dev'], { cwd: ROOT })

const bridgeOk = await waitUrl(BRIDGE_HEALTH, 80, 200)
if (!bridgeOk) {
  console.error(`[dev] Bridge 未在 :${BRIDGE_HTTP_PORT} 就绪`)
  cleanup()
  process.exit(1)
}
console.log(`[dev] Bridge 已就绪 http://127.0.0.1:${BRIDGE_HTTP_PORT}`)

const webOk = await waitUrl(WEB_URL, 160, 250)
if (!webOk) {
  console.error('[dev] Web 未在 :5188 就绪')
  cleanup()
  process.exit(1)
}
console.log('[dev] Web 已就绪 http://127.0.0.1:5188')
triggerMcpStartupHealth()

async function waitForBrowserHost() {
  for (let i = 0; i < 40; i++) {
    if (await isBrowserHostReady()) {
      console.log('[dev] browser-host 已连接 Bridge')
      return true
    }
    await sleep(250)
  }
  console.warn('[dev] browser-host 尚未连接 Bridge，内嵌浏览器可能暂不可用')
  return false
}

if (process.env.CLAUDE_ORCHESTRATOR_SKIP_ELECTRON === '1') {
  console.log('[dev] 仅 Web 模式（不打开桌面窗口；内嵌浏览器使用编辑器内容区 iframe）')
  if (process.env.CLAUDE_ORCHESTRATOR_USE_OVERLAY_BROWSER === '1') {
    const browserHost = startBackgroundBrowserHost()
    if (browserHost) children.push(browserHost)
    void waitForBrowserHost()
  }
  vite.on('exit', (code) => {
    cleanup()
    process.exit(code ?? 0)
  })
} else {
  const electronBin = path.join(DESKTOP_DIR, 'node_modules', '.bin', 'electron')
  if (!fs.existsSync(electronBin)) {
    console.error('[dev] 未安装 desktop 依赖。请运行 npm run desktop:install')
    cleanup()
    process.exit(1)
  }

  console.log('[dev] 打开 Claude Orchestrator 桌面窗口…')
  focusElectronOnMac()

  const electron = run(electronBin, ['.'], { cwd: DESKTOP_DIR })

  electron.on('exit', (code) => {
    cleanup()
    process.exit(code ?? 0)
  })

  vite.on('exit', (code) => {
    if (code && code !== 0) {
      try {
        electron.kill('SIGTERM')
      } catch {
        /* ignore */
      }
    }
  })
}
