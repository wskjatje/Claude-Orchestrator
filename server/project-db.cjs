'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const CAD_SQLITE = path.join(__dirname, 'vendor/cad/node_modules/better-sqlite3')

/** @type {import('better-sqlite3') | null} */
let Database = null
try {
  Database = require(CAD_SQLITE)
} catch {
  Database = null
}

/** @type {import('better-sqlite3').Database | null} */
let dbSingleton = null

function openDatabase(dbPath, projectDataDir) {
  if (!Database) {
    throw new Error('无法加载 better-sqlite3，请运行 npm run vendor:install')
  }
  fs.mkdirSync(projectDataDir, { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE TABLE IF NOT EXISTS log_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'INFO',
      source TEXT NOT NULL DEFAULT 'app',
      message TEXT NOT NULL,
      meta TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_log_entries_id ON log_entries(id DESC);
  `)
  return db
}

function getDb(dbPath, projectDataDir) {
  if (!dbSingleton) {
    dbSingleton = openDatabase(dbPath, projectDataDir)
  }
  return dbSingleton
}

function closeDb() {
  if (dbSingleton) {
    dbSingleton.close()
    dbSingleton = null
  }
}

function dbGet(db, key) {
  const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key)
  if (!row?.value) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return null
  }
}

function dbSet(db, key, value) {
  const payload = JSON.stringify(value)
  db.prepare(
    `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, payload, Date.now())
}

function readJsonFileIfExists(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function migrateLegacyIntoDb(db, legacyDir) {
  if (!legacyDir || !fs.existsSync(legacyDir)) return { migrated: [] }
  const migrated = []

  const pairs = [
    ['workspace', path.join(legacyDir, 'workspace.json')],
    ['chat_settings', path.join(legacyDir, 'chat-settings.json')],
    ['chat_sessions', path.join(legacyDir, 'chat-sessions.json')],
    ['scheduled_tasks', path.join(legacyDir, 'scheduled-tasks.json')],
  ]

  for (const [key, filePath] of pairs) {
    if (dbGet(db, key) != null) continue
    const raw = readJsonFileIfExists(filePath)
    if (raw == null) continue
    if (key === 'workspace') {
      dbSet(db, key, raw)
    } else if (key === 'scheduled_tasks') {
      const tasks = Array.isArray(raw.tasks) ? raw.tasks : Array.isArray(raw) ? raw : []
      dbSet(db, key, { version: 1, tasks })
    } else {
      dbSet(db, key, raw)
    }
    migrated.push(key)
  }

  const legacyOrch = path.join(legacyDir, 'orchestration', 'active-chain.json')
  return { migrated, legacyOrchPath: fs.existsSync(legacyOrch) ? legacyOrch : null }
}

function ensureMigrated(db, dbPath, projectDataDir, legacyDir, projectOrchPath) {
  const hasAny = db.prepare('SELECT COUNT(*) AS n FROM kv').get()?.n > 0
  const { migrated, legacyOrchPath } = migrateLegacyIntoDb(db, legacyDir)

  if (projectOrchPath && legacyOrchPath && !fs.existsSync(projectOrchPath)) {
    try {
      fs.mkdirSync(path.dirname(projectOrchPath), { recursive: true })
      fs.copyFileSync(legacyOrchPath, projectOrchPath)
      migrated.push('orchestration_chain_file')
    } catch {
      /* ignore */
    }
  }

  return { dbPath, migrated, hadData: hasAny || migrated.length > 0 }
}

function loadKv(db, key, fallback) {
  const v = dbGet(db, key)
  return v == null ? fallback : v
}

function saveKv(db, key, value) {
  dbSet(db, key, value)
  return value
}

module.exports = {
  getDb,
  closeDb,
  dbGet,
  dbSet,
  loadKv,
  saveKv,
  ensureMigrated,
  readJsonFileIfExists,
}
