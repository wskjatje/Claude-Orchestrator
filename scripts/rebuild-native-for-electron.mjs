#!/usr/bin/env node
/**
 * 为 Electron 内嵌 Node 重建 native 模块（打包版 Bridge 使用 ELECTRON_RUN_AS_NODE）。
 * 开发环境仍用 scripts/fix-vendor-native-modules.mjs（系统 Node）。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DESKTOP = path.join(ROOT, 'desktop')
const CAD_ROOT = path.join(ROOT, 'server', 'vendor', 'cad')

function readElectronVersion() {
  const pkgPath = path.join(DESKTOP, 'node_modules', 'electron', 'package.json')
  if (!fs.existsSync(pkgPath)) {
    throw new Error('未找到 desktop/node_modules/electron，请先 npm run desktop:install')
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
}

function runRebuild(moduleName, moduleRoot) {
  const electronVersion = readElectronVersion()
  console.log(`[electron-native] ${moduleName} @ Electron ${electronVersion} ← ${path.relative(ROOT, moduleRoot)}`)
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const args = [
    '@electron/rebuild',
    '-f',
    '-v',
    electronVersion,
    '-w',
    moduleName,
    '-m',
    moduleRoot,
  ]
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

if (!fs.existsSync(path.join(CAD_ROOT, 'node_modules', 'better-sqlite3'))) {
  console.error('缺少 server/vendor/cad/node_modules/better-sqlite3，请先 npm run vendor:install')
  process.exit(1)
}

runRebuild('better-sqlite3', CAD_ROOT)

if (fs.existsSync(path.join(ROOT, 'node_modules', 'node-pty'))) {
  runRebuild('node-pty', ROOT)
}

console.log('[electron-native] native 模块已为 Electron 重建完成')
