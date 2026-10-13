/**
 * 本地代码语义索引（检索底座）。
 * 存储：工作区 `.claudecode/code-index/`
 * 检索：BM25 必开；若 Ollama embeddings 可用则 hybrid（BM25 + cosine）。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { loadChatSettings, loadWorkspace } from './store.mjs'

const INDEX_DIR = '.claudecode/code-index'
const CHUNK_LINES = 40
const CHUNK_OVERLAP = 8
const MAX_FILE_BYTES = 256 * 1024
const MAX_CHUNKS = 12_000
const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.md', '.json',
  '.css', '.html', '.vue', '.svelte', '.yaml', '.yml', '.toml', '.sh', '.c', '.h', '.cpp',
])

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'dist-electron', 'graphify-out', '.claudecode',
  'coverage', 'build', '.next', 'out', 'vendor', '__pycache__', '.venv', 'venv',
])

/**
 * @returns {{ ok: boolean, root?: string, indexDir?: string, error?: string }}
 */
function resolveIndexRoot() {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(workspaceDir)
  const indexDir = path.join(root, INDEX_DIR)
  return { ok: true, root, indexDir }
}

function tokenize(text) {
  const raw = String(text || '').toLowerCase()
  const parts = raw.match(/[a-z0-9_\u4e00-\u9fff]{2,}/g) || []
  return parts.slice(0, 4000)
}

function walkFiles(root) {
  /** @type {string[]} */
  const out = []
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      const name = ent.name
      if (name.startsWith('.') && name !== '.cursor') continue
      const abs = path.join(dir, name)
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(name)) continue
        walk(abs)
        continue
      }
      if (!ent.isFile()) continue
      const ext = path.extname(name).toLowerCase()
      if (!TEXT_EXTS.has(ext)) continue
      try {
        const st = fs.statSync(abs)
        if (st.size > MAX_FILE_BYTES) continue
      } catch {
        continue
      }
      out.push(abs)
      if (out.length >= 4000) return
    }
  }
  walk(root)
  return out
}

function chunkFile(relPath, text) {
  const lines = text.split('\n')
  /** @type {{ id: string, relPath: string, startLine: number, endLine: number, text: string }[]} */
  const chunks = []
  for (let i = 0; i < lines.length; i += CHUNK_LINES - CHUNK_OVERLAP) {
    const slice = lines.slice(i, i + CHUNK_LINES)
    if (!slice.some((l) => l.trim())) continue
    const startLine = i + 1
    const endLine = i + slice.length
    const body = slice.join('\n')
    const id = crypto.createHash('sha1').update(`${relPath}:${startLine}:${body}`).digest('hex').slice(0, 16)
    chunks.push({ id, relPath, startLine, endLine, text: body.slice(0, 4000) })
    if (i + CHUNK_LINES >= lines.length) break
  }
  return chunks
}

function buildBm25(chunks) {
  const N = chunks.length
  const df = new Map()
  const docs = chunks.map((c) => {
    const toks = tokenize(c.text)
    const tf = new Map()
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1)
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1)
    return { id: c.id, tf, len: toks.length || 1 }
  })
  let avgLen = 0
  for (const d of docs) avgLen += d.len
  avgLen = avgLen / Math.max(1, N)
  return { N, df, docs, avgLen, k1: 1.2, b: 0.75 }
}

function bm25Score(index, queryTokens, doc) {
  const { N, df, avgLen, k1, b } = index
  let score = 0
  const qtf = new Map()
  for (const t of queryTokens) qtf.set(t, (qtf.get(t) || 0) + 1)
  for (const [t, qf] of qtf) {
    const f = doc.tf.get(t) || 0
    if (!f) continue
    const n = df.get(t) || 0
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
    const denom = f + k1 * (1 - b + b * (doc.len / avgLen))
    score += idf * ((f * (k1 + 1)) / denom) * (1 + Math.log(1 + qf))
  }
  return score
}

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

async function embedTexts(ollamaBase, model, texts) {
  const base = String(ollamaBase || 'http://127.0.0.1:11434').replace(/\/$/, '')
  /** @type {number[][]} */
  const vectors = []
  for (const text of texts) {
    try {
      const res = await fetch(`${base}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text.slice(0, 6000) }),
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) {
        vectors.push([])
        continue
      }
      const data = await res.json()
      const emb = data?.embedding || data?.embeddings?.[0]
      vectors.push(Array.isArray(emb) ? emb.map(Number) : [])
    } catch {
      vectors.push([])
    }
  }
  return vectors
}

/**
 * 构建/增量更新索引。
 * @param {{ embed?: boolean, embedModel?: string }} [opts]
 */
export async function buildCodeIndex(opts = {}) {
  const resolved = resolveIndexRoot()
  if (!resolved.ok) return { ok: false, error: resolved.error }
  const { root, indexDir } = resolved
  fs.mkdirSync(indexDir, { recursive: true })

  const absFiles = walkFiles(root)
  /** @type {ReturnType<typeof chunkFile>} */
  const chunks = []
  for (const abs of absFiles) {
    const rel = path.relative(root, abs).replace(/\\/g, '/')
    let text
    try {
      text = fs.readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    if (!text.trim()) continue
    chunks.push(...chunkFile(rel, text))
    if (chunks.length >= MAX_CHUNKS) break
  }

  const bm25 = buildBm25(chunks)
  const settings = loadChatSettings()
  const ollamaBase = settings?.ollamaBase || 'http://127.0.0.1:11434'
  const embedModel = opts.embedModel || settings?.codeIndexEmbedModel || 'nomic-embed-text'
  const wantEmbed = opts.embed !== false

  /** @type {Record<string, number[]>} */
  let vectors = {}
  let embedOk = false
  if (wantEmbed && chunks.length) {
    // 分批，避免打爆本地 Ollama
    const batch = 8
    for (let i = 0; i < Math.min(chunks.length, 800); i += batch) {
      const slice = chunks.slice(i, i + batch)
      const vecs = await embedTexts(
        ollamaBase,
        embedModel,
        slice.map((c) => `${c.relPath}\n${c.text}`),
      )
      for (let j = 0; j < slice.length; j++) {
        if (vecs[j]?.length) {
          vectors[slice[j].id] = vecs[j]
          embedOk = true
        }
      }
    }
  }

  const manifest = {
    version: 1,
    builtAt: Date.now(),
    chunkCount: chunks.length,
    fileCount: absFiles.length,
    embedModel: embedOk ? embedModel : null,
    ollamaBase: embedOk ? ollamaBase : null,
    hybrid: embedOk,
  }

  fs.writeFileSync(path.join(indexDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(
    path.join(indexDir, 'chunks.json'),
    JSON.stringify(chunks.map(({ id, relPath, startLine, endLine, text }) => ({
      id, relPath, startLine, endLine, text,
    }))),
  )
  fs.writeFileSync(path.join(indexDir, 'bm25.json'), JSON.stringify({
    N: bm25.N,
    avgLen: bm25.avgLen,
    k1: bm25.k1,
    b: bm25.b,
    df: Object.fromEntries(bm25.df),
    docs: bm25.docs.map((d) => ({
      id: d.id,
      len: d.len,
      tf: Object.fromEntries(d.tf),
    })),
  }))
  if (embedOk) {
    fs.writeFileSync(path.join(indexDir, 'vectors.json'), JSON.stringify(vectors))
  } else if (fs.existsSync(path.join(indexDir, 'vectors.json'))) {
    fs.unlinkSync(path.join(indexDir, 'vectors.json'))
  }

  return {
    ok: true,
    chunkCount: chunks.length,
    fileCount: absFiles.length,
    hybrid: embedOk,
    embedModel: embedOk ? embedModel : null,
  }
}

/**
 * 写盘后增量更新指定相对路径（真实重分块 + 可选重嵌入）。
 * @param {string[]} relPaths
 */
export async function updateCodeIndexForFiles(relPaths) {
  const resolved = resolveIndexRoot()
  if (!resolved.ok) return { ok: false, error: resolved.error }
  const { root, indexDir } = resolved
  const paths = [...new Set((relPaths || []).map((p) => String(p || '').replace(/\\/g, '/')).filter(Boolean))]
  if (!paths.length) return { ok: true, updated: 0 }

  let packed = loadIndex(indexDir)
  if (!packed) {
    return buildCodeIndex({ embed: true })
  }

  const remove = new Set(paths)
  let chunks = packed.chunks.filter((c) => !remove.has(c.relPath))
  /** @type {Record<string, number[]>} */
  const vectors = { ...packed.vectors }
  for (const id of Object.keys(vectors)) {
    const pref = `${paths.find((p) => id.startsWith(p.replace(/[^a-zA-Z0-9]+/g, '_'))) || ''}`
    void pref
  }
  for (const id of Object.keys(vectors)) {
    const chunk = packed.chunks.find((c) => c.id === id)
    if (chunk && remove.has(chunk.relPath)) delete vectors[id]
  }

  /** @type {typeof chunks} */
  const fresh = []
  for (const rel of paths) {
    const abs = path.resolve(root, rel)
    if (!abs.startsWith(root) || !fs.existsSync(abs)) continue
    const ext = path.extname(rel).toLowerCase()
    if (!TEXT_EXTS.has(ext)) continue
    let text
    try {
      text = fs.readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    if (!text.trim()) continue
    fresh.push(...chunkFile(rel, text))
  }
  chunks = [...chunks, ...fresh].slice(0, MAX_CHUNKS)
  const bm25 = buildBm25(chunks)

  const settings = loadChatSettings()
  const wantEmbed = Boolean(packed.manifest?.hybrid)
  let embedOk = wantEmbed
  if (wantEmbed && fresh.length) {
    const ollamaBase = packed.manifest?.ollamaBase || settings?.ollamaBase || 'http://127.0.0.1:11434'
    const embedModel = packed.manifest?.embedModel || settings?.codeIndexEmbedModel || 'nomic-embed-text'
    const batch = 8
    for (let i = 0; i < fresh.length; i += batch) {
      const slice = fresh.slice(i, i + batch)
      const vecs = await embedTexts(
        ollamaBase,
        embedModel,
        slice.map((c) => `${c.relPath}\n${c.text}`),
      )
      for (let j = 0; j < slice.length; j++) {
        if (vecs[j]?.length) vectors[slice[j].id] = vecs[j]
        else embedOk = embedOk && Boolean(vectors[slice[j].id])
      }
    }
  }

  const manifest = {
    ...(packed.manifest || {}),
    version: 1,
    builtAt: Date.now(),
    chunkCount: chunks.length,
    updatedPaths: paths,
    hybrid: Boolean(wantEmbed && Object.keys(vectors).length),
  }

  fs.mkdirSync(indexDir, { recursive: true })
  fs.writeFileSync(path.join(indexDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(
    path.join(indexDir, 'chunks.json'),
    JSON.stringify(
      chunks.map(({ id, relPath, startLine, endLine, text }) => ({
        id,
        relPath,
        startLine,
        endLine,
        text,
      })),
    ),
  )
  fs.writeFileSync(
    path.join(indexDir, 'bm25.json'),
    JSON.stringify({
      N: bm25.N,
      avgLen: bm25.avgLen,
      k1: bm25.k1,
      b: bm25.b,
      df: Object.fromEntries(bm25.df),
      docs: bm25.docs.map((d) => ({
        id: d.id,
        len: d.len,
        tf: Object.fromEntries(d.tf),
      })),
    }),
  )
  if (manifest.hybrid) {
    fs.writeFileSync(path.join(indexDir, 'vectors.json'), JSON.stringify(vectors))
  }

  return { ok: true, updated: paths.length, chunkCount: chunks.length, hybrid: manifest.hybrid }
}

function loadIndex(indexDir) {
  const chunksPath = path.join(indexDir, 'chunks.json')
  const bm25Path = path.join(indexDir, 'bm25.json')
  if (!fs.existsSync(chunksPath) || !fs.existsSync(bm25Path)) return null
  const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf8'))
  const bm25Raw = JSON.parse(fs.readFileSync(bm25Path, 'utf8'))
  const bm25 = {
    N: bm25Raw.N,
    avgLen: bm25Raw.avgLen,
    k1: bm25Raw.k1 || 1.2,
    b: bm25Raw.b || 0.75,
    df: new Map(Object.entries(bm25Raw.df || {})),
    docs: (bm25Raw.docs || []).map((d) => ({
      id: d.id,
      len: d.len,
      tf: new Map(Object.entries(d.tf || {})),
    })),
  }
  /** @type {Record<string, number[]>} */
  let vectors = {}
  const vp = path.join(indexDir, 'vectors.json')
  if (fs.existsSync(vp)) {
    try {
      vectors = JSON.parse(fs.readFileSync(vp, 'utf8'))
    } catch {
      vectors = {}
    }
  }
  const manifest = fs.existsSync(path.join(indexDir, 'manifest.json'))
    ? JSON.parse(fs.readFileSync(path.join(indexDir, 'manifest.json'), 'utf8'))
    : {}
  return { chunks, bm25, vectors, manifest }
}

/**
 * @param {{ query?: string, maxResults?: number, boostPaths?: string[] }} body
 */
export async function searchCodeIndex(body) {
  const resolved = resolveIndexRoot()
  if (!resolved.ok) return { ok: false, hits: [], error: resolved.error }
  const { indexDir } = resolved
  const query = String(body?.query || '').trim()
  if (query.length < 2) return { ok: false, hits: [], error: '检索词过短' }

  let packed = loadIndex(indexDir)
  if (!packed) {
    const built = await buildCodeIndex({ embed: true })
    if (!built.ok) return { ok: false, hits: [], error: built.error || '索引构建失败' }
    packed = loadIndex(indexDir)
  }
  if (!packed) return { ok: false, hits: [], error: '索引不可用' }

  const { chunks, bm25, vectors, manifest } = packed
  const qTokens = tokenize(query)
  const boost = new Set((body?.boostPaths || []).map((p) => String(p).replace(/\\/g, '/')))
  const byId = new Map(chunks.map((c) => [c.id, c]))

  /** @type {{ id: string, score: number }[]} */
  const scored = []
  for (const doc of bm25.docs) {
    let score = bm25Score(bm25, qTokens, doc)
    const chunk = byId.get(doc.id)
    if (chunk && (boost.has(chunk.relPath) || [...boost].some((b) => chunk.relPath.endsWith('/' + b)))) {
      score += 2.5
    }
    if (score > 0) scored.push({ id: doc.id, score })
  }
  scored.sort((a, b) => b.score - a.score)

  // hybrid：query embedding
  if (manifest?.hybrid && Object.keys(vectors).length) {
    const settings = loadChatSettings()
    const ollamaBase = manifest.ollamaBase || settings?.ollamaBase || 'http://127.0.0.1:11434'
    const model = manifest.embedModel || 'nomic-embed-text'
    const [qVec] = await embedTexts(ollamaBase, model, [query])
    if (qVec?.length) {
      for (const s of scored.slice(0, 200)) {
        const v = vectors[s.id]
        if (!v?.length) continue
        s.score = s.score * 0.55 + cosine(qVec, v) * 12
      }
      scored.sort((a, b) => b.score - a.score)
    }
  }

  const maxResults = Math.min(40, Math.max(1, Number(body?.maxResults) || 20))
  const hits = []
  const seenFile = new Map()
  for (const s of scored) {
    const c = byId.get(s.id)
    if (!c) continue
    const n = seenFile.get(c.relPath) || 0
    if (n >= 3) continue
    seenFile.set(c.relPath, n + 1)
    hits.push({
      relPath: c.relPath,
      line: c.startLine,
      endLine: c.endLine,
      text: c.text.split('\n')[0]?.slice(0, 200) || '',
      snippet: c.text.slice(0, 500),
      score: Number(s.score.toFixed(4)),
    })
    if (hits.length >= maxResults) break
  }

  return {
    ok: true,
    hits,
    hybrid: Boolean(manifest?.hybrid),
    chunkCount: chunks.length,
  }
}

export function codeIndexStatus() {
  const resolved = resolveIndexRoot()
  if (!resolved.ok) return { ok: false, error: resolved.error }
  const { indexDir } = resolved
  const mp = path.join(indexDir, 'manifest.json')
  if (!fs.existsSync(mp)) return { ok: true, ready: false }
  try {
    const manifest = JSON.parse(fs.readFileSync(mp, 'utf8'))
    return { ok: true, ready: true, ...manifest }
  } catch {
    return { ok: true, ready: false }
  }
}
