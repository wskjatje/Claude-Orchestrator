'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const projectDb = require('./project-db.cjs')
const { PROJECT_DATA_DIR, PROJECT_DB_PATH } = require('./paths.mjs')

const PROVIDERS_KV = 'cloud_providers'

/** @type {() => import('better-sqlite3').Database} */
let getDb = null

function attachDb(fn) {
  getDb = fn
}

function defaultStore() {
  return { version: 1, currentProviderId: '', providers: {} }
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
  return m
}

function mapDeepSeekModelForClaude(model) {
  return normalizeCloudModelId(model)
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
  store.providers[id] = {
    id,
    name,
    endpoint: String(input.endpoint || existing?.endpoint || '').trim(),
    apiKey,
    models,
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

  if (Array.isArray(settings.cloudModelCatalog)) {
    for (const m of settings.cloudModelCatalog) {
      if (allowCloud(m)) models.add(String(m || '').trim())
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
      [...new Set([...(cur.cloudModelCatalog || []), ...pool])],
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
  if (Object.keys(store.providers || {}).length > 0) return false

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
        saveStore(store)
        return true
      }
    } finally {
      db.close()
    }
  } catch {
    /* ignore migration errors */
  }
  return false
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
}
