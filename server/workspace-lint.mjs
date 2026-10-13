import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { loadWorkspace } from './store.mjs'
import { mergeProblems } from './workspace-problem-rules.mjs'
import { tsDiagnosticsForAbsFiles } from './workspace-tsservice.mjs'
import { externalLspDiagnosticsForAbsFiles } from './workspace-external-lsp.mjs'

const CONFIG_NAMES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  '.eslintrc.cjs',
  '.eslintrc.json',
]

const TS_LINT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const EXTERNAL_LINT_EXTS = new Set(['.py', '.go', '.rs'])
const LINT_EXTS = new Set([...TS_LINT_EXTS, ...EXTERNAL_LINT_EXTS])

/**
 * @param {string[]} relPaths 工作区相对路径
 * @param {{ mode?: 'open' | 'full' }} [opts]
 *   - open：TS + 外部 LSP（打开文件；不跑 ESLint CLI）
 *   - full：TS + ESLint + 外部 LSP（保存 / 手动刷新）
 * @returns {Promise<{ ok: boolean, problems: Array<{ relPath: string, line: number, column: number, endLine?: number, endColumn?: number, severity: 'error' | 'warning', message: string, rule?: string | null }>, error?: string }>}
 */
export async function lintWorkspaceFiles(relPathsRaw, opts = {}) {
  const mode = opts.mode === 'open' ? 'open' : 'full'
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, problems: [], error: '未选择工作区' }

  const root = path.resolve(workspaceDir)
  const relPaths = (Array.isArray(relPathsRaw) ? relPathsRaw : [])
    .map((p) => String(p || '').replace(/^[/\\]+/, ''))
    .filter((p) => p && !p.includes('..'))

  /** @type {string[]} */
  const absFiles = []
  /** @type {string[]} */
  const externalAbs = []

  for (const rel of relPaths) {
    const abs = path.resolve(root, rel)
    if (!abs.startsWith(root)) continue
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue
    const ext = path.extname(abs).toLowerCase()
    if (!LINT_EXTS.has(ext)) continue
    if (EXTERNAL_LINT_EXTS.has(ext)) externalAbs.push(abs)
    else absFiles.push(abs)
  }

  if (!absFiles.length && !externalAbs.length) return { ok: true, problems: [] }

  const externalProblems = externalAbs.length
    ? await runExternalLspDiagnostics(root, externalAbs)
    : []

  if (mode === 'open') {
    return {
      ok: true,
      problems: [...runTypeScriptDiagnostics(root, absFiles), ...externalProblems],
    }
  }

  /** @type {Map<string, string[]>} configPath -> absFiles */
  const eslintGroups = new Map()

  for (const abs of absFiles) {
    const eslintConfig = findEslintConfigForFile(root, abs)
    if (!eslintConfig) continue
    if (!eslintGroups.has(eslintConfig)) eslintGroups.set(eslintConfig, [])
    eslintGroups.get(eslintConfig).push(abs)
  }

  /** @type {Array<{ relPath: string, line: number, column: number, endLine?: number, endColumn?: number, severity: 'error' | 'warning', message: string, rule?: string | null }>} */
  const eslintProblems = []

  for (const [eslintConfig, files] of eslintGroups) {
    const configDir = path.dirname(eslintConfig)
    eslintProblems.push(...runEslintOnFiles(root, configDir, eslintConfig, files))
  }

  const tsProblems = runTypeScriptDiagnostics(root, absFiles)
  const problems = [...mergeProblems(eslintProblems, tsProblems), ...externalProblems]

  return { ok: true, problems }
}

async function runExternalLspDiagnostics(root, absFiles) {
  try {
    return (await externalLspDiagnosticsForAbsFiles(root, absFiles)) || []
  } catch {
    return []
  }
}

function findEslintConfigForFile(root, absFile) {
  let dir = path.dirname(absFile)
  while (dir.startsWith(root)) {
    for (const name of CONFIG_NAMES) {
      const p = path.join(dir, name)
      if (fs.existsSync(p)) return p
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  for (const name of CONFIG_NAMES) {
    const p = path.join(root, name)
    if (fs.existsSync(p)) return p
  }
  return null
}

/** 委托 LanguageService（与跳转/悬停共用 program + LRU） */
function runTypeScriptDiagnostics(root, absFiles) {
  try {
    return tsDiagnosticsForAbsFiles(root, absFiles) || []
  } catch {
    return []
  }
}

function resolveEslintBin(cwd) {
  const local = path.join(cwd, 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint')
  if (fs.existsSync(local)) return local
  return null
}

function runEslintOnFiles(root, configDir, eslintConfig, absFiles) {
  const eslintBin = resolveEslintBin(configDir) || resolveEslintBin(root)
  const cmd = eslintBin || 'npx'
  const args = eslintBin
    ? ['--format', 'json', '--no-error-on-unmatched-pattern', '-c', eslintConfig, ...absFiles]
    : ['eslint', '--format', 'json', '--no-error-on-unmatched-pattern', '-c', eslintConfig, ...absFiles]

  try {
    const stdout = execFileSync(cmd, args, {
      cwd: configDir,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      timeout: 90_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    })
    return parseEslintStdout(stdout, root)
  } catch (e) {
    const stdout = e?.stdout
    if (typeof stdout === 'string' && stdout.trim().startsWith('[')) {
      return parseEslintStdout(stdout, root)
    }
    const msg = String(e?.stderr || e?.message || '')
    if (/no eslint configuration|couldn't find/i.test(msg)) {
      return []
    }
    return []
  }
}

function parseEslintStdout(stdout, root) {
  /** @type {Array<{ relPath: string, line: number, column: number, endLine?: number, endColumn?: number, severity: 'error' | 'warning', message: string, rule?: string | null }>} */
  const problems = []
  let results = []
  try {
    results = JSON.parse(stdout)
  } catch {
    return problems
  }
  for (const file of results) {
    const abs = file.filePath || ''
    const relPath = abs.startsWith(root) ? path.relative(root, abs).replace(/\\/g, '/') : abs
    for (const msg of file.messages || []) {
      if (!msg.line) continue
      problems.push({
        relPath,
        line: msg.line,
        column: msg.column || 1,
        endLine: msg.endLine || msg.line,
        endColumn: msg.endColumn || (msg.column || 1) + 1,
        severity: msg.severity === 2 ? 'error' : 'warning',
        message: msg.message || 'Unknown',
        rule: msg.ruleId || null,
      })
    }
  }
  return problems
}
