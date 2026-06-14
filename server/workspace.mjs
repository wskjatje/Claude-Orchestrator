import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { loadWorkspace } from './store.mjs'

const DENY = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  'target',
  '.turbo',
  '.cache',
  '__pycache__',
  '.venv',
  'venv',
])

function skipName(name, kind) {
  if (name === '.DS_Store') return true
  if (DENY.has(name)) return true
  return false
}

/** @returns {Map<string, string>} 相对路径 → 状态字母（U/M/A/D/…） */
export function gitStatusMap(absRoot) {
  const status = new Map()
  const cwd = path.resolve(absRoot)
  if (!fs.existsSync(cwd)) return status
  const opt = { cwd, encoding: 'utf8', maxBuffer: 512 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
  try {
    const out = String(execFileSync('git', ['status', '--porcelain'], opt) || '')
    for (const line of out.split('\n')) {
      if (line.length < 4) continue
      const x = line[0]
      const y = line[1]
      let entry = line.slice(3).trim()
      if (!entry) continue
      if (entry.includes(' -> ')) entry = entry.split(' -> ').pop().trim()
      if (entry.startsWith('"') && entry.endsWith('"')) {
        entry = entry.slice(1, -1).replace(/\\"/g, '"')
      }
      const rel = normalizeGitPath(entry.replace(/\\/g, '/'))
      status.set(rel, porcelainLetter(x, y))
    }
  } catch {
    /* 非 git 仓库或 git 不可用 */
  }
  return status
}

function porcelainLetter(x, y) {
  if (x === '?' && y === '?') return 'U'
  if (x === 'A' || y === 'A') return 'A'
  if (x === 'D' || y === 'D') return 'D'
  if (x === 'R' || y === 'R') return 'R'
  if (x === 'C' || y === 'C') return 'C'
  if (x === 'M' || y === 'M') return 'M'
  if (x === 'U' || y === 'U') return 'U'
  return 'M'
}

function normalizeGitPath(raw) {
  let p = String(raw || '').trim().replace(/\\/g, '/')
  if (p.startsWith('"') && p.endsWith('"')) {
    p = p.slice(1, -1).replace(/\\"/g, '"')
  }
  if (p.startsWith('./')) p = p.slice(2)
  return p.replace(/\/+$/, '')
}

export function buildPanelTree(absRoot) {
  const budget = { n: 0, max: 2500 }
  const maxDepth = 8
  function walk(absDir, depth) {
    if (budget.n >= budget.max || depth > maxDepth) return []
    let ents = []
    try {
      ents = fs.readdirSync(absDir, { withFileTypes: true })
    } catch {
      return []
    }
    ents.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name, 'en')
    })
    const nodes = []
    for (const ent of ents) {
      if (budget.n >= budget.max) break
      const name = ent.name
      if (ent.isDirectory()) {
        if (skipName(name, 'dir')) continue
        budget.n++
        nodes.push({
          name,
          type: 'dir',
          children: walk(path.join(absDir, name), depth + 1),
        })
      } else if (ent.isFile()) {
        if (skipName(name, 'file')) continue
        budget.n++
        const ext = path.extname(name).replace(/^\./, '') || undefined
        nodes.push({ name, type: 'file', ext })
      }
    }
    return nodes
  }
  return walk(absRoot, 0)
}

/** @returns {Set<string>} 相对工作区根的路径（正斜杠） */
export function gitChangedPaths(absRoot) {
  return new Set(gitStatusMap(absRoot).keys())
}

export function listPanelTree() {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) {
    return { ok: false, error: '未选择工作区', root: null, tree: [], gitStatus: [], gitChanged: [] }
  }
  if (!fs.existsSync(workspaceDir)) {
    return { ok: false, error: '工作区路径不存在', root: workspaceDir, tree: [], gitStatus: [], gitChanged: [] }
  }
  const root = path.resolve(workspaceDir)
  const status = gitStatusMap(root)
  const gitStatus = [...status.entries()].map(([p, letter]) => ({ path: p, letter }))
  const gitChanged = [...status.keys()]
  return { ok: true, root, tree: buildPanelTree(root), gitStatus, gitChanged, error: null }
}

/** 完整文件名（双扩展名等） */
const BINARY_NAMES = new Set(['bun.lockb', '.ds_store'])

/** 已知二进制扩展名（含 bun.lockb 等锁文件） */
const BINARY_EXT = new Set([
  'lockb', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'icns', 'avif',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'exe', 'dll', 'so', 'dylib', 'bin', 'dat', 'wasm', 'pyc', 'class', 'o', 'a',
  'zip', 'gz', 'tar', 'rar', '7z', 'bz2', 'xz', 'zst',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac', 'webm', 'mkv', 'm4a',
  'sqlite', 'db', 'sqlite3', 'dmg', 'iso', 'img',
])

function extOf(relPath) {
  const base = path.basename(relPath)
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return ''
  return base.slice(dot + 1).toLowerCase()
}

function bufferLooksBinary(buf) {
  const sample = buf.subarray(0, Math.min(buf.length, 8192))
  if (!sample.length) return false
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true
  }
  let control = 0
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i]
    if (b === 9 || b === 10 || b === 13) continue
    if (b < 32 || b === 127) control++
  }
  return control / sample.length > 0.05
}

function textLooksBinary(text) {
  const sample = text.slice(0, 8192)
  if (!sample.length) return false
  let replacement = 0
  let control = 0
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i)
    if (c === 0xfffd) replacement++
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) control++
  }
  if (replacement > 3 || replacement / sample.length > 0.01) return true
  if (sample.length > 80 && control / sample.length > 0.05) return true
  return false
}

function isBinaryFile(relPath, buf, text) {
  const base = path.basename(relPath).toLowerCase()
  if (BINARY_NAMES.has(base)) return true
  const ext = extOf(relPath)
  if (BINARY_EXT.has(ext)) return true
  if (bufferLooksBinary(buf)) return true
  if (textLooksBinary(text)) return true
  return false
}

export function readTextFile(relPathRaw) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const rel = String(relPathRaw || '').replace(/^[/\\]+/, '')
  if (!rel || rel.includes('..')) return { ok: false, error: '无效路径' }
  const abs = path.resolve(workspaceDir, rel)
  if (!abs.startsWith(path.resolve(workspaceDir))) {
    return { ok: false, error: '路径越界' }
  }
  try {
    const stat = fs.statSync(abs)
    if (!stat.isFile()) return { ok: false, error: '不是文件' }
    const buf = fs.readFileSync(abs)
    if (isBinaryFile(rel, buf, '')) {
      const maxPreview = 256_000
      const previewLen = Math.min(buf.length, maxPreview)
      const preview = buf.subarray(0, previewLen)
      return {
        ok: true,
        binary: true,
        relPath: rel,
        size: stat.size,
        text: null,
        base64: preview.toString('base64'),
        previewBytes: previewLen,
        truncated: buf.length > maxPreview,
      }
    }
    const max = 512_000
    let text = buf.toString('utf8')
    if (textLooksBinary(text)) {
      const maxPreview = 256_000
      const previewLen = Math.min(buf.length, maxPreview)
      const preview = buf.subarray(0, previewLen)
      return {
        ok: true,
        binary: true,
        relPath: rel,
        size: stat.size,
        text: null,
        base64: preview.toString('base64'),
        previewBytes: previewLen,
        truncated: buf.length > maxPreview,
      }
    }
    let truncated = false
    if (text.length > max) {
      text = text.slice(0, max)
      truncated = true
    }
    return { ok: true, text, relPath: rel, truncated, size: stat.size, binary: false, error: undefined }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export function shellSnapshot() {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区', text: '' }
  }
  const cwd = path.resolve(workspaceDir)
  const opt = { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
  const lines = [`# 工作区\n${cwd}`, '']
  const tryGit = (args) => {
    try {
      const out = execFileSync('git', args, opt).trim()
      lines.push(`$ git ${args.join(' ')}`, out || '（无输出）', '')
    } catch (e) {
      lines.push(`$ git ${args.join(' ')}`, `（失败：${e.message}）`, '')
    }
  }
  tryGit(['rev-parse', '--is-inside-work-tree'])
  tryGit(['status', '-sb'])
  tryGit(['diff', '--stat', 'HEAD'])
  return { ok: true, text: lines.join('\n').trim() }
}

export function gitDiff() {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区', diff: '', statusLine: '' }
  }
  const cwd = path.resolve(workspaceDir)
  const opt = { cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
  let statusLine = ''
  let diff = ''
  try {
    statusLine = String(execFileSync('git', ['status', '-sb'], opt) || '').trim()
  } catch (e) {
    statusLine = `（git status 不可用：${e.message}）`
  }
  try {
    diff = String(execFileSync('git', ['diff', 'HEAD'], opt) || '').trim()
  } catch (e) {
    diff = `（git diff 不可用：${e.message}）`
  }
  const max = 150_000
  const truncated =
    diff.length > max ? `${diff.slice(0, max)}\n\n…（已截断）` : diff
  return {
    ok: true,
    statusLine,
    diff: truncated || '（与 HEAD 无差异：工作区干净）',
    error: null,
  }
}
