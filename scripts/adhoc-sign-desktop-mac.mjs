#!/usr/bin/env node
/**
 * 无 Apple Developer ID 时，对 electron-builder 产物做 ad-hoc 签名并清除隔离属性。
 * 减轻本机安装后 Gatekeeper 拦截；经微信/AirDrop 传输后接收方仍可能需要 xattr -cr。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RELEASE = path.join(ROOT, 'desktop', 'release')

function run(cmd, args, { allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', encoding: 'utf8' })
  if (r.status !== 0 && !allowFail) {
    process.exit(r.status ?? 1)
  }
  return r
}

function findApps(dir) {
  if (!fs.existsSync(dir)) return []
  const apps = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name.endsWith('.app')) {
      apps.push(full)
    } else if (entry.isDirectory()) {
      apps.push(...findApps(full))
    }
  }
  return apps
}

function collectMachOBinaries(appPath) {
  const signables = new Set()
  const contents = path.join(appPath, 'Contents')
  if (!fs.existsSync(contents)) return signables

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        walk(p)
        continue
      }
      if (/\.(node|dylib|so)$/.test(ent.name)) {
        signables.add(p)
      }
    }
  }
  walk(contents)

  const macosDir = path.join(contents, 'MacOS')
  if (fs.existsSync(macosDir)) {
    for (const name of fs.readdirSync(macosDir)) {
      signables.add(path.join(macosDir, name))
    }
  }
  const frameworks = path.join(contents, 'Frameworks')
  if (fs.existsSync(frameworks)) {
    walk(frameworks)
  }
  return signables
}

const apps = findApps(RELEASE)
if (apps.length === 0) {
  console.warn('[adhoc-sign] 未找到 release 中的 .app，跳过')
  process.exit(0)
}

for (const app of apps) {
  console.log(`\n[adhoc-sign] ${app}`)
  for (const bin of collectMachOBinaries(app)) {
    run('codesign', ['--force', '--sign', '-', bin], { allowFail: true })
  }
  run('codesign', ['--force', '--deep', '--sign', '-', app])
  run('codesign', ['--verify', '--deep', '--strict', app])
}

run('xattr', ['-cr', RELEASE])

for (const name of fs.readdirSync(RELEASE)) {
  if (!name.endsWith('.dmg')) continue
  const dmg = path.join(RELEASE, name)
  run('codesign', ['--force', '--sign', '-', dmg], { allowFail: true })
  run('xattr', ['-cr', dmg], { allowFail: true })
}

console.log('\n[adhoc-sign] 完成')
