export type AgentCategory = "项目" | "通用" | "实验";

export type ParsedAgentMarkdown = {
  description: string;
  category: AgentCategory;
  model: string;
  tools: string[];
  body: string;
};

const CATEGORIES: AgentCategory[] = ["项目", "通用", "实验"];

function extractFrontmatterField(fm: string, field: string): string {
  const re = new RegExp(`^${field}:\\s*(.+)$`, "m");
  const m = fm.match(re);
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "").slice(0, 500);
}

export function parseAgentMarkdown(content: string): ParsedAgentMarkdown {
  const trimmed = content.trimStart();
  let fm = "";
  let body = trimmed;
  if (trimmed.startsWith("---")) {
    const closeIdx = trimmed.indexOf("\n---", 3);
    if (closeIdx !== -1) {
      fm = trimmed.slice(3, closeIdx);
      body = trimmed.slice(closeIdx + 4).replace(/^\s+/, "");
    }
  }
  const catRaw = extractFrontmatterField(fm, "category");
  const category = (CATEGORIES as string[]).includes(catRaw) ? (catRaw as AgentCategory) : "通用";
  const toolsRaw = extractFrontmatterField(fm, "tools");
  const tools = toolsRaw
    ? toolsRaw
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  return {
    description: extractFrontmatterField(fm, "description"),
    category,
    model: extractFrontmatterField(fm, "model") || "inherit",
    tools,
    body,
  };
}

export function serializeAgentMarkdown(
  meta: ParsedAgentMarkdown,
  opts?: { heading?: string },
): string {
  const heading = opts?.heading?.trim() || "Agent";
  const toolsLine = meta.tools.length ? meta.tools.join(", ") : "read, edit";
  const fm = [
    "---",
    `description: ${meta.description.trim() || "简述该 Agent 的职责。"}`,
    `category: ${meta.category}`,
    `model: ${meta.model.trim() || "inherit"}`,
    `tools: ${toolsLine}`,
    "---",
    "",
  ].join("\n");
  const body = meta.body.trim() ? meta.body.trim() : `# ${heading}\n\n## 职责\n\n- （待填）\n`;
  return `${fm}${body}\n`;
}

export function buildDefaultAgentMarkdown(stem: string): string {
  const name = stem.trim() || "new-agent";
  return serializeAgentMarkdown(
    {
      description: "简述该 Agent 的职责。",
      category: "通用",
      model: "inherit",
      tools: ["read", "edit"],
      body: `# ${name}\n\n## 职责\n\n- （待填）\n\n## 工作方式\n\n- （待填）\n`,
    },
    { heading: name },
  );
}

export function stemFromBasenameInput(raw: string): string {
  return raw.trim().replace(/\.md$/i, "").replace(/[/\\]/g, "");
}
