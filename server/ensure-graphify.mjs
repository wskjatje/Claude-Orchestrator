/**
 * 解析本机 graphify、报告状态、执行 update/export。
 * 不静默安装；缺失时返回明确错误。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { loadWorkspace } from './store.mjs'

const execFileAsync = promisify(execFile)

/** @typedef {{ kind: 'bin', bin: string } | { kind: 'python', python: string }} GraphifyCmd */

/**
 * @param {string} root
 * @returns {GraphifyCmd | null}
 */
export function resolveGraphifyCmd(root) {
  const envBin = process.env.WORKBENCH_GRAPHIFY?.trim()
  if (envBin && fs.existsSync(path.resolve(envBin))) {
    return { kind: 'bin', bin: path.resolve(envBin) }
  }

  const which = process.platform === 'win32' ? 'where' : 'which'
  try {
    const out = execFileSync(which, ['graphify'], {
      encoding: 'utf8',
      timeout: 5_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean)
    if (first && fs.existsSync(first)) return { kind: 'bin', bin: first }
  } catch {
    /* */
  }

  const envPy = process.env.WORKBENCH_GRAPHIFY_PYTHON?.trim()
  const pinned = path.join(root, 'graphify-out', '.graphify_python')
  const candidates = [
    envPy ? path.resolve(envPy) : '',
    fs.existsSync(pinned) ? fs.readFileSync(pinned, 'utf8').trim() : '',
    'python3',
    'python',
  ].filter(Boolean)

  for (const py of candidates) {
    try {
      execFileSync(py, ['-c', 'import graphify'], {
        encoding: 'utf8',
        timeout: 8_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      return { kind: 'python', python: py }
    } catch {
      /* */
    }
  }
  return null
}

/**
 * @param {GraphifyCmd} cmd
 * @param {string[]} args
 * @param {{ cwd?: string, timeout?: number }} [opts]
 */
function runGraphify(cmd, args, opts = {}) {
  const timeout = opts.timeout ?? 120_000
  const cwd = opts.cwd
  if (cmd.kind === 'bin') {
    return execFileAsync(cmd.bin, args, {
      cwd,
      timeout,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env,
    })
  }
  return execFileAsync(cmd.python, ['-m', 'graphify', ...args], {
    cwd,
    timeout,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
    env: process.env,
  })
}

/**
 * @param {string} [workspaceDir]
 */
export function graphifyStatus(workspaceDir) {
  const wd = workspaceDir || loadWorkspace()
  if (!wd) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(wd)
  const outDir = path.join(root, 'graphify-out')
  const graphJson = path.join(outDir, 'graph.json')
  const graphHtml = path.join(outDir, 'graph.html')
  const needsFlag = path.join(outDir, '.needs_update')
  const cmd = resolveGraphifyCmd(root)
  let mtimeMs = 0
  if (fs.existsSync(graphJson)) {
    try {
      mtimeMs = fs.statSync(graphJson).mtimeMs
    } catch {
      mtimeMs = 0
    }
  }
  return {
    ok: true,
    graphJson: fs.existsSync(graphJson),
    graphHtml: fs.existsSync(graphHtml),
    needsUpdate: fs.existsSync(needsFlag),
    cli: Boolean(cmd),
    cliKind: cmd?.kind || null,
    cliError: cmd
      ? null
      : '未找到 graphify（需 Python≥3.10）。安装：pip install graphifyy 或 uv tool install graphifyy；或设置 WORKBENCH_GRAPHIFY / WORKBENCH_GRAPHIFY_PYTHON',
    graphMtimeMs: mtimeMs,
    workspace: root,
  }
}

/**
 * @param {string} root
 * @param {GraphifyCmd} cmd
 * @param {{ exportHtml?: boolean }} [opts]
 */
async function runUpdate(root, cmd, opts = {}) {
  let output = ''
  try {
    const { stdout, stderr } = await runGraphify(cmd, ['update', root, '--no-cluster'], {
      cwd: root,
      timeout: 180_000,
    })
    output += String(stdout || '')
    if (stderr) output += `\n${stderr}`
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const errOut = e && typeof e === 'object' && 'stderr' in e ? String(e.stderr || '') : ''
    return { ok: false, error: `graphify update 失败：${msg}${errOut ? `\n${errOut}` : ''}`, output }
  }

  if (opts.exportHtml) {
    try {
      const { stdout, stderr } = await runGraphify(cmd, ['export', 'html'], {
        cwd: root,
        timeout: 60_000,
      })
      output += `\n${stdout || ''}`
      if (stderr) output += `\n${stderr}`
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: `graphify export html 失败：${msg}`, output }
    }
  }

  const graphPath = path.join(root, 'graphify-out', 'graph.json')
  if (!fs.existsSync(graphPath)) {
    return { ok: false, error: 'update 结束但 graphify-out/graph.json 不存在', output }
  }

  const needsFlag = path.join(root, 'graphify-out', '.needs_update')
  try {
    if (fs.existsSync(needsFlag)) fs.unlinkSync(needsFlag)
  } catch {
    /* */
  }

  if (cmd.kind === 'python') {
    const pinned = path.join(root, 'graphify-out', '.graphify_python')
    try {
      fs.mkdirSync(path.dirname(pinned), { recursive: true })
      fs.writeFileSync(pinned, cmd.python, 'utf8')
    } catch {
      /* */
    }
  }

  return {
    ok: true,
    output,
    graphJson: true,
    graphHtml: fs.existsSync(path.join(root, 'graphify-out', 'graph.html')),
  }
}

/**
 * AST 增量更新 + 导出 HTML。失败不返回 ok。
 * @param {string} [workspaceDir]
 */
export async function buildWorkspaceGraph(workspaceDir) {
  const wd = workspaceDir || loadWorkspace()
  if (!wd) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(wd)
  const cmd = resolveGraphifyCmd(root)
  if (!cmd) {
    return {
      ok: false,
      error:
        '未找到 graphify（需 Python≥3.10）。安装：pip install graphifyy 或 uv tool install graphifyy；或设置 WORKBENCH_GRAPHIFY / WORKBENCH_GRAPHIFY_PYTHON',
    }
  }
  return runUpdate(root, cmd, { exportHtml: true })
}

/**
 * 写盘后后台 AST 更新（不强制 export html）
 * @param {string} [workspaceDir]
 */
export async function updateWorkspaceGraphAst(workspaceDir) {
  const wd = workspaceDir || loadWorkspace()
  if (!wd) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(wd)
  const cmd = resolveGraphifyCmd(root)
  if (!cmd) {
    return {
      ok: false,
      error:
        '未找到 graphify（需 Python≥3.10）。安装：pip install graphifyy 或 uv tool install graphifyy；或设置 WORKBENCH_GRAPHIFY / WORKBENCH_GRAPHIFY_PYTHON',
    }
  }
  return runUpdate(root, cmd, { exportHtml: false })
}

/** 写盘后节流更新（单飞） */
let updateTimer = null
let updateInFlight = null
let pendingRoot = null

/**
 * @param {string} workspaceDir
 * @param {{ delayMs?: number }} [opts]
 */
export function scheduleGraphifyUpdate(workspaceDir, opts = {}) {
  const root = path.resolve(workspaceDir)
  pendingRoot = root
  const delayMs = Number.isFinite(opts.delayMs) ? Math.max(0, opts.delayMs) : 8_000
  if (updateTimer) clearTimeout(updateTimer)
  updateTimer = setTimeout(() => {
    updateTimer = null
    const wd = pendingRoot
    pendingRoot = null
    if (!wd) return
    if (updateInFlight) return
    updateInFlight = updateWorkspaceGraphAst(wd)
      .catch((e) => ({ ok: false, error: e instanceof Error ? e.message : String(e) }))
      .finally(() => {
        updateInFlight = null
      })
  }, delayMs)
  return { ok: true, scheduled: true, delayMs }
}

/**
 * @param {string[]} relPaths
 */
export function markGraphifyNeedsUpdate(relPaths) {
  const wd = loadWorkspace()
  if (!wd) return { ok: false, error: '未选择工作区' }
  const codeExt = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|cs|rb|php)$/i
  const touched = (relPaths || []).some((p) => codeExt.test(String(p || '')))
  if (!touched) return { ok: true, skipped: true }
  const flag = path.join(path.resolve(wd), 'graphify-out', '.needs_update')
  try {
    fs.mkdirSync(path.dirname(flag), { recursive: true })
    fs.writeFileSync(flag, `needs update\n${new Date().toISOString()}\n`, 'utf8')
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  scheduleGraphifyUpdate(wd)
  return { ok: true, flagged: true }
}
