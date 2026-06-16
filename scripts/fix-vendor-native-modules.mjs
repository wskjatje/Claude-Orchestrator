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
const require = createRequire(import.meta.url)

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

if (!fs.existsSync(sqlitePkg)) {
  process.exit(0)
}

try {
  require(sqlitePkg)
  console.log('[fix-vendor-native] better-sqlite3 OK')
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  if (code !== 'ERR_DLOPEN_FAILED' && !message.includes('NODE_MODULE_VERSION')) {
    throw err
  }
  rebuildBetterSqlite3('ABI 不匹配')
  require(sqlitePkg)
  console.log('[fix-vendor-native] better-sqlite3 rebuilt OK')
}
