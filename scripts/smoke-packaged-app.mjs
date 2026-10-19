#!/usr/bin/env node
/**
 * 打包后冒烟（硬门禁）：
 * 1) asar / backend / better-sqlite3≥13
 * 2) 用打包内 Electron（ELECTRON_RUN_AS_NODE）拉起 Bridge+UI，校验浏览器可达
 * 3) 清除 ELECTRON_RUN_AS_NODE 后启动完整 GUI，再校验端口
 * 任一失败非零退出。
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DESKTOP = path.join(ROOT, 'desktop')
const RELEASE = path.join(DESKTOP, 'release')

const HTTP_PORT = Number(process.env.WORKBENCH_HTTP_PORT) || 18790
const UI_PORT = Number(process.env.WORKBENCH_UI_PORT) || 5188

function findApp() {
  const env = process.env.PACKAGED_APP?.trim()
  if (env && fs.existsSync(env)) return env
  for (const c of [
    path.join(RELEASE, 'mac-arm64', 'Claude Orchestrator.app'),
    path.join(RELEASE, 'mac', 'Claude Orchestrator.app'),
  ]) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function electronBin(appPath) {
  const macos = path.join(appPath, 'Contents', 'MacOS')
  const bins = fs.readdirSync(macos).filter((n) => !n.startsWith('.'))
  if (!bins.length) throw new Error(`无可执行文件：${macos}`)
  return path.join(macos, bins[0])
}

function freePort(port) {
  const r = spawnSync('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], { encoding: 'utf8' })
  for (const pid of String(r.stdout || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)) {
    try {
      process.kill(Number(pid), 'SIGKILL')
    } catch {
      /* ignore */
    }
  }
}

function quitApp() {
  spawnSync('osascript', ['-e', 'quit app "Claude Orchestrator"'], { stdio: 'ignore' })
  spawnSync('killall', ['Claude Orchestrator'], { stdio: 'ignore' })
}

function cleanPorts() {
  for (const p of [HTTP_PORT, UI_PORT, 18789]) freePort(p)
}

function fetchText(url, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () =>
        resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }),
      )
    })
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`timeout ${url}`))
    })
    req.on('error', reject)
  })
}

async function waitOk(url, attempts = 80, ms = 250) {
  let last = ''
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchText(url)
      if (res.status >= 200 && res.status < 400) return res
      last = `HTTP ${res.status}`
    } catch (e) {
      last = e instanceof Error ? e.message : String(e)
    }
    await new Promise((r) => setTimeout(r, ms))
  }
  throw new Error(`${url} 未就绪：${last}`)
}

function assertAsar(appPath) {
  const asar = path.join(appPath, 'Contents', 'Resources', 'app.asar')
  if (!fs.existsSync(asar)) throw new Error(`缺少 app.asar：${asar}`)
  const list = spawnSync(path.join(DESKTOP, 'node_modules', '.bin', 'asar'), ['list', asar], {
    encoding: 'utf8',
  })
  const out = `${list.stdout || ''}${list.stderr || ''}`
  if (list.status !== 0) throw new Error(`asar list 失败：${out}`)
  for (const need of ['/bridge-constants.mjs', '/runtime.mjs', '/preload.cjs', '/main.mjs']) {
    if (!out.includes(need)) throw new Error(`asar 缺少 ${need}`)
  }
  if (out.includes('/ensure-dev-bridge.mjs')) throw new Error('asar 不应包含 ensure-dev-bridge.mjs')
  console.log('[smoke] asar 结构 OK')
}

function assertBackend(appPath) {
  const backend = path.join(appPath, 'Contents', 'Resources', 'backend')
  const serverIndex = path.join(backend, 'server', 'index.mjs')
  const uiIndex = path.join(backend, 'web-dist', 'index.html')
  const sqlitePkg = path.join(
    backend,
    'server',
    'vendor',
    'cad',
    'node_modules',
    'better-sqlite3',
    'package.json',
  )
  if (!fs.existsSync(serverIndex)) throw new Error(`缺少后端：${serverIndex}`)
  if (!fs.existsSync(uiIndex)) throw new Error(`缺少前端：${uiIndex}`)
  if (!fs.existsSync(sqlitePkg)) throw new Error(`缺少 better-sqlite3：${sqlitePkg}`)
  const ver = JSON.parse(fs.readFileSync(sqlitePkg, 'utf8')).version
  if (!(Number(String(ver).split('.')[0]) >= 13)) {
    throw new Error(`打包内 better-sqlite3 须 ≥13，当前 ${ver}`)
  }
  // P2-4：shared/ 与 orch 续写必须进包（禁止缺 direct-chat-policy / continue）
  const sharedPolicy = path.join(backend, 'shared', 'direct-chat-policy.mjs')
  if (!fs.existsSync(sharedPolicy)) {
    throw new Error(`打包缺少 shared/direct-chat-policy.mjs：${sharedPolicy}`)
  }
  const orchCandidates = [
    path.join(backend, 'server', 'vendor', 'cad', 'local-mcp-orchestrator.js'),
    path.join(backend, 'vendor', 'cad', 'local-mcp-orchestrator.js'),
  ]
  const orchPath = orchCandidates.find((p) => fs.existsSync(p))
  if (!orchPath) throw new Error('打包缺少 local-mcp-orchestrator.js')
  const orchSrc = fs.readFileSync(orchPath, 'utf8')
  if (!/maxContinues|auto-continue|looksLikeIncompleteAssistantReply/.test(orchSrc)) {
    throw new Error('打包 orch 缺少续写符号（maxContinues / auto-continue）')
  }
  if (!/direct-chat-policy/.test(orchSrc)) {
    throw new Error('打包 orch 未引用 direct-chat-policy')
  }
  console.log(`[smoke] backend OK (better-sqlite3 ${ver}; shared+continue OK)`)
  return backend
}

function spawnPackagedNode(bin, scriptAbs, envExtra, logFd) {
  const backend = path.dirname(path.dirname(scriptAbs)) // .../backend/server -> wrong
  // scriptAbs = .../backend/server/index.mjs → backend root = dirname(dirname(script))
  const serverDir = path.dirname(scriptAbs)
  const backendRoot = path.dirname(serverDir)
  const nodePath = [
    path.join(backendRoot, 'node_modules'),
    path.join(serverDir, 'vendor', 'cad', 'node_modules'),
  ]
    .filter((p) => fs.existsSync(p))
    .join(path.delimiter)

  const child = spawn(bin, [scriptAbs], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_PATH: nodePath,
      MCP_STARTUP_HEALTH: 'delayed',
      CLAUDE_ORCHESTRATOR_USER_DATA: path.join(RELEASE, '.smoke-userdata'),
      CLAUDE_ORCHESTRATOR_PROJECT_ROOT: path.join(RELEASE, '.smoke-userdata', 'project'),
      ...envExtra,
    },
    stdio: ['ignore', logFd, logFd],
  })
  return child
}

async function smokeHeadlessServices(appPath, bin, backend, logFd) {
  console.log('[smoke] 无 GUI：启动打包 Bridge + UI…')
  cleanPorts()
  fs.mkdirSync(path.join(RELEASE, '.smoke-userdata', 'project'), { recursive: true })

  const bridge = spawnPackagedNode(bin, path.join(backend, 'server', 'index.mjs'), {
    WORKBENCH_HTTP_PORT: String(HTTP_PORT),
    WORKBENCH_UI_PORT: String(UI_PORT),
  }, logFd)

  try {
    const health = await waitOk(`http://127.0.0.1:${HTTP_PORT}/health`)
    if (!/"ok"\s*:\s*true/.test(health.body)) {
      throw new Error(`health 异常：${health.body.slice(0, 200)}`)
    }
    console.log('[smoke] Bridge /health OK')

    const ui = spawnPackagedNode(
      bin,
      path.join(backend, 'server', 'packaged-ui-server.mjs'),
      {
        WEB_STATIC_DIR: path.join(backend, 'web-dist'),
        WORKBENCH_UI_PORT: String(UI_PORT),
        WORKBENCH_HTTP_PORT: String(HTTP_PORT),
      },
      logFd,
    )

    try {
      const uiHealth = await waitOk(`http://127.0.0.1:${UI_PORT}/api/health`)
      if (!/"ok"\s*:\s*true/.test(uiHealth.body)) {
        throw new Error(`ui health 异常：${uiHealth.body.slice(0, 200)}`)
      }
      console.log('[smoke] UI /api/health OK')

      const page = await waitOk(`http://127.0.0.1:${UI_PORT}/`)
      if (!/html|doctype|script/i.test(page.body)) {
        throw new Error(`UI 首页异常：${page.body.slice(0, 120)}`)
      }
      console.log('[smoke] UI / 可访问 OK')

      await assertRpcChannels(UI_PORT)
    } finally {
      try {
        ui.kill('SIGTERM')
      } catch {
        /* ignore */
      }
    }
  } finally {
    try {
      bridge.kill('SIGTERM')
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 400))
    cleanPorts()
  }
}

async function postRpc(uiPort, channel, args = []) {
  const body = JSON.stringify({ channel, args })
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: uiPort,
        path: '/api/rpc',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let data = null
          try {
            data = text ? JSON.parse(text) : null
          } catch {
            data = { raw: text }
          }
          resolve({ status: res.statusCode || 0, data })
        })
      },
    )
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`RPC timeout ${channel}`))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function assertRpcChannels(uiPort) {
  for (const channel of [
    'chat-settings:get',
    'cloud-providers:status',
    'ollama:listModels',
  ]) {
    const args = channel === 'ollama:listModels' ? ['http://127.0.0.1:11434'] : []
    const r = await postRpc(uiPort, channel, args)
    if (r.status < 200 || r.status >= 500) {
      throw new Error(`RPC ${channel} HTTP ${r.status}`)
    }
    // ollama 未运行时 ok:false 可接受；通道必须可达
    if (channel !== 'ollama:listModels' && r.data && r.data.ok === false && r.data.error) {
      // chat-settings / cloud-providers 应可读
      if (channel === 'chat-settings:get') {
        throw new Error(`RPC ${channel} 失败：${r.data.error}`)
      }
    }
    console.log(`[smoke] RPC ${channel} OK (HTTP ${r.status})`)
  }
}

async function smokeGui(appPath, bin, logFd) {
  console.log('[smoke] GUI：启动完整应用（清除 ELECTRON_RUN_AS_NODE）…')
  quitApp()
  cleanPorts()
  await new Promise((r) => setTimeout(r, 400))

  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE

  const child = spawn(bin, [], {
    env,
    stdio: ['ignore', logFd, logFd],
    detached: true,
  })
  child.unref()

  try {
    const health = await waitOk(`http://127.0.0.1:${HTTP_PORT}/health`, 100, 300)
    if (!/"ok"\s*:\s*true/.test(health.body)) {
      throw new Error(`GUI health 异常：${health.body.slice(0, 200)}`)
    }
    console.log('[smoke] GUI Bridge /health OK')
    const uiHealth = await waitOk(`http://127.0.0.1:${UI_PORT}/api/health`, 60, 300)
    if (!/"ok"\s*:\s*true/.test(uiHealth.body)) {
      throw new Error(`GUI ui health 异常：${uiHealth.body.slice(0, 200)}`)
    }
    console.log('[smoke] GUI UI /api/health OK')
    const page = await waitOk(`http://127.0.0.1:${UI_PORT}/`)
    if (!/html|doctype|script/i.test(page.body)) {
      throw new Error(`GUI UI 首页异常：${page.body.slice(0, 120)}`)
    }
    console.log('[smoke] GUI UI / 可访问 OK')
  } finally {
    quitApp()
    try {
      child.kill('SIGKILL')
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 800))
    cleanPorts()
  }
}

const appPath = findApp()
if (!appPath) {
  console.error('[smoke] 未找到 Claude Orchestrator.app')
  process.exit(1)
}

const logPath = path.join(RELEASE, 'smoke-packaged.log')
const logFd = fs.openSync(logPath, 'w')

try {
  console.log(`[smoke] ${appPath}`)
  assertAsar(appPath)
  const backend = assertBackend(appPath)
  const bin = electronBin(appPath)
  spawnSync('xattr', ['-cr', appPath], { stdio: 'ignore' })

  await smokeHeadlessServices(appPath, bin, backend, logFd)
  await smokeGui(appPath, bin, logFd)

  console.log('[smoke] 打包应用启动与浏览器可达性校验通过 ✓')
  process.exit(0)
} catch (err) {
  console.error('[smoke] 失败：', err instanceof Error ? err.message : err)
  try {
    console.error('--- log ---')
    console.error(fs.readFileSync(logPath, 'utf8').slice(-8000))
  } catch {
    /* ignore */
  }
  quitApp()
  cleanPorts()
  process.exit(1)
} finally {
  try {
    fs.closeSync(logFd)
  } catch {
    /* ignore */
  }
}
