import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { PROJECT_ROOT } from './paths.mjs'
import {
  loadChatSettings,
  resetPersonalWorkbenchData,
  saveChatSettings,
} from './store.mjs'
import { exportPersonalGithubArtifacts } from './workbench-git-export.mjs'
import { importPersonalGithubArtifacts } from './workbench-git-import.mjs'
import {
  buildFrontendAppsCommitSection,
  exportFrontendAppsDoc,
} from './frontend-app-catalog.mjs'

const execFileAsync = promisify(execFile)

export const DEFAULT_UPSTREAM_REPO = 'https://github.com/anthropics/claude-code.git'

/** Never stage these when pushing to a personal fork (local deps / runtime / private data / build artifacts). */
const PUSH_EXCLUDE_PATHS = [
  '.claudecode',
  '.tmp',
  'node_modules',
  'server/vendor',
  'web/node_modules',
  'web/dist',
  'web/dist-electron',
  'web/.env',
  'web/.wrangler',
  'web/.tanstack',
  'desktop/node_modules',
  'desktop/release',
  'desktop/out',
  '.DS_Store',
]

const SENSITIVE_STAGED_PATTERNS = [
  /\bsk-[a-zA-Z0-9]{20,}\b/,
  /\bAIza[0-9A-Za-z\-_]{35}\b/,
  /\bANTHROPIC_API_KEY\s*=\s*['"]?[a-zA-Z0-9_\-]{12,}/i,
  /\bOPENAI_API_KEY\s*=\s*['"]?[a-zA-Z0-9_\-]{12,}/i,
  /\bapi[_-]?key\s*[:=]\s*['"]([^'"]{16,})['"]/i,
  /\b"apiKey"\s*:\s*"([^"]{12,})"/i,
  /\blocalSecret\s*[:=]\s*['"]([^'"]{12,})['"]/i,
  /\bpersonalGithubRepo\s*:\s*['"]https:\/\/github\.com\/[^'"]+['"]/i,
]

/** Source trees contain setting field names, not live secrets — skip text scan. */
const SECRET_SCAN_SKIP_PREFIXES = [
  'server/',
  'web/src/',
  'web/e2e/',
  'desktop/',
  'plugins/',
  'examples/',
  'scripts/',
  '.github/',
]

const BINARY_PUSH_BLOCK_EXT = ['.db', '.sqlite', '.sqlite3', '.sqlite-wal', '.sqlite-shm']

const PLACEHOLDER_SECRET =
  /^(YOUR_|xxx|placeholder|changeme|replace-?me|<|\*{2,}|•{2,}|sk-fake|example)/i

function extractSensitiveMatch(re, text) {
  const m = re.exec(text)
  if (!m) return null
  const captured = m[1]
  if (captured && PLACEHOLDER_SECRET.test(captured.trim())) return null
  if (/\bYOUR_[A-Z0-9_]+\b/.test(m[0])) return null
  return m[0]
}

function fileContainsSecrets(text) {
  for (const re of SENSITIVE_STAGED_PATTERNS) {
    re.lastIndex = 0
    if (extractSensitiveMatch(re, text)) return true
  }
  return false
}

function isSqliteFile(abs) {
  try {
    const fd = fs.openSync(abs, 'r')
    const buf = Buffer.alloc(16)
    fs.readSync(fd, buf, 0, 16, 0)
    fs.closeSync(fd)
    return buf.toString('utf8', 0, 15) === 'SQLite format 3'
  } catch {
    return false
  }
}

async function unstageSensitivePaths() {
  for (const excluded of PUSH_EXCLUDE_PATHS) {
    await runGit(['reset', 'HEAD', '--', excluded])
  }
  const list = await runGit(['diff', '--cached', '--name-only'])
  if (!list.ok) return
  const dbLike = list.stdout
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((rel) => {
      const lower = rel.toLowerCase()
      return BINARY_PUSH_BLOCK_EXT.some((ext) => lower.endsWith(ext))
    })
  for (const rel of dbLike) {
    await runGit(['reset', 'HEAD', '--', rel])
  }
}

async function scanStagedFilesForSecrets() {
  const list = await runGit(['diff', '--cached', '--name-only'])
  if (!list.ok) return { ok: true }
  const files = list.stdout
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const hits = []
  for (const rel of files) {
    if (PUSH_EXCLUDE_PATHS.some((p) => rel === p || rel.startsWith(`${p}/`))) continue
    const lower = rel.toLowerCase()
    if (BINARY_PUSH_BLOCK_EXT.some((ext) => lower.endsWith(ext))) {
      hits.push(rel)
      continue
    }
    if (SECRET_SCAN_SKIP_PREFIXES.some((p) => rel.startsWith(p))) continue
    const abs = path.join(PROJECT_ROOT, rel)
    try {
      if (!fs.existsSync(abs)) continue
      const stat = fs.statSync(abs)
      if (!stat.isFile() || stat.size > 512_000) continue
      if (isSqliteFile(abs)) {
        hits.push(rel)
        continue
      }
      const text = fs.readFileSync(abs, 'utf8')
      if (text.includes('\0')) continue
      if (fileContainsSecrets(text)) hits.push(rel)
    } catch {
      /* ignore unreadable */
    }
  }
  if (!hits.length) return { ok: true }
  const hasDb = hits.some((p) =>
    BINARY_PUSH_BLOCK_EXT.some((ext) => p.toLowerCase().endsWith(ext)),
  )
  const prefix = hasDb
    ? '暂存区含数据库或其它二进制敏感文件，已阻止推送。请检查以下路径：\n'
    : '暂存区含疑似密钥、个人仓库地址或其它敏感信息，已阻止推送。请检查以下文件并移除敏感内容后再试：\n'
  return {
    ok: false,
    error: prefix + hits.map((p) => `  - ${p}`).join('\n'),
    sensitivePaths: hits,
  }
}

const DEFAULT_UPSTREAM_SYNC_MANIFEST = {
  syncPaths: ['plugins', '.claude/commands', '.claude-plugin', 'examples/hooks'],
  syncFiles: [
    'scripts/auto-close-duplicates.ts',
    'scripts/backfill-duplicate-comments.ts',
    'scripts/comment-on-duplicates.sh',
    'scripts/edit-issue-labels.sh',
    'scripts/gh.sh',
    'scripts/issue-lifecycle.ts',
    'scripts/lifecycle-comment.ts',
    'scripts/sweep.ts',
  ],
}

function loadUpstreamSyncManifest() {
  const manifestPath = path.join(PROJECT_ROOT, 'server/upstream-sync-manifest.json')
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    return {
      syncPaths: Array.isArray(raw.syncPaths) ? raw.syncPaths.map(String) : DEFAULT_UPSTREAM_SYNC_MANIFEST.syncPaths,
      syncFiles: Array.isArray(raw.syncFiles) ? raw.syncFiles.map(String) : DEFAULT_UPSTREAM_SYNC_MANIFEST.syncFiles,
    }
  } catch {
    return DEFAULT_UPSTREAM_SYNC_MANIFEST
  }
}

async function resolveRemoteBranchRef(remoteName, branch) {
  const primary = `${remoteName}/${branch}`
  const verify = await runGit(['rev-parse', '--verify', primary])
  if (verify.ok) return primary
  const fallback = `${remoteName}/main`
  const verifyMain = await runGit(['rev-parse', '--verify', fallback])
  if (verifyMain.ok) return fallback
  return null
}

async function resolveUpstreamRef(branch) {
  return resolveRemoteBranchRef('upstream', branch)
}

async function resolveOriginRef(branch) {
  return resolveRemoteBranchRef('origin', branch)
}

function combineOutput(stdout, stderr) {
  return [String(stderr || '').trim(), String(stdout || '').trim()].filter(Boolean).join('\n')
}

async function runGit(args, opts = {}) {
  const cwd = opts.cwd || PROJECT_ROOT
  const timeout = opts.timeout ?? 180_000
  try {
    const r = await execFileAsync('git', args, {
      cwd,
      timeout,
      maxBuffer: 8 * 1024 * 1024,
    })
    return {
      ok: true,
      stdout: String(r.stdout || ''),
      stderr: String(r.stderr || ''),
      combined: combineOutput(r.stdout, r.stderr),
    }
  } catch (e) {
    return {
      ok: false,
      stdout: String(e.stdout || ''),
      stderr: String(e.stderr || e.message || ''),
      combined: combineOutput(e.stdout, e.stderr || e.message),
      error: e.message || String(e),
    }
  }
}

function isOfficialRemote(url) {
  const u = String(url || '').trim().toLowerCase()
  return u.includes('anthropics/claude-code')
}

async function readRemotes() {
  const r = await runGit(['remote', '-v'])
  if (!r.ok) return { ok: false, error: r.combined || r.error, remotes: [] }
  const remotes = []
  for (const line of r.stdout.split('\n')) {
    const m = line.trim().match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/)
    if (!m || m[3] !== 'fetch') continue
    remotes.push({ name: m[1], url: m[2] })
  }
  return { ok: true, remotes }
}

async function currentBranch() {
  const r = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
  if (!r.ok) return 'main'
  const b = r.stdout.trim()
  return b && b !== 'HEAD' ? b : 'main'
}

async function readLocalGitConfig(key) {
  const r = await runGit(['config', '--get', key])
  if (!r.ok) return ''
  return r.stdout.trim()
}

async function resolveGitIdentity(settings = loadChatSettings()) {
  let name = String(settings.gitUserName || '').trim()
  let email = String(settings.gitUserEmail || '').trim()
  if (!name) name = await readLocalGitConfig('user.name')
  if (!email) email = await readLocalGitConfig('user.email')
  return { name, email }
}

/** Push 与个人 pull 共用同一份 Git 身份，写入本仓库 local config */
async function ensureGitIdentity(settings = loadChatSettings()) {
  const { name, email } = await resolveGitIdentity(settings)
  if (!name || !email) {
    return {
      ok: false,
      error:
        '请在本页填写 Git 用户名与邮箱（推送与个人拉取共用），或先在终端配置 git config user.name / user.email',
    }
  }
  const setName = await runGit(['config', 'user.name', name])
  if (!setName.ok) return { ok: false, error: setName.combined || setName.error }
  const setEmail = await runGit(['config', 'user.email', email])
  if (!setEmail.ok) return { ok: false, error: setEmail.combined || setEmail.error }
  return { ok: true, name, email }
}

async function ensureUpstreamRemote(upstreamUrl) {
  const url = (upstreamUrl || DEFAULT_UPSTREAM_REPO).trim()
  const remotes = await readRemotes()
  if (!remotes.ok) return remotes
  const upstream = remotes.remotes.find((x) => x.name === 'upstream')
  if (upstream) {
    if (upstream.url !== url) await runGit(['remote', 'set-url', 'upstream', url])
    return { ok: true, url }
  }
  const origin = remotes.remotes.find((x) => x.name === 'origin')
  if (origin && isOfficialRemote(origin.url)) {
    await runGit(['remote', 'rename', 'origin', 'upstream'])
    return { ok: true, url: origin.url }
  }
  const add = await runGit(['remote', 'add', 'upstream', url])
  if (!add.ok) return { ok: false, error: add.combined || add.error }
  return { ok: true, url }
}

async function ensurePersonalOrigin(personalUrl) {
  const url = String(personalUrl || '').trim()
  if (!url) return { ok: false, error: '请填写个人 GitHub 仓库地址' }
  const remotes = await readRemotes()
  if (!remotes.ok) return remotes

  let origin = remotes.remotes.find((x) => x.name === 'origin')
  if (origin && isOfficialRemote(origin.url)) {
    await runGit(['remote', 'rename', 'origin', 'upstream'])
    origin = null
  }
  if (origin) {
    if (origin.url !== url) await runGit(['remote', 'set-url', 'origin', url])
  } else {
    const add = await runGit(['remote', 'add', 'origin', url])
    if (!add.ok) return { ok: false, error: add.combined || add.error }
  }
  return { ok: true, url }
}

export async function getWorkbenchGitStatus() {
  if (!fs.existsSync(path.join(PROJECT_ROOT, '.git'))) {
    return { ok: false, error: '当前项目不是 Git 仓库' }
  }
  const settings = loadChatSettings()
  const remotes = await readRemotes()
  const branch = await currentBranch()
  const status = await runGit(['status', '--porcelain'])
  const dirty = Boolean(status.stdout.trim())
  const upstream = remotes.ok ? remotes.remotes.find((x) => x.name === 'upstream') : null
  const origin = remotes.ok ? remotes.remotes.find((x) => x.name === 'origin') : null
  const identity = await resolveGitIdentity(settings)
  return {
    ok: true,
    repoRoot: PROJECT_ROOT,
    branch,
    dirty,
    dirtySummary: status.stdout.trim().slice(0, 4000),
    upstreamUrl: upstream?.url || settings.upstreamGithubRepo || DEFAULT_UPSTREAM_REPO,
    personalUrl: settings.personalGithubRepo?.trim() || origin?.url || '',
    originUrl: origin?.url || '',
    gitUserName: settings.gitUserName?.trim() || identity.name || '',
    gitUserEmail: settings.gitUserEmail?.trim() || identity.email || '',
    remotes: remotes.ok ? remotes.remotes : [],
    pullMode: 'path-scoped',
    syncScopeNote:
      '个人仓库：推送以本地为准覆盖远程；拉取仅用于从 GitHub 取回并部署到本机',
  }
}

export async function pullClaudeCodeFromGithub(opts = {}) {
  const settings = loadChatSettings()
  const upstreamUrl =
    (opts.upstreamGithubRepo || settings.upstreamGithubRepo || DEFAULT_UPSTREAM_REPO).trim()
  const ensure = await ensureUpstreamRemote(upstreamUrl)
  if (!ensure.ok) return { ok: false, error: ensure.error, combined: ensure.error }

  const branch = await currentBranch()
  const fetch = await runGit(['fetch', 'upstream'])
  if (!fetch.ok) return { ok: false, error: fetch.combined || fetch.error, combined: fetch.combined }

  const upstreamRef = await resolveUpstreamRef(branch)
  if (!upstreamRef) {
    return {
      ok: false,
      error: '未找到 upstream 分支（尝试过 upstream/' + branch + ' 与 upstream/main）',
      combined: fetch.combined,
    }
  }

  const manifest = loadUpstreamSyncManifest()
  const targets = [...manifest.syncPaths, ...manifest.syncFiles]
  const syncedPaths = []
  const failedPaths = []

  for (const target of targets) {
    const checkout = await runGit(['checkout', upstreamRef, '--', target])
    if (checkout.ok) {
      syncedPaths.push(target)
    } else {
      failedPaths.push({
        path: target,
        error: (checkout.combined || checkout.error || 'checkout 失败').trim().slice(0, 500),
      })
    }
  }

  const head = await runGit(['log', '-1', '--oneline', upstreamRef])
  const lines = [
    `已从 ${upstreamRef} 同步官方逻辑（workbench 配置、server/web、.claudecode 未修改）：`,
    ...syncedPaths.map((p) => `  ✓ ${p}`),
  ]
  if (failedPaths.length) {
    lines.push('', '以下路径未能同步（可能 upstream 已移除）：')
    for (const f of failedPaths) {
      lines.push(`  ✗ ${f.path}${f.error ? ` — ${f.error.split('\n')[0]}` : ''}`)
    }
  }
  if (head.stdout.trim()) lines.push('', `upstream @ ${head.stdout.trim()}`)

  if (!syncedPaths.length) {
    return {
      ok: false,
      pathScoped: true,
      branch,
      upstreamRef,
      syncedPaths,
      failedPaths,
      error: '未能同步任何官方路径，请检查网络与 upstream 仓库结构。',
      combined: lines.join('\n'),
      upstreamUrl: ensure.url || upstreamUrl,
    }
  }

  const rev = await runGit(['rev-parse', upstreamRef])
  if (rev.ok && rev.stdout.trim()) {
    saveChatSettings({ lastUpstreamSyncSha: rev.stdout.trim() })
  }

  return {
    ok: true,
    pathScoped: true,
    branch,
    upstreamRef,
    syncedPaths,
    failedPaths,
    headLine: head.stdout.trim(),
    upstreamUrl: ensure.url || upstreamUrl,
    combined: lines.join('\n'),
  }
}

export async function checkUpstreamUpdates(opts = {}) {
  const settings = loadChatSettings()
  const upstreamUrl =
    (opts.upstreamGithubRepo || settings.upstreamGithubRepo || DEFAULT_UPSTREAM_REPO).trim()
  const ensure = await ensureUpstreamRemote(upstreamUrl)
  if (!ensure.ok) return { ok: false, error: ensure.error }

  const fetch = await runGit(['fetch', 'upstream'], { timeout: 300_000 })
  if (!fetch.ok) {
    return {
      ok: false,
      error: fetch.combined || fetch.error || '无法连接官方 GitHub 仓库',
    }
  }

  const branch = await currentBranch()
  const upstreamRef = await resolveUpstreamRef(branch)
  if (!upstreamRef) {
    return { ok: false, error: `未找到 upstream 分支（尝试过 upstream/${branch} 与 upstream/main）` }
  }

  const rev = await runGit(['rev-parse', upstreamRef])
  if (!rev.ok) return { ok: false, error: rev.combined || rev.error }
  const upstreamSha = rev.stdout.trim()

  const head = await runGit(['log', '-1', '--oneline', upstreamRef])
  const headLine = head.stdout.trim()

  const lastSha = String(settings.lastUpstreamSyncSha || '').trim()
  let hasUpdates = !lastSha || lastSha !== upstreamSha

  if (!lastSha) {
    const manifest = loadUpstreamSyncManifest()
    const targets = [...manifest.syncPaths, ...manifest.syncFiles]
    hasUpdates = false
    for (const target of targets) {
      const diff = await runGit(['diff', '--quiet', upstreamRef, '--', target])
      if (!diff.ok && !/fatal:/i.test(diff.combined || diff.error || '')) {
        hasUpdates = true
        break
      }
    }
  }

  return {
    ok: true,
    hasUpdates,
    upstreamRef,
    upstreamSha,
    headLine,
    lastSyncSha: lastSha || null,
    message: hasUpdates
      ? '官方 Claude Code 有新版本，可点击「同步官方插件与逻辑」。'
      : '官方同步范围内已与 upstream 最新一致。',
  }
}

export async function pullFromPersonalGithub(opts = {}) {
  const settings = loadChatSettings()
  const personalUrl = (opts.personalGithubRepo || settings.personalGithubRepo || '').trim()
  if (!personalUrl) {
    return { ok: false, error: '请先填写个人 GitHub 仓库地址' }
  }

  const ensure = await ensurePersonalOrigin(personalUrl)
  if (!ensure.ok) return { ok: false, error: ensure.error, combined: ensure.error }

  const identity = await ensureGitIdentity(settings)
  if (!identity.ok) return { ok: false, error: identity.error, combined: identity.error }

  const history = await ensureFullHistoryFromRemote('origin', { remoteUrl: personalUrl })
  if (!history.ok) {
    return { ok: false, error: history.error, combined: history.combined }
  }

  const branch = await currentBranch()
  const fetch = await runGit(['fetch', 'origin'], { timeout: 600_000 })
  if (!fetch.ok) return { ok: false, error: fetch.combined || fetch.error, combined: fetch.combined }

  const originRef = await resolveOriginRef(branch)
  if (!originRef) {
    return {
      ok: false,
      error: `未找到 origin 分支（尝试过 origin/${branch} 与 origin/main）`,
      combined: fetch.combined,
    }
  }

  const merge = await runGit(['merge', '--no-edit', originRef])
  if (!merge.ok) {
    const conflict = /CONFLICT|Automatic merge failed/i.test(merge.combined || '')
    return {
      ok: false,
      error: merge.combined || merge.error || '合并个人仓库失败',
      combined: merge.combined,
      conflict,
      dirty: true,
    }
  }

  const head = await runGit(['log', '-1', '--oneline'])
  const deployed = importPersonalGithubArtifacts()
  const lines = [
    `已从个人仓库 ${originRef} 拉取并合并全部内容（完整同步）：`,
    history.unshallowed ? history.combined : '',
    merge.combined?.trim() || 'Merge successful',
    deployed.ok
      ? `已部署到本地：${deployed.summary}`
      : `部署到本地失败：${deployed.error || '未知错误'}`,
    head.stdout.trim() ? `\n当前 @ ${head.stdout.trim()}` : '',
  ].filter(Boolean).join('\n')

  return {
    ok: true,
    fullSync: true,
    branch,
    originRef,
    headLine: head.stdout.trim(),
    personalUrl: ensure.url,
    deployed,
    combined: lines,
  }
}

export function deployPersonalGithubArtifacts(opts = {}) {
  const result = importPersonalGithubArtifacts(opts)
  return {
    ...result,
    combined: result.ok
      ? `已部署到本地：${result.summary}`
      : `部署失败：${result.error || '未知错误'}`,
  }
}

function buildPersonalCommitMessage(reason) {
  const text = String(reason || '').trim().slice(0, 800)
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const firstLine = lines[0] || ''
  const subject = firstLine
    ? `docs(frontend): ${firstLine.slice(0, 72)}`
    : 'docs(frontend): Claude Orchestrator 前端实现说明'

  const bodyParts = []
  if (lines.length > 1) {
    bodyParts.push('## 本次变更', ...lines.slice(1).map((l) => `- ${l}`), '')
  } else if (firstLine) {
    bodyParts.push('## 本次变更', `- ${firstLine}`, '')
  }
  bodyParts.push(buildFrontendAppsCommitSection())
  return `${subject}\n\n${bodyParts.join('\n').trimEnd()}`
}

async function isShallowClone() {
  return fs.existsSync(path.join(PROJECT_ROOT, '.git', 'shallow'))
}

/** Shallow clones reference missing parents; GitHub rejects the pack (index-pack failed). */
async function ensureFullHistoryFromRemote(remoteName, opts = {}) {
  if (!(await isShallowClone())) return { ok: true, unshallowed: false }

  if (remoteName === 'origin') {
    const url = String(opts.remoteUrl || loadChatSettings().personalGithubRepo || '').trim()
    const ensure = await ensurePersonalOrigin(url)
    if (!ensure.ok) return ensure
  } else {
    const upstreamUrl = (
      opts.remoteUrl || loadChatSettings().upstreamGithubRepo || DEFAULT_UPSTREAM_REPO
    ).trim()
    const ensure = await ensureUpstreamRemote(upstreamUrl)
    if (!ensure.ok) return ensure
  }

  const fetch = await runGit(['fetch', '--unshallow', remoteName], { timeout: 600_000 })
  if (!fetch.ok) {
    return {
      ok: false,
      error: `当前为浅克隆，缺少完整 Git 历史。请在终端执行：git fetch --unshallow ${remoteName}`,
      combined: fetch.combined || fetch.error,
    }
  }
  return {
    ok: true,
    unshallowed: true,
    combined: (fetch.combined || `已从 ${remoteName} 补全完整 Git 历史。`).trim(),
  }
}

async function ensureFullHistoryForPush() {
  const settings = loadChatSettings()
  return ensureFullHistoryFromRemote('origin', {
    remoteUrl: settings.personalGithubRepo,
  })
}

export async function pushClaudeCodeToPersonalGithub(opts = {}) {
  const reason =
    typeof opts.reason === 'string' && opts.reason.trim()
      ? opts.reason.trim()
      : typeof opts.message === 'string' && opts.message.trim()
        ? opts.message.trim()
        : ''
  const message = buildPersonalCommitMessage(reason)

  const settings = loadChatSettings()
  const personalUrl = (opts.personalGithubRepo || settings.personalGithubRepo || '').trim()
  if (!personalUrl) {
    return { ok: false, error: '请先填写个人 GitHub 仓库地址' }
  }

  const ensure = await ensurePersonalOrigin(personalUrl)
  if (!ensure.ok) return { ok: false, error: ensure.error, combined: ensure.error }

  const identity = await ensureGitIdentity(settings)
  if (!identity.ok) return { ok: false, error: identity.error, combined: identity.error }

  const cleared = resetPersonalWorkbenchData()
  const clearedNote = cleared.cleared?.length
    ? `已清除本地敏感数据：${cleared.cleared.join('、')}。`
    : '已清除本地敏感数据。'

  const exported = exportPersonalGithubArtifacts()
  if (!exported.ok) {
    return {
      ok: false,
      error: exported.error || '导出 Agent/Skill/MCP 失败',
      combined: [clearedNote, exported.error].filter(Boolean).join('\n\n'),
      clearedConfig: true,
      personalUrl: ensure.url,
    }
  }
  const exportNote = exported.summary ? `已导出可共享配置：${exported.summary}` : ''

  const branch = await currentBranch()
  const add = await runGit(['add', '-A'])
  if (!add.ok) return { ok: false, error: add.combined || add.error, combined: add.combined }

  await unstageSensitivePaths()

  const secretScan = await scanStagedFilesForSecrets()
  if (!secretScan.ok) {
    return {
      ok: false,
      error: secretScan.error,
      combined: [clearedNote, exportNote, secretScan.error].filter(Boolean).join('\n\n'),
      clearedConfig: true,
      sensitivePaths: secretScan.sensitivePaths,
      personalUrl: ensure.url,
    }
  }

  const diffCached = await runGit(['diff', '--cached', '--quiet'])
  const nothingToCommit = diffCached.ok
  let commitLog = ''
  if (!nothingToCommit) {
    const commit = await runGit(['commit', '-m', message])
    if (!commit.ok) return { ok: false, error: commit.combined || commit.error, combined: commit.combined }
    commitLog = commit.combined
  }

  const history = await ensureFullHistoryForPush()
  if (!history.ok) {
    return {
      ok: false,
      error: history.error,
      combined: [commitLog, history.combined].filter(Boolean).join('\n'),
      committed: Boolean(commitLog),
      personalUrl: ensure.url,
    }
  }

  const push = await runGit(['push', '--force', '-u', 'origin', branch])
  if (!push.ok) {
    const combined = push.combined || push.error || ''
    let errorMsg = combined || '推送到个人仓库失败'
    if (/index-pack failed|did not receive expected object/i.test(combined)) {
      errorMsg +=
        '\n\n提示：若仓库是浅克隆，请先执行 git fetch --unshallow origin 后再推送。'
    }
    return {
      ok: false,
      error: errorMsg,
      combined: [history.unshallowed ? history.combined : '', commitLog, push.combined]
        .filter(Boolean)
        .join('\n'),
      committed: Boolean(commitLog) || !nothingToCommit,
      personalUrl: ensure.url,
    }
  }

  const forceNote = '已以本地为准覆盖个人仓库远程分支。'

  if (nothingToCommit && /everything up-to-date/i.test(push.combined || push.stdout || '')) {
    return {
      ok: true,
      pushed: false,
      nothingToCommit: true,
      clearedConfig: true,
      clearedItems: cleared.cleared,
      combined: `${clearedNote}\n${exportNote}\n没有需要提交的变更，且已与个人仓库同步。`,
      personalUrl: ensure.url,
    }
  }

  return {
    ok: true,
    pushed: true,
    forcePushed: true,
    clearedConfig: true,
    clearedItems: cleared.cleared,
    branch,
    personalUrl: ensure.url,
    combined: [clearedNote, exportNote, forceNote, history.unshallowed ? history.combined : '', commitLog, push.combined]
      .filter(Boolean)
      .join('\n'),
  }
}

export function savePersonalGithubSettings(body) {
  const cur = loadChatSettings()
  return saveChatSettings({
    ollamaBase: cur.ollamaBase,
    model: cur.model,
    localOllamaModel: cur.localOllamaModel,
    claudeCliPath: cur.claudeCliPath,
    orchestrationMode: cur.orchestrationMode,
    localAgentBasename: cur.localAgentBasename,
    defaultConfirmWritePath: cur.defaultConfirmWritePath,
    mcpConfigAbsolutePath: cur.mcpConfigAbsolutePath,
    devMcpOrchDebug: cur.devMcpOrchDebug === true,
    cloudModelCatalog: cur.cloudModelCatalog || [],
    localModelCatalog: cur.localModelCatalog || [],
    cloudProviderCatalog: cur.cloudProviderCatalog || [],
    personalGithubRepo:
      typeof body?.personalGithubRepo === 'string'
        ? body.personalGithubRepo.trim().slice(0, 500)
        : cur.personalGithubRepo || '',
    gitUserName:
      typeof body?.gitUserName === 'string'
        ? body.gitUserName.trim().slice(0, 200)
        : cur.gitUserName || '',
    gitUserEmail:
      typeof body?.gitUserEmail === 'string'
        ? body.gitUserEmail.trim().slice(0, 320)
        : cur.gitUserEmail || '',
    upstreamGithubRepo:
      typeof body?.upstreamGithubRepo === 'string' && body.upstreamGithubRepo.trim()
        ? body.upstreamGithubRepo.trim().slice(0, 500)
        : cur.upstreamGithubRepo || DEFAULT_UPSTREAM_REPO,
  })
}
