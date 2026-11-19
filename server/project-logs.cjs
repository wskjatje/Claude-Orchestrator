'use strict'

const projectDb = require('./project-db.cjs')
const { projectDataDir, projectDbPath } = require('./project-data-path.cjs')

const MAX_LOG_ROWS = 12_000

function db() {
  return projectDb.getDb(projectDbPath, projectDataDir)
}

function parseLevel(message) {
  const m = String(message || '').match(/\b(INFO|WARN|ERROR|DEBUG)\b/)
  return m ? m[1] : 'INFO'
}

function formatLogLine(row) {
  const ts = row.ts || new Date().toISOString()
  let level = row.level || 'INFO'
  let msg = String(row.message || '').replace(/\r?\n/g, ' ')
  const levelPrefix = msg.match(/^(INFO|WARN|ERROR|DEBUG)\b/)
  if (levelPrefix) {
    level = levelPrefix[1]
    msg = msg.slice(levelPrefix[0].length).trim()
  }
  return `[${ts}] ${level} ${msg}`
}

function appendLogEntry(entry) {
  try {
    const ts = entry?.ts || new Date().toISOString()
    const level = entry?.level || parseLevel(entry?.message)
    const source = typeof entry?.source === 'string' ? entry.source : 'app'
    const message = String(entry?.message || '').slice(0, 8000)
    const meta = entry?.meta != null ? JSON.stringify(entry.meta).slice(0, 16_000) : null
    const conn = db()
    conn.prepare(
      `INSERT INTO log_entries (ts, level, source, message, meta) VALUES (?, ?, ?, ?, ?)`,
    ).run(ts, level, source, message, meta)
    conn.prepare(
      `DELETE FROM log_entries WHERE id NOT IN (
         SELECT id FROM log_entries ORDER BY id DESC LIMIT ?
       )`,
    ).run(MAX_LOG_ROWS)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

function readLogTail(opts = {}) {
  try {
    const maxLines =
      typeof opts.maxLines === 'number' && opts.maxLines > 0 ? Math.min(2000, opts.maxLines) : 400
    const source = typeof opts.source === 'string' ? opts.source : 'app'
    const conn = db()
    let rows
    if (source === 'app' || source === 'workbench') {
      rows = conn
        .prepare(
          `SELECT ts, level, source, message FROM log_entries
           WHERE source IN ('app', 'workbench')
           ORDER BY id DESC LIMIT ?`,
        )
        .all(maxLines)
    } else if (source === 'event') {
      rows = conn
        .prepare(
          `SELECT ts, level, source, message FROM log_entries
           WHERE source = 'event'
           ORDER BY id DESC LIMIT ?`,
        )
        .all(maxLines)
    } else {
      rows = conn
        .prepare(`SELECT ts, level, source, message FROM log_entries ORDER BY id DESC LIMIT ?`)
        .all(maxLines)
    }
    const lines = rows.reverse().map(formatLogLine)
    return { ok: true, content: lines.join('\n'), lines: lines.length }
  } catch (e) {
    return { ok: false, error: e?.message || String(e), content: '', lines: 0 }
  }
}

function aggregateAgentTurnRows(rows) {
    const groups = new Map()
    for (const row of rows || []) {
      let meta
      try { meta = JSON.parse(row.meta || '{}') } catch { meta = {} }
      const model = String(meta.model || 'unknown')
      const backend = String(meta.backend || 'unknown')
      const key = `${backend}\0${model}`
      const item = groups.get(key) || {
        model, backend, turns: 0, success: 0, failed: 0, durationMs: 0,
        promptTokens: 0, retries: 0, toolFailures: 0, mcpCalls: 0,
      }
      item.turns += 1
      if (/agent-turn success/.test(row.message)) item.success += 1
      else item.failed += 1
      item.durationMs += Math.max(0, Number(meta.eval_ms ?? meta.durationMs) || 0)
      item.promptTokens += Math.max(0, Number(meta.prompt_tok) || 0)
      item.retries += Math.max(0, Number(meta.retry) || 0)
      item.toolFailures += Math.max(0, Number(meta.tool_fail) || 0)
      item.mcpCalls += Math.max(0, Number(meta.mcp_calls) || 0)
      groups.set(key, item)
    }
    const trends = [...groups.values()]
      .map((item) => ({
        ...item,
        successRate: item.turns ? item.success / item.turns : 0,
        avgDurationMs: item.turns ? Math.round(item.durationMs / item.turns) : 0,
      }))
      .sort((a, b) => b.turns - a.turns || b.successRate - a.successRate)
    const content = trends.length
      ? [
          `Agent 回合指标（最近 ${(rows || []).length} 条）`,
          '',
          ...trends.map((item) =>
            `${item.backend} · ${item.model}  成功 ${item.success}/${item.turns} (${Math.round(item.successRate * 100)}%)  平均 ${item.avgDurationMs}ms  prompt ${item.promptTokens} tok  重试 ${item.retries}  工具失败 ${item.toolFailures}  MCP ${item.mcpCalls}`,
          ),
        ].join('\n')
      : '（暂无 Agent 回合指标；完成一次 Host Agent 任务后会自动出现）'
    return { trends, content, lines: content.split('\n').length }
}

function readAgentTurnTrends(opts = {}) {
  try {
    const limit = Math.min(12_000, Math.max(1, Number(opts.limit) || 2_000))
    const rows = db()
      .prepare(
        `SELECT ts, message, meta FROM log_entries
         WHERE source = 'event' AND message LIKE 'agent-turn %'
         ORDER BY id DESC LIMIT ?`,
      )
      .all(limit)
    return { ok: true, ...aggregateAgentTurnRows(rows) }
  } catch (e) {
    return { ok: false, error: e?.message || String(e), trends: [], content: '', lines: 0 }
  }
}

function clearAppLogs() {
  try {
    const conn = db()
    conn.prepare(`DELETE FROM log_entries WHERE source IN ('app', 'workbench')`).run()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

module.exports = {
  appendLogEntry,
  readLogTail,
  aggregateAgentTurnRows,
  readAgentTurnTrends,
  clearAppLogs,
  formatLogLine,
}
