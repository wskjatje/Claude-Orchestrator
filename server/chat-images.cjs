'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const VISION_MODEL_HINTS = ['vl', 'vision', 'llava', 'moondream', 'bakllava', 'minicpm-v', 'gemma3']

function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null
  const i = dataUrl.indexOf(',')
  if (i === -1) return null
  const header = dataUrl.slice(0, i)
  const b64 = dataUrl.slice(i + 1)
  const mimeMatch = header.match(/^data:([^;]+)/)
  const mime = mimeMatch?.[1] || 'image/png'
  try {
    return { mime, buffer: Buffer.from(b64, 'base64') }
  } catch {
    return null
  }
}

function extFromMime(mime) {
  const m = String(mime || '').toLowerCase()
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg'
  if (m.includes('webp')) return '.webp'
  if (m.includes('gif')) return '.gif'
  return '.png'
}

/**
 * @param {string} workspaceDir
 * @param {{ kind?: string; name?: string; mime?: string; dataUrl?: string }[]} attachments
 */
function saveChatImageAttachments(workspaceDir, attachments) {
  if (!workspaceDir || !Array.isArray(attachments) || !attachments.length) {
    return { ok: true, paths: [], saved: [] }
  }
  const dir = path.join(workspaceDir, '.claudecode', 'chat-images')
  fs.mkdirSync(dir, { recursive: true })
  /** @type {string[]} */
  const paths = []
  /** @type {string[]} */
  const saved = []
  for (const a of attachments) {
    if (a?.kind !== 'image') continue
    const parsed = dataUrlToBuffer(a.dataUrl || '')
    if (!parsed?.buffer?.length) continue
    const ext = extFromMime(a.mime || parsed.mime)
    const base = (a.name || 'screenshot').replace(/[^\w.\-]+/g, '_').slice(0, 48) || 'screenshot'
    const fname = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${base}${ext}`
    const abs = path.join(dir, fname)
    fs.writeFileSync(abs, parsed.buffer)
    const rel = `.claudecode/chat-images/${fname}`
    paths.push(rel)
    saved.push(rel)
  }
  return { ok: true, paths, saved }
}

function modelSupportsVision(name) {
  const n = String(name || '').toLowerCase()
  return VISION_MODEL_HINTS.some((h) => n.includes(h))
}

/**
 * Claude Code / Cursor：官方 Anthropic 与部分第三方 vision 模型可 inline 传图；
 * DeepSeek Anthropic 兼容端点不支持。
 * @param {string} modelId
 * @param {{ ANTHROPIC_BASE_URL?: string }} [env]
 */
function modelSupportsClaudeCodeVision(modelId, env = {}) {
  const base = String(env.ANTHROPIC_BASE_URL || '').toLowerCase()
  const m = String(modelId || '').trim().toLowerCase()
  if (/deepseek\.com/.test(base)) return false
  if (/^deepseek-|^qwen(?!.*vl)/i.test(m)) return false
  if (!base || /api\.anthropic\.com|claude\.ai/.test(base)) return true
  if (/generativelanguage|googleapis\.com.*gemini|google.*ai/.test(base)) return true
  return /claude|sonnet|opus|haiku|gemini|gpt-4o|gpt-4\.1|gpt-5|vision|vl/i.test(m)
}

/**
 * Anthropic Messages API content blocks（Claude Code stream-json stdin）
 * @param {string} text
 * @param {{ kind?: string; dataUrl?: string; mime?: string }[]} attachments
 */
function buildAnthropicContentBlocks(text, attachments) {
  /** @type {object[]} */
  const blocks = []
  const t = String(text || '').trim()
  if (t) blocks.push({ type: 'text', text: t })
  for (const a of attachments || []) {
    if (a?.kind !== 'image') continue
    const parsed = dataUrlToBuffer(a.dataUrl || '')
    if (!parsed?.buffer?.length) continue
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: parsed.mime || a.mime || 'image/png',
        data: parsed.buffer.toString('base64'),
      },
    })
  }
  if (!blocks.length) blocks.push({ type: 'text', text: ' ' })
  return blocks
}

/**
 * Claude Code `--input-format stream-json` 单轮 user 消息（Cursor 式 inline vision）
 * @param {string} text
 * @param {{ kind?: string; dataUrl?: string; mime?: string }[]} attachments
 */
function buildStreamJsonUserLine(text, attachments) {
  return (
    JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: buildAnthropicContentBlocks(text, attachments),
      },
    }) + '\n'
  )
}

/**
 * @param {string} base
 */
async function listOllamaModelTags(base) {
  const url = `${String(base || 'http://127.0.0.1:11434').replace(/\/$/, '')}/api/tags`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  const models = Array.isArray(data?.models) ? data.models : []
  return models.map((m) => String(m?.name || '').trim()).filter(Boolean)
}

function pickVisionModel(tags, preferred) {
  const pref = String(preferred || '').trim()
  if (pref && tags.includes(pref)) return pref
  for (const t of tags) {
    if (modelSupportsVision(t)) return t
  }
  return null
}

/**
 * @param {string} ollamaBase
 * @param {string} visionModel
 * @param {{ kind?: string; dataUrl?: string; name?: string }[]} attachments
 */
async function describeImagesWithOllama(ollamaBase, visionModel, attachments) {
  /** @type {string[]} */
  const parts = []
  let idx = 0
  for (const a of attachments || []) {
    if (a?.kind !== 'image') continue
    const parsed = dataUrlToBuffer(a.dataUrl || '')
    if (!parsed?.buffer?.length) continue
    idx += 1
    const b64 = parsed.buffer.toString('base64')
    const body = {
      model: visionModel,
      stream: false,
      messages: [
        {
          role: 'user',
          content:
            '请用简体中文详细描述这张截图中的可见内容：页面标题、URL、错误信息、按钮、表单、终端输出等。若是 HTTP 错误页请写出状态码与英文原文。不要编造看不见的内容。',
          images: [b64],
        },
      ],
    }
    const url = `${String(ollamaBase || 'http://127.0.0.1:11434').replace(/\/$/, '')}/api/chat`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120_000)
    let res
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    const text = await res.text()
    if (!res.ok) {
      parts.push(`【附图 ${idx}】视觉解析失败：HTTP ${res.status}`)
      continue
    }
    let data
    try {
      data = JSON.parse(text)
    } catch {
      parts.push(`【附图 ${idx}】视觉解析失败：非 JSON 响应`)
      continue
    }
    const desc = String(data?.message?.content || data?.response || '').trim()
    parts.push(`【附图 ${idx}${a.name ? ` · ${a.name}` : ''}】\n${desc || '（未能解析内容）'}`)
  }
  return parts.join('\n\n')
}

/**
 * @param {object} opts
 * @param {string} opts.ollamaBase
 * @param {string} opts.orchestratorModel
 * @param {string} [opts.visionModelHint]
 * @param {string} opts.userLine
 * @param {{ kind?: string; dataUrl?: string; name?: string; mime?: string }[]} [opts.attachments]
 */
async function enrichUserLineForImages(opts) {
  const attachments = Array.isArray(opts.attachments) ? opts.attachments : []
  if (!attachments.length) return { userLine: opts.userLine, images: [], visionModel: null }

  /** @type {string[]} */
  const images = []
  for (const a of attachments) {
    if (a?.kind !== 'image') continue
    const parsed = dataUrlToBuffer(a.dataUrl || '')
    if (parsed?.buffer?.length) images.push(parsed.buffer.toString('base64'))
  }
  if (!images.length) return { userLine: opts.userLine, images: [], visionModel: null }

  if (modelSupportsVision(opts.orchestratorModel)) {
    return { userLine: opts.userLine, images, visionModel: opts.orchestratorModel }
  }

  const tags = await listOllamaModelTags(opts.ollamaBase)
  const visionModel = pickVisionModel(tags, opts.visionModelHint)
  if (!visionModel) {
    return {
      userLine:
        `${opts.userLine}\n\n【系统·附图】用户附带了 ${attachments.length} 张截图，但当前编排模型（${opts.orchestratorModel}）不支持视觉，且未检测到本机视觉模型（可 ollama pull qwen2.5vl）。请根据用户文字说明作答，勿声称「无法查看图片」。`,
      images: [],
      visionModel: null,
    }
  }

  try {
    const desc = await describeImagesWithOllama(opts.ollamaBase, visionModel, attachments)
    return {
      userLine: `${opts.userLine}\n\n【系统·附图视觉解析（${visionModel}）】\n${desc}`,
      images: [],
      visionModel,
    }
  } catch (e) {
    return {
      userLine:
        `${opts.userLine}\n\n【系统·附图】视觉解析失败（${e?.message || e}）。请根据用户描述作答。`,
      images: [],
      visionModel: null,
    }
  }
}

function attachmentImagesForOllama(attachments) {
  /** @type {string[]} */
  const images = []
  for (const a of attachments || []) {
    if (a?.kind !== 'image') continue
    const parsed = dataUrlToBuffer(a.dataUrl || '')
    if (parsed?.buffer?.length) images.push(parsed.buffer.toString('base64'))
  }
  return images
}

module.exports = {
  saveChatImageAttachments,
  enrichUserLineForImages,
  attachmentImagesForOllama,
  modelSupportsVision,
  modelSupportsClaudeCodeVision,
  buildAnthropicContentBlocks,
  buildStreamJsonUserLine,
}
