/**
 * 打包版运行时：随 Electron 启动 Bridge + 静态 UI，无需 npm run desktop
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

/** @type {import('node:child_process').ChildProcess[]} */
const children = []
let started = false

function getPackagedBackendPaths() {
  const resources = process.resourcesPath
  return {
    serverDir: path.join(resources, 'backend', 'server'),
    webDist: path.join(resources, 'backend', 'web-dist'),
    nodeModules: path.join(resources, 'backend', 'node_modules'),
    vendorCad: path.join(resources, 'backend', 'server', 'vendor', 'cad', 'node_modules'),
  }
}

function ensureUserProjectRoot() {
  const userData = app.getPath('userData')
  const projectRoot = path.join(userData, 'project')
  fs.mkdirSync(projectRoot, { recursive: true })
  fs.mkdirSync(path.join(userData, '.claudecode'), { recursive: true })
  return { userData, projectRoot }
}

async function waitUrl(url, attempts = 120, ms = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, ms))
  }
  return false
}

function spawnBackendNode(scriptAbs, envExtra = {}) {
  const paths = getPackagedBackendPaths()
  const { userData, projectRoot } = ensureUserProjectRoot()
  const nodePath = [paths.nodeModules, paths.vendorCad].filter((p) => fs.existsSync(p)).join(path.delimiter)

  const child = spawn(process.execPath, [scriptAbs], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_PATH: nodePath,
      CLAUDE_ORCHESTRATOR_USER_DATA: userData,
      CLAUDE_ORCHESTRATOR_PROJECT_ROOT: projectRoot,
      MCP_STARTUP_HEALTH: 'immediate',
      ...envExtra,
    },
    cwd: paths.serverDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', (buf) => {
    process.stdout.write(buf)
  })
  child.stderr?.on('data', (buf) => {
    process.stderr.write(buf)
  })

  children.push(child)
  return child
}

export async function startPackagedRuntime() {
  if (started) {
    return { url: 'http://127.0.0.1:5188/' }
  }
  const paths = getPackagedBackendPaths()
  if (!fs.existsSync(path.join(paths.serverDir, 'index.mjs'))) {
    throw new Error(`打包后端缺失：${paths.serverDir}`)
  }
  if (!fs.existsSync(path.join(paths.webDist, 'index.html'))) {
    throw new Error(`打包前端缺失：${paths.webDist}`)
  }

  spawnBackendNode(path.join(paths.serverDir, 'index.mjs'))

  const bridgeOk = await waitUrl('http://127.0.0.1:18790/health')
  if (!bridgeOk) {
    stopPackagedRuntime()
    throw new Error('本机 Bridge 未能在 18790 端口就绪')
  }

  spawnBackendNode(path.join(paths.serverDir, 'packaged-ui-server.mjs'), {
    WEB_STATIC_DIR: paths.webDist,
    WORKBENCH_UI_PORT: '5188',
    WORKBENCH_HTTP_PORT: '18790',
  })

  const uiOk = await waitUrl('http://127.0.0.1:5188/')
  if (!uiOk) {
    stopPackagedRuntime()
    throw new Error('UI 未能在 5188 端口就绪')
  }

  started = true
  return { url: 'http://127.0.0.1:5188/' }
}

export function stopPackagedRuntime() {
  started = false
  for (const c of children) {
    try {
      c.kill('SIGTERM')
    } catch {
      /* ignore */
    }
  }
  children.length = 0
}
