/** 已拒绝的 workspace-write：localStorage 跨会话保留 */

const STORAGE_KEY = "claude-orchestrator:rejected-workspace-writes:v2";
const LEGACY_SESSION_KEY = "claude-orchestrator:rejected-workspace-writes:v1";
const MAX_ENTRIES = 200;

function fingerprint(path: string, content: string): string {
  const p = String(path || "")
    .replace(/\\/g, "/")
    .trim();
  const c = String(content || "");
  return `${p}::${c.length}::${c.slice(0, 96)}`;
}

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
    }
  } catch {
    /* ignore */
  }
  // 迁移旧 sessionStorage
  try {
    const legacy = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (legacy) {
      const arr = JSON.parse(legacy) as unknown;
      if (Array.isArray(arr)) {
        const set = new Set(arr.filter((x): x is string => typeof x === "string"));
        save(set);
        sessionStorage.removeItem(LEGACY_SESSION_KEY);
        return set;
      }
    }
  } catch {
    /* ignore */
  }
  return new Set();
}

function save(set: Set<string>) {
  try {
    const arr = Array.from(set);
    if (arr.length > MAX_ENTRIES) arr.splice(0, arr.length - MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* ignore quota */
  }
}

export function rejectWorkspaceWrite(path: string, content: string) {
  const set = load();
  set.add(fingerprint(path, content));
  save(set);
}

export function isWorkspaceWriteRejected(path: string, content: string): boolean {
  return load().has(fingerprint(path, content));
}

export function clearRejectedWorkspaceWrite(path: string, content: string) {
  const set = load();
  set.delete(fingerprint(path, content));
  save(set);
}
