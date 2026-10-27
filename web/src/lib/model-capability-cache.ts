/** 前端能力缓存：由 Ollama modelDetails / models:capabilities 刷新，禁止按模型名猜。
 *  会话级持久化到 sessionStorage，避免刷新后冷启动误跑。
 */

export type ModelCaps = {
  tools?: boolean;
  vision?: boolean;
  /** 模型上下文窗口（token）；来自 Ollama show / 探测 */
  contextLength?: number | null;
};

const STORAGE_KEY = "claudecode.modelCaps.v1";
const cache = new Map<string, ModelCaps>();
const listeners = new Set<() => void>();
let epoch = 0;

function emitCacheChange(): void {
  epoch += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

/** 能力缓存变更订阅（占用条等 UI 在 snapshot 回写后刷新） */
export function subscribeModelCapabilityCache(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getModelCapabilityCacheEpoch(): number {
  ensureHydrated();
  return epoch;
}

function loadFromSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, ModelCaps>;
    for (const [k, v] of Object.entries(obj || {})) {
      if (!k || !v || typeof v !== "object") continue;
      cache.set(k, { ...v });
    }
  } catch {
    /* ignore */
  }
}

function persistToSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const obj: Record<string, ModelCaps> = {};
    for (const [k, v] of cache.entries()) obj[k] = v;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

let hydrated = false;
function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  loadFromSession();
}

export function rememberModelCapabilities(
  entries: Array<
    | {
        name?: string;
        capabilities?: ModelCaps;
        contextLength?: number | null;
      }
    | string
  >,
): void {
  ensureHydrated();
  let changed = false;
  for (const e of entries) {
    if (typeof e === "string") continue;
    const name = String(e?.name || "").trim();
    if (!name) continue;
    const prev = cache.get(name) || {};
    const next: ModelCaps = { ...prev };
    if (e.capabilities && typeof e.capabilities === "object") {
      Object.assign(next, e.capabilities);
    }
    const cl = e.contextLength ?? e.capabilities?.contextLength;
    if (typeof cl === "number" && Number.isFinite(cl) && cl > 0) {
      next.contextLength = Math.floor(cl);
    }
    cache.set(name, next);
    changed = true;
  }
  if (changed) {
    persistToSession();
    emitCacheChange();
  }
}

export function rememberModelCapability(modelId: string, caps: ModelCaps): void {
  ensureHydrated();
  const id = String(modelId || "").trim();
  if (!id) return;
  const prev = cache.get(id) || {};
  const next: ModelCaps = { ...prev, ...caps };
  if ("contextLength" in caps) {
    const cl = caps.contextLength;
    if (typeof cl === "number" && Number.isFinite(cl) && cl > 0) {
      next.contextLength = Math.floor(cl);
    } else {
      delete next.contextLength;
    }
  }
  cache.set(id, next);
  persistToSession();
  emitCacheChange();
}

export function getCachedModelCapability(modelId: string): ModelCaps | null {
  ensureHydrated();
  const id = String(modelId || "").trim();
  if (!id) return null;
  return cache.get(id) || null;
}

/** @returns 已知 contextLength，否则 null */
export function getCachedContextLength(modelId: string): number | null {
  const caps = getCachedModelCapability(modelId);
  const n = caps?.contextLength;
  return typeof n === "number" && Number.isFinite(n) && n >= 1024 ? Math.floor(n) : null;
}

export function clearModelCapabilityCache(): void {
  cache.clear();
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  emitCacheChange();
}
