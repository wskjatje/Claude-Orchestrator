/**
 * 模型能力注册表（真相源）：
 * - 本地：Ollama /api/tags + /api/show（capabilities 字段），禁止按模型名猜
 * - 云端：KNOWN 供应商声明的 capabilities + 用户显式覆盖
 * - 用户覆盖：chatSettings.modelCapabilityOverrides[modelId]
 */

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** @typedef {{ tools?: boolean, vision?: boolean, contextLength?: number|null }} ModelCaps */
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
 * 从 Ollama /api/show 解析上下文窗口（多路兜底，禁止按模型名猜）。
 * @param {Record<string, unknown>} show
 * @returns {number|null}
 */
function contextLengthFromShow(show) {
  const info = show?.model_info
  if (info && typeof info === 'object') {
    for (const [k, v] of Object.entries(info)) {
      if (/context_length$/i.test(k) && typeof v === 'number' && v > 0) return Math.floor(v)
    }
  }
  // parameters 可能是字符串（"num_ctx 8192"）或对象
  const paramsRaw = show?.parameters
  if (typeof paramsRaw === 'string') {
    const m = paramsRaw.match(/num_ctx\s+(\d+)/i)
    if (m) return Number(m[1]) || null
  } else if (paramsRaw && typeof paramsRaw === 'object' && !Array.isArray(paramsRaw)) {
    const n = Number(/** @type {Record<string, unknown>} */ (paramsRaw).num_ctx)
    if (Number.isFinite(n) && n >= 1024) return Math.floor(n)
  }
  // Modelfile：PARAMETER num_ctx 8192
  const modelfile = String(show?.modelfile || '')
  if (modelfile) {
    const m2 = modelfile.match(/PARAMETER\s+num_ctx\s+(\d+)/i)
    if (m2) return Number(m2[1]) || null
  }
  return null
}

/** @param {number|null|undefined} n */
function saneContextLength(n) {
  const v = Number(n)
  return Number.isFinite(v) && v >= 1024 ? Math.floor(v) : null
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
  const cl = Number(raw.contextLength)
  if (Number.isFinite(cl) && cl >= 1024) out.contextLength = Math.floor(cl)
  return out
}

/**
 * @param {string} providerName
 * @returns {number|null}
 */
function providerDefaultContextLength(providerName) {
  try {
    const cp = require('./cloud-providers.cjs')
    if (typeof cp.getKnownProviderContextLength === 'function') {
      return cp.getKnownProviderContextLength(providerName)
    }
  } catch {
    /* ignore */
  }
  return null
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
    // 缓存有记录但缺窗口时再 show 一次（modelfile / num_ctx 兜底）
    if (base && !saneContextLength(base.contextLength)) {
      const root = String(opts.ollamaBase || opts.settings?.ollamaBase || 'http://127.0.0.1:11434')
      try {
        const shown = await fetchOllamaModelShow(root, modelId)
        if (saneContextLength(shown.contextLength)) {
          base = { ...base, ...shown, digest: base.digest || shown.digest }
          ollamaCache.set(modelId, base)
        }
      } catch {
        /* 保持原记录 */
      }
    }
    const fromOverride = saneContextLength(overrides.contextLength)
    const contextLength = fromOverride ?? saneContextLength(base.contextLength)
    return {
      ...base,
      name: modelId,
      capabilities: { ...base.capabilities, ...overrides },
      contextLength,
      source: Object.keys(overrides).length ? 'override' : base.source,
    }
  }
  const providerCaps = capabilitiesForCloudProvider(opts.providerName || '')
  const caps = { ...providerCaps, ...overrides }
  const fromOverride =
    typeof overrides.contextLength === 'number' && overrides.contextLength >= 1024
      ? overrides.contextLength
      : null
  const fromProvider = providerDefaultContextLength(opts.providerName || '')
  // 空供应商名（Claude Code 别名等）按 Anthropic 默认窗，避免占用条长期「估算窗口」
  const fromAnthropicFallback =
    !opts.providerName || !String(opts.providerName).trim()
      ? providerDefaultContextLength('Anthropic')
      : null
  const contextLength = fromOverride ?? fromProvider ?? fromAnthropicFallback ?? null
  return {
    name: modelId,
    capabilities: caps,
    contextLength,
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
