'use strict'

const projectDb = require('./project-db.cjs')
const support = require('./cad-support.cjs')
const { estimateUsageCostUsd } = require('./token-pricing.mjs')
const path = require('node:path')

const PROJECT_ROOT = path.join(__dirname, '..')
const PROJECT_DATA_DIR = path.join(PROJECT_ROOT, '.claudecode')
const PROJECT_DB_PATH = path.join(PROJECT_DATA_DIR, 'workbench.db')
const REGISTRY_KEY = 'usage_stats_registry'

function db() {
  return projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR)
}

function emptyBucket() {
  return {
    msgUser: 0,
    msgAssistant: 0,
    promptTok: 0,
    completionTok: 0,
    totalTok: 0,
    apiTurns: 0,
    errors: 0,
    latencySumMs: 0,
    latencySamples: 0,
    workspaceWriteHints: 0,
    cloudTurns: 0,
    localTurns: 0,
    cloudPromptTok: 0,
    cloudCompletionTok: 0,
    localPromptTok: 0,
    localCompletionTok: 0,
    cloudCostUsd: 0,
    sessionIds: {},
    modelCounts: {},
  }
}

function isCloudBilling(msg, session, opts = {}) {
  if (msg?.billingSource === 'cloud') return true
  if (msg?.billingSource === 'local') return false
  const model = String(msg?.modelId || session?.modelId || '').trim()
  if (!model) return false
  const lower = model.toLowerCase()
  const catalog = Array.isArray(opts.cloudModelCatalog) ? opts.cloudModelCatalog : []
  if (catalog.some((m) => String(m).trim() === model)) return true
  if (/claude|sonnet|opus|haiku|gpt-|o[134]-|gemini|deepseek-(chat|v4|reasoner)/i.test(lower)) {
    return true
  }
  if (/^(llama|qwen|mistral|phi|gemma|codellama|nomic|moondream)/i.test(lower)) return false
  return false
}

function usageTokens(u) {
  if (!u || typeof u !== 'object') return { prompt: 0, completion: 0, total: 0 }
  const prompt = Number(u.prompt_tokens ?? u.input_tokens ?? 0)
  const completion = Number(u.completion_tokens ?? u.output_tokens ?? 0)
  const total = Number(u.total_tokens ?? 0) || prompt + completion
  return { prompt, completion, total }
}

function loadRegistry() {
  return projectDb.loadKv(db(), REGISTRY_KEY, { version: 1, days: {}, lastBuiltAt: null })
}

function saveRegistry(reg) {
  projectDb.saveKv(db(), REGISTRY_KEY, reg)
}

function hourKey(ts) {
  const d = new Date(ts)
  return String(d.getHours()).padStart(2, '0')
}

function applyMessage(bucket, session, msg, opts = {}) {
  if (!msg || typeof msg !== 'object') return
  const ts = msg.ts
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return

  const mid = (msg.modelId || session.modelId || '').trim() || '（未标注模型）'
  const tokenPricing = opts.tokenPricing || {}
  const isCloud = isCloudBilling(msg, session, opts)
  bucket.sessionIds[session.id] = 1

  if (msg.role === 'user') {
    bucket.msgUser += 1
    return
  }
  if (msg.role !== 'assistant') return

  bucket.msgAssistant += 1
  if (msg.requestError) bucket.errors += 1

  const u = msg.usage
    if (u && typeof u === 'object') {
    bucket.apiTurns += 1
    const tok = usageTokens(u)
    bucket.promptTok += tok.prompt
    bucket.completionTok += tok.completion
    bucket.totalTok += tok.total
    if (isCloud) {
      bucket.cloudTurns += 1
      bucket.cloudPromptTok += tok.prompt
      bucket.cloudCompletionTok += tok.completion
      // 优先使用冻结的 costUsd（首次写入时锁定），避免后期改单价影响历史
      const frozenCost = typeof u.costUsd === 'number' ? u.costUsd : estimateUsageCostUsd(u, mid, tokenPricing)
      bucket.cloudCostUsd += frozenCost
    } else {
      bucket.localTurns += 1
      bucket.localPromptTok += tok.prompt
      bucket.localCompletionTok += tok.completion
    }
    if (typeof msg.latencyMs === 'number' && msg.latencyMs > 0) {
      bucket.latencySumMs += msg.latencyMs
      bucket.latencySamples += 1
    }
  } else if (msg.requestError) {
    bucket.apiTurns += 1
    if (isCloud) bucket.cloudTurns += 1
    else bucket.localTurns += 1
  } else if (typeof msg.latencyMs === 'number' && msg.latencyMs > 0) {
    bucket.apiTurns += 1
    bucket.latencySumMs += msg.latencyMs
    bucket.latencySamples += 1
    if (isCloud) bucket.cloudTurns += 1
    else bucket.localTurns += 1
  } else if (msg.billingSource === 'cloud') {
    bucket.cloudTurns += 1
  } else if (msg.billingSource === 'local') {
    bucket.localTurns += 1
  }

  if (typeof msg.content === 'string' && /```(?:workspace-write)\b/i.test(msg.content)) {
    bucket.workspaceWriteHints += 1
  }

  bucket.modelCounts[mid] = (bucket.modelCounts[mid] ?? 0) + 1
}

function rebuildFromSessions(sessions, opts = {}) {
  const list = Array.isArray(sessions) ? sessions : []
  const reg = { version: 1, days: {}, lastBuiltAt: Date.now() }

  for (const session of list) {
    const hist = Array.isArray(session?.history) ? session.history : []
    for (const msg of hist) {
      const ts = msg?.ts
      if (typeof ts !== 'number' || !Number.isFinite(ts)) continue
      const dayKey = support.formatLocalYYYYMMDD(new Date(ts))
      if (!reg.days[dayKey]) {
        reg.days[dayKey] = { ...emptyBucket(), hours: {} }
      }
      const day = reg.days[dayKey]
      applyMessage(day, session, msg, opts)

      const hk = hourKey(ts)
      if (!day.hours[hk]) day.hours[hk] = emptyBucket()
      applyMessage(day.hours[hk], session, msg, opts)
    }
  }

  saveRegistry(reg)
  return reg
}

function foldBucket(acc, bucket) {
  if (!bucket) return acc
  acc.msgUser += bucket.msgUser ?? 0
  acc.msgAssistant += bucket.msgAssistant ?? 0
  acc.promptTok += bucket.promptTok ?? 0
  acc.completionTok += bucket.completionTok ?? 0
  acc.totalTok += bucket.totalTok ?? 0
  acc.apiTurns += bucket.apiTurns ?? 0
  acc.errors += bucket.errors ?? 0
  acc.latencySumMs += bucket.latencySumMs ?? 0
  acc.latencySamples += bucket.latencySamples ?? 0
  acc.workspaceWriteHints += bucket.workspaceWriteHints ?? 0
  acc.cloudTurns += bucket.cloudTurns ?? 0
  acc.localTurns += bucket.localTurns ?? 0
  acc.cloudPromptTok += bucket.cloudPromptTok ?? 0
  acc.cloudCompletionTok += bucket.cloudCompletionTok ?? 0
  acc.localPromptTok += bucket.localPromptTok ?? 0
  acc.localCompletionTok += bucket.localCompletionTok ?? 0
  acc.cloudCostUsd += bucket.cloudCostUsd ?? 0
  for (const [id, v] of Object.entries(bucket.sessionIds || {})) {
    if (v) acc.sessionIds[id] = 1
  }
  for (const [k, v] of Object.entries(bucket.modelCounts || {})) {
    acc.modelCounts[k] = (acc.modelCounts[k] ?? 0) + v
  }
  return acc
}

function finalizeSummary(acc) {
  const sessionsInRange = Object.keys(acc.sessionIds).length
  const throughputTokPerSec =
    acc.latencySamples > 0 && acc.completionTok > 0
      ? acc.completionTok / (acc.latencySumMs / 1000)
      : null
  const avgTokPerMsg = acc.apiTurns > 0 && acc.totalTok > 0 ? acc.totalTok / acc.apiTurns : null
  const errRate = acc.apiTurns > 0 ? acc.errors / acc.apiTurns : 0
  const topModel =
    Object.entries(acc.modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  const cloudTotalTok = acc.cloudPromptTok + acc.cloudCompletionTok
  const localTotalTok = acc.localPromptTok + acc.localCompletionTok

  return {
    msgUser: acc.msgUser,
    msgAssistant: acc.msgAssistant,
    sessionsInRange,
    promptTok: acc.promptTok,
    completionTok: acc.completionTok,
    totalTok: acc.totalTok,
    apiTurns: acc.apiTurns,
    errors: acc.errors,
    latencySumMs: acc.latencySumMs,
    latencySamples: acc.latencySamples,
    workspaceWriteHints: acc.workspaceWriteHints,
    throughputTokPerSec,
    avgTokPerMsg,
    errRate,
    topModel,
    modelCounts: acc.modelCounts,
    cloudTurns: acc.cloudTurns,
    localTurns: acc.localTurns,
    cloudPromptTok: acc.cloudPromptTok,
    cloudCompletionTok: acc.cloudCompletionTok,
    localPromptTok: acc.localPromptTok,
    localCompletionTok: acc.localCompletionTok,
    cloudTotalTok,
    localTotalTok,
    sessionCloudCostUsd: acc.cloudCostUsd,
    localCostUsd: 0,
  }
}

function dayInRange(dayKey, startMs, endMs) {
  const parts = dayKey.split('-').map(Number)
  if (parts.length !== 3) return false
  const dayStart = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime()
  const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1
  return dayEnd >= startMs && dayStart <= endMs
}

function getUsageSummary({ startMs = 0, endMs = Date.now() } = {}) {
  const reg = loadRegistry()
  const acc = emptyBucket()
  const daily = []
  const hourly = []

  const dayKeys = Object.keys(reg.days || {}).sort()
  for (const dayKey of dayKeys) {
    if (!dayInRange(dayKey, startMs, endMs)) continue
    const day = reg.days[dayKey]
    const dayAcc = emptyBucket()
    foldBucket(dayAcc, day)
    foldBucket(acc, day)
    daily.push({
      date: dayKey,
      ...finalizeSummary(dayAcc),
    })

    const parts = dayKey.split('-').map(Number)
    for (const [hk, hb] of Object.entries(day.hours || {})) {
      const hour = Number(hk)
      if (!Number.isFinite(hour)) continue
      const hourStart = new Date(parts[0], parts[1] - 1, parts[2], hour, 0, 0, 0).getTime()
      if (hourStart < startMs || hourStart > endMs) continue
      const hAcc = emptyBucket()
      foldBucket(hAcc, hb)
      hourly.push({
        hourStartMs: hourStart,
        label: `${dayKey} ${hk}:00`,
        ...finalizeSummary(hAcc),
      })
    }
  }

  hourly.sort((a, b) => a.hourStartMs - b.hourStartMs)

  return {
    summary: finalizeSummary(acc),
    daily,
    hourly,
    lastBuiltAt: reg.lastBuiltAt ?? null,
  }
}

module.exports = {
  rebuildFromSessions,
  getUsageSummary,
  loadRegistry,
}
