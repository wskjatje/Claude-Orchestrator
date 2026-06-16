import type { AgentExecRegistryEntry } from "@/types/desktop";

/** 纯数字等不应作为 ~/.claude/agents/<stem>.md 的 stem */
export function isLikelyAgentStem(stem: string): boolean {
  const s = String(stem || "").trim();
  if (!s || /^\d+$/.test(s)) return false;
  return /[a-zA-Z]/.test(s);
}

export function resolveRegistryEntry(
  registry: Map<string, AgentExecRegistryEntry>,
  stem: string,
): AgentExecRegistryEntry | undefined {
  const key = String(stem || "").trim();
  if (!key) return undefined;
  const direct = registry.get(key);
  if (direct) return direct;
  const lower = key.toLowerCase();
  for (const [k, v] of registry) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

export type AgentListRow = {
  id: string;
  stem: string;
  basename: string;
  displayName: string;
  description: string;
  source: "root" | "sanshengliubu";
  /** 来自执行 registry、磁盘上无同名 Agent 文件 */
  registryOnly?: boolean;
};

export function mergeAgentRowsWithRegistry<T extends AgentListRow>(
  rows: T[],
  registry: Map<string, AgentExecRegistryEntry>,
): T[] {
  const known = new Set(rows.map((r) => r.stem.toLowerCase()));
  const extras: T[] = [];
  for (const entry of registry.values()) {
    if (known.has(entry.stem.toLowerCase())) continue;
    if (entry.status !== "working" && entry.execCount <= 0) continue;
    const stem = entry.stem;
    extras.push({
      id: `exec:${stem}`,
      stem,
      basename: `${stem}.md`,
      displayName: stem,
      description: isLikelyAgentStem(stem)
        ? "（执行记录中有活动，但未在 Agent 目录找到同名文件）"
        : "（任务链可能误将编号当作 Agent，请检查 WBS「执行 Agent」列）",
      source: "root",
      registryOnly: true,
    } as T);
  }
  return extras.length ? [...rows, ...extras] : rows;
}
