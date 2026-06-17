#!/usr/bin/env node
/** 打包完成后把 native 模块恢复为系统 Node ABI，避免影响 npm run web:dev:full */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CAD_ROOT = path.join(ROOT, 'server', 'vendor', 'cad')

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: opts.cwd || ROOT, stdio: 'inherit', env: process.env })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function runNodeScript(rel) {
  run(process.execPath, [path.join(ROOT, rel)])
}

console.log('[dev-native] 打包后恢复开发环境 native 模块…')

// 刚为 Electron 重建过，直接强制 rebuild 比 probe 更可靠（避免 bindings 缺失时抛错）
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
  'rebuild',
  'better-sqlite3',
  '--prefix',
  CAD_ROOT,
])
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['rebuild', 'node-pty'])

runNodeScript('scripts/fix-vendor-native-modules.mjs')
runNodeScript('scripts/fix-node-pty-perms.mjs')

console.log('[dev-native] 已恢复为系统 Node 可用的 native 模块')
