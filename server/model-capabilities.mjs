/**
 * 模型能力注册表（真相源）：
 * - 本地：Ollama /api/tags + /api/show（capabilities 字段），禁止按模型名猜
 * - 云端：KNOWN 供应商声明的 capabilities + 用户显式覆盖
 * - 用户覆盖：chatSettings.modelCapabilityOverrides[modelId]
 */

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** @typedef {{ tools?: boolean, vision?: boolean }} ModelCaps */
/** @typedef {{ name: string, digest?: string, size?: number, contextLength?: number|null, capabilities: ModelCaps, source: 'ollama'|'cloud'|'override'|'unknown' }} ModelCapabilityRecord */

/** @type {Map<string, ModelCapabilityRecord>} */
const ollamaCache = new Map()

/** @type {string} */
let ollamaCacheBase = ''

/**
 * @param {unknown} raw
 * @returns {ModelCaps}
 */
export function parseOllamaCapabilitiesField(raw) {
  /** @type {ModelCaps} */
  const out = {}
  if (Array.isArray(raw)) {
    const lower = raw.map((x) => String(x || '').toLowerCase())
    if (lower.includes('tools')) out.tools = true
    if (lower.includes('vision') || lower.includes('image')) out.vision = true
    // 有 capabilities 数组但未含 tools/vision → 明确为 false（探测到了，不是未知）
    if (lower.length) {
      if (out.tools !== true) out.tools = false
      if (out.vision !== true) out.vision = false
    }
    return out
  }
  if (raw && typeof raw === 'object') {
    const o = /** @type {Record<string, unknown>} */ (raw)
    if (typeof o.tools === 'boolean') out.tools = o.tools
    if (typeof o.vision === 'boolean') out.vision = o.vision
  }
  return out
}

/**
 * @param {Record<string, unknown>} show
 * @returns {number|null}
 */
function contextLengthFromShow(show) {
  const info = show?.model_info
  if (info && typeof info === 'object') {
    for (const [k, v] of Object.entries(info)) {
      if (/context_length$/i.test(k) && typeof v === 'number' && v > 0) return v
    }
  }
  const params = String(show?.parameters || '')
  const m = params.match(/num_ctx\s+(\d+)/i)
  if (m) return Number(m[1]) || null
  return null
}

/**
 * @param {string} base
 * @param {string} name
 * @returns {Promise<ModelCapabilityRecord>}
 */
export async function fetchOllamaModelShow(base, name) {
  const root = String(base || 'http://127.0.0.1:11434').replace(/\/$/, '')
  const modelName = String(name || '').trim()
  const res = await fetch(`${root}/api/show`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Ollama /api/show HTTP ${res.status}: ${errText.slice(0, 200)}`)
  }
  const show = await res.json()
  const capabilities = parseOllamaCapabilitiesField(show?.capabilities)
  return {
    name: modelName,
    contextLength: contextLengthFromShow(show),
    capabilities,
    source: 'ollama',
  }
}

/**
 * @param {string} base
 * @param {{ refreshShow?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, models?: ModelCapabilityRecord[], names?: string[], error?: string }>}
 */
export async function listOllamaModelsWithCapabilities(base, opts = {}) {
  const root = String(base || 'http://127.0.0.1:11434').replace(/\/$/, '')
  try {
    const res = await fetch(`${root}/api/tags`, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = await res.json()
    const tags = Array.isArray(data?.models) ? data.models : []
    /** @type {ModelCapabilityRecord[]} */
    const models = []
    const refreshShow = opts.refreshShow !== false
    if (ollamaCacheBase !== root) {
      ollamaCache.clear()
      ollamaCacheBase = root
    }
    for (const t of tags) {
      const name = String(t?.name || '').trim()
      if (!name) continue
      const digest = String(t?.digest || '').trim() || undefined
      const size = typeof t?.size === 'number' ? t.size : undefined
      let rec = ollamaCache.get(name)
      if (refreshShow && (!rec || (digest && rec.digest !== digest))) {
        try {
          const shown = await fetchOllamaModelShow(root, name)
          rec = { ...shown, digest, size }
          ollamaCache.set(name, rec)
        } catch {
          rec = {
            name,
            digest,
            size,
            contextLength: null,
            capabilities: {},
            source: 'ollama',
          }
          ollamaCache.set(name, rec)
        }
      } else if (!rec) {
        rec = {
          name,
          digest,
          size,
          contextLength: null,
          capabilities: {},
          source: 'ollama',
        }
        ollamaCache.set(name, rec)
      }
      models.push(rec)
    }
    return {
      ok: true,
      models,
      names: models.map((m) => m.name),
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * @param {string} modelId
 * @returns {ModelCapabilityRecord|null}
 */
export function getCachedOllamaCapability(modelId) {
  const id = String(modelId || '').trim()
  if (!id) return null
  return ollamaCache.get(id) || null
}

/**
 * 供应商级默认能力（读自 cloud-providers KNOWN 表，非模型名启发式）
 * @param {string} providerName
 * @returns {ModelCaps}
 */
export function capabilitiesForCloudProvider(providerName) {
  try {
    const cp = require('./cloud-providers.cjs')
    if (typeof cp.getKnownProviderCapabilities === 'function') {
      return cp.getKnownProviderCapabilities(providerName)
    }
  } catch {
    /* CJS 不可用时的最小默认：无供应商名视为 Anthropic CLI 别名 */
  }
  const n = String(providerName || '').trim()
  if (!n) return { tools: true, vision: true }
  return { tools: true }
}

/**
 * @param {Record<string, unknown>|null|undefined} overrides
 * @param {string} modelId
 * @returns {ModelCaps}
 */
function overrideCaps(overrides, modelId) {
  const id = String(modelId || '').trim()
  if (!id || !overrides || typeof overrides !== 'object') return {}
  const raw = overrides[id]
  if (!raw || typeof raw !== 'object') return {}
  /** @type {ModelCaps} */
  const out = {}
  if (typeof raw.tools === 'boolean') out.tools = raw.tools
  if (typeof raw.vision === 'boolean') out.vision = raw.vision
  return out
}

/**
 * @param {{
 *   modelId: string
 *   pool: 'local' | 'cloud'
 *   settings?: Record<string, unknown>
 *   providerName?: string
 *   ollamaBase?: string
 * }} opts
 * @returns {Promise<ModelCapabilityRecord>}
 */
export async function resolveModelCapabilities(opts) {
  const modelId = String(opts.modelId || '').trim()
  const overrides = overrideCaps(
    /** @type {Record<string, unknown>} */ (opts.settings?.modelCapabilityOverrides),
    modelId,
  )
  if (opts.pool === 'local') {
    let base = getCachedOllamaCapability(modelId)
    if (!base) {
      const root = String(opts.ollamaBase || opts.settings?.ollamaBase || 'http://127.0.0.1:11434')
      try {
        base = await fetchOllamaModelShow(root, modelId)
        ollamaCache.set(modelId, { ...base, digest: base.digest })
      } catch {
        base = {
          name: modelId,
          capabilities: {},
          contextLength: null,
          source: 'unknown',
        }
      }
    }
    return {
      ...base,
      name: modelId,
      capabilities: { ...base.capabilities, ...overrides },
      source: Object.keys(overrides).length ? 'override' : base.source,
    }
  }
  const providerCaps = capabilitiesForCloudProvider(opts.providerName || '')
  return {
    name: modelId,
    capabilities: { ...providerCaps, ...overrides },
    contextLength: null,
    source: Object.keys(overrides).length ? 'override' : 'cloud',
  }
}

/**
 * @param {{
 *   modelId: string
 *   pool: 'local' | 'cloud'
 *   needsTools?: boolean
 *   needsVision?: boolean
 *   settings?: Record<string, unknown>
 *   providerName?: string
 *   ollamaBase?: string
 * }} opts
 * @returns {Promise<{ ok: true, record: ModelCapabilityRecord } | { ok: false, error: string, record?: ModelCapabilityRecord }>}
 */
export async function assertModelCanRun(opts) {
  const modelId = String(opts.modelId || '').trim()
  if (!modelId || modelId.toLowerCase() === 'auto') {
    return { ok: false, error: '未解析到具体模型，请先在聊天区选择模型。' }
  }
  const record = await resolveModelCapabilities(opts)
  const caps = record.capabilities || {}
  if (opts.needsTools) {
    if (caps.tools !== true) {
      return {
        ok: false,
        error: `模型「${modelId}」未声明 tools 能力（探测/供应商/覆盖均为未支持）。请换支持工具调用的模型，或改用不需读盘/写盘/命令的纯对话。`,
        record,
      }
    }
  }
  if (opts.needsVision) {
    if (caps.vision !== true) {
      return {
        ok: false,
        error: `模型「${modelId}」未声明 vision 能力。请换支持视觉的模型，或去掉附图。`,
        record,
      }
    }
  }
  return { ok: true, record }
}

/**
 * 兼容旧调用：models 可为 string[] 或详情数组
 * @param {unknown} models
 * @returns {string[]}
 */
export function normalizeOllamaModelNames(models) {
  if (!Array.isArray(models)) return []
  return models
    .map((m) => {
      if (typeof m === 'string') return m.trim()
      if (m && typeof m === 'object' && 'name' in m) return String(m.name || '').trim()
      return ''
    })
    .filter(Boolean)
}
