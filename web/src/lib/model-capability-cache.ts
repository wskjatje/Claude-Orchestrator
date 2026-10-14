/** 前端能力缓存：由 Ollama modelDetails / models:capabilities 刷新，禁止按模型名猜 */

export type ModelCaps = { tools?: boolean; vision?: boolean };

const cache = new Map<string, ModelCaps>();

export function rememberModelCapabilities(
  entries: Array<{ name?: string; capabilities?: ModelCaps } | string>,
): void {
  for (const e of entries) {
    if (typeof e === "string") continue;
    const name = String(e?.name || "").trim();
    if (!name || !e.capabilities || typeof e.capabilities !== "object") continue;
    const prev = cache.get(name) || {};
    cache.set(name, { ...prev, ...e.capabilities });
  }
}

export function rememberModelCapability(modelId: string, caps: ModelCaps): void {
  const id = String(modelId || "").trim();
  if (!id) return;
  const prev = cache.get(id) || {};
  cache.set(id, { ...prev, ...caps });
}

export function getCachedModelCapability(modelId: string): ModelCaps | null {
  const id = String(modelId || "").trim();
  if (!id) return null;
  return cache.get(id) || null;
}

export function clearModelCapabilityCache(): void {
  cache.clear();
}
