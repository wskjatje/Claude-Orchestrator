'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { appendWorkspaceArtifactLog } = require('./vendor/cad/memory-cross-agent')
const {
  defaultArtifactPathForAgent,
  buildAgentArtifactPathHint,
} = require('./agent-artifact-paths.cjs')
const { agentRequiresManualConfirmWrite, agentAutoWritesToProject } = require('./write-policy.cjs')

function expandUserPath(p) {
  let s = String(p || '').trim()
  if (!s) return ''
  if (s === '~' || s.startsWith('~/') || s.startsWith('~\\')) {
    s = path.join(os.homedir(), s.slice(1))
  }
  return s
}

/**
 * 将 workspace-write 的 path 解析为工作区内的绝对路径。
 * 拒绝 ..；绝对路径须落在工作区内。
 * 本地模型常把 `/Users/.../TO1/foo` 写成 `Users/.../TO1/foo`，会在项目下误建 Users/ 目录——此处归一化为相对路径。
 * @param {string} workspaceDir
 * @param {string} relPath
 * @returns {string | null}
 */
function resolveSafeWorkspacePath(workspaceDir, relPath) {
  let p = expandUserPath(relPath)
  if (!p || p.includes('..')) return null

  const root = path.resolve(workspaceDir)
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep

  if (path.isAbsolute(p)) {
    const abs = path.resolve(p)
    if (abs === root || abs.startsWith(rootPrefix)) return abs
    return null
  }

  p = p.replace(/^[/\\]+/, '').trim()
  if (!p) return null

  // 误把绝对路径当相对路径：Users/barry/.../TO1/README.md
  const rootAsRel = root.replace(/^[/\\]+/, '')
  if (p === rootAsRel) return root
  if (p.startsWith(`${rootAsRel}/`) || p.startsWith(`${rootAsRel}\\`)) {
    const suffix = p.slice(rootAsRel.length).replace(/^[/\\]+/, '')
    if (!suffix || suffix.includes('..')) return suffix ? null : root
    const abs = path.resolve(root, suffix)
    if (abs === root || abs.startsWith(rootPrefix)) return abs
    return null
  }

  // 路径中含工作区目录名重复：.../TO1/docs/foo → docs/foo
  const base = path.basename(root)
  if (base) {
    const marker = `${base}/`
    const idx = p.indexOf(marker)
    if (idx >= 0) {
      const suffix = p.slice(idx + marker.length)
      if (suffix && !suffix.includes('..')) {
        const abs = path.resolve(root, suffix)
        if (abs === root || abs.startsWith(rootPrefix)) return abs
      }
    }
  }

  const abs = path.resolve(root, p)
  if (abs === root || abs.startsWith(rootPrefix)) return abs
  return null
}

function applyWorkspaceWriteFenceItems(workspaceDir, items) {
  const written = []
  const errors = []
  for (const item of items) {
    const rel =
      typeof item?.path === 'string'
        ? item.path
        : typeof item?.file === 'string'
          ? item.file
          : ''
    const content = item?.content != null ? String(item.content) : ''
    const abs = resolveSafeWorkspacePath(workspaceDir, rel)
    if (!abs) {
      errors.push(rel || '(无效路径)')
      continue
    }
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, content, 'utf8')
      written.push(rel.replace(/\\/g, '/'))
    } catch (e) {
      errors.push(`${rel || '?'}: ${e?.message || String(e)}`)
    }
  }
  if (written.length > 0) appendWorkspaceArtifactLog(written)
  return { ok: written.length > 0, written, errors: errors.length ? errors : undefined }
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

function buildChainStepArtifactRelPath(agentName, taskId) {
  const stem =
    String(agentName || 'agent')
      .trim()
      .replace(/\.md$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'agent'
  const tid =
    String(taskId || 'step')
      .trim()
      .replace(/[^\w.-]+/g, '_')
      .slice(0, 48) || 'step'
  return `docs/chain-steps/${tid}-${stem}.md`
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

function extractAllCodeBlockBodies(text) {
  if (!text || typeof text !== 'string') return []
  const bodies = []
  const parts = text.split('```')
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const block = parts[i]
    const nl = block.indexOf('\n')
    if (nl === -1) continue
    const content = block.slice(nl + 1).replace(/\n$/, '')
    if (content.trim()) bodies.push(content.endsWith('\n') ? content : `${content}\n`)
  }
  return bodies
}

const CODE_FILE_EXT =
  /\.(?:py|js|ts|tsx|jsx|json|yaml|yml|html|css|scss|sql|go|rs|c|cpp|h|java|kt|swift|rb|php|vue|svelte|sh|toml|txt|md|mjs|cjs)$/i

/** 从 ``` 代码块 + 邻近路径行提取可落盘文件（实现类 Agent 自动写代码，无需手动确认） */
function extractCodeFenceWrites(text) {
  if (!text || typeof text !== 'string') return []
  const items = []
  const seen = new Set()
  const parts = text.split('```')
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const block = parts[i]
    const nl = block.indexOf('\n')
    if (nl === -1) continue
    const firstLine = block.slice(0, nl).trim()
    let content = block.slice(nl + 1)
    if (content.endsWith('\n')) content = content.slice(0, -1)
    if (!content.trim()) continue

    let relPath = ''
    const headerMatch = firstLine.match(
      /^(?:[\w+#.-]+\s+)?([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+\.[a-zA-Z0-9]{2,6})$/,
    )
    if (headerMatch && CODE_FILE_EXT.test(headerMatch[1])) {
      relPath = headerMatch[1].replace(/\\/g, '/')
    }

    if (!relPath) {
      const contentFirstLine = content.split(/\r?\n/, 1)[0].trim()
      const commentPath = contentFirstLine.match(
        /^#\s*([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+\.[a-zA-Z0-9]{2,6})\s*$/,
      )
      if (commentPath && CODE_FILE_EXT.test(commentPath[1])) {
        relPath = commentPath[1].replace(/\\/g, '/')
      }
    }

    if (!relPath) {
      const preBlock = parts[i - 1] || ''
      const preLines = preBlock.split(/\r?\n/).slice(-6)
      for (let j = preLines.length - 1; j >= 0; j--) {
        const line = preLines[j].trim()
        if (!line) continue
        const tick = line.match(/`([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+\.[a-zA-Z0-9]{2,6})`/)
        if (tick && !tick[1].includes('..') && CODE_FILE_EXT.test(tick[1])) {
          relPath = tick[1].replace(/\\/g, '/')
          break
        }
        const bare = line.match(
          /(?:^#{1,4}\s*)?(?:File|文件|路径)?[：:\s]*`?([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+\.[a-zA-Z0-9]{2,6})`?/i,
        )
        if (bare && !bare[1].includes('..') && CODE_FILE_EXT.test(bare[1])) {
          relPath = bare[1].replace(/\\/g, '/')
          break
        }
      }
    }

    if (!relPath || relPath.includes('..') || seen.has(relPath)) continue
    seen.add(relPath)
    items.push({ path: relPath, content: content.endsWith('\n') ? content : `${content}\n` })
  }
  return items
}

/** 「涉及文件路径」列表与全文代码块按顺序配对（模型常把路径与代码块分开写） */
function extractOrderedPathCodeWrites(text) {
  const paths = extractInvolvedSectionPaths(text)
  if (!paths.length) return []
  const bodies = extractAllCodeBlockBodies(text)
  if (!bodies.length) return []

  const items = []
  const seen = new Set()

  if (paths.length === bodies.length) {
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i]
      if (seen.has(p) || p.includes('..')) continue
      seen.add(p)
      items.push({ path: p, content: bodies[i] })
    }
    return items
  }

  const codePaths = paths.filter((p) => !/\.md$/i.test(p))
  const mdPaths = paths.filter((p) => /\.md$/i.test(p))
  const codeBodies = bodies.filter((b) => !/^#\s/m.test(b.trim()) && !/^>\s/m.test(b.trim()))
  const mdBodies = bodies.filter((b) => /^#\s/m.test(b.trim()) || /^>\s/m.test(b.trim()) || /markdown|api-summary|\.md/i.test(b.slice(0, 120)))

  if (codePaths.length && codeBodies.length) {
    const n = Math.min(codePaths.length, codeBodies.length)
    for (let i = 0; i < n; i++) {
      const p = codePaths[i]
      if (seen.has(p)) continue
      seen.add(p)
      items.push({ path: p, content: codeBodies[i] })
    }
  }
  if (mdPaths.length && mdBodies.length) {
    for (let i = 0; i < Math.min(mdPaths.length, mdBodies.length); i++) {
      const p = mdPaths[i]
      if (seen.has(p)) continue
      seen.add(p)
      items.push({ path: p, content: mdBodies[i] })
    }
  }
  return items
}

/** 解析 ```json { "path": "...", "content": "..." } ``` 形式的落盘块（本地模型常用） */
function extractJsonPathContentWrites(text) {
  if (!text || typeof text !== 'string') return []
  const items = []
  const seen = new Set()
  const parts = text.split('```')
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const block = parts[i]
    const nl = block.indexOf('\n')
    if (nl === -1) continue
    const lang = block.slice(0, nl).trim().toLowerCase()
    if (lang !== 'json') continue
    const jsonStr = block.slice(nl + 1).trim()
    try {
      const parsed = JSON.parse(jsonStr)
      const pushItem = (it) => {
        const p = String(it?.path || '').replace(/\\/g, '/')
        const content = it?.content != null ? String(it.content) : ''
        if (!p || p.includes('..') || !content.trim() || seen.has(p)) return
        seen.add(p)
        items.push({ path: p, content: content.endsWith('\n') ? content : `${content}\n` })
      }
      if (Array.isArray(parsed)) {
        for (const it of parsed) pushItem(it)
      } else if (parsed && typeof parsed === 'object') {
        pushItem(parsed)
      }
    } catch {
      /* ignore */
    }
  }
  return items
}

function collectWritableItemsFromText(body, meta) {
  const m = meta && typeof meta === 'object' ? meta : {}
  const agentName = typeof m.agentName === 'string' ? m.agentName.trim() : ''
  const manualOnly =
    typeof m.manualConfirmOnly === 'boolean'
      ? m.manualConfirmOnly
      : agentRequiresManualConfirmWrite(agentName)
  const autoWriteProject =
    typeof m.autoWriteProject === 'boolean'
      ? m.autoWriteProject
      : agentName
        ? agentAutoWritesToProject(agentName)
        : Boolean(m.allowAutoProjectWrite)

  const fenceItems = parseWorkspaceWriteFences(body).filter(
    (it) => String(it?.content ?? '').trim().length > 0,
  )
  if (fenceItems.length > 0) return fenceItems

  if (!autoWriteProject || manualOnly || !body.trim()) return []

  const merged = new Map()
  for (const it of [
    ...extractOrderedPathCodeWrites(body),
    ...extractJsonPathContentWrites(body),
    ...extractCodeFenceWrites(body),
  ]) {
    const p = String(it?.path || '').replace(/\\/g, '/')
    if (!p || p.includes('..') || !String(it?.content ?? '').trim()) continue
    merged.set(p, it)
  }
  return [...merged.values()]
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
    for (const it of collectWritableItemsFromText(text, { ...meta, autoWriteProject: true })) {
      const p = String(it?.path || '').replace(/\\/g, '/')
      if (!p || p.includes('..')) continue
      merged.set(p, it)
    }
  }

  if (!merged.size) {
    const missingNote = buildMissingWriteNotice([...allClaimed], [])
    return {
      ok: false,
      error: missingNote || '未在会话历史中找到可落盘的代码块或 workspace-write',
      written: [],
      scanned,
      displayText: missingNote || '',
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
    `【未落盘】以下路径缺少可解析的 \`\`\`workspace-write\`\`\` 或代码块，磁盘未修改：\n` +
    missing.map((p) => `- \`${p}\``).join('\n')
  )
}

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
  const agentName = typeof m.agentName === 'string' ? m.agentName.trim() : ''
  const taskId = typeof m.taskId === 'string' ? m.taskId.trim() : ''
  const ensureChainArtifact = Boolean(m.ensureChainArtifact)
  const ensureAgentArtifact = Boolean(m.ensureAgentArtifact)
  const manualOnly =
    typeof m.manualConfirmOnly === 'boolean'
      ? m.manualConfirmOnly
      : agentRequiresManualConfirmWrite(agentName)
  const autoWriteProject =
    typeof m.autoWriteProject === 'boolean'
      ? m.autoWriteProject
      : agentName
        ? agentAutoWritesToProject(agentName)
        : Boolean(m.allowAutoProjectWrite)

  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区或工作区不存在', written: [], displayText: text }
  }

  const body = stripFakeWorkspaceWriteClaims(String(text || ''))
  const claimedPaths = extractInvolvedSectionPaths(body)
  const fenceItems = parseWorkspaceWriteFences(body).filter(
    (it) => String(it?.content ?? '').trim().length > 0,
  )
  if (fenceItems.length > 0) {
    const r = applyWorkspaceWriteFenceItems(workspaceDir, fenceItems)
    return {
      ...r,
      displayText: collapseWrittenSummary(body, r.written, { claimedPaths }),
    }
  }

  if (autoWriteProject && !manualOnly && body.trim()) {
    const fromAdjacent = extractCodeFenceWrites(body)
    const fromOrdered = extractOrderedPathCodeWrites(body)
    const fromJson = extractJsonPathContentWrites(body)
    const merged = new Map()
    for (const it of [...fromOrdered, ...fromJson, ...fromAdjacent]) {
      const p = String(it?.path || '').replace(/\\/g, '/')
      if (!p || p.includes('..') || !String(it?.content ?? '').trim()) continue
      merged.set(p, it)
    }
    const extracted = [...merged.values()]
    if (extracted.length > 0) {
      const r = applyWorkspaceWriteFenceItems(workspaceDir, extracted)
      return {
        ...r,
        displayText: collapseWrittenSummary(body, r.written, { claimedPaths }),
      }
    }
    if (agentName && body.trim().length > 80) {
      const rel = defaultArtifactPathForAgent(agentName)
      if (rel) {
        const r = applyWorkspaceWriteFenceItems(workspaceDir, [{ path: rel, content: body.trim() }])
        return {
          ...r,
          displayText: collapseWrittenSummary(body, r.written, { claimedPaths }),
        }
      }
    }
  }

  if (ensureChainArtifact && body.trim()) {
    const rel = buildChainStepArtifactRelPath(agentName, taskId)
    const header = [
      `# 任务链步骤产物 · ${taskId || '—'} · ${agentName || '—'}`,
      '',
      manualOnly
        ? '> 本步为产品/项目分工类产出；请核对后在聊天页点击「确认写入」落盘到正式文档路径。'
        : '> 本步未解析到 workspace-write 围栏或代码块；系统已将执行摘要自动落盘。',
      '',
      '---',
      '',
    ].join('\n')
    const r = applyWorkspaceWriteFenceItems(workspaceDir, [{ path: rel, content: header + body.trim() }])
    return {
      ...r,
      displayText: collapseWrittenSummary(body, r.written, { claimedPaths }),
    }
  }

  if (ensureAgentArtifact && agentName && body.trim() && !manualOnly) {
    const rel = defaultArtifactPathForAgent(agentName)
    const header = [
      `# Agent 产物 · ${agentName}`,
      '',
      '> 本步未解析到 workspace-write 围栏；系统已自动写入专属路径。',
      '',
      '---',
      '',
    ].join('\n')
    const r = applyWorkspaceWriteFenceItems(workspaceDir, [{ path: rel, content: header + body.trim() }])
    return {
      ...r,
      displayText: collapseWrittenSummary(body, r.written, { claimedPaths }),
    }
  }

  if (!manualOnly && autoWriteProject) {
    const missingNote = buildMissingWriteNotice(claimedPaths, [])
    if (missingNote) {
      return { ok: false, error: '未找到可落盘的 workspace-write 或代码块', written: [], displayText: `${body}\n\n${missingNote}` }
    }
  }

  return { ok: false, error: '未找到有效的 workspace-write 围栏或文件路径', written: [], displayText: body }
}

module.exports = {
  resolveSafeWorkspacePath,
  applyWorkspaceWriteFenceItems,
  parseWorkspaceWriteFences,
  extractCodeFenceWrites,
  extractJsonPathContentWrites,
  extractInvolvedSectionPaths,
  extractOrderedPathCodeWrites,
  collectWritableItemsFromText,
  bulkIngestAssistantTexts,
  stripFakeWorkspaceWriteClaims,
  ingestTextAndApplyWorkspaceWrite,
  collapseWrittenSummary,
  defaultArtifactPathForAgent,
  buildAgentArtifactPathHint,
}
