#!/usr/bin/env node
/**
 * better-sqlite3 在 vendor/cad 下为 native 模块。
 * ≥13 使用 N-API prebuilds（同一产物服务系统 Node / Electron）。
 * 探针在子进程中运行，避免错误二进制 SIGKILL 拖垮父进程。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cadRoot = path.join(root, 'server', 'vendor', 'cad')
const sqlitePkg = path.join(cadRoot, 'node_modules', 'better-sqlite3')

function readMeta() {
  const pkg = JSON.parse(fs.readFileSync(path.join(sqlitePkg, 'package.json'), 'utf8'))
  const major = Number(String(pkg.version || '').split('.')[0])
  return { version: pkg.version, major }
}

function probeInChild() {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `
        const Database = require(${JSON.stringify(sqlitePkg)});
        const db = new Database(':memory:');
        for (let i = 0; i < 200; i++) db.prepare('select ? as n').get(i);
        db.close();
      `,
    ],
    { cwd: root, encoding: 'utf8' },
  )
  if (result.signal) {
    return {
      ok: false,
      reason: `probe ${result.signal}`,
      detail: result.stderr || result.stdout || '',
    }
  }
  if (result.status !== 0) {
    const detail = `${result.stderr || ''}\n${result.stdout || ''}`.trim()
    return { ok: false, reason: `probe exit ${result.status}`, detail }
  }
  return { ok: true }
}

function rebuildBetterSqlite3(reason) {
  console.log(`[fix-vendor-native] ${reason} → npm rebuild better-sqlite3 (Node ${process.version})`)
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['rebuild', 'better-sqlite3', '--prefix', cadRoot],
    { cwd: root, stdio: 'inherit' },
  )
  if (result.signal) {
    console.error(`[fix-vendor-native] rebuild 被信号中断：${result.signal}`)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (!fs.existsSync(sqlitePkg)) {
  process.exit(0)
}

const meta = readMeta()
if (!(Number.isFinite(meta.major) && meta.major >= 13)) {
  console.error(
    `[fix-vendor-native] better-sqlite3@${meta.version} 在 Node 24 会 SIGABRT（RemoveEnvironmentCleanupHook）。\n` +
      `请升级到 N-API 版：\n` +
      `  npm --prefix server/vendor/cad install better-sqlite3@^13.0.3 --omit=dev`,
  )
  process.exit(1)
}

const probe = probeInChild()
if (probe.ok) {
  console.log(`[fix-vendor-native] better-sqlite3 ${meta.version} OK`)
  process.exit(0)
}

rebuildBetterSqlite3(`无法加载（${probe.reason}）`)
const after = probeInChild()
if (!after.ok) {
  console.error(
    '[fix-vendor-native] rebuild 后仍无法加载 better-sqlite3:',
    after.detail || after.reason,
  )
  process.exit(1)
}
console.log(`[fix-vendor-native] better-sqlite3 ${meta.version} rebuilt OK`)
