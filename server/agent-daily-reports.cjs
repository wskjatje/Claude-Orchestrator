'use strict'

const fs = require('node:fs')
const path = require('node:path')
const support = require('./cad-support.cjs')

function sanitizeAgentStem(stem) {
  const s = String(stem || '')
    .trim()
    .slice(0, 120)
  if (!s) return '_unknown'
  const safe = s.replace(/[^a-zA-Z0-9._-]/g, '_')
  return safe || '_unknown'
}

function agentDailyReportDir(dailyReportsDir, date) {
  return path.join(dailyReportsDir, date)
}

function agentDailyReportFile(dailyReportsDir, date, stem) {
  return path.join(agentDailyReportDir(dailyReportsDir, date), `${sanitizeAgentStem(stem)}.md`)
}

function listAgentDailyReportDates(dailyReportsDir) {
  if (!dailyReportsDir || !fs.existsSync(dailyReportsDir)) return []
  const dates = new Set()
  for (const name of fs.readdirSync(dailyReportsDir)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(name)) {
      const sub = path.join(dailyReportsDir, name)
      if (fs.statSync(sub).isDirectory()) dates.add(name)
    }
    const m = /^(\d{4}-\d{2}-\d{2})-mcp-agent\.md$/.exec(name)
    if (m) dates.add(m[1])
  }
  return [...dates].sort().reverse()
}

function listAgentStemsForDate(dailyReportsDir, date) {
  const dir = agentDailyReportDir(dailyReportsDir, date)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .map((n) => n.slice(0, -3))
    .sort()
}

function defaultReportMarkdown(agent, date) {
  return `# ${agent} · ${date}

## 执行摘要

（待生成或手动填写）

## 今日活动

## 产出与变更

## 风险与待办

---
_自动生成 · 原始追踪见「日志 → 追踪」_
`
}

function formatActivityLine(event) {
  const ts = event.ts || new Date().toISOString()
  const source = event.source || event.mode || 'exec'
  const preview = String(event.instruction_preview || event.instruction || '').trim()
  const taskId = event.taskId ? ` · task=${event.taskId}` : ''
  const detail = preview ? preview.slice(0, 200) : '（无说明）'
  return `- \`${ts}\` · **${source}**${taskId} · ${detail}`
}

function appendUnderSection(content, sectionTitle, line) {
  const heading = `## ${sectionTitle}`
  let body = content || ''
  if (!body.trim()) return `${heading}\n\n${line}\n`
  if (!body.includes(heading)) {
    const footer = '\n---\n'
    const idx = body.indexOf(footer)
    if (idx >= 0) {
      body = `${body.slice(0, idx).trimEnd()}\n\n${heading}\n\n${line}\n\n${body.slice(idx)}`
    } else {
      body = `${body.trimEnd()}\n\n${heading}\n\n${line}\n`
    }
    return body
  }
  const start = body.indexOf(heading) + heading.length
  const nextHeading = body.slice(start).search(/\n## /)
  const end = nextHeading >= 0 ? start + nextHeading : body.length
  const before = body.slice(0, end).trimEnd()
  const after = body.slice(end)
  return `${before}\n${line}\n${after}`
}

function appendAgentDailyActivity(dailyReportsDir, event) {
  if (!dailyReportsDir) return { ok: false, error: 'no dir' }
  const type = event?.type || event?.event
  if (type !== 'agent_exec') return { ok: true, skipped: true }
  if (event?.phase === 'end') return { ok: true, skipped: true }
  const agent = String(event.agent || event.stem || '').trim()
  if (!agent) return { ok: true, skipped: true }
  const date = support.formatLocalYYYYMMDD(new Date(event.ts || Date.now()))
  const fp = agentDailyReportFile(dailyReportsDir, date, agent)
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  let content = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : defaultReportMarkdown(agent, date)
  content = appendUnderSection(content, '今日活动', formatActivityLine(event))
  fs.writeFileSync(fp, content, 'utf8')
  return { ok: true, path: fp, date, stem: sanitizeAgentStem(agent) }
}

function readAgentDailyReport(dailyReportsDir, date, stem) {
  if (!dailyReportsDir) return { ok: false, error: '日报目录未配置' }
  const fp = agentDailyReportFile(dailyReportsDir, date, stem)
  if (!fs.existsSync(fp)) {
    return { ok: true, date, stem: sanitizeAgentStem(stem), content: '', missing: true, path: fp }
  }
  return {
    ok: true,
    date,
    stem: sanitizeAgentStem(stem),
    content: fs.readFileSync(fp, 'utf8'),
    missing: false,
    path: fp,
  }
}

function writeAgentDailyReport(dailyReportsDir, date, stem, content) {
  if (!dailyReportsDir) return { ok: false, error: '日报目录未配置' }
  const safeDate =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? date.trim()
      : support.formatLocalYYYYMMDD()
  const safeStem = sanitizeAgentStem(stem)
  const fp = agentDailyReportFile(dailyReportsDir, safeDate, safeStem)
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, typeof content === 'string' ? content : '', 'utf8')
  return { ok: true, date: safeDate, stem: safeStem, path: fp }
}

function buildAgentDailyReportFromEvents(dailyReportsDir, date, stem, eventsPath) {
  if (!dailyReportsDir) return { ok: false, error: '日报目录未配置' }
  const safeDate =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? date.trim()
      : support.formatLocalYYYYMMDD()
  const agent = String(stem || '').trim()
  if (!agent) return { ok: false, error: '缺少 agent stem' }
  const stemLower = agent.toLowerCase()
  const lines = []
  if (eventsPath && fs.existsSync(eventsPath)) {
    let buf = fs.readFileSync(eventsPath)
    if (buf.length > 1_500_000) buf = buf.slice(-1_500_000)
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue
      try {
        const o = JSON.parse(line)
        if (support.formatLocalYYYYMMDD(new Date(o.ts)) !== safeDate) continue
        const oAgent = String(o.agent || o.stem || '').toLowerCase()
        if (!oAgent.includes(stemLower) && !stemLower.includes(oAgent)) continue
        if (o.type === 'agent_exec' || o.event === 'agent_exec') {
          lines.push(formatActivityLine(o))
        }
      } catch {
        /* skip */
      }
    }
  }
  let content = defaultReportMarkdown(agent, safeDate)
  if (lines.length) {
    content = appendUnderSection(content, '今日活动', lines.join('\n'))
  }
  return writeAgentDailyReport(dailyReportsDir, safeDate, agent, content)
}

function logsOverviewSnapshot(appPath, eventsPath) {
  const appR = support.readTextFileTail(appPath || '', 240, 200_000, '')
  const appLines = (appR.content || '').split('\n').filter((l) => l.trim())
  const appPick =
    [...appLines].reverse().find((l) => /\b(ERROR|WARN)\b/.test(l)) ||
    appLines[appLines.length - 1] ||
    ''
  const evR = support.readTextFileTail(eventsPath || '', 120, 300_000, '')
  const evLines = (evR.content || '').split('\n').filter((l) => l.trim())
  let eventsPick = ''
  for (let i = evLines.length - 1; i >= 0; i--) {
    try {
      const o = JSON.parse(evLines[i])
      if (o.type === 'agent_exec' || o.event === 'agent_exec') {
        eventsPick = `agent_exec · ${o.agent || '?'} · ${String(o.instruction_preview || '').slice(0, 80)}`
        break
      }
    } catch {
      /* skip */
    }
  }
  if (!eventsPick && evLines.length) {
    eventsPick = evLines[evLines.length - 1].slice(0, 120)
  }
  return {
    ok: true,
    appHighlight: appPick.slice(0, 200),
    eventsHighlight: eventsPick.slice(0, 200),
  }
}

module.exports = {
  sanitizeAgentStem,
  listAgentDailyReportDates,
  listAgentStemsForDate,
  appendAgentDailyActivity,
  readAgentDailyReport,
  writeAgentDailyReport,
  buildAgentDailyReportFromEvents,
  logsOverviewSnapshot,
  defaultReportMarkdown,
}
