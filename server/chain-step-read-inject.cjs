'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { upstreamArtifactPathsForAgent } = require('./agent-artifact-paths.cjs')

const BOOTSTRAP_READ_PATHS = ['CLAUDE.md', 'README.md', 'docs/README.md']
const MAX_CHAIN_STEP_FILES = 6
const MAX_INJECT_CHARS = 120_000

function readWorkspaceRel(workspaceDir, rel) {
  if (!workspaceDir || !rel || String(rel).includes('..')) return null
  const root = path.resolve(workspaceDir)
  const abs = path.resolve(root, rel)
  if (!abs.startsWith(root + path.sep) && abs !== root) return null
  try {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null
    const text = fs.readFileSync(abs, 'utf8')
    return text.trim() ? text : null
  } catch {
    return null
  }
}

function recentChainStepRelPaths(workspaceDir) {
  const dir = path.join(workspaceDir, 'docs/chain-steps')
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return []
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const abs = path.join(dir, f)
        return { rel: `docs/chain-steps/${f}`, mtime: fs.statSync(abs).mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, MAX_CHAIN_STEP_FILES)
      .map((x) => x.rel)
  } catch {
    return []
  }
}

/**
 * 跑链前将上游 md / chain-steps / CLAUDE.md 注入 instruction（与 web expandUserLineWithWorkspaceFiles 同规则）。
 */
function expandChainStepInstructionWithWorkspaceReads(instruction, agentName, workspaceDir, opts = {}) {
  const base = String(instruction || '').trim()
  if (!base || !workspaceDir) return base

  const seen = new Set()
  /** @type {{ path: string, text: string }[]} */
  const injected = []
  let totalChars = 0

  const tryRead = (rel) => {
    const p = String(rel || '').replace(/\\/g, '/')
    if (!p || seen.has(p)) return
    const text = readWorkspaceRel(workspaceDir, p)
    if (!text) return
    if (totalChars + text.length > MAX_INJECT_CHARS) return
    seen.add(p)
    injected.push({ path: p, text })
    totalChars += text.length
  }

  for (const rel of upstreamArtifactPathsForAgent(agentName)) tryRead(rel)
  for (const rel of recentChainStepRelPaths(workspaceDir)) tryRead(rel)

  if (!injected.length) {
    for (const rel of BOOTSTRAP_READ_PATHS) tryRead(rel)
  }

  if (!injected.length) return base

  const appendix = injected
    .map(
      ({ path: p, text }) =>
        `\n\n---\n（以下由应用在跑链前从工作区自动读入：${p}）\n\n${text}`,
    )
    .join('')

  return `${base}${appendix}`
}

module.exports = {
  expandChainStepInstructionWithWorkspaceReads,
}
