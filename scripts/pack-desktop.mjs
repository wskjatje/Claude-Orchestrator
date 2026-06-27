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
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
  })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

function rmrf(...segments) {
  const dir = path.join(...segments)
  if (fs.existsSync(dir)) {
    console.log(`\n> 清理：${path.relative(ROOT, dir)}`)
    fs.rmSync(dir, { recursive: true, force: true })
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

const builderArgs = process.platform === 'darwin'
  ? ['--mac']
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
  run('node', ['scripts/verify-packaged-native.mjs'])
  run('node', ['scripts/adhoc-sign-desktop-mac.mjs'])
}

run('node', ['scripts/restore-dev-native-modules.mjs'])

const releaseDir = path.join(DESKTOP, 'release')
console.log('\n✓ 打包完成。安装包目录：')
console.log(`  ${releaseDir}`)
console.log('\nmacOS：打开 release 中的 .dmg，将 Claude Orchestrator 拖入「应用程序」。')
console.log('之后可从启动台 / Dock 直接打开，无需再运行 npm 命令。')
if (process.platform === 'darwin') {
  console.log('\n若经微信/AirDrop 发送后对方提示「已损坏」，在对方 Mac 上执行：')
  console.log('  bash scripts/macos-fix-quarantine-app.sh')
  console.log('或：xattr -cr "/Applications/Claude Orchestrator.app"')
  console.log('然后右键应用 →「打开」一次。\n')
} else {
  console.log('')
}
