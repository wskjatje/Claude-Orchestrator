/** Agent / 批写刚落盘的路径，供资源管理器短暂高亮 */

type Listener = () => void;

const listeners = new Set<Listener>();
let paths = new Set<string>();
let clearTimer: ReturnType<typeof setTimeout> | null = null;

function bump() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

export function markRecentlyWrittenPaths(relPaths: string[], ttlMs = 90_000) {
  const next = new Set(paths);
  for (const p of relPaths) {
    const n = String(p || "")
      .replace(/\\/g, "/")
      .replace(/^\.\//, "");
    if (n) next.add(n);
  }
  paths = next;
  bump();
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    paths = new Set();
    bump();
  }, ttlMs);
}

export function getRecentlyWrittenPaths(): Set<string> {
  return paths;
}

export function isRecentlyWrittenPath(relPath: string): boolean {
  const n = relPath.replace(/\\/g, "/");
  return paths.has(n) || [...paths].some((p) => p.endsWith("/" + n) || n.endsWith("/" + p));
}

export function subscribeRecentlyWrittenPaths(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
