import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { loadWorkspace } from './store.mjs'

const TS_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_WEB = path.resolve(SERVER_DIR, '../web')
const LRU_MAX = 4

/** @type {Map<string, any>} */
const cache = new Map()
/** @type {string[]} */
const lruOrder = []

function touchLru(key) {
  const i = lruOrder.indexOf(key)
  if (i >= 0) lruOrder.splice(i, 1)
  lruOrder.push(key)
  while (lruOrder.length > LRU_MAX) {
    const evict = lruOrder.shift()
    if (!evict || evict === key) continue
    const entry = cache.get(evict)
    if (entry) {
      try {
        entry.service.dispose()
      } catch {
        /* */
      }
      cache.delete(evict)
    }
  }
}

function loadTypescriptModule(root) {
  for (const base of [root, REPO_WEB, SERVER_DIR]) {
    const pkg = path.join(base, 'package.json')
    if (!fs.existsSync(pkg)) continue
    try {
      const req = createRequire(pkg)
      return req('typescript')
    } catch {
      /* try next */
    }
  }
  try {
    const req = createRequire(import.meta.url)
    return req('typescript')
  } catch {
    return null
  }
}

function findTsConfigForFile(root, absFile) {
  let dir = path.dirname(absFile)
  while (dir.startsWith(root)) {
    const p = path.join(dir, 'tsconfig.json')
    if (fs.existsSync(p)) return p
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  const rootCfg = path.join(root, 'tsconfig.json')
  if (fs.existsSync(rootCfg)) return rootCfg
  return null
}

/**
 * @param {string} root
 * @param {string} configPath
 * @param {import('typescript')} ts
 */
function getOrCreateService(root, configPath, ts) {
  const key = configPath
  let entry = cache.get(key)
  if (entry) {
    touchLru(key)
    return entry
  }

  const configDir = path.dirname(configPath)
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) return null

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    configDir,
    undefined,
    configPath,
  )

  /** @type {Map<string, number>} */
  const versions = new Map()
  /** @type {Map<string, string>} */
  const snapshots = new Map()

  const host = {
    getCompilationSettings: () => parsed.options,
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: (fileName) => String(versions.get(path.resolve(fileName)) ?? 0),
    getScriptSnapshot: (fileName) => {
      const abs = path.resolve(fileName)
      if (snapshots.has(abs)) {
        return ts.ScriptSnapshot.fromString(snapshots.get(abs))
      }
      if (!ts.sys.fileExists(abs)) return undefined
      const text = ts.sys.readFile(abs)
      if (text == null) return undefined
      return ts.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => configDir,
    getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  }

  const service = ts.createLanguageService(host, ts.createDocumentRegistry())
  entry = {
    service,
    host,
    versions,
    snapshots,
    configPath,
    fileNames: parsed.fileNames,
    options: parsed.options,
    ts,
    root,
  }
  cache.set(key, entry)
  touchLru(key)
  return entry
}

function applyOpenContent(entry, abs, content) {
  if (content == null) return
  const prev = entry.snapshots.get(abs)
  if (prev === content) return
  entry.snapshots.set(abs, content)
  entry.versions.set(abs, (entry.versions.get(abs) || 0) + 1)
}

function spanToLoc(sf, span) {
  const start = sf.getLineAndCharacterOfPosition(span.start)
  const end = sf.getLineAndCharacterOfPosition(span.start + span.length)
  return {
    line: start.line + 1,
    column: start.character + 1,
    endLine: end.line + 1,
    endColumn: end.character + 1,
  }
}

function locFromFileSpan(root, fileName, span, service) {
  const targetAbs = path.resolve(fileName)
  const sf = service.getProgram()?.getSourceFile(targetAbs)
  const base = {
    relPath: path.relative(root, targetAbs).replace(/\\/g, '/'),
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  }
  if (!sf || !span) return base
  return { ...base, ...spanToLoc(sf, span) }
}

function resolvePosition(body) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(workspaceDir)
  const rel = String(body?.relPath || '').replace(/^[/\\]+/, '')
  if (!rel || rel.includes('..')) return { ok: false, error: '无效路径' }

  const abs = path.resolve(root, rel)
  if (!abs.startsWith(root)) return { ok: false, error: '路径越界' }
  const ext = path.extname(abs).toLowerCase()
  if (!TS_EXTS.has(ext)) return { ok: false, error: '非 TS/JS 文件' }

  const ts = loadTypescriptModule(root)
  if (!ts) return { ok: false, error: '未找到 typescript 模块' }

  const configPath = findTsConfigForFile(root, abs)
  if (!configPath) return { ok: false, error: '未找到 tsconfig.json' }

  const entry = getOrCreateService(root, configPath, ts)
  if (!entry) return { ok: false, error: '无法创建语言服务' }

  applyOpenContent(entry, abs, typeof body.content === 'string' ? body.content : undefined)

  const line = Math.max(1, Number(body.line) || 1)
  const column = Math.max(1, Number(body.column) || 1)

  let sf = entry.service.getProgram()?.getSourceFile(abs)
  if (!sf) {
    if (typeof body.content === 'string' || fs.existsSync(abs)) {
      const text =
        typeof body.content === 'string' ? body.content : fs.readFileSync(abs, 'utf8')
      applyOpenContent(entry, abs, text)
      const names = entry.host.getScriptFileNames()
      if (!names.includes(abs) && !names.includes(path.normalize(abs))) {
        const orig = entry.host.getScriptFileNames
        entry.host.getScriptFileNames = () => [...new Set([...orig(), abs])]
      }
      sf = entry.service.getProgram()?.getSourceFile(abs)
    }
  }
  if (!sf) return { ok: false, error: '源文件不在工程内' }

  const maxLine = Math.max(0, sf.getLineAndCharacterOfPosition(sf.text.length).line)
  const offset = sf.getPositionOfLineAndCharacter(
    Math.min(line - 1, maxLine),
    Math.max(0, column - 1),
  )

  return { ok: true, entry, abs, offset, root, ts, sf }
}

export function tsDefinitionAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return resolved
  const { entry, abs, offset, root } = resolved

  const defs = entry.service.getDefinitionAtPosition(abs, offset)
  if (!defs?.length) return { ok: true, definition: null }

  const d = defs[0]
  const loc = locFromFileSpan(root, d.fileName, d.textSpan, entry.service)
  return {
    ok: true,
    definition: {
      ...loc,
      name: d.name || null,
      kind: d.kind || null,
    },
  }
}

export function tsTypeDefinitionAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return resolved
  const { entry, abs, offset, root } = resolved
  const defs = entry.service.getTypeDefinitionAtPosition(abs, offset)
  if (!defs?.length) return { ok: true, definition: null }
  const d = defs[0]
  const loc = locFromFileSpan(root, d.fileName, d.textSpan, entry.service)
  return { ok: true, definition: { ...loc, name: d.name || null, kind: d.kind || null } }
}

export function tsImplementationAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return resolved
  const { entry, abs, offset, root } = resolved
  const defs = entry.service.getImplementationAtPosition(abs, offset)
  if (!defs?.length) return { ok: true, definition: null, definitions: [] }
  const definitions = defs.map((d) => {
    const loc = locFromFileSpan(root, d.fileName, d.textSpan, entry.service)
    return { ...loc, name: null, kind: null }
  })
  return { ok: true, definition: definitions[0] ?? null, definitions }
}

export function tsHoverAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return { ...resolved, hover: null }
  const { entry, abs, offset, ts, sf } = resolved

  const info = entry.service.getQuickInfoAtPosition(abs, offset)
  if (!info) return { ok: true, hover: null }

  const display = ts.displayPartsToString(info.displayParts || [])
  const docs = ts.displayPartsToString(info.documentation || [])
  const tags = (info.tags || [])
    .map((t) => `@${t.name}${t.text ? ` ${ts.displayPartsToString(t.text)}` : ''}`)
    .join('\n')

  let fromLine = body.line
  let fromCol = body.column
  let toLine = body.line
  let toCol = body.column + 1
  if (sf && info.textSpan) {
    const loc = spanToLoc(sf, info.textSpan)
    fromLine = loc.line
    fromCol = loc.column
    toLine = loc.endLine
    toCol = loc.endColumn
  }

  return {
    ok: true,
    hover: {
      display,
      documentation: [docs, tags].filter(Boolean).join('\n\n') || null,
      kind: info.kind || null,
      fromLine,
      fromCol,
      toLine,
      toCol,
    },
  }
}

export function tsSignatureHelpAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return { ...resolved, signatureHelp: null }
  const { entry, abs, offset, ts } = resolved
  const help = entry.service.getSignatureHelpItems(abs, offset, {})
  if (!help) return { ok: true, signatureHelp: null }
  const items = (help.items || []).slice(0, 8).map((it) => ({
    label: ts.displayPartsToString(it.prefixDisplayParts || [])
      + (it.parameters || []).map((p) => ts.displayPartsToString(p.displayParts || [])).join(', ')
      + ts.displayPartsToString(it.suffixDisplayParts || []),
    documentation: ts.displayPartsToString(it.documentation || []) || null,
  }))
  return {
    ok: true,
    signatureHelp: {
      activeSignature: help.selectedItemIndex || 0,
      activeParameter: help.argumentIndex || 0,
      items,
    },
  }
}

export function tsCompletionsAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return { ...resolved, completions: [] }
  const { entry, abs, offset, ts, sf } = resolved

  const info = entry.service.getCompletionsAtPosition(abs, offset, {
    includeCompletionsForModuleExports: true,
    includeCompletionsWithInsertText: true,
  })
  if (!info?.entries?.length) return { ok: true, completions: [], fromLine: body.line, fromCol: body.column }

  let fromLine = body.line
  let fromCol = body.column
  if (info.optionalReplacementSpan && sf) {
    const loc = spanToLoc(sf, info.optionalReplacementSpan)
    fromLine = loc.line
    fromCol = loc.column
  }

  const completions = []
  for (const e of info.entries.slice(0, 40)) {
    let detail = e.kind || null
    try {
      const details = entry.service.getCompletionEntryDetails(
        abs,
        offset,
        e.name,
        undefined,
        e.source,
        undefined,
        e.data,
      )
      if (details) {
        detail = ts.displayPartsToString(details.displayParts || []) || detail
      }
    } catch {
      /* */
    }
    completions.push({
      label: e.name,
      kind: String(e.kind || 'property'),
      detail,
      insertText: e.insertText || e.name,
      sortText: e.sortText || e.name,
    })
  }

  return { ok: true, completions, fromLine, fromCol }
}

export function tsReferencesAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return { ...resolved, references: [] }
  const { entry, abs, offset, root } = resolved
  const res = entry.service.getReferencesAtPosition(abs, offset)
  if (!res?.length) return { ok: true, references: [] }
  const references = []
  for (const group of res) {
    for (const ref of group.references || []) {
      references.push(locFromFileSpan(root, ref.fileName, ref.textSpan, entry.service))
      if (references.length >= 80) break
    }
    if (references.length >= 80) break
  }
  return { ok: true, references }
}

export function tsRenameLocationsAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return { ...resolved, locations: [], canRename: false }
  const { entry, abs, offset, root } = resolved
  const renameInfo = entry.service.getRenameInfo(abs, offset, { allowRenameOfImportPath: false })
  if (!renameInfo?.canRename) {
    return { ok: true, canRename: false, displayName: null, locations: [], error: renameInfo?.localizedErrorMessage || null }
  }
  const groups = entry.service.findRenameLocations(abs, offset, false, false, {
    providePrefixAndSuffixTextForRename: true,
  })
  const locations = []
  for (const loc of groups || []) {
    locations.push({
      ...locFromFileSpan(root, loc.fileName, loc.textSpan, entry.service),
      prefixText: loc.prefixText || null,
      suffixText: loc.suffixText || null,
    })
  }
  return {
    ok: true,
    canRename: true,
    displayName: renameInfo.displayName || null,
    fullDisplayName: renameInfo.fullDisplayName || null,
    locations,
  }
}

/**
 * 光标处 Code Fixes（Quick Fix）。
 * @param {{ relPath: string, line: number, column: number, endLine?: number, endColumn?: number, content?: string, errorCodes?: number[] }} body
 */
export function tsCodeFixesAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) return { ...resolved, fixes: [] }
  const { entry, abs, offset, sf, ts } = resolved
  const endOffset =
    body?.endLine != null
      ? sf.getPositionOfLineAndCharacter(
          Math.max(0, Number(body.endLine) - 1),
          Math.max(0, (Number(body.endColumn) || 1) - 1),
        )
      : offset + 1
  let errorCodes = Array.isArray(body?.errorCodes) ? body.errorCodes.map(Number).filter(Boolean) : []
  if (!errorCodes.length) {
    /** @type {any[]} */
    let diags = []
    try {
      diags = [
        ...entry.service.getSyntacticDiagnostics(abs),
        ...entry.service.getSemanticDiagnostics(abs),
      ]
      if (typeof entry.service.getSuggestionDiagnostics === 'function') {
        diags.push(...entry.service.getSuggestionDiagnostics(abs))
      }
    } catch {
      diags = []
    }
    errorCodes = [
      ...new Set(
        diags
          .filter((d) => d.start != null && d.start <= offset && (d.start + (d.length || 1)) >= offset)
          .map((d) => d.code)
          .filter(Boolean),
      ),
    ]
  }
  if (!errorCodes.length) return { ok: true, fixes: [] }
  try {
    const format = ts.getDefaultFormatCodeSettings?.() || {}
    const raw = entry.service.getCodeFixesAtPosition(abs, offset, Math.max(endOffset, offset + 1), errorCodes, format, {})
    const fixes = (raw || []).slice(0, 12).map((f, i) => ({
      id: String(f.fixName || f.description || i),
      description: String(f.description || f.fixName || 'fix'),
      fixName: f.fixName || null,
      changes: (f.changes || []).map((c) => ({
        fileName: c.fileName,
        textChanges: (c.textChanges || []).map((tc) => ({
          start: tc.span.start,
          length: tc.span.length,
          newText: tc.newText || '',
        })),
      })),
    }))
    return { ok: true, fixes }
  } catch (e) {
    return { ok: false, fixes: [], error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * 应用单个 code fix（返回当前文件新文本；跨文件变更一并返回）。
 * @param {{ relPath: string, content?: string, fix: { changes: Array<{ fileName: string, textChanges: Array<{ start: number, length: number, newText: string }> }> } }} body
 */
export function tsApplyCodeFix(body) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(workspaceDir)
  const fix = body?.fix
  if (!fix?.changes?.length) return { ok: false, error: '无修复内容' }
  const primaryRel = String(body?.relPath || '').replace(/\\/g, '/')
  /** @type {{ path: string, content: string }[]} */
  const files = []
  try {
    for (const ch of fix.changes) {
      const abs = path.resolve(ch.fileName)
      if (!abs.startsWith(root)) continue
      const rel = path.relative(root, abs).replace(/\\/g, '/')
      let text =
        rel === primaryRel && typeof body.content === 'string'
          ? body.content
          : fs.existsSync(abs)
            ? fs.readFileSync(abs, 'utf8')
            : ''
      if (!text && rel !== primaryRel) continue
      const sorted = [...(ch.textChanges || [])].sort((a, b) => b.start - a.start)
      for (const tc of sorted) {
        const start = tc.start
        const end = start + tc.length
        text = text.slice(0, start) + (tc.newText || '') + text.slice(end)
      }
      files.push({ path: rel, content: text })
    }
    if (!files.length) return { ok: false, error: '无法应用修复' }
    const primary = files.find((f) => f.path === primaryRel) || files[0]
    return { ok: true, content: primary.content, files, changed: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * 格式化整份文档（TS Language Service；返回完整新文本）。
 * @param {{ relPath: string, content?: string }} body
 */
export function tsFormatDocument(body) {
  const resolved = resolvePosition({
    relPath: body?.relPath,
    line: 1,
    column: 1,
    content: body?.content,
  })
  if (!resolved.ok) return { ok: false, content: null, error: resolved.error }
  const { entry, abs, ts } = resolved
  try {
    const format = ts.getDefaultFormatCodeSettings?.() || {}
    const edits = entry.service.getFormattingEditsForDocument(abs, format)
    let text =
      typeof body?.content === 'string'
        ? body.content
        : entry.service.getProgram()?.getSourceFile(abs)?.getFullText() || ''
    if (!text) return { ok: false, content: null, error: '无法读取文件' }
    if (!edits?.length) return { ok: true, content: null, changed: false }
    const sorted = [...edits].sort((a, b) => b.span.start - a.span.start)
    for (const ch of sorted) {
      const start = ch.span.start
      const end = start + ch.span.length
      text = text.slice(0, start) + (ch.newText || '') + text.slice(end)
    }
    return { ok: true, content: text, changed: true }
  } catch (e) {
    return { ok: false, content: null, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Organize Imports（返回完整新文本，由前端替换）。
 * @param {{ relPath: string, content?: string }} body
 */
export function tsOrganizeImports(body) {
  const resolved = resolvePosition({
    relPath: body?.relPath,
    line: 1,
    column: 1,
    content: body?.content,
  })
  if (!resolved.ok) return { ok: false, content: null, error: resolved.error }
  const { entry, abs, root, ts } = resolved
  try {
    const edits = entry.service.organizeImports(
      { type: 'file', fileName: abs },
      {},
      ts.getDefaultFormatCodeSettings?.() || {},
    )
    if (!edits?.length) return { ok: true, content: null, changed: false }
    let text =
      typeof body?.content === 'string'
        ? body.content
        : entry.service.getProgram()?.getSourceFile(abs)?.getFullText() || ''
    if (!text) return { ok: false, content: null, error: '无法读取文件' }
    // 从后往前应用
    const sorted = [...edits].flatMap((f) => f.textChanges || []).sort((a, b) => b.span.start - a.span.start)
    for (const ch of sorted) {
      const start = ch.span.start
      const end = start + ch.span.length
      text = text.slice(0, start) + (ch.newText || '') + text.slice(end)
    }
    void root
    return { ok: true, content: text, changed: true }
  } catch (e) {
    return { ok: false, content: null, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * 供 workspace-lint 复用，避免第二套 createProgram。
 * @param {string} root
 * @param {string[]} absFiles
 */
export function tsDiagnosticsForAbsFiles(root, absFiles) {
  const ts = loadTypescriptModule(root)
  if (!ts) return []

  /** @type {Map<string, string[]>} */
  const groups = new Map()
  for (const abs of absFiles) {
    const ext = path.extname(abs).toLowerCase()
    if (!TS_EXTS.has(ext)) continue
    const cfg = findTsConfigForFile(root, abs)
    if (!cfg) continue
    if (!groups.has(cfg)) groups.set(cfg, [])
    groups.get(cfg).push(abs)
  }

  /** @type {Array<{ relPath: string, line: number, column: number, endLine?: number, endColumn?: number, severity: 'error' | 'warning', message: string, rule?: string | null }>} */
  const problems = []

  for (const [configPath, files] of groups) {
    const entry = getOrCreateService(root, configPath, ts)
    if (!entry) continue
    for (const abs of files) {
      const absResolved = path.resolve(abs)
      const sf = entry.service.getProgram()?.getSourceFile(absResolved)
      if (!sf) continue
      const diags = [
        ...entry.service.getSyntacticDiagnostics(absResolved),
        ...entry.service.getSemanticDiagnostics(absResolved),
      ]
      for (const d of diags) {
        if (!d.file || d.start == null) continue
        if (d.category === ts.DiagnosticCategory.Message) continue
        const start = d.file.getLineAndCharacterOfPosition(d.start)
        const endPos = d.end != null ? d.file.getLineAndCharacterOfPosition(d.end) : start
        problems.push({
          relPath: path.relative(root, absResolved).replace(/\\/g, '/'),
          line: start.line + 1,
          column: start.character + 1,
          endLine: endPos.line + 1,
          endColumn: Math.max(endPos.character + 1, start.character + 2),
          severity: d.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
          message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
          rule: `TS${d.code}`,
        })
      }
    }
  }
  return problems
}

export function tsNavigationTree(body) {
  const resolved = resolvePosition({ ...(body || {}), line: 1, column: 1 })
  if (!resolved.ok) return resolved
  const { entry, abs, sf, ts } = resolved
  const tree = entry.service.getNavigationTree(abs)
  const symbols = []
  const walk = (node, depth) => {
    if (!node || symbols.length >= 400) return
    const text = String(node.text || '').trim()
    const span = node.nameSpan || node.spans?.[0]
    if (depth > 0 && text && !text.startsWith('<') && span && sf) {
      const pos = sf.getLineAndCharacterOfPosition(Math.min(span.start, sf.text.length))
      const kindName = ts.SyntaxKind?.[node.kind] || 'unknown'
      symbols.push({ name: text, kind: kindName, line: pos.line + 1 })
    }
    for (const child of node.childItems || []) walk(child, depth + 1)
  }
  walk(tree, 0)
  return { ok: true, symbols }
}

export function invalidateTsSnapshotsForPaths(relPaths) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir || !Array.isArray(relPaths) || !relPaths.length) return
  const root = path.resolve(workspaceDir)
  for (const rel of relPaths) {
    const clean = String(rel || '').replace(/^[/\\]+/, '')
    if (!clean || clean.includes('..')) continue
    const abs = path.resolve(root, clean)
    if (!abs.startsWith(root)) continue
    for (const entry of cache.values()) {
      if (entry.snapshots.has(abs)) entry.snapshots.delete(abs)
      entry.versions.set(abs, (entry.versions.get(abs) || 0) + 1)
    }
  }
}

/**
 * TS/JS Call Hierarchy（真 Language Service；无结果则空，禁止假树）。
 * @param {{ relPath: string, line: number, column: number, content?: string }} body
 */
export function tsCallHierarchyAt(body) {
  const resolved = resolvePosition(body)
  if (!resolved.ok) {
    return { ...resolved, item: null, incoming: [], outgoing: [] }
  }
  const { entry, abs, offset, root } = resolved
  const svc = entry.service
  if (typeof svc.prepareCallHierarchy !== 'function') {
    return {
      ok: false,
      error: '当前 typescript 不支持 Call Hierarchy',
      item: null,
      incoming: [],
      outgoing: [],
    }
  }
  let prepared
  try {
    prepared = svc.prepareCallHierarchy(abs, offset)
  } catch (e) {
    return {
      ok: false,
      error: e?.message || String(e),
      item: null,
      incoming: [],
      outgoing: [],
    }
  }
  if (!prepared) return { ok: true, item: null, incoming: [], outgoing: [] }
  const rootItem = Array.isArray(prepared) ? prepared[0] : prepared
  if (!rootItem) return { ok: true, item: null, incoming: [], outgoing: [] }

  const mapItem = (it) => ({
    name: String(it.name || ''),
    kind: String(it.kind || ''),
    containerName: it.containerName != null ? String(it.containerName) : null,
    ...locFromFileSpan(root, it.file, it.selectionSpan || it.span, entry.service),
  })

  const item = mapItem(rootItem)
  let incoming = []
  let outgoing = []
  try {
    incoming = (svc.provideCallHierarchyIncomingCalls(rootItem) || [])
      .slice(0, 48)
      .map((c) => ({
        ...mapItem(c.from),
        callCount: Array.isArray(c.fromSpans) ? c.fromSpans.length : 0,
      }))
  } catch {
    incoming = []
  }
  try {
    outgoing = (svc.provideCallHierarchyOutgoingCalls(rootItem) || [])
      .slice(0, 48)
      .map((c) => ({
        ...mapItem(c.to),
        callCount: Array.isArray(c.fromSpans) ? c.fromSpans.length : 0,
      }))
  } catch {
    outgoing = []
  }
  return { ok: true, item, incoming, outgoing }
}

export function invalidateTsServiceCache() {
  for (const entry of cache.values()) {
    try {
      entry.service.dispose()
    } catch {
      /* */
    }
  }
  cache.clear()
  lruOrder.length = 0
}
