export type ParsedSkillMarkdown = {
  name: string;
  description: string;
  category: string;
  body: string;
};

const CATEGORIES = ["项目", "通用", "工程", "集成", "分析", "媒体"] as const;

function extractFrontmatterField(fm: string, field: string): string {
  const re = new RegExp(`^${field}:\\s*(.+)$`, "m");
  const m = fm.match(re);
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "").slice(0, 500);
}

export function parseSkillMarkdown(content: string): ParsedSkillMarkdown {
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
  const category = (CATEGORIES as readonly string[]).includes(catRaw) ? catRaw : "工程";
  return {
    name: extractFrontmatterField(fm, "name") || extractFrontmatterField(fm, "displayName"),
    description: extractFrontmatterField(fm, "description"),
    category,
    body,
  };
}

export function serializeSkillMarkdown(meta: {
  stem: string;
  name?: string;
  description: string;
  category?: string;
  body?: string;
  agentStem?: string;
}): string {
  const stem = meta.stem.trim();
  const name = meta.name?.trim() || stem;
  const category = meta.category?.trim() || "工程";
  const desc = meta.description.trim() || `${meta.name?.trim() || stem}：步骤与验收基线`;
  const fm = [
    "---",
    `name: ${name}`,
    `description: ${desc}`,
    `category: ${category}`,
    "---",
    "",
  ].join("\n");
  const agentNote = meta.agentStem ? `\n\n## 关联 Agent\n\n\`${meta.agentStem}\`\n` : "";
  const body =
    meta.body?.trim() ||
    `# ${name}\n\n## 职责\n\n- ${desc}${agentNote}\n\n## 步骤\n\n- （可在此补充操作步骤与验收标准）\n`;
  return `${fm}${body}\n`;
}
