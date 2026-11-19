import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const SKIP_DIRS = new Set(['.git', '.claudecode', 'node_modules', 'dist', 'build', 'coverage', 'graphify-out'])
const CODE_EXT = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|swift|rb|php|cs)$/i
const ENTRY_NAMES = new Set([
  'index.js', 'index.mjs', 'index.cjs', 'index.ts', 'index.tsx',
  'main.js', 'main.mjs', 'main.ts', 'main.tsx',
  'app.js', 'app.ts', 'app.tsx', 'server.js', 'server.mjs', 'server.ts',
])

function listTrackedFiles(root, cap = 2400) {
  try {
    const raw = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      encoding: 'buffer', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
    }).toString('utf8')
    return raw.split('\0').filter(Boolean).slice(0, cap)
  } catch {
    const out = []
    const walk = (dir) => {
      if (out.length >= cap) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (out.length >= cap) break
        if (entry.isSymbolicLink() || (entry.isDirectory() && SKIP_DIRS.has(entry.name))) continue
        const abs = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(abs)
        else if (entry.isFile()) out.push(path.relative(root, abs).replace(/\\/g, '/'))
      }
    }
    walk(root)
    return out
  }
}

function packageEntries(root) {
  const file = path.join(root, 'package.json')
  if (!fs.existsSync(file)) return []
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
    const values = [pkg.main, pkg.module, pkg.browser]
    if (typeof pkg.bin === 'string') values.push(pkg.bin)
    else if (pkg.bin && typeof pkg.bin === 'object') values.push(...Object.values(pkg.bin))
    return values.map(String).map((value) => value.replace(/^\.\//, '')).filter(Boolean)
  } catch {
    return []
  }
}

function exportedSymbols(root, rel) {
  const abs = path.resolve(root, rel)
  if (!abs.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(abs)) return []
  let text = ''
  try {
    const stat = fs.statSync(abs)
    if (!stat.isFile() || stat.size > 256 * 1024) return []
    text = fs.readFileSync(abs, 'utf8')
  } catch {
    return []
  }
  const names = new Set()
  const patterns = [
    /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
    /\bmodule\.exports\.([A-Za-z_$][\w$]*)\s*=/g,
    /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/gm,
    /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)\s*\(/gm,
    /^\s*func\s+([A-Za-z_]\w*)\s*\(/gm,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (!String(match[1]).startsWith('_')) names.add(match[1])
      if (names.size >= 12) break
    }
    if (names.size >= 12) break
  }
  return [...names]
}

export function buildRepositoryMap(workspaceRoot, options = {}) {
  const root = path.resolve(String(workspaceRoot || ''))
  const maxChars = Math.min(6_000, Math.max(1_200, Number(options.maxChars) || 4_800))
  const files = listTrackedFiles(root)
    .map((value) => String(value).replace(/\\/g, '/'))
    .filter((value) => value && !value.split('/').some((part) => SKIP_DIRS.has(part)))
  const dirs = new Map()
  for (const rel of files) {
    const parts = rel.split('/')
    const key = parts.length > 1 ? parts.slice(0, Math.min(2, parts.length - 1)).join('/') : '.'
    dirs.set(key, (dirs.get(key) || 0) + 1)
  }
  const packageEntrySet = new Set(packageEntries(root))
  const entries = files.filter((rel) => {
    const base = path.posix.basename(rel)
    return packageEntrySet.has(rel) || ENTRY_NAMES.has(base) || /^(?:src|server|web\/src|app)\/(?:index|main|app|server)\./.test(rel)
  }).slice(0, 18)
  const codeFiles = files.filter((rel) => CODE_EXT.test(rel)).length
  const lines = [
    '【仓库地图·自动生成】',
    `文件：${files.length}（代码约 ${codeFiles}）`,
    dirs.size
      ? `目录：${[...dirs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 24).map(([dir, count]) => `${dir}(${count})`).join('、')}`
      : '',
    entries.length ? '入口与关键文件：' : '',
  ].filter(Boolean)
  for (const rel of entries) {
    const symbols = exportedSymbols(root, rel)
    lines.push(`- ${rel}${symbols.length ? ` → ${symbols.join(', ')}` : ''}`)
  }
  lines.push('先用 code_search 定位，再用 read_file 核对真实内容；地图仅用于导航。')
  const full = lines.join('\n')
  if (full.length <= maxChars) return full
  return `${full.slice(0, Math.max(0, maxChars - 18)).replace(/\s+$/u, '')}\n…（地图已截断）`
}
