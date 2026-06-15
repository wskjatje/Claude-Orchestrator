/** Agent frontmatter `tools:` 英文 id ↔ 中文展示名（磁盘仍存英文 id） */
const AGENT_TOOL_CATALOG: { id: string; label: string }[] = [
  { id: "read", label: "读取" },
  { id: "edit", label: "编辑" },
  { id: "write", label: "写入" },
  { id: "bash", label: "终端" },
  { id: "web", label: "网页" },
  { id: "grep", label: "文本搜索" },
  { id: "glob", label: "文件匹配" },
  { id: "WebFetch", label: "网页抓取" },
  { id: "WebSearch", label: "网页搜索" },
  { id: "readWorkspaceTextFile", label: "读取工作区文件" },
  { id: "listWorkspaceMarkdownFiles", label: "列举 Markdown" },
  { id: "workspace-write", label: "工作区写入" },
];

const LABEL_TO_ID = new Map<string, string>();
for (const { id, label } of AGENT_TOOL_CATALOG) {
  LABEL_TO_ID.set(label, id);
  LABEL_TO_ID.set(id, id);
  LABEL_TO_ID.set(id.toLowerCase(), id);
}

/** 将输入规范为 frontmatter 用的英文 tool id */
export function normalizeAgentToolId(raw: string): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  return LABEL_TO_ID.get(t) ?? LABEL_TO_ID.get(t.toLowerCase()) ?? t;
}

export function normalizeAgentToolIds(tools: string[]): string[] {
  return [...new Set(tools.map(normalizeAgentToolId).filter(Boolean))];
}

/** 中文展示名；未知 id 原样返回 */
export function getAgentToolLabel(toolId: string): string {
  const id = normalizeAgentToolId(toolId);
  return AGENT_TOOL_CATALOG.find((x) => x.id === id)?.label ?? toolId;
}

export function formatAgentToolsForDisplay(tools: string[]): string {
  return normalizeAgentToolIds(tools).map(getAgentToolLabel).join(", ");
}

export function parseAgentToolsFromInput(input: string): string[] {
  return normalizeAgentToolIds(
    input
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean),
  );
}

export const DEFAULT_AGENT_TOOL_IDS = ["read", "edit"] as const;

export function defaultAgentToolLabels(): string {
  return formatAgentToolsForDisplay([...DEFAULT_AGENT_TOOL_IDS]);
}
