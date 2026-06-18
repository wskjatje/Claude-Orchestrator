#!/usr/bin/env node
/**
 * 为 Electron 内嵌 Node 准备 native 模块（打包版 Bridge 使用 ELECTRON_RUN_AS_NODE）。
 * 开发环境仍用 scripts/fix-vendor-native-modules.mjs（系统 Node ABI）。
 *
 * better-sqlite3：bindings 优先加载 build/Release/*.node（vendor:install 后为系统 ABI）。
 * prebuild-install 会把 Electron 预编译包放到 bin/{platform}-{arch}-{modules}/；
 * 打包前须复制到 build/Release，否则 .app 内仍是 ABI 127。
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

function electronModuleVersion() {
  const execPath = electronExecPath()
  if (!fs.existsSync(execPath)) {
    throw new Error(`未找到 Electron 可执行文件：${execPath}`)
  }
  const r = spawnSync(
    execPath,
    ['-e', 'console.log(process.versions.modules)'],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8' },
  )
  const out = String(r.stdout || '').trim()
  if (r.status !== 0 || !/^\d+$/.test(out)) {
    throw new Error(`无法读取 Electron NODE_MODULE_VERSION：${(r.stderr || r.stdout || '').trim()}`)
  }
  return out
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

function stageBetterSqlite3ForElectron() {
  const sqlitePkg = path.join(CAD_ROOT, 'node_modules', 'better-sqlite3')
  const electronVersion = readElectronVersion()
  const modules = electronModuleVersion()
  const tag = `${process.platform}-${process.arch}-${modules}`
  const prebuild = path.join(sqlitePkg, 'bin', tag, 'better-sqlite3.node')
  const releaseBin = path.join(sqlitePkg, 'build', 'Release', 'better_sqlite3.node')

  if (!fs.existsSync(prebuild)) {
    console.log(`[electron-native] prebuild-install ${tag} (Electron ${electronVersion})…`)
    run(NPX, ['prebuild-install', '-r', 'electron', '-t', electronVersion, '--arch', process.arch], {
      cwd: sqlitePkg,
    })
  }

  if (!fs.existsSync(prebuild)) {
    console.warn(`[electron-native] 未找到 ${path.relative(ROOT, prebuild)}，回退 @electron/rebuild`)
    runElectronRebuild('better-sqlite3', CAD_ROOT)
  }

  if (fs.existsSync(prebuild)) {
    fs.mkdirSync(path.dirname(releaseBin), { recursive: true })
    fs.copyFileSync(prebuild, releaseBin)
    console.log(
      `[electron-native] better-sqlite3 ← ${path.relative(ROOT, prebuild)} → build/Release/better_sqlite3.node`,
    )
  } else if (!fs.existsSync(releaseBin)) {
    console.error('[electron-native] 无法为 Electron 准备 better-sqlite3 二进制')
    process.exit(1)
  }
}

function assertStagedBetterSqlite3(sqlitePkg, modules) {
  const tag = `${process.platform}-${process.arch}-${modules}`
  const prebuild = path.join(sqlitePkg, 'bin', tag, 'better-sqlite3.node')
  const releaseBin = path.join(sqlitePkg, 'build', 'Release', 'better_sqlite3.node')
  if (!fs.existsSync(releaseBin)) {
    throw new Error(`缺少 ${path.relative(ROOT, releaseBin)}`)
  }
  if (fs.existsSync(prebuild)) {
    const a = fs.readFileSync(prebuild)
    const b = fs.readFileSync(releaseBin)
    if (!a.equals(b)) {
      throw new Error('build/Release/better_sqlite3.node 与 Electron 预编译包不一致')
    }
  }
  console.log(`[electron-native] better-sqlite3 staged for Electron ABI ${modules} ✓`)
}

function probeBetterSqlite3Electron(stagingOk) {
  const execPath = electronExecPath()
  const sqliteRel = './vendor/cad/node_modules/better-sqlite3'
  const script = `
    const D = require(${JSON.stringify(sqliteRel)});
    const db = new D(':memory:');
    db.prepare('select 1 as ok').get();
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
    console.log('[electron-native] better-sqlite3 Electron 探针通过 ✓')
    return
  }
  if (process.env.PACK_SKIP_ELECTRON_PROBE === '1') {
    console.warn('[electron-native] 已跳过 Electron 探针（PACK_SKIP_ELECTRON_PROBE=1）')
    return
  }
  const detail = [
    out.trim().slice(-2000),
    r.signal ? `signal=${r.signal}` : '',
    r.error ? `spawn: ${r.error.message}` : '',
    r.status != null ? `exit=${r.status}` : 'exit=unknown',
  ]
    .filter(Boolean)
    .join('\n')
  if (stagingOk) {
    console.warn(
      '[electron-native] Electron 探针未通过，但 staged 校验已通过；继续打包（最终以 verify-packaged-native 为准）',
    )
    if (detail) console.warn(detail)
    return
  }
  console.error('[electron-native] Electron 仍无法加载 better-sqlite3：')
  console.error(detail || '(无输出)')
  process.exit(1)
}

if (!fs.existsSync(path.join(CAD_ROOT, 'node_modules', 'better-sqlite3'))) {
  console.error('缺少 server/vendor/cad/node_modules/better-sqlite3，请先 npm run vendor:install')
  process.exit(1)
}

stageBetterSqlite3ForElectron()
const sqlitePkg = path.join(CAD_ROOT, 'node_modules', 'better-sqlite3')
const modules = electronModuleVersion()
let stagingOk = false
try {
  assertStagedBetterSqlite3(sqlitePkg, modules)
  stagingOk = true
} catch (err) {
  console.error(`[electron-native] ${err instanceof Error ? err.message : err}`)
  process.exit(1)
}
probeBetterSqlite3Electron(stagingOk)

if (fs.existsSync(path.join(ROOT, 'node_modules', 'node-pty'))) {
  runElectronRebuild('node-pty', ROOT)
}

console.log('[electron-native] native 模块已为 Electron 准备完成')
