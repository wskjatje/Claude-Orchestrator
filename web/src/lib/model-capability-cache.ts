/** 前端能力缓存：由 Ollama modelDetails / models:capabilities 刷新，禁止按模型名猜。
 *  会话级持久化到 sessionStorage，避免刷新后冷启动误跑。
 */

export type ModelCaps = { tools?: boolean; vision?: boolean };

const STORAGE_KEY = "claudecode.modelCaps.v1";
const cache = new Map<string, ModelCaps>();

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
  entries: Array<{ name?: string; capabilities?: ModelCaps } | string>,
): void {
  ensureHydrated();
  let changed = false;
  for (const e of entries) {
    if (typeof e === "string") continue;
    const name = String(e?.name || "").trim();
    if (!name || !e.capabilities || typeof e.capabilities !== "object") continue;
    const prev = cache.get(name) || {};
    cache.set(name, { ...prev, ...e.capabilities });
    changed = true;
  }
  if (changed) persistToSession();
}

export function rememberModelCapability(modelId: string, caps: ModelCaps): void {
  ensureHydrated();
  const id = String(modelId || "").trim();
  if (!id) return;
  const prev = cache.get(id) || {};
  cache.set(id, { ...prev, ...caps });
  persistToSession();
}

export function getCachedModelCapability(modelId: string): ModelCaps | null {
  ensureHydrated();
  const id = String(modelId || "").trim();
  if (!id) return null;
  return cache.get(id) || null;
}

export function clearModelCapabilityCache(): void {
  cache.clear();
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* */
    }
  }
}
