#!/usr/bin/env node
/**
 * 为 Electron 内嵌 Node 准备 native 模块（打包版 Bridge 使用 ELECTRON_RUN_AS_NODE）。
 * 开发环境仍用 scripts/fix-vendor-native-modules.mjs（系统 Node）。
 *
 * better-sqlite3 ≥13：N-API 预编译（prebuilds/），同一产物可在系统 Node 与 Electron 加载，
 * 不再按 NODE_MODULE_VERSION 分轨，也禁止再用 ABI 专用 .node 覆盖。
 * node-pty：仍须 @electron/rebuild。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DESKTOP = path.join(ROOT, 'desktop')
const SERVER = path.join(ROOT, 'server')
const CAD_ROOT = path.join(SERVER, 'vendor', 'cad')
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function readElectronVersion() {
  const pkgPath = path.join(DESKTOP, 'node_modules', 'electron', 'package.json')
  if (!fs.existsSync(pkgPath)) {
    throw new Error('未找到 desktop/node_modules/electron，请先 npm run desktop:install')
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
}

function electronExecPath() {
  const dist = path.join(DESKTOP, 'node_modules', 'electron', 'dist')
  if (process.platform === 'darwin') {
    return path.join(dist, 'Electron.app', 'Contents', 'MacOS', 'Electron')
  }
  if (process.platform === 'win32') {
    return path.join(dist, 'electron.exe')
  }
  return path.join(dist, 'electron')
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function runElectronRebuild(moduleName, moduleRoot) {
  const electronVersion = readElectronVersion()
  console.log(
    `[electron-native] ${moduleName} @ Electron ${electronVersion} ← ${path.relative(ROOT, moduleRoot)}`,
  )
  run(NPX, [
    '@electron/rebuild',
    '-f',
    '-v',
    electronVersion,
    '-w',
    moduleName,
    '-m',
    moduleRoot,
  ])
}

function readBetterSqlite3Meta(sqlitePkg) {
  const pkg = JSON.parse(fs.readFileSync(path.join(sqlitePkg, 'package.json'), 'utf8'))
  const major = Number(String(pkg.version || '').split('.')[0])
  const usesNapi =
    Number.isFinite(major) && major >= 13
      ? true
      : fs.existsSync(path.join(sqlitePkg, 'prebuilds'))
  return { version: pkg.version, major, usesNapi }
}

function probeBetterSqlite3In(execPath, label) {
  const sqliteRel = './vendor/cad/node_modules/better-sqlite3'
  const script = `
    const D = require(${JSON.stringify(sqliteRel)});
    const db = new D(':memory:');
    for (let i = 0; i < 200; i++) {
      db.prepare('select ? as n').get(i);
    }
    db.close();
    console.log('electron-native-ok');
  `
  const r = spawnSync(execPath, ['-e', script], {
    cwd: SERVER,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8',
    timeout: 30_000,
  })
  const out = `${r.stdout || ''}${r.stderr || ''}`
  if (r.status === 0 && out.includes('electron-native-ok')) {
    console.log(`[electron-native] better-sqlite3 ${label} 探针通过 ✓`)
    return true
  }
  const detail = [
    out.trim().slice(-2000),
    r.signal ? `signal=${r.signal}` : '',
    r.error ? `spawn: ${r.error.message}` : '',
    r.status != null ? `exit=${r.status}` : 'exit=unknown',
  ]
    .filter(Boolean)
    .join('\n')
  console.error(`[electron-native] better-sqlite3 ${label} 探针失败：`)
  console.error(detail || '(无输出)')
  return false
}

function prepareBetterSqlite3() {
  const sqlitePkg = path.join(CAD_ROOT, 'node_modules', 'better-sqlite3')
  if (!fs.existsSync(sqlitePkg)) {
    console.error('缺少 server/vendor/cad/node_modules/better-sqlite3，请先 npm run vendor:install')
    process.exit(1)
  }
  const meta = readBetterSqlite3Meta(sqlitePkg)
  console.log(`[electron-native] better-sqlite3 ${meta.version} (N-API=${meta.usesNapi})`)

  if (!meta.usesNapi) {
    console.error(
      '[electron-native] 需要 better-sqlite3 ≥13（N-API）。当前版本在 Node 24 / Electron 下会 SIGABRT。\n' +
        '请在 server/vendor/cad 执行：npm install better-sqlite3@^13.0.3 --omit=dev',
    )
    process.exit(1)
  }

  // 系统 Node 先验（打包机本机）
  const nodeProbe = spawnSync(
    process.execPath,
    [
      '-e',
      `const D=require(${JSON.stringify(sqlitePkg)}); const db=new D(':memory:'); db.prepare('select 1').get(); db.close(); console.log('node-ok');`,
    ],
    { encoding: 'utf8', timeout: 30_000 },
  )
  if (nodeProbe.status !== 0 || !String(nodeProbe.stdout || '').includes('node-ok')) {
    console.error('[electron-native] 系统 Node 无法加载 better-sqlite3：')
    console.error(`${nodeProbe.stderr || ''}${nodeProbe.stdout || ''}`.trim() || nodeProbe.signal)
    process.exit(1)
  }
  console.log('[electron-native] better-sqlite3 系统 Node 探针通过 ✓')

  const execPath = electronExecPath()
  if (!fs.existsSync(execPath)) {
    throw new Error(`未找到 Electron 可执行文件：${execPath}`)
  }
  if (!probeBetterSqlite3In(execPath, 'Electron')) {
    if (process.env.PACK_SKIP_ELECTRON_PROBE === '1') {
      console.warn('[electron-native] 已跳过 Electron 探针失败（PACK_SKIP_ELECTRON_PROBE=1）')
      return
    }
    process.exit(1)
  }
}

prepareBetterSqlite3()

if (fs.existsSync(path.join(ROOT, 'node_modules', 'node-pty'))) {
  runElectronRebuild('node-pty', ROOT)
}

console.log('[electron-native] native 模块已为 Electron 准备完成')
