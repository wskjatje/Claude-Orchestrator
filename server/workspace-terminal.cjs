'use strict'

const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const PY_PTY_BRIDGE = path.join(__dirname, 'terminal-pty-bridge.py')

function pythonPtyBridgeAvailable() {
  try {
    if (!fs.existsSync(PY_PTY_BRIDGE)) return false
    const r = spawnSync('python3', ['-c', 'import pty'], { stdio: 'ignore' })
    return r.status === 0
  } catch {
    return false
  }
}

const hasPythonPty = pythonPtyBridgeAvailable()

function resolveShell(requested) {
  if (typeof requested === 'string' && requested.trim()) {
    const s = requested.trim()
    if (s.includes('/')) return s
    if (s === 'bash') return '/bin/bash'
    if (s === 'zsh') return '/bin/zsh'
    if (s === 'sh') return '/bin/sh'
    return s
  }
  return process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh')
}

/** @type {typeof import('node-pty') | null} */
let nodePty = null
try {
  nodePty = require('node-pty')
} catch {
  nodePty = null
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {() => string | null | undefined} getWorkspace
 */
function attachTerminalToWebSocket(ws, getWorkspace) {
  /** @type {import('node-pty').IPty | null} */
  let ptyProc = null
  /** @type {import('node:child_process').ChildProcess | null} */
  let spawnProc = null
  /** @type {number | null} */
  let spawnProcGroup = null
  /** @type {'pty' | 'python-pty' | 'pipe' | null} */
  let sessionMode = null
  let started = false

  const send = (obj) => {
    if (ws.readyState === 1) ws.send(JSON.stringify(obj))
  }

  const signalSpawnTree = (signal) => {
    if (!spawnProc?.pid) return
    const sig = signal || 'SIGINT'
    if (process.platform !== 'win32') {
      const pgid = spawnProcGroup ?? -spawnProc.pid
      try {
        process.kill(-Math.abs(pgid), sig)
        return
      } catch {
        /* fall through */
      }
    }
    try {
      spawnProc.kill(sig)
    } catch {
      /* ignore */
    }
  }

  const killSession = () => {
    if (ptyProc) {
      try {
        ptyProc.kill()
      } catch {
        /* ignore */
      }
      ptyProc = null
    }
    if (spawnProc) {
      try {
        if (process.platform !== 'win32' && spawnProc.pid) {
          try {
            process.kill(-Math.abs(spawnProcGroup ?? spawnProc.pid), 'SIGTERM')
          } catch {
            spawnProc.kill('SIGTERM')
          }
        } else {
          spawnProc.kill('SIGTERM')
        }
      } catch {
        /* ignore */
      }
      spawnProc = null
    }
    spawnProcGroup = null
    started = false
    sessionMode = null
  }

  const startSession = (opts) => {
    killSession()
    const wsDir = getWorkspace()
    let cwd = typeof opts?.cwd === 'string' && opts.cwd.trim() ? opts.cwd.trim() : wsDir
    if (!cwd || !fs.existsSync(cwd)) cwd = wsDir || process.cwd()
    if (!fs.existsSync(cwd)) cwd = process.cwd()

    const cols = Math.max(20, Number(opts?.cols) || 80)
    const rows = Math.max(5, Number(opts?.rows) || 24)
    const shell = resolveShell(opts?.shell)
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: process.env.LANG || 'en_US.UTF-8',
    }

    if (nodePty) {
      try {
        ptyProc = nodePty.spawn(shell, ['-il'], {
          name: 'xterm-256color',
          cols,
          rows,
          cwd,
          env: { ...env, COLUMNS: String(cols), LINES: String(rows) },
        })
        ptyProc.onData((data) => send({ type: 'terminal:output', data }))
        ptyProc.onExit(({ exitCode }) => {
          send({ type: 'terminal:exit', exitCode: exitCode ?? 0 })
          ptyProc = null
          started = false
        })
        started = true
        sessionMode = 'pty'
        send({
          type: 'terminal:started',
          cwd,
          shell,
          mode: 'pty',
          cols,
          rows,
        })
        return
      } catch (e) {
        console.warn('[terminal] node-pty spawn failed, trying python pty bridge:', e?.message || e)
      }
    }

    const shellEnv = { ...env, COLUMNS: String(cols), LINES: String(rows) }

    if (hasPythonPty) {
      try {
        spawnProc = spawn('python3', ['-u', PY_PTY_BRIDGE, cwd], {
          cwd,
          env: shellEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
          detached: process.platform !== 'win32',
        })
        spawnProcGroup = spawnProc.pid
        const onData = (chunk) => send({ type: 'terminal:output', data: chunk.toString() })
        spawnProc.stdout?.on('data', onData)
        spawnProc.stderr?.on('data', onData)
        spawnProc.on('exit', (code) => {
          send({ type: 'terminal:exit', exitCode: code ?? 0 })
          spawnProc = null
          started = false
        })
        started = true
        sessionMode = 'python-pty'
        send({
          type: 'terminal:started',
          cwd,
          shell,
          mode: 'python-pty',
          cols,
          rows,
        })
        return
      } catch (e) {
        console.warn('[terminal] python pty bridge failed, falling back to pipe:', e?.message || e)
      }
    }

    try {
      spawnProc = spawn(shell, ['-il'], {
        cwd,
        env: shellEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        detached: process.platform !== 'win32',
      })
      spawnProcGroup = spawnProc.pid
      const onData = (chunk) => send({ type: 'terminal:output', data: chunk.toString() })
      spawnProc.stdout?.on('data', onData)
      spawnProc.stderr?.on('data', onData)
      spawnProc.on('exit', (code) => {
        send({ type: 'terminal:exit', exitCode: code ?? 0 })
        spawnProc = null
        started = false
      })
      started = true
      sessionMode = 'pipe'
      send({
        type: 'terminal:started',
        cwd,
        shell,
        mode: 'pipe',
        cols,
        rows,
        warning: nodePty
          ? 'node-pty 暂不可用，终端为管道模式；可正常执行 python、npm 等命令。'
          : '未安装 node-pty，终端为管道模式；可正常执行 python、npm 等命令。',
      })
    } catch (e) {
      send({ type: 'terminal:error', error: e?.message || String(e) })
    }
  }

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }
    if (!msg || typeof msg !== 'object') return

    if (msg.type === 'terminal:start') {
      startSession(msg)
      return
    }
    if (msg.type === 'terminal:input') {
      const data = typeof msg.data === 'string' ? msg.data : ''
      if (ptyProc) {
        ptyProc.write(data)
      } else if (spawnProc?.stdin?.writable) {
        spawnProc.stdin.write(data)
        if (sessionMode === 'pipe' && data.includes('\x03')) {
          signalSpawnTree('SIGINT')
        }
      }
      return
    }
    if (msg.type === 'terminal:interrupt') {
      if (ptyProc) ptyProc.write('\x03')
      else signalSpawnTree('SIGINT')
      return
    }
    if (msg.type === 'terminal:resize') {
      const cols = Math.max(20, Number(msg.cols) || 80)
      const rows = Math.max(5, Number(msg.rows) || 24)
      if (ptyProc) {
        try {
          ptyProc.resize(cols, rows)
        } catch {
          /* ignore */
        }
      }
      return
    }
    if (msg.type === 'terminal:kill') {
      killSession()
      send({ type: 'terminal:exit', exitCode: 0 })
    }
  })

  ws.on('close', killSession)
}

module.exports = {
  attachTerminalToWebSocket,
  isPtyAvailable: () => Boolean(nodePty),
}
