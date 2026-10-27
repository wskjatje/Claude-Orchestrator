#!/usr/bin/env node
/**
 * 闸门：web `tsc --noEmit`。
 * ALLOWLIST 用指纹 `relPath|TSxxxx`（相对 web/）；清零后应保持为空。
 * - 非 allowlist 错误 → 失败
 * - allowlist 条目已不复现 → 失败（逼递减，禁止陈旧白名单）
 * 禁止靠 @ts-ignore / any 糊过闸：本脚本只认 tsc 真输出。
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const webDir = path.join(root, 'web')

/** @type {readonly string[]} 残留指纹；新增须先真修或经评审再写入 */
const ALLOWLIST = Object.freeze([
  // 阶段终点：空。若临时回退，格式：'src/foo.ts|TS2339'
])

const ERR_RE = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):/

function fingerprint(file, code) {
  const rel = file.replace(/\\/g, '/')
  return `${rel}|${code}`
}

const r = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsc', '--noEmit', '--pretty', 'false'],
  {
    cwd: webDir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, npm_config_loglevel: 'error' },
  },
)

const out = `${r.stdout || ''}${r.stderr || ''}`
const seen = new Map() // fingerprint -> count
for (const line of out.split(/\r?\n/)) {
  const m = ERR_RE.exec(line.trim())
  if (!m) continue
  const fp = fingerprint(m[1], m[4])
  seen.set(fp, (seen.get(fp) || 0) + 1)
}

const allowSet = new Set(ALLOWLIST)
const unexpected = [...seen.keys()].filter((fp) => !allowSet.has(fp)).sort()
const stale = ALLOWLIST.filter((fp) => !seen.has(fp))

let failed = false
if (unexpected.length) {
  failed = true
  console.error('FAIL: web tsc 新增/未授权错误（须真修，勿 @ts-ignore）:')
  for (const fp of unexpected) {
    console.error(`  - ${fp} (×${seen.get(fp)})`)
  }
}
if (stale.length) {
  failed = true
  console.error('FAIL: ALLOWLIST 已过期（错误已消失，请从脚本删除）:')
  for (const fp of stale) console.error(`  - ${fp}`)
}

if (!failed) {
  if (ALLOWLIST.length === 0 && seen.size === 0) {
    console.log('ok: web tsc clean (0 errors, empty allowlist)')
  } else {
    console.log(
      `ok: web tsc allowlisted ${ALLOWLIST.length} fingerprint(s), no unexpected`,
    )
  }
  process.exit(0)
}

if (r.status !== 0 && unexpected.length === 0 && stale.length === 0) {
  // tsc 非零但未解析到 error 行（工具链故障）
  console.error('FAIL: tsc exited non-zero without parseable errors')
  console.error(out.slice(0, 2000))
}
process.exit(1)
