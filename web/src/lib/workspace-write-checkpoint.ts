/** Accept 前磁盘快照：撤销时优先还原快照，其次 git discard */

const MAX = 40;
const stash = new Map<string, string>();

function norm(p: string): string {
  return String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

export function stashWorkspaceWriteCheckpoint(path: string, previousContent: string) {
  const key = norm(path);
  if (!key) return;
  if (!stash.has(key)) {
    if (stash.size >= MAX) {
      const first = stash.keys().next().value;
      if (first) stash.delete(first);
    }
    stash.set(key, previousContent);
  }
}

export function takeWorkspaceWriteCheckpoint(path: string): string | undefined {
  const key = norm(path);
  const v = stash.get(key);
  if (v !== undefined) stash.delete(key);
  return v;
}

export function peekWorkspaceWriteCheckpoint(path: string): string | undefined {
  return stash.get(norm(path));
}
