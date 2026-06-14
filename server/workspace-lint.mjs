import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { loadWorkspace } from './store.mjs'
import { mergeProblems } from './workspace-problem-rules.mjs'

const CONFIG_NAMES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  '.eslintrc.cjs',
  '.eslintrc.json',
]

const LINT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const TS_EXTS = new Set(['.ts', '.tsx'])

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_WEB = path.resolve(SERVER_DIR, '../web')

/**
 * @param {string[]} relPaths 工作区相对路径
 * @param {{ mode?: 'open' | 'full' }} [opts]
 *   - open：仅 TypeScript（对齐 Cursor 打开文件时 tsserver 行为，不跑 ESLint CLI）
 *   - full：TS + ESLint（保存 / 手动刷新）
 * @returns {{ ok: boolean, problems: Array<{ relPath: string, line: number, column: number, endLine?: number, endColumn?: number, severity: 'error' | 'warning', message: string, rule?: string | null }>, error?: string }}
 */
export function lintWorkspaceFiles(relPathsRaw, opts = {}) {
  const mode = opts.mode === 'open' ? 'open' : 'full'
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, problems: [], error: '未选择工作区' }

  const root = path.resolve(workspaceDir)
  const relPaths = (Array.isArray(relPathsRaw) ? relPathsRaw : [])
    .map((p) => String(p || '').replace(/^[/\\]+/, ''))
    .filter((p) => p && !p.includes('..'))

  /** @type {string[]} */
  const absFiles = []

  for (const rel of relPaths) {
    const abs = path.resolve(root, rel)
    if (!abs.startsWith(root)) continue
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue
    const ext = path.extname(abs).toLowerCase()
    if (!LINT_EXTS.has(ext)) continue
    absFiles.push(abs)
  }

  if (!absFiles.length) return { ok: true, problems: [] }

  if (mode === 'open') {
    return { ok: true, problems: runTypeScriptDiagnostics(root, absFiles) }
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
  const problems = mergeProblems(eslintProblems, tsProblems)

  return { ok: true, problems }
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

function findTsConfigForFile(root, absFile) {
  let dir = path.dirname(absFile)
  while (dir.startsWith(root)) {
    const p = path.join(dir, 'tsconfig.json')
    if (fs.existsSync(p)) return p
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  const rootCfg = path.join(root, 'tsconfig.json')
  if (fs.existsSync(rootCfg)) return rootCfg
  return null
}

function loadTypescriptModule(cwd, root) {
  for (const base of [cwd, root, REPO_WEB]) {
    const pkg = path.join(base, 'package.json')
    if (!fs.existsSync(pkg)) continue
    try {
      const req = createRequire(pkg)
      return req('typescript')
    } catch {
      /* try next */
    }
  }
  return null
}

function runTypeScriptDiagnostics(root, absFiles) {
  const ts = loadTypescriptModule(root, root)
  if (!ts) return []

  /** @type {Map<string, string[]>} */
  const groups = new Map()

  for (const abs of absFiles) {
    const ext = path.extname(abs).toLowerCase()
    if (!TS_EXTS.has(ext)) continue
    const cfg = findTsConfigForFile(root, abs)
    if (!cfg) continue
    if (!groups.has(cfg)) groups.set(cfg, [])
    groups.get(cfg).push(abs)
  }

  /** @type {Array<{ relPath: string, line: number, column: number, endLine?: number, endColumn?: number, severity: 'error' | 'warning', message: string, rule?: string | null }>} */
  const problems = []

  for (const [configPath, files] of groups) {
    const configDir = path.dirname(configPath)
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
    if (configFile.error) continue

    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      configDir,
      undefined,
      configPath,
    )

    const programFiles = [...new Set([...parsed.fileNames, ...files.map((f) => path.resolve(f))])]
    const program = ts.createProgram(programFiles, parsed.options)

    for (const abs of files) {
      const absResolved = path.resolve(abs)
      const sf = program.getSourceFile(absResolved)
      if (!sf) continue

      const diags = [
        ...program.getSyntacticDiagnostics(sf),
        ...program.getSemanticDiagnostics(sf),
      ]

      for (const d of diags) {
        if (!d.file || d.start == null) continue
        if (d.category === ts.DiagnosticCategory.Message) continue

        const start = d.file.getLineAndCharacterOfPosition(d.start)
        const endPos = d.end != null ? d.file.getLineAndCharacterOfPosition(d.end) : start

        problems.push({
          relPath: path.relative(root, absResolved).replace(/\\/g, '/'),
          line: start.line + 1,
          column: start.character + 1,
          endLine: endPos.line + 1,
          endColumn: Math.max(endPos.character + 1, start.character + 2),
          severity: d.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
          message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
          rule: `TS${d.code}`,
        })
      }
    }
  }

  return problems
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
