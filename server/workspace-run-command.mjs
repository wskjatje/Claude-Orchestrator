/**
 * 工作区内安全执行命令（终端进工具环）。
 * 优先 node-pty（真 TTY）；失败硬降级为管道 spawn，并在结果中标明 ptyMode。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { loadWorkspace } from './store.mjs'

const require = createRequire(import.meta.url)

const DEFAULT_TIMEOUT_MS = 120_000
const MAX_TIMEOUT_MS = 180_000
const MAX_OUTPUT = 24_000

/**
 * @typedef {{ kind: 'pty', handle: { kill: Function, onData: Function, onExit: Function } } | { kind: 'child', handle: import('node:child_process').ChildProcess }}
 * ActiveRun
 */

/** @type {Map<string, ActiveRun>} */
const activeByRunId = new Map()

/**
 * 中止 Agent 工具环中的受控命令（可按 requestId / runId）
 * @param {string} [runId]
 */
export function abortWorkspaceRunCommand(runId) {
  const id = String(runId || '').trim()
  const killOne = (entry) => {
    try {
      if (entry.kind === 'pty') entry.handle.kill()
      else entry.handle.kill('SIGKILL')
    } catch {
      /* ignore */
    }
  }
  if (id) {
    const entry = activeByRunId.get(id)
    if (entry) {
      killOne(entry)
      activeByRunId.delete(id)
      return { ok: true, aborted: 1 }
    }
    return { ok: false, aborted: 0 }
  }
  let n = 0
  for (const [k, entry] of activeByRunId) {
    killOne(entry)
    activeByRunId.delete(k)
    n += 1
  }
  return { ok: n > 0, aborted: n }
}

const DENY_RE =
  /\b(rm\s+-rf\s+[\/~]|mkfs|dd\s+if=|:(){:|:&};:|curl\s+[^\n|]*\|\s*(ba)?sh|wget\s+[^\n|]*\|\s*(ba)?sh|shutdown|reboot|diskutil\s+erase|chmod\s+-R\s+777\s+\/)/i

/**
 * @param {string} cmd
 */
export function isDeniedCommand(cmd) {
  const c = String(cmd || '').trim()
  if (!c) return true
  if (DENY_RE.test(c)) return true
  if (/(^|[;&|])\s*rm\s+-rf\s+\.(?:\s|$)/i.test(c) && !/\.\/[\w.-]+/.test(c)) return true
  return false
}

/**
 * Ask 模式仅允许只读探测类命令
 * @param {string} cmd
 */
export function isAskSafeCommand(cmd) {
  const c = String(cmd || '').trim()
  if (!c) return false
  return /^(pytest\s+--collect-only|python\s+-m\s+pytest\s+--collect-only|npm\s+(test|run)\s+--dry-run|git\s+(status|diff|log|branch|rev-parse|show)|ls(\s|$)|pwd|which\s|python\s+--version|node\s+--version|npm\s+--version|pip\s+(list|show)|ruff\s+check|mypy\s+)/i.test(
    c,
  )
}

function resolveCwd(root, cwdRel) {
  const rel = String(cwdRel || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
  if (!rel || rel === '.') return root
  if (rel.includes('..')) return null
  const abs = path.resolve(root, rel)
  if (!abs.startsWith(root)) return null
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return null
  return abs
}

function tryLoadNodePty() {
  try {
    return require('node-pty')
  } catch {
    return null
  }
}

/**
 * @param {{
 *   command?: string,
 *   cwd?: string,
 *   timeoutMs?: number,
 *   mode?: string,
 *   runId?: string,
 * }} body
 */
export function workspaceRunCommand(body) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(workspaceDir)
  const command = String(body?.command || '').trim()
  if (!command) return { ok: false, error: 'empty command' }
  if (isDeniedCommand(command)) {
    return { ok: false, error: '命令被安全策略拒绝' }
  }
  const mode = String(body?.mode || 'agent').toLowerCase()
  if (mode === 'ask' && !isAskSafeCommand(command)) {
    return { ok: false, error: 'Ask 模式仅允许只读探测命令（如 git status / pytest --collect-only）' }
  }
  const cwd = resolveCwd(root, body?.cwd)
  if (!cwd) return { ok: false, error: '无效 cwd' }
  const timeoutMs = Math.min(
    MAX_TIMEOUT_MS,
    Math.max(5_000, Number(body?.timeoutMs) || DEFAULT_TIMEOUT_MS),
  )
  const runId = String(body?.runId || '').trim()
  const env = { ...process.env, FORCE_COLOR: '0', PYTHONUNBUFFERED: '1', TERM: 'xterm-256color' }

  const nodePty = tryLoadNodePty()
  if (nodePty) {
    return runViaPty(nodePty, {
      command,
      cwd,
      root,
      env,
      timeoutMs,
      runId,
    })
  }

  return runViaPipe({ command, cwd, root, env, timeoutMs, runId, ptyMode: 'pipe' })
}

/**
 * @param {typeof import('node-pty')} nodePty
 * @param {{ command: string, cwd: string, root: string, env: NodeJS.ProcessEnv, timeoutMs: number, runId: string }} opts
 */
function runViaPty(nodePty, opts) {
  const { command, cwd, root, env, timeoutMs, runId } = opts
  return new Promise((resolve) => {
    let ptyProc
    try {
      ptyProc = nodePty.spawn('/bin/zsh', ['-lc', command], {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd,
        env,
      })
    } catch (e) {
      // 硬降级：标明非完整 PTY，禁止假装成功
      void runViaPipe({
        command,
        cwd,
        root,
        env,
        timeoutMs,
        runId,
        ptyMode: 'pipe',
        ptyFallbackReason: e?.message || String(e),
      }).then(resolve)
      return
    }

    if (runId) activeByRunId.set(runId, { kind: 'pty', handle: ptyProc })
    let stdout = ''
    let killed = false
    let settled = false
    const timer = setTimeout(() => {
      killed = true
      try {
        ptyProc.kill()
      } catch {
        /* ignore */
      }
    }, timeoutMs)

    const finish = (payload) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (runId) activeByRunId.delete(runId)
      resolve(payload)
    }

    ptyProc.onData((d) => {
      if (stdout.length < MAX_OUTPUT) stdout += String(d)
    })
    ptyProc.onExit(({ exitCode, signal }) => {
      const aborted = Boolean(signal) && !killed
      const code = killed || aborted ? 124 : exitCode ?? 1
      // PTY 常带 ANSI；工具环回显保留可读正文，去掉光标控制以免污染气泡/trace
      const scrubbed = scrubPtyOutput(stdout).slice(0, MAX_OUTPUT)
      finish({
        ok: code === 0,
        exitCode: code,
        timedOut: killed,
        aborted,
        command,
        cwd: path.relative(root, cwd) || '.',
        output:
          scrubbed ||
          (killed ? '（超时无输出）' : aborted ? '（已中止）' : '（无输出）'),
        truncated: stdout.length > MAX_OUTPUT,
        ptyMode: 'pty',
      })
    })
  })
}

/** 去掉常见 CSI/OSC，保留换行与可打印字符 */
function scrubPtyOutput(text) {
  return String(text || '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[()][0-9A-Za-z]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

/**
 * @param {{
 *   command: string,
 *   cwd: string,
 *   root: string,
 *   env: NodeJS.ProcessEnv,
 *   timeoutMs: number,
 *   runId: string,
 *   ptyMode?: string,
 *   ptyFallbackReason?: string,
 * }} opts
 */
function runViaPipe(opts) {
  const { command, cwd, root, env, timeoutMs, runId, ptyMode = 'pipe', ptyFallbackReason } = opts
  return new Promise((resolve) => {
    const child = spawn('/bin/zsh', ['-lc', command], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (runId) activeByRunId.set(runId, { kind: 'child', handle: child })
    let stdout = ''
    let stderr = ''
    let killed = false
    let aborted = false
    const timer = setTimeout(() => {
      killed = true
      try {
        child.kill('SIGKILL')
      } catch {
        /* ignore */
      }
    }, timeoutMs)
    child.stdout?.on('data', (d) => {
      if (stdout.length < MAX_OUTPUT) stdout += String(d)
    })
    child.stderr?.on('data', (d) => {
      if (stderr.length < MAX_OUTPUT) stderr += String(d)
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      if (runId) activeByRunId.delete(runId)
      resolve({
        ok: false,
        error: e.message,
        command,
        cwd: path.relative(root, cwd) || '.',
        ptyMode,
        ...(ptyFallbackReason ? { ptyFallbackReason } : {}),
      })
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (runId) activeByRunId.delete(runId)
      aborted = signal === 'SIGKILL' && !killed
      const exitCode = killed || aborted ? 124 : code ?? 1
      const out = (stdout + (stderr ? `\n${stderr}` : '')).slice(0, MAX_OUTPUT)
      resolve({
        ok: exitCode === 0,
        exitCode,
        timedOut: killed,
        aborted,
        command,
        cwd: path.relative(root, cwd) || '.',
        output:
          out ||
          (killed ? '（超时无输出）' : aborted ? '（已中止）' : '（无输出）'),
        truncated: stdout.length + stderr.length > MAX_OUTPUT,
        ptyMode,
        ...(ptyFallbackReason ? { ptyFallbackReason } : {}),
      })
    })
  })
}

/**
 * 自动探测并运行测试
 * @param {{ mode?: string, timeoutMs?: number, extraArgs?: string }} body
 */
export async function workspaceRunTests(body) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(workspaceDir)
  const mode = String(body?.mode || 'agent').toLowerCase()
  if (mode === 'ask') {
    return { ok: false, error: 'Ask 模式禁止跑测试；请切换 Agent' }
  }

  const hasPytest =
    fs.existsSync(path.join(root, 'pytest.ini')) ||
    fs.existsSync(path.join(root, 'tests')) ||
    fs.existsSync(path.join(root, 'conftest.py')) ||
    (fs.existsSync(path.join(root, 'pyproject.toml')) &&
      /pytest/i.test(fs.readFileSync(path.join(root, 'pyproject.toml'), 'utf8').slice(0, 4000))) ||
    (fs.existsSync(path.join(root, 'requirements.txt')) &&
      /pytest/i.test(fs.readFileSync(path.join(root, 'requirements.txt'), 'utf8')))

  const pkgPath = path.join(root, 'package.json')
  let npmTest = false
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      npmTest = Boolean(pkg?.scripts?.test)
    } catch {
      /* ignore */
    }
  }

  const extra = String(body?.extraArgs || '').trim()
  let command = ''
  if (hasPytest) {
    const venvPytest = ['venv/bin/pytest', '.venv/bin/pytest']
      .map((p) => path.join(root, p))
      .find((p) => fs.existsSync(p))
    if (venvPytest) {
      command = `"${venvPytest}" -q${extra ? ` ${extra}` : ''}`
    } else {
      // macOS 常无 `python`，优先 python3 -m pytest
      command = `python3 -m pytest -q${extra ? ` ${extra}` : ''}`
    }
  } else if (npmTest) {
    command = `npm test${extra ? ` -- ${extra}` : ''}`
  } else {
    return {
      ok: false,
      error: '未探测到 pytest / npm test；请用 run_command 指定命令',
    }
  }

  const r = await workspaceRunCommand({
    command,
    mode,
    timeoutMs: body?.timeoutMs || 150_000,
    runId: body?.runId,
  })
  return { ...r, detected: hasPytest ? 'pytest' : 'npm-test' }
}
