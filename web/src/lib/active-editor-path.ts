/** 当前活动/打开编辑器相对路径（供规则 globs、Agent 上下文注入） */

let activeRelPath: string | null = null;
let openRelPaths: string[] = [];

export function setActiveEditorRelPath(relPath: string | null) {
  activeRelPath = relPath ? relPath.replace(/\\/g, "/") : null;
}

export function getActiveEditorRelPath(): string | null {
  return activeRelPath;
}

export function setOpenEditorRelPaths(paths: string[]) {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of paths || []) {
    const p = String(raw || "")
      .replace(/\\/g, "/")
      .replace(/^[/]+/, "")
      .trim();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    next.push(p);
    if (next.length >= 12) break;
  }
  openRelPaths = next;
}

export function getOpenEditorRelPaths(): string[] {
  return openRelPaths.slice();
}
