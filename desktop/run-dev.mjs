#!/usr/bin/env node
/**
 * 一键启动：Bridge + Vite + Electron 桌面窗口
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const BRIDGE_URL = 'http://127.0.0.1:18790/health'
const WEB_URL = 'http://127.0.0.1:5188/'

const children = []

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
    stdio: opts.stdio || 'inherit',
    shell: false,
  })
  children.push(child)
  return child
}

async function waitUrl(url, attempts = 80, ms = 250) {
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

function cleanup() {
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

console.log('[desktop] 启动 Bridge…')
run('node', ['--watch', 'server/index.mjs'], {
  env: { MCP_STARTUP_HEALTH: 'defer' },
})

console.log('[desktop] 启动 Web UI…')
run('npm', ['run', 'web:dev'], { cwd: ROOT })

const bridgeOk = await waitUrl(BRIDGE_URL)
if (!bridgeOk) {
  console.error('[desktop] Bridge 未在 :18790 就绪，请检查 server/index.mjs')
  cleanup()
  process.exit(1)
}

const webOk = await waitUrl(WEB_URL)
if (!webOk) {
  console.error('[desktop] Web 未在 :5188 就绪，请检查 npm run web:dev')
  cleanup()
  process.exit(1)
}

console.log('[desktop] 打开 Claude Orchestrator 窗口…')
const electronBin = path.join(__dirname, 'node_modules', '.bin', 'electron')
const electron = run(electronBin, ['.'], { cwd: __dirname })

electron.on('exit', (code) => {
  cleanup()
  process.exit(code ?? 0)
})
