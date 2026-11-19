'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { appendWorkspaceArtifactLog } = require('./vendor/cad/memory-cross-agent')
const {
  resolveSafeWorkspacePath,
  applyTextEdit,
} = require('./edit-engine.cjs')
const {
  defaultArtifactPathForAgent,
  buildAgentArtifactPathHint,
} = require('./agent-artifact-paths.cjs')

/** 持久化到会话的 before/after 上限（过大则省略，Undo 靠本会话内存 checkpoint） */
const PATCH_CHAR_CAP = 120_000
const ROLLBACK_SNAPSHOT_CHAR_CAP = 8_000_000

function workspaceWritePatchPreview(before, after) {
  const left = String(before ?? '')
  const right = String(after ?? '')
  if (left.length <= PATCH_CHAR_CAP && right.length <= PATCH_CHAR_CAP) {
    return { before: left, after: right, beforeTruncated: false, afterTruncated: false }
  }
  let prefix = 0
  const commonLimit = Math.min(left.length, right.length)
  while (prefix < commonLimit && left.charCodeAt(prefix) === right.charCodeAt(prefix)) prefix += 1
  let suffix = 0
  while (
    suffix < left.length - prefix &&
    suffix < right.length - prefix &&
    left.charCodeAt(left.length - suffix - 1) === right.charCodeAt(right.length - suffix - 1)
  ) suffix += 1
  let start = Math.max(0, prefix - 2_000)
  const newline = left.lastIndexOf('\n', start)
  if (newline >= 0) start = newline + 1
  const leftEnd = Math.min(left.length, left.length - suffix + 2_000)
  const rightEnd = Math.min(right.length, right.length - suffix + 2_000)
  const beforeEnd = Math.min(leftEnd, start + PATCH_CHAR_CAP)
  const afterEnd = Math.min(rightEnd, start + PATCH_CHAR_CAP)
  const omittedBefore = start > 0 ? `…（前文省略，约 ${start} 字符）…\n` : ''
  const omittedAfter = (end, total) =>
    end < total ? `\n…（后文省略，约 ${total - end} 字符）…` : ''
  return {
    before: omittedBefore + left.slice(start, beforeEnd) + omittedAfter(beforeEnd, left.length),
    after: omittedBefore + right.slice(start, afterEnd) + omittedAfter(afterEnd, right.length),
    beforeTruncated: start > 0 || beforeEnd < left.length,
    afterTruncated: start > 0 || afterEnd < right.length,
  }
}

function applyWorkspaceWriteFenceItems(workspaceDir, items) {
  const written = []
  const errors = []
  /** @type {Array<{ path: string, before?: string, after?: string, checkpointBefore?: string, beforeTruncated?: boolean, afterTruncated?: boolean, isNewFile?: boolean }>} */
  const patches = []
  for (const item of items) {
    // Cursor 契约：须显式 path；content|contents；禁止 file/filePath 别名兜底
    const rel = typeof item?.path === 'string' ? item.path : ''
    const contentRaw =
      item?.content != null ? item.content : item?.contents != null ? item.contents : null
    const content = contentRaw != null ? String(contentRaw) : ''
    try {
      const result = applyTextEdit({
        workspaceRoot: workspaceDir,
        path: rel,
        content,
        snapshotCharCap: ROLLBACK_SNAPSHOT_CHAR_CAP,
      })
      if (!result.ok) {
        errors.push(`${rel || '?'}: ${result.error || '写入失败'}`)
        continue
      }
      const { before, isNewFile } = result
      const norm = rel.replace(/\\/g, '/')
      written.push(norm)
      patches.push({
        path: norm,
        ...workspaceWritePatchPreview(before, content),
        checkpointBefore: isNewFile ? '' : before,
        isNewFile,
      })
    } catch (e) {
      errors.push(`${rel || '?'}: ${e?.message || String(e)}`)
    }
  }
  if (written.length > 0) {
    appendWorkspaceArtifactLog(written, workspaceDir)
    // 追加写盘日志供 node-status-tracker 使用
    try {
      const logPath = path.join(workspaceDir, 'graphify-out', '.chain_writes.log')
      fs.mkdirSync(path.dirname(logPath), { recursive: true })
      const line = `[${new Date().toISOString()}] ${written.join(', ')}\n`
      fs.appendFileSync(logPath, line, 'utf8')
    } catch (e) {
      console.warn('[workspace-write] 写盘日志追加失败', e?.message || e)
    }
    // 写盘后失效 TS Language Service 缓冲（异步，不挡写盘返回）
    void import('./workspace-tsservice.mjs')
      .then((m) => m.invalidateTsSnapshotsForPaths(written))
      .catch((e) => {
        console.warn('[workspace-write] TS 快照失效失败', e?.message || e)
      })
  }
  return {
    ok: written.length > 0,
    written,
    errors: errors.length ? errors : undefined,
    patches,
  }
}

function findTopLevelJsonEnd(s, start) {
  let i = start
  while (i < s.length && /\s/.test(s[i])) i++
  const c0 = s[i]
  if (c0 !== '{' && c0 !== '[') return -1
  let depth = 0
  let inStr = false
  let esc = false
  for (; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) {
        esc = false
        continue
      }
      if (c === '\\') {
        esc = true
        continue
      }
      if (c === '"') {
        inStr = false
        continue
      }
      continue
    }
    if (c === '"') {
      inStr = true
      continue
    }
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return -1
}

const WORKSPACE_WRITE_FENCE_OPEN = /(?:```|''')\s*`?\s*workspace-write\s*`?\s*\n?/gi

function findWorkspaceWriteBlocks(text) {
  const blocks = []
  const openRe = new RegExp(WORKSPACE_WRITE_FENCE_OPEN.source, 'gi')
  let searchFrom = 0
  let m
  while (true) {
    openRe.lastIndex = searchFrom
    m = openRe.exec(text)
    if (!m) break
    const bodyStart = m.index + m[0].length
    const relJson = text.slice(bodyStart).search(/[{\[]/)
    if (relJson === -1) {
      searchFrom = m.index + 1
      continue
    }
    const absJsonStart = bodyStart + relJson
    const jsonEnd = findTopLevelJsonEnd(text, absJsonStart)
    if (jsonEnd === -1) {
      searchFrom = m.index + 1
      continue
    }
    let outerEnd = jsonEnd
    while (outerEnd < text.length && /\s/.test(text[outerEnd])) outerEnd++
    const tail = text.slice(outerEnd)
    const closeFence = tail.match(/^(?:```|''')/)
    if (closeFence) outerEnd += closeFence[0].length
    blocks.push({ json: text.slice(absJsonStart, jsonEnd).trim() })
    searchFrom = outerEnd
  }
  return blocks
}

function parseWorkspaceWriteFences(text) {
  if (!text || typeof text !== 'string') return []
  const out = []
  for (const { json: chunk } of findWorkspaceWriteBlocks(text)) {
    try {
      const parsed = JSON.parse(chunk)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') out.push(item)
        }
      } else if (parsed && typeof parsed === 'object') {
        out.push(parsed)
      }
    } catch {
      /* ignore */
    }
  }
  return out
}

function extractMarkdownPaths(text) {
  if (!text || typeof text !== 'string') return []
  const pathRegex = /`([a-zA-Z0-9_.\\/-]+)\.(md|py|js|ts|tsx|jsx|json|txt|yml|yaml|html|css|sql|go|rs|java|kt|swift|rb|php|vue|svelte|sh|toml|cjs|mjs)`/gi
  const paths = new Set()
  let match
  while ((match = pathRegex.exec(text)) !== null) {
    const fullPath = `${match[1]}.${match[2]}`.replace(/\\/g, '/')
    if (!fullPath.includes('..') && fullPath.includes('/')) paths.add(fullPath)
  }
  return Array.from(paths)
}

function extractInvolvedSectionPaths(text) {
  if (!text || typeof text !== 'string') return []
  const m = text.match(/###\s*涉及文件路径[\s\S]*?(?=\n###|\n【|$)/i)
  if (!m) return []
  return extractMarkdownPaths(m[0])
}

function stripFakeWorkspaceWriteClaims(text) {
  let out = String(text || '')
  out = out.replace(/\n*【工作区已写入】[\s\S]*$/u, '').trim()
  out = out.replace(/\n*###\s*产物写盘[\s\S]*?(?=\n###|\n【|$)/gi, '').trim()
  out = out.replace(/\n*【未落盘】[\s\S]*$/u, '').trim()
  return out
}

/** Cursor 契约：仅 ```workspace-write``` JSON（显式 path + content|contents）；禁止代码块猜路径。 */
function normalizeFenceWriteItem(it) {
  if (!it || typeof it !== 'object') return null
  if (typeof it.path !== 'string') return null
  const p = it.path.trim().replace(/\\/g, '/')
  if (!p || p.includes('..')) return null
  const contentRaw = it.content != null ? it.content : it.contents != null ? it.contents : null
  if (contentRaw == null) return null
  return { path: p, content: String(contentRaw) }
}

function collectWritableItemsFromText(body, _meta) {
  const fenceItems = parseWorkspaceWriteFences(body)
    .map(normalizeFenceWriteItem)
    .filter((it) => it && String(it.content).trim().length > 0)
  return fenceItems
}

/**
 * 从多条助手回复批量落盘；同路径后者覆盖前者。不写入 chain-steps 摘要。
 * @param {string[]} texts
 * @param {string} workspaceDir
 * @param {object} [meta]
 */
function bulkIngestAssistantTexts(texts, workspaceDir, meta) {
  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区或工作区不存在', written: [], displayText: '' }
  }
  const list = Array.isArray(texts) ? texts : []
  const allClaimed = new Set()
  const merged = new Map()
  let scanned = 0

  for (const raw of list) {
    const text = stripFakeWorkspaceWriteClaims(String(raw || ''))
    if (!text.trim() || text.trim() === '__WAITING__') continue
    scanned++
    for (const p of extractInvolvedSectionPaths(text)) allClaimed.add(p.replace(/\\/g, '/'))
    for (const it of collectWritableItemsFromText(text, meta)) {
      const p = String(it?.path || '').replace(/\\/g, '/')
      if (!p || p.includes('..')) continue
      merged.set(p, it)
    }
  }

  if (!merged.size) {
    const missingNote = buildMissingWriteNotice([...allClaimed], [])
    return {
      ok: false,
      error:
        missingNote ||
        '未在会话历史中找到合法 ```workspace-write``` JSON（须显式 path+content|contents；已禁止代码块猜路径）',
      written: [],
      scanned,
      displayText: missingNote || '',
      missingWriteFence: true,
    }
  }

  const r = applyWorkspaceWriteFenceItems(workspaceDir, [...merged.values()])
  const missingNote = buildMissingWriteNotice([...allClaimed], r.written || [])
  const written = r.written || []
  const listLines = written.map((p) => `- \`${p}\``).join('\n')
  const summary =
    written.length > 0
      ? `【批量落盘】已从 ${scanned} 条助手回复写入 ${written.length} 个文件：\n${listLines}`
      : ''
  const displayText = [summary, missingNote].filter(Boolean).join('\n\n')
  return {
    ...r,
    scanned,
    displayText,
    missingPaths: missingNote
      ? [...allClaimed].filter((p) => !new Set(written.map((w) => w.replace(/\\/g, '/'))).has(p))
      : [],
  }
}

function buildMissingWriteNotice(claimedPaths, writtenPaths) {
  const written = new Set((writtenPaths || []).map((p) => p.replace(/\\/g, '/')))
  const missing = (claimedPaths || []).filter((p) => !written.has(p.replace(/\\/g, '/')))
  if (!missing.length) return ''
  return (
    `【未落盘】以下路径缺少合法 \`\`\`workspace-write\`\`\` JSON（须显式 path），磁盘未修改：\n` +
    missing.map((p) => `- \`${p}\``).join('\n')
  )
}

const MISSING_WRITE_FENCE_ERROR =
  '未找到有效的 ```workspace-write``` JSON（须含显式 path 与 content|contents）；已禁止猜路径 / 默认产物兜底'

function stripWorkspaceWriteFencesForDisplay(text) {
  if (!text || typeof text !== 'string') return ''
  let out = text
  const openRe = new RegExp(WORKSPACE_WRITE_FENCE_OPEN.source, 'gi')
  let m
  while (true) {
    openRe.lastIndex = 0
    m = openRe.exec(out)
    if (!m) break
    const bodyStart = m.index + m[0].length
    const relJson = out.slice(bodyStart).search(/[{\[]/)
    if (relJson === -1) break
    const absJsonStart = bodyStart + relJson
    const jsonEnd = findTopLevelJsonEnd(out, absJsonStart)
    if (jsonEnd === -1) break
    let outerEnd = jsonEnd
    const tail = out.slice(outerEnd)
    const closeFence = tail.match(/^(?:\s*(?:```|'''))/)
    if (closeFence) outerEnd += closeFence[0].length
    out = out.slice(0, m.index) + out.slice(outerEnd)
  }
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

function collapseWrittenSummary(body, writtenPaths, opts) {
  const claimed = opts?.claimedPaths || []
  const stripped = stripFakeWorkspaceWriteClaims(stripWorkspaceWriteFencesForDisplay(body))
  const missingNote = buildMissingWriteNotice(claimed, writtenPaths)
  if (!writtenPaths?.length) {
    return missingNote ? `${stripped}\n\n${missingNote}`.trim() : stripped
  }
  const list = writtenPaths.map((p) => `- \`${p}\``).join('\n')
  const summary = `【工作区已写入】共 ${writtenPaths.length} 个文件：\n${list}`
  const brief =
    stripped.length > 0
      ? stripped.length > 2400
        ? `${stripped.slice(0, 2400)}…`
        : stripped
      : ''
  const parts = [brief, summary, missingNote].filter(Boolean)
  return parts.join('\n\n')
}

function ingestTextAndApplyWorkspaceWrite(text, workspaceDir, meta) {
  const m = meta && typeof meta === 'object' ? meta : {}
  // 产品规则：默认不自动落盘；仅显式 applyWrites:true 才写盘。
  // Cursor 契约：只认 ```workspace-write``` JSON；ensure*Artifact / 代码块猜路径 / 默认 docs 已废除。
  if (m.ensureChainArtifact === true || m.ensureAgentArtifact === true) {
    return {
      ok: false,
      error: 'ensure*Artifact 已废除：须合法 ```workspace-write``` JSON，禁止默认产物兜底',
      written: [],
      displayText: text,
      missingWriteFence: true,
    }
  }
  const applyWrites = m.applyWrites === true

  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区或工作区不存在', written: [], displayText: text }
  }

  const body = stripFakeWorkspaceWriteClaims(String(text || ''))
  const claimedPaths = extractInvolvedSectionPaths(body)
  const fenceItems = collectWritableItemsFromText(body, m)

  if (!applyWrites) {
    return {
      ok: true,
      deferred: true,
      written: [],
      pendingCount: fenceItems.length,
      displayText: body,
      error: null,
      missingWriteFence: fenceItems.length === 0,
    }
  }

  if (fenceItems.length > 0) {
    const r = applyWorkspaceWriteFenceItems(workspaceDir, fenceItems)
    return {
      ...r,
      displayText: collapseWrittenSummary(body, r.written, { claimedPaths }),
      missingWriteFence: false,
    }
  }

  const missingNote = buildMissingWriteNotice(claimedPaths, [])
      return {
    ok: false,
    error: MISSING_WRITE_FENCE_ERROR,
    written: [],
    displayText: missingNote ? `${body}\n\n${missingNote}` : body,
    missingWriteFence: true,
  }
}

module.exports = {
  resolveSafeWorkspacePath,
  applyWorkspaceWriteFenceItems,
  parseWorkspaceWriteFences,
  normalizeFenceWriteItem,
  extractInvolvedSectionPaths,
  collectWritableItemsFromText,
  bulkIngestAssistantTexts,
  stripFakeWorkspaceWriteClaims,
  stripWorkspaceWriteFencesForDisplay,
  ingestTextAndApplyWorkspaceWrite,
  collapseWrittenSummary,
  defaultArtifactPathForAgent,
  buildAgentArtifactPathHint,
  MISSING_WRITE_FENCE_ERROR,
}
