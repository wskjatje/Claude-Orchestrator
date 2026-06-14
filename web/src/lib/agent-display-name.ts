/** 仅用于界面展示；路由 / 执行始终使用 stem / basename。 */

export type AgentDisplayMeta = {
  stem: string;
  basename?: string;
  name?: string;
  nameZh?: string;
  displayName?: string;
  heading?: string;
  description?: string;
};

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

export function hasCjkText(text: string | undefined | null): boolean {
  return Boolean(text && CJK_RE.test(text));
}

function cleanHeadingLabel(heading: string): string {
  return heading
    .replace(/\s*Agent\s*(Personality|Profile)?\s*$/i, "")
    .replace(/\s*智能体\s*$/i, "")
    .trim();
}

/** 从中文 description 取短标签（职责短语） */
export function shortChineseLabelFromDescription(desc: string | undefined | null): string {
  const t = (desc ?? "").trim();
  if (!hasCjkText(t)) return "";
  const first = t.split(/[，。；;、|·—–\-]|(?:\s*——\s*)|(?:\s+—\s+)/)[0]?.trim() ?? "";
  return first.slice(0, 28);
}

/**
 * 解析 Agent 的中文展示名。优先级：
 * name_zh / displayName → 含中文的 name → 含中文的 # 标题 → description 短语 → stem
 */
export function resolveAgentDisplayName(meta: AgentDisplayMeta): string {
  const candidates = [
    meta.nameZh?.trim(),
    meta.displayName?.trim(),
    hasCjkText(meta.name) ? meta.name!.trim() : "",
    hasCjkText(meta.heading) ? cleanHeadingLabel(meta.heading!) : "",
    shortChineseLabelFromDescription(meta.description),
  ];
  for (const c of candidates) {
    if (c) return c;
  }
  return meta.stem;
}

export function agentMatchesDisplayQuery(meta: AgentDisplayMeta, q: string): boolean {
  const display = resolveAgentDisplayName(meta);
  const hay = [
    meta.stem,
    meta.basename,
    meta.name,
    meta.nameZh,
    meta.displayName,
    meta.heading,
    meta.description,
    display,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
