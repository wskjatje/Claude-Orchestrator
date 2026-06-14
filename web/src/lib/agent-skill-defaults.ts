/**
 * Agent → ~/.claude/skills 下 Skill 文件 stem 映射（任务链模板与步骤编辑器共用）。
 * 仅包含本机可能存在的 .md 文件 stem；执行时由 appendStepSkillFilesToInstruction 注入路径。
 */
export const AGENT_SKILL_FILE_STEMS: Record<string, string[]> = {
  "product-manager": [],
  "product-sprint-prioritizer": [],
  "project-manager": ["self_learning"],
  "software-architect": [],
  "frontend-engineer": ["frontend-design", "react-best-practices", "web-design-guidelines"],
  "backend-engineer": [],
  "qa-engineer": ["webapp-testing", "playwright"],
  "devops-engineer": ["vercel-deploy-claimable"],
  "code-reviewer": ["react-best-practices"],
  "design-ux-architect": ["frontend-design", "web-design-guidelines"],
  "design-ui-designer": ["frontend-design", "canvas-design"],
  "ui-ux-designer": ["frontend-design", "canvas-design", "web-design-guidelines"],
};

/** 某 Agent 默认关联的 Skill 文件 stem */
export function skillFileStemsForAgent(agentStem: string): string[] {
  const stem = agentStem.trim();
  if (!stem) return [];
  return AGENT_SKILL_FILE_STEMS[stem] ?? [];
}

/** 多个 Agent 步骤涉及的 Skill 文件 stem（去重） */
export function allSkillFilesForAgentStems(stems: string[]): string[] {
  const set = new Set<string>();
  for (const stem of stems) {
    for (const s of skillFileStemsForAgent(stem)) set.add(s);
  }
  return [...set];
}

export function suggestedSkillStemsForAgent(agentStem: string, availableStems: Set<string>): string[] {
  return skillFileStemsForAgent(agentStem).filter((s) => availableStems.has(s));
}

export function skillStemToPath(stem: string, source: "user" | "project" = "user"): string {
  const s = stem.trim().replace(/\.md$/i, "");
  if (source === "project") return `.claude/skills/${s}.md`;
  return `~/.claude/skills/${s}.md`;
}
