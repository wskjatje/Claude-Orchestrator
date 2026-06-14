#!/usr/bin/env node
/**
 * node-pty prebuilds ship spawn-helper without the executable bit on some installs,
 * which makes posix_spawnp fail and falls back to pipe/python PTY (Ctrl+C breaks).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const prebuildsRoot = path.join(root, 'node_modules', 'node-pty', 'prebuilds')
const releaseHelper = path.join(root, 'node_modules', 'node-pty', 'build', 'Release', 'spawn-helper')

/** @param {string} file */
function ensureExecutable(file) {
  try {
    if (!fs.existsSync(file)) return false
    const mode = fs.statSync(file).mode
    if (mode & 0o111) return false
    fs.chmodSync(file, mode | 0o755)
    console.log(`[fix-node-pty] chmod +x ${path.relative(root, file)}`)
    return true
  } catch (err) {
    console.warn(`[fix-node-pty] skip ${file}:`, err instanceof Error ? err.message : err)
    return false
  }
}

let fixed = 0

if (fs.existsSync(prebuildsRoot)) {
  for (const platform of fs.readdirSync(prebuildsRoot)) {
    const helper = path.join(prebuildsRoot, platform, 'spawn-helper')
    if (ensureExecutable(helper)) fixed += 1
  }
}

if (ensureExecutable(releaseHelper)) fixed += 1

if (fixed === 0 && fs.existsSync(prebuildsRoot)) {
  console.log('[fix-node-pty] spawn-helper permissions OK')
}
