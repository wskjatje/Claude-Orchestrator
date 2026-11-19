#!/usr/bin/env node
/**
 * 安装仓库内固定的 mcp-server-fetch（mcp 1.x），避免每次 uvx 冷拉 PyPI。
 * 用法：node scripts/ensure-mcp-fetch.mjs
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const toolDir = path.join(root, 'tools', 'mcp-fetch')
const venv = path.join(toolDir, '.venv')
const bin = path.join(venv, 'bin', 'mcp-server-fetch')
const py = path.join(venv, 'bin', 'python')
const cache = path.join(toolDir, '.uv-cache')

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    env: { ...process.env, UV_CACHE_DIR: cache },
    encoding: 'utf8',
  })
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`
    throw new Error(`${cmd} ${args.join(' ')} failed: ${err}`)
  }
}

fs.mkdirSync(toolDir, { recursive: true })
if (!fs.existsSync(bin)) {
  console.log('ensure-mcp-fetch: creating venv + installing mcp-server-fetch…')
  run('uv', ['venv', venv])
  run('uv', ['pip', 'install', '--python', py, 'mcp>=1.6.0,<2', 'mcp-server-fetch'])
}
if (!fs.existsSync(bin)) throw new Error(`ensure-mcp-fetch: missing ${bin}`)
console.log(`ensure-mcp-fetch: OK\n  bin=${bin}`)
