'use strict'

/**
 * Agent stem → 默认工作区相对路径（与 web/src/lib/agent-artifact-paths.ts 保持同步）。
 * 解析顺序：stem 别名 → 显式映射 → 类别前缀约定 → docs/agents/{stem}.md
 */

const AGENT_ARTIFACT_PATHS = {
  'product-manager': 'docs/prd.md',
  'product-sprint-prioritizer': 'docs/sprint-backlog.md',
  'product-trend-researcher': 'docs/market-research.md',
  'product-feedback-synthesizer': 'docs/feedback-summary.md',
  'product-behavioral-nudge-engine': 'docs/nudge-notes.md',
  'project-manager': 'docs/wbs.md',
  'project-manager-senior': 'docs/wbs.md',
  'project-management-project-shepherd': 'docs/project-status.md',
  'project-management-meeting-notes-specialist': 'docs/meeting-notes.md',
  'project-management-jira-workflow-steward': 'docs/jira-workflow.md',
  'project-management-experiment-tracker': 'docs/experiment-log.md',
  'project-management-studio-producer': 'docs/studio-production-plan.md',
  'project-management-studio-operations': 'docs/studio-operations.md',
  'software-architect': 'docs/architecture-note.md',
  'frontend-engineer': 'docs/frontend-implementation.md',
  'backend-engineer': 'docs/api-summary.md',
  'qa-engineer': 'docs/qa-report.md',
  'devops-engineer': 'docs/release-plan.md',
  'code-reviewer': 'docs/code-review-report.md',
  'design-ui-designer': 'docs/ui-spec.md',
  'design-ux-architect': 'docs/ux-architecture.md',
  'ui-ux-designer': 'docs/ui-ux-spec.md',
  'design-visual-storyteller': 'docs/visual-story.md',
  'design-ux-researcher': 'docs/ux-research.md',
  'design-brand-guardian': 'docs/brand-guidelines.md',
  'design-whimsy-injector': 'docs/whimsy-notes.md',
  'design-persona-walkthrough': 'docs/persona-walkthrough-report.md',
  'design-inclusive-visuals-specialist': 'docs/inclusive-visuals-notes.md',
  'design-image-prompt-engineer': 'docs/image-prompt-library.md',
  'testing-api-tester': 'docs/testing/api-test-report.md',
  'testing-accessibility-auditor': 'docs/testing/accessibility-audit.md',
  'testing-evidence-collector': 'docs/testing/evidence-report.md',
  'testing-performance-benchmarker': 'docs/testing/performance-report.md',
  'testing-reality-checker': 'docs/testing/reality-check.md',
  'testing-test-results-analyzer': 'docs/testing/test-analysis.md',
  'testing-tool-evaluator': 'docs/testing/tool-evaluation.md',
  'testing-workflow-optimizer': 'docs/testing/workflow-optimization.md',
  historian: 'docs/history-notes.md',
  'literature-scholar': 'docs/literature-notes.md',
  'specialized-workflow-architect': 'docs/workflow-spec.md',
  'specialized-technical-writer': 'docs/technical-writing.md',
  'specialized-document-generator': 'docs/generated-document.md',
  'specialized-chief-of-staff': 'docs/executive-brief.md',
  'support-executive-summary-generator': 'docs/executive-summary.md',
  'support-analytics-reporter': 'docs/analytics-report.md',
}

const AGENT_STEM_ALIASES = {
  'engineering-software-architect': 'software-architect',
  'engineering-frontend-developer': 'frontend-engineer',
  'engineering-code-reviewer': 'code-reviewer',
  'engineering-devops-automator': 'devops-engineer',
  'engineering-backend-architect': 'software-architect',
  'engineering-technical-writer': 'specialized-technical-writer',
}

const CATEGORY_PREFIX_DIRS = [
  ['project-management', 'docs/project'],
  ['paid-media', 'docs/paid-media'],
  ['product', 'docs/product'],
  ['engineering', 'docs/engineering'],
  ['design', 'docs/design'],
  ['testing', 'docs/testing'],
  ['marketing', 'docs/marketing'],
  ['sales', 'docs/sales'],
  ['finance', 'docs/finance'],
  ['support', 'docs/support'],
  ['specialized', 'docs/specialized'],
  ['legal', 'docs/legal'],
  ['healthcare', 'docs/healthcare'],
  ['government', 'docs/government'],
  ['hospitality', 'docs/hospitality'],
  ['game', 'docs/game'],
  ['godot', 'docs/godot'],
  ['unity', 'docs/unity'],
  ['unreal', 'docs/unreal'],
  ['roblox', 'docs/roblox'],
  ['medical', 'docs/medical'],
].sort((a, b) => b[0].length - a[0].length)

const CHAIN_STEP_DIR = 'docs/chain-steps'

function normalizeAgentStem(raw) {
  const t = String(raw || '')
    .trim()
    .replace(/\\/g, '/')
  const base = t.includes('/') ? t.slice(t.lastIndexOf('/') + 1) : t
  const lower = base.toLowerCase()
  return lower.endsWith('.md') ? lower.slice(0, -3) : lower
}

function resolveCategoryArtifactPath(stem) {
  for (const [prefix, dir] of CATEGORY_PREFIX_DIRS) {
    if (!stem.startsWith(`${prefix}-`)) continue
    const rest = stem.slice(prefix.length + 1)
    if (!rest) return null
    return `${dir}/${rest}.md`
  }
  return null
}

function resolveCanonicalStem(stem, depth = 0) {
  if (depth > 4) return stem
  const alias = AGENT_STEM_ALIASES[stem]
  return alias ? resolveCanonicalStem(alias, depth + 1) : stem
}

function defaultArtifactPathForAgent(agentName) {
  const stem = normalizeAgentStem(agentName)
  if (!stem) return null

  const canonical = resolveCanonicalStem(stem)
  if (AGENT_ARTIFACT_PATHS[canonical]) return AGENT_ARTIFACT_PATHS[canonical]
  if (AGENT_ARTIFACT_PATHS[stem]) return AGENT_ARTIFACT_PATHS[stem]

  const categoryPath = resolveCategoryArtifactPath(stem)
  if (categoryPath) return categoryPath

  return `docs/agents/${stem}.md`
}

/** 与 web/src/lib/agent-artifact-paths.ts UPSTREAM_ARTIFACTS 保持同步 */
const UPSTREAM_ARTIFACTS = {
  'project-manager': ['docs/prd.md', 'docs/sprint-backlog.md'],
  'software-architect': ['docs/prd.md', 'docs/wbs.md', 'docs/sprint-backlog.md'],
  'frontend-engineer': [
    'docs/prd.md',
    'docs/architecture-note.md',
    'docs/ui-spec.md',
    'docs/ux-architecture.md',
  ],
  'backend-engineer': ['docs/prd.md', 'docs/architecture-note.md', 'docs/wbs.md'],
  'qa-engineer': ['docs/prd.md', 'docs/frontend-implementation.md', 'docs/api-summary.md'],
  'devops-engineer': ['docs/architecture-note.md', 'docs/release-plan.md'],
  'code-reviewer': ['docs/frontend-implementation.md', 'docs/api-summary.md'],
  'design-ui-designer': ['docs/prd.md', 'docs/ux-architecture.md'],
  'design-ux-architect': ['docs/prd.md'],
  'ui-ux-designer': ['docs/prd.md', 'docs/ux-architecture.md'],
  'product-sprint-prioritizer': ['docs/prd.md'],
}

function upstreamArtifactPathsForAgent(agentName) {
  const stem = resolveCanonicalStem(normalizeAgentStem(agentName))
  const upstream =
    UPSTREAM_ARTIFACTS[stem] ?? UPSTREAM_ARTIFACTS[normalizeAgentStem(agentName)] ?? []
  return [...new Set(upstream)].filter(Boolean)
}

function relatedArtifactPathsForAgent(agentName) {
  const stem = resolveCanonicalStem(normalizeAgentStem(agentName))
  const own = defaultArtifactPathForAgent(stem)
  const upstream = upstreamArtifactPathsForAgent(agentName)
  return [...new Set([...upstream, own])].filter(Boolean)
}

function buildAgentArtifactPathHint(stemRaw) {
  const stem = normalizeAgentStem(stemRaw)
  if (!stem) return ''
  const path = defaultArtifactPathForAgent(stem)
  return (
    `【落盘路径】global://${stem} 默认 => \`${path}\`；` +
    `同一 Agent 多次交付仍用此路径（追加/覆盖须说明）。` +
    `禁止写入其它 Agent 专属文件（如 product-manager→docs/prd.md）。` +
    `未映射角色 => \`docs/agents/{stem}.md\` 或 \`docs/{类别}/{名}.md\`。`
  )
}

module.exports = {
  AGENT_ARTIFACT_PATHS,
  AGENT_STEM_ALIASES,
  UPSTREAM_ARTIFACTS,
  CHAIN_STEP_DIR,
  normalizeAgentStem,
  defaultArtifactPathForAgent,
  upstreamArtifactPathsForAgent,
  relatedArtifactPathsForAgent,
  buildAgentArtifactPathHint,
}
