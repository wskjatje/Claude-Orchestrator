import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { estimateUsageCostUsd } from './token-pricing.mjs'

const PROJECTS_ROOT = path.join(os.homedir(), '.claude', 'projects')

function parseTs(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const t = Date.parse(raw)
    if (Number.isFinite(t)) return t
  }
  return 0
}

function extractUserTitle(content) {
  const text = String(content || '')
  const round = text.match(/###\s*用户（本轮）\s*\n+([^\n#]{1,120})/)
  if (round?.[1]) return round[1].trim()
  const user = text.match(/###\s*用户\s*\n+([^\n#]{1,120})/)
  if (user?.[1]) return user[1].trim()
  const stripped = text.replace(/【[^】]{0,80}】/g, ' ').replace(/\s+/g, ' ').trim()
  if (stripped.length > 0 && stripped.length <= 120) return stripped
  return stripped.slice(0, 80) || '（无标题）'
}

function messageText(message) {
  if (!message) return ''
  if (typeof message === 'string') return message
  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.content)) {
    return message.content
      .map((p) => (typeof p === 'string' ? p : p?.text || ''))
      .join('\n')
  }
  return ''
}

function scanJsonlFile(filePath, workspacePath, onEvent) {
  let cwdMatch = !workspacePath
  let stat = null
  try {
    stat = fs.statSync(filePath)
  } catch {
    return null
  }
  const sessionId = path.basename(filePath, '.jsonl')
  const state = {
    sessionId,
    filePath,
    mtimeMs: stat.mtimeMs,
    cwd: '',
    title: '',
    model: '',
    lastActivityMs: stat.mtimeMs,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    turns: 0,
  }

  let buf = ''
  try {
    buf = fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
  const lines = buf.split('\n')
  const scanLimit = Math.min(lines.length, 4000)
  for (let i = 0; i < scanLimit; i++) {
    const line = lines[i]?.trim()
    if (!line) continue
    let row
    try {
      row = JSON.parse(line)
    } catch {
      continue
    }
    if (!cwdMatch && row.cwd) {
      const cwd = String(row.cwd)
      if (workspacePath && path.resolve(cwd) === path.resolve(workspacePath)) cwdMatch = true
      state.cwd = cwd
    }
    if (workspacePath && row.cwd && path.resolve(String(row.cwd)) === path.resolve(workspacePath)) {
      cwdMatch = true
      state.cwd = String(row.cwd)
    }
    const ts = parseTs(row.timestamp)
    if (ts > state.lastActivityMs) state.lastActivityMs = ts

    if (row.type === 'user') {
      const t = extractUserTitle(messageText(row.message))
      if (t && t !== '（无标题）') state.title = t
    }
    if (row.type === 'assistant') {
      const msg = row.message && typeof row.message === 'object' ? row.message : {}
      const usage = msg.usage || row.usage
      const model = msg.model || row.model
      if (model) state.model = String(model)
      if (usage && (!workspacePath || cwdMatch)) {
        state.turns += 1
        state.inputTokens += Number(usage.input_tokens ?? 0) + Number(usage.cache_read_input_tokens ?? 0)
        state.outputTokens += Number(usage.output_tokens ?? 0)
        if (onEvent) onEvent({ usage, model: state.model, ts })
      }
    }
    if (row.type === 'last-prompt' && typeof row.lastPrompt === 'string' && !state.title) {
      state.title = extractUserTitle(row.lastPrompt)
    }
  }

  if (workspacePath && !cwdMatch) return null
  if (!state.title) state.title = sessionId.slice(0, 8)
  return state
}

function listProjectJsonlFiles() {
  if (!fs.existsSync(PROJECTS_ROOT)) return []
  const out = []
  for (const dirEnt of fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true })) {
    if (!dirEnt.isDirectory()) continue
    const dir = path.join(PROJECTS_ROOT, dirEnt.name)
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.jsonl')) out.push(path.join(dir, f))
    }
  }
  return out
}

export function listRecentClaudeProjectSessions({ workspacePath = null, limit = 12 } = {}) {
  const rows = []
  for (const fp of listProjectJsonlFiles()) {
    const row = scanJsonlFile(fp, workspacePath || null)
    if (!row) continue
    rows.push({
      sessionId: row.sessionId,
      title: row.title,
      model: row.model || '—',
      lastActivityMs: row.lastActivityMs,
      cwd: row.cwd,
      source: 'claude-jsonl',
    })
  }
  rows.sort((a, b) => b.lastActivityMs - a.lastActivityMs)
  return rows.slice(0, Math.max(1, limit))
}

export function aggregateClaudeProjectUsage({
  workspacePath = null,
  startMs = 0,
  endMs = Date.now(),
  tokenPricing = {},
} = {}) {
  let inputTokens = 0
  let outputTokens = 0
  let costUsd = 0
  let turns = 0
  let sessionsTouched = new Set()

  for (const fp of listProjectJsonlFiles()) {
    const sessionId = path.basename(fp, '.jsonl')
    let touched = false
    scanJsonlFile(fp, workspacePath || null, ({ usage, model, ts }) => {
      if (ts < startMs || ts > endMs) return
      touched = true
      turns += 1
      inputTokens += Number(usage.input_tokens ?? 0) + Number(usage.cache_read_input_tokens ?? 0)
      outputTokens += Number(usage.output_tokens ?? 0)
      costUsd += estimateUsageCostUsd(usage, model, tokenPricing)
    })
    if (touched) sessionsTouched.add(sessionId)
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costUsd,
    turns,
    sessionsInRange: sessionsTouched.size,
  }
}

export function getClaudeProjectsRoot() {
  return PROJECTS_ROOT
}
