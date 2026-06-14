import type { WorkbenchProblem } from "@/types/workbench-problems";

/** 简易 glob（支持 ** 与 *），对齐 VS Code/Cursor Problems 筛选 */
function globMatch(path: string, pattern: string): boolean {
  const norm = path.replace(/\\/g, "/");
  const pat = pattern.replace(/\\/g, "/");
  if (pat === norm) return true;
  const re = new RegExp(
    `^${pat
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "___GLOBSTAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___GLOBSTAR___/g, ".*")}$`,
    "i",
  );
  return re.test(norm);
}

function tokenMatches(problem: WorkbenchProblem, token: string): boolean {
  const t = token.trim();
  if (!t) return true;
  const hay = [problem.relPath, problem.message, problem.rule ?? "", String(problem.line), String(problem.column)]
    .join(" ")
    .toLowerCase();

  if (t.startsWith("!")) {
    const neg = t.slice(1);
    if (neg.includes("*") || neg.includes("/")) return !globMatch(problem.relPath, neg);
    return !hay.includes(neg.toLowerCase());
  }

  if (t.includes("*") || t.includes("/")) return globMatch(problem.relPath, t);
  return hay.includes(t.toLowerCase());
}

/** Cursor/VS Code 风格：空格分隔多条件，支持 glob 与 !排除 */
export function matchProblemFilter(problem: WorkbenchProblem, filter: string): boolean {
  const tokens = filter.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every((token) => tokenMatches(problem, token));
}
