import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { loadWorkspace } from './store.mjs'

/**
 * 工作区内内容检索（优先系统 rg，回落 grep）。
 * @param {{
 *   query?: string,
 *   maxResults?: number,
 *   boostPaths?: string[],
 *   caseSensitive?: boolean,
 *   regex?: boolean,
 *   includeGlob?: string,
 *   excludeGlob?: string,
 * }} body
 */
export function workspaceRipgrep(body) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, hits: [], error: '未选择工作区' }
  const query = String(body?.query || '').trim()
  if (!query || query.length < 2) return { ok: false, hits: [], error: '检索词过短' }
  const maxResults = Math.min(120, Math.max(1, Number(body?.maxResults) || 40))
  const root = path.resolve(workspaceDir)
  const boostPaths = Array.isArray(body?.boostPaths)
    ? body.boostPaths.map((p) => String(p || '').replace(/\\/g, '/')).filter(Boolean)
    : []
  const caseSensitive = Boolean(body?.caseSensitive)
  const useRegex = Boolean(body?.regex)
  const includeGlob = String(body?.includeGlob || '').trim()
  const excludeGlob = String(body?.excludeGlob || '').trim()

  const hits = []
  const pushLine = (line) => {
    // path:line:text
    const m = line.match(/^([^:]+):(\d+):(.*)$/)
    if (!m) return
    let rel = m[1].replace(/\\/g, '/')
    if (path.isAbsolute(rel)) {
      rel = path.relative(root, rel).replace(/\\/g, '/')
    }
    if (!rel || rel.includes('..')) return
    hits.push({
      relPath: rel,
      line: Number(m[2]) || 1,
      text: String(m[3] || '').slice(0, 240),
    })
  }

  const globs = [
    '!node_modules',
    '!.git',
    '!dist',
    '!**/dist-electron/**',
    '!graphify-out',
  ]
  if (includeGlob) globs.push(includeGlob)
  if (excludeGlob) globs.push(excludeGlob.startsWith('!') ? excludeGlob : `!${excludeGlob}`)

  const commonArgs = [
    '--line-number',
    '--no-heading',
    '--color',
    'never',
    '--max-count',
    '5',
  ]
  if (!caseSensitive) commonArgs.push('--ignore-case')
  if (!useRegex) commonArgs.push('--fixed-strings')
  for (const g of globs) {
    commonArgs.push('-g', g)
  }
  commonArgs.push(query, '.')

  try {
    const out = execFileSync('rg', commonArgs, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: 15_000,
    })
    for (const line of out.split('\n')) {
      if (!line.trim()) continue
      pushLine(line)
      if (hits.length >= maxResults) break
    }
    return { ok: true, hits: rankHits(hits, query, boostPaths) }
  } catch (e) {
    // rg 无匹配时 exit 1；或未安装
    const stdout = typeof e?.stdout === 'string' ? e.stdout : ''
    if (stdout.trim()) {
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue
        pushLine(line)
        if (hits.length >= maxResults) break
      }
      if (hits.length) return { ok: true, hits: rankHits(hits, query, boostPaths) }
    }
  }

  // 回落 grep -R（选项支持有限）
  try {
    const grepArgs = [
      '-RIn',
      '--exclude-dir=node_modules',
      '--exclude-dir=.git',
      '--exclude-dir=dist',
      '-m',
      '5',
    ]
    if (!caseSensitive) grepArgs.push('-i')
    if (!useRegex) grepArgs.push('-F')
    grepArgs.push('-e', query, '.')
    const out = execFileSync('grep', grepArgs, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: 15_000,
    })
    for (const line of out.split('\n')) {
      if (!line.trim()) continue
      pushLine(line)
      if (hits.length >= maxResults) break
    }
    let filtered = hits
    if (includeGlob) {
      const re = globToRegExp(includeGlob)
      filtered = filtered.filter((h) => re.test(h.relPath))
    }
    if (excludeGlob) {
      const re = globToRegExp(excludeGlob.replace(/^!/, ''))
      filtered = filtered.filter((h) => !re.test(h.relPath))
    }
    return { ok: true, hits: rankHits(filtered, query, boostPaths) }
  } catch (e) {
    const stdout = typeof e?.stdout === 'string' ? e.stdout : ''
    if (stdout.trim()) {
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue
        pushLine(line)
        if (hits.length >= maxResults) break
      }
      return { ok: true, hits: rankHits(hits, query, boostPaths) }
    }
    return { ok: false, hits: [], error: e?.message || '检索失败' }
  }
}

function globToRegExp(glob) {
  const s = String(glob || '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§§')
    .replace(/\*/g, '[^/]*')
    .replace(/§§/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${s}$`, 'i')
}

/** 简单相关性：路径/文本命中 + 打开文件加权（「相关文件优先」） */
function rankHits(hits, query, boostPaths) {
  const q = String(query || '').toLowerCase()
  const boost = new Set((boostPaths || []).map((p) => p.replace(/\\/g, '/')))
  const scored = hits.map((h, i) => {
    const pathLow = h.relPath.toLowerCase()
    const textLow = String(h.text || '').toLowerCase()
    let score = 0
    if (pathLow.includes(q)) score += 4
    if (textLow.includes(q)) score += 2
    for (const tok of q.split(/[^a-z0-9_\u4e00-\u9fff]+/).filter((t) => t.length >= 2)) {
      if (pathLow.includes(tok)) score += 1.5
      if (textLow.includes(tok)) score += 1
    }
    if (boost.has(h.relPath) || [...boost].some((b) => h.relPath.endsWith('/' + b) || b.endsWith('/' + h.relPath))) {
      score += 5
    }
    return { h, score, i }
  })
  scored.sort((a, b) => b.score - a.score || a.i - b.i)
  return scored.map((x) => x.h)
}
