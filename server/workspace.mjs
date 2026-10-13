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

/** 已知二进制扩展名（与 web/src/lib/is-binary-file.ts 同步） */
const BINARY_EXT = new Set([
  'lockb', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'icns', 'avif', 'heic', 'heif',
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
  // UTF-16 BOM → 当文本
  if (sample.length >= 2) {
    const b0 = sample[0]
    const b1 = sample[1]
    if ((b0 === 0xff && b1 === 0xfe) || (b0 === 0xfe && b1 === 0xff)) return false
  }
  // UTF-8 BOM
  if (sample.length >= 3 && sample[0] === 0xef && sample[1] === 0xbb && sample[2] === 0xbf) {
    return false
  }
  let nul = 0
  let control = 0
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i]
    if (b === 0) nul++
    if (b === 9 || b === 10 || b === 13) continue
    if (b < 32 || b === 127) control++
  }
  // 仅偶发 NUL 不够；NUL 占比高或控制符很高才判二进制
  if (nul > 0 && nul / sample.length > 0.01) return true
  if (nul > 8) return true
  return sample.length > 200 && control / sample.length > 0.12
}

function textLooksBinary(text) {
  const sample = text.slice(0, 8192)
  if (!sample.length) return false
  const c0 = sample.charCodeAt(0)
  if (c0 === 0xfeff || c0 === 0xfffe) return false
  let replacement = 0
  let control = 0
  let nul = 0
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i)
    if (c === 0) nul++
    if (c === 0xfffd) replacement++
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) control++
  }
  if (nul > 0) return true
  if (replacement > 8 || (sample.length > 40 && replacement / sample.length > 0.02)) return true
  if (sample.length > 200 && control / sample.length > 0.12) return true
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

/** 媒体预览上限：PDF/图片需要更大块；其余 hex 仍用 256KB */
function binaryPreviewMaxBytes(relPath) {
  const ext = extOf(relPath)
  if (ext === 'pdf') return 12 * 1024 * 1024
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'icns', 'avif', 'heic', 'heif', 'svg'].includes(ext)) {
    return 8 * 1024 * 1024
  }
  return 256_000
}

function binaryPreviewPayload(rel, buf, size) {
  const maxPreview = binaryPreviewMaxBytes(rel)
  const previewLen = Math.min(buf.length, maxPreview)
  const preview = buf.subarray(0, previewLen)
  return {
    ok: true,
    binary: true,
    relPath: rel,
    size,
    text: null,
    base64: preview.toString('base64'),
    previewBytes: previewLen,
    truncated: buf.length > maxPreview,
  }
}

export function readTextFile(relPathRaw) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const rel = String(relPathRaw || '').replace(/^[/\\]+/, '')
  if (!rel || rel.includes('..')) return { ok: false, error: '无效路径' }
  let root
  try { root = path.resolve(fs.realpathSync(workspaceDir)) } catch { return { ok: false, error: '工作区路径无效' } }
  const abs = path.resolve(root, rel)
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    return { ok: false, error: '路径越界' }
  }
  try {
    const stat = fs.statSync(abs)
    if (!stat.isFile()) return { ok: false, error: '不是文件' }
    const buf = fs.readFileSync(abs)
    if (isBinaryFile(rel, buf, '')) {
      return binaryPreviewPayload(rel, buf, stat.size)
    }
    const max = 512_000
    let text = buf.toString('utf8')
    if (textLooksBinary(text)) {
      return binaryPreviewPayload(rel, buf, stat.size)
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

/** 结构化提交历史，供侧栏「提交图谱」渲染 */
export function gitCommitLog(limit = 48) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区', commits: [] }
  }
  const cwd = path.resolve(workspaceDir)
  const opt = { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
  const n = Math.min(Math.max(Number(limit) || 48, 1), 120)
  try {
    const out = String(execFileSync('git', ['log', '--format=%H%x09%s', '-n', String(n)], opt) || '').trim()
    const commits = out
      ? out.split('\n').map((line) => {
          const tab = line.indexOf('\t')
          if (tab < 0) return { hash: line.slice(0, 7), subject: line }
          const fullHash = line.slice(0, tab)
          const subject = line.slice(tab + 1)
          return { hash: fullHash.slice(0, 7), subject }
        })
      : []
    return { ok: true, commits }
  } catch (e) {
    return { ok: false, error: e.message, commits: [] }
  }
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
  let statusOk = true
  let diffOk = true
  let statusErr = null
  try {
    statusLine = String(execFileSync('git', ['status', '-sb'], opt) || '').trim()
  } catch (e) {
    statusOk = false
    statusErr = e instanceof Error ? e.message : String(e)
    statusLine = ''
  }
  try {
    diff = String(execFileSync('git', ['diff', 'HEAD'], opt) || '').trim()
  } catch (e) {
    diffOk = false
    if (!statusErr) statusErr = e instanceof Error ? e.message : String(e)
    diff = ''
  }
  const max = 150_000
  const truncated =
    diff.length > max ? `${diff.slice(0, max)}\n\n…（已截断）` : diff
  // git 失败时 ok=false，避免前端把报错文案解析成「脏文件路径」
  if (!statusOk && !diffOk) {
    return {
      ok: false,
      statusLine: '',
      diff: '',
      error: statusErr || 'git 不可用',
    }
  }
  return {
    ok: true,
    statusLine,
    diff: truncated || (diffOk ? '（与 HEAD 无差异：工作区干净）' : ''),
    error: statusOk ? null : statusErr,
  }
}

/** 把磁盘文件合成「相对空文件」的 unified diff（无 HEAD / 未跟踪时用） */
function synthesizeFullAddDiff(rel, abs) {
  let body = ''
  try {
    body = fs.readFileSync(abs, 'utf8')
  } catch {
    return ''
  }
  if (body.length > 200_000) body = `${body.slice(0, 200_000)}\n…`
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const plus = lines.map((l) => `+${l}`).join('\n')
  return [
    `diff --git a/${rel} b/${rel}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${rel}`,
    `@@ -0,0 +1,${lines.length} @@`,
    plus,
  ].join('\n')
}

function truncateDiffText(diff, max = 120_000) {
  const t = String(diff || '')
  return t.length > max ? `${t.slice(0, max)}\n\n…（已截断）` : t
}

/**
 * 仅针对指定相对路径的 diff（优先 `git diff HEAD`；无 HEAD 时合成磁盘预览）。
 * @param {string[] | undefined} paths
 */
export function gitDiffPaths(paths) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区', diff: '', paths: [] }
  }
  const cwd = path.resolve(workspaceDir)
  const list = (Array.isArray(paths) ? paths : [])
    .map((p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '').trim())
    .filter((p) => p && !p.includes('..'))
    .slice(0, 40)
  if (!list.length) {
    return { ok: false, error: '无路径', diff: '', paths: [] }
  }
  const opt = { cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }

  const synthesizeAll = () => {
    let diff = ''
    for (const rel of list) {
      const abs = path.join(cwd, rel)
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue
      const chunk = synthesizeFullAddDiff(rel, abs)
      if (!chunk) continue
      diff = diff ? `${diff}\n${chunk}` : chunk
    }
    return truncateDiffText(diff)
  }

  let headOk = true
  try {
    execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
      ...opt,
      stdio: ['ignore', 'ignore', 'ignore'],
    })
  } catch {
    headOk = false
  }

  // 无提交 / 非 git 仓库：仍返回可预览 diff，避免 UI 报 Could not access HEAD
  if (!headOk) {
    const diff = synthesizeAll()
    return {
      ok: true,
      paths: list,
      diff: diff || '（无文件内容可预览）',
      error: null,
      baseline: 'disk',
    }
  }

  try {
    let diff = String(execFileSync('git', ['diff', 'HEAD', '--', ...list], opt) || '').trim()
    // 未跟踪新文件：git diff HEAD 无输出 → 合成 /dev/null 全量 +
    const covered = new Set()
    for (const m of diff.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)) {
      covered.add(String(m[2] || m[1] || '').replace(/\\/g, '/'))
    }
    for (const rel of list) {
      if (covered.has(rel)) continue
      const abs = path.join(cwd, rel)
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue
      let tracked = true
      try {
        execFileSync('git', ['ls-files', '--error-unmatch', '--', rel], {
          ...opt,
          stdio: ['ignore', 'ignore', 'ignore'],
        })
      } catch {
        tracked = false
      }
      if (tracked) continue
      const chunk = synthesizeFullAddDiff(rel, abs)
      if (!chunk) continue
      diff = diff ? `${diff}\n${chunk}` : chunk
    }
    return {
      ok: true,
      paths: list,
      diff: truncateDiffText(diff) || '（这些路径相对 HEAD 无差异）',
      error: null,
      baseline: 'HEAD',
    }
  } catch (e) {
    // 已有 HEAD 但 git diff 失败：勿对已跟踪文件伪造全绿；仅未跟踪文件可 synthesize
    let diff = ''
    for (const rel of list) {
      const abs = path.join(cwd, rel)
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue
      let tracked = true
      try {
        execFileSync('git', ['ls-files', '--error-unmatch', '--', rel], {
          ...opt,
          stdio: ['ignore', 'ignore', 'ignore'],
        })
      } catch {
        tracked = false
      }
      if (tracked) continue
      const chunk = synthesizeFullAddDiff(rel, abs)
      if (!chunk) continue
      diff = diff ? `${diff}\n${chunk}` : chunk
    }
    if (diff) {
      return {
        ok: true,
        paths: list,
        diff: truncateDiffText(diff),
        error: null,
        baseline: 'disk-untracked',
        warning: e instanceof Error ? e.message : String(e),
      }
    }
    return {
      ok: false,
      paths: list,
      diff: '',
      error: e instanceof Error ? e.message : String(e),
      baseline: null,
    }
  }
}

function gitExecOpt(cwd) {
  return { cwd: path.resolve(cwd), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
}

function resolveGitWorkspace() {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区', cwd: null }
  }
  return { ok: true, error: null, cwd: path.resolve(workspaceDir) }
}

/** 解析对照分支：main → master → develop */
function resolveDiffBaseBranch(cwd, opt, preferred) {
  const candidates = []
  const pref = String(preferred || '').trim()
  if (pref) candidates.push(pref)
  for (const name of ['main', 'master', 'develop']) {
    if (!candidates.includes(name)) candidates.push(name)
  }
  for (const name of candidates) {
    try {
      execFileSync('git', ['rev-parse', '--verify', name], opt)
      return name
    } catch {
      /* try next */
    }
  }
  return null
}

/** 相对对照分支的 diff（含工作区未提交变更） */
export function gitDiffVsBase(baseBranch) {
  const ws = resolveGitWorkspace()
  if (!ws.ok) return { ok: false, error: ws.error, diff: '', baseBranch: null }
  const opt = gitExecOpt(ws.cwd)
  const base = resolveDiffBaseBranch(ws.cwd, opt, baseBranch)
  if (!base) {
    return { ok: false, error: '未找到 main/master/develop 对照分支', diff: '', baseBranch: null }
  }
  try {
    const diff = String(execFileSync('git', ['diff', base], opt) || '').trim()
    const max = 150_000
    const truncated = diff.length > max ? `${diff.slice(0, max)}\n\n…（已截断）` : diff
    return {
      ok: true,
      baseBranch: base,
      diff: truncated || `（相对 ${base} 无差异）`,
      error: null,
    }
  } catch (e) {
    return { ok: false, error: e.message, diff: '', baseBranch: base }
  }
}

/** 工作区 git 提交：默认暂存全部后提交 */
export function gitCommitWorkspace({ message, stageAll = true } = {}) {
  const ws = resolveGitWorkspace()
  if (!ws.ok) return { ok: false, error: ws.error }
  const trimmed = String(message || '').trim()
  if (!trimmed) return { ok: false, error: '请填写提交说明' }
  const opt = gitExecOpt(ws.cwd)
  try {
    if (stageAll) execFileSync('git', ['add', '-A'], opt)
    const out = String(execFileSync('git', ['commit', '-m', trimmed], opt) || '').trim()
    return { ok: true, output: out || '已提交', error: null }
  } catch (e) {
    const msg = String(e.stderr || e.message || e).trim()
    return { ok: false, error: msg || '提交失败', output: null }
  }
}

/**
 * 撤销工作区内单个已跟踪文件的未提交改动（git checkout -- path）。
 * 未跟踪文件不会删除，仅返回明确错误。
 */
export function gitDiscardWorkspaceFile(relPath) {
  const ws = resolveGitWorkspace()
  if (!ws.ok) return { ok: false, error: ws.error }
  const rel = String(relPath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  if (!rel || rel.includes('..')) {
    return { ok: false, error: '路径无效' }
  }
  const opt = gitExecOpt(ws.cwd)
  try {
    const tracked = String(
      execFileSync('git', ['ls-files', '--', rel], opt) || '',
    ).trim()
    if (!tracked) {
      return { ok: false, error: '该文件未被 git 跟踪，无法安全撤销' }
    }
    execFileSync('git', ['checkout', '--', rel], opt)
    return { ok: true, path: rel, error: null }
  } catch (e) {
    const msg = String(e.stderr || e.message || e).trim()
    return { ok: false, error: msg || '撤销失败' }
  }
}

/** fetch / pull / push */
export function gitRemoteSync(action) {
  const ws = resolveGitWorkspace()
  if (!ws.ok) return { ok: false, error: ws.error, output: null }
  const opt = gitExecOpt(ws.cwd)
  const act = String(action || '').trim()
  const argsByAction = {
    fetch: ['fetch', '--all', '--prune'],
    pull: ['pull', '--ff-only'],
    push: ['push'],
  }
  const args = argsByAction[act]
  if (!args) return { ok: false, error: '未知远程操作', output: null }
  try {
    const out = String(execFileSync('git', args, opt) || '').trim()
    return { ok: true, output: out || '完成', error: null }
  } catch (e) {
    const msg = String(e.stderr || e.message || e).trim()
    return { ok: false, error: msg || '远程操作失败', output: null }
  }
}
