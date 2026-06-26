'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const dns = require('node:dns')
const https = require('node:https')
const http = require('node:http')
const projectDb = require('./project-db.cjs')
const { PROJECT_DATA_DIR, PROJECT_DB_PATH } = require('./paths.mjs')

const PROVIDERS_KV = 'cloud_providers'

/** @type {() => import('better-sqlite3').Database} */
let getDb = null

function attachDb(fn) {
  getDb = fn
}

function defaultStore() {
  return { version: 1, currentProviderId: '', providers: {}, ccSwitchMigrated: false }
}

function loadStore() {
  if (!getDb) return defaultStore()
  return projectDb.loadKv(getDb(), PROVIDERS_KV, defaultStore())
}

function saveStore(store) {
  if (!getDb) return
  projectDb.saveKv(getDb(), PROVIDERS_KV, store)
}

function slugifyProviderId(name) {
  const s = String(name || 'provider')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return s ? `${s}-claude` : `custom-claude-${Date.now()}`
}

function maskApiKey(key) {
  const k = String(key || '').trim()
  if (!k) return ''
  if (k.length <= 8) return '••••'
  return `${k.slice(0, 4)}…${k.slice(-4)}`
}

function normalizeAnthropicBaseUrl(base) {
  let b = String(base || '').trim().replace(/\/+$/, '')
  if (!b) return b
  if (/^https:\/\/api\.deepseek\.com$/i.test(b)) return `${b}/anthropic`
  if (/^https:\/\/api\.deepseek\.com\/v1$/i.test(b)) return 'https://api.deepseek.com/anthropic'
  return b
}

function normalizeProviderEnv(env) {
  if (!env || typeof env !== 'object') return env || {}
  const next = { ...env }
  if (next.ANTHROPIC_BASE_URL) {
    next.ANTHROPIC_BASE_URL = normalizeAnthropicBaseUrl(next.ANTHROPIC_BASE_URL)
  }
  return next
}

function normalizeCloudModelId(model) {
  const m = String(model || '').trim()
  if (!m) return m
  if (/^deepseek-chat$/i.test(m)) return 'deepseek-v4-flash'
  if (/^deepseek-reasoner$/i.test(m)) return 'deepseek-v4-pro'
  if (/^deepseek-v4-flash$/i.test(m)) return 'deepseek-v4-flash'
  if (/^deepseek-v4-pro$/i.test(m)) return 'deepseek-v4-pro'
  // Gemini 显示名 → API 模型 ID：去掉前缀、转小写、空格变中划线
  if (/^gemini\s/i.test(m)) {
    return m.replace(/^gemini\s+/i, '').trim().toLowerCase().replace(/\s+/g, '-')
  }
  return m
}

function mapDeepSeekModelForClaude(model) {
  return normalizeCloudModelId(model)
}

/**
 * 已知云模型供应商 market 列表（本地 Ollama 模型不在此列）。
 * 所有供应商通过直接 API 调用（OpenAI-compatible 或原生 API）。
 * directApi: true 表示可直接通过 OpenAI-compatible API 访问。
 * directApiBase: 该供应商的默认 API 端点地址。
 */
const KNOWN_CLOUD_PROVIDERS = [
  { name: 'Anthropic', needsCcr: false, defaultPricing: { inputPer1M: 3, outputPer1M: 15 } },
  { name: 'DeepSeek', needsCcr: false, directApi: true, directApiBase: 'https://api.deepseek.com/v1', fetchModelsStrategy: 'openai-compatible', fetchModelsPath: '/v1/models', defaultPricing: { inputPer1M: 0.27, outputPer1M: 1.1 } },
  { name: 'OpenAI', needsCcr: false, directApi: true, directApiBase: 'https://api.openai.com/v1', fetchModelsStrategy: 'openai-compatible', defaultPricing: { inputPer1M: 2.5, outputPer1M: 10 } },
  { name: 'Google Gemini', needsCcr: false, directApi: true, directApiBase: 'https://generativelanguage.googleapis.com/v1beta/models/', fetchModelsStrategy: 'gemini', defaultPricing: { inputPer1M: 0.15, outputPer1M: 0.6 } },
  { name: 'Groq', needsCcr: false, directApi: true, directApiBase: 'https://api.groq.com/openai/v1', fetchModelsStrategy: 'openai-compatible', defaultPricing: { inputPer1M: 0.2, outputPer1M: 0.6 } },
  { name: 'Mistral', needsCcr: false, directApi: true, directApiBase: 'https://api.mistral.ai/v1', fetchModelsStrategy: 'openai-compatible', defaultPricing: { inputPer1M: 0.5, outputPer1M: 1.5 } },
  { name: 'xAI (Grok)', needsCcr: false, directApi: true, directApiBase: 'https://api.x.ai/v1', fetchModelsStrategy: 'openai-compatible', defaultPricing: { inputPer1M: 2, outputPer1M: 8 } },
  { name: 'Cohere', needsCcr: false, directApi: true, directApiBase: 'https://api.cohere.com/v1', fetchModelsStrategy: 'openai-compatible', defaultPricing: { inputPer1M: 0.5, outputPer1M: 1.5 } },
  { name: 'Together AI', needsCcr: false, directApi: true, directApiBase: 'https://api.together.xyz/v1', fetchModelsStrategy: 'openai-compatible', defaultPricing: { inputPer1M: 0.5, outputPer1M: 1.5 } },
  { name: 'Perplexity', needsCcr: false, directApi: true, directApiBase: 'https://api.perplexity.ai', fetchModelsStrategy: 'openai-compatible', defaultPricing: { inputPer1M: 1, outputPer1M: 5 } },
  { name: 'Fireworks AI', needsCcr: false, directApi: true, directApiBase: 'https://api.fireworks.ai/v1', fetchModelsStrategy: 'openai-compatible', defaultPricing: { inputPer1M: 0.2, outputPer1M: 0.6 } },
  { name: 'Replicate', needsCcr: false, directApi: true },
  { name: 'Anyscale', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: 'OctoAI', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: 'AI21 Labs', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: 'Voyage AI', needsCcr: false, directApi: true },
  { name: 'Baidu (文心)', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: 'Alibaba (通义)', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: 'Zhipu (智谱)', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: 'Moonshot (月之暗面)', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: 'MiniMax', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: '01.AI (零一万物)', needsCcr: false, directApi: true, fetchModelsStrategy: 'openai-compatible' },
  { name: 'Amazon Bedrock', needsCcr: false, directApi: true },
  { name: 'Azure OpenAI', needsCcr: false, directApi: true },
]

/**
 * 返回完整已知供应商列表。
 */
function listKnownProviders(_currentProviderId) {
  const seen = new Set()
  return KNOWN_CLOUD_PROVIDERS.filter((p) => {
    if (seen.has(p.name)) return false
    seen.add(p.name)
    return true
  }).map(({ name, needsCcr, directApi, directApiBase, defaultPricing, fetchModelsStrategy }) => ({
    name,
    needsCcr,
    ...(directApi && directApiBase ? { defaultEndpoint: directApiBase } : {}),
    ...(defaultPricing ? { defaultInputPrice: defaultPricing.inputPer1M, defaultOutputPrice: defaultPricing.outputPer1M } : {}),
    ...(fetchModelsStrategy ? { canFetchModels: true } : {}),
  }))
}

/**
 * 判断供应商是否需要 ccr 协议翻译（已废弃，始终返回 false）。
 */
function providerNeedsCcrProxy() {
  return { needsCcr: false, ccrEndpoint: '', reason: '' }
}

/**
 * 从所有已存储的供应商构建完整的 tokenPricing 表。
 * 每个模型的单价 = 供应商存储的 inputPrice/outputPrice。
 * 结果可直接存入 settings.tokenPricing 供 estimateUsageCostUsd 使用。
 */
function buildTokenPricingFromProviders(providers) {
  const pricing = {}
  const list = Array.isArray(providers) ? providers : Object.values(loadStore().providers || {})
  for (const p of list) {
    if (!Array.isArray(p.models)) continue
    const inputPer1M = Number(p.inputPrice) || 0
    const outputPer1M = Number(p.outputPrice) || 0
    if (inputPer1M <= 0 && outputPer1M <= 0) continue
    for (const m of p.models) {
      if (m) pricing[m] = { inputPer1M, outputPer1M }
    }
  }
  return pricing
}

/**
 * 判断供应商是否支持直接 OpenAI-compatible API 调用。
 */
function supportsDirectApi(providerName) {
  const n = String(providerName || '').trim()
  if (!n) return { direct: false, apiBase: '' }
  const known = KNOWN_CLOUD_PROVIDERS.find((p) => p.name === n)
  if (known && known.directApi) {
    return { direct: true, apiBase: known.directApiBase || '' }
  }
  // 当供应商名称不在已知列表但 endpoint 指向 OpenAI 兼容端点时，
  // 允许通过供应商存储的 endpoint 直接调用（由调用方传入）
  return { direct: false, apiBase: '' }
}

/**
 * 当 providerName 不可用时，用模型名尝试匹配已知 directApi 供应商。
 */
function inferDirectApiFromModel(modelName) {
  const m = String(modelName || '').toLowerCase()
  for (const p of KNOWN_CLOUD_PROVIDERS) {
    if (!p.directApi || !p.directApiBase) continue
    const pn = p.name.toLowerCase()
    // 模型名包含供应商名（或其核心词），如 "gemini-3-flash-live" 包含 "gemini"
    if (m.includes(pn) || pn.split(/[\s(]/).some(part => part.length > 2 && m.includes(part))) {
      return { direct: true, apiBase: p.directApiBase, providerName: p.name }
    }
  }
  // 二次启发：模型名不含已知供应商词，但符合 Gemini 命名模式
  if (/gemini/i.test(m) || (/^\d[\w.-]*/.test(m) && /(flash|live|exp|pro|thinking|vision|ultra)/i.test(m))) {
    const gemini = KNOWN_CLOUD_PROVIDERS.find(p => p.name === 'Google Gemini')
    if (gemini && gemini.directApi && gemini.directApiBase) {
      return { direct: true, apiBase: gemini.directApiBase, providerName: gemini.name }
    }
  }
  return { direct: false, apiBase: '', providerName: '' }
}

/**
 * 自动从供应商 API 获取可用模型列表。
 * 获取策略由 KNOWN_CLOUD_PROVIDERS 中的 fetchModelsStrategy 声明：
 *   'openai-compatible' — GET {base}/models → data[].id
 *   'gemini'            — GET /v1beta/models?key= → models[].name（过滤 generateContent 方法）
 *   未声明 / 自定义供应商 — 按端点特征启发式推断，默认为 openai-compatible。
 * 返回 { ok, models, provider, defaultInputPrice, defaultOutputPrice }。
 */
async function fetchProviderModels({ providerName, endpoint, apiKey, timeoutMs = 15_000 } = {}) {
  if (!providerName) return { ok: false, error: '供应商名称不能为空', models: [] }

  // 未传 API Key 时尝试从已存储的供应商中查找
  let resolvedKey = String(apiKey || '').trim()
  if (!resolvedKey) {
    const store = loadStore()
    const providers = listProviderRecords(store)
    for (const { rec } of providers) {
      if (rec.name === providerName) {
        resolvedKey = String(rec.apiKey || '').trim()
        break
      }
    }
  }
  if (!resolvedKey) return { ok: false, error: 'API Key 不能为空（已保存的供应商中未找到该名称）', models: [] }

  // 查找获取策略
  const known = KNOWN_CLOUD_PROVIDERS.find((p) => p.name === providerName)
  let strategy = known?.fetchModelsStrategy || ''
  const base = String(endpoint || '').trim().replace(/\/+$/, '')

  // 未声明策略时按端点启发式推断
  if (!strategy) {
    if (/generativelanguage\.googleapis/i.test(base) || /gemini/i.test(providerName)) {
      strategy = 'gemini'
    } else {
      strategy = 'openai-compatible' // 绝大多数直接 API 供应商兼容
    }
  }

  const knownPricing = known?.defaultPricing
  const defaultInputPrice = knownPricing?.inputPer1M || 0
  const defaultOutputPrice = knownPricing?.outputPer1M || 0

  try {
    let models = []

    if (strategy === 'gemini') {
      const cleanBase = base
        .replace(/\/?models\/?$/i, '')
        .replace(/\/v1beta\/?/i, '/v1beta')
        .replace(/\/+$/, '')
      const apiBase = cleanBase || 'https://generativelanguage.googleapis.com/v1beta'
      const url = `${apiBase}/models?key=${encodeURIComponent(resolvedKey)}`
      const { status, data } = await httpGetJson(url, timeoutMs)
      if (status !== 200) return { ok: false, error: `Gemini API 返回 ${status}`, models: [] }
      const rawModels = Array.isArray(data?.models) ? data.models : []
      models = rawModels
        .filter((m) => {
          const methods = m.supportedGenerationMethods || m.supportedMethods || []
          return Array.isArray(methods) && methods.some((s) => /generateContent/i.test(s))
        })
        .map((m) => String(m.name || '').replace(/^models\//, '').trim())
        .filter(Boolean)
    } else {
      // openai-compatible
      const modelsPath = known?.fetchModelsPath
      let url
      if (modelsPath) {
        // 有显式 fetchModelsPath 时，用 base 的 origin 拼接（防止 path 段重复）
        let originBase = base || ''
        if (!originBase) originBase = known?.directApiBase || 'https://api.openai.com'
        try {
          const parsed = new URL(originBase)
          originBase = parsed.origin
        } catch {
          originBase = 'https://api.openai.com'
        }
        url = `${originBase}${modelsPath}`
      } else {
        // 默认：{base}/models
        const apiBase = base || 'https://api.openai.com/v1'
        url = `${apiBase.replace(/\/+$/, '')}/models`
      }
      const { status, data } = await httpGetJson(url, timeoutMs, { Authorization: `Bearer ${resolvedKey}` })
      if (status !== 200) return { ok: false, error: `API 返回 ${status}`, models: [] }
      const rawModels = Array.isArray(data?.data) ? data.data : []
      models = rawModels
        .map((m) => String(m.id || '').trim())
        .filter(Boolean)
    }

    return { ok: true, models, provider: providerName, defaultInputPrice, defaultOutputPrice }
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 200), models: [] }
  }
}

/**
 * 用公共 DNS 解析域名，绕过本地代理/VPN 对 DNS 的劫持。
 */
function resolveHostnameSimple(hostname) {
  const dnsServers = [
    ['8.8.8.8', '1.1.1.1'],
    ['1.1.1.1', '8.8.4.4'],
    ['208.67.222.222', '208.67.220.220'],
  ]
  const tryResolve = (servers) => new Promise((resolve) => {
    let resolver
    try {
      resolver = new dns.Resolver({ timeout: 3000, tries: 1 })
      resolver.setServers(servers)
    } catch { resolve(''); return }
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !Array.isArray(addresses) || !addresses.length) { resolve(''); return }
      const ip = addresses[0]
      resolve(ip === '127.0.0.1' || ip === '0.0.0.0' || ip.startsWith('192.168.') ? '' : ip)
    })
  })

  return (async () => {
    for (const servers of dnsServers) {
      const ip = await tryResolve(servers)
      if (ip) return ip
    }
    try {
      const addresses = await dns.promises.resolve4(hostname)
      const ip = Array.isArray(addresses) && addresses.length ? addresses[0] : ''
      return (ip && ip !== '127.0.0.1' && ip !== '0.0.0.0' && !ip.startsWith('192.168.')) ? ip : ''
    } catch {
      return ''
    }
  })()
}

/**
 * 轻量 GET 请求，返回 { status, data }。data 为解析后的 JSON 对象。
 * 会尝试绕过本地代理/VPN 的 DNS 劫持。
 */
function httpGetJson(url, timeoutMs, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://')
    const lib = isHttps ? https : http
    const parsed = new URL(url)
    const hostname = parsed.hostname

    // 先解析 DNS，避免被本地代理劫持
    resolveHostnameSimple(hostname).then((realIp) => {
      const opts = {
        hostname: realIp || hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: { Accept: 'application/json', ...headers, Host: hostname },
        timeout: timeoutMs,
        servername: hostname,
      }
      const req = lib.request(opts, (res) => {
        let buf = ''
        res.on('data', (chunk) => { buf += chunk.toString() })
        res.on('end', () => {
          try {
            const data = JSON.parse(buf)
            resolve({ status: res.statusCode, data })
          } catch {
            resolve({ status: res.statusCode, data: null })
          }
        })
      })
      req.on('error', (e) => reject(e))
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')) })
      req.end()
    }).catch((e) => reject(e))
  })
}

/**
 * 将当前选中供应商的 apiKey 同步到 ccr 配置文件（已废弃）。
 */
function syncCcrConfigForProvider() {
  return { syncOk: false }
}
function buildProviderEnv(input) {
  const endpoint = String(input.endpoint || '').trim().replace(/\/$/, '')
  const apiKey = String(input.apiKey || '').trim()
  const sonnet = String(input.sonnetModel || input.model || input.defaultModel || '').trim()
  const haiku = String(input.haikuModel || sonnet).trim()
  const opus = String(input.opusModel || sonnet).trim()
  if (!endpoint) throw new Error('API 端点不能为空')
  if (!sonnet) throw new Error('默认模型不能为空')
  const env = normalizeProviderEnv({
    ANTHROPIC_API_KEY: apiKey,
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: endpoint,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: haiku,
    ANTHROPIC_DEFAULT_SONNET_MODEL: sonnet,
    ANTHROPIC_DEFAULT_OPUS_MODEL: opus,
    CLAUDE_CODE_DISABLE_1M_CONTEXT: '1',
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: '8192',
    LANG: 'zh_CN.UTF-8',
    LC_ALL: 'zh_CN.UTF-8',
  })
  return { env, sonnet, haiku, opus }
}

function providerToSummary(id, rec, isCurrent) {
  if (!rec) return null
  return {
    id,
    name: rec.name,
    isCurrent: Boolean(isCurrent),
    category: 'third_party',
    websiteUrl: rec.websiteUrl || '',
    notes: rec.notes || '项目内配置',
    baseUrl: normalizeAnthropicBaseUrl(rec.endpoint || ''),
    models: [...(rec.models || [])],
    hasApiKey: Boolean(String(rec.apiKey || '').trim()),
    apiKeyPreview: maskApiKey(rec.apiKey),
    inputPrice: Number(rec.inputPrice) || 0,
    outputPrice: Number(rec.outputPrice) || 0,
  }
}

function listProviderRecords(store) {
  return Object.entries(store.providers || {}).map(([id, rec]) => ({
    id,
    rec,
    isCurrent: store.currentProviderId === id,
  }))
}

function normalizeStoreModelIds() {
  const store = loadStore()
  let changed = false
  for (const rec of Object.values(store.providers || {})) {
    const next = [...new Set((rec.models || []).map((m) => normalizeCloudModelId(m)).filter(Boolean))]
    if (JSON.stringify(next) !== JSON.stringify(rec.models || [])) {
      rec.models = next
      changed = true
    }
  }
  if (changed) saveStore(store)
  return changed
}

function listProviders() {
  migrateFromCcSwitchIfEmpty()
  normalizeStoreModelIds()
  const store = loadStore()
  return listProviderRecords(store)
    .map(({ id, rec, isCurrent }) => providerToSummary(id, rec, isCurrent))
    .filter(Boolean)
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || a.name.localeCompare(b.name, 'zh-CN'))
}

function findProviderForModel(modelId, store = loadStore()) {
  const model = normalizeCloudModelId(String(modelId || '').trim())
  const rows = listProviderRecords(store)
  if (!rows.length) return null

  const modelInList = (rec, id) => {
    const list = rec.models || []
    if (list.includes(model) || list.includes(String(modelId || '').trim())) return true
    return list.some((m) => normalizeCloudModelId(m) === model)
  }

  if (/^(sonnet|opus|haiku)$/i.test(model)) {
    return rows.find((r) => r.isCurrent) || rows[0]
  }

  const matches = rows.filter(({ rec }) => modelInList(rec))
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    return matches.find((r) => r.isCurrent) || matches[0]
  }
  return rows.find((r) => r.isCurrent) || null
}

function readGlobalClaudeEnvFromDisk() {
  try {
    const cs = path.join(os.homedir(), '.claude', 'settings.json')
    const data = JSON.parse(fs.readFileSync(cs, 'utf8'))
    return data?.env && typeof data.env === 'object' ? data.env : {}
  } catch {
    return {}
  }
}

function writeClaudeSettingsFromEnv(env, language = 'chinese') {
  const cs = path.join(os.homedir(), '.claude', 'settings.json')
  let globalCfg = {}
  if (fs.existsSync(cs)) {
    try {
      globalCfg = JSON.parse(fs.readFileSync(cs, 'utf8'))
    } catch {
      globalCfg = {}
    }
  }
  globalCfg.language = language
  globalCfg.env = normalizeProviderEnv(env)
  if (!globalCfg.$schema) {
    globalCfg.$schema = 'https://json.schemastore.org/claude-code-settings.json'
  }
  fs.mkdirSync(path.dirname(cs), { recursive: true })
  fs.writeFileSync(cs, JSON.stringify(globalCfg, null, 2) + '\n', 'utf8')
}

function upsertProvider(input) {
  migrateFromCcSwitchIfEmpty()
  const name = String(input.name || '').trim()
  if (!name) throw new Error('供应商名称不能为空')

  let id = String(input.id || input.providerId || '').trim()
  if (!id) id = slugifyProviderId(name)

  const store = loadStore()
  const existing = store.providers[id]
  let apiKey = String(input.apiKey || '').trim()
  if (!apiKey && existing) apiKey = String(existing.apiKey || '').trim()
  if (!apiKey) throw new Error('API Key 不能为空（更新时可留空以保留原 Key）')

  const extraModels = Array.isArray(input.extraModels)
    ? input.extraModels.map((m) => String(m || '').trim()).filter(Boolean)
    : String(input.extraModels || '')
        .split(/[,，\n]/)
        .map((m) => m.trim())
        .filter(Boolean)

  const { sonnet } = buildProviderEnv({
    ...input,
    apiKey,
    endpoint: input.endpoint || existing?.endpoint,
    model: input.defaultModel || input.model || input.sonnetModel || existing?.models?.[0],
  })

  const models = [
    ...new Set([sonnet, ...extraModels].map((m) => normalizeCloudModelId(m)).filter(Boolean)),
  ]
  const now = Date.now()
  // 取用户自定义单价（允许覆盖默认）或从已知供应商取默认
  const knownDefault = KNOWN_CLOUD_PROVIDERS.find((p) => p.name === name)?.defaultPricing || {}
  const inputPrice = Number(input.inputPrice ?? input.inputPer1M ?? knownDefault.inputPer1M ?? 0)
  const outputPrice = Number(input.outputPrice ?? input.outputPer1M ?? knownDefault.outputPer1M ?? 0)
  store.providers[id] = {
    id,
    name,
    endpoint: String(input.endpoint || existing?.endpoint || '').trim(),
    apiKey,
    models,
    inputPrice,
    outputPrice,
    websiteUrl: String(input.homepage || input.websiteUrl || existing?.websiteUrl || '').trim(),
    notes: String(input.notes || '项目内配置').trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  if (input.setAsCurrent || input.setCurrent) {
    store.currentProviderId = id
    const { env } = buildProviderEnv({ ...store.providers[id], apiKey, model: sonnet })
    writeClaudeSettingsFromEnv(env)
  }

  saveStore(store)
  const summary = providerToSummary(id, store.providers[id], store.currentProviderId === id)
  return { ok: true, providerId: id, provider: summary }
}

function deleteProvider(providerId) {
  const id = String(providerId || '').trim()
  if (!id) throw new Error('providerId 不能为空')
  const store = loadStore()
  if (!store.providers[id]) throw new Error(`未找到供应商：${id}`)
  const wasCurrent = store.currentProviderId === id
  delete store.providers[id]

  if (wasCurrent) {
    const remaining = Object.keys(store.providers || {})
    if (remaining.length) {
      store.currentProviderId = remaining[0]
      const rec = store.providers[remaining[0]]
      const model = rec?.models?.[0] || 'sonnet'
      const { env } = buildProviderEnv({ ...rec, model })
      writeClaudeSettingsFromEnv(env)
    } else {
      store.currentProviderId = ''
    }
  }

  saveStore(store)
  return {
    ok: true,
    providerId: id,
    switchedTo: wasCurrent ? store.currentProviderId || '' : undefined,
  }
}

function setCurrentProvider(providerId, preferredModel) {
  const id = String(providerId || '').trim()
  if (!id) throw new Error('providerId 不能为空')
  const store = loadStore()
  const rec = store.providers[id]
  if (!rec) throw new Error(`未找到供应商：${id}`)

  const model = String(preferredModel || rec.models?.[0] || '').trim()
  if (model && !(rec.models || []).includes(model)) {
    rec.models = [...new Set([model, ...(rec.models || [])])]
  }

  store.currentProviderId = id
  const { env } = buildProviderEnv({ ...rec, model: model || rec.models?.[0] })
  writeClaudeSettingsFromEnv(env)
  saveStore(store)

  return {
    ok: true,
    providerId: id,
    model: model || rec.models?.[0] || 'sonnet',
  }
}

function resolveEnvForModel(modelId) {
  const globalEnv = readGlobalClaudeEnvFromDisk()
  const model = String(modelId || '').trim()
  const store = loadStore()
  const hit = findProviderForModel(model, store)
  if (!hit) {
    return { env: globalEnv, providerId: '', providerName: '', model }
  }

  const rec = hit.rec
  const pickModel =
    model && (rec.models || []).includes(model)
      ? model
      : /^(sonnet|opus|haiku)$/i.test(model)
        ? rec.models?.[0] || model
        : rec.models?.[0] || model

  const { env } = buildProviderEnv({ ...rec, model: pickModel })
  return {
    env,
    providerId: hit.id,
    providerName: rec.name,
    model: pickModel,
    models: rec.models || [],
  }
}

function isLocalOllamaProvider(provider) {
  const url = String(provider?.baseUrl || '').toLowerCase()
  const id = String(provider?.id || '').toLowerCase()
  return id.includes('ollama') || /11434|localhost|127\.0\.0\.1/.test(url)
}

async function fetchOllamaModelTags(ollamaBase) {
  const base = String(ollamaBase || 'http://127.0.0.1:11434').replace(/\/$/, '')
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.models || []).map((m) => String(m.name || '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

function isLocalOllamaModel(modelId, ollamaTags) {
  const m = String(modelId || '').trim()
  if (!m) return false
  const tags = Array.isArray(ollamaTags) ? ollamaTags : []
  if (tags.includes(m)) return true
  const mBase = m.includes(':') ? m.split(':')[0] : m
  for (const tag of tags) {
    const tagBase = tag.includes(':') ? tag.split(':')[0] : tag
    if (mBase === tagBase) return true
  }
  return false
}

async function filterCloudModelList(models, settings = {}) {
  const ollamaTags = await fetchOllamaModelTags(settings.ollamaBase)
  const localHint = String(settings.localOllamaModel || '').trim()
  const list = Array.isArray(models) ? models : []
  return list.filter((modelId) => {
    const m = String(modelId || '').trim()
    if (!m || m === '#') return false
    if (localHint && m === localHint) return false
    return !isLocalOllamaModel(m, ollamaTags)
  })
}

async function fetchGatewayModels(baseUrl, apiKey) {
  const base = String(baseUrl || '').trim().replace(/\/$/, '')
  const key = String(apiKey || '').trim()
  if (!base || !key) return []
  const urls = [`${base}/v1/models`, `${base}/models`]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${key}`,
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : []
      const names = items.map((item) => String(item?.id || item?.name || '').trim()).filter(Boolean)
      if (names.length) return names
    } catch {
      /* try next */
    }
  }
  return []
}

async function collectCloudModelPool({ aliases = [], settings = {}, fetchRemote = true } = {}) {
  const ollamaTags = await fetchOllamaModelTags(settings.ollamaBase)
  const allowCloud = (modelId) => {
    const m = String(modelId || '').trim()
    if (!m || m === '#') return false
    const localHint = String(settings.localOllamaModel || '').trim()
    if (localHint && m === localHint) return false
    return !isLocalOllamaModel(m, ollamaTags)
  }

  const models = new Set(aliases.filter(Boolean))
  const providers = listProviders()
  for (const p of providers) {
    if (isLocalOllamaProvider(p)) continue
    for (const m of p.models || []) {
      if (allowCloud(m)) models.add(m)
    }
  }

  const curModel = String(settings.model || '').trim()
  if (curModel && allowCloud(curModel)) models.add(curModel)

  let remoteModels = []
  if (fetchRemote) {
    const current = providers.find((p) => p.isCurrent) || providers[0]
    if (current && !isLocalOllamaProvider(current) && current.baseUrl && current.hasApiKey) {
      const store = loadStore()
      const rec = store.providers[current.id]
      if (rec?.apiKey) {
        remoteModels = await fetchGatewayModels(current.baseUrl, rec.apiKey)
        for (const m of remoteModels) {
          if (allowCloud(m)) models.add(m)
        }
      }
    }
  }

  return {
    models: [...models].filter((m) => m && m !== '#'),
    providers,
    remoteModels,
    providerError: null,
  }
}

async function syncProvidersToWorkbench({ loadChatSettings, saveChatSettings, loadChatSessions, saveChatSessions }) {
  const store = loadStore()
  const id = store.currentProviderId
  const rec = id ? store.providers[id] : null
  if (!rec) throw new Error('请先在「设置 → 模型与连接」添加并启用云模型供应商')

  const { env, sonnet } = buildProviderEnv({ ...rec, model: rec.models?.[0] })
  writeClaudeSettingsFromEnv(env)

  const cur = loadChatSettings()
  const rawPool = listProviders().flatMap((p) => p.models || [])
  const pool = await filterCloudModelList(rawPool, cur)
  const nextSettings = {
    ...cur,
    model: String(sonnet).trim() || cur.model,
    cloudModelCatalog: await filterCloudModelList(
      pool,
      cur,
    ),
  }
  saveChatSettings(nextSettings)

  if (loadChatSessions && saveChatSessions) {
    try {
      const sess = loadChatSessions()
      let changed = false
      for (const s of sess.sessions || []) {
        if (s && s.modelId !== nextSettings.model) {
          s.modelId = nextSettings.model
          changed = true
        }
      }
      if (changed) saveChatSessions(sess)
    } catch {
      /* ignore */
    }
  }

  return {
    ok: true,
    providerId: id,
    providerName: rec.name,
    model: nextSettings.model,
    baseUrl: env.ANTHROPIC_BASE_URL || rec.endpoint,
    modelCount: pool.length,
  }
}

function providersConfigured() {
  const store = loadStore()
  return Object.keys(store.providers || {}).length > 0
}

/** 一次性从 CC Switch 导入（若项目尚无供应商） */
function migrateFromCcSwitchIfEmpty() {
  const store = loadStore()
  if (store.ccSwitchMigrated) return false
  if (Object.keys(store.providers || {}).length > 0) {
    store.ccSwitchMigrated = true
    saveStore(store)
    return false
  }

  const ccDb = path.join(os.homedir(), '.cc-switch', 'cc-switch.db')
  if (!fs.existsSync(ccDb)) return false

  try {
    const CAD_SQLITE = path.join(__dirname, 'vendor/cad/node_modules/better-sqlite3')
    const Database = require(CAD_SQLITE)
    const db = new Database(ccDb, { readonly: true })
    try {
      const rows = db
        .prepare(
          "SELECT * FROM providers WHERE app_type='claude' ORDER BY is_current DESC, sort_index ASC, name ASC",
        )
        .all()
      if (!rows.length) return false

      for (const row of rows) {
        let cfg = {}
        try {
          cfg = JSON.parse(row.settings_config || '{}')
        } catch {
          cfg = {}
        }
        const env = cfg.env || {}
        const apiKey = String(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || '').trim()
        if (!apiKey) continue
        const endpoint = String(env.ANTHROPIC_BASE_URL || '').trim()
        const sonnet = String(env.ANTHROPIC_DEFAULT_SONNET_MODEL || '').trim()
        let extra = []
        try {
          const meta = JSON.parse(row.meta || '{}')
          extra = Array.isArray(meta.extraModels) ? meta.extraModels : []
        } catch {
          extra = []
        }
        const models = [...new Set([sonnet, ...extra].filter(Boolean))]
        if (!endpoint || !models.length) continue
        store.providers[row.id] = {
          id: row.id,
          name: row.name,
          endpoint,
          apiKey,
          models,
          websiteUrl: row.website_url || '',
          notes: '自 CC Switch 迁移',
          createdAt: row.created_at || Date.now(),
          updatedAt: Date.now(),
        }
        if (row.is_current) store.currentProviderId = row.id
      }
      if (Object.keys(store.providers).length) {
        store.ccSwitchMigrated = true
        saveStore(store)
        return true
      }
    } finally {
      db.close()
    }
  } catch {
    /* ignore migration errors */
  }
  store.ccSwitchMigrated = true
  saveStore(store)
  return false
}

function geminiDirectEndpointError() {
  return ''  // Gemini 直连已支持，不再需要错误提示
}

module.exports = {
  attachDb,
  listProviders,
  upsertProvider,
  deleteProvider,
  setCurrentProvider,
  resolveEnvForModel,
  collectCloudModelPool,
  filterCloudModelList,
  syncProvidersToWorkbench,
  providersConfigured,
  normalizeAnthropicBaseUrl,
  normalizeProviderEnv,
  writeClaudeSettingsFromEnv,
  mapDeepSeekModelForClaude,
  migrateFromCcSwitchIfEmpty,
  providerNeedsCcrProxy,
  supportsDirectApi,
  inferDirectApiFromModel,
  buildTokenPricingFromProviders,
  fetchProviderModels,
  listKnownProviders,
  normalizeCloudModelId,
  geminiDirectEndpointError,
}
