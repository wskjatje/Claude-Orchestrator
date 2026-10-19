/**
 * Host 侧 Agent 工具环。
 * 工具：code_search / read_file / search_replace / write_file / run_command / run_tests / get_diagnostics / git_status
 * 决策后端：云端 OpenAI 兼容 tools（优先）→ Ollama /api/chat
 * 写盘受 interaction-mode 约束；禁止「只口述不调工具」；写盘后强制验证。
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { loadChatSettings, loadWorkspace } from './store.mjs'
import { searchCodeIndex } from './code-index.mjs'
import { workspaceRipgrep } from './workspace-ripgrep.mjs'
import { workspaceGraphifyQuery } from './workspace-graphify-query.mjs'
import {
  workspaceRunCommand,
  workspaceRunTests,
  abortWorkspaceRunCommand,
} from './workspace-run-command.mjs'
import { updateCodeIndexForFiles } from './code-index.mjs'
import { markGraphifyNeedsUpdate } from './ensure-graphify.mjs'
import { lintWorkspaceFiles } from './workspace-lint.mjs'
import {
  maybeOffloadToolResult,
  clearStaleToolResults,
  stringifyToolResult,
} from './context-tool-results.mjs'
import { compactMessagesIfNeeded, slimPriorMessagesForApi } from './session-compact.mjs'
import {
  HOST_MAX_TURNS,
  HOST_VERIFY_EXTRA_TURNS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  PRIOR_KEEP_RECENT,
  PRIOR_MESSAGE_CHAR_CAP,
} from '../shared/context-budget.mjs'
import { DEFAULT_OLLAMA_BASE } from '../shared/defaults.mjs'

const require = createRequire(import.meta.url)
const cloudProviders = require('./cloud-providers.cjs')

const MAX_TURNS = HOST_MAX_TURNS
const VERIFY_EXTRA_TURNS = HOST_VERIFY_EXTRA_TURNS
const TOOL_NUDGE_MAX = 2

/** @type {Map<string, { cancelled: boolean }>} */
const activeHost = new Map()

export function abortHostAgent(requestId) {
  const id = String(requestId || '').trim()
  const st = id ? activeHost.get(id) : null
  if (st) st.cancelled = true
  try {
    abortWorkspaceRunCommand(id)
  } catch {
    /* ignore */
  }
  return { ok: Boolean(st) }
}

function readInteractionMode(root) {
  try {
    const p = path.join(root, '.claudecode', 'interaction-mode.json')
    if (!fs.existsSync(p)) return 'agent'
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    const m = String(j?.mode || 'agent').toLowerCase()
    if (m === 'ask' || m === 'plan' || m === 'propose' || m === 'manual') {
      return m === 'manual' || m === 'propose' ? 'plan' : m
    }
    return 'agent'
  } catch {
    return 'agent'
  }
}

/** 文本像在规划检索/读写/改码，却未发 tool_calls */
export function looksLikeToolIntent(text) {
  const t = String(text || '')
  if (!t.trim()) return false
  return /code_search|read_file|write_file|search_replace|run_tests|run_command|get_diagnostics|git_status|grep\b|ripgrep|pytest|npm\s+test|flask\s+db|我先|读取|检索|搜索|落点|限频|下一步据|三个关键|确认\s*P\d|src\/|\.py\b|\.ts\b|\.tsx\b|\.js\b|requirements\.txt|```/i.test(
    t,
  )
}

export function looksLikeEditIntent(text) {
  return /改|修|实现|添加|删除|替换|落盘|继续|迁移|限频|P1|P2|fix|implement|add|update|write|migrate|refactor|继续P/i.test(
    String(text || ''),
  )
}

/** 推销未请求的下一步 / P2 */
export function looksLikeUpsell(text) {
  return /下一步|后续可|建议继续|还可以做|未完成任务|Remaining|next\s*steps?|P2\s*[:：]|待办\s*P2/i.test(
    String(text || ''),
  )
}

/** Agent 征求确认 / 实现选择题而未落盘 */
export function looksLikeAskingConfirmation(text) {
  const t = String(text || '')
  if (!t.trim()) return false
  if (
    /要我现在落盘|要我现在改|是否现在|要不要我|可以开始吗|开始改吗|确认后我再|等你确认|请确认|请选择|memory\s*还是\s*Redis|用内存还是|是否一并|要不要一并|现在落盘吗|写盘吗[？?]|是否执行|落盘方案|实施方案/i.test(
      t,
    )
  ) {
    return true
  }
  if (/是否|还是|要不要/.test(t) && /(?:^|\n)\s*(?:[-*]|\d+[.)]、?)\s+/m.test(t)) return true
  return false
}

/**
 * 探索阶段禁止用 grep/rg/find 检索（应 code_search）。
 * 写盘后的核对性 grep（确认旧符号已删除）允许。
 * @param {string} cmd
 * @param {{ writtenPaths?: Set<string> | string[] }} [ctx]
 */
export function isShellSearchThatShouldUseCodeSearch(cmd, ctx) {
  const c = String(cmd || '').trim()
  if (!c) return false
  const written =
    ctx?.writtenPaths instanceof Set
      ? ctx.writtenPaths.size
      : Array.isArray(ctx?.writtenPaths)
        ? ctx.writtenPaths.length
        : 0
  // 已写盘后的核对 grep/rg 允许（非探索）
  if (
    written > 0 &&
    /^(grep|egrep|fgrep|rg)\b/i.test(c) &&
    !/\bfind\b/i.test(c)
  ) {
    return false
  }
  if (/^(grep|egrep|fgrep|rg|ag|ack)(\s|$)/i.test(c)) return true
  if (/\bgrep\s+-[A-Za-z0-9]*[rR]/i.test(c)) return true
  if (/^(find)\s+.+\s+-name\b/i.test(c)) return true
  return false
}

/** 长过程说明压进 thinking，流式只露短句 */
export function compressThoughtForStream(thought) {
  const t = String(thought || '').trim()
  if (!t) return ''
  const lines = t.split('\n').filter((l) => l.trim())
  if (t.length <= 140 && lines.length <= 2) return `${t}\n`
  return `\n<thinking>\n${t.slice(0, 2500)}\n</thinking>\n`
}

const FENCE_RE = /```[\w.+-]*\s*\n([\s\S]*?)```/g

/** 行数 ≥ minLines 的代码围栏数量 */
export function countLargeCodeFences(text, minLines = 12) {
  const t = String(text || '')
  let n = 0
  FENCE_RE.lastIndex = 0
  let m
  while ((m = FENCE_RE.exec(t)) !== null) {
    if (String(m[1] || '').split('\n').length >= minLines) n += 1
  }
  return n
}

/** 去掉大段代码围栏（整文件刷屏）；保留短片段 */
export function stripLargeCodeFences(text, minLines = 8) {
  const t = String(text || '')
  if (!t) return t
  const out = t.replace(/```[\w.+-]*\s*\n([\s\S]*?)```/g, (block, inner) => {
    if (String(inner || '').split('\n').length >= minLines) return ''
    return block
  })
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

/** 去掉推销段落后的紧凑收尾 */
export function stripUpsellParagraphs(text) {
  return String(text || '')
    .split('\n')
    .filter((line) => !looksLikeUpsell(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @param {{
 *   writtenPaths?: string[],
 *   verified?: boolean,
 *   content?: string,
 *   toolTrace?: Array<{ tool?: string, detail?: string, path?: string }>,
 * }} opts
 */
/** Host 工具名 → 轨迹展示名 */
function agentTraceToolLabel(raw) {
  const n = String(raw || '').trim()
  const map = {
    read_file: 'Read',
    write_file: 'Write',
    search_replace: 'Edit',
    code_search: 'Search',
    run_command: 'Bash',
    run_tests: 'Bash',
    get_diagnostics: 'Diagnostics',
    git_status: 'Bash',
  }
  return map[n] || n
}

function extractToolDetail(args) {
  if (!args || typeof args !== 'object') return ''
  const raw =
    args.path ||
    args.file_path ||
    args.query ||
    args.command ||
    args.pattern ||
    ''
  return String(raw || '').trim().slice(0, 120)
}

/**
 * Host Agent 最终正文：完整工具轨迹 + 模型收尾（不截断、不用摘要覆盖过程）。
 */
export function buildHostAgentDisplayContent(opts) {
  const paths = Array.isArray(opts.writtenPaths) ? opts.writtenPaths : []
  const raw = String(opts.content || '')
  const seen = new Set()
  const trails = []
  const pushTrail = (line) => {
    const t = String(line || '').trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    trails.push(t)
  }
  for (const l of raw.split('\n')) {
    if (/^⋯\s+\S+/.test(l.trim())) pushTrail(l.trim())
  }
  for (const t of Array.isArray(opts.toolTrace) ? opts.toolTrace : []) {
    const tool = agentTraceToolLabel(t?.tool)
    if (!tool) continue
    const detail = String(t?.detail || t?.path || extractToolDetail(t?.args) || '').trim()
    pushTrail(detail ? `⋯ ${tool} · ${detail}` : `⋯ ${tool}`)
  }
  for (const p of paths) {
    pushTrail(`⋯ Edit · ${p}`)
  }
  // 模型收尾：去掉已在轨迹里的行与推销，保留自然语言
  let prose = raw
    .split('\n')
    .filter((l) => {
      const t = l.trim()
      if (!t) return true
      if (/^⋯\s+\S+/.test(t)) return false
      if (/^（执行[：:]/.test(t) || /^Host Agent/.test(t)) return false
      if (/下一步|后续可|建议继续|还可以做|P2\s*[:：]|next\s*steps?/i.test(t)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!prose) {
    const pass = raw.match(/(\d+)\s+passed/i)?.[1]
    if (opts.verified || pass) {
      prose = pass ? `测试 ${pass} passed。` : '测试已通过。'
    }
  }
  return [...trails, ...(trails.length ? [''] : []), prose].join('\n')
}

/** @deprecated 兼容旧名；勿再用于截断过程 */
export function buildCompactAgentSummary(opts) {
  return buildHostAgentDisplayContent(opts)
}

/**
 * @param {string} content
 * @param {string} oldStr
 * @param {string} newStr
 * @param {boolean} replaceAll
 */
export function applySearchReplace(content, oldStr, newStr, replaceAll) {
  const oldS = String(oldStr ?? '')
  const newS = String(newStr ?? '')
  if (!oldS) return { ok: false, error: 'empty old_string' }
  if (!content.includes(oldS)) return { ok: false, error: 'old_string not found' }
  if (replaceAll) {
    return { ok: true, content: content.split(oldS).join(newS), replacements: content.split(oldS).length - 1 }
  }
  const i = content.indexOf(oldS)
  const j = content.indexOf(oldS, i + oldS.length)
  if (j !== -1) {
    return { ok: false, error: 'old_string not unique; pass replaceAll=true or enlarge old_string' }
  }
  return {
    ok: true,
    content: content.slice(0, i) + newS + content.slice(i + oldS.length),
    replacements: 1,
  }
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'code_search',
      description:
        'Search the workspace (semantic index + ripgrep + graph). Call this before guessing paths or proposing changes.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a text file from the workspace by relative path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          maxChars: { type: 'number' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_replace',
      description:
        'Surgical edit: replace an exact old_string with new_string in a file. Prefer over write_file for existing files. old_string must be unique unless replaceAll=true.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string' },
          new_string: { type: 'string' },
          replaceAll: { type: 'boolean' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Create or overwrite an entire text file (Ask/Plan/Agent aware). Use search_replace for partial edits to existing files.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description:
        'Run install/build/migrate/test/git commands. Do NOT use for codebase search (grep/rg/find -name) — use code_search + read_file instead. Blocked destructive commands.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string', description: 'Optional relative subdirectory' },
          timeoutMs: { type: 'number' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_tests',
      description:
        'Auto-detect and run project tests (pytest or npm test). Prefer this after edits in Agent mode. On failure, fix and re-run. Failures include lint/diagnostics for recently written files.',
      parameters: {
        type: 'object',
        properties: {
          extraArgs: { type: 'string', description: 'Optional args after pytest/npm test' },
          timeoutMs: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_diagnostics',
      description:
        'Lint / language diagnostics for given relative paths (or recently written files). Use after edits or failed tests.',
      parameters: {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Relative paths; empty = recently written files',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'git status --short and git diff --stat for the workspace. Use before summarizing changes.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

async function collectDiagnostics(paths, writtenPaths) {
  const list = (paths?.length ? paths : [...writtenPaths])
    .map((p) => String(p || '').replace(/\\/g, '/'))
    .filter(Boolean)
    .slice(0, 40)
  if (!list.length) return { ok: true, problems: [], note: 'no paths' }
  const r = await lintWorkspaceFiles(list, { mode: 'open' })
  const problems = (r.problems || []).slice(0, 40).map((p) => ({
    path: p.relPath,
    line: p.line,
    severity: p.severity,
    message: p.message,
    rule: p.rule || undefined,
  }))
  return { ok: Boolean(r.ok), problems, error: r.error }
}

const HOST_PATCH_CHAR_CAP = 120_000

function capHostPatchText(s) {
  const t = String(s ?? '')
  if (t.length <= HOST_PATCH_CHAR_CAP) return t
  return undefined
}

async function persistWrite(rel, content, ctx) {
  const { root, mode, deferredWrites, writtenPaths, filePatches } = ctx
  if (mode === 'ask') {
    return { ok: false, error: 'Ask 模式禁止写盘；请切换 Agent/Plan' }
  }
  const abs = path.resolve(root, rel)
  if (!abs.startsWith(root)) return { ok: false, error: 'path escape' }
  if (mode === 'plan' || mode === 'propose') {
    deferredWrites.push({ path: rel, content })
    writtenPaths.add(rel)
    return { ok: true, deferred: true, path: rel, note: 'Plan：已暂存待 Accept' }
  }
  let before = ''
  let isNewFile = true
  if (fs.existsSync(abs)) {
    isNewFile = false
    try {
      before = fs.readFileSync(abs, 'utf8')
    } catch {
      before = ''
    }
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content, 'utf8')
  writtenPaths.add(rel)
  if (Array.isArray(filePatches)) {
    const i = filePatches.findIndex((p) => p && p.path === rel)
    const patch = {
      path: rel,
      before: capHostPatchText(before),
      after: capHostPatchText(content),
      isNewFile,
    }
    if (i >= 0) filePatches[i] = patch
    else filePatches.push(patch)
  }
  let indexUpdate = null
  try {
    indexUpdate = await updateCodeIndexForFiles([rel])
  } catch (e) {
    indexUpdate = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  const graphUpdate = markGraphifyNeedsUpdate([rel])
  return {
    ok: true,
    written: true,
    path: rel,
    before: capHostPatchText(before),
    after: capHostPatchText(content),
    isNewFile,
    indexUpdate,
    graphUpdate,
    hint: '写盘后请 run_tests 或 run_command 验证',
  }
}

async function runTool(name, args, ctx) {
  const { root, mode, writtenPaths, readPaths } = ctx
  if (name === 'code_search') {
    const q = String(args?.query || '').trim()
    if (!q) return { ok: false, error: 'empty query' }
    const [sem, rg, graph] = await Promise.all([
      searchCodeIndex({ query: q, maxResults: 12 }),
      Promise.resolve(workspaceRipgrep({ query: q, maxResults: 16 })),
      Promise.resolve(workspaceGraphifyQuery({ query: q, budget: 1200 })),
    ])
    return {
      ok: true,
      semantic: (sem.hits || []).slice(0, 8),
      ripgrep: (rg.hits || []).slice(0, 10),
      graph: graph.ok
        ? {
            files: (graph.files || []).slice(0, 12),
            preview: (graph.markdown || '').slice(0, 1200),
            needsUpdate: Boolean(graph.needsUpdate),
          }
        : { error: graph.error || '结构索引失败' },
    }
  }
  if (name === 'read_file') {
    const rel = String(args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
    if (!rel || rel.includes('..')) return { ok: false, error: 'invalid path' }
    const abs = path.resolve(root, rel)
    if (!abs.startsWith(root)) return { ok: false, error: 'path escape' }
    if (!fs.existsSync(abs)) return { ok: false, error: 'not found' }
    const maxChars = Math.min(40_000, Math.max(2000, Number(args?.maxChars) || 16_000))
    const text = fs.readFileSync(abs, 'utf8')
    readPaths.add(rel)
    return {
      ok: true,
      path: rel,
      truncated: text.length > maxChars,
      content: text.slice(0, maxChars),
    }
  }
  if (name === 'search_replace') {
    const rel = String(args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
    if (!rel || rel.includes('..')) return { ok: false, error: 'invalid path' }
    const abs = path.resolve(root, rel)
    if (!abs.startsWith(root)) return { ok: false, error: 'path escape' }
    if (!fs.existsSync(abs)) return { ok: false, error: 'not found; use write_file to create' }
    const before = fs.readFileSync(abs, 'utf8')
    const applied = applySearchReplace(
      before,
      args?.old_string ?? args?.oldString,
      args?.new_string ?? args?.newString,
      Boolean(args?.replaceAll),
    )
    if (!applied.ok) return applied
    const saved = await persistWrite(rel, applied.content, ctx)
    if (!saved.ok) return saved
    return { ...saved, replacements: applied.replacements, via: 'search_replace' }
  }
  if (name === 'write_file') {
    const rel = String(args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
    const content = String(args?.content ?? '')
    if (!rel || rel.includes('..')) return { ok: false, error: 'invalid path' }
    return persistWrite(rel, content, ctx)
  }
  if (name === 'run_command') {
    const cmd = String(args?.command || '')
    if (isShellSearchThatShouldUseCodeSearch(cmd, ctx)) {
      return {
        ok: false,
        error: '探索阶段禁止 grep/rg/find；请用 code_search + read_file（写盘后的核对 grep 可用）',
        redirect: 'code_search',
      }
    }
    ctx.ranVerify = true
    const r = await workspaceRunCommand({
      command: args?.command,
      cwd: args?.cwd,
      timeoutMs: args?.timeoutMs,
      mode,
      runId: ctx.requestId || undefined,
    })
    if (r && r.ok === false && writtenPaths.size) {
      const diag = await collectDiagnostics([], writtenPaths)
      return { ...r, diagnostics: diag.problems }
    }
    return r
  }
  if (name === 'run_tests') {
    ctx.ranVerify = true
    const r = await workspaceRunTests({
      extraArgs: args?.extraArgs,
      timeoutMs: args?.timeoutMs,
      mode,
      runId: ctx.requestId || undefined,
    })
    if (r && r.ok === false) {
      const diag = await collectDiagnostics([], writtenPaths)
      return {
        ...r,
        diagnostics: diag.problems,
        diagnosticsNote:
          diag.problems?.length
            ? '测试失败；已附带近期写盘文件的 lint/LSP 诊断，请据此修复'
            : '测试失败；无额外诊断，请根据 output 修复',
      }
    }
    return r
  }
  if (name === 'get_diagnostics') {
    return collectDiagnostics(args?.paths, writtenPaths)
  }
  if (name === 'git_status') {
    const status = await workspaceRunCommand({
      command: 'git status --short && git diff --stat && git diff --cached --stat',
      mode: 'ask',
      timeoutMs: 30_000,
    })
    return {
      ok: status.ok !== false,
      status: String(status.output || '').slice(0, 8000),
      error: status.error,
      exitCode: status.exitCode,
    }
  }
  return { ok: false, error: `unknown tool ${name}` }
}

function parseArgs(raw) {
  if (raw && typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw || '{}'))
  } catch {
    return {}
  }
}

function extractToolCalls(message) {
  if (Array.isArray(message?.tool_calls) && message.tool_calls.length) {
    return message.tool_calls.map((tc, i) => ({
      id: tc.id || `call_${i}_${Math.random().toString(36).slice(2, 8)}`,
      name: tc.function?.name || tc.name,
      args: parseArgs(tc.function?.arguments ?? tc.arguments),
    }))
  }
  return []
}

/**
 * @returns {Promise<
 *   | { kind: 'cloud'; url: string; headers: Record<string,string>; model: string; providerName: string }
 *   | { kind: 'ollama'; base: string; model: string }
 *   | { kind: 'none'; error: string }
 * >}
 */
function resolveChatBackend(preferredModel) {
  const settings = loadChatSettings()
  const model = String(preferredModel || settings?.model || '').trim()

  if (model && model !== 'auto') {
    try {
      const resolved = cloudProviders.resolveEnvForModel(model)
      if (!resolved.error && resolved.env) {
        const apiKey = String(
          resolved.env.ANTHROPIC_API_KEY || resolved.env.ANTHROPIC_AUTH_TOKEN || '',
        ).trim()
        const directInfo = cloudProviders.supportsDirectApi(resolved.providerName)
        const isKnown = directInfo.direct && directInfo.apiBase
        const effectiveBase = isKnown
          ? String(directInfo.apiBase).replace(/\/+$/, '')
          : String(resolved.env.ANTHROPIC_BASE_URL || '').replace(/\/+$/, '')
        const isGemini =
          /generativelanguage\.googleapis/i.test(effectiveBase) ||
          resolved.providerName === 'Google Gemini'
        if (apiKey && effectiveBase && !isGemini) {
          const url = isKnown
            ? `${effectiveBase}/chat/completions`
            : `${effectiveBase}/v1/chat/completions`
          return {
            kind: 'cloud',
            url,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            model: String(resolved.model || model),
            providerName: String(resolved.providerName || ''),
          }
        }
      }
    } catch {
      /* fall through */
    }
  }

  const ollamaBase = String(settings?.ollamaBase || DEFAULT_OLLAMA_BASE).replace(/\/$/, '')
  const localPool = new Set(
    [
      ...(Array.isArray(settings?.chatEnabledLocalModels) ? settings.chatEnabledLocalModels : []),
      ...(Array.isArray(settings?.localModelCatalog) ? settings.localModelCatalog : []),
      settings?.localOllamaModel,
      settings?.localModel,
      settings?.ollamaModel,
    ]
      .map((x) => String(x || '').trim())
      .filter(Boolean),
  )
  const candidate = String(preferredModel || settings?.localOllamaModel || '').trim()
  if (!candidate) {
    return {
      kind: 'none',
      error: '未指定可用模型：请在设置中启用云端或本地模型后再试。',
    }
  }
  if (localPool.has(candidate)) {
    return { kind: 'ollama', base: ollamaBase, model: candidate }
  }
  return {
    kind: 'none',
    error: `无法解析模型「${candidate}」的执行后端（云端未就绪且不在本地启用池）。`,
  }
}

function isToolsUnsupportedError(status, errText) {
  const t = String(errText || '').toLowerCase()
  if (!t && !(status === 400 || status === 404 || status === 422 || status === 501)) return false
  return (
    /tool[_\s-]?choice|tools?\s+(are\s+)?not\s+supported|does not support\s+tools?|function.?call|unknown.*(tool|function)|invalid.*(tool|function)/i.test(
      t,
    ) ||
    ((status === 400 || status === 422 || status === 501) &&
      /\btools?\b|\bfunctions?\b/i.test(t))
  )
}

function ollamaBackendFromSettings() {
  const settings = loadChatSettings()
  const model = String(
    settings?.localOllamaModel ||
      (Array.isArray(settings?.chatEnabledLocalModels) && settings.chatEnabledLocalModels[0]) ||
      (Array.isArray(settings?.localModelCatalog) && settings.localModelCatalog[0]) ||
      '',
  ).trim()
  if (!model) {
    return {
      kind: 'none',
      error: '未配置本地模型：请在设置中启用至少一个 Ollama 模型。',
    }
  }
  return {
    kind: 'ollama',
    base: String(settings?.ollamaBase || DEFAULT_OLLAMA_BASE).replace(/\/$/, ''),
    model,
  }
}

/**
 * @param {any} backend
 * @param {any[]} messages
 * @param {{ toolChoice?: 'auto' | 'required' }} [opts]
 */
async function chatOnce(backend, messages, opts = {}) {
  const toolChoice = opts.toolChoice === 'required' ? 'required' : 'auto'
  if (backend.kind === 'cloud') {
    const res = await fetch(backend.url, {
      method: 'POST',
      headers: backend.headers,
      body: JSON.stringify({
        model: backend.model,
        messages,
        tools: TOOLS,
        tool_choice: toolChoice,
        stream: false,
      }),
      signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      // required 不被接受：降级 auto（非「完全无 tools」）
      if (
        toolChoice === 'required' &&
        (res.status === 400 || res.status === 422) &&
        !isToolsUnsupportedError(res.status, errText)
      ) {
        return chatOnce(backend, messages, { toolChoice: 'auto' })
      }
      if (isToolsUnsupportedError(res.status, errText)) {
        return {
          ok: false,
          toolsUnsupported: true,
          error: `云端模型不支持 tools（HTTP ${res.status}）：${errText.slice(0, 220)}`,
        }
      }
      return {
        ok: false,
        error: `云端 HTTP ${res.status}: ${errText.slice(0, 280)}`,
      }
    }
    const data = await res.json()
    const msg = data?.choices?.[0]?.message || {}
    return {
      ok: true,
      message: msg,
      thought: String(msg.content || '').trim(),
      toolCalls: extractToolCalls(msg),
      dialect: 'openai',
    }
  }

  const body = {
    model: backend.model,
    messages,
    tools: TOOLS,
    stream: false,
  }
  if (toolChoice === 'required') body.tool_choice = 'required'

  let res
  try {
    res = await fetch(`${backend.base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
    })
  } catch (e) {
    return {
      ok: false,
      error: `Ollama 连接失败（${backend.base} / ${backend.model}）：${
        e instanceof Error ? e.message : String(e)
      }。请启动 Ollama 或改用支持 tools 的云端模型。`,
    }
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (toolChoice === 'required' && body.tool_choice) {
      delete body.tool_choice
      const retry = await fetch(`${backend.base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
      })
      if (retry.ok) {
        const data = await retry.json()
        const msg = data?.message || {}
        return {
          ok: true,
          message: msg,
          thought: String(msg.content || '').trim(),
          toolCalls: extractToolCalls(msg),
          dialect: 'ollama',
        }
      }
    }
    if (isToolsUnsupportedError(res.status, errText)) {
      return {
        ok: false,
        toolsUnsupported: true,
        error: `Ollama 模型不支持 tools（${backend.model}）：${errText.slice(0, 200)}`,
      }
    }
    return {
      ok: false,
      error: `Ollama HTTP ${res.status}（${backend.model}）：${errText.slice(0, 200)}`,
    }
  }
  const data = await res.json()
  const msg = data?.message || {}
  return {
    ok: true,
    message: msg,
    thought: String(msg.content || '').trim(),
    toolCalls: extractToolCalls(msg),
    dialect: 'ollama',
  }
}

function pushAssistantWithTools(messages, round, dialect) {
  if (dialect === 'openai') {
    messages.push({
      role: 'assistant',
      content: round.thought || null,
      tool_calls: round.message.tool_calls,
    })
  } else {
    messages.push({
      role: 'assistant',
      content: round.thought || '',
      tool_calls: round.message.tool_calls,
    })
  }
}

function pushToolResults(messages, calls, results, dialect, workspaceRoot) {
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i]
    const result = results[i]
    const raw = stringifyToolResult(result)
    const packed = maybeOffloadToolResult(workspaceRoot, call.name, raw)
    const content = packed.content
    if (dialect === 'openai') {
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content,
      })
    } else {
      messages.push({
        role: 'tool',
        tool_name: call.name,
        content,
      })
    }
  }
  clearStaleToolResults(messages, { keepRecent: 6 })
}

function toolArgHint(call) {
  if (call.name === 'code_search') return String(call.args?.query || '').slice(0, 60)
  if (
    call.name === 'read_file' ||
    call.name === 'write_file' ||
    call.name === 'search_replace'
  ) {
    return String(call.args?.path || '')
  }
  if (call.name === 'run_command') return String(call.args?.command || '').slice(0, 80)
  if (call.name === 'run_tests') return 'auto'
  if (call.name === 'get_diagnostics') return 'lint'
  if (call.name === 'git_status') return 'git'
  return ''
}

/**
 * @param {{
 *   userLine: string,
 *   priorMessages?: Array<{ role: string, content: string }>,
 *   model?: string,
 *   maxTurns?: number,
 *   requestId?: string,
 *   contextAppendix?: string,
 *   onDelta?: (chunk: string) => void,
 *   onToolEvent?: (ev: { type: 'tool', name: string, arg?: string, path?: string, status: 'running'|'ok'|'fail', output?: string }) => void,
 * }} opts
 */
export async function runHostAgentLoop(opts) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, content: '', error: '未选择工作区' }
  const root = path.resolve(workspaceDir)
  const diskMode = readInteractionMode(root)
  // Cursor 对齐：有回合策略时优先；否则回落底栏磁盘模式
  const hasTurnGate =
    typeof opts.allowWrites === 'boolean' ||
    typeof opts.autoApplyWrites === 'boolean' ||
    Boolean(opts.readOnlyTurn)
  /** @type {string} */
  let mode = diskMode
  if (hasTurnGate) {
    const allowWrites = opts.allowWrites !== false && !opts.readOnlyTurn
    const autoApplyWrites = allowWrites && opts.autoApplyWrites === true
    if (!allowWrites) mode = 'ask'
    else if (!autoApplyWrites) mode = 'plan'
    else mode = 'agent'
  }

  const preferredModel = String(opts.model || opts.orchestratorModel || '').trim()
  let backend = resolveChatBackend(preferredModel)
  if (backend.kind === 'none') {
    return { ok: false, content: '', error: backend.error || '无可用模型后端' }
  }

  const requestId = String(opts.requestId || '').trim()
  const cancelState = { cancelled: false }
  if (requestId) activeHost.set(requestId, cancelState)
  const emit = (chunk) => {
    if (!chunk) return
    opts.onDelta?.(chunk)
  }
  const emitTool = (ev) => {
    if (!ev || typeof opts.onToolEvent !== 'function') return
    try {
      opts.onToolEvent(ev)
    } catch {
      /* ignore bridge errors */
    }
  }

  /** @type {{ path: string, content: string }[]} */
  const deferredWrites = []
  /** @type {Set<string>} */
  const writtenPaths = new Set()
  /** @type {Set<string>} */
  const readPaths = new Set()
  /** @type {Array<{ path: string, before?: string, after?: string, isNewFile?: boolean }>} */
  const filePatches = []
  const ctx = {
    root,
    mode,
    deferredWrites,
    writtenPaths,
    readPaths,
    filePatches,
    ranVerify: false,
    requestId,
  }

  const systemConstraint = String(opts.systemConstraint || '').trim()
  // 写盘/只读规则优先 systemConstraint（turn-policy 单源）；无约束时才用 mode 兜底
  const modeWriteFallback = systemConstraint
    ? ''
    : mode === 'ask'
      ? 'Ask：只读；禁止 write_file / search_replace / run_tests；run_command 仅只读探测。'
      : mode === 'plan' || mode === 'propose'
        ? 'Plan：用 search_replace / write_file 提出改动（暂存待 Accept）；可用 run_command 探测。'
        : [
            'Agent：仅当本轮用户明确要求修改时才 search_replace/write_file；纯问答禁止写盘。',
            '写盘后必须 run_tests（或针对性 run_command），再 get_diagnostics；失败则修复再测。',
            '无 Claude CLI 时本 Host 环即为完整开发路径；禁止假装已改盘。',
          ].join('')
  const system = [
    '你是工作区编码 Agent。',
    '工具顺序：code_search → read_file → search_replace|write_file → run_tests|run_command → get_diagnostics|git_status。',
    '检索必须用 code_search + read_file；禁止用 run_command 跑 grep/rg/find -name。',
    'run_command 仅用于 pip/npm、flask db、pytest、git 等。',
    '禁止在正文贴整文件或大段 ``` 代码；改动只经 search_replace/write_file。',
    '过程发现勿写成长文；工具轨迹即可。收尾用 1–3 句自然语言，勿用「改动/路径/测试/未改」模板。',
    '禁止在正文假装已执行终端/Read。探索禁用 grep；写盘后核对可用 grep。',
    '不要编造文件内容。已有文件优先 search_replace。',
    '写盘内容对齐 Cursor：先读同目录与入口；贴合已有框架；禁止模块头教学示例/双框架百科/注释墙；禁止代码内静默兜底假成功；禁止整文件注水。',
    '不允许兜底回答：无工具调用证据时禁止声称已改文件、已打开应用、已执行命令或测试通过；不确定则明确说缺证据。',
    `当前交互模式：${mode}。`,
    systemConstraint || modeWriteFallback,
    '收尾 1–3 句自然语言；禁止「改动/路径/测试/未改」模板与「下一步/P2」推销。',
  ]
    .filter(Boolean)
    .join('\n')

  const appendix = String(opts.contextAppendix || '').trim()
  const userContent = [
    String(opts.userLine || '').slice(0, 20_000),
    appendix ? `\n\n${appendix.slice(0, 6000)}` : '',
  ].join('')

  /** @type {any[]} */
  const messages = [
    { role: 'system', content: system },
    ...slimPriorMessagesForApi(opts.priorMessages || [], {
      keepRecent: PRIOR_KEEP_RECENT,
      charCap: PRIOR_MESSAGE_CHAR_CAP,
    }),
    { role: 'user', content: userContent },
  ]

  let maxTurns = Math.min(MAX_TURNS, Math.max(1, Number(opts.maxTurns) || MAX_TURNS))
  let finalText = ''
  const toolTrace = []
  let usedModel = backend.model
  let usedBackend = backend.kind
  let lastError = ''
  /** @type {string[]} */
  const backendsTried = [backend.kind === 'cloud' ? `cloud:${backend.model}` : `ollama:${backend.model}`]
  let verifyNudgeUsed = false
  let toolNudgeCount = 0
  let editNudgeUsed = false
  let confirmNudgeUsed = false
  let summaryNudgeUsed = false
  /** 下一轮强制 tool_choice=required：Agent/Plan 默认；Ask 仅当用户话含检索/改码意图 */
  let forceToolsNext =
    mode === 'agent' ||
    mode === 'plan' ||
    mode === 'propose' ||
    looksLikeToolIntent(opts.userLine) ||
    looksLikeEditIntent(opts.userLine)

  const failHost = (error, extra = {}) => {
    if (requestId) activeHost.delete(requestId)
    return {
      ok: false,
      content: '',
      error: `${error}（已试：${backendsTried.join(' → ')}）`,
      deferredWrites: [],
      writtenPaths: [...writtenPaths],
      filePatches: [...filePatches],
      toolTrace,
      mode,
      model: usedModel,
      backend: usedBackend,
      ...extra,
    }
  }

  for (let turn = 0; turn < maxTurns; turn++) {
    if (cancelState.cancelled) {
      return failHost('aborted', { aborted: true, content: '（已中止）' })
    }

    const compacted = compactMessagesIfNeeded(messages)
    if (compacted.compacted) {
      emit(
        `\n⋯ 上下文已压缩（${compacted.beforeChars}→${compacted.afterChars} 字符）…\n`,
      )
    }

    const wantRequired =
      forceToolsNext ||
      (mode === 'agent' && writtenPaths.size > 0 && !ctx.ranVerify) ||
      (mode === 'agent' &&
        editNudgeUsed &&
        writtenPaths.size === 0 &&
        looksLikeEditIntent(opts.userLine))

    let round
    try {
      round = await chatOnce(backend, messages, {
        toolChoice: wantRequired ? 'required' : 'auto',
      })
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      if (backend.kind === 'cloud') {
        const localBe = ollamaBackendFromSettings()
        if (localBe.kind === 'none') {
          return failHost(`模型不可用：${lastError}；${localBe.error}`)
        }
        backend = localBe
        usedBackend = 'ollama'
        usedModel = backend.model
        backendsTried.push(`ollama:${backend.model}`)
        try {
          round = await chatOnce(backend, messages, {
            toolChoice: wantRequired ? 'required' : 'auto',
          })
        } catch (e2) {
          return failHost(
            `模型不可用：${lastError}；Ollama：${e2 instanceof Error ? e2.message : String(e2)}`,
          )
        }
      } else {
        return failHost(`Ollama 不可用：${lastError}`)
      }
    }

    forceToolsNext = false

    if (!round.ok) {
      lastError = round.error || 'chat failed'
      const toolsUnsupported = Boolean(round.toolsUnsupported)
      if (backend.kind === 'cloud') {
        const localBe = ollamaBackendFromSettings()
        if (localBe.kind === 'none') {
          return failHost(`${lastError}；${localBe.error}`)
        }
        backend = localBe
        usedBackend = 'ollama'
        usedModel = backend.model
        backendsTried.push(
          toolsUnsupported
            ? `ollama:${backend.model}(改本地)`
            : `ollama:${backend.model}`,
        )
        emit(
          toolsUnsupported
            ? '\n⋯ 云端不支持 tools，改用本机已启用的 Ollama 模型…\n'
            : '\n⋯ 云端失败，改用本机已启用的 Ollama 模型…\n',
        )
        forceToolsNext = wantRequired
        continue
      }
      return failHost(lastError)
    }

    usedModel = backend.model
    const calls = round.toolCalls
    const thoughtRaw = round.thought
    const thought = thoughtRaw ? stripLargeCodeFences(thoughtRaw) : ''
    if (thought) {
      finalText = thought
      // 长过程进 thinking 折叠；短句才直出
      emit(compressThoughtForStream(thought))
    } else if (thoughtRaw && countLargeCodeFences(thoughtRaw) > 0) {
      emit('⋯ 已省略正文整文件代码块（请用工具写盘）…\n')
    }

    if (!calls.length) {
      // 1) 写盘未验证
      if (mode === 'agent' && writtenPaths.size > 0 && !ctx.ranVerify && !verifyNudgeUsed) {
        verifyNudgeUsed = true
        forceToolsNext = true
        maxTurns = Math.min(MAX_TURNS + VERIFY_EXTRA_TURNS, turn + 1 + VERIFY_EXTRA_TURNS)
        messages.push({
          role: 'user',
          content:
            '【系统】你已改盘但尚未验证。立即调用 run_tests（或 run_command 跑 pytest/npm test），然后 get_diagnostics。失败则结合 diagnostics 修复后再测。不要询问用户。不要只输出计划。',
        })
        emit('\n⋯ 系统催促：写盘后验证…\n')
        continue
      }

      // 2) 零工具收尾 / 口述计划 / 征求确认：强制调工具
      const needTools =
        toolTrace.length === 0 ||
        looksLikeToolIntent(thoughtRaw || thought) ||
        looksLikeAskingConfirmation(thoughtRaw || thought) ||
        (mode !== 'ask' && looksLikeEditIntent(opts.userLine) && writtenPaths.size === 0)
      if (needTools && toolNudgeCount < TOOL_NUDGE_MAX) {
        toolNudgeCount += 1
        forceToolsNext = true
        maxTurns = Math.min(MAX_TURNS + VERIFY_EXTRA_TURNS, turn + 1 + VERIFY_EXTRA_TURNS)
        messages.push({
          role: 'assistant',
          content: thought || thoughtRaw || '',
        })
        messages.push({
          role: 'user',
          content:
            mode === 'ask'
              ? '【系统】禁止只描述计划。立即用 tool calls：code_search 和/或 read_file（必要时 git_status）。禁止 grep/rg。'
              : '【系统】禁止征求确认或选择题。立即 tool calls：code_search→read_file→search_replace|write_file→run_tests。默认 memory:// 与 migrations；禁止 grep/rg 与正文大代码块。',
        })
        emit('\n⋯ 系统催促：必须调用工具…\n')
        continue
      }

      // 3) 已读未写（编辑任务）
      if (
        mode === 'agent' &&
        looksLikeEditIntent(opts.userLine) &&
        readPaths.size > 0 &&
        writtenPaths.size === 0 &&
        !editNudgeUsed
      ) {
        editNudgeUsed = true
        forceToolsNext = true
        maxTurns = Math.min(MAX_TURNS + VERIFY_EXTRA_TURNS, turn + 1 + VERIFY_EXTRA_TURNS)
        messages.push({
          role: 'user',
          content:
            '【系统】你已 read_file 但尚未改盘。立即 search_replace 或 write_file 完成用户要求的修改，然后 run_tests。禁止在正文贴整文件。禁止询问确认。',
        })
        emit('\n⋯ 系统催促：读后须写盘…\n')
        continue
      }

      // 3b) 明确征求确认且零写盘
      if (
        mode === 'agent' &&
        writtenPaths.size === 0 &&
        looksLikeAskingConfirmation(thoughtRaw || thought) &&
        !confirmNudgeUsed
      ) {
        confirmNudgeUsed = true
        forceToolsNext = true
        maxTurns = Math.min(MAX_TURNS + VERIFY_EXTRA_TURNS, turn + 1 + VERIFY_EXTRA_TURNS)
        messages.push({
          role: 'assistant',
          content: thought || thoughtRaw || '',
        })
        messages.push({
          role: 'user',
          content:
            '【系统·强制执行】禁止再问「要不要落盘 / memory 还是 Redis / 是否 db init」。立刻 search_replace 或 write_file，默认 memory://，一并 flask db init/migrate，然后 run_tests。未做项写入「未改：…」。',
        })
        emit('\n⋯ 系统催促：禁止确认，立即写盘…\n')
        continue
      }

      // 4) 整文件刷屏 / 推销下一步：强制短自然语言收尾（不再调工具）
      const bloated =
        countLargeCodeFences(thoughtRaw || thought) > 0 || looksLikeUpsell(thoughtRaw || thought)
      if (bloated && !summaryNudgeUsed && mode !== 'ask') {
        summaryNudgeUsed = true
        forceToolsNext = false
        maxTurns = Math.min(MAX_TURNS + VERIFY_EXTRA_TURNS, turn + 1 + VERIFY_EXTRA_TURNS)
        messages.push({
          role: 'assistant',
          content: thought || thoughtRaw || '',
        })
        messages.push({
          role: 'user',
          content:
            '【系统】删除整文件代码块与「下一步/P2」推销。用 1–3 句自然语言说明完成了什么与测试结果；不要「改动/路径/测试/未改」模板。不要再调用工具（除非尚未跑测且必须立刻 run_tests）。',
        })
        emit('\n⋯ 系统催促：简短收尾…\n')
        continue
      }

      if (requestId) activeHost.delete(requestId)
      return finalizeHostResult({
        ok: true,
        content: finalText || '（无输出）',
        deferredWrites,
        writtenPaths: [...writtenPaths],
        filePatches: [...filePatches],
        toolTrace,
        mode,
        model: usedModel,
        backend: usedBackend,
        verified: ctx.ranVerify,
      })
    }

    pushAssistantWithTools(messages, round, round.dialect)
    const results = []
    for (const call of calls) {
      if (cancelState.cancelled) break
      const label = agentTraceToolLabel(call.name)
      const argHint = toolArgHint(call)
      const pathHint =
        typeof call.args?.path === 'string'
          ? String(call.args.path).replace(/\\/g, '/')
          : undefined
      // Cursor：先发 running 行 + 结构化事件，再执行（边跑边见轨迹）
      emit(`\n⋯ ${label}${argHint ? ` · ${argHint}` : ''}…\n`)
      emitTool({
        type: 'tool',
        name: label,
        arg: argHint || undefined,
        path: pathHint,
        status: 'running',
      })
      const result = await runTool(call.name, call.args, ctx)
      results.push(result)
      const fail = result?.ok === false
      const output =
        call.name === 'run_command' || call.name === 'run_tests'
          ? String(result?.output || result?.error || '').slice(0, 8000)
          : undefined
      if (fail) {
        emit(`\n⋯ ${label}${argHint ? ` · ${argHint}` : ''} ✗\n`)
      }
      emitTool({
        type: 'tool',
        name: label,
        arg: argHint || undefined,
        path: pathHint,
        status: fail ? 'fail' : 'ok',
        ...(output ? { output } : {}),
      })
      toolTrace.push({
        tool: call.name,
        detail: argHint,
        path: pathHint,
        args: call.args,
        ok: !fail,
        // 供前端底栏回显 Bash（不重跑）；限长防刷屏
        output,
        exitCode:
          typeof result?.exitCode === 'number' ? result.exitCode : fail ? 1 : 0,
      })
    }
    if (cancelState.cancelled) {
      return failHost('aborted', { aborted: true, content: '（已中止）' })
    }
    pushToolResults(messages, calls, results, round.dialect, root)

    const lastTestFail = results.some(
      (r, i) =>
        (calls[i]?.name === 'run_tests' || calls[i]?.name === 'run_command') &&
        r &&
        r.ok === false &&
        typeof r.exitCode === 'number' &&
        r.exitCode !== 0,
    )
    if (lastTestFail && mode === 'agent' && turn + 3 > maxTurns) {
      maxTurns = Math.min(MAX_TURNS + VERIFY_EXTRA_TURNS, turn + 4)
    }

    /** 写盘本轮后若未跑 diagnostics，下一轮强制工具（诊断闭环） */
    const wroteThisRound = calls.some(
      (c) => c.name === 'write_file' || c.name === 'search_replace',
    )
    const ranDiag = calls.some((c) => c.name === 'get_diagnostics')
    if (wroteThisRound && !ranDiag && mode === 'agent') {
      forceToolsNext = true
    }
  }

  if (requestId) activeHost.delete(requestId)
  return finalizeHostResult({
    ok: true,
    content: finalText || '（达到工具轮次上限）',
    deferredWrites,
    writtenPaths: [...writtenPaths],
    filePatches: [...filePatches],
    toolTrace,
    mode,
    model: usedModel,
    backend: usedBackend,
    verified: ctx.ranVerify,
    truncated: true,
  })
}

function finalizeHostResult(r) {
  let content = stripUpsellParagraphs(stripLargeCodeFences(String(r.content || '')))
  const deferred = Array.isArray(r.deferredWrites) ? r.deferredWrites : []
  const writtenPaths = Array.isArray(r.writtenPaths) ? r.writtenPaths : []
  if (deferred.length && (r.mode === 'plan' || r.mode === 'propose')) {
    for (const w of deferred) {
      const fence =
        '```workspace-write\n' +
        JSON.stringify({ path: w.path, content: w.content }, null, 2) +
        '\n```'
      if (!content.includes(fence)) content = `${content}\n\n${fence}`
    }
  } else if (r.mode === 'agent') {
    // Agent：完整工具轨迹 + 模型收尾（不截断、不用摘要覆盖过程）
    content = buildHostAgentDisplayContent({
      writtenPaths,
      verified: r.verified,
      content,
      toolTrace: r.toolTrace,
    })
  }
  const tools = (r.toolTrace || []).map((t) => t.tool).filter(Boolean)
  const model = r.model ? String(r.model) : ''
  // Agent：，不在气泡尾挂执行脚注（前端 agentTurn.backend）
  const toolNote =
    r.mode === 'agent'
      ? ''
      : tools.length
        ? `\nHost · ${[...new Set(tools.map(agentTraceToolLabel))].join(' → ')}`
        : ''
  return {
    ...r,
    writtenPaths,
    content: content + toolNote,
  }
}
