'use strict'

const path = require('node:path')
const projectDb = require('./project-db.cjs')

const PROJECT_ROOT = path.join(__dirname, '..')
const PROJECT_DATA_DIR = path.join(PROJECT_ROOT, '.claudecode')
const PROJECT_DB_PATH = path.join(PROJECT_DATA_DIR, 'workbench.db')
const MAX_LOG_ROWS = 12_000

function db() {
  return projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR)
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
  clearAppLogs,
  formatLogLine,
}
