/**
 * Agent stem → 默认工作区相对路径（各角色专属，避免共写 docs/prd.md 互相覆盖）。
 * 与 server/agent-artifact-paths.cjs 保持同步。
 *
 * 解析顺序：stem 别名 → 显式映射 → 类别前缀约定 → docs/agents/{stem}.md
 */

/** 任务链 / 一键写入优先使用的固定路径（可被「按 WBS 开工」等按钮发现） */
export const AGENT_ARTIFACT_PATHS: Record<string, string> = {
  // —— 产品 ——
  "product-manager": "docs/prd.md",
  "product-sprint-prioritizer": "docs/sprint-backlog.md",
  "product-trend-researcher": "docs/market-research.md",
  "product-feedback-synthesizer": "docs/feedback-summary.md",
  "product-behavioral-nudge-engine": "docs/nudge-notes.md",

  // —— 项目 / WBS ——
  "project-manager": "docs/wbs.md",
  "project-manager-senior": "docs/wbs.md",
  "project-management-project-shepherd": "docs/project-status.md",
  "project-management-meeting-notes-specialist": "docs/meeting-notes.md",
  "project-management-jira-workflow-steward": "docs/jira-workflow.md",
  "project-management-experiment-tracker": "docs/experiment-log.md",
  "project-management-studio-producer": "docs/studio-production-plan.md",
  "project-management-studio-operations": "docs/studio-operations.md",

  // —— 工程（中文工作流短名）——
  "software-architect": "docs/architecture-note.md",
  "frontend-engineer": "docs/frontend-implementation.md",
  "backend-engineer": "docs/api-summary.md",
  "qa-engineer": "docs/qa-report.md",
  "devops-engineer": "docs/release-plan.md",
  "code-reviewer": "docs/code-review-report.md",

  // —— 设计 ——
  "design-ui-designer": "docs/ui-spec.md",
  "design-ux-architect": "docs/ux-architecture.md",
  "ui-ux-designer": "docs/ui-ux-spec.md",
  "design-visual-storyteller": "docs/visual-story.md",
  "design-ux-researcher": "docs/ux-research.md",
  "design-brand-guardian": "docs/brand-guidelines.md",
  "design-whimsy-injector": "docs/whimsy-notes.md",
  "design-persona-walkthrough": "docs/persona-walkthrough-report.md",
  "design-inclusive-visuals-specialist": "docs/inclusive-visuals-notes.md",
  "design-image-prompt-engineer": "docs/image-prompt-library.md",

  // —— 测试（QA 流水线）——
  "testing-api-tester": "docs/testing/api-test-report.md",
  "testing-accessibility-auditor": "docs/testing/accessibility-audit.md",
  "testing-evidence-collector": "docs/testing/evidence-report.md",
  "testing-performance-benchmarker": "docs/testing/performance-report.md",
  "testing-reality-checker": "docs/testing/reality-check.md",
  "testing-test-results-analyzer": "docs/testing/test-analysis.md",
  "testing-tool-evaluator": "docs/testing/tool-evaluation.md",
  "testing-workflow-optimizer": "docs/testing/workflow-optimization.md",

  // —— 其它常用独立角色 ——
  historian: "docs/history-notes.md",
  "literature-scholar": "docs/literature-notes.md",
  "specialized-workflow-architect": "docs/workflow-spec.md",
  "specialized-technical-writer": "docs/technical-writing.md",
  "specialized-document-generator": "docs/generated-document.md",
  "specialized-chief-of-staff": "docs/executive-brief.md",
  "support-executive-summary-generator": "docs/executive-summary.md",
  "support-analytics-reporter": "docs/analytics-report.md",
};

/** 带前缀的全名 → 工作流 canonical stem（共享 Tier-1 路径） */
export const AGENT_STEM_ALIASES: Record<string, string> = {
  "engineering-software-architect": "software-architect",
  "engineering-frontend-developer": "frontend-engineer",
  "engineering-code-reviewer": "code-reviewer",
  "engineering-devops-automator": "devops-engineer",
  "engineering-backend-architect": "software-architect",
  "engineering-technical-writer": "specialized-technical-writer",
};

/** 类别前缀 → docs 子目录（长前缀优先匹配） */
const CATEGORY_PREFIX_DIRS: readonly [string, string][] = [
  ["project-management", "docs/project"],
  ["paid-media", "docs/paid-media"],
  ["product", "docs/product"],
  ["engineering", "docs/engineering"],
  ["design", "docs/design"],
  ["testing", "docs/testing"],
  ["marketing", "docs/marketing"],
  ["sales", "docs/sales"],
  ["finance", "docs/finance"],
  ["support", "docs/support"],
  ["specialized", "docs/specialized"],
  ["legal", "docs/legal"],
  ["healthcare", "docs/healthcare"],
  ["government", "docs/government"],
  ["hospitality", "docs/hospitality"],
  ["game", "docs/game"],
  ["godot", "docs/godot"],
  ["unity", "docs/unity"],
  ["unreal", "docs/unreal"],
  ["roblox", "docs/roblox"],
  ["medical", "docs/medical"],
].sort((a, b) => b[0].length - a[0].length);

/** 执行某 Agent 前建议自动注入的上游产物（便于有据可查） */
const UPSTREAM_ARTIFACTS: Record<string, string[]> = {
  "project-manager": ["docs/prd.md", "docs/sprint-backlog.md"],
  "software-architect": ["docs/prd.md", "docs/wbs.md", "docs/sprint-backlog.md"],
  "frontend-engineer": [
    "docs/prd.md",
    "docs/architecture-note.md",
    "docs/ui-spec.md",
    "docs/ux-architecture.md",
  ],
  "backend-engineer": ["docs/prd.md", "docs/architecture-note.md", "docs/wbs.md"],
  "qa-engineer": [
    "docs/prd.md",
    "docs/frontend-implementation.md",
    "docs/api-summary.md",
  ],
  "devops-engineer": ["docs/architecture-note.md", "docs/release-plan.md"],
  "code-reviewer": ["docs/frontend-implementation.md", "docs/api-summary.md"],
  "design-ui-designer": ["docs/prd.md", "docs/ux-architecture.md"],
  "design-ux-architect": ["docs/prd.md"],
  "ui-ux-designer": ["docs/prd.md", "docs/ux-architecture.md"],
  "product-sprint-prioritizer": ["docs/prd.md"],
};

export function normalizeAgentStem(raw: string): string {
  const t = String(raw || "").trim().replace(/\\/g, "/");
  const base = t.includes("/") ? t.slice(t.lastIndexOf("/") + 1) : t;
  const lower = base.toLowerCase();
  return lower.endsWith(".md") ? lower.slice(0, -3) : lower;
}

function resolveCategoryArtifactPath(stem: string): string | null {
  for (const [prefix, dir] of CATEGORY_PREFIX_DIRS) {
    if (!stem.startsWith(`${prefix}-`)) continue;
    const rest = stem.slice(prefix.length + 1);
    if (!rest) return null;
    return `${dir}/${rest}.md`;
  }
  return null;
}

function resolveCanonicalStem(stem: string, depth = 0): string {
  if (depth > 4) return stem;
  const alias = AGENT_STEM_ALIASES[stem];
  return alias ? resolveCanonicalStem(alias, depth + 1) : stem;
}

/** 该 Agent 的默认落盘相对路径 */
export function defaultArtifactPathForAgent(agentName: string): string {
  const stem = normalizeAgentStem(agentName);
  if (!stem) return "docs/note.md";

  const canonical = resolveCanonicalStem(stem);
  if (AGENT_ARTIFACT_PATHS[canonical]) return AGENT_ARTIFACT_PATHS[canonical];
  if (AGENT_ARTIFACT_PATHS[stem]) return AGENT_ARTIFACT_PATHS[stem];

  const categoryPath = resolveCategoryArtifactPath(stem);
  if (categoryPath) return categoryPath;

  return `docs/agents/${stem}.md`;
}

/** 任务链执行 / 追问时，优先从工作区注入的相关产物路径（去重，不含重复读取自身） */
export function relatedArtifactPathsForAgent(agentName: string): string[] {
  const stem = resolveCanonicalStem(normalizeAgentStem(agentName));
  const own = defaultArtifactPathForAgent(stem);
  const upstream = UPSTREAM_ARTIFACTS[stem] ?? UPSTREAM_ARTIFACTS[normalizeAgentStem(agentName)] ?? [];
  return [...new Set([...upstream, own])].filter(Boolean);
}

export function buildAgentArtifactPathHint(stemRaw: string): string {
  const stem = normalizeAgentStem(stemRaw);
  if (!stem) return "";
  const path = defaultArtifactPathForAgent(stem);
  const examples = [
    "product-manager→docs/prd.md",
    "project-manager→docs/wbs.md",
    "product-sprint-prioritizer→docs/sprint-backlog.md",
    "frontend-engineer→docs/frontend-implementation.md",
    "qa-engineer→docs/qa-report.md",
  ].join("、");
  return (
    `【落盘路径·强制】你是 global://${stem}。写入工作区时 \`\`\`workspace-write\`\`\` 的 path **默认必须是** \`${path}\`；` +
    `同一 Agent 多次交付仍用此路径（追加或覆盖须在正文说明）；` +
    `禁止写入其它 Agent 专属文件（如 ${examples}），除非用户明确要求合并到指定路径。` +
    `未在映射表中的角色默认 \`docs/agents/{stem}.md\` 或 \`docs/{类别}/{角色名}.md\`。`
  );
}
