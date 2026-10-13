#!/usr/bin/env node
/**
 * 校验 .app 内 better-sqlite3（≥13 N-API）是否能在 Electron 内嵌 Node 下加载。
 * 在 electron-builder 之后、restore-dev-native 之前调用。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DESKTOP = path.join(ROOT, 'desktop')
const RELEASE = path.join(DESKTOP, 'release')

function findApps(dir) {
  if (!fs.existsSync(dir)) return []
  const apps = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name.endsWith('.app')) {
      apps.push(full)
    } else if (entry.isDirectory() && !entry.name.endsWith('.blockmap')) {
      apps.push(...findApps(full))
    }
  }
  return apps
}

function findMacApp() {
  const env = process.env.PACKAGED_APP?.trim()
  if (env && fs.existsSync(env)) return env
  const apps = findApps(RELEASE).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return apps[0] ?? null
}

function electronExec(appPath) {
  const macosDir = path.join(appPath, 'Contents', 'MacOS')
  if (fs.existsSync(macosDir)) {
    const bins = fs.readdirSync(macosDir).filter((n) => !n.startsWith('.'))
    if (bins.length === 1) return path.join(macosDir, bins[0])
  }
  return path.join(appPath, 'Contents', 'MacOS', path.basename(appPath, '.app'))
}

function probeSqlite(appPath) {
  const execPath = electronExec(appPath)
  const serverDir = path.join(appPath, 'Contents', 'Resources', 'backend', 'server')
  const sqliteRel = './vendor/cad/node_modules/better-sqlite3'
  const script = `
    const D = require(${JSON.stringify(sqliteRel)});
    const ver = require(${JSON.stringify(sqliteRel + '/package.json')}).version;
    const major = Number(String(ver).split('.')[0]);
    if (!(major >= 13)) throw new Error('need better-sqlite3>=13, got ' + ver);
    const db = new D(':memory:');
    for (let i = 0; i < 300; i++) db.prepare('select ? as n').get(i);
    db.close();
    console.log('packaged-native-ok');
  `
  const r = spawnSync(execPath, ['-e', script], {
    cwd: serverDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8',
  })
  const out = `${r.stdout || ''}${r.stderr || ''}`
  return { ok: r.status === 0 && out.includes('packaged-native-ok'), out, status: r.status ?? 1 }
}

const appPath = findMacApp()
if (!appPath) {
  console.error('[verify-packaged-native] 未找到 .app（请设置 PACKAGED_APP 或先完成 electron-builder）')
  process.exit(1)
}

console.log(`[verify-packaged-native] 校验 ${appPath}`)
const result = probeSqlite(appPath)
if (!result.ok) {
  console.error('[verify-packaged-native] 失败：better-sqlite3 无法在 Electron 内加载（需 ≥13 N-API）。')
  console.error(result.out.trim().slice(-2000) || '(无输出)')
  console.error('\n请确认 server/vendor/cad 已安装 better-sqlite3@^13.0.3，并已执行 scripts/rebuild-native-for-electron.mjs。')
  process.exit(1)
}

console.log('[verify-packaged-native] better-sqlite3 可在 Electron 内加载 ✓')
