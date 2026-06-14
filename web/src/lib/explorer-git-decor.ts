export type ExplorerGitStatusEntry = { path: string; letter: string };

/** 与 git / 资源管理器树 pathKey 对齐 */
export function normalizeExplorerGitPath(raw: string): string {
  let p = raw.trim().replace(/\\/g, "/");
  if (p.startsWith('"') && p.endsWith('"')) {
    p = p.slice(1, -1).replace(/\\"/g, '"');
  }
  if (p.startsWith("./")) p = p.slice(2);
  p = p.replace(/\/+$/, "");
  return p;
}

export function porcelainLetter(x: string, y: string): string {
  if (x === "?" && y === "?") return "U";
  if (x === "A" || y === "A") return "A";
  if (x === "D" || y === "D") return "D";
  if (x === "R" || y === "R") return "R";
  if (x === "C" || y === "C") return "C";
  if (x === "M" || y === "M") return "M";
  if (x === "U" || y === "U") return "U";
  return "M";
}

/** 解析 `git status -sb` 输出（Bridge 旧版无 gitStatus 时的回退） */
export function parseGitStatusShortBranch(statusLine: string): ExplorerGitStatusEntry[] {
  const entries: ExplorerGitStatusEntry[] = [];
  for (const line of statusLine.split("\n")) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("##")) continue;
    if (trimmed.startsWith("?? ")) {
      entries.push({ path: normalizeExplorerGitPath(trimmed.slice(3)), letter: "U" });
      continue;
    }
    if (trimmed.length < 4) continue;
    const x = trimmed[0];
    const y = trimmed[1];
    const path = normalizeExplorerGitPath(trimmed.slice(3));
    if (!path) continue;
    entries.push({ path, letter: porcelainLetter(x, y) });
  }
  return entries;
}

/** 路径 → 状态字母；含变更后代的目录也会出现在 hasDecoration 中（用于蓝色圆点） */
export function buildExplorerGitDecor(entries: ExplorerGitStatusEntry[]) {
  const statusByPath = new Map<string, string>();
  const hasDecoration = new Set<string>();
  for (const raw of entries) {
    const path = normalizeExplorerGitPath(raw.path);
    const letter = raw.letter;
    if (!path) continue;
    statusByPath.set(path, letter);
    const parts = path.split("/").filter(Boolean);
    for (let i = 1; i <= parts.length; i++) {
      hasDecoration.add(parts.slice(0, i).join("/"));
    }
  }
  return { statusByPath, hasDecoration };
}
