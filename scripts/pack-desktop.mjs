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

console.log('=== Claude Orchestrator · 打包 ===')

run('npm', ['run', 'vendor:install'])
run('npm', ['run', 'web:build'])

if (!fs.existsSync(path.join(WEB_DIST, 'index.html'))) {
  console.error(`\n错误：未找到 ${WEB_DIST}/index.html，请先修复 web 构建。\n`)
  process.exit(1)
}

run('npm', ['run', 'desktop:install'])
run('npm', ['run', 'dist'], { cwd: DESKTOP })

const releaseDir = path.join(DESKTOP, 'release')
console.log('\n✓ 打包完成。安装包目录：')
console.log(`  ${releaseDir}`)
console.log('\nmacOS：打开 release 中的 .dmg，将 Claude Orchestrator 拖入「应用程序」。')
console.log('之后可从启动台 / Dock 直接打开，无需再运行 npm 命令。\n')
