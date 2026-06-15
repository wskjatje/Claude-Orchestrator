import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { getSkillDefinition, resolveAgentSkillBundleFromMeta } from './agent-skill-presets.mjs'

const require = createRequire(import.meta.url)
const support = require('./cad-support.cjs')

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS_DIR = path.resolve(path.join(os.homedir(), '.claude', 'skills'))

const ANTHROPICS_SKILLS_RAW =
  'https://raw.githubusercontent.com/anthropics/skills/main/skills'
const CLAUDE_CODE_RAW = 'https://raw.githubusercontent.com/anthropics/claude-code/main'

/** 本地 stem → GitHub 上 anthropics/skills 目录名；不写重复文件 */
const GITHUB_SKILL_ALIASES = {
  playwright: 'webapp-testing',
}

const DUPLICATE_SKILL_ALIASES = {
  playwright: 'webapp-testing',
}

const LOCAL_PLUGIN_SKILL_GLOBS = [
  'plugins/frontend-design/skills/frontend-design/SKILL.md',
  'plugins/hookify/skills/writing-rules/SKILL.md',
]

function serializeSkillTemplate(meta) {
  const stem = meta.stem.trim()
  const name = meta.name?.trim() || stem
  const category = meta.category?.trim() || '工程'
  const desc = meta.description.trim() || `与 ${meta.agentStem || 'Agent'} 关联的 Skill。`
  const fm = ['---', `name: ${name}`, `description: ${desc}`, `category: ${category}`, '---', ''].join(
    '\n',
  )
  const agentNote = meta.agentStem ? `\n\n## 关联 Agent\n\n\`${meta.agentStem}\`\n` : ''
  const body =
    meta.body?.trim() ||
    `# ${name}\n\n## 职责\n\n- ${desc}${agentNote}\n\n## 步骤\n\n- （可在此补充操作步骤与验收标准）\n`
  return `${fm}${body}\n`
}

function extractFrontmatterField(fm, field) {
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'm')
  const m = fm.match(re)
  if (!m) return ''
  return m[1].trim().replace(/^["']|["']$/g, '').slice(0, 500)
}

function parseFrontmatterListField(fm, field) {
  const rawLine = extractFrontmatterField(fm, field)
  if (!rawLine) return []
  const raw = rawLine.trim()
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw.replace(/'/g, '"'))
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x ?? '').trim()).filter(Boolean)
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

function parseAgentMarkdown(content) {
  const trimmed = String(content || '').trimStart()
  let fm = ''
  let body = trimmed
  if (trimmed.startsWith('---')) {
    const closeIdx = trimmed.indexOf('\n---', 3)
    if (closeIdx !== -1) {
      fm = trimmed.slice(3, closeIdx)
      body = trimmed.slice(closeIdx + 4).replace(/^\s+/, '')
    }
  }
  const catRaw = extractFrontmatterField(fm, 'category')
  const category = ['项目', '通用', '实验'].includes(catRaw) ? catRaw : '通用'
  const toolsRaw = extractFrontmatterField(fm, 'tools')
  const tools = toolsRaw
    ? toolsRaw
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    : []
  return {
    description: extractFrontmatterField(fm, 'description'),
    category,
    model: extractFrontmatterField(fm, 'model') || 'inherit',
    tools,
    skills: parseFrontmatterListField(fm, 'skills'),
    body,
  }
}

function serializeAgentMarkdown(meta, opts = {}) {
  const heading = opts.heading?.trim() || 'Agent'
  const toolsLine = meta.tools.length ? meta.tools.join(', ') : 'read, edit'
  const fmLines = [
    '---',
    `description: ${meta.description.trim() || '简述该 Agent 的职责。'}`,
    `category: ${meta.category}`,
    `model: ${meta.model.trim() || 'inherit'}`,
    `tools: ${toolsLine}`,
  ]
  if (meta.skills.length) {
    fmLines.push(`skills: ${meta.skills.join(', ')}`)
  }
  fmLines.push('---', '')
  const fm = fmLines.join('\n')
  const body = meta.body.trim() ? meta.body.trim() : `# ${heading}\n\n## 职责\n\n- （待填）\n`
  return `${fm}${body}\n`
}

export function isPlaceholderSkillContent(content) {
  const text = String(content || '').trim()
  if (!text) return true
  if (text.length < 280) return true
  if (/见\s*[`']?docs\/TOOLS\.md[`']?/i.test(text)) return true
  if (/安装对应 Skill/i.test(text) && text.length < 600) return true
  if (/安装登记/i.test(text) && text.length < 600) return true
  return false
}

async function fetchUrlText(url, timeoutMs = 30_000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'claudecode-workbench/1.0' },
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const text = await res.text()
    if (!text.trim()) return { ok: false, error: 'empty body' }
    return { ok: true, text, url }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  } finally {
    clearTimeout(timer)
  }
}

function readLocalPluginSkill(stem) {
  const githubStem = GITHUB_SKILL_ALIASES[stem] || stem
  const candidates = [
    path.join(PROJECT_ROOT, 'plugins', githubStem, 'skills', githubStem, 'SKILL.md'),
    ...LOCAL_PLUGIN_SKILL_GLOBS.map((rel) => path.join(PROJECT_ROOT, rel)).filter((p) =>
      p.includes(githubStem),
    ),
  ]
  for (const abs of candidates) {
    try {
      if (fs.existsSync(abs)) {
        return { ok: true, text: fs.readFileSync(abs, 'utf8'), source: `local:${path.relative(PROJECT_ROOT, abs)}` }
      }
    } catch {
      /* ignore */
    }
  }
  return { ok: false }
}

export async function fetchSkillMarkdownFromGithub(stem) {
  const s = String(stem || '').trim()
  if (!s) return { ok: false, error: 'empty stem' }

  const local = readLocalPluginSkill(s)
  if (local.ok) return local

  const githubStem = GITHUB_SKILL_ALIASES[s] || s
  const remoteUrl = `${ANTHROPICS_SKILLS_RAW}/${githubStem}/SKILL.md`
  const remote = await fetchUrlText(remoteUrl)
  if (remote.ok) {
    return { ok: true, text: remote.text, source: `github:anthropics/skills/${githubStem}` }
  }

  const pluginUrl = `${CLAUDE_CODE_RAW}/plugins/${githubStem}/skills/${githubStem}/SKILL.md`
  const pluginRemote = await fetchUrlText(pluginUrl)
  if (pluginRemote.ok) {
    return {
      ok: true,
      text: pluginRemote.text,
      source: `github:anthropics/claude-code/plugins/${githubStem}`,
    }
  }

  return { ok: false, error: remote.error || pluginRemote.error || 'not found on GitHub' }
}

function skillFilePath(stem) {
  return path.join(SKILLS_DIR, `${stem}.md`)
}

function shortChineseDescription(text, maxLen = 56) {
  const t = String(text || '').trim()
  if (!t) return ''
  const first = t.split(/[。；;!?.\n]/)[0]?.trim() ?? t
  return first.length > maxLen ? `${first.slice(0, maxLen - 1)}…` : first
}

function extractAgentHeading(body) {
  const m = String(body || '').match(/^#\s+(.+)$/m)
  if (!m) return ''
  return m[1]
    .trim()
    .replace(/\s*Agent\s*(Personality|Profile)?\s*$/i, '')
    .replace(/\s*智能体\s*$/i, '')
    .trim()
}

function buildSkillDefFromAgent(agent, stem, parsed) {
  const name =
    agent.displayName?.trim() ||
    extractAgentHeading(parsed.body) ||
    shortChineseDescription(parsed.description, 24) ||
    stem
  const description =
    shortChineseDescription(parsed.description || agent.description) ||
    `${name}：角色技能与验收基线`
  return {
    stem,
    name,
    description,
    category: parsed.category || agent.category || '通用',
    agentStem: agent.stem,
  }
}

function resolveAgentSkillBundle(agent, agentContent) {
  const parsed = parseAgentMarkdown(agentContent)
  const bundle = resolveAgentSkillBundleFromMeta(agent.stem, parsed, agent)
  return { ...bundle, parsed }
}

function agentNeedsAssociationSync(agent, agentContent, opts = {}) {
  if (opts.onlyMissing !== true) return true
  const parsed = parseAgentMarkdown(agentContent)
  if (!parsed.skills?.length) return true
  const bundle = resolveAgentSkillBundle(agent, agentContent)
  for (const skillStem of bundle.skillStems) {
    if (!fs.existsSync(skillFilePath(skillStem))) return true
  }
  return false
}

async function ensureSkillFile(stem, agentStem, opts = {}, agentContext = null) {
  const overwrite = opts.overwrite !== false
  const canonical = DUPLICATE_SKILL_ALIASES[stem]
  if (canonical) {
    const canonicalPath = skillFilePath(canonical)
    if (fs.existsSync(canonicalPath)) {
      return { stem, action: 'skipped', reason: `alias-of-${canonical}` }
    }
  }
  const target = skillFilePath(stem)
  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target, 'utf8')
    if (!overwrite && !isPlaceholderSkillContent(existing)) {
      return { stem, action: 'skipped', reason: 'exists' }
    }
    if (!isPlaceholderSkillContent(existing) && !overwrite) {
      return { stem, action: 'skipped', reason: 'exists' }
    }
  }

  const fetched = await fetchSkillMarkdownFromGithub(stem)
  if (fetched.ok) {
    const save = support.writeClaudeSkillMarkdownContent(`${stem}.md`, fetched.text)
    if (!save.ok) return { stem, action: 'failed', error: save.error }
    return { stem, action: 'downloaded', source: fetched.source }
  }

  const def =
    stem === agentStem && agentContext
      ? buildSkillDefFromAgent(agentContext.agent, stem, agentContext.parsed)
      : getSkillDefinition(stem, agentStem)
  const tpl = serializeSkillTemplate(def)
  const save = support.writeClaudeSkillMarkdownContent(`${stem}.md`, tpl)
  if (!save.ok) return { stem, action: 'failed', error: save.error }
  return { stem, action: 'templated', error: fetched.error }
}

export async function syncAgentSkillsFromGithub(opts = {}) {
  const agents = support.collectAgentMarkdownEntries()
  const agentFilter = typeof opts.agentStem === 'string' ? opts.agentStem.trim() : ''
  const basenameFilter = typeof opts.agentBasename === 'string' ? opts.agentBasename.trim() : ''
  const onlyMissing = opts.onlyMissing === true

  const targets = agents.filter((a) => {
    if (agentFilter && a.stem !== agentFilter) return false
    if (basenameFilter && a.basename !== basenameFilter) return false
    if (onlyMissing) {
      const content = support.readClaudeAgentMarkdownContent(a.basename) || ''
      return agentNeedsAssociationSync(a, content, opts)
    }
    return true
  })

  const skillActions = []
  const seenStems = new Set()

  for (const agent of targets) {
    const content = support.readClaudeAgentMarkdownContent(agent.basename) || ''
    const bundle = resolveAgentSkillBundle(agent, content)
    for (const skillStem of bundle.skillStems) {
      if (seenStems.has(skillStem)) continue
      seenStems.add(skillStem)
      skillActions.push(
        await ensureSkillFile(skillStem, agent.stem, opts, {
          agent,
          parsed: bundle.parsed,
        }),
      )
    }
  }

  const agentResults = []
  for (const agent of targets) {
    const content = support.readClaudeAgentMarkdownContent(agent.basename) || ''
    const bundle = resolveAgentSkillBundle(agent, content)
    const parsed = bundle.parsed
    const markdown = serializeAgentMarkdown(
      {
        ...parsed,
        skills: bundle.skillStems,
        tools: bundle.tools,
      },
      { heading: agent.stem },
    )
    const save = support.writeClaudeAgentMarkdownContent(agent.basename, markdown)
    agentResults.push({
      agentStem: agent.stem,
      basename: agent.basename,
      ok: save.ok,
      skillStems: bundle.skillStems,
      tools: bundle.tools,
      error: save.error,
    })
  }

  const downloaded = skillActions.filter((x) => x.action === 'downloaded')
  const templated = skillActions.filter((x) => x.action === 'templated')
  const skipped = skillActions.filter((x) => x.action === 'skipped')
  const failed = skillActions.filter((x) => x.action === 'failed')
  const uniqueSkills = seenStems.size

  return {
    ok: failed.length === 0 && agentResults.every((r) => r.ok),
    agents: agentResults.length,
    uniqueSkills,
    downloaded,
    templated,
    skipped,
    failed,
    agentResults,
    summary: [
      `智能体 ${agentResults.length} 个已写入 skills/tools frontmatter`,
      `共 ${uniqueSkills} 个 Skill 文件（去重后）`,
      `GitHub 下载 ${downloaded.length} 个 → ~/.claude/skills/`,
      templated.length ? `本地模板 ${templated.length} 个` : '',
      skipped.length ? `跳过 ${skipped.length} 个` : '',
      failed.length ? `失败 ${failed.length} 个` : '',
    ]
      .filter(Boolean)
      .join('；'),
  }
}
