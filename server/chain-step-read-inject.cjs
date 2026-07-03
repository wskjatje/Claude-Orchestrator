'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { upstreamArtifactPathsForAgent, defaultArtifactPathForAgent, CHAIN_STEP_DIR } = require('./agent-artifact-paths.cjs')

const BOOTSTRAP_READ_PATHS = ['CLAUDE.md', 'README.md', 'package.json']
const MAX_CHAIN_STEP_FILES = 6
const MAX_INJECT_CHARS = 30_000
const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5MB 单文件上限

function readWorkspaceRel(workspaceDir, rel) {
  if (!workspaceDir || !rel || String(rel).includes('..')) return null
  const root = path.resolve(workspaceDir)
  const abs = path.resolve(root, rel)
  if (!abs.startsWith(root + path.sep) && abs !== root) return null
  try {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null
    const stat = fs.statSync(abs)
    if (stat.size > MAX_FILE_SIZE) {
      console.warn('[chain-step] 跳过超大文件', rel, stat.size)
      return null
    }
    const text = fs.readFileSync(abs, 'utf8')
    return text.trim() ? text : null
  } catch (e) {
    console.error('[chain-step] readWorkspaceRel 异常', rel, e?.message)
    return null
  }
}

function recentChainStepRelPaths(workspaceDir) {
  const dir = path.join(workspaceDir, CHAIN_STEP_DIR)
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return []
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const abs = path.join(dir, f)
        return { rel: `${CHAIN_STEP_DIR}/${f}`, mtime: fs.statSync(abs).mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, MAX_CHAIN_STEP_FILES)
      .map((x) => x.rel)
  } catch {
    return []
  }
}

/**
 * 从 graphify-out/GRAPH_REPORT.md 提取关键区块摘要。
 * 仅提取 God Nodes、Surprising Connections、Suggested Questions 三个标题下的段落。
 */
function extractGraphifySummary(workspaceDir) {
  const reportPath = path.join(workspaceDir, 'graphify-out', 'GRAPH_REPORT.md')
  const labelsPath = path.join(workspaceDir, 'graphify-out', '.graphify_labels.json')
  try {
    if (!fs.existsSync(reportPath)) return null

    const text = fs.readFileSync(reportPath, 'utf8')
    if (!text.trim()) return null

    const sections = []
    // 提取带 ## 标题的区块，增大采样窗口避免截断关键信息
    const sectionPattern = /^## (.+)$\n(.+?)(?=\n## |\n---|$)/gms
    const wanted = ['god', 'surprising', 'suggested', 'summary', 'overview', 'community']
    let match
    while ((match = sectionPattern.exec(text)) !== null) {
      const title = match[1].toLowerCase()
      if (wanted.some(w => title.includes(w))) {
        // 截取区块前 2500 字符
        const body = match[2].trim().slice(0, 2500)
        sections.push(`### ${match[1]}\n${body}`)
      }
    }

    if (!sections.length) return null

    const parts = []
    parts.push('【知识图谱摘要】（来自 graphify-out/GRAPH_REPORT.md）\n')
    parts.push(sections.join('\n\n'))

    // 附上社区标签（如果有）
    if (fs.existsSync(labelsPath)) {
      try {
        const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'))
        const labelEntries = Object.entries(labels).slice(0, 30)
        if (labelEntries.length) {
          parts.push(
            '\n\n社区命名标签：\n' +
            labelEntries.map(([id, name]) => `- 社区 ${id}: ${name}`).join('\n')
          )
        }
      } catch { /* ignore */ }
    }

    const summary = parts.join('')
    // 整体控制在 10k 以内
    return summary.length > 10000 ? summary.slice(0, 10000) + '\n\n...（更多内容已截断）' : summary
  } catch (e) {
    console.error('[chain-step] 读取知识图谱摘要异常', e?.message)
    return null
  }
}

/**
 * 跑链前将上游 md / chain-steps / CLAUDE.md + 知识图谱摘要注入 instruction。
 */
function expandChainStepInstructionWithWorkspaceReads(instruction, agentName, workspaceDir, opts = {}) {
  const base = String(instruction || '').trim()
  if (!base || !workspaceDir) return base

  const seen = new Set()
  /** @type {{ path: string, text: string }[]} */
  const injected = []
  /** @type {string[]} */
  const missingPaths = []
  let totalChars = 0

  const tryRead = (rel) => {
    const p = String(rel || '').replace(/\\/g, '/')
    if (!p || seen.has(p)) return
    const text = readWorkspaceRel(workspaceDir, p)
    if (!text) {
      missingPaths.push(p)
      return
    }
    if (totalChars + text.length > MAX_INJECT_CHARS) return
    seen.add(p)
    injected.push({ path: p, text })
    totalChars += text.length
  }

  // P1-3: 始终尝试读取 CLAUDE.md（工作区规则，与前端行为一致）
  tryRead('CLAUDE.md')

  // 原有优先级：上游工件 → 链步骤产物
  for (const rel of upstreamArtifactPathsForAgent(agentName)) tryRead(rel)
  for (const rel of recentChainStepRelPaths(workspaceDir)) tryRead(rel)

  // P1-1: 尝试注入 Agent 自身产物路径（同一 Agent 多轮执行时看到上轮输出）
  const ownPath = defaultArtifactPathForAgent(agentName)
  if (ownPath) tryRead(ownPath)

  // 兜底：引导文件
  if (!injected.length) {
    for (const rel of BOOTSTRAP_READ_PATHS) tryRead(rel)
  }

  // Graphify: 注入知识图谱摘要（如果 graphify-out/ 存在）
  const graphifySummary = extractGraphifySummary(workspaceDir)

  // P1-2: 注入 docs/ 目录实际文件清单（阻止模型虚构不存在的文档）
  const docsDir = path.join(workspaceDir, 'docs')
  let docsFileList = ''
  try {
    if (fs.existsSync(docsDir) && fs.statSync(docsDir).isDirectory()) {
      const files = fs.readdirSync(docsDir)
        .filter(f => f.endsWith('.md'))
        .slice(0, 50)
        .map(f => `- docs/${f}`)
      if (files.length) {
        docsFileList = '\n\n【docs/ 实际文件清单】（仅列出真实存在的文件，不在列表中的文档不存在）\n' + files.join('\n')
      }
    }
  } catch { /* ignore */ }

  const parts = [base]

  if (injected.length) {
    parts.push(
      injected
        .map(({ path: p, text }) => `\n\n---\n(Auto-injected from workspace: ${p})\n\n${text}`)
        .join(''),
    )
  }

  // 统一注入缺失路径提示，避免模型猜测不存在的文件
  if (missingPaths.length) {
    parts.push(
      `\n\n---\n【提示】以下文件在工作区中不存在，请勿尝试读取或引用：${missingPaths.join('、')}`,
    )
  }

  // 追加 docs/ 实际文件清单
  if (docsFileList) parts.push(docsFileList)

  // Graphify: 追加知识图谱摘要
  if (graphifySummary) {
    parts.push(`\n\n---\n${graphifySummary}`)
  }

  // 没有任何文件被注入时，向模型声明工作区状态
  if (!injected.length && !graphifySummary) {
    parts.push(
      '\n\n---\n【提示】工作区当前无现有项目文件。请基于实际任务从零开展工作，勿虚构不存在的文件或路径。',
    )
  }

  return parts.join('')
}

module.exports = {
  expandChainStepInstructionWithWorkspaceReads,
}
