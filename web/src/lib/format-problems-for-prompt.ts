import type { WorkbenchProblem } from "@/types/workbench-problems";

const MAX_LINES = 24;
const MAX_MSG = 160;

/** 将 Problems 格式化为可注入 prompt 的短摘要（对齐 IDE 诊断） */
export function formatProblemsForPrompt(
  problems: WorkbenchProblem[],
  opts?: { preferPaths?: string[]; maxLines?: number },
): string {
  if (!problems.length) return "";
  const prefer = new Set(
    (opts?.preferPaths || []).map((p) => p.replace(/\\/g, "/")).filter(Boolean),
  );
  const sorted = [...problems].sort((a, b) => {
    const ap = prefer.has(a.relPath.replace(/\\/g, "/")) ? 0 : 1;
    const bp = prefer.has(b.relPath.replace(/\\/g, "/")) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
    return a.relPath.localeCompare(b.relPath) || a.line - b.line;
  });
  const max = opts?.maxLines ?? MAX_LINES;
  const lines = sorted.slice(0, max).map((p) => {
    const sev = p.severity === "error" ? "E" : "W";
    const msg = (p.message || "").replace(/\s+/g, " ").slice(0, MAX_MSG);
    const rule = p.rule ? ` (${p.rule})` : "";
    return `${sev} ${p.relPath}:${p.line}:${p.column} ${msg}${rule}`;
  });
  const more = sorted.length > max ? `\n…另有 ${sorted.length - max} 条未列出` : "";
  return `【当前诊断 · Problems】\n\`\`\`\n${lines.join("\n")}\n\`\`\`${more}`;
}
