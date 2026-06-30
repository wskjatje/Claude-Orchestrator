'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

function stripLargeAssistantArtifactsMain(text, maxInnerLen = 2000) {
  if (!text || typeof text !== 'string') return text
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi
  const removals = []
  let m
  while ((m = fenceRe.exec(text)) !== null) {
    const inner = m[1].trim()
    if (inner.length < maxInnerLen) continue
    if (
      /workspace-write|workspace_write|"tool_calls"|"arguments"\s*:\s*\{|"name"\s*:\s*"workspace/i.test(
        inner,
      )
    ) {
      removals.push({ start: m.index, end: m.index + m[0].length })
    }
  }
  if (!removals.length) return text
  let out = text
  for (let i = removals.length - 1; i >= 0; i--) {
    const { start, end } = removals[i]
    out = out.slice(0, start) + '\n（大段工具/写盘 JSON 已折叠）\n' + out.slice(end)
  }
  return out.trim()
}

function readClaudeAgentMarkdownContent(basenameRaw) {
  const trimmed = typeof basenameRaw === 'string' ? basenameRaw.trim() : ''
  if (!trimmed) return ''
  const basename = trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`
  const baseNoExt =
    basename.length > 3 && basename.toLowerCase().endsWith('.md') ? basename.slice(0, -3) : ''
  if (
    !basename ||
    !basename.toLowerCase().endsWith('.md') ||
    basename.includes('..') ||
    /[/\\]/.test(basename) ||
    !baseNoExt ||
    baseNoExt.length > 120
  ) {
    return ''
  }
  const agentsDir = path.resolve(path.join(os.homedir(), '.claude', 'agents'))
  const target = path.resolve(path.join(agentsDir, basename))
  const rel = path.relative(agentsDir, target)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return ''
  try {
    let readPath = target
    if (!fs.existsSync(readPath)) {
      const alt = path.resolve(path.join(agentsDir, 'sanshengliubu', basename))
      const relAlt = path.relative(agentsDir, alt)
      if (!relAlt.startsWith('..') && !path.isAbsolute(relAlt) && fs.existsSync(alt)) {
        readPath = alt
      }
    }
    if (!fs.existsSync(readPath)) return ''
    return fs.readFileSync(readPath, 'utf8')
  } catch {
    return ''
  }
}

function resolveAgentMarkdownWritePath(basenameRaw) {
  const trimmed = typeof basenameRaw === 'string' ? basenameRaw.trim() : ''
  if (!trimmed) return { ok: false, error: '无效文件名' }
  const basename = trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`
  const baseNoExt =
    basename.length > 3 && basename.toLowerCase().endsWith('.md') ? basename.slice(0, -3) : ''
  if (
    !basename ||
    !basename.toLowerCase().endsWith('.md') ||
    basename.includes('..') ||
    /[/\\]/.test(basename) ||
    !baseNoExt ||
    baseNoExt.length > 120
  ) {
    return { ok: false, error: '无效文件名' }
  }
  const agentsDir = path.resolve(path.join(os.homedir(), '.claude', 'agents'))
  const rootPath = path.resolve(path.join(agentsDir, basename))
  const subPath = path.resolve(path.join(agentsDir, 'sanshengliubu', basename))
  let target = rootPath
  if (fs.existsSync(subPath)) target = subPath
  else if (fs.existsSync(rootPath)) target = rootPath
  const rel = path.relative(agentsDir, target)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, error: '路径无效' }
  }
  return { ok: true, basename, target, agentsDir }
}

function writeClaudeSkillMarkdownContent(basenameRaw, content) {
  const basename = typeof basenameRaw === 'string' ? basenameRaw.trim() : ''
  if (!basename || !basename.toLowerCase().endsWith('.md')) {
    return { ok: false, error: 'basename 须为 *.md' }
  }
  if (basename.includes('..') || /[/\\]/.test(basename)) {
    return { ok: false, error: '文件名无效' }
  }
  const text = typeof content === 'string' ? content : ''
  if (!text.trim()) return { ok: false, error: '内容不能为空' }
  const skillsDir = path.resolve(path.join(os.homedir(), '.claude', 'skills'))
  const target = path.resolve(path.join(skillsDir, basename))
  if (path.relative(skillsDir, target).startsWith('..')) {
    return { ok: false, error: '路径无效' }
  }
  try {
    fs.mkdirSync(skillsDir, { recursive: true })
    fs.writeFileSync(target, text.endsWith('\n') ? text : `${text}\n`, 'utf8')
    return { ok: true, basename, path: target }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

function writeClaudeAgentMarkdownContent(basenameRaw, content) {
  const resolved = resolveAgentMarkdownWritePath(basenameRaw)
  if (!resolved.ok) return resolved
  const text = typeof content === 'string' ? content : ''
  if (!text.trim()) return { ok: false, error: '内容不能为空' }
  try {
    fs.mkdirSync(path.dirname(resolved.target), { recursive: true })
    fs.writeFileSync(resolved.target, text.endsWith('\n') ? text : `${text}\n`, 'utf8')
    return { ok: true, basename: resolved.basename, path: resolved.target }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

function stemFromAgentBasenameForOrchestration(raw) {
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (!t) return '__general__'
  const lowerT = t.toLowerCase()
  if (lowerT === 'auto' || lowerT === '__auto__') return '__general__'
  const base = path.basename(t.replace(/\\/g, '/'))
  const lower = base.toLowerCase()
  return lower.endsWith('.md') ? base.slice(0, -3).trim() : base.trim()
}

function bundledOllamaMcpServerPath() {
  return path.join(__dirname, 'vendor/cad/mcp-ollama-local/server.mjs')
}

function formatLocalYYYYMMDD(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function readTextFileTail(absPath, maxLines, maxBytes, missingContent) {
  try {
    if (!fs.existsSync(absPath)) {
      return { ok: true, content: missingContent ?? '（文件不存在）', lines: 0 }
    }
    let buf = fs.readFileSync(absPath)
    if (buf.length > maxBytes) buf = buf.slice(-maxBytes)
    const text = buf.toString('utf8')
    const lines = text.split('\n')
    const tail = lines.length > maxLines ? lines.slice(-maxLines) : lines
    return { ok: true, content: tail.join('\n'), lines: tail.length }
  } catch (e) {
    return { ok: false, content: '', lines: 0, error: e?.message || String(e) }
  }
}

function extractFrontmatterField(fm, field) {
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'm')
  const m = fm.match(re)
  if (!m) return ''
  return m[1].trim().replace(/^["']|["']$/g, '').slice(0, 240)
}

function parseFrontmatterListField(fm, field) {
  const rawLine = extractFrontmatterField(fm, field)
  if (!rawLine) return []
  const raw = rawLine.trim()
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw.replace(/'/g, '"'))
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || '').trim()).filter(Boolean)
      }
    } catch {
      /* fall through */
    }
  }
  return raw
    .split(/[,，\s]+/)
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

function hasCjkText(text) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(String(text || ''))
}

function cleanAgentHeadingLabel(heading) {
  return String(heading || '')
    .replace(/\s*Agent\s*(Personality|Profile)?\s*$/i, '')
    .replace(/\s*智能体\s*$/i, '')
    .trim()
}

function shortChineseLabelFromDescription(desc) {
  const t = String(desc || '').trim()
  if (!hasCjkText(t)) return ''
  const first = t.split(/[，。；;、|·—–\-]|(?:\s*——\s*)|(?:\s+—\s+)/)[0]?.trim() ?? ''
  return first.slice(0, 28)
}

function parseAgentMarkdownMeta(content) {
  const s = typeof content === 'string' ? content : ''
  let fm = ''
  let body = s
  const trimmed = s.trimStart()
  if (trimmed.startsWith('---')) {
    const closeIdx = trimmed.indexOf('\n---', 3)
    if (closeIdx !== -1) {
      fm = trimmed.slice(3, closeIdx)
      body = trimmed.slice(closeIdx + 4)
    }
  }
  let heading = ''
  for (const line of body.split('\n')) {
    const m = line.match(/^#\s+(.+)$/)
    if (m) {
      heading = m[1].trim()
      break
    }
  }
  const description = extractMarkdownDescription(s)
  const skills = fm ? parseFrontmatterListField(fm, 'skills') : []
  return {
    name: extractFrontmatterField(fm, 'name'),
    nameZh:
      extractFrontmatterField(fm, 'name_zh') ||
      extractFrontmatterField(fm, 'nameZh') ||
      extractFrontmatterField(fm, 'name-zh'),
    displayName:
      extractFrontmatterField(fm, 'displayName') ||
      extractFrontmatterField(fm, 'display_name'),
    description,
    heading,
    skills,
  }
}

function resolveAgentDisplayName(meta, stem) {
  const candidates = [
    meta.nameZh,
    meta.displayName,
    hasCjkText(meta.name) ? meta.name : '',
    hasCjkText(meta.heading) ? cleanAgentHeadingLabel(meta.heading) : '',
    shortChineseLabelFromDescription(meta.description),
  ]
  for (const c of candidates) {
    const t = String(c || '').trim()
    if (t) return t
  }
  return stem
}

function extractMarkdownDescription(content) {
  const s = typeof content === 'string' ? content : ''
  if (!s.trim()) return ''
  let rest = s.trimStart()
  if (rest.startsWith('---')) {
    const closeIdx = rest.indexOf('\n---', 3)
    if (closeIdx !== -1) {
      const fm = rest.slice(3, closeIdx)
      const m = fm.match(/^description:\s*(.+)$/m)
      if (m) return m[1].trim().replace(/^["']|["']$/g, '').slice(0, 240)
    }
  }
  for (const line of s.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('---')) continue
    return t.slice(0, 240)
  }
  return ''
}

function extractAgentCategoryFromMarkdown(content) {
  const allowed = new Set(['项目', '通用', '实验'])
  const s = typeof content === 'string' ? content : ''
  if (!s.trim()) return null
  let rest = s.trimStart()
  if (!rest.startsWith('---')) return null
  const closeIdx = rest.indexOf('\n---', 3)
  if (closeIdx === -1) return null
  const fm = rest.slice(3, closeIdx)
  const m = fm.match(/^category:\s*(.+)$/m)
  if (!m) return null
  const v = m[1].trim().replace(/^["']|["']$/g, '')
  return allowed.has(v) ? v : null
}

function collectAgentMarkdownEntries() {
  const agentsDir = path.resolve(path.join(os.homedir(), '.claude', 'agents'))
  const items = []
  if (!fs.existsSync(agentsDir)) return items

  for (const d of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!d.isFile() || !d.name.toLowerCase().endsWith('.md')) continue
    const full = path.join(agentsDir, d.name)
    let description = ''
    let category = null
    let displayName = ''
    let name = ''
    let nameZh = ''
    let heading = ''
    let skills = []
    try {
      const raw = fs.readFileSync(full, 'utf8').slice(0, 32000)
      const meta = parseAgentMarkdownMeta(raw)
      description = meta.description
      name = meta.name
      nameZh = meta.nameZh
      heading = meta.heading
      skills = meta.skills || []
      category = extractAgentCategoryFromMarkdown(raw)
      displayName = resolveAgentDisplayName(meta, d.name.slice(0, -3))
    } catch {
      /* ignore */
    }
    const stem = d.name.slice(0, -3)
    items.push({
      basename: d.name,
      source: 'root',
      stem,
      description,
      displayName: displayName || stem,
      ...(name ? { name } : {}),
      ...(nameZh ? { nameZh } : {}),
      ...(heading ? { heading } : {}),
      ...(category ? { category } : {}),
      ...(skills.length ? { skills } : {}),
    })
  }

  const subDir = path.join(agentsDir, 'sanshengliubu')
  if (fs.existsSync(subDir)) {
    for (const d of fs.readdirSync(subDir, { withFileTypes: true })) {
      if (!d.isFile() || !d.name.toLowerCase().endsWith('.md')) continue
      const full = path.join(subDir, d.name)
      let description = ''
      let category = null
      let displayName = ''
      let name = ''
      let nameZh = ''
      let heading = ''
      let skills = []
      try {
        const raw = fs.readFileSync(full, 'utf8').slice(0, 32000)
        const meta = parseAgentMarkdownMeta(raw)
        description = meta.description
        name = meta.name
        nameZh = meta.nameZh
        heading = meta.heading
        skills = meta.skills || []
        category = extractAgentCategoryFromMarkdown(raw)
        displayName = resolveAgentDisplayName(meta, d.name.slice(0, -3))
      } catch {
        /* ignore */
      }
      items.push({
        basename: d.name,
        source: 'sanshengliubu',
        stem: d.name.slice(0, -3),
        description,
        displayName: displayName || d.name.slice(0, -3),
        ...(name ? { name } : {}),
        ...(nameZh ? { nameZh } : {}),
        ...(heading ? { heading } : {}),
        ...(category ? { category } : {}),
        ...(skills.length ? { skills } : {}),
      })
    }
  }

  items.sort((a, b) => {
    const byStem = a.stem.localeCompare(b.stem, undefined, { sensitivity: 'base' })
    if (byStem !== 0) return byStem
    if (a.source === b.source) return 0
    return a.source === 'root' ? -1 : 1
  })
  return items
}

function scanSkillMarkdownDir(skillsDir, source) {
  const items = []
  const resolved = path.resolve(skillsDir)
  if (!fs.existsSync(resolved)) return items

  for (const d of fs.readdirSync(resolved, { withFileTypes: true })) {
    if (!d.isFile() || !d.name.toLowerCase().endsWith('.md')) continue
    const full = path.join(resolved, d.name)
    let description = ''
    let category = null
    let displayName = ''
    let name = ''
    let nameZh = ''
    let heading = ''
    try {
      const raw = fs.readFileSync(full, 'utf8').slice(0, 32000)
      const meta = parseAgentMarkdownMeta(raw)
      description = meta.description
      name = meta.name
      nameZh = meta.nameZh
      heading = meta.heading
      category = extractAgentCategoryFromMarkdown(raw)
      displayName = resolveAgentDisplayName(meta, d.name.slice(0, -3))
    } catch {
      /* ignore */
    }
    const stem = d.name.slice(0, -3)
    items.push({
      basename: d.name,
      source,
      stem,
      description,
      displayName: displayName || stem,
      ...(name ? { name } : {}),
      ...(nameZh ? { nameZh } : {}),
      ...(heading ? { heading } : {}),
      ...(category ? { category } : {}),
    })
  }
  return items
}

/** 扫描 ~/.claude/skills 与（可选）工作区 .claude/skills；同名时工作区覆盖用户目录 */
function collectSkillMarkdownEntries(workspaceDir) {
  const byStem = new Map()
  const userDir = path.resolve(path.join(os.homedir(), '.claude', 'skills'))
  for (const item of scanSkillMarkdownDir(userDir, 'user')) {
    byStem.set(item.stem, item)
  }
  if (workspaceDir) {
    const projectDir = path.join(path.resolve(workspaceDir), '.claude', 'skills')
    for (const item of scanSkillMarkdownDir(projectDir, 'project')) {
      byStem.set(item.stem, item)
    }
  }
  return [...byStem.values()].sort((a, b) => {
    const byStem = a.stem.localeCompare(b.stem, undefined, { sensitivity: 'base' })
    if (byStem !== 0) return byStem
    if (a.source === b.source) return 0
    return a.source === 'project' ? -1 : 1
  })
}

function listWorkspaceMarkdownFiles(workspaceDir) {
  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区或路径不存在', files: [] }
  }
  const root = path.resolve(workspaceDir)
  const out = []
  const maxFiles = 500
  const maxDepth = 7
  const deny = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', '.idea'])

  function walk(absDir, depth) {
    if (depth > maxDepth || out.length >= maxFiles) return
    let ents = []
    try {
      ents = fs.readdirSync(absDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of ents) {
      if (out.length >= maxFiles) return
      const name = ent.name
      if (name.startsWith('.') && name !== '.claude') continue
      if (ent.isDirectory()) {
        if (deny.has(name)) continue
        walk(path.join(absDir, name), depth + 1)
        continue
      }
      if (!ent.isFile() || !/\.md$/i.test(name)) continue
      const abs = path.join(absDir, name)
      const rel = path.relative(root, abs).replace(/\\/g, '/')
      if (!rel || rel.startsWith('..')) continue
      try {
        const st = fs.statSync(abs)
        out.push({ relPath: rel, mtimeMs: st.mtimeMs || 0, size: st.size || 0 })
      } catch {
        /* ignore */
      }
    }
  }
  walk(root, 0)
  out.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return { ok: true, files: out }
}

function gatherWorkspaceExecutionSnapshot(workspaceDir) {
  if (!workspaceDir || !fs.existsSync(workspaceDir)) return ''
  const cwd = path.resolve(workspaceDir)
  const opt = { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
  const lines = [
    '说明：以下在每次发送对话前由 Bridge 刷新；请结合未提交变更判断应改路径；用户要求保存到磁盘时输出 ```workspace-write``` JSON。',
    `# 工作区\n${cwd}`,
    '',
  ]
  const tryGit = (args) => {
    try {
      const out = execFileSync('git', args, { ...opt, windowsHide: true }).trim()
      lines.push(`$ git ${args.join(' ')}`, out || '（无输出）', '')
    } catch (e) {
      lines.push(`$ git ${args.join(' ')}`, `（失败：${e?.message || String(e)}）`, '')
    }
  }
  tryGit(['rev-parse', '--is-inside-work-tree'])
  tryGit(['status', '-sb'])
  tryGit(['diff', '--stat', 'HEAD'])
  const md = listWorkspaceMarkdownFiles(workspaceDir)
  if (md.ok && md.files.length) {
    lines.push('## 近期 Markdown 文件（按 mtime 降序，前 20）')
    for (const f of md.files.slice(0, 20)) {
      lines.push(`- ${f.relPath}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim().slice(0, 16_000)
}

function claudeMemoryEventsPath() {
  return path.join(os.homedir(), '.claude', 'memory', 'events.jsonl')
}

function summarizeClaudeEventsForDailyReport(targetDateStr) {
  const today =
    typeof targetDateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr.trim())
      ? targetDateStr.trim()
      : formatLocalYYYYMMDD()
  const p = claudeMemoryEventsPath()
  if (!fs.existsSync(p)) {
    return { ok: true, markdown: '', count: 0, missingFile: true }
  }
  const maxSlice = 1_200_000
  let buf = fs.readFileSync(p)
  if (buf.length > maxSlice) buf = buf.slice(-maxSlice)
  const lines = buf.toString('utf8').split('\n').filter((x) => x.trim())
  const rows = []
  for (const line of lines) {
    try {
      const o = JSON.parse(line)
      const ts = o.ts
      if (!ts) continue
      const d = new Date(ts)
      if (Number.isNaN(d.getTime())) continue
      if (formatLocalYYYYMMDD(d) !== today) continue
      rows.push(o)
    } catch {
      /* skip */
    }
  }
  let md = `\n## Claude 记忆事件摘录（${today} · ~/.claude/memory/events.jsonl）\n\n`
  md += `共 **${rows.length}** 条。\n\n`
  for (const o of rows.slice(-100)) {
    const kind = o.event ?? o.hook ?? 'record'
    let detail = ''
    if (o.event === 'orchestration_completed') {
      detail = `任务链完成 · steps=${o.stepCount ?? '?'}`
    } else {
      detail = JSON.stringify(o).slice(0, 220)
    }
    md += `- \`${o.ts}\` · **${kind}** · ${detail}\n`
  }
  md += '\n'
  return { ok: true, markdown: md, count: rows.length, missingFile: false }
}

function claudeDebugLatestResolvedPath() {
  const link = path.join(os.homedir(), '.claude', 'debug', 'latest')
  try {
    return fs.realpathSync(link)
  } catch {
    return link
  }
}

function buildClaudeCodeBundleMarkdown(maxLinesPerSection = 140) {
  const parts = ['# Claude Code 执行信息（多源尾部拼接）\n\n']
  const dbg = readTextFileTail(claudeDebugLatestResolvedPath(), maxLinesPerSection, 480_000, null)
  parts.push('## ~/.claude/debug/latest\n```text\n')
  parts.push(dbg.ok ? dbg.content.trim() || '(空)' : String(dbg.error))
  parts.push('\n```\n\n')
  const hist = readTextFileTail(
    path.join(os.homedir(), '.claude', 'history.jsonl'),
    maxLinesPerSection,
    350_000,
    null,
  )
  parts.push('## ~/.claude/history.jsonl\n```text\n')
  parts.push(hist.ok ? hist.content.trim() || '(空)' : String(hist.error))
  parts.push('\n```\n\n')
  parts.push(summarizeClaudeEventsForDailyReport(formatLocalYYYYMMDD()).markdown || '')
  let md = parts.join('')
  if (md.length > 120_000) md = md.slice(0, 120_000) + '\n\n…（已截断）\n'
  return { ok: true, markdown: md }
}

function sanitizeScheduledTask(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!id) return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 120) : '未命名'
  const action = ['toast', 'log', 'reportAppend'].includes(raw.action) ? raw.action : 'log'
  const scheduleType = raw.scheduleType === 'daily' ? 'daily' : 'interval'
  const intervalMinutes =
    Number.isFinite(parseInt(raw.intervalMinutes, 10)) && parseInt(raw.intervalMinutes, 10) >= 1
      ? Math.min(10080, parseInt(raw.intervalMinutes, 10))
      : 60
  const dailyRaw = typeof raw.dailyTime === 'string' ? raw.dailyTime.trim() : '09:00'
  const dailyMatch = /^(\d{1,2}):(\d{2})$/.exec(dailyRaw)
  const dailyTime = dailyMatch
    ? `${String(Math.min(23, parseInt(dailyMatch[1], 10))).padStart(2, '0')}:${dailyMatch[2]}`
    : '09:00'
  const lastRunAt =
    typeof raw.lastRunAt === 'number' && Number.isFinite(raw.lastRunAt) && raw.lastRunAt > 0
      ? raw.lastRunAt
      : null
  const lastRunError =
    typeof raw.lastRunError === 'string' ? raw.lastRunError.slice(0, 500) : ''
  const payload = typeof raw.payload === 'string' ? raw.payload.slice(0, 2000) : ''
  const chatSessionId =
    typeof raw.chatSessionId === 'string' ? raw.chatSessionId.trim().slice(0, 120) : ''
  return {
    id,
    name,
    action,
    scheduleType,
    intervalMinutes,
    dailyTime,
    payload,
    chatSessionId,
    enabled: raw.enabled === true,
    lastRunAt,
    lastRunError,
  }
}

module.exports = {
  stripLargeAssistantArtifactsMain,
  readClaudeAgentMarkdownContent,
  writeClaudeAgentMarkdownContent,
  writeClaudeSkillMarkdownContent,
  resolveAgentMarkdownWritePath,
  stemFromAgentBasenameForOrchestration,
  bundledOllamaMcpServerPath,
  formatLocalYYYYMMDD,
  readTextFileTail,
  extractMarkdownDescription,
  collectAgentMarkdownEntries,
  collectSkillMarkdownEntries,
  listWorkspaceMarkdownFiles,
  gatherWorkspaceExecutionSnapshot,
  claudeMemoryEventsPath,
  summarizeClaudeEventsForDailyReport,
  buildClaudeCodeBundleMarkdown,
  sanitizeScheduledTask,
}
