import type { DesktopApi } from "@/types/desktop";
import { loadProjectRulesSnippet } from "@/lib/project-rules";

const MAX_APPENDIX = 8_000;

/**
 * Host / 本地编排用的短上下文：用户偏好+项目规则，以及已有跨 Agent 记忆尾部。
 * 空则返回 ""（无经验库时不制造噪声）。
 */
export async function loadAgentContextAppendix(
  api: DesktopApi | null | undefined,
): Promise<string> {
  if (!api) return "";
  const parts: string[] = [];

  try {
    const rules = await loadProjectRulesSnippet(api);
    if (rules.trim()) parts.push(rules.trim());
  } catch {
    /* ignore */
  }

  if (typeof api.getCrossAgentContext === "function") {
    try {
      const cx = await api.getCrossAgentContext();
      if (cx?.ok && typeof cx.text === "string" && cx.text.trim()) {
        parts.push(cx.text.trim());
      }
    } catch {
      /* ignore */
    }
  }

  if (!parts.length) return "";
  let out = parts.join("\n\n");
  if (out.length > MAX_APPENDIX) out = out.slice(0, MAX_APPENDIX) + "\n…";
  return out;
}

const MAX_ROLE_BODY = 6_000;

/** CLI：在角色锁之外注入 Agent Markdown 正文（截断）；通用角色不注入 */
export async function loadAgentRoleBodySnippet(
  api: DesktopApi | null | undefined,
  agentBasename: string | null | undefined,
): Promise<string> {
  if (!api?.readClaudeAgentMarkdown || !agentBasename?.trim()) return "";
  const raw = agentBasename.trim();
  if (!raw || raw === "auto" || raw === "__auto__" || raw.startsWith("__")) return "";
  const basename = raw.toLowerCase().endsWith(".md") ? raw : `${raw}.md`;
  try {
    const r = await api.readClaudeAgentMarkdown(basename);
    const content = typeof r?.content === "string" ? r.content.trim() : "";
    if (!r?.ok || !content) return "";
    const body = content.length > MAX_ROLE_BODY ? content.slice(0, MAX_ROLE_BODY) + "\n…" : content;
    return `【角色正文 · ${basename}】须遵循：\n${body}`;
  } catch {
    return "";
  }
}
