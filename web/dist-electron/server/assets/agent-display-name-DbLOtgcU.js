const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
function hasCjkText(text) {
  return Boolean(text && CJK_RE.test(text));
}
function cleanHeadingLabel(heading) {
  return heading.replace(/\s*Agent\s*(Personality|Profile)?\s*$/i, "").replace(/\s*智能体\s*$/i, "").trim();
}
function shortChineseLabelFromDescription(desc) {
  const t = (desc ?? "").trim();
  if (!hasCjkText(t)) return "";
  const first = t.split(/[，。；;、|·—–\-]|(?:\s*——\s*)|(?:\s+—\s+)/)[0]?.trim() ?? "";
  return first.slice(0, 28);
}
function resolveAgentDisplayName(meta) {
  const candidates = [
    meta.nameZh?.trim(),
    meta.displayName?.trim(),
    hasCjkText(meta.name) ? meta.name.trim() : "",
    hasCjkText(meta.heading) ? cleanHeadingLabel(meta.heading) : "",
    shortChineseLabelFromDescription(meta.description)
  ];
  for (const c of candidates) {
    if (c) return c;
  }
  return meta.stem;
}
function agentMatchesDisplayQuery(meta, q) {
  const display = resolveAgentDisplayName(meta);
  const hay = [
    meta.stem,
    meta.basename,
    meta.name,
    meta.nameZh,
    meta.displayName,
    meta.heading,
    meta.description,
    display
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}
export {
  agentMatchesDisplayQuery as a,
  resolveAgentDisplayName as r
};
