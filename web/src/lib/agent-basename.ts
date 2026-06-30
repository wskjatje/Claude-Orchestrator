/**
 * 与 `main.js` 中 `localAgentBasename` 约定一致：仅文件名，可带或不带 `.md`。
 * 空 / auto 表示底栏「通用」：按感觉词推断 Agent。
 */

/** 通用 Agent（__general__）在 UI 中的展示名 */
export const GENERAL_AGENT_DISPLAY_NAME = "Agent";

export function isAutoAgentBasename(basename: string | undefined | null): boolean {
  const raw = typeof basename === "string" ? basename.trim().toLowerCase() : "";
  return !raw || raw === "auto" || raw === "__auto__";
}

export function agentStemFromBasename(basename: string | undefined | null): string {
  const raw = typeof basename === "string" ? basename.trim() : "";
  if (!raw || isAutoAgentBasename(raw)) return "__general__";
  const lower = raw.toLowerCase();
  const stripMd = lower.endsWith(".md") ? raw.slice(0, -3).trim() : raw;
  return stripMd || "product-manager";
}
