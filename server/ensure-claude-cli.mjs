/**
 * 探测 / 安装本机 Claude Code CLI（真实可执行，非占位）。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { loadChatSettings, saveChatSettings } from './store.mjs'

const require = createRequire(import.meta.url)

function expandUser(p) {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

function npmGlobalBinDirs() {
  const dirs = new Set()
  try {
    const prefix = String(
      require('child_process').execFileSync('npm', ['prefix', '-g'], {
        encoding: 'utf8',
        timeout: 10_000,
      }),
    ).trim()
    if (prefix) {
      dirs.add(path.join(prefix, 'bin'))
      // Windows-style layout on unix rare; keep bin
    }
  } catch {
    /* ignore */
  }
  const home = os.homedir()
  for (const p of [
    path.join(home, '.local', 'node', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    '/usr/local/bin',
    '/opt/homebrew/bin',
    path.dirname(process.execPath),
  ]) {
    dirs.add(p)
  }
  return [...dirs]
}

/**
 * @returns {string[]}
 */
export function candidateClaudePaths() {
  const settings = loadChatSettings()
  const out = []
  const manual = settings.claudeCliPath?.trim()
  if (manual) out.push(path.resolve(expandUser(manual)))
  if (process.env.WORKBENCH_CLAUDE_CLI?.trim()) {
    out.push(path.resolve(expandUser(process.env.WORKBENCH_CLAUDE_CLI.trim())))
  }
  for (const dir of npmGlobalBinDirs()) {
    out.push(path.join(dir, 'claude'))
  }
  // npm 包内 bin（部分安装未 link）
  try {
    const root = String(
      require('child_process').execFileSync('npm', ['root', '-g'], {
        encoding: 'utf8',
        timeout: 10_000,
      }),
    ).trim()
    if (root) {
      out.push(path.join(root, '@anthropic-ai', 'claude-code', 'cli.js'))
      out.push(path.join(root, '@anthropic-ai', 'claude-code', 'bin', 'claude'))
      out.push(path.join(root, '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'))
    }
  } catch {
    /* ignore */
  }
  return [...new Set(out.filter(Boolean))]
}

function runCmd(cmd, args, opts = {}) {
  const timeoutMs = Number(opts.timeout) || 0
  const { timeout: _t, ...spawnOpts } = opts
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...spawnOpts,
    })
    let stdout = ''
    let stderr = ''
    let done = false
    const finish = (r) => {
      if (done) return
      done = true
      resolve(r)
    }
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            try {
              child.kill('SIGKILL')
            } catch {
              /* ignore */
            }
            finish({ ok: false, stdout, stderr: 'timeout', code: 124 })
          }, timeoutMs)
        : null
    child.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('error', (e) => {
      if (timer) clearTimeout(timer)
      finish({ ok: false, stdout, stderr: e.message, code: 1 })
    })
    child.on('close', (code) => {
      if (timer) clearTimeout(timer)
      finish({ ok: code === 0, stdout, stderr, code: code ?? 1 })
    })
  })
}

async function versionOf(bin) {
  if (!bin || !fs.existsSync(bin)) return { ok: false, line: '' }
  const st = fs.statSync(bin)
  // js entry: node cli.js --version
  if (bin.endsWith('.js')) {
    const r = await runCmd(process.execPath, [bin, '--version'], { timeout: 15_000 })
    const line = (r.stdout || r.stderr).trim()
    return { ok: r.ok && Boolean(line), line, exec: [process.execPath, bin] }
  }
  const r = await runCmd(bin, ['--version'], { timeout: 15_000 })
  const line = (r.stdout || r.stderr).trim()
  return { ok: r.ok && Boolean(line), line, exec: [bin] }
}

/**
 * 解析可用 Claude CLI；手动路径失效时自动回落搜索，并可清理失效配置。
 */
export async function resolveClaudeCliDetailed() {
  const settings = loadChatSettings()
  const manual = settings.claudeCliPath?.trim()
  let clearedStale = false

  if (manual) {
    const resolved = path.resolve(expandUser(manual))
    const ver = await versionOf(resolved)
    if (ver.ok) {
      return {
        ok: true,
        claudePath: resolved,
        versionLine: ver.line,
        detectionSource: 'manual',
        hint: '',
        clearedStale: false,
      }
    }
    // 失效：清空并继续搜
    saveChatSettings({ ...settings, claudeCliPath: '' })
    clearedStale = true
  }

  // PATH
  const which = await runCmd('sh', ['-c', 'command -v claude'], { timeout: 5_000 })
  const fromPath = which.stdout.trim()
  if (fromPath) {
    const ver = await versionOf(fromPath)
    if (ver.ok) {
      saveChatSettings({ ...loadChatSettings(), claudeCliPath: fromPath })
      return {
        ok: true,
        claudePath: fromPath,
        versionLine: ver.line,
        detectionSource: 'path',
        hint: '',
        clearedStale,
      }
    }
  }

  for (const cand of candidateClaudePaths()) {
    const ver = await versionOf(cand)
    if (!ver.ok) continue
    // 持久化可执行路径（js 用 node 包装不便，优先真实 bin）
    const persist = cand.endsWith('.js') ? '' : cand
    if (persist) saveChatSettings({ ...loadChatSettings(), claudeCliPath: persist })
    return {
      ok: true,
      claudePath: cand,
      versionLine: ver.line,
      detectionSource: 'search',
      hint: '',
      clearedStale,
    }
  }

  return {
    ok: false,
    claudePath: '',
    versionLine: '',
    detectionSource: 'none',
    hint: '未找到 Claude Code CLI。可调用 claude-code:ensureCli 安装。',
    clearedStale,
  }
}

/**
 * npm 全局安装 @anthropic-ai/claude-code 并验证。
 */
export async function ensureClaudeCliInstalled() {
  const before = await resolveClaudeCliDetailed()
  if (before.ok && before.claudePath) {
    return { ...before, installed: false, message: '已可用' }
  }

  const npm = await runCmd(
    'npm',
    ['install', '-g', '@anthropic-ai/claude-code@latest'],
    { timeout: 600_000 },
  )
  if (!npm.ok) {
    return {
      ok: false,
      installed: false,
      error: `npm 安装失败：${(npm.stderr || npm.stdout || '').slice(0, 400)}`,
      hint: '请检查网络与 npm 权限后重试',
    }
  }

  // 部分平台需跑 postinstall
  try {
    const root = String(
      require('child_process').execFileSync('npm', ['root', '-g'], {
        encoding: 'utf8',
        timeout: 10_000,
      }),
    ).trim()
    const installCjs = path.join(root, '@anthropic-ai', 'claude-code', 'install.cjs')
    if (fs.existsSync(installCjs)) {
      await runCmd(process.execPath, [installCjs], {
        cwd: path.dirname(installCjs),
        timeout: 120_000,
      })
    }
  } catch {
    /* ignore */
  }

  const after = await resolveClaudeCliDetailed()
  if (!after.ok) {
    return {
      ok: false,
      installed: true,
      error: '已执行 npm install，但仍未解析到可执行 claude',
      npmLog: (npm.stdout || '').slice(-500),
      hint: after.hint,
    }
  }
  return {
    ...after,
    installed: true,
    message: '安装并探测成功',
  }
}
