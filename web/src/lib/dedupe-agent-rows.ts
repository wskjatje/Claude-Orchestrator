/** Agent 列表项来源（与 Bridge `collectAgentMarkdownEntries` 一致） */
export type AgentRowSource = "root" | "sanshengliubu";

/**
 * 同一 stem 可能在 `~/.claude/agents/` 与 `sanshengliubu/` 各有一份；
 * 聊天选择器只展示一条，优先 root（与 readClaudeAgentMarkdown 读取顺序一致）。
 */
export function dedupeAgentRowsByStem<T extends { stem: string; source: AgentRowSource }>(
  rows: T[],
): T[] {
  const byStem = new Map<string, T>();
  for (const row of rows) {
    const prev = byStem.get(row.stem);
    if (!prev || (prev.source === "sanshengliubu" && row.source === "root")) {
      byStem.set(row.stem, row);
    }
  }
  return [...byStem.values()];
}
