/**
 * 与 `main.js` 中 `localAgentBasename` 约定一致：仅文件名，可带或不带 `.md`。
 * 空 / auto 表示底栏「Auto」：按感觉词推断 Agent。
 */
export function isAutoAgentBasename(basename: string | undefined | null): boolean {
  const raw = typeof basename === "string" ? basename.trim().toLowerCase() : "";
  return !raw || raw === "auto" || raw === "__auto__";
}

export function agentStemFromBasename(basename: string | undefined | null): string {
  const raw = typeof basename === "string" ? basename.trim() : "";
  if (!raw || isAutoAgentBasename(raw)) return "product-manager";
  const lower = raw.toLowerCase();
  const stripMd = lower.endsWith(".md") ? raw.slice(0, -3).trim() : raw;
  return stripMd || "product-manager";
}
