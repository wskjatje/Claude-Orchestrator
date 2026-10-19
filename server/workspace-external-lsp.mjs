/**
 * 外部语言服务器进程桥（Python / Go / Rust）。
 * JSON-RPC over stdio（Content-Length framing）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { loadWorkspace } from './store.mjs'

/** @typedef {'python' | 'go' | 'rust'} LspLang */

/**
 * @returns {{ ok: boolean, languages: Array<{ id: string, detected: boolean, serverHint: string | null, running?: boolean }>, error?: string }}
 */
export function detectExternalLspCandidates() {
  return getExternalLspStatus()
}

/**
 * 供状态栏 / Problems 空态：语言是否检测到、命令是否可用、运行中、最近错误。
 * @returns {{ ok: boolean, languages: Array<{ id: string, detected: boolean, commandAvailable: boolean, serverHint: string | null, running?: boolean, lastError?: string | null }>, error?: string }}
 */
export function getExternalLspStatus() {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, languages: [], error: '未选择工作区' }
  const root = path.resolve(workspaceDir)

  const langs = /** @type {LspLang[]} */ (['python', 'go', 'rust'])
  const languages = langs.map((id) => {
    const cmd = resolveCommand(id)
    const meta = metaFor(id)
    const running = Boolean(sessions.get(id)?.proc && !sessions.get(id)?.proc.killed)
    const hint = cmd
      ? id === 'python' && String(cmd.args?.[0] || '').includes('pyright')
        ? defaultHint(id)
        : `${cmd.cmd} ${(cmd.args || []).join(' ')}`.trim()
      : defaultHint(id)
    return {
      id,
      detected: detectProject(id, root),
      commandAvailable: Boolean(cmd),
      serverHint: hint,
      installHint: cmd ? null : installHint(id),
      running,
      lastError: meta.lastError,
    }
  })

  return { ok: true, languages }
}

function defaultHint(id) {
  if (id === 'python') return 'pyright-langserver --stdio'
  if (id === 'go') return 'gopls'
  return 'rust-analyzer'
}

/** 缺命令时可行动安装说明（状态栏 title / toast） */
function installHint(id) {
  if (id === 'python') return '在应用仓库执行 npm i pyright（或 npm i -g pyright / pip install pyright）'
  if (id === 'go') return 'go install golang.org/x/tools/gopls@latest'
  return 'rustup component add rust-analyzer  或  brew install rust-analyzer'
}

function detectProject(id, root) {
  if (id === 'python') {
    return (
      fs.existsSync(path.join(root, 'pyproject.toml')) ||
      fs.existsSync(path.join(root, 'requirements.txt')) ||
      fs.existsSync(path.join(root, 'setup.py'))
    )
  }
  if (id === 'go') return fs.existsSync(path.join(root, 'go.mod'))
  if (id === 'rust') return fs.existsSync(path.join(root, 'Cargo.toml'))
  return false
}

/** 与 mcp-health 一致：补齐常见 bin，便于 Electron 壳找到语言服务器 */
function lspSearchEnv() {
  const env = { ...process.env }
  const sep = process.platform === 'win32' ? ';' : ':'
  const extraDirs =
    process.platform === 'win32'
      ? [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs')].filter(Boolean)
      : [
          '/opt/homebrew/bin',
          '/usr/local/bin',
          path.join(process.env.HOME || '', '.local', 'bin'),
          path.join(process.env.HOME || '', '.cargo', 'bin'),
        ]
  const cur = env.PATH || env.Path || ''
  const parts = String(cur)
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean)
  const seen = new Set(parts)
  for (const dir of extraDirs) {
    try {
      if (dir && fs.existsSync(dir) && !seen.has(dir)) {
        parts.unshift(dir)
        seen.add(dir)
      }
    } catch {
      /* ignore */
    }
  }
  // 应用仓库自带的 node_modules/.bin（本模块位于 server/）
  const appBin = path.join(__dirname, '..', 'node_modules', '.bin')
  if (fs.existsSync(appBin) && !seen.has(appBin)) {
    parts.unshift(appBin)
    seen.add(appBin)
  }
  env.PATH = parts.join(sep)
  if (process.platform === 'win32') env.Path = env.PATH
  return env
}

function commandExists(bin) {
  try {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: lspSearchEnv(),
    })
    return r.status === 0 && Boolean((r.stdout || '').trim())
  } catch {
    return false
  }
}

/**
 * 应用自带 pyright（package.json 依赖），不依赖用户全局 PATH。
 * @returns {{ cmd: string, args: string[] } | null}
 */
function resolveBundledPyrightLangserver() {
  const script = path.join(__dirname, '..', 'node_modules', 'pyright', 'langserver.index.js')
  if (!fs.existsSync(script)) return null
  return { cmd: process.execPath, args: [script, '--stdio'] }
}

/** @returns {{ cmd: string, args: string[] } | null} */
function resolveCommand(id) {
  if (id === 'python') {
    const bundled = resolveBundledPyrightLangserver()
    if (bundled) return bundled
    if (commandExists('basedpyright-langserver')) {
      return { cmd: 'basedpyright-langserver', args: ['--stdio'] }
    }
    if (commandExists('pyright-langserver')) {
      return { cmd: 'pyright-langserver', args: ['--stdio'] }
    }
    if (commandExists('pyright')) {
      return { cmd: 'pyright', args: ['--langserver'] }
    }
    return null
  }
  if (id === 'go') {
    if (commandExists('gopls')) return { cmd: 'gopls', args: [] }
    return null
  }
  if (id === 'rust') {
    if (commandExists('rust-analyzer')) return { cmd: 'rust-analyzer', args: [] }
    return null
  }
  return null
}

function languageIdForExt(ext) {
  if (ext === '.py') return 'python'
  if (ext === '.go') return 'go'
  if (ext === '.rs') return 'rust'
  return null
}

/** @param {string} relPath */
export function langFromRelPath(relPath) {
  const ext = path.extname(String(relPath || '')).toLowerCase()
  return languageIdForExt(ext)
}

/**
 * @typedef {{
 *   proc: import('node:child_process').ChildProcess,
 *   root: string,
 *   lang: LspLang,
 *   buf: Buffer,
 *   nextId: number,
 *   pending: Map<number, { resolve: Function, reject: Function, timer: NodeJS.Timeout }>,
 *   ready: Promise<void>,
 *   openDocs: Map<string, number>,
 *   diagnostics: Map<string, Array<{
 *     relPath: string, line: number, column: number, endLine?: number, endColumn?: number,
 *     severity: 'error' | 'warning', message: string, rule?: string | null
 *   }>>,
 * }} LspSession
 */

/** @type {Map<LspLang, LspSession>} */
const sessions = new Map()

/** @type {Map<LspLang, { lastError: string | null, restartCount: number, intentionalStop: boolean }>} */
const langMeta = new Map()

function metaFor(lang) {
  if (!langMeta.has(lang)) {
    langMeta.set(lang, { lastError: null, restartCount: 0, intentionalStop: false })
  }
  return langMeta.get(lang)
}

function relToUri(root, relPath) {
  const abs = path.resolve(root, relPath.replace(/\\/g, '/'))
  return pathToFileURL(abs).href
}

function uriToRel(root, uri) {
  try {
    const abs = fileURLToPath(uri)
    const rel = path.relative(root, abs).replace(/\\/g, '/')
    return rel.startsWith('..') ? null : rel
  } catch {
    return null
  }
}

function encodeMessage(obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8')
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8')
  return Buffer.concat([header, body])
}

/**
 * @param {LspSession} session
 * @param {Buffer} chunk
 */
function feedStdout(session, chunk) {
  session.buf = Buffer.concat([session.buf, chunk])
  while (true) {
    const headerEnd = session.buf.indexOf('\r\n\r\n')
    if (headerEnd < 0) return
    const header = session.buf.subarray(0, headerEnd).toString('utf8')
    const m = header.match(/Content-Length:\s*(\d+)/i)
    if (!m) {
      session.buf = session.buf.subarray(headerEnd + 4)
      continue
    }
    const len = Number(m[1])
    const start = headerEnd + 4
    if (session.buf.length < start + len) return
    const body = session.buf.subarray(start, start + len).toString('utf8')
    session.buf = session.buf.subarray(start + len)
    let msg
    try {
      msg = JSON.parse(body)
    } catch {
      continue
    }
    if (msg?.method === 'textDocument/publishDiagnostics') {
      ingestPublishDiagnostics(session, msg.params)
      continue
    }
    if (msg && typeof msg.id === 'number' && session.pending.has(msg.id)) {
      const p = session.pending.get(msg.id)
      session.pending.delete(msg.id)
      clearTimeout(p.timer)
      if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)))
      else p.resolve(msg.result)
    }
  }
}

/**
 * @param {LspSession} session
 * @param {{ uri?: string, diagnostics?: any[] }} params
 */
function ingestPublishDiagnostics(session, params) {
  if (!params?.uri) return
  const rel = uriToRel(session.root, params.uri)
  if (!rel) return
  const list = []
  for (const d of params.diagnostics || []) {
    const start = d.range?.start
    const end = d.range?.end
    if (!start) continue
    const sev = d.severity === 1 || d.severity === 2 ? 'error' : 'warning'
    list.push({
      relPath: rel,
      line: start.line + 1,
      column: start.character + 1,
      endLine: (end?.line ?? start.line) + 1,
      endColumn: (end?.character ?? start.character) + 1,
      severity: sev,
      message: String(d.message || 'diagnostic'),
      rule: d.code != null ? String(d.code) : null,
    })
  }
  session.diagnostics.set(rel.replace(/\\/g, '/'), list)
}

function sendRaw(session, obj) {
  if (!session?.proc?.stdin?.writable) throw new Error('LSP 进程未就绪')
  session.proc.stdin.write(encodeMessage(obj))
}

function request(session, method, params, timeoutMs = 12_000) {
  const id = session.nextId++
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      session.pending.delete(id)
      reject(new Error(`LSP 超时: ${method}`))
    }, timeoutMs)
    session.pending.set(id, { resolve, reject, timer })
    try {
      sendRaw(session, { jsonrpc: '2.0', id, method, params })
    } catch (e) {
      clearTimeout(timer)
      session.pending.delete(id)
      reject(e)
    }
  })
}

function notify(session, method, params) {
  sendRaw(session, { jsonrpc: '2.0', method, params })
}

/**
 * @param {LspLang} lang
 */
async function ensureSession(lang) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, error: '未选择工作区' }
  const root = path.resolve(workspaceDir)

  const existing = sessions.get(lang)
  if (existing?.proc && !existing.proc.killed && existing.root === root) {
    await existing.ready
    return { ok: true, session: existing }
  }

  stopSession(lang)

  const meta = metaFor(lang)
  meta.intentionalStop = false
  const cmd = resolveCommand(lang)
  if (!cmd) {
    const error = `未找到 ${defaultHint(lang)}（请安装对应语言服务器）`
    meta.lastError = error
    return { ok: false, error }
  }

  const proc = spawn(cmd.cmd, cmd.args, {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: lspSearchEnv(),
  })

  /** @type {LspSession} */
  const session = {
    proc,
    root,
    lang,
    buf: Buffer.alloc(0),
    nextId: 1,
    pending: new Map(),
    openDocs: new Map(),
    diagnostics: new Map(),
    ready: Promise.resolve(),
  }

  proc.stdout.on('data', (chunk) => feedStdout(session, chunk))
  proc.stderr.on('data', () => {
    /* 偶发日志 */
  })
  proc.on('exit', (code) => {
    if (sessions.get(lang) === session) sessions.delete(lang)
    for (const [, p] of session.pending) {
      clearTimeout(p.timer)
      p.reject(new Error('LSP 进程已退出'))
    }
    session.pending.clear()
    const m = metaFor(lang)
    if (m.intentionalStop) return
    m.lastError = `${lang} LSP 已退出 (code=${code ?? '?'})`
    // 崩溃后有限次自动重启
    if (m.restartCount < 3) {
      m.restartCount += 1
      setTimeout(() => {
        void ensureSession(lang).then((r) => {
          if (r.ok) m.lastError = null
        })
      }, 800 * m.restartCount)
    }
  })

  session.ready = (async () => {
    await request(session, 'initialize', {
      processId: process.pid,
      rootUri: pathToFileURL(root).href,
      rootPath: root,
      capabilities: {
        textDocument: {
          synchronization: { didSave: true },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          completion: { completionItem: { snippetSupport: false } },
          definition: { linkSupport: true },
          references: {},
          rename: { prepareSupport: true },
          documentSymbol: {
            hierarchicalDocumentSymbolSupport: true,
          },
          callHierarchy: {},
          publishDiagnostics: { relatedInformation: false },
        },
      },
      initializationOptions: {},
      workspaceFolders: [{ uri: pathToFileURL(root).href, name: path.basename(root) }],
    })
    notify(session, 'initialized', {})
  })()

  sessions.set(lang, session)
  try {
    await session.ready
    meta.lastError = null
    meta.restartCount = 0
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    meta.lastError = error
    stopSession(lang)
    return { ok: false, error }
  }
  return { ok: true, session }
}

/** @param {LspLang} [lang] */
export function stopSession(lang) {
  if (lang) {
    const s = sessions.get(lang)
    if (!s) return
    metaFor(lang).intentionalStop = true
    sessions.delete(lang)
    try {
      notify(s, 'shutdown', null)
    } catch {
      /* */
    }
    try {
      s.proc.kill()
    } catch {
      /* */
    }
    return
  }
  for (const id of [...sessions.keys()]) stopSession(id)
}

/** @deprecated 兼容旧调用 */
export function stopPythonSession() {
  stopSession('python')
}

/**
 * @param {LspSession} session
 * @param {{ relPath: string, content?: string }} body
 */
async function syncDoc(session, body) {
  const rel = String(body.relPath || '').replace(/\\/g, '/')
  const lang = langFromRelPath(rel)
  if (!lang || lang !== session.lang) return { ok: false, error: `非 ${session.lang} 文件` }
  const uri = relToUri(session.root, rel)
  let text = typeof body.content === 'string' ? body.content : null
  if (text == null) {
    const abs = path.resolve(session.root, rel)
    if (!fs.existsSync(abs)) return { ok: false, error: '文件不存在' }
    text = fs.readFileSync(abs, 'utf8')
  }
  const ver = (session.openDocs.get(uri) || 0) + 1
  session.openDocs.set(uri, ver)
  const languageId = lang === 'python' ? 'python' : lang === 'go' ? 'go' : 'rust'
  if (ver === 1) {
    notify(session, 'textDocument/didOpen', {
      textDocument: { uri, languageId, version: ver, text },
    })
  } else {
    notify(session, 'textDocument/didChange', {
      textDocument: { uri, version: ver },
      contentChanges: [{ text }],
    })
  }
  return { ok: true, uri }
}

function locFromLsp(session, loc) {
  if (!loc?.uri || !loc.range?.start) return null
  const rel = uriToRel(session.root, loc.uri)
  if (!rel) return null
  return {
    relPath: rel,
    line: loc.range.start.line + 1,
    column: loc.range.start.character + 1,
    endLine: (loc.range.end?.line ?? loc.range.start.line) + 1,
    endColumn: (loc.range.end?.character ?? loc.range.start.character) + 1,
  }
}

function positionParams(uri, line, column) {
  return {
    textDocument: { uri },
    position: {
      line: Math.max(0, (Number(line) || 1) - 1),
      character: Math.max(0, (Number(column) || 1) - 1),
    },
  }
}

function formatHoverContents(contents) {
  if (typeof contents === 'string') return contents
  if (Array.isArray(contents)) return contents.map(formatHoverContents).filter(Boolean).join('\n\n')
  if (contents && typeof contents === 'object') {
    if (typeof contents.value === 'string') {
      return contents.language ? `\`\`\`${contents.language}\n${contents.value}\n\`\`\`` : contents.value
    }
  }
  return String(contents ?? '')
}

/**
 * @param {{ relPath: string, line: number, column: number, content?: string }} body
 */
async function withSyncedSession(body, fn) {
  const lang = langFromRelPath(body.relPath)
  if (!lang) return { ok: false, error: '不支持的文件类型' }
  const ensured = await ensureSession(lang)
  if (!ensured.ok) return { ok: false, error: ensured.error }
  const session = ensured.session
  const sync = await syncDoc(session, body)
  if (!sync.ok) return { ok: false, error: sync.error }
  try {
    return await fn(session, sync.uri)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function externalLspDefinitionAt(body) {
  const r = await withSyncedSession(body, async (session, uri) => {
    const result = await request(session, 'textDocument/definition', positionParams(uri, body.line, body.column))
    const first = Array.isArray(result)
      ? result[0]
      : result?.targetUri
        ? { uri: result.targetUri, range: result.targetRange || result.targetSelectionRange }
        : result
    return { ok: true, definition: locFromLsp(session, first) }
  })
  if (!r.ok) return { ok: false, definition: null, error: r.error }
  return r
}

export async function externalLspHoverAt(body) {
  const r = await withSyncedSession(body, async (session, uri) => {
    const result = await request(session, 'textDocument/hover', positionParams(uri, body.line, body.column))
    if (!result?.contents) return { ok: true, hover: null }
    const range = result.range
    return {
      ok: true,
      hover: {
        display: formatHoverContents(result.contents),
        documentation: null,
        kind: null,
        fromLine: range ? range.start.line + 1 : body.line,
        fromCol: range ? range.start.character + 1 : body.column,
        toLine: range ? range.end.line + 1 : body.line,
        toCol: range ? range.end.character + 1 : body.column,
      },
    }
  })
  if (!r.ok) return { ok: false, hover: null, error: r.error }
  return r
}

export async function externalLspCompletionsAt(body) {
  const r = await withSyncedSession(body, async (session, uri) => {
    const result = await request(session, 'textDocument/completion', {
      ...positionParams(uri, body.line, body.column),
      context: { triggerKind: 1 },
    })
    const items = Array.isArray(result) ? result : result?.items || []
    const completions = items
      .slice(0, 80)
      .map((it) => ({
        label: String(it.label || ''),
        kind: String(it.kind ?? 'text'),
        detail: typeof it.detail === 'string' ? it.detail : null,
        insertText: typeof it.insertText === 'string' ? it.insertText : undefined,
        sortText: typeof it.sortText === 'string' ? it.sortText : undefined,
      }))
      .filter((c) => c.label)
    return { ok: true, completions, fromLine: body.line, fromCol: body.column }
  })
  if (!r.ok) return { ok: false, completions: [], error: r.error }
  return r
}

export async function externalLspReferencesAt(body) {
  const r = await withSyncedSession(body, async (session, uri) => {
    const result = await request(session, 'textDocument/references', {
      ...positionParams(uri, body.line, body.column),
      context: { includeDeclaration: true },
    })
    const refs = []
    for (const loc of Array.isArray(result) ? result : []) {
      const hit = locFromLsp(session, loc)
      if (hit) refs.push(hit)
      if (refs.length >= 80) break
    }
    return { ok: true, references: refs }
  })
  if (!r.ok) return { ok: false, references: [], error: r.error }
  return r
}

export async function externalLspRenameAt(body) {
  const r = await withSyncedSession(body, async (session, uri) => {
    let displayName = null
    try {
      const prep = await request(session, 'textDocument/prepareRename', positionParams(uri, body.line, body.column))
      if (prep === null) {
        return { ok: true, canRename: false, displayName: null, locations: [], error: '不可重命名' }
      }
      if (prep?.placeholder) displayName = String(prep.placeholder)
      else if (prep?.range) {
        // 无 placeholder 时用旧名回落
        displayName = null
      }
    } catch {
      /* prepareRename 可选 */
    }

    const newName = typeof body.newName === 'string' && body.newName ? body.newName : '__rename_probe__'
    const edit = await request(session, 'textDocument/rename', {
      ...positionParams(uri, body.line, body.column),
      newName,
    })

    const locations = []
    const changes = edit?.changes || {}
    for (const [docUri, edits] of Object.entries(changes)) {
      const rel = uriToRel(session.root, docUri)
      if (!rel) continue
      for (const e of edits || []) {
        const start = e.range?.start
        const end = e.range?.end
        if (!start) continue
        locations.push({
          relPath: rel,
          line: start.line + 1,
          column: start.character + 1,
          endLine: (end?.line ?? start.line) + 1,
          endColumn: (end?.character ?? start.character) + 1,
        })
      }
    }
    // documentChanges 形式
    for (const ch of edit?.documentChanges || []) {
      if (!ch?.edits || !ch.textDocument?.uri) continue
      const rel = uriToRel(session.root, ch.textDocument.uri)
      if (!rel) continue
      for (const e of ch.edits) {
        const start = e.range?.start
        const end = e.range?.end
        if (!start) continue
        locations.push({
          relPath: rel,
          line: start.line + 1,
          column: start.character + 1,
          endLine: (end?.line ?? start.line) + 1,
          endColumn: (end?.character ?? start.character) + 1,
        })
      }
    }

    return {
      ok: true,
      canRename: locations.length > 0,
      displayName,
      locations,
      error: locations.length ? null : '无重命名位置',
    }
  })
  if (!r.ok) return { ok: false, canRename: false, displayName: null, locations: [], error: r.error }
  return r
}

/** LSP SymbolKind → 短文案 */
function lspSymbolKindName(kind) {
  const map = {
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
    19: 'Object',
    20: 'Key',
    21: 'Null',
    22: 'EnumMember',
    23: 'Struct',
    24: 'Event',
    25: 'Operator',
    26: 'TypeParameter',
  }
  return map[Number(kind)] || 'Symbol'
}

function flattenDocumentSymbols(session, symbols, out, depth = 0) {
  if (!Array.isArray(symbols) || depth > 8) return
  for (const s of symbols) {
    if (!s || typeof s !== 'object') continue
    const range = s.selectionRange || s.range
    if (!range?.start) continue
    const name = String(s.name || '').trim()
    if (!name) continue
    out.push({
      name,
      kind: lspSymbolKindName(s.kind),
      line: range.start.line + 1,
      column: (range.start.character ?? 0) + 1,
      endLine: (range.end?.line ?? range.start.line) + 1,
      endColumn: (range.end?.character ?? range.start.character ?? 0) + 1,
      depth,
    })
    if (Array.isArray(s.children) && s.children.length) {
      flattenDocumentSymbols(session, s.children, out, depth + 1)
    }
    if (out.length >= 400) return
  }
}

/**
 * 真 LSP DocumentSymbol（Python/Go/Rust）；无结果返回空列表，禁止假树。
 * @param {{ relPath: string, content?: string }} body
 */
export async function externalLspDocumentSymbols(body) {
  const r = await withSyncedSession(body, async (session, uri) => {
    const result = await request(session, 'textDocument/documentSymbol', {
      textDocument: { uri },
    })
    const symbols = []
    if (Array.isArray(result) && result.length) {
      // DocumentSymbol[] 或 SymbolInformation[]
      if (result[0]?.location?.range) {
        for (const si of result) {
          const loc = locFromLsp(session, si.location)
          if (!loc) continue
          symbols.push({
            name: String(si.name || ''),
            kind: lspSymbolKindName(si.kind),
            line: loc.line,
            column: loc.column,
            endLine: loc.endLine,
            endColumn: loc.endColumn,
            depth: 0,
          })
          if (symbols.length >= 400) break
        }
      } else {
        flattenDocumentSymbols(session, result, symbols)
      }
    }
    return { ok: true, symbols }
  })
  if (!r.ok) return { ok: false, symbols: [], error: r.error }
  return r
}

function mapCallHierarchyItem(session, it) {
  if (!it?.uri || !it.range?.start) return null
  const rel = uriToRel(session.root, it.uri)
  if (!rel) return null
  const sel = it.selectionRange || it.range
  return {
    name: String(it.name || ''),
    kind: lspSymbolKindName(it.kind),
    containerName: it.detail != null ? String(it.detail) : null,
    relPath: rel,
    line: sel.start.line + 1,
    column: (sel.start.character ?? 0) + 1,
    endLine: (sel.end?.line ?? sel.start.line) + 1,
    endColumn: (sel.end?.character ?? sel.start.character ?? 0) + 1,
  }
}

/**
 * 真 LSP Call Hierarchy（Python/Go/Rust）；无结果空树，禁止假层。
 * @param {{ relPath: string, line: number, column: number, content?: string }} body
 */
export async function externalLspCallHierarchyAt(body) {
  const r = await withSyncedSession(body, async (session, uri) => {
    let prepared
    try {
      prepared = await request(
        session,
        'textDocument/prepareCallHierarchy',
        positionParams(uri, body.line, body.column),
      )
    } catch (e) {
      return {
        ok: false,
        item: null,
        incoming: [],
        outgoing: [],
        error: e instanceof Error ? e.message : String(e),
      }
    }
    if (!prepared || (Array.isArray(prepared) && !prepared.length)) {
      return { ok: true, item: null, incoming: [], outgoing: [] }
    }
    const rootItem = Array.isArray(prepared) ? prepared[0] : prepared
    const item = mapCallHierarchyItem(session, rootItem)
    if (!item) return { ok: true, item: null, incoming: [], outgoing: [] }

    let incoming = []
    let outgoing = []
    try {
      const inc = await request(session, 'callHierarchy/incomingCalls', { item: rootItem })
      incoming = (Array.isArray(inc) ? inc : [])
        .slice(0, 48)
        .map((c) => {
          const mapped = mapCallHierarchyItem(session, c.from)
          if (!mapped) return null
          return {
            ...mapped,
            callCount: Array.isArray(c.fromRanges) ? c.fromRanges.length : 0,
          }
        })
        .filter(Boolean)
    } catch {
      incoming = []
    }
    try {
      const out = await request(session, 'callHierarchy/outgoingCalls', { item: rootItem })
      outgoing = (Array.isArray(out) ? out : [])
        .slice(0, 48)
        .map((c) => {
          const mapped = mapCallHierarchyItem(session, c.to)
          if (!mapped) return null
          return {
            ...mapped,
            callCount: Array.isArray(c.fromRanges) ? c.fromRanges.length : 0,
          }
        })
        .filter(Boolean)
    } catch {
      outgoing = []
    }
    return { ok: true, item, incoming, outgoing }
  })
  if (!r.ok) {
    return { ok: false, item: null, incoming: [], outgoing: [], error: r.error }
  }
  return r
}

/**
 * 打开文档以触发 publishDiagnostics，再读取缓存。
 * @param {string} root
 * @param {string[]} absFiles
 */
export async function externalLspDiagnosticsForAbsFiles(root, absFiles) {
  /** @type {Array<{ relPath: string, line: number, column: number, endLine?: number, endColumn?: number, severity: 'error' | 'warning', message: string, rule?: string | null }>} */
  const out = []
  /** @type {Map<LspLang, string[]>} */
  const byLang = new Map()
  for (const abs of absFiles) {
    const ext = path.extname(abs).toLowerCase()
    const lang = languageIdForExt(ext)
    if (!lang) continue
    if (!byLang.has(lang)) byLang.set(lang, [])
    byLang.get(lang).push(abs)
  }

  for (const [lang, files] of byLang) {
    const ensured = await ensureSession(lang)
    if (!ensured.ok) continue
    const session = ensured.session
    for (const abs of files) {
      const rel = path.relative(root, abs).replace(/\\/g, '/')
      await syncDoc(session, { relPath: rel })
    }
    // 给 publishDiagnostics 一点时间
    await new Promise((r) => setTimeout(r, 350))
    for (const abs of files) {
      const rel = path.relative(root, abs).replace(/\\/g, '/')
      const cached = session.diagnostics.get(rel) || []
      out.push(...cached)
    }
  }
  return out
}

// —— 兼容旧 Python 命名 ——
export const pythonDefinitionAt = externalLspDefinitionAt
export const pythonHoverAt = externalLspHoverAt
export const pythonCompletionsAt = externalLspCompletionsAt
export const pythonReferencesAt = externalLspReferencesAt
export const pythonRenameAt = externalLspRenameAt
