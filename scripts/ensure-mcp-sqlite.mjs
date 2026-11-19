#!/usr/bin/env node
/**
 * 安装仓库内固定的 mcp-server-sqlite（mcp 1.x），避免每次 uvx --with 冷拉 PyPI。
 * 用法：node scripts/ensure-mcp-sqlite.mjs
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const toolDir = path.join(root, 'tools', 'mcp-sqlite')
const venv = path.join(toolDir, '.venv')
const bin = path.join(venv, 'bin', 'mcp-server-sqlite')
const py = path.join(venv, 'bin', 'python')
const cache = path.join(toolDir, '.uv-cache')
const dbDir = path.join(root, 'data', 'mcp', 'sqlite')
const dbPath = path.join(dbDir, 'demo.db')

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
  return r
}

fs.mkdirSync(toolDir, { recursive: true })
fs.mkdirSync(dbDir, { recursive: true })

if (!fs.existsSync(bin)) {
  console.log('ensure-mcp-sqlite: creating venv + installing mcp-server-sqlite…')
  run('uv', ['venv', venv])
  run('uv', [
    'pip',
    'install',
    '--python',
    py,
    'mcp>=1.6.0,<2',
    'mcp-server-sqlite',
  ])
}

if (!fs.existsSync(bin)) {
  throw new Error(`ensure-mcp-sqlite: missing binary after install: ${bin}`)
}

const seed = `
import sqlite3, os
db = ${JSON.stringify(dbPath)}
os.makedirs(os.path.dirname(db), exist_ok=True)
c = sqlite3.connect(db)
c.execute("CREATE TABLE IF NOT EXISTS demo (id INTEGER PRIMARY KEY, note TEXT)")
c.execute("INSERT OR IGNORE INTO demo(id,note) VALUES (1,'ok')")
c.commit()
c.close()
print(os.path.getsize(db))
`
run(py, ['-c', seed])

console.log(`ensure-mcp-sqlite: OK\n  bin=${bin}\n  db=${dbPath}`)
