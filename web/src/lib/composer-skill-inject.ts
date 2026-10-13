import type { DesktopApi } from "@/types/desktop";
import { dedupeSkillStems } from "@/lib/agent-skill-defaults";

/** `@skill stem` / `@skill:stem`（stem 允许字母数字._-） */
const AT_SKILL_RE = /(?:^|\s)@skill(?::|\s+)([A-Za-z0-9._-]+)/gi;

/**
 * 从用户文案中抽出 `@skill` 提及并剥掉标记（展示与发送共用清洗后的正文）。
 */
export function collectAtSkillStems(text: string): { stems: string[]; text: string } {
  const stems: string[] = [];
  const cleaned = text.replace(AT_SKILL_RE, (_full, stem: string) => {
    const s = String(stem || "").trim();
    if (s) stems.push(s);
    return " ";
  });
  return {
    stems: dedupeSkillStems(stems),
    text: cleaned.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

/** 去掉 frontmatter，便于注入正文 */
function stripFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\s*/, "").trim();
}

/**
 * 读取选用 Skill 正文。`stems` 为空时返回 ""（零行为变化）。
 */
export async function loadComposerSkillSnippet(
  api: DesktopApi,
  stems: string[],
): Promise<string> {
  const list = dedupeSkillStems(stems);
  if (!list.length || typeof api.readClaudeSkillMarkdown !== "function") return "";

  const parts: string[] = [];
  for (const stem of list) {
    try {
      const r = await api.readClaudeSkillMarkdown(`${stem}.md`);
      if (!r?.ok || typeof r.content !== "string") continue;
      const body = stripFrontmatter(r.content);
      if (!body) continue;
      parts.push(`【Skill·${stem}】\n${body}`);
    } catch {
      /* 单文件失败跳过 */
    }
  }
  if (!parts.length) return "";
  return ["【本轮选用 Skill · 须遵循】", "", parts.join("\n\n---\n\n")].join("\n");
}

/** 将 Skill 块接到发送用 userLine；无 snippet 时原样返回 */
export function prependSkillSnippet(userLine: string, skillSnippet: string): string {
  const snip = skillSnippet.trim();
  if (!snip) return userLine;
  const body = userLine.trim();
  return body ? `${snip}\n\n${body}` : snip;
}
