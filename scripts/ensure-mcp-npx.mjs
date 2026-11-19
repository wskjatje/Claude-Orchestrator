#!/usr/bin/env node
/**
 * 安装仓库内固定的官方 MCP npm 包，避免每次 npx 冷拉。
 * 用法：node scripts/ensure-mcp-npx.mjs
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const toolDir = path.join(root, 'tools', 'mcp-npx')
const bins = [
  'mcp-server-filesystem',
  'mcp-server-memory',
  'mcp-server-sequential-thinking',
  'mcp-server-puppeteer',
]
const pkgs = [
  '@modelcontextprotocol/server-filesystem',
  '@modelcontextprotocol/server-memory',
  '@modelcontextprotocol/server-sequential-thinking',
  '@modelcontextprotocol/server-puppeteer',
]

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: toolDir,
    env: process.env,
    encoding: 'utf8',
  })
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`
    throw new Error(`${cmd} ${args.join(' ')} failed: ${err}`)
  }
}

fs.mkdirSync(toolDir, { recursive: true })
const pkgJson = path.join(toolDir, 'package.json')
if (!fs.existsSync(pkgJson)) {
  run('npm', ['init', '-y'])
}

const missing = bins.some(
  (b) => !fs.existsSync(path.join(toolDir, 'node_modules', '.bin', b)),
)
if (missing) {
  console.log('ensure-mcp-npx: installing official MCP servers…')
  run('npm', ['install', '--omit=dev', ...pkgs])
}

for (const b of bins) {
  const p = path.join(toolDir, 'node_modules', '.bin', b)
  if (!fs.existsSync(p)) throw new Error(`ensure-mcp-npx: missing ${p}`)
}

console.log(`ensure-mcp-npx: OK\n  dir=${toolDir}\n  bins=${bins.join(', ')}`)
