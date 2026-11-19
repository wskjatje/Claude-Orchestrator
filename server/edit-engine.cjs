'use strict'

/**
 * 工作区统一写入内核。
 *
 * 模型、Host 工具和 MCP 只负责提交编辑意图；路径校验、冲突检测、原子替换与
 * 回滚快照统一在这里完成。上层可以继续保留各自的 Diff/UI/索引逻辑。
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createHash, randomUUID } = require('node:crypto')

const DEFAULT_SNAPSHOT_CHAR_CAP = 8_000_000

function contentFingerprint(value) {
  return createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex')
}

function expandUserPath(value) {
  let result = String(value || '').trim()
  if (result === '~' || result.startsWith('~/') || result.startsWith('~\\')) {
    result = path.join(os.homedir(), result.slice(1))
  }
  return result
}

function canonicalWorkspaceTarget(root, candidate) {
  const lexicalRelative = path.relative(root, candidate)
  if (lexicalRelative.startsWith('..') || path.isAbsolute(lexicalRelative)) return null
  let existing = candidate
  const suffix = []
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing)
    if (parent === existing) return null
    suffix.unshift(path.basename(existing))
    existing = parent
  }
  let realExisting
  try { realExisting = fs.realpathSync(existing) } catch { return null }
  const realRelative = path.relative(root, realExisting)
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) return null
  const resolved = path.resolve(realExisting, ...suffix)
  const resolvedRelative = path.relative(root, resolved)
  if (resolvedRelative.startsWith('..') || path.isAbsolute(resolvedRelative)) return null
  return resolved
}

/** 解析工作区内路径，并拒绝 `..`、绝对路径逃逸和符号链接逃逸。 */
function resolveSafeWorkspacePath(workspaceDir, requestedPath, options = {}) {
  let requested = expandUserPath(requestedPath)
  if (!requested || requested.includes('..')) return null
  let root
  try { root = path.resolve(fs.realpathSync(workspaceDir)) } catch { return null }
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep

  if (path.isAbsolute(requested)) {
    const absolute = path.resolve(requested)
    return absolute === root || absolute.startsWith(rootPrefix)
      ? canonicalWorkspaceTarget(root, absolute)
      : null
  }

  requested = requested.replace(/^[/\\]+/, '').trim()
  if (!requested) return null

  // 兼容本地模型误把绝对路径去掉首个斜杠的历史输出。
  if (options.normalizeModelPaths !== false) {
    const rootAsRelative = root.replace(/^[/\\]+/, '')
    if (requested === rootAsRelative) return root
    if (requested.startsWith(`${rootAsRelative}/`) || requested.startsWith(`${rootAsRelative}\\`)) {
      const suffix = requested.slice(rootAsRelative.length).replace(/^[/\\]+/, '')
      if (!suffix || suffix.includes('..')) return suffix ? null : root
      return canonicalWorkspaceTarget(root, path.resolve(root, suffix))
    }
    const marker = `${path.basename(root)}/`
    const markerIndex = marker ? requested.indexOf(marker) : -1
    if (markerIndex >= 0) {
      const suffix = requested.slice(markerIndex + marker.length)
      if (suffix && !suffix.includes('..')) {
        const normalized = canonicalWorkspaceTarget(root, path.resolve(root, suffix))
        if (normalized) return normalized
      }
    }
  }

  return canonicalWorkspaceTarget(root, path.resolve(root, requested))
}

/**
 * 原子写入一个文本文件。调用方可传 expectedFingerprint 防止读取后被并发覆盖。
 */
function applyTextEdit(options) {
  const root = String(options?.workspaceRoot || '')
  const rel = String(options?.path || '').trim().replace(/\\/g, '/')
  const content = String(options?.content ?? '')
  const snapshotCap = Number(options?.snapshotCharCap) > 0
    ? Number(options.snapshotCharCap)
    : DEFAULT_SNAPSHOT_CHAR_CAP
  const abs = resolveSafeWorkspacePath(root, rel, {
    normalizeModelPaths: options?.normalizeModelPaths !== false,
  })
  if (!abs) return { ok: false, error: 'path escape or symlink outside workspace', path: rel }

  let before = ''
  let originalMode
  const isNewFile = !fs.existsSync(abs)
  if (!isNewFile) {
    try {
      before = fs.readFileSync(abs, 'utf8')
      originalMode = fs.statSync(abs).mode & 0o777
    } catch {
      return { ok: false, error: `无法读取「${rel}」的写前快照；未覆盖该文件。`, path: rel }
    }
    if (before.length > snapshotCap) {
      return {
        ok: false,
        error: `文件「${rel}」超过 ${snapshotCap.toLocaleString()} 字符的可撤销快照上限；未覆盖该文件。`,
        path: rel,
      }
    }
  }

  const beforeFingerprint = contentFingerprint(before)
  if (options?.expectedFingerprint && options.expectedFingerprint !== beforeFingerprint) {
    return {
      ok: false,
      conflict: true,
      error: `文件「${rel}」在读取后已被其他操作修改；请重新读取后再应用修改。`,
      path: rel,
    }
  }

  fs.mkdirSync(path.dirname(abs), { recursive: true })
  const temp = path.join(path.dirname(abs), `.${path.basename(abs)}.${randomUUID()}.tmp`)
  try {
    fs.writeFileSync(temp, content, 'utf8')
    if (originalMode != null) fs.chmodSync(temp, originalMode)
  } catch (error) {
    try { fs.rmSync(temp, { force: true }) } catch { /* best effort */ }
    return { ok: false, error: `atomic write failed: ${error?.message || String(error)}`, path: rel }
  }

  let changedDuringWrite = false
  try {
    const latestAbs = resolveSafeWorkspacePath(root, rel, {
      normalizeModelPaths: options?.normalizeModelPaths !== false,
    })
    changedDuringWrite = !latestAbs || latestAbs !== abs
    if (latestAbs && !changedDuringWrite) {
      const latestExists = fs.existsSync(latestAbs)
      changedDuringWrite = isNewFile
        ? latestExists
        : !latestExists || contentFingerprint(fs.readFileSync(latestAbs, 'utf8')) !== beforeFingerprint
    }
  } catch {
    changedDuringWrite = true
  }
  if (changedDuringWrite) {
    try { fs.rmSync(temp, { force: true }) } catch { /* best effort */ }
    return {
      ok: false,
      conflict: true,
      error: `文件「${rel}」在写入准备期间发生变化；本次修改已取消。`,
      path: rel,
    }
  }

  try {
    fs.renameSync(temp, abs)
  } catch (error) {
    try { fs.rmSync(temp, { force: true }) } catch { /* best effort */ }
    return { ok: false, error: `atomic write failed: ${error?.message || String(error)}`, path: rel }
  }

  return {
    ok: true,
    path: rel,
    absolutePath: abs,
    before,
    after: content,
    isNewFile,
    originalMode,
    beforeFingerprint,
    afterFingerprint: contentFingerprint(content),
  }
}

/** 仅恢复仍保持为本引擎最后写入内容的文件，避免覆盖用户后续编辑。 */
function rollbackTextEdits(options) {
  const snapshots = options?.snapshots instanceof Map
    ? [...options.snapshots.entries()].reverse()
    : []
  const restored = []
  const failed = []
  for (const [rel, snapshot] of snapshots) {
    const abs = resolveSafeWorkspacePath(options.workspaceRoot, rel, { normalizeModelPaths: false })
    if (!abs) {
      failed.push({ path: rel, error: 'path escape or symlink outside workspace' })
      continue
    }
    try {
      const currentFingerprint = fs.existsSync(abs)
        ? contentFingerprint(fs.readFileSync(abs, 'utf8'))
        : null
      if (currentFingerprint !== snapshot.lastWrittenFingerprint) {
        failed.push({ path: rel, error: '文件在 Agent 写入后又被修改，已跳过自动恢复' })
        continue
      }
      if (snapshot.isNewFile) {
        fs.rmSync(abs)
      } else {
        const temp = path.join(path.dirname(abs), `.${path.basename(abs)}.${randomUUID()}.rollback.tmp`)
        fs.writeFileSync(temp, String(snapshot.before ?? ''), 'utf8')
        if (snapshot.originalMode != null) fs.chmodSync(temp, snapshot.originalMode)
        fs.renameSync(temp, abs)
      }
      restored.push(rel)
    } catch (error) {
      failed.push({ path: rel, error: error?.message || String(error) })
    }
  }
  return { restored, failed }
}

module.exports = {
  DEFAULT_SNAPSHOT_CHAR_CAP,
  contentFingerprint,
  resolveSafeWorkspacePath,
  applyTextEdit,
  rollbackTextEdits,
}
