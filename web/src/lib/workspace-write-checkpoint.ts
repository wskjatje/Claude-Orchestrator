/** Accept 前磁盘快照：撤销时优先还原快照，其次 git discard */

const MAX = 40;
const MAX_TOTAL_CHARS = 16_000_000;
const stash = new Map<string, string>();
let totalChars = 0;

function norm(p: string): string {
  return String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

export function stashWorkspaceWriteCheckpoint(path: string, previousContent: string) {
  const key = norm(path);
  if (!key || stash.has(key)) return;
  const snapshot = String(previousContent);
  if (snapshot.length > MAX_TOTAL_CHARS) return;
  while (stash.size >= MAX || totalChars + snapshot.length > MAX_TOTAL_CHARS) {
    const first = stash.keys().next().value;
    if (!first) break;
    const removed = stash.get(first);
    if (removed !== undefined) totalChars -= removed.length;
    stash.delete(first);
  }
  if (!stash.has(key)) {
    stash.set(key, snapshot);
    totalChars += snapshot.length;
  }
}

export function takeWorkspaceWriteCheckpoint(path: string): string | undefined {
  const key = norm(path);
  const v = stash.get(key);
  if (v !== undefined) {
    stash.delete(key);
    totalChars -= v.length;
  }
  return v;
}

export function peekWorkspaceWriteCheckpoint(path: string): string | undefined {
  return stash.get(norm(path));
}
