'use strict'

const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const { execFileSync } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const { resolveSafeWorkspacePath } = require('./edit-engine.cjs')

const DEFAULT_TOTAL_BYTES = 128 * 1024 * 1024
const DEFAULT_FILE_BYTES = 8 * 1024 * 1024
const FALLBACK_EXCLUDES = new Set([
  '.git', 'node_modules', '.claudecode', '.next', 'dist', 'build', 'coverage',
])
const INTERNAL_PATH_PREFIXES = ['.claudecode/', 'graphify-out/']

function shouldCheckpointPath(rel) {
  const normalized = String(rel || '').replace(/\\/g, '/')
  return Boolean(normalized) && !INTERNAL_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

function safeCheckpointId(value) {
  const id = String(value || '').trim()
  return /^[A-Za-z0-9._-]{1,160}$/.test(id) ? id : randomUUID()
}

function listWorkspaceFiles(root) {
  try {
    const output = execFileSync(
      'git',
      ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return output.toString('utf8').split('\0').filter(shouldCheckpointPath).sort()
  } catch {
    const files = []
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && FALLBACK_EXCLUDES.has(entry.name)) continue
        const abs = path.join(dir, entry.name)
        if (entry.isSymbolicLink()) continue
        if (entry.isDirectory()) walk(abs)
        else if (entry.isFile()) {
          const rel = path.relative(root, abs).replace(/\\/g, '/')
          if (shouldCheckpointPath(rel)) files.push(rel)
        }
      }
    }
    walk(root)
    return files.sort()
  }
}

function fingerprintFile(abs) {
  const hash = createHash('sha256')
  const fd = fs.openSync(abs, 'r')
  const buffer = Buffer.allocUnsafe(64 * 1024)
  try {
    let bytesRead = 0
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead))
    } while (bytesRead > 0)
  } finally {
    fs.closeSync(fd)
  }
  return hash.digest('hex')
}

function readEntry(root, rel, fileByteCap) {
  const abs = resolveSafeWorkspacePath(root, rel, { normalizeModelPaths: false })
  if (!abs || !fs.existsSync(abs)) return null
  const stat = fs.statSync(abs)
  if (!stat.isFile()) return null
  if (stat.size > fileByteCap) {
    return { skipped: true, size: stat.size, fingerprint: fingerprintFile(abs) }
  }
  const content = fs.readFileSync(abs)
  return {
    content,
    mode: stat.mode & 0o777,
    fingerprint: createHash('sha256').update(content).digest('hex'),
    size: content.length,
  }
}

/** 捕获一次回合开始前的工作区（受大小上限保护）。 */
function captureWorkspaceCheckpoint(options) {
  const root = path.resolve(String(options?.workspaceRoot || ''))
  const totalByteCap = Number(options?.totalByteCap) > 0
    ? Number(options.totalByteCap)
    : DEFAULT_TOTAL_BYTES
  const fileByteCap = Number(options?.fileByteCap) > 0
    ? Number(options.fileByteCap)
    : DEFAULT_FILE_BYTES
  const entries = new Map()
  const skipped = []
  let totalBytes = 0
  for (const rel of listWorkspaceFiles(root)) {
    const entry = readEntry(root, rel, fileByteCap)
    if (!entry) continue
    if (entry.skipped) {
      skipped.push({ path: rel, size: entry.size })
      continue
    }
    totalBytes += entry.size
    if (totalBytes > totalByteCap) {
      return {
        ok: false,
        error: `工作区检查点超过 ${(totalByteCap / 1024 / 1024).toFixed(0)} MB 上限，已阻止不可完整回滚的命令。`,
        skipped,
      }
    }
    entries.set(rel, entry)
  }
  if (skipped.length) {
    return {
      ok: false,
      error: `有 ${skipped.length} 个文件超过单文件检查点上限，已阻止不可完整回滚的命令。`,
      skipped,
    }
  }
  return {
    ok: true,
    id: safeCheckpointId(options?.id),
    workspaceRoot: root,
    createdAt: new Date().toISOString(),
    entries,
    totalBytes,
  }
}

/** 将回合前快照与当前磁盘比较，只保留真实发生变化的文件。 */
function finalizeWorkspaceCheckpoint(checkpoint, options = {}) {
  if (!checkpoint?.ok || !(checkpoint.entries instanceof Map)) {
    return { ok: false, error: checkpoint?.error || '检查点不可用' }
  }
  const root = checkpoint.workspaceRoot
  const paths = new Set(listWorkspaceFiles(root))
  for (const rel of checkpoint.entries.keys()) paths.add(rel)
  for (const rel of options.extraPaths || []) {
    const normalized = String(rel).replace(/\\/g, '/')
    if (shouldCheckpointPath(normalized)) paths.add(normalized)
  }
  const changes = []
  for (const rel of [...paths].sort()) {
    const before = checkpoint.entries.get(rel) || null
    const current = readEntry(root, rel, DEFAULT_FILE_BYTES)
    const afterFingerprint = current?.fingerprint ?? null
    const beforeFingerprint = before?.fingerprint ?? null
    if (beforeFingerprint === afterFingerprint) continue
    changes.push({
      path: rel,
      before: before
        ? { content: before.content, mode: before.mode, fingerprint: before.fingerprint }
        : null,
      afterFingerprint,
    })
  }
  return {
    ok: true,
    id: checkpoint.id,
    workspaceRoot: root,
    createdAt: checkpoint.createdAt,
    finalizedAt: new Date().toISOString(),
    changes,
  }
}

function restoreWorkspaceCheckpoint(finalized) {
  if (!finalized?.ok || !Array.isArray(finalized.changes)) {
    return { restored: [], failed: [{ path: '', error: finalized?.error || '检查点不可用' }] }
  }
  const restored = []
  const failed = []
  for (const change of [...finalized.changes].reverse()) {
    const abs = resolveSafeWorkspacePath(finalized.workspaceRoot, change.path, {
      normalizeModelPaths: false,
    })
    if (!abs) {
      failed.push({ path: change.path, error: '路径已逃逸工作区或符号链接发生变化' })
      continue
    }
    try {
      const current = fs.existsSync(abs) ? fingerprintFile(abs) : null
      if (current !== change.afterFingerprint) {
        failed.push({ path: change.path, error: '文件在检查点完成后又被修改，已跳过恢复' })
        continue
      }
      if (!change.before) {
        fs.rmSync(abs, { force: true })
      } else {
        fs.mkdirSync(path.dirname(abs), { recursive: true })
        const temp = path.join(path.dirname(abs), `.${path.basename(abs)}.${randomUUID()}.undo.tmp`)
        fs.writeFileSync(temp, change.before.content)
        if (change.before.mode != null) fs.chmodSync(temp, change.before.mode)
        fs.renameSync(temp, abs)
      }
      restored.push(change.path)
    } catch (error) {
      failed.push({ path: change.path, error: error?.message || String(error) })
    }
  }
  return { restored, failed }
}

function checkpointDir(dataDir) {
  return path.join(path.resolve(dataDir), 'checkpoints')
}

function serializeFinalized(finalized) {
  return {
    ...finalized,
    changes: finalized.changes.map((change) => ({
      ...change,
      before: change.before
        ? { ...change.before, content: change.before.content.toString('base64') }
        : null,
    })),
  }
}

function deserializeFinalized(value) {
  return {
    ...value,
    changes: (value.changes || []).map((change) => ({
      ...change,
      before: change.before
        ? { ...change.before, content: Buffer.from(change.before.content, 'base64') }
        : null,
    })),
  }
}

function saveWorkspaceCheckpoint(dataDir, finalized) {
  if (!finalized?.ok || !finalized.changes?.length) return { ok: true, saved: false, id: finalized?.id }
  const dir = checkpointDir(dataDir)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${finalized.id}.json.gz`)
  const payload = Buffer.from(JSON.stringify(serializeFinalized(finalized)), 'utf8')
  fs.writeFileSync(file, zlib.gzipSync(payload))
  fs.writeFileSync(
    path.join(dir, 'latest.json'),
    JSON.stringify({ id: finalized.id, workspaceRoot: finalized.workspaceRoot, file }, null, 2),
    'utf8',
  )
  return { ok: true, saved: true, id: finalized.id, file }
}

function loadWorkspaceCheckpoint(dataDir, id = '') {
  const dir = checkpointDir(dataDir)
  let resolvedId = String(id || '').trim()
  if (!resolvedId) {
    const latest = JSON.parse(fs.readFileSync(path.join(dir, 'latest.json'), 'utf8'))
    resolvedId = latest.id
  }
  if (!/^[A-Za-z0-9._-]+$/.test(resolvedId)) throw new Error('无效检查点 ID')
  const file = path.join(dir, `${resolvedId}.json.gz`)
  const raw = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8')
  return deserializeFinalized(JSON.parse(raw))
}

module.exports = {
  captureWorkspaceCheckpoint,
  finalizeWorkspaceCheckpoint,
  restoreWorkspaceCheckpoint,
  saveWorkspaceCheckpoint,
  loadWorkspaceCheckpoint,
}
