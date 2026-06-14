'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')

const execFileAsync = promisify(execFile)

const CAD_SQLITE = path.join(__dirname, 'vendor/cad/node_modules/better-sqlite3')

/** @type {import('better-sqlite3') | null} */
let Database = null
try {
  Database = require(CAD_SQLITE)
} catch {
  Database = null
}

function ccSwitchDbPath() {
  return path.join(os.homedir(), '.cc-switch', 'cc-switch.db')
}

function openDb() {
  const p = ccSwitchDbPath()
  if (!fs.existsSync(p)) {
    throw new Error('未找到 ~/.cc-switch/cc-switch.db，请先安装 CC Switch 并至少配置一个 Claude Code 供应商')
  }
  if (!Database) {
    throw new Error('无法加载 better-sqlite3，请运行 npm run vendor:install')
  }
  return new Database(p)
}

function slugifyProviderId(name) {
  const s = String(name || 'provider')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return s ? `${s}-claude` : `custom-claude-${Date.now()}`
}

function parseProviderConfig(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {}
  } catch {
    return {}
  }
}

function extractModelsFromProviderConfig(settingsConfigRaw, metaRaw) {
  const models = new Set()
  const cfg = parseProviderConfig(settingsConfigRaw)
  const env = cfg.env && typeof cfg.env === 'object' ? cfg.env : {}
  for (const k of [
    'ANTHROPIC_DEFAULT_SONNET_MODEL',
    'ANTHROPIC_DEFAULT_OPUS_MODEL',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  ]) {
    const m = String(env[k] || '').trim()
    if (m && m !== '#') models.add(m)
  }
  const meta = parseProviderConfig(metaRaw)
  for (const key of ['models', 'extraModels']) {
    if (!Array.isArray(meta[key])) continue
    for (const m of meta[key]) {
      const t = String(m || '').trim()
      if (t) models.add(t)
    }
  }
  return [...models]
}

function maskApiKey(key) {
  const k = String(key || '').trim()
  if (!k) return ''
  if (k.length <= 8) return '••••'
  return `${k.slice(0, 4)}…${k.slice(-4)}`
}

/** Claude Code 会拼 /v1/messages；DeepSeek Anthropic 兼容根路径须含 /anthropic */
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

function mapDeepSeekModelForClaude(model) {
  const m = String(model || '').trim()
  if (!m) return m
  if (/^deepseek-chat$/i.test(m)) return 'deepseek-v4-flash'
  if (/^deepseek-reasoner$/i.test(m)) return 'deepseek-v4-pro'
  return m
}

function rowToProviderSummary(row) {
  if (!row) return null
  const cfg = parseProviderConfig(row.settings_config)
  const env = cfg.env && typeof cfg.env === 'object' ? cfg.env : {}
  const models = extractModelsFromProviderConfig(row.settings_config, row.meta)
  const apiKey = String(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || '').trim()
  return {
    id: row.id,
    name: row.name,
    isCurrent: Boolean(row.is_current),
    category: row.category || '',
    websiteUrl: row.website_url || '',
    notes: row.notes || '',
    baseUrl: String(env.ANTHROPIC_BASE_URL || '').trim(),
    models,
    hasApiKey: Boolean(apiKey),
    apiKeyPreview: maskApiKey(apiKey),
  }
}

function listProviders() {
  const db = openDb()
  try {
    const rows = db
      .prepare(
        "SELECT * FROM providers WHERE app_type='claude' ORDER BY is_current DESC, sort_index ASC, name ASC",
      )
      .all()
    return rows.map((row) => rowToProviderSummary(row)).filter(Boolean)
  } finally {
    db.close()
  }
}

function buildProviderEnv(input) {
  const endpoint = String(input.endpoint || '').trim().replace(/\/$/, '')
  const apiKey = String(input.apiKey || '').trim()
  const sonnet = String(input.sonnetModel || input.model || '').trim()
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

function buildImportDeeplink(input) {
  const endpoint = String(input.endpoint || '').trim().replace(/\/$/, '')
  const apiKey = String(input.apiKey || '').trim()
  const sonnet = String(input.sonnetModel || input.model || '').trim()
  const haiku = String(input.haikuModel || sonnet).trim()
  const opus = String(input.opusModel || sonnet).trim()
  const name = String(input.name || 'Custom Provider').trim()
  const homepage = String(input.homepage || endpoint || 'https://ccswitch.io').trim()
  const params = new URLSearchParams({
    resource: 'provider',
    app: 'claude',
    name,
    homepage,
    endpoint,
    apiKey,
    model: sonnet,
    haikuModel: haiku,
    sonnetModel: sonnet,
    opusModel: opus,
    icon: 'custom',
    enabled: 'false',
    notes: String(input.notes || '由 Claude Workbench 添加').trim(),
  })
  return `ccswitch://v1/import?${params.toString()}`
}

function upsertProvider(input) {
  const name = String(input.name || '').trim()
  if (!name) throw new Error('供应商名称不能为空')

  let id = String(input.id || '').trim()
  if (!id) id = slugifyProviderId(name)

  const db = openDb()
  try {
    const existing = db
      .prepare("SELECT * FROM providers WHERE id=? AND app_type='claude'")
      .get(id)

    let apiKey = String(input.apiKey || '').trim()
    if (!apiKey && existing) {
      const prevCfg = parseProviderConfig(existing.settings_config)
      const prevEnv = prevCfg.env || {}
      apiKey = String(prevEnv.ANTHROPIC_API_KEY || prevEnv.ANTHROPIC_AUTH_TOKEN || '').trim()
    }
    if (!apiKey) throw new Error('API Key 不能为空（更新时可留空以保留原 Key）')

    const { env, sonnet } = buildProviderEnv({ ...input, apiKey })
    const settings = { language: 'chinese', env }
    const settingsConfig = JSON.stringify(settings, null, 0)

    const extraModels = Array.isArray(input.extraModels)
      ? input.extraModels.map((m) => String(m || '').trim()).filter(Boolean)
      : String(input.extraModels || '')
          .split(/[,，\n]/)
          .map((m) => m.trim())
          .filter(Boolean)

    let meta = {}
    if (existing?.meta) {
      try {
        meta = JSON.parse(existing.meta || '{}')
      } catch {
        meta = {}
      }
    }
    if (existing) {
      meta.extraModels = extraModels
      meta.models = [...new Set([sonnet, ...extraModels].filter(Boolean))]
    } else {
      meta.extraModels = extraModels
      meta.models = [...new Set([sonnet, ...extraModels].filter(Boolean))]
    }
    const metaJson = JSON.stringify(meta)

    const now = Date.now()
    const website = String(input.homepage || input.websiteUrl || '').trim()
    const notes = String(input.notes || `由 Workbench 添加/更新；模型 ${sonnet}`).trim()
    const category = String(input.category || 'third_party').trim()

    if (existing) {
      db.prepare(
        `UPDATE providers SET name=?, settings_config=?, website_url=?, category=?, notes=?, meta=?
         WHERE id=? AND app_type='claude'`,
      ).run(name, settingsConfig, website, category, notes, metaJson, id)
    } else {
      const sortIndex = Number(input.sortIndex ?? 200)
      db.prepare(
        `INSERT INTO providers
         (id, app_type, name, settings_config, website_url, category, created_at, sort_index, notes, icon, icon_color, meta, is_current, in_failover_queue, cost_multiplier)
         VALUES (?, 'claude', ?, ?, ?, ?, ?, ?, ?, 'custom', '#6366f1', ?, 0, 0, '1.0')`,
      ).run(id, name, settingsConfig, website, category, now, sortIndex, notes, metaJson)
    }

    if (input.setCurrent) {
      setCurrentProvider(id, sonnet, db)
    }

    const summary = rowToProviderSummary(
      db.prepare("SELECT * FROM providers WHERE id=? AND app_type='claude'").get(id),
    )
    return {
      ok: true,
      providerId: id,
      provider: summary,
      importLink: buildImportDeeplink({ ...input, apiKey, id }),
    }
  } finally {
    db.close()
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

function deleteProvider(providerId) {
  const id = String(providerId || '').trim()
  if (!id) throw new Error('providerId 不能为空')

  const db = openDb()
  try {
    const row = db
      .prepare("SELECT * FROM providers WHERE id=? AND app_type='claude'")
      .get(id)
    if (!row) throw new Error(`未找到供应商：${id}`)
    if (row.is_current) throw new Error('不能删除当前启用的供应商，请先切换至其它供应商')
    db.prepare("DELETE FROM providers WHERE id=? AND app_type='claude'").run(id)
    return { ok: true, providerId: id }
  } finally {
    db.close()
  }
}

function setCurrentProvider(providerId, preferredModel, dbExternal) {
  const id = String(providerId || '').trim()
  if (!id) throw new Error('providerId 不能为空')

  const ownDb = !dbExternal
  const db = dbExternal || openDb()
  try {
    const row = db
      .prepare("SELECT settings_config FROM providers WHERE id=? AND app_type='claude'")
      .get(id)
    if (!row) throw new Error(`未找到供应商：${id}`)

    const cfg = parseProviderConfig(row.settings_config)
    const env = normalizeProviderEnv({ ...(cfg.env || {}) })
    const model = String(preferredModel || env.ANTHROPIC_DEFAULT_SONNET_MODEL || '').trim()
    if (model) {
      const apiModel = mapDeepSeekModelForClaude(model)
      env.ANTHROPIC_DEFAULT_HAIKU_MODEL = apiModel
      env.ANTHROPIC_DEFAULT_SONNET_MODEL = apiModel
      env.ANTHROPIC_DEFAULT_OPUS_MODEL = apiModel
    }
    const nextCfg = { ...cfg, language: cfg.language || 'chinese', env }
    const settingsConfig = JSON.stringify(nextCfg, null, 0)

    db.prepare("UPDATE providers SET is_current=0 WHERE app_type='claude'").run()
    db.prepare(
      "UPDATE providers SET is_current=1, settings_config=? WHERE id=? AND app_type='claude'",
    ).run(settingsConfig, id)

    const ccSettingsPath = path.join(os.homedir(), '.cc-switch', 'settings.json')
    let ccData = {}
    if (fs.existsSync(ccSettingsPath)) {
      try {
        ccData = JSON.parse(fs.readFileSync(ccSettingsPath, 'utf8'))
      } catch {
        ccData = {}
      }
    }
    ccData.currentProviderClaude = id
    fs.mkdirSync(path.dirname(ccSettingsPath), { recursive: true })
    fs.writeFileSync(ccSettingsPath, JSON.stringify(ccData, null, 2) + '\n', 'utf8')

    writeClaudeSettingsFromEnv(env, nextCfg.language || 'chinese')

    return { ok: true, providerId: id, model: model || env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'sonnet' }
  } finally {
    if (ownDb) db.close()
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

/** 与 Ollama 本机标签同名或同 family（qwen2.5-coder:14b）的视为本地模型，不应出现在云模型列表 */
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

function collectModelsFromAllProviders() {
  try {
    const providers = listProviders()
    const models = new Set()
    for (const p of providers) {
      for (const m of p.models) models.add(m)
    }
    return { providers, models: [...models] }
  } catch (e) {
    return { providers: [], models: [], error: e.message }
  }
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
      const names = items
        .map((item) => String(item?.id || item?.name || '').trim())
        .filter(Boolean)
      if (names.length) return names
    } catch {
      /* try next url */
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
  const { providers, models: providerModels, error: providerError } = collectModelsFromAllProviders()
  for (const p of providers) {
    if (isLocalOllamaProvider(p)) continue
    for (const m of p.models) {
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
    if (current && !isLocalOllamaProvider(current) && current?.baseUrl && current.hasApiKey) {
      const db = openDb()
      try {
        const row = db
          .prepare("SELECT settings_config FROM providers WHERE id=? AND app_type='claude'")
          .get(current.id)
        const env = parseProviderConfig(row?.settings_config).env || {}
        const key = String(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || '').trim()
        remoteModels = await fetchGatewayModels(current.baseUrl, key)
        for (const m of remoteModels) {
          if (allowCloud(m)) models.add(m)
        }
      } catch {
        /* ignore */
      } finally {
        db.close()
      }
    }
  }

  return {
    models: [...models].filter((m) => m && m !== '#'),
    providers,
    remoteModels,
    providerError: providerError || null,
  }
}

async function syncCcSwitchToWorkbench({ loadChatSettings, saveChatSettings, loadChatSessions, saveChatSessions, projectRoot }) {
  const db = openDb()
  try {
    const cols = db.prepare('PRAGMA table_info(providers)').all().map((r) => r.name)
    const row = db
      .prepare("SELECT * FROM providers WHERE app_type='claude' AND is_current=1 LIMIT 1")
      .get()
    if (!row) throw new Error('云模型配置中无当前 Claude Code 供应商')

    const d = Object.fromEntries(cols.map((c) => [c, row[c]]))
    const cfg = parseProviderConfig(d.settings_config)
    const env = { ...(cfg.env || {}) }

    if (projectRoot) {
      const projectCs = path.join(projectRoot, '.claude/settings.json')
      if (fs.existsSync(projectCs)) {
        try {
          const projectEnv = JSON.parse(fs.readFileSync(projectCs, 'utf8')).env || {}
          for (const [k, v] of Object.entries(projectEnv)) {
            if (k.startsWith('CLAUDE_CODE_') || k === 'LANG' || k === 'LC_ALL') {
              env[k] = env[k] ?? v
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    writeClaudeSettingsFromEnv(env, cfg.language || 'chinese')

    const model =
      env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
      env.ANTHROPIC_DEFAULT_HAIKU_MODEL ||
      env.ANTHROPIC_DEFAULT_OPUS_MODEL ||
      'sonnet'
    const baseUrl = String(env.ANTHROPIC_BASE_URL || '')
    const cur = loadChatSettings()
    const rawPool = collectModelsFromAllProviders().models.filter((m) => {
      const p = listProviders().find((pr) => pr.models.includes(m))
      return !p || !isLocalOllamaProvider(p)
    })
    const pool = await filterCloudModelList(rawPool, cur)
    const nextSettings = {
      ...cur,
      model: String(model).trim() || cur.model,
      ollamaBase: cur.ollamaBase || 'http://127.0.0.1:11434',
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
      providerId: d.id,
      providerName: d.name,
      model: nextSettings.model,
      baseUrl,
      modelCount: pool.length,
    }
  } finally {
    db.close()
  }
}

function ccSwitchInstalled() {
  return fs.existsSync(ccSwitchDbPath())
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

/** 按模型 ID 查找 CC Switch 供应商（sonnet/opus/haiku 走当前供应商） */
function findProviderRowForModel(modelId, dbExternal) {
  const model = String(modelId || '').trim()
  if (!model) return null

  const ownDb = !dbExternal
  const db = dbExternal || openDb()
  try {
    const rows = db
      .prepare(
        "SELECT * FROM providers WHERE app_type='claude' ORDER BY is_current DESC, sort_index ASC, name ASC",
      )
      .all()
    if (!rows.length) return null

    if (/^(sonnet|opus|haiku)$/i.test(model)) {
      return rows.find((r) => r.is_current) || rows[0]
    }

    const matches = rows.filter((row) => {
      const models = extractModelsFromProviderConfig(row.settings_config, row.meta)
      return models.includes(model)
    })
    if (matches.length === 1) return matches[0]
    if (matches.length > 1) {
      return matches.find((r) => r.is_current) || matches[0]
    }
    return rows.find((r) => r.is_current) || null
  } finally {
    if (ownDb) db.close()
  }
}

/**
 * 为 Claude Code 调用解析 env：优先使用拥有该模型的 CC Switch 供应商，
 * 避免 UI 选了 DeepSeek 却仍走全局 Gemini/ccr 端点。
 */
function resolveEnvForModel(modelId) {
  const globalEnv = readGlobalClaudeEnvFromDisk()
  const model = String(modelId || '').trim()

  let row = null
  try {
    row = findProviderRowForModel(model)
  } catch {
    return {
      env: globalEnv,
      providerId: '',
      providerName: '',
      model,
    }
  }

  if (!row) {
    return {
      env: globalEnv,
      providerId: '',
      providerName: '',
      model,
    }
  }

  const cfg = parseProviderConfig(row.settings_config)
  const env = { ...globalEnv, ...(cfg.env || {}) }

  if (model && !/^(sonnet|opus|haiku)$/i.test(model)) {
    const apiModel = mapDeepSeekModelForClaude(model)
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = apiModel
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = apiModel
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = apiModel
  }

  return {
    env: normalizeProviderEnv(env),
    providerId: row.id,
    providerName: row.name || row.id,
    model,
  }
}

module.exports = {
  ccSwitchDbPath,
  ccSwitchInstalled,
  listProviders,
  upsertProvider,
  deleteProvider,
  setCurrentProvider,
  buildImportDeeplink,
  collectModelsFromAllProviders,
  collectCloudModelPool,
  filterCloudModelList,
  syncCcSwitchToWorkbench,
  findProviderRowForModel,
  resolveEnvForModel,
  normalizeAnthropicBaseUrl,
  normalizeProviderEnv,
  writeClaudeSettingsFromEnv,
}
