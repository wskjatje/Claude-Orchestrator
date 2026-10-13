#!/usr/bin/env node
/**
 * 构建 Claude Orchestrator 可安装包（macOS .dmg / .app）
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WEB_DIST = path.join(ROOT, 'web', 'dist-electron')
const DESKTOP = path.join(ROOT, 'desktop')

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}\n`)
  const env = { ...process.env, ...opts.env }
  // 污染环境会导致打包后的 Electron 以「纯 Node」启动、立刻退出
  delete env.ELECTRON_RUN_AS_NODE
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    stdio: 'inherit',
    env,
  })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

function rmrf(...segments) {
  const dir = path.join(...segments)
  if (!fs.existsSync(dir)) return
  console.log(`\n> 清理：${path.relative(ROOT, dir)}`)
  // 先试 Node；ENOTEMPTY（被占用/残留句柄）时回退 /bin/rm
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  } catch (err) {
    console.warn(`[pack] fs.rmSync 失败，回退 /bin/rm：${err instanceof Error ? err.message : err}`)
    const r = spawnSync('/bin/rm', ['-rf', dir], { stdio: 'inherit' })
    if (r.status !== 0 && fs.existsSync(dir)) {
      throw err
    }
  }
}

console.log('=== Claude Orchestrator · 打包 ===')

// 1. 清理上次构建产物，确保用最新代码打包
rmrf(ROOT, 'web', 'dist-electron')
rmrf(ROOT, 'web', '.tanstack')
rmrf(DESKTOP, 'release')
rmrf(DESKTOP, 'out')

run('npm', ['run', 'vendor:install'])
run('npm', ['run', 'web:build'])

// 2. 预渲染 SSR HTML 作为 SPA 入口（TanStack Start 无独立 SPA 入口）
console.log('\n> 预渲染 SSR SPA 入口…\n')
run('node', ['scripts/prerender-spa-entry.mjs'])

if (!fs.existsSync(path.join(WEB_DIST, 'index.html'))) {
  console.error(`\n错误：未找到 ${WEB_DIST}/index.html，请先修复 web 构建。\n`)
  process.exit(1)
}

run('npm', ['run', 'desktop:install'])
run('node', ['scripts/rebuild-native-for-electron.mjs'])

// asar 内不能 import ../server/：打包前把桥接常量同步进 desktop/
{
  const src = path.join(ROOT, 'server', 'bridge-constants.mjs')
  const dest = path.join(DESKTOP, 'bridge-constants.mjs')
  const body = fs.readFileSync(src, 'utf8')
  const banner =
    '/**\n' +
    ' * 由 scripts/pack-desktop.mjs 从 server/bridge-constants.mjs 同步。\n' +
    ' * 必须放在 desktop/：打包进 app.asar 后无法再 import ../server/。\n' +
    ' */\n'
  const stripped = body.replace(/^\/\*\*[\s\S]*?\*\/\s*/, '')
  fs.writeFileSync(dest, banner + stripped)
  console.log('\n> 已同步 desktop/bridge-constants.mjs ← server/bridge-constants.mjs\n')
}

// macOS：先打 dir（.app），避免 hdiutil/dmg 失败导致整包中断；zip/dmg 另补
const builderArgs = process.platform === 'darwin'
  ? ['--mac', 'dir']
  : process.platform === 'win32'
    ? ['--win']
    : ['--linux']
console.log('\n> electron-builder', builderArgs.join(' '), '(desktop/)\n')
const builder = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['electron-builder', ...builderArgs],
  { cwd: DESKTOP, stdio: 'inherit', env: process.env },
)
if (builder.status !== 0) {
  process.exit(builder.status ?? 1)
}
if (process.platform === 'darwin') {
  const dmg = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['electron-builder', '--mac', 'dmg', '--prepackaged', path.join('release', process.arch === 'arm64' ? 'mac-arm64' : 'mac')],
    { cwd: DESKTOP, stdio: 'inherit', env: process.env },
  )
  if (dmg.status !== 0) {
    console.warn('\n! dmg 生成失败（可忽略，已有 .app / zip）\n')
  }
}

if (process.platform === 'darwin') {
  run('node', ['scripts/verify-packaged-native.mjs'])
  run('node', ['scripts/adhoc-sign-desktop-mac.mjs'])
  // 启动冒烟：Bridge + UI 必须可访问，否则视为打包失败
  run('node', ['scripts/smoke-packaged-app.mjs'])

  const appDir = path.join(
    DESKTOP,
    'release',
    process.arch === 'arm64' ? 'mac-arm64' : 'mac',
  )
  const appPath = path.join(appDir, 'Claude Orchestrator.app')
  const releaseDirEarly = path.join(DESKTOP, 'release')
  if (fs.existsSync(appPath)) {
    const zipName = `Claude Orchestrator-0.4.2-${process.arch}-mac.zip`
    const zipPath = path.join(releaseDirEarly, zipName)
    if (!fs.existsSync(zipPath)) {
      console.log(`\n> ditto zip → ${zipName}\n`)
      spawnSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appPath, zipPath], {
        stdio: 'inherit',
      })
    }
    const installCmd = path.join(releaseDirEarly, 'INSTALL-TO-APPLICATIONS.command')
    fs.writeFileSync(
      installCmd,
      `#!/bin/bash
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)/${process.arch === 'arm64' ? 'mac-arm64' : 'mac'}/Claude Orchestrator.app"
DEST="/Applications/Claude Orchestrator.app"
osascript -e 'quit app "Claude Orchestrator"' 2>/dev/null || true
killall "Claude Orchestrator" 2>/dev/null || true
sleep 1
rm -rf "$DEST"
cp -R "$SRC" "$DEST"
xattr -cr "$DEST"
open -a "$DEST"
echo "已安装并打开：$DEST"
`,
      { mode: 0o755 },
    )
  }
}

run('node', ['scripts/restore-dev-native-modules.mjs'])

const releaseDir = path.join(DESKTOP, 'release')
console.log('\n✓ 打包完成。安装包目录：')
console.log(`  ${releaseDir}`)
if (process.platform === 'darwin') {
  console.log('\nmacOS 安装任选其一：')
  console.log('  · 打开 release 中的 .dmg，拖入「应用程序」')
  console.log('  · 或双击 release/INSTALL-TO-APPLICATIONS.command')
  console.log('  · 或解压 *-mac.zip 后把 .app 拖入「应用程序」')
  console.log('之后可从启动台 / Dock 直接打开，无需再运行 npm 命令。')
  console.log('\n若经微信/AirDrop 发送后对方提示「已损坏」，在对方 Mac 上执行：')
  console.log('  bash scripts/macos-fix-quarantine-app.sh')
  console.log('或：xattr -cr "/Applications/Claude Orchestrator.app"')
  console.log('然后右键应用 →「打开」一次。\n')
} else {
  console.log('')
}
