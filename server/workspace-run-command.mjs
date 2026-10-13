/**
 * 工作区内安全执行命令（终端进工具环）。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { loadWorkspace } from './store.mjs'

const DEFAULT_TIMEOUT_MS = 120_000
const MAX_TIMEOUT_MS = 180_000
const MAX_OUTPUT = 24_000

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

/**
 * @param {{
 *   command?: string,
 *   cwd?: string,
 *   timeoutMs?: number,
 *   mode?: string,
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

  return new Promise((resolve) => {
    const child = spawn('/bin/zsh', ['-lc', command], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0', PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let killed = false
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
      resolve({ ok: false, error: e.message, command, cwd: path.relative(root, cwd) || '.' })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const exitCode = killed ? 124 : code ?? 1
      const out = (stdout + (stderr ? `\n${stderr}` : '')).slice(0, MAX_OUTPUT)
      resolve({
        ok: exitCode === 0,
        exitCode,
        timedOut: killed,
        command,
        cwd: path.relative(root, cwd) || '.',
        output: out || (killed ? '（超时无输出）' : '（无输出）'),
        truncated: stdout.length + stderr.length > MAX_OUTPUT,
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
  })
  return { ...r, detected: hasPytest ? 'pytest' : 'npm-test' }
}
