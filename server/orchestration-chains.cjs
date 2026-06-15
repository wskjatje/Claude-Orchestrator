'use strict'

const fs = require('node:fs')
const path = require('node:path')

const PROJECT_DATA_DIR = path.join(__dirname, '..', '.claudecode')
const LEGACY_DATA_DIR = path.join(require('node:os').homedir(), '.claude-workbench')

function orchestrationChainPath() {
  return {
    primary: path.join(PROJECT_DATA_DIR, 'orchestration', 'active-chain.json'),
    legacy: path.join(LEGACY_DATA_DIR, 'orchestration', 'active-chain.json'),
  }
}

function orchestrationChainsDir() {
  return path.join(PROJECT_DATA_DIR, 'orchestration', 'chains')
}

function orchestrationChainsIndexPath() {
  return path.join(PROJECT_DATA_DIR, 'orchestration', 'chains-index.json')
}

function ensureProjectDataDir() {
  fs.mkdirSync(PROJECT_DATA_DIR, { recursive: true })
}

function normalizeState(raw) {
  const state = raw && typeof raw === 'object' ? raw : {}
  const steps = Array.isArray(state.steps) ? state.steps : []
  return {
    status: typeof state.status === 'string' ? state.status : 'idle',
    currentIndex: Number.isFinite(state.currentIndex) ? state.currentIndex : 0,
    steps: steps
      .map((s) => ({
        agentName: String(s?.agentName ?? '').trim(),
        taskId: String(s?.taskId ?? '').trim(),
        instruction: String(s?.instruction ?? '').trim(),
        skills: Array.isArray(s?.skills)
          ? s.skills.map((x) => String(x ?? '').trim()).filter(Boolean)
          : [],
        mcps: Array.isArray(s?.mcps)
          ? s.mcps.map((x) => String(x ?? '').trim()).filter(Boolean)
          : [],
      }))
      .filter((s) => s.agentName && s.instruction),
  }
}

function normalizeChainCategory(value) {
  if (value === 'single' || value === 'pipeline') return value
  return 'custom'
}

function summarizeChain(record) {
  const state = normalizeState(record?.state)
  const id = String(record.id)
  return {
    id,
    name: String(record.name || '未命名任务链'),
    description: String(record.description || ''),
    category: normalizeChainCategory(record?.category),
    enabled: record.enabled !== false,
    templateId: record.templateId ? String(record.templateId) : null,
    official: id.startsWith('official-'),
    userModified: Boolean(record.userModified),
    agentStems: [...new Set(state.steps.map((s) => s.agentName).filter(Boolean))],
    stepCount: state.steps.length,
    status: state.status,
    currentIndex: state.currentIndex,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  }
}

function loadIndexRaw() {
  ensureProjectDataDir()
  const p = orchestrationChainsIndexPath()
  if (!fs.existsSync(p)) {
    return { version: 1, activeChainId: null, chains: [] }
  }
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'))
    return {
      version: 1,
      activeChainId: data?.activeChainId ? String(data.activeChainId) : null,
      chains: Array.isArray(data?.chains) ? data.chains : [],
    }
  } catch {
    return { version: 1, activeChainId: null, chains: [] }
  }
}

function saveIndexRaw(index) {
  ensureProjectDataDir()
  const p = orchestrationChainsIndexPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(index, null, 2), 'utf8')
}

function chainFilePath(id) {
  return path.join(orchestrationChainsDir(), `${id}.json`)
}

function loadChainRecord(id) {
  const p = chainFilePath(id)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function saveChainRecord(record) {
  ensureProjectDataDir()
  fs.mkdirSync(orchestrationChainsDir(), { recursive: true })
  fs.writeFileSync(chainFilePath(record.id), JSON.stringify(record, null, 2), 'utf8')
}

function writeActiveChainFile(state) {
  const { primary } = orchestrationChainPath()
  fs.mkdirSync(path.dirname(primary), { recursive: true })
  fs.writeFileSync(primary, JSON.stringify(normalizeState(state), null, 2), 'utf8')
}

function newChainId() {
  return `chain-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function listOrchestrationChains() {
  reconcileChainsIndex()
  const index = loadIndexRaw()
  const items = []
  for (const row of index.chains) {
    const id = String(row?.id || '')
    if (!id) continue
    const record = loadChainRecord(id)
    if (!record) continue
    items.push(summarizeChain(record))
  }
  return { ok: true, items, activeChainId: index.activeChainId, error: null }
}

/** 补齐 chains/*.json 未入索引的条目，并移除索引中已丢失的文件 */
function reconcileChainsIndex() {
  const index = loadIndexRaw()
  const dir = orchestrationChainsDir()
  let changed = false
  const nextChains = []

  for (const row of index.chains) {
    const id = String(row?.id || '')
    if (!id || !loadChainRecord(id)) {
      changed = true
      continue
    }
    nextChains.push(summarizeChain(loadChainRecord(id)))
  }

  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue
      const id = f.slice(0, -5)
      if (!id || nextChains.some((c) => c.id === id)) continue
      const record = loadChainRecord(id)
      if (!record) continue
      nextChains.push(summarizeChain(record))
      changed = true
    }
  }

  if (changed) {
    index.chains = nextChains
    saveIndexRaw(index)
  }
}

function getOrchestrationChain(id) {
  const record = loadChainRecord(id)
  if (!record) return { ok: false, error: '任务链不存在', chain: null }
  return {
    ok: true,
    chain: {
      ...summarizeChain(record),
      state: normalizeState(record.state),
    },
    error: null,
  }
}

function createOrchestrationChain(payload) {
  const name = String(payload?.name ?? '').trim()
  if (!name) return { ok: false, error: '请填写任务链名称', chain: null }

  const state = normalizeState(payload?.state)
  if (!state.steps.length) return { ok: false, error: '至少需要一个有效步骤', chain: null }

  const id = newChainId()
  const now = new Date().toISOString()
  const record = {
    id,
    name,
    description: String(payload?.description ?? '').trim(),
    category: normalizeChainCategory(payload?.category),
    enabled: payload?.enabled !== false,
    templateId: payload?.templateId ? String(payload.templateId) : null,
    createdAt: now,
    updatedAt: now,
    state,
  }

  saveChainRecord(record)
  const index = loadIndexRaw()
  index.chains.push(summarizeChain(record))
  saveIndexRaw(index)

  return { ok: true, chain: { ...summarizeChain(record), state: record.state }, error: null }
}

function updateOrchestrationChain(id, payload) {
  const record = loadChainRecord(id)
  if (!record) return { ok: false, error: '任务链不存在', chain: null }

  if (payload?.name != null) record.name = String(payload.name).trim() || record.name
  if (payload?.description != null) record.description = String(payload.description).trim()
  if (payload?.enabled != null) record.enabled = Boolean(payload.enabled)
  if (payload?.state != null) {
    record.state = normalizeState(payload.state)
    if (!payload?.preserveOfficialSync) record.userModified = true
  }
  record.updatedAt = new Date().toISOString()

  saveChainRecord(record)

  const index = loadIndexRaw()
  const i = index.chains.findIndex((c) => c.id === id)
  const summary = summarizeChain(record)
  if (i >= 0) index.chains[i] = summary
  else index.chains.push(summary)
  saveIndexRaw(index)

  if (index.activeChainId === id) {
    writeActiveChainFile(record.state)
  }

  return { ok: true, chain: { ...summary, state: record.state }, error: null }
}

function deleteOrchestrationChain(id) {
  const index = loadIndexRaw()
  const next = index.chains.filter((c) => c.id !== id)
  if (next.length === index.chains.length) {
    return { ok: false, error: '任务链不存在' }
  }
  index.chains = next
  if (index.activeChainId === id) {
    index.activeChainId = null
    const { primary } = orchestrationChainPath()
    if (primary && fs.existsSync(primary)) fs.unlinkSync(primary)
  }
  saveIndexRaw(index)
  const p = chainFilePath(id)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  return { ok: true, error: null }
}

function activateOrchestrationChain(id) {
  const record = loadChainRecord(id)
  if (!record) return { ok: false, error: '任务链不存在', state: null }
  if (record.enabled === false) return { ok: false, error: '该任务链已停用', state: null }

  writeActiveChainFile(record.state)
  const index = loadIndexRaw()
  index.activeChainId = id
  saveIndexRaw(index)
  return { ok: true, state: normalizeState(record.state), error: null }
}

function getActiveOrchestrationChainId() {
  return loadIndexRaw().activeChainId
}

function syncOrchestrationChainState(state) {
  const normalized = normalizeState(state)
  writeActiveChainFile(normalized)
  const activeId = loadIndexRaw().activeChainId
  if (!activeId) return
  const record = loadChainRecord(activeId)
  if (!record) return
  record.state = normalized
  record.updatedAt = new Date().toISOString()
  saveChainRecord(record)
  const index = loadIndexRaw()
  const i = index.chains.findIndex((c) => c.id === activeId)
  if (i >= 0) index.chains[i] = summarizeChain(record)
  saveIndexRaw(index)
}

function toggleOrchestrationChainEnabled(id, enabled) {
  return updateOrchestrationChain(id, { enabled: Boolean(enabled) })
}

/** 将内置通用官方模板 upsert 到 chains 注册表（id = official-{templateId}） */
function ensureOfficialGenericChains(items) {
  if (!Array.isArray(items)) return { ok: false, error: '无效 payload', synced: 0 }
  const index = loadIndexRaw()
  let synced = 0
  const now = new Date().toISOString()

  for (const item of items) {
    const templateId = String(item?.templateId ?? '').trim()
    if (!templateId) continue
    const id = `official-${templateId}`
    const state = normalizeState({
      status: 'idle',
      currentIndex: 0,
      steps: item?.steps,
    })
    if (!state.steps.length) continue

    let record = loadChainRecord(id)
    if (record?.userModified) {
      if (item?.name) record.name = String(item.name)
      if (item?.description != null) record.description = String(item.description)
      record.updatedAt = now
      saveChainRecord(record)
      const summary = summarizeChain(record)
      const i = index.chains.findIndex((c) => c.id === id)
      if (i >= 0) index.chains[i] = summary
      else index.chains.push(summary)
      continue
    }

    if (!record) {
      record = {
        id,
        name: String(item?.name || templateId),
        description: String(item?.description || ''),
        category: normalizeChainCategory(item?.category),
        enabled: true,
        templateId,
        userModified: false,
        createdAt: now,
        updatedAt: now,
        state,
      }
    } else {
      record.name = String(item?.name || record.name)
      record.description = String(item?.description ?? record.description)
      record.category = normalizeChainCategory(item?.category ?? record.category)
      record.templateId = templateId
      record.enabled = record.enabled !== false
      record.state = state
      record.updatedAt = now
    }

    saveChainRecord(record)
    const summary = summarizeChain(record)
    const i = index.chains.findIndex((c) => c.id === id)
    if (i >= 0) index.chains[i] = summary
    else index.chains.push(summary)
    synced += 1
  }

  saveIndexRaw(index)
  return { ok: true, synced, error: null }
}

function listOrchestrationChainsForAgent(agentStem) {
  const stem = String(agentStem ?? '').trim()
  if (!stem) return { ok: false, error: '缺少 agentStem', items: [] }
  const all = listOrchestrationChains()
  const items = (all.items || []).filter((row) => {
    const rec = loadChainRecord(row.id)
    if (!rec) return false
    const steps = normalizeState(rec.state).steps
    return steps.some((s) => s.agentName === stem)
  })
  return { ok: true, items, error: null }
}

module.exports = {
  listOrchestrationChains,
  getOrchestrationChain,
  createOrchestrationChain,
  updateOrchestrationChain,
  deleteOrchestrationChain,
  activateOrchestrationChain,
  getActiveOrchestrationChainId,
  syncOrchestrationChainState,
  toggleOrchestrationChainEnabled,
  ensureOfficialGenericChains,
  listOrchestrationChainsForAgent,
}
