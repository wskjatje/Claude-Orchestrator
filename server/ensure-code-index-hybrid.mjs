/**
 * 确保本地语义索引 hybrid（BM25 + Ollama embeddings）可用：启动 Ollama、拉取模型、重建索引。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { loadChatSettings } from './store.mjs'
import { buildCodeIndex, codeIndexStatus } from './code-index.mjs'

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('error', (e) => resolve({ ok: false, stdout, stderr: e.message }))
    child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr, code }))
  })
}

async function ollamaReachable(base) {
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    })
    return res.ok
  } catch {
    return false
  }
}

function resolveOllamaBin() {
  const cands = ['/usr/local/bin/ollama', '/opt/homebrew/bin/ollama', 'ollama']
  for (const c of cands) {
    if (c === 'ollama') return c
    if (fs.existsSync(c)) return c
  }
  return 'ollama'
}

async function ensureOllamaServing(base) {
  if (await ollamaReachable(base)) return { ok: true, started: false }
  const bin = resolveOllamaBin()
  // 后台启动；不阻塞安装会话
  try {
    const child = spawn(bin, ['serve'], {
      detached: true,
      stdio: 'ignore',
      env: process.env,
    })
    child.unref()
  } catch (e) {
    return {
      ok: false,
      error: `无法启动 Ollama：${e instanceof Error ? e.message : String(e)}`,
    }
  }
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500))
    if (await ollamaReachable(base)) return { ok: true, started: true }
  }
  return { ok: false, error: 'Ollama 已尝试启动但仍不可达（检查 /usr/local/bin/ollama）' }
}

async function ensureEmbedModel(base, model) {
  const tags = await fetch(`${base.replace(/\/$/, '')}/api/tags`, {
    signal: AbortSignal.timeout(10_000),
  }).then((r) => r.json()).catch(() => null)
  const names = (tags?.models || []).map((m) => String(m.name || m.model || ''))
  const has = names.some((n) => n === model || n.startsWith(`${model}:`) || n.startsWith(model))
  if (has) return { ok: true, pulled: false }
  const bin = resolveOllamaBin()
  const pull = await run(bin, ['pull', model], { timeout: 600_000 })
  if (!pull.ok) {
    // HTTP pull 备用
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
        signal: AbortSignal.timeout(600_000),
      })
      if (!res.ok) {
        return {
          ok: false,
          error: `拉取嵌入模型失败：${(pull.stderr || pull.stdout || res.statusText).slice(0, 300)}`,
        }
      }
      return { ok: true, pulled: true }
    } catch (e) {
      return {
        ok: false,
        error: `拉取嵌入模型失败：${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }
  return { ok: true, pulled: true }
}

/**
 * 确保 hybrid 索引就绪（真实 embeddings）。
 */
export async function ensureCodeIndexHybrid(opts = {}) {
  const settings = loadChatSettings()
  const base = String(opts.ollamaBase || settings?.ollamaBase || 'http://127.0.0.1:11434')
  const model = String(opts.embedModel || settings?.codeIndexEmbedModel || 'nomic-embed-text')

  const serve = await ensureOllamaServing(base)
  if (!serve.ok) {
    return { ok: false, hybrid: false, error: serve.error, status: codeIndexStatus() }
  }

  const pulled = await ensureEmbedModel(base, model)
  if (!pulled.ok) {
    return { ok: false, hybrid: false, error: pulled.error, ollamaStarted: serve.started }
  }

  // 冒烟 embeddings
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: 'code index hybrid probe' }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return {
        ok: false,
        hybrid: false,
        error: `embeddings API 失败 ${res.status}: ${t.slice(0, 200)}`,
      }
    }
    const data = await res.json()
    if (!Array.isArray(data?.embedding) && !data?.embeddings?.[0]) {
      return { ok: false, hybrid: false, error: 'embeddings 返回为空' }
    }
  } catch (e) {
    return {
      ok: false,
      hybrid: false,
      error: `embeddings 探测失败：${e instanceof Error ? e.message : String(e)}`,
    }
  }

  const built = await buildCodeIndex({ embed: true, embedModel: model })
  if (!built.ok) {
    return { ok: false, hybrid: false, error: built.error || '索引构建失败', ollamaStarted: serve.started }
  }
  return {
    ok: true,
    hybrid: Boolean(built.hybrid),
    chunkCount: built.chunkCount,
    fileCount: built.fileCount,
    embedModel: model,
    ollamaStarted: serve.started,
    modelPulled: pulled.pulled,
    status: codeIndexStatus(),
  }
}
