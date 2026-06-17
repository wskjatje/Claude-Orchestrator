#!/usr/bin/env node
/**
 * better-sqlite3 在 vendor/cad 下为 native 模块；若曾用 Electron/其它 Node 版本安装，
 * 与当前 `node server/index.mjs` 的 ABI 不一致会导致 Bridge 无法启动。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cadRoot = path.join(root, 'server', 'vendor', 'cad')
const sqlitePkg = path.join(cadRoot, 'node_modules', 'better-sqlite3')
const sqliteBinding = path.join(sqlitePkg, 'build', 'Release', 'better_sqlite3.node')
const require = createRequire(import.meta.url)

function probeBetterSqlite3() {
  const Database = require(sqlitePkg)
  const db = new Database(':memory:')
  db.close()
}

function rebuildBetterSqlite3(reason) {
  console.log(`[fix-vendor-native] ${reason} → npm rebuild better-sqlite3 (Node ${process.version})`)
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['rebuild', 'better-sqlite3', '--prefix', cadRoot],
    { cwd: root, stdio: 'inherit' },
  )
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function shouldRebuildBetterSqlite3(err) {
  if (!fs.existsSync(sqliteBinding)) return true
  const message = err instanceof Error ? err.message : String(err)
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  if (code === 'ERR_DLOPEN_FAILED') return true
  if (message.includes('NODE_MODULE_VERSION')) return true
  if (message.includes('Could not locate the bindings file')) return true
  if (message.includes('was compiled against a different Node.js version')) return true
  return false
}

if (!fs.existsSync(sqlitePkg)) {
  process.exit(0)
}

if (!fs.existsSync(sqliteBinding)) {
  rebuildBetterSqlite3('缺少 native 绑定文件')
  probeBetterSqlite3()
  console.log('[fix-vendor-native] better-sqlite3 rebuilt OK')
  process.exit(0)
}

try {
  probeBetterSqlite3()
  console.log('[fix-vendor-native] better-sqlite3 OK')
} catch (err) {
  if (!shouldRebuildBetterSqlite3(err)) {
    throw err
  }
  rebuildBetterSqlite3('ABI 不匹配或绑定缺失')
  probeBetterSqlite3()
  console.log('[fix-vendor-native] better-sqlite3 rebuilt OK')
}
