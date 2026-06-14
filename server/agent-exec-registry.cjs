'use strict'

const fs = require('node:fs')
const path = require('node:path')
const projectDb = require('./project-db.cjs')
const support = require('./cad-support.cjs')

const PROJECT_ROOT = path.join(__dirname, '..')
const PROJECT_DATA_DIR = path.join(PROJECT_ROOT, '.claudecode')
const PROJECT_DB_PATH = path.join(PROJECT_DATA_DIR, 'workbench.db')
const REGISTRY_KEY = 'agent_exec_registry'
/** 无活跃请求时，超过此时间仍显示 working 则自动置为 idle（毫秒） */
const WORKING_STALE_MS = Number(process.env.WORKBENCH_AGENT_WORKING_STALE_MS || 5 * 60 * 1000)

/** 当前 Bridge 进程内确认在执行的 Agent stem（start 未 end） */
const activeWorkingStems = new Set()

function db() {
  return projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR)
}

function normalizeStem(stem) {
  const s = String(stem || '')
    .trim()
    .slice(0, 120)
  if (!s) return ''
  return s.replace(/[^a-zA-Z0-9._-]/g, '_') || ''
}

function loadRegistry() {
  return projectDb.loadKv(db(), REGISTRY_KEY, { version: 1, days: {} })
}

function saveRegistry(reg) {
  projectDb.saveKv(db(), REGISTRY_KEY, reg)
}

function ensureDay(reg, date) {
  if (!reg.days[date]) {
    reg.days[date] = { nextOrder: 1, agents: {} }
  }
  return reg.days[date]
}

function ensureAgentEntry(day, stem) {
  const key = normalizeStem(stem)
  if (!key) return null
  if (!day.agents[key]) {
    day.agents[key] = {
      stem: key,
      order: day.nextOrder++,
      status: 'idle',
      lastExecAt: null,
      startedAt: null,
      execCount: 0,
    }
  }
  return day.agents[key]
}

function recordAgentExec(event) {
  const type = event?.type || event?.event
  if (type !== 'agent_exec') return null
  const agent = String(event.agent || event.stem || '').trim()
  if (!agent) return null

  const date = support.formatLocalYYYYMMDD(new Date(event.ts || Date.now()))
  const phase = event.phase === 'end' ? 'end' : event.phase === 'start' ? 'start' : 'exec'
  const ts = event.ts || new Date().toISOString()

  const reg = loadRegistry()
  const day = ensureDay(reg, date)
  const entry = ensureAgentEntry(day, agent)
  if (!entry) return null

  if (phase === 'start') {
    entry.status = 'working'
    entry.startedAt = ts
    activeWorkingStems.add(entry.stem)
  } else if (phase === 'end') {
    entry.status = 'idle'
    entry.lastExecAt = ts
    entry.execCount += 1
    activeWorkingStems.delete(entry.stem)
  } else {
    entry.lastExecAt = ts
    entry.execCount += 1
    activeWorkingStems.delete(entry.stem)
  }

  saveRegistry(reg)
  return { date, entry: { ...entry } }
}

function expireStaleWorking(day) {
  if (!day?.agents) return false
  const now = Date.now()
  let changed = false
  for (const entry of Object.values(day.agents)) {
    if (entry.status !== 'working') continue
    if (activeWorkingStems.has(entry.stem)) continue
    const started = entry.startedAt ? Date.parse(entry.startedAt) : NaN
    if (!Number.isFinite(started) || now - started >= WORKING_STALE_MS) {
      entry.status = 'idle'
      changed = true
    }
  }
  return changed
}

/** Bridge 重启后内存中无活跃任务，清理数据库里残留的 working */
function reconcileWorkingOnStartup() {
  activeWorkingStems.clear()
  const reg = loadRegistry()
  let changed = false
  for (const day of Object.values(reg.days || {})) {
    if (expireStaleWorking(day)) changed = true
  }
  if (changed) saveRegistry(reg)
  return changed
}

function listAgentsForDate(date, eventsPath) {
  const safeDate =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? date.trim()
      : support.formatLocalYYYYMMDD()

  const reg = loadRegistry()
  const day = reg.days[safeDate]
  if (day && expireStaleWorking(day)) saveRegistry(reg)
  let agents = day ? Object.values(day.agents) : []

  if (!agents.length && eventsPath && fs.existsSync(eventsPath)) {
    rebuildDayFromEvents(reg, safeDate, eventsPath)
    saveRegistry(reg)
    agents = reg.days[safeDate] ? Object.values(reg.days[safeDate].agents) : []
  }

  agents.sort((a, b) => a.order - b.order)
  return { date: safeDate, agents }
}

function rebuildDayFromEvents(reg, date, eventsPath) {
  const day = ensureDay(reg, date)
  /** @type {Map<string, { order: number, status: string, lastExecAt: string|null, startedAt: string|null, execCount: number }>} */
  const byAgent = new Map()
  let buf = fs.readFileSync(eventsPath)
  if (buf.length > 2_000_000) buf = buf.slice(-2_000_000)
  for (const line of buf.toString('utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      const o = JSON.parse(line)
      if (support.formatLocalYYYYMMDD(new Date(o.ts)) !== date) continue
      if (o.type !== 'agent_exec' && o.event !== 'agent_exec') continue
      const agent = String(o.agent || o.stem || '').trim()
      if (!agent) continue
      const key = normalizeStem(agent)
      if (!byAgent.has(key)) {
        byAgent.set(key, {
          order: day.nextOrder++,
          status: 'idle',
          lastExecAt: null,
          startedAt: null,
          execCount: 0,
        })
      }
      const entry = byAgent.get(key)
      const phase = o.phase === 'end' ? 'end' : o.phase === 'start' ? 'start' : 'exec'
      const ts = o.ts || null
      if (phase === 'start') {
        entry.status = 'working'
        entry.startedAt = ts
      } else if (phase === 'end') {
        entry.status = 'idle'
        entry.lastExecAt = ts
        entry.execCount += 1
      } else {
        entry.status = 'idle'
        entry.lastExecAt = ts
        entry.execCount += 1
      }
    } catch {
      /* skip */
    }
  }
  for (const [key, meta] of byAgent) {
    day.agents[key] = { stem: key, ...meta }
  }
  expireStaleWorking(day)
}

module.exports = {
  recordAgentExec,
  listAgentsForDate,
  reconcileWorkingOnStartup,
  normalizeStem,
}
