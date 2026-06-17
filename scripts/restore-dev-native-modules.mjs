#!/usr/bin/env node
/** 打包完成后把 native 模块恢复为系统 Node ABI，避免影响 npm run web:dev:full */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function runNodeScript(rel) {
  const r = spawnSync(process.execPath, [path.join(ROOT, rel)], { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

runNodeScript('scripts/fix-vendor-native-modules.mjs')

const rebuildPty = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['rebuild', 'node-pty'],
  { cwd: ROOT, stdio: 'inherit' },
)
if (rebuildPty.status !== 0) process.exit(rebuildPty.status ?? 1)

runNodeScript('scripts/fix-node-pty-perms.mjs')
console.log('[dev-native] 已恢复为系统 Node 可用的 native 模块')
