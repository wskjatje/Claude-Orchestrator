import type { SavedChainSummary } from "@/types/desktop";
import { CHAIN_TEMPLATES, type ChainTemplate } from "@/lib/chain-templates";
import { agentDisplayNameForStem, type ClaudeAgentRow } from "@/hooks/use-claude-agent-list";

export type AgentChainEntry = {
  id: string;
  name: string;
  description: string;
  official: boolean;
  stepCount: number;
  templateId: string | null;
};

export function chainsForAgent(
  agentStem: string,
  savedItems: SavedChainSummary[],
): AgentChainEntry[] {
  const stem = agentStem.trim();
  if (!stem) return [];

  const fromRegistry = savedItems
    .filter((c) => c.enabled !== false && (c.agentStems?.includes(stem) || false))
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      official: Boolean(c.official || c.id.startsWith("official-")),
      stepCount: c.stepCount,
      templateId: c.templateId,
    }));

  const registryTemplateIds = new Set(fromRegistry.map((c) => c.templateId).filter(Boolean) as string[]);

  const fromTemplates = CHAIN_TEMPLATES.filter(
    (t) => t.agents.includes(stem) && !registryTemplateIds.has(t.id),
  ).map((t) => ({
    id: `official-${t.id}`,
    name: t.name,
    description: t.description,
    official: true,
    stepCount: t.steps.length,
    templateId: t.id,
  }));

  return [...fromRegistry, ...fromTemplates];
}

export function buildAgentChainCatalogMarkdown(
  agentStem: string,
  savedItems: SavedChainSummary[],
  agents: ClaudeAgentRow[],
): string {
  const entries = chainsForAgent(agentStem, savedItems);
  if (!entries.length) return "";

  const agentLabel = agentDisplayNameForStem(agentStem, agents) || agentStem;
  const lines = entries.slice(0, 12).map((c, i) => {
    const tag = c.official ? "官方" : "自定义";
    return `${i + 1}. ${c.name}（${tag} · ${c.stepCount} 步）\n   调用：/chain ${c.id.replace(/^official-/, "")} 或 /chain run ${c.id.replace(/^official-/, "")}`;
  });

  return (
    `【${agentLabel} · 可调用任务链】\n` +
    `以下任务链含本 Agent 步骤；用户发送 /chain list 可列出，/chain run <名称或 id> 可后台执行。\n` +
    `Agent 也可在回复中引导用户使用上述命令。\n\n` +
    lines.join("\n")
  );
}

export function resolveChainQuery(
  query: string,
  agentStem: string,
  savedItems: SavedChainSummary[],
): AgentChainEntry | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const pool = chainsForAgent(agentStem, savedItems);
  const exact = pool.find(
    (c) =>
      c.id.toLowerCase() === q ||
      c.id.toLowerCase() === `official-${q}` ||
      c.templateId?.toLowerCase() === q ||
      c.name.toLowerCase() === q,
  );
  if (exact) return exact;
  return (
    pool.find(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.templateId?.toLowerCase().includes(q) ?? false),
    ) ?? null
  );
}

export function formatChainListForAgent(agentStem: string, savedItems: SavedChainSummary[]): string {
  const entries = chainsForAgent(agentStem, savedItems);
  if (!entries.length) {
    return `当前 Agent（${agentStem}）暂无可调用的任务链。请先在「任务链」页确认官方已同步。`;
  }
  return (
    `【可调用任务链 · ${agentStem}】\n` +
    entries
      .map(
        (c, i) =>
          `${i + 1}. ${c.name} · ${c.stepCount} 步 · id=${c.templateId || c.id}\n   执行：/chain run ${c.templateId || c.id.replace(/^official-/, "")}`,
      )
      .join("\n") +
    `\n\n用法：/chain list · /chain run <名称或 id>`
  );
}

export function getTemplateById(id: string): ChainTemplate | undefined {
  return CHAIN_TEMPLATES.find((t) => t.id === id);
}
