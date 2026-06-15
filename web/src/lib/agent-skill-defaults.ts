/**
 * Agent → ~/.claude/skills 下 Skill 文件 stem 映射（任务链模板与步骤编辑器共用）。
 */
import { getAgentSkillToolBundle } from "@/lib/agent-skill-catalog";

export { getAgentSkillToolBundle, getSkillDefinition } from "@/lib/agent-skill-catalog";
export { AGENT_SKILL_FILE_STEMS } from "@/lib/agent-skill-catalog";

export function dedupeSkillStems(stems: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of stems) {
    const t = String(raw ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** 某 Agent 默认关联的 Skill 文件 stem（优先 frontmatter，其次任务链预设，最后 agent stem） */
export function skillFileStemsForAgent(agentStem: string, agentSkills?: string[]): string[] {
  const fromAgent = (agentSkills ?? []).map((s) => s.trim()).filter(Boolean);
  if (fromAgent.length) return dedupeSkillStems(fromAgent);
  const preset = getAgentSkillToolBundle(agentStem)?.skillStems;
  if (preset?.length) return dedupeSkillStems(preset);
  const stem = agentStem.trim();
  return stem ? [stem] : [];
}

/**
 * 合并 Agent 配置 skills 与任务链步骤 skills：Agent 为准，步骤可追加；相同 stem 只保留一个。
 */
export function mergeAgentStepSkills(
  agentStem: string,
  stepSkills: string[] = [],
  agentSkills?: string[],
  availableStems?: Set<string>,
): string[] {
  const base = skillFileStemsForAgent(agentStem, agentSkills);
  const merged = dedupeSkillStems([...base, ...stepSkills]);
  if (availableStems?.size) return merged.filter((s) => availableStems.has(s));
  return merged;
}

/** 多个 Agent 步骤涉及的 Skill 文件 stem（去重） */
export function allSkillFilesForAgentStems(stems: string[]): string[] {
  const set = new Set<string>();
  for (const stem of stems) {
    for (const s of skillFileStemsForAgent(stem)) set.add(s);
  }
  return [...set];
}

/** 选择 Agent 时默认带入的 Skill（= Agent 配置，不含重复 catalog） */
export function suggestedSkillStemsForAgent(
  agentStem: string,
  availableStems: Set<string>,
  agentSkills?: string[],
): string[] {
  return mergeAgentStepSkills(agentStem, [], agentSkills, availableStems);
}

/** 任务链步骤 Skill：仅来自 Agent 配置，忽略步骤里历史自定义 */
export function resolveChainStepSkills(
  agentStem: string,
  agents: { stem: string; skills?: string[] }[] = [],
  availableStems?: Set<string>,
): string[] {
  const stem = agentStem.trim();
  if (!stem) return [];
  const agentRow = agents.find((a) => a.stem === stem);
  return suggestedSkillStemsForAgent(stem, availableStems ?? new Set(), agentRow?.skills);
}

/** 任务链各步有效 Skill 并集（仅 Agent 配置，逐步去重） */
export function skillsUnionFromSteps(
  steps: { agentName?: string; skills?: string[] }[],
  agents: { stem: string; skills?: string[] }[] = [],
): string[] {
  const set = new Set<string>();
  for (const step of steps) {
    const stem = String(step.agentName ?? "").trim();
    if (!stem) continue;
    for (const s of resolveChainStepSkills(stem, agents)) {
      set.add(s);
    }
  }
  return [...set];
}

export function skillStemToPath(stem: string, source: "user" | "project" = "user"): string {
  const s = stem.trim().replace(/\.md$/i, "");
  if (source === "project") return `.claude/skills/${s}.md`;
  return `~/.claude/skills/${s}.md`;
}
