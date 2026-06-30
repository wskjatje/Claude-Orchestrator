/**
 * Workbench Problems 过滤规则 — 对标常见 IDE 默认体验：
 * - 格式问题由 Prettier 在保存时处理，不常驻 Problems
 * - react-refresh 等 HMR 提示属于开发工具规则，通常不在 Problems 展示
 * - TypeScript 语义/语法错误优先于 @typescript-eslint 重复报告
 */

/** 纯格式化 / stylistic，不应出现在 Problems 或编辑器波浪线 */
export function isFormatOnlyRule(rule) {
  if (!rule || typeof rule !== 'string') return false
  if (rule === 'prettier/prettier' || rule.startsWith('prettier/')) return true
  if (rule.startsWith('@stylistic/')) return true
  if (rule.endsWith('/indent') || rule.endsWith('/quotes') || rule.endsWith('/semi')) return true
  return false
}

/** 默认不在 Problems / 编辑器中强调的 ESLint 规则（可用 eslint.rules.customizations 关闭） */
const ESLINT_RULES_SUPPRESSED = [
  /^react-refresh\//,
  /^@typescript-eslint\/no-unused-vars$/,
  /^@typescript-eslint\/no-empty-object-type$/,
  /^@typescript-eslint\/ban-ts-comment$/,
  /^@typescript-eslint\/no-explicit-any$/,
  /^@typescript-eslint\/consistent-type-imports$/,
  /^import\/no-unresolved$/, // 常因 IDE 路径解析与 CLI 不一致误报
]

export function isSuppressedEslintRule(rule) {
  if (!rule || typeof rule !== 'string') return false
  if (isFormatOnlyRule(rule)) return true
  return ESLINT_RULES_SUPPRESSED.some((re) => re.test(rule))
}

/** 已有 TS 诊断时，跳过同文件的 @typescript-eslint 规则（避免与 tsserver 重复） */
export function isDuplicateTypescriptEslint(rule) {
  if (!rule || typeof rule !== 'string') return false
  return rule.startsWith('@typescript-eslint/')
}

export function shouldIncludeEslintProblem(problem, tsLinesByFile) {
  const { relPath, line, rule } = problem
  if (isSuppressedEslintRule(rule)) return false

  const tsLines = tsLinesByFile.get(relPath)
  if (tsLines?.has(line) && isDuplicateTypescriptEslint(rule)) return false

  return true
}

export function mergeProblems(eslintProblems, tsProblems) {
  /** @type {Map<string, Set<number>>} */
  const tsLinesByFile = new Map()
  for (const p of tsProblems) {
    if (!tsLinesByFile.has(p.relPath)) tsLinesByFile.set(p.relPath, new Set())
    tsLinesByFile.get(p.relPath).add(p.line)
  }

  const filteredEslint = eslintProblems.filter((p) => shouldIncludeEslintProblem(p, tsLinesByFile))
  return [...tsProblems, ...filteredEslint]
}
