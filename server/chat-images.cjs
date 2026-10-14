'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { pathToFileURL } = require('node:url')

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

function loadModelCapabilities() {
  return import(pathToFileURL(path.join(__dirname, 'model-capabilities.mjs')).href)
}

/**
 * 官方 Anthropic / 供应商 capabilities.vision（禁止模型名正则）
 * @param {string} modelId
 * @param {{ ANTHROPIC_BASE_URL?: string, providerName?: string }} [env]
 * @param {Record<string, unknown>} [settings]
 */
async function modelSupportsClaudeCodeVision(modelId, env = {}, settings = {}) {
  const { resolveModelCapabilities } = await loadModelCapabilities()
  const record = await resolveModelCapabilities({
    modelId: String(modelId || '').trim(),
    pool: 'cloud',
    providerName: String(env.providerName || ''),
    settings,
  })
  return record.capabilities?.vision === true
}

/**
 * @param {string} ollamaBase
 * @param {string} modelId
 * @param {Record<string, unknown>} [settings]
 */
async function modelSupportsOllamaVision(ollamaBase, modelId, settings = {}) {
  const { resolveModelCapabilities } = await loadModelCapabilities()
  const record = await resolveModelCapabilities({
    modelId: String(modelId || '').trim(),
    pool: 'local',
    ollamaBase,
    settings,
  })
  return record.capabilities?.vision === true
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
 * Claude Code `--input-format stream-json` 单轮 user 消息（inline vision）
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
 * @param {object} opts
 * @param {string} opts.ollamaBase
 * @param {string} opts.orchestratorModel
 * @param {string} [opts.visionModelHint]
 * @param {string} opts.userLine
 * @param {{ kind?: string; dataUrl?: string; name?: string; mime?: string }[]} [opts.attachments]
 * @param {Record<string, unknown>} [opts.settings]
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

  const { assertModelCanRun } = await loadModelCapabilities()
  const gate = await assertModelCanRun({
    modelId: opts.orchestratorModel,
    pool: 'local',
    needsVision: true,
    ollamaBase: opts.ollamaBase,
    settings: opts.settings || {},
  })
  if (!gate.ok) {
    return {
      userLine: opts.userLine,
      images: [],
      visionModel: null,
      error: gate.error,
    }
  }

  return { userLine: opts.userLine, images, visionModel: opts.orchestratorModel }
}

module.exports = {
  saveChatImageAttachments,
  modelSupportsClaudeCodeVision,
  modelSupportsOllamaVision,
  buildAnthropicContentBlocks,
  buildStreamJsonUserLine,
  enrichUserLineForImages,
  dataUrlToBuffer,
}
