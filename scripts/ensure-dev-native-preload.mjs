/**
 * 开发 Bridge 启动前探测 better-sqlite3 ABI（含 node --watch 每次重启）。
 * 打包 desktop:pack 会把 native 模块编译为 Electron ABI，需自动恢复为系统 Node。
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixScript = path.join(root, 'scripts', 'fix-vendor-native-modules.mjs')

const r = spawnSync(process.execPath, [fixScript], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})
if (r.status !== 0) {
  process.exit(r.status ?? 1)
}
