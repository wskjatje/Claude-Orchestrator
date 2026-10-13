/**
 * 工作区结构索引检索：只读 graphify-out/graph.json。
 * 按节点 file_type 加权（code > 其他）；无匹配/无图返回明确错误。
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadWorkspace } from './store.mjs'

/**
 * @param {{ query?: string, budget?: number }} body
 * @returns {{ ok: boolean, markdown?: string, files?: string[], source?: 'json', error?: string }}
 */
export function workspaceGraphifyQuery(body) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const query = String(body?.query || '').trim()
  if (!query || query.length < 2) return { ok: false, error: '检索词过短' }
  const budget = Math.min(4000, Math.max(400, Number(body?.budget) || 2000))
  const graphPath = path.join(path.resolve(workspaceDir), 'graphify-out', 'graph.json')
  if (!fs.existsSync(graphPath)) {
    return { ok: false, error: '无结构索引（graphify-out/graph.json）。请先构建图谱。' }
  }
  const needsUpdate = fs.existsSync(path.join(path.dirname(graphPath), '.needs_update'))
  return queryGraphJson(graphPath, query, budget, needsUpdate)
}

/**
 * @param {string} graphPath
 * @param {string} query
 * @param {number} budget
 * @param {boolean} needsUpdate
 */
function queryGraphJson(graphPath, query, budget, needsUpdate) {
  let data
  try {
    data = JSON.parse(fs.readFileSync(graphPath, 'utf8'))
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  const nodes = Array.isArray(data.nodes) ? data.nodes : []
  const links = Array.isArray(data.links) ? data.links : Array.isArray(data.edges) ? data.edges : []
  if (!nodes.length) return { ok: false, error: '图谱为空' }

  const tokens = tokenize(query)
  if (!tokens.length) return { ok: false, error: '无有效检索词' }

  /** @type {Map<string, any>} */
  const byId = new Map()
  for (const n of nodes) {
    if (n?.id) byId.set(String(n.id), n)
  }

  /** @type {Map<string, string[]>} */
  const adj = new Map()
  for (const e of links) {
    const s = String(e.source ?? e.from ?? '')
    const t = String(e.target ?? e.to ?? '')
    if (!s || !t) continue
    if (!adj.has(s)) adj.set(s, [])
    if (!adj.has(t)) adj.set(t, [])
    adj.get(s).push(t)
    adj.get(t).push(s)
  }

  const scored = []
  for (const n of nodes) {
    const label = String(n.label || n.norm_label || n.id || '').toLowerCase()
    const src = String(n.source_file || '').toLowerCase()
    const ft = String(n.file_type || '').toLowerCase()
    let score = 0
    for (const tok of tokens) {
      if (label.includes(tok)) score += tok.length >= 4 ? 3 : 2
      if (src.includes(tok)) score += 1.5
    }
    if (score <= 0) continue
    if (ft === 'code') score *= 1.35
    else if (ft === 'document' || ft === 'doc') score *= 0.55
    scored.push({ n, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const seeds = scored.slice(0, 5).map((x) => x.n)
  if (!seeds.length) {
    return { ok: false, error: `无匹配：${query}`, source: 'json' }
  }

  const visited = new Set()
  const queue = []
  for (const s of seeds) {
    queue.push({ id: String(s.id), depth: 0 })
    visited.add(String(s.id))
  }
  const kept = []
  while (queue.length && kept.length < 80) {
    const { id, depth } = queue.shift()
    const n = byId.get(id)
    if (!n) continue
    kept.push({ n, depth })
    if (depth >= 2) continue
    for (const nb of adj.get(id) || []) {
      if (visited.has(nb)) continue
      visited.add(nb)
      queue.push({ id: nb, depth: depth + 1 })
    }
  }

  const files = []
  const fileSet = new Set()
  const lines = []
  if (needsUpdate) lines.push('【结构索引陈旧】', '')
  lines.push(`【图谱检索】${query}`, '')
  let chars = 0
  for (const { n, depth } of kept) {
    const file = String(n.source_file || '').replace(/\\/g, '/')
    const label = String(n.label || n.id || '')
    const loc = n.source_location ? ` ${n.source_location}` : ''
    const row = `${'  '.repeat(depth)}- ${label}${file ? ` · ${file}${loc}` : ''}`
    if (chars + row.length > budget) break
    lines.push(row)
    chars += row.length + 1
    if (file && !fileSet.has(file)) {
      fileSet.add(file)
      files.push(file)
    }
  }

  return {
    ok: true,
    markdown: lines.join('\n').slice(0, 8000),
    files: files.slice(0, 40),
    source: 'json',
    needsUpdate,
  }
}

function tokenize(q) {
  const raw = q.toLowerCase()
  const parts = raw.match(/[a-z0-9_\u4e00-\u9fff]{2,}/g) || []
  return [...new Set(parts)].slice(0, 16)
}
