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
  listOllamaModelsWithCapabilities,
  resolveModelCapabilities,
} from './model-capabilities.mjs'
import { TOOLS, TOOL_SCHEMAS, TOOL_NAMES } from './tool-registry.mjs'
import { getNativeModelAdapter } from './model-adapters.mjs'
import {
  HOST_MAX_TURNS,
  HOST_VERIFY_EXTRA_TURNS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  LOCAL_DIRECT_NUM_CTX,
  resolvePriorBudget,
} from '../shared/context-budget.mjs'
import { DEFAULT_OLLAMA_BASE } from '../shared/defaults.mjs'
import { PROJECT_DATA_DIR } from './paths.mjs'
import { connectHostMcpRuntime } from './host-mcp-runtime.mjs'
import { buildRepositoryMap } from './repository-map.mjs'
import { estimateUsageCostUsd } from './token-pricing.mjs'

const require = createRequire(import.meta.url)
const cloudProviders = require('./cloud-providers.cjs')
const projectLogs = require('./project-logs.cjs')
const toolCallProtocol = require('../shared/tool-call-protocol.cjs')
const { applyUnifiedPatch } = require('./edit-patch.cjs')
const {
  contentFingerprint,
  resolveSafeWorkspacePath,
  applyTextEdit,
  rollbackTextEdits,
} = require('./edit-engine.cjs')
const {
  captureWorkspaceCheckpoint,
  finalizeWorkspaceCheckpoint,
  restoreWorkspaceCheckpoint,
  saveWorkspaceCheckpoint,
} = require('./workspace-checkpoint.cjs')

const MAX_TURNS = HOST_MAX_TURNS
const VERIFY_EXTRA_TURNS = HOST_VERIFY_EXTRA_TURNS
const TOOL_NUDGE_MAX = 2
const VERIFY_REPAIR_MAX = 3
const DEFERRED_CONTINUE_MAX = 6
const PREWRITE_PROGRESS_MAX_TURNS = MAX_TURNS + VERIFY_EXTRA_TURNS * 6
const HOST_MUTATION_TOOLS = new Set([
  'search_replace', 'write_file', 'apply_patch', 'multi_edit', 'move_file', 'delete_file',
])

export function isHostMutationTool(name) {
  return HOST_MUTATION_TOOLS.has(String(name || ''))
}

function mutationPaths(call) {
  const args = call?.args || {}
  if (call?.name === 'move_file') return [args.from, args.to]
  if (call?.name === 'multi_edit') return (Array.isArray(args.edits) ? args.edits : []).map((item) => item?.path)
  return [args.path]
}

export function plannedTurnLimit(current, todoCount) {
  const count = Math.max(0, Math.floor(Number(todoCount) || 0))
  if (count < 5) return current
  return Math.min(MAX_TURNS + VERIFY_EXTRA_TURNS * 6, Math.max(current, count * 6 + 4))
}

export function evaluateTurnBudget({ totalTokens, costUsd, tokenLimit, costLimitUsd }) {
  const tokens = Math.max(0, Number(totalTokens) || 0)
  const cost = Math.max(0, Number(costUsd) || 0)
  const maxTokens = Math.max(0, Math.floor(Number(tokenLimit) || 0))
  const maxCost = Math.max(0, Number(costLimitUsd) || 0)
  if (maxTokens > 0 && tokens >= maxTokens) {
    return {
      exceeded: true,
      type: 'token',
      message: `本轮已达到 token 上限 ${maxTokens}（当前 ${tokens}），已停止继续调用模型。`,
    }
  }
  if (maxCost > 0 && cost >= maxCost) {
    return {
      exceeded: true,
      type: 'cost',
      message: `本轮预估费用已达到 $${maxCost.toFixed(4)} 上限（当前约 $${cost.toFixed(4)}），已停止继续调用模型。`,
    }
  }
  return { exceeded: false, type: null, message: '' }
}

/** @type {Map<string, { cancelled: boolean, controller: AbortController, cancelSource: string }>} */
const activeHost = new Map()

export function abortHostAgent(requestId, { source = '' } = {}) {
  const id = String(requestId || '').trim()
  const st = id ? activeHost.get(id) : null
  if (st) {
    st.cancelled = true
    st.cancelSource = String(source || '')
    st.controller.abort(new Error('用户已停止本轮'))
    try {
      projectLogs.appendLogEntry({
        source: 'event',
        level: 'WARN',
        message: 'agent-turn cancel requested',
        meta: { cancelSource: st.cancelSource },
      })
    } catch {
      // 取消日志失败不得阻塞显式停止。
    }
  }
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
  return /code_search|read_file|list_dir|glob|todo_write|write_file|search_replace|apply_patch|multi_edit|move_file|delete_file|run_tests|run_command|get_diagnostics|git_status|grep\b|ripgrep|pytest|npm\s+test|flask\s+db|我先|读取|检索|搜索|落点|限频|下一步据|三个关键|确认\s*P\d|src\/|\.py\b|\.ts\b|\.tsx\b|\.js\b|requirements\.txt|```/i.test(
    t,
  )
}

export function looksLikeEditIntent(text) {
  return /改|修|实现|添加|删除|替换|落盘|继续|迁移|限频|P1|P2|fix|implement|add|update|write|migrate|refactor|继续P/i.test(
    String(text || ''),
  )
}

/**
 * code_search 的结构检索可能为空，而语义索引仍能找到真实引用文件。
 * 任务闭合必须保留两类落点，但在要求修改前仍会读取文件并校验旧引用是否真实存在。
 */
export function codeSearchResultPaths(result) {
  const values = [
    ...(Array.isArray(result?.ripgrep) ? result.ripgrep : []),
    ...(Array.isArray(result?.semantic) ? result.semantic : []),
    ...(Array.isArray(result?.graph?.files) ? result.graph.files : []),
  ]
  return [...new Set(values.map((hit) => {
    const raw = typeof hit === 'string' ? hit : String(hit?.relPath || hit?.path || hit?.file || '')
    return raw.replace(/^\.\//, '').replace(/\\/g, '/')
  }).filter(Boolean))]
}

/** 只有真正的测试/构建/静态检查命令，或用户明确要求的原命令，才能决定写入事务成败。 */
export function isVerificationCommand(command, userLine = '') {
  const cmd = String(command || '').trim()
  if (!cmd) return false
  if (
    /^(?:npm|pnpm|yarn|bun)\s+(?:test|run\s+(?:test|build|lint|typecheck|check))\b/i.test(cmd) ||
    /^(?:node\s+(?:--test\b|[^\s]*test[^\s]*\.m?js\b)|pytest\b|python(?:3)?\s+-m\s+pytest\b|cargo\s+test\b|go\s+test\b|(?:\.\/)?mvnw?\s+test\b|(?:\.\/)?gradlew?\s+test\b|make\s+test\b|npx\s+(?:vitest|jest|mocha|tsc|eslint|pyright)\b|tsc\b|eslint\b|pyright\b)/i.test(cmd)
  ) {
    return true
  }
  const line = String(userLine || '')
  return line.includes(cmd) && /(?:运行|执行|测试|验证|\brun\b|\btest\b|\bverify\b)/i.test(line)
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
    list_dir: 'List',
    glob: 'Glob',
    write_file: 'Write',
    search_replace: 'Edit',
    apply_patch: 'Edit',
    multi_edit: 'Edit',
    move_file: 'Move',
    delete_file: 'Delete',
    todo_write: 'Todo',
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

function globPatternToRegExp(pattern) {
  const value = String(pattern || '').replace(/\\/g, '/').replace(/^\.\//, '')
  let source = '^'
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '*' && value[index + 1] === '*') {
      if (value[index + 2] === '/') {
        source += '(?:.*/)?'
        index += 2
      } else {
        source += '.*'
        index += 1
      }
    } else if (char === '*') source += '[^/]*'
    else if (char === '?') source += '[^/]'
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`${source}$`)
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
  if (content.includes(oldS)) {
    if (replaceAll) {
      return {
        ok: true,
        content: content.split(oldS).join(newS),
        replacements: content.split(oldS).length - 1,
        strategy: 'exact',
      }
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
      strategy: 'exact',
    }
  }

  // 模型可能直接复制 read_file 的“行号 │ 代码”。只剥离明确的读取 gutter，
  // 不进行任意字符模糊匹配；新旧文本同步处理，避免把行号写回源码。
  const stripReadGutters = (value) => String(value || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\s*[│|]\s?/, ''))
    .join('\n')
  const gutterlessOld = stripReadGutters(oldS)
  if (gutterlessOld && gutterlessOld !== oldS) {
    const gutterResult = applySearchReplace(
      content,
      gutterlessOld,
      stripReadGutters(newS),
      replaceAll,
    )
    if (gutterResult.ok) {
      return {
        ...gutterResult,
        strategy: `read-gutter-${gutterResult.strategy}`,
      }
    }
  }

  // 部分本地模型会在工具参数中把 JS 模板占位符 `${name}` 损坏为 `$ name`。
  // 仅当新旧占位符变量序列完全一致且内容候选唯一时修复，并复用文件中的合法语法。
  const templateTokenRe = /\$\s*(?:\{\s*)?([A-Za-z_$][\w$]*)(?:\s*\})?/g
  const splitTemplateish = (value) => {
    const text = String(value || '')
    const literals = []
    const names = []
    let cursor = 0
    templateTokenRe.lastIndex = 0
    for (let match = templateTokenRe.exec(text); match; match = templateTokenRe.exec(text)) {
      literals.push(text.slice(cursor, match.index))
      names.push(match[1])
      cursor = match.index + match[0].length
    }
    literals.push(text.slice(cursor))
    return { literals, names }
  }
  const oldTemplate = splitTemplateish(oldS)
  const newTemplate = splitTemplateish(newS)
  if (
    oldTemplate.names.length > 0 &&
    oldTemplate.names.length === newTemplate.names.length &&
    oldTemplate.names.every((name, index) => name === newTemplate.names[index])
  ) {
    const escapeRegex = (value) => String(value || '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+')
    let source = ''
    for (let index = 0; index < oldTemplate.names.length; index += 1) {
      source += escapeRegex(oldTemplate.literals[index])
      source += `(\\$\\s*(?:\\{\\s*)?${escapeRegex(oldTemplate.names[index])}(?:\\s*\\})?)`
    }
    source += escapeRegex(oldTemplate.literals[oldTemplate.literals.length - 1])
    const templateRegex = new RegExp(source, 'g')
    const templateMatches = [...content.matchAll(templateRegex)]
    if (templateMatches.length && (replaceAll || templateMatches.length === 1)) {
      const selected = replaceAll ? templateMatches : [templateMatches[0]]
      let output = content
      for (const match of [...selected].reverse()) {
        let replacement = ''
        for (let index = 0; index < newTemplate.names.length; index += 1) {
          replacement += newTemplate.literals[index]
          replacement += match[index + 1]
        }
        replacement += newTemplate.literals[newTemplate.literals.length - 1]
        output = output.slice(0, match.index) + replacement + output.slice(match.index + match[0].length)
      }
      return {
        ok: true,
        content: output,
        replacements: selected.length,
        strategy: 'template-placeholder',
      }
    }
    if (templateMatches.length > 1) {
      return {
        ok: false,
        error: 'old_string template-placeholder match is not unique; enlarge old_string',
      }
    }
  }

  // Cursor 式第二级回退：仅放宽空格/缩进/换行，不做字符级模糊猜测。
  const normalizedOld = oldS.trim().replace(/\s+/g, ' ')
  const normalized = []
  const starts = []
  const ends = []
  let inWhitespace = false
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (/\s/.test(char)) {
      if (!normalized.length) continue
      if (!inWhitespace) {
        normalized.push(' ')
        starts.push(index)
        ends.push(index + 1)
        inWhitespace = true
      } else {
        ends[ends.length - 1] = index + 1
      }
      continue
    }
    normalized.push(char)
    starts.push(index)
    ends.push(index + 1)
    inWhitespace = false
  }
  if (normalized[normalized.length - 1] === ' ') {
    normalized.pop()
    starts.pop()
    ends.pop()
  }
  const normalizedContent = normalized.join('')
  const matches = []
  if (normalizedOld) {
    let from = 0
    while (from <= normalizedContent.length - normalizedOld.length) {
      const found = normalizedContent.indexOf(normalizedOld, from)
      if (found < 0) break
      matches.push({
        start: starts[found],
        end: ends[found + normalizedOld.length - 1],
      })
      from = found + normalizedOld.length
    }
  }
  if (matches.length && (replaceAll || matches.length === 1)) {
    let output = content
    const selected = replaceAll ? matches : [matches[0]]
    for (const match of [...selected].reverse()) {
      output = output.slice(0, match.start) + newS + output.slice(match.end)
    }
    return {
      ok: true,
      content: output,
      replacements: selected.length,
      strategy: 'whitespace-normalized',
    }
  }

  if (matches.length > 1) {
    return {
      ok: false,
      error: 'old_string whitespace-normalized match is not unique; enlarge old_string',
      candidates: matches.slice(0, 5),
    }
  }

  // 第三级回退：长代码块允许“首尾行锚定 + 中间至多一行漂移”。
  // 只接受唯一高置信窗口，避免像普通模糊替换一样误改相似函数。
  const normalizeLine = (line) => String(line || '').trim().replace(/\s+/g, ' ')
  const oldLines = oldS.replace(/\r\n/g, '\n').split('\n')
  const contentLines = content.replace(/\r\n/g, '\n').split('\n')
  if (oldLines.length >= 3 && contentLines.length >= oldLines.length) {
    const wanted = oldLines.map(normalizeLine)
    const anchored = []
    for (let line = 0; line <= contentLines.length - wanted.length; line += 1) {
      const window = contentLines.slice(line, line + wanted.length).map(normalizeLine)
      if (window[0] !== wanted[0] || window[window.length - 1] !== wanted[wanted.length - 1]) {
        continue
      }
      const equalCount = window.reduce(
        (count, value, index) => count + (value === wanted[index] ? 1 : 0),
        0,
      )
      if (equalCount < wanted.length - 1) continue
      const start = contentLines.slice(0, line).reduce((sum, value) => sum + value.length + 1, 0)
      const span = contentLines
        .slice(line, line + wanted.length)
        .reduce((sum, value, index) => sum + value.length + (index ? 1 : 0), 0)
      anchored.push({ start, end: start + span, line: line + 1, equalCount })
    }
    if (anchored.length === 1) {
      const match = anchored[0]
      return {
        ok: true,
        content: content.slice(0, match.start) + newS + content.slice(match.end),
        replacements: 1,
        strategy: 'line-anchor',
        anchorLine: match.line,
      }
    }
    if (anchored.length > 1) {
      return {
        ok: false,
        error: 'old_string line-anchor match is not unique; enlarge old_string',
        candidates: anchored.slice(0, 5).map((item) => ({ line: item.line })),
      }
    }
  }
  const firstAnchor = oldS.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || ''
  const lines = content.split(/\r?\n/)
  const anchorLine = firstAnchor
    ? lines.findIndex((line) => line.includes(firstAnchor) || firstAnchor.includes(line.trim()))
    : -1
  const nearest = anchorLine >= 0
    ? lines.slice(Math.max(0, anchorLine - 2), anchorLine + 3).join('\n').slice(0, 1200)
    : ''
  return {
    ok: false,
    error: nearest
      ? `old_string not found; nearest lines around ${anchorLine + 1}:\n${nearest}`
      : 'old_string not found',
  }
}

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

const HOST_PATCH_PREVIEW_CHAR_CAP = 120_000
const HOST_ROLLBACK_SNAPSHOT_CHAR_CAP = 8_000_000

function hostPatchPreview(before, after) {
  const left = String(before ?? '')
  const right = String(after ?? '')
  if (left.length <= HOST_PATCH_PREVIEW_CHAR_CAP && right.length <= HOST_PATCH_PREVIEW_CHAR_CAP) {
    return { before: left, after: right, beforeTruncated: false, afterTruncated: false }
  }

  let prefix = 0
  const commonLimit = Math.min(left.length, right.length)
  while (prefix < commonLimit && left.charCodeAt(prefix) === right.charCodeAt(prefix)) prefix += 1
  let suffix = 0
  while (
    suffix < left.length - prefix &&
    suffix < right.length - prefix &&
    left.charCodeAt(left.length - suffix - 1) === right.charCodeAt(right.length - suffix - 1)
  ) suffix += 1

  let start = Math.max(0, prefix - 2_000)
  const newline = left.lastIndexOf('\n', start)
  if (newline >= 0) start = newline + 1
  const leftEnd = Math.min(left.length, left.length - suffix + 2_000)
  const rightEnd = Math.min(right.length, right.length - suffix + 2_000)
  const beforeEnd = Math.min(leftEnd, start + HOST_PATCH_PREVIEW_CHAR_CAP)
  const afterEnd = Math.min(rightEnd, start + HOST_PATCH_PREVIEW_CHAR_CAP)
  const omittedBefore = start > 0 ? `…（前文省略，约 ${start} 字符）…\n` : ''
  const omittedAfter = (end, total) => end < total ? `\n…（后文省略，约 ${total - end} 字符）…` : ''
  return {
    before: omittedBefore + left.slice(start, beforeEnd) + omittedAfter(beforeEnd, left.length),
    after: omittedBefore + right.slice(start, afterEnd) + omittedAfter(afterEnd, right.length),
    beforeTruncated: start > 0 || beforeEnd < left.length,
    afterTruncated: start > 0 || afterEnd < right.length,
  }
}

function resolveSafeHostPath(root, rel) {
  return resolveSafeWorkspacePath(root, rel, { normalizeModelPaths: false })
}

function verificationFailureWorkspacePaths(output, root, limit = 3) {
  let text = String(output || '').replace(/file:\/\//g, '')
  try { text = decodeURIComponent(text) } catch { /* keep raw stack */ }
  const normalizedRoot = String(root || '').replace(/\\/g, '/').replace(/\/$/, '')
  if (!normalizedRoot) return []
  const found = []
  for (const line of text.replace(/\\/g, '/').split('\n')) {
    const marker = `${normalizedRoot}/`
    const index = line.indexOf(marker)
    if (index < 0) continue
    const tail = line.slice(index + marker.length)
    const match = tail.match(/^([^:\s)]+)/)
    const rel = String(match?.[1] || '').replace(/^[/\\]+/, '')
    if (!rel || rel.includes('..') || found.includes(rel)) continue
    const abs = resolveSafeHostPath(root, rel)
    if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue
    found.push(rel)
    if (found.length >= limit) break
  }
  return found
}

function verificationRepairHint(output, root) {
  const text = String(output || '')
  const hints = []
  if (/require is not defined in ES module scope/i.test(text)) {
    hints.push('项目是 ESM（package.json 含 `"type":"module"`）：必须使用 `import`，不得使用 `require`。')
  }
  if (/does not provide an export named ['"]default['"]/i.test(text)) {
    hints.push('被测模块没有默认导出：读取它的真实源码，改用与 `export function/class/const` 一致的命名导入。')
  }
  if (/\bt\.equal is not a function/i.test(text)) {
    hints.push("Node `node:test` 的 TestContext 没有 `t.equal`；请使用 `import assert from 'node:assert/strict'` 并调用 `assert.equal(actual, expected)`。")
  }
  if (!/(?:describe|it|test|jest) is not defined/i.test(text)) {
    return hints.length ? `确定性修复提示：\n${hints.join('\n')}` : ''
  }
  try {
    const packagePath = path.join(root, 'package.json')
    if (!fs.existsSync(packagePath)) return ''
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const testScript = String(pkg?.scripts?.test || '')
    if (!/node\s+--test\b/.test(testScript)) return ''
    hints.push(
      '项目使用 Node 原生 `node --test`，不提供 Jest 全局变量。',
      "请显式 `import test from 'node:test'` 和 `import assert from 'node:assert/strict'`，用 `test(...)` + `assert.equal(...)`；禁止使用 `describe`、`jest.describe` 或自定义 Jest 兼容层。",
    )
    return `确定性修复提示：\n${hints.join('\n')}`
  } catch {
    return hints.length ? `确定性修复提示：\n${hints.join('\n')}` : ''
  }
}

/**
 * 将“安装某依赖并在指定源码中使用”作为一个不可拆开的任务条件。
 * 仅有 package.json/package-lock 变化不代表任务完成，避免安装命令成功后过早收尾。
 */
export function dependencyTaskObligation({ userLine, root, toolTrace = [] }) {
  const line = String(userLine || '')
  const match = line.match(/(?:安装|install|add)\s+([@A-Za-z0-9][@A-Za-z0-9._/-]*)/i)
  const dependency = String(match?.[1] || '').trim()
  if (!dependency) return null

  const packagePath = path.join(root, 'package.json')
  let manifestHasDependency = false
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    manifestHasDependency = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
      .some((field) => Object.prototype.hasOwnProperty.call(pkg?.[field] || {}, dependency))
  } catch {
    manifestHasDependency = false
  }
  const installCommandSucceeded = toolTrace.some((item) =>
    item?.tool === 'run_command' &&
    item?.ok !== false &&
    /(?:npm\s+(?:i|install)|pnpm\s+add|yarn\s+add|bun\s+add)\b/i.test(String(item?.detail || '')) &&
    String(item?.detail || '').includes(dependency),
  )
  if (!manifestHasDependency) {
    return {
      type: installCommandSucceeded ? 'dependency-manifest' : 'dependency-install',
      message: installCommandSucceeded
        ? `依赖安装命令已运行，但 package.json 尚未记录 ${dependency}。请用会更新清单的安装命令重新安装并确认成功。`
        : `用户要求安装 ${dependency}，但 package.json 尚未记录该依赖。立即用 run_command 执行 \`npm install ${dependency}\`。`,
      contextPaths: fs.existsSync(packagePath) ? ['package.json'] : [],
    }
  }

  const sourcePaths = [...new Set(line.match(
    /\b(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.(?:[cm]?[jt]sx?|py|go|rs|java|rb|php)\b/gi,
  ) || [])]
    .map((rel) => rel.replace(/^\.\//, ''))
    .filter((rel) => {
      const abs = resolveSafeHostPath(root, rel)
      return Boolean(abs && fs.existsSync(abs) && fs.statSync(abs).isFile())
    })
  const missingUsage = sourcePaths.filter((rel) => {
    const abs = resolveSafeHostPath(root, rel)
    return !fs.readFileSync(abs, 'utf8').includes(dependency)
  })
  if (missingUsage.length) {
    return {
      type: 'dependency-use',
      message: `依赖 ${dependency} 已安装，但尚未在用户指定的 ${missingUsage.join('、')} 中导入并使用。请读取这些文件并完成源码修改。`,
      contextPaths: missingUsage,
    }
  }
  return null
}

/**
 * 自动修复仍未通过时，只恢复本轮由 Host 写入且未被外部再次改动的文件。
 * @param {{ root: string, rollbackSnapshots?: Map<string, any>, readSnapshots?: Map<string, string> }} ctx
 */
async function rollbackHostWrites(ctx) {
  let result
  if (ctx.turnCheckpoint?.ok) {
    const finalized = finalizeWorkspaceCheckpoint(ctx.turnCheckpoint, {
      extraPaths: [...(ctx.writtenPaths || [])],
    })
    result = finalized.ok
      ? restoreWorkspaceCheckpoint(finalized)
      : { restored: [], failed: [{ path: '', error: finalized.error || '回合检查点不可用' }] }
  } else {
    result = rollbackTextEdits({
      workspaceRoot: ctx.root,
      snapshots: ctx.rollbackSnapshots,
    })
  }
  const { restored, failed } = result
  for (const rel of restored) {
    const snapshot = ctx.rollbackSnapshots?.get(rel)
    if (snapshot?.isNewFile) ctx.readSnapshots?.delete(rel)
    else ctx.readSnapshots?.set(rel, contentFingerprint(snapshot?.before ?? ''))
  }
  if (restored.length) {
    try { await updateCodeIndexForFiles(restored) } catch { /* next search can rebuild */ }
    markGraphifyNeedsUpdate(restored)
  }
  return { restored, failed }
}

function ensureTurnCheckpoint(ctx) {
  if (ctx.mode !== 'agent') return { ok: true, skipped: true }
  if (ctx.turnCheckpoint) return ctx.turnCheckpoint
  ctx.turnCheckpoint = captureWorkspaceCheckpoint({
    workspaceRoot: ctx.root,
    id: ctx.requestId || undefined,
  })
  return ctx.turnCheckpoint
}

function syncCommandChanges(ctx) {
  if (!ctx.turnCheckpoint?.ok) return { ok: true, paths: [] }
  const finalized = finalizeWorkspaceCheckpoint(ctx.turnCheckpoint, {
    extraPaths: [...ctx.writtenPaths],
  })
  if (!finalized.ok) return finalized
  const paths = finalized.changes.map((change) => change.path)
  for (const rel of paths) ctx.writtenPaths.add(rel)
  ctx.commandChangedPaths = new Set(paths)
  return { ok: true, paths }
}

function persistTurnCheckpoint(ctx) {
  if (!ctx.turnCheckpoint?.ok) return null
  const finalized = finalizeWorkspaceCheckpoint(ctx.turnCheckpoint, {
    extraPaths: [...ctx.writtenPaths],
  })
  if (!finalized.ok || !finalized.changes.length) return null
  const saved = saveWorkspaceCheckpoint(PROJECT_DATA_DIR, finalized)
  return saved?.saved ? saved.id : null
}

async function persistWrite(rel, content, ctx, expectedFingerprint = null) {
  const {
    root,
    mode,
    deferredWrites,
    writtenPaths,
    filePatches,
    readSnapshots,
    rollbackSnapshots,
  } = ctx
  if (mode === 'ask') {
    return { ok: false, error: 'Ask 模式禁止写盘；请切换 Agent/Plan' }
  }
  if (mode === 'plan' || mode === 'propose') {
    deferredWrites.push({ path: rel, content })
    writtenPaths.add(rel)
    return { ok: true, deferred: true, path: rel, note: 'Plan：已暂存待 Accept' }
  }
  const checkpoint = ensureTurnCheckpoint(ctx)
  if (!checkpoint.ok) return { ok: false, error: checkpoint.error }
  const abs = resolveSafeHostPath(root, rel)
  if (!abs) return { ok: false, error: 'path escape or symlink outside workspace' }
  let before = ''
  if (fs.existsSync(abs)) {
    try { before = fs.readFileSync(abs, 'utf8') }
    catch { return { ok: false, error: `无法读取「${rel}」的写前快照；为保证可撤销，本轮未覆盖该文件。` } }
  }
  const observedFingerprint = contentFingerprint(before)
  const expectedSnapshot = readSnapshots?.get(rel)
  if (
    (expectedFingerprint && expectedFingerprint !== observedFingerprint) ||
    (expectedSnapshot && expectedSnapshot !== observedFingerprint)
  ) {
    return {
      ok: false,
      conflict: true,
      error: `文件「${rel}」在读取后已被其他操作修改；为避免覆盖新内容，请重新读取并重新应用修改。`,
    }
  }
  const saved = applyTextEdit({
    workspaceRoot: root,
    path: rel,
    content,
    expectedFingerprint: observedFingerprint,
    snapshotCharCap: HOST_ROLLBACK_SNAPSHOT_CHAR_CAP,
    normalizeModelPaths: false,
  })
  if (!saved.ok) return saved
  const { isNewFile, originalMode } = saved
  if (rollbackSnapshots instanceof Map) {
    const existingSnapshot = rollbackSnapshots.get(rel)
    rollbackSnapshots.set(rel, {
      before: existingSnapshot?.before ?? before,
      isNewFile: existingSnapshot?.isNewFile ?? isNewFile,
      originalMode: existingSnapshot?.originalMode ?? originalMode,
      lastWrittenFingerprint: contentFingerprint(content),
    })
  }
  writtenPaths.add(rel)
  ctx.writeRevision = Number(ctx.writeRevision || 0) + 1
  ctx.ranVerify = false
  ctx.verificationPassed = false
  ctx.lastVerificationOutput = ''
  readSnapshots?.set(rel, contentFingerprint(content))
  if (Array.isArray(filePatches)) {
    const i = filePatches.findIndex((p) => p && p.path === rel)
    const preview = hostPatchPreview(before, content)
    const checkpointBefore = i >= 0
      ? filePatches[i].checkpointBefore
      : (isNewFile ? '' : before)
    const patch = {
      path: rel,
      ...preview,
      checkpointBefore,
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
    ...hostPatchPreview(before, content),
    isNewFile,
    indexUpdate,
    graphUpdate,
    hint: '写盘后请 run_tests 或 run_command 验证',
  }
}

export async function runTool(name, args, ctx) {
  const { root, mode, writtenPaths, readPaths, filePatches } = ctx
  if (ctx.mcpRuntime?.routes?.has(name)) {
    return ctx.mcpRuntime.call(name, args, ctx.requestSignal)
  }
  if (name === 'code_search') {
    const q = String(args?.query || '').trim()
    if (!q) return { ok: false, error: 'empty query' }
    const [sem, rg, graph] = await Promise.all([
      searchCodeIndex({ query: q, maxResults: 12 }),
      Promise.resolve(workspaceRipgrep({ query: q, maxResults: 16 })),
      Promise.resolve(workspaceGraphifyQuery({ query: q, budget: 1200 })),
    ])
    const result = {
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
    // 记住精确标识符检索的全部落点，用于写入事务收尾前检查跨文件重命名是否遗漏。
    const resultPaths = codeSearchResultPaths(result)
    if (/^[A-Za-z_$][\w$]*$/.test(q) && ctx.identifierSearches instanceof Map) {
      const paths = resultPaths
      if (paths.length) ctx.identifierSearches.set(q, paths)
    }
    if (ctx.codeSearches instanceof Map) {
      ctx.codeSearches.set(q, resultPaths)
    }
    if (ctx.codeSearchResults instanceof Map) ctx.codeSearchResults.set(q, result)
    if (ctx.codeSearchCounts instanceof Map) {
      ctx.codeSearchCounts.set(q, (ctx.codeSearchCounts.get(q) || 0) + 1)
    }
    return result
  }
  if (name === 'read_file') {
    const rel = String(args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
    if (!rel || rel.includes('..')) return { ok: false, error: 'invalid path' }
    const abs = resolveSafeHostPath(root, rel)
    if (!abs) return { ok: false, error: 'path escape or symlink outside workspace' }
    if (!fs.existsSync(abs)) return { ok: false, error: 'not found' }
    const readBudget = Math.min(40_000, Math.max(2_000, Number(ctx.readMaxChars) || 16_000))
    const requestedMax = Number(args?.maxChars)
    const maxChars = Math.min(
      readBudget,
      Math.max(2_000, Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : readBudget),
    )
    const offset = Math.max(0, Math.floor(Number(args?.offset) || 0))
    const limit = Math.min(1000, Math.max(1, Math.floor(Number(args?.limit) || 200)))
    const text = fs.readFileSync(abs, 'utf8')
    ctx.readSnapshots?.set(rel, contentFingerprint(text))
    const allLines = text.split(/\r?\n/)
    const page = []
    let chars = 0
    let nextOffset = offset
    let lineTruncated = false
    for (; nextOffset < allLines.length && page.length < limit; nextOffset += 1) {
      const rendered = `${String(nextOffset + 1).padStart(5, ' ')} │ ${allLines[nextOffset]}`
      if (!page.length && rendered.length > maxChars) {
        page.push(rendered.slice(0, maxChars))
        lineTruncated = true
        nextOffset += 1
        break
      }
      if (page.length && chars + rendered.length + 1 > maxChars) break
      page.push(rendered)
      chars += rendered.length + 1
    }
    readPaths.add(rel)
    ctx.readCoverage?.set(rel, {
      full: offset === 0 && !lineTruncated && nextOffset >= allLines.length,
      truncated: lineTruncated || nextOffset < allLines.length,
      offset,
      nextOffset: nextOffset < allLines.length ? nextOffset : null,
      lineCount: allLines.length,
    })
    return {
      ok: true,
      path: rel,
      offset,
      lineCount: allLines.length,
      lineTruncated,
      nextOffset: nextOffset < allLines.length ? nextOffset : null,
      truncated: lineTruncated || nextOffset < allLines.length,
      content: page.join('\n'),
    }
  }
  if (name === 'list_dir') {
    const rel = String(args?.path || '.').replace(/^[/\\]+/, '').replace(/\\/g, '/') || '.'
    if (rel.includes('..')) return { ok: false, error: 'invalid path' }
    const abs = resolveSafeHostPath(root, rel)
    if (!abs) return { ok: false, error: 'path escape or symlink outside workspace' }
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      return { ok: false, error: 'directory not found' }
    }
    const limit = Math.min(1000, Math.max(1, Math.floor(Number(args?.limit) || 200)))
    const all = fs.readdirSync(abs, { withFileTypes: true })
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    const entries = all.slice(0, limit).map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
    }))
    return { ok: true, path: rel, entries, truncated: all.length > entries.length }
  }
  if (name === 'glob') {
    const pattern = String(args?.pattern || '').trim().replace(/\\/g, '/')
    const rel = String(args?.path || '.').replace(/^[/\\]+/, '').replace(/\\/g, '/') || '.'
    if (!pattern || pattern.includes('..') || rel.includes('..')) return { ok: false, error: 'invalid glob' }
    const abs = resolveSafeHostPath(root, rel)
    if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      return { ok: false, error: 'start directory not found or unsafe' }
    }
    const matcher = globPatternToRegExp(pattern)
    const limit = Math.min(1000, Math.max(1, Math.floor(Number(args?.limit) || 200)))
    const matches = []
    const rootForRelative = fs.realpathSync(root)
    const excluded = new Set(['.git', 'node_modules', '.claudecode', 'dist', 'build', 'coverage'])
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (matches.length >= limit) return
        if (entry.isDirectory() && excluded.has(entry.name)) continue
        if (entry.isSymbolicLink()) continue
        const child = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(child)
        else if (entry.isFile()) {
          const workspaceRel = path.relative(rootForRelative, child).replace(/\\/g, '/')
          const startRel = path.relative(abs, child).replace(/\\/g, '/')
          if (matcher.test(workspaceRel) || matcher.test(startRel)) matches.push(workspaceRel)
        }
      }
    }
    walk(abs)
    return { ok: true, pattern, matches, truncated: matches.length >= limit }
  }
  if (name === 'search_replace') {
    const rel = String(args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
    if (!rel || rel.includes('..')) return { ok: false, error: 'invalid path' }
    const abs = resolveSafeHostPath(root, rel)
    if (!abs) return { ok: false, error: 'path escape or symlink outside workspace' }
    if (!fs.existsSync(abs)) return { ok: false, error: 'not found; use write_file to create' }
    const before = fs.readFileSync(abs, 'utf8')
    const oldString = String(args?.old_string ?? args?.oldString ?? '')
    const newString = String(args?.new_string ?? args?.newString ?? '')
    const exactIdentifierRename =
      !args?.replaceAll &&
      /^[A-Za-z_$][\w$]*$/.test(oldString) &&
      /^[A-Za-z_$][\w$]*$/.test(newString) &&
      ctx.identifierSearches instanceof Map &&
      ctx.identifierSearches.has(oldString)
    const applied = applySearchReplace(
      before,
      oldString,
      newString,
      Boolean(args?.replaceAll) || exactIdentifierRename,
    )
    if (!applied.ok) return applied
    const saved = await persistWrite(rel, applied.content, ctx, contentFingerprint(before))
    if (!saved.ok) return saved
    return {
      ...saved,
      replacements: applied.replacements,
      strategy: exactIdentifierRename && applied.replacements > 1
        ? 'identifier-rename-all'
        : applied.strategy,
      via: 'search_replace',
    }
  }
  if (name === 'write_file') {
    const rel = String(args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
    const content = String(args?.content ?? '')
    if (!rel || rel.includes('..')) return { ok: false, error: 'invalid path' }
    const abs = resolveSafeHostPath(root, rel)
    if (!abs) return { ok: false, error: 'path escape or symlink outside workspace' }
    if (fs.existsSync(abs)) {
      const before = fs.readFileSync(abs, 'utf8')
      const coverage = ctx.readCoverage?.get(rel)
      const largeExistingFile =
        before.length > Math.max(4_000, Number(ctx.readMaxChars) || 16_000) ||
        before.split(/\r?\n/).length > 1_000
      if (largeExistingFile || coverage?.truncated) {
        return {
          ok: false,
          preserveExisting: true,
          error: `文件「${rel}」未被完整读取或体积较大，禁止用 write_file 整体覆盖，以免丢失未读内容。请使用 search_replace 或 apply_patch 做局部修改。`,
        }
      }
    }
    return persistWrite(rel, content, ctx)
  }
  if (name === 'apply_patch') {
    const rel = String(args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
    if (!rel || rel.includes('..')) return { ok: false, error: 'invalid path' }
    const abs = resolveSafeHostPath(root, rel)
    if (!abs || !fs.existsSync(abs)) return { ok: false, error: 'not found' }
    const before = fs.readFileSync(abs, 'utf8')
    const patched = applyUnifiedPatch(before, args?.patch)
    if (!patched.ok) return patched
    const saved = await persistWrite(rel, patched.content, ctx, contentFingerprint(before))
    return saved.ok ? { ...saved, hunks: patched.hunks, via: 'apply_patch' } : saved
  }
  if (name === 'multi_edit') {
    const edits = Array.isArray(args?.edits) ? args.edits.slice(0, 40) : []
    if (!edits.length) return { ok: false, error: 'edits must be a non-empty array' }
    const staged = new Map()
    for (const edit of edits) {
      const rel = String(edit?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
      if (!rel || rel.includes('..')) return { ok: false, error: `invalid path: ${rel || '(empty)'}` }
      const abs = resolveSafeHostPath(root, rel)
      if (!abs || !fs.existsSync(abs)) return { ok: false, error: `not found: ${rel}` }
      let current = staged.has(rel) ? staged.get(rel) : fs.readFileSync(abs, 'utf8')
      const oldString = String(edit?.old_string ?? edit?.oldString ?? '')
      const newString = String(edit?.new_string ?? edit?.newString ?? '')
      const exactIdentifierRename =
        !edit?.replaceAll &&
        /^[A-Za-z_$][\w$]*$/.test(oldString) &&
        /^[A-Za-z_$][\w$]*$/.test(newString) &&
        ctx.identifierSearches instanceof Map &&
        ctx.identifierSearches.has(oldString)
      const applied = applySearchReplace(
        current,
        oldString,
        newString,
        Boolean(edit?.replaceAll) || exactIdentifierRename,
      )
      if (!applied.ok) return { ...applied, path: rel }
      staged.set(rel, applied.content)
    }
    if (mode === 'ask') return { ok: false, error: 'Ask 模式禁止修改文件' }
    if (mode === 'plan' || mode === 'propose') {
      for (const [rel, content] of staged) await persistWrite(rel, content, ctx)
      return { ok: true, deferred: true, pending: [...staged.keys()], edits: edits.length, via: 'multi_edit' }
    }
    const priorWritten = new Set(writtenPaths)
    const priorPatches = filePatches.map((patch) => ({ ...patch }))
    const priorRollback = new Map(ctx.rollbackSnapshots)
    const priorReads = new Map(ctx.readSnapshots)
    const localSnapshots = new Map()
    const savedPaths = []
    for (const [rel, content] of staged) {
      const abs = resolveSafeHostPath(root, rel)
      const before = fs.readFileSync(abs, 'utf8')
      const stat = fs.statSync(abs)
      const saved = await persistWrite(rel, content, ctx, contentFingerprint(before))
      if (!saved.ok) {
        rollbackTextEdits({ workspaceRoot: root, snapshots: localSnapshots })
        writtenPaths.clear()
        for (const path of priorWritten) writtenPaths.add(path)
        filePatches.splice(0, filePatches.length, ...priorPatches)
        ctx.rollbackSnapshots.clear()
        for (const [path, snapshot] of priorRollback) ctx.rollbackSnapshots.set(path, snapshot)
        ctx.readSnapshots.clear()
        for (const [path, fingerprint] of priorReads) ctx.readSnapshots.set(path, fingerprint)
        return { ...saved, transactionRolledBack: true }
      }
      localSnapshots.set(rel, {
        before,
        isNewFile: false,
        originalMode: stat.mode & 0o777,
        lastWrittenFingerprint: contentFingerprint(content),
      })
      savedPaths.push(rel)
    }
    return { ok: true, written: savedPaths, edits: edits.length, via: 'multi_edit' }
  }
  if (name === 'move_file' || name === 'delete_file') {
    if (mode === 'ask') return { ok: false, error: 'Ask 模式禁止修改文件' }
    if (mode === 'plan' || mode === 'propose') {
      return { ok: false, deferred: true, error: `Plan 模式暂不执行 ${name}；请在方案中说明后由 Agent 执行。` }
    }
    const checkpoint = ensureTurnCheckpoint(ctx)
    if (!checkpoint.ok) return { ok: false, error: checkpoint.error }
    if (name === 'delete_file') {
      const rel = String(args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
      const abs = rel && !rel.includes('..') ? resolveSafeHostPath(root, rel) : null
      if (!abs || !fs.existsSync(abs)) return { ok: false, error: 'file not found or unsafe path' }
      if (!fs.statSync(abs).isFile()) return { ok: false, error: 'delete_file refuses directories' }
      fs.rmSync(abs)
      writtenPaths.add(rel)
    } else {
      const from = String(args?.from || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
      const to = String(args?.to || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
      const fromAbs = from && !from.includes('..') ? resolveSafeHostPath(root, from) : null
      const toAbs = to && !to.includes('..') ? resolveSafeHostPath(root, to) : null
      if (!fromAbs || !toAbs || !fs.existsSync(fromAbs)) return { ok: false, error: 'source not found or unsafe path' }
      if (!fs.statSync(fromAbs).isFile()) return { ok: false, error: 'move_file refuses directories' }
      if (fs.existsSync(toAbs)) return { ok: false, error: 'destination already exists' }
      fs.mkdirSync(path.dirname(toAbs), { recursive: true })
      fs.renameSync(fromAbs, toAbs)
      writtenPaths.add(from)
      writtenPaths.add(to)
    }
    ctx.writeRevision = Number(ctx.writeRevision || 0) + 1
    ctx.ranVerify = false
    ctx.verificationPassed = false
    const changes = syncCommandChanges(ctx)
    if (!changes.ok) return { ok: false, error: changes.error }
    try { await updateCodeIndexForFiles(changes.paths) } catch { /* next search rebuilds */ }
    markGraphifyNeedsUpdate(changes.paths)
    return {
      ok: true,
      written: true,
      paths: name === 'delete_file'
        ? [String(args.path).replace(/\\/g, '/')]
        : [String(args.from).replace(/\\/g, '/'), String(args.to).replace(/\\/g, '/')],
      via: name,
    }
  }
  if (name === 'todo_write') {
    const items = Array.isArray(args?.items) ? args.items.slice(0, 50) : []
    const normalized = items.map((item) => ({
      id: String(item?.id || '').trim(),
      title: String(item?.title || '').trim().slice(0, 300),
      status: String(item?.status || ''),
    }))
    if (
      normalized.some((item) => !item.id || !item.title || !['pending', 'in_progress', 'completed'].includes(item.status))
    ) {
      return { ok: false, error: 'todo items require id, title and pending|in_progress|completed status' }
    }
    if (new Set(normalized.map((item) => item.id)).size !== normalized.length) {
      return { ok: false, error: 'todo ids must be unique' }
    }
    if (normalized.filter((item) => item.status === 'in_progress').length > 1) {
      return { ok: false, error: 'only one todo may be in_progress' }
    }
    ctx.todos = normalized
    return {
      ok: true,
      items: normalized,
      completed: normalized.filter((item) => item.status === 'completed').length,
      total: normalized.length,
    }
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
    const checkpoint = ensureTurnCheckpoint(ctx)
    if (!checkpoint.ok) return { ok: false, error: checkpoint.error }
    const r = await workspaceRunCommand({
      command: args?.command,
      cwd: args?.cwd,
      timeoutMs: args?.timeoutMs,
      mode,
      runId: ctx.requestId || undefined,
    })
    if (isVerificationCommand(cmd, ctx.userLine)) {
      ctx.ranVerify = true
      ctx.verificationPassed = r?.ok !== false && (r?.exitCode == null || r.exitCode === 0)
      ctx.lastVerificationOutput = String(r?.output || r?.error || '').slice(-8_000)
      ctx.lastVerificationTool = 'run_command'
      if (ctx.verificationPassed) ctx.lastFailedVerificationCommand = null
      else {
        ctx.lastFailedVerificationCommand = {
          command: cmd,
          cwd: args?.cwd == null ? undefined : String(args.cwd),
        }
      }
    }
    const commandChanges = syncCommandChanges(ctx)
    if (!commandChanges.ok) return { ...r, ok: false, error: commandChanges.error }
    if (r && r.ok === false && writtenPaths.size) {
      const diag = await collectDiagnostics([], writtenPaths)
      return { ...r, diagnostics: diag.problems }
    }
    return r
  }
  if (name === 'run_tests') {
    const checkpoint = ensureTurnCheckpoint(ctx)
    if (!checkpoint.ok) return { ok: false, error: checkpoint.error }
    let r = await workspaceRunTests({
      extraArgs: args?.extraArgs,
      timeoutMs: args?.timeoutMs,
      mode,
      runId: ctx.requestId || undefined,
    })
    if (
      r?.ok === false &&
      /未探测到可用测试、类型检查或 lint 命令/.test(String(r?.output || r?.error || ''))
    ) {
      const diagnostics = await collectDiagnostics([...writtenPaths], writtenPaths)
      const problems = Array.isArray(diagnostics?.problems) ? diagnostics.problems : []
      const staticOk = diagnostics?.ok !== false && problems.length === 0
      r = {
        ok: staticOk,
        exitCode: staticOk ? 0 : 1,
        output: staticOk
          ? '未探测到项目测试命令；已完成变更文件静态诊断，未发现问题。'
          : `未探测到项目测试命令；静态诊断发现 ${problems.length} 个问题。`,
        diagnostics: problems,
        degraded: true,
      }
    }
    ctx.ranVerify = true
    ctx.verificationPassed = r?.ok !== false && (r?.exitCode == null || r.exitCode === 0)
    ctx.lastVerificationOutput = String(r?.output || r?.error || '').slice(-8_000)
    ctx.lastVerificationTool = 'run_tests'
    const commandChanges = syncCommandChanges(ctx)
    if (!commandChanges.ok) return { ...r, ok: false, error: commandChanges.error }
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

function normalizeHostMessage(message, toolNames = TOOL_NAMES) {
  const source = message && typeof message === 'object' ? message : {}
  const nativeCalls = toolCallProtocol.normalizeToolCalls(source.tool_calls, toolNames)
  const normalizedMessage = {
    ...source,
    tool_calls: nativeCalls.map((call) => ({
      id: call.id,
      type: 'function',
      function: {
        name: call.function.name,
        arguments: JSON.stringify(call.function.arguments),
      },
    })),
  }
  return {
    message: normalizedMessage,
    protocol: nativeCalls.length ? 'native' : 'none',
    toolCalls: nativeCalls.map((tc, i) => ({
      id: tc.id || `call_${i}`,
      name: tc.function.name,
      args: tc.function.arguments,
    })),
  }
}

function visibleText(value) {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  return value.map((part) => (part && typeof part === 'object' ? String(part.text || '') : '')).join('')
}

export async function readOpenAiStream(response, opts) {
  if (/application\/json/i.test(response.headers.get('content-type') || '')) {
    const data = await response.json()
    const message = data?.choices?.[0]?.message || {}
    const text = visibleText(message.content)
    if (text && typeof opts.onDelta === 'function') opts.onDelta(text)
    return {
      message: { ...message, content: text },
      streamed: Boolean(text && typeof opts.onDelta === 'function'),
      usage: data?.usage || null,
    }
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('云端流式响应缺少 response body')
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let streamed = false
  const calls = new Map()
  let done = false
  let usage = null

  const processPayload = (payload) => {
    const line = String(payload || '').trim()
    if (!line || line === '[DONE]') return
    const chunk = JSON.parse(line)
    if (chunk?.usage && typeof chunk.usage === 'object') usage = chunk.usage
    const choice = chunk?.choices?.[0]
    if (!choice) return
    const isDelta = Boolean(choice.delta)
    const data = choice.delta || choice.message || {}
    const text = visibleText(data.content)
    if (text) {
      if (isDelta) {
        content += text
        if (typeof opts.onDelta === 'function') {
          opts.onDelta(text)
          streamed = true
        }
      } else if (!content) {
        content = text
      }
    }
    const rawCalls = Array.isArray(data.tool_calls) ? data.tool_calls : []
    for (let pos = 0; pos < rawCalls.length; pos += 1) {
      const raw = rawCalls[pos]
      const index = Number.isInteger(raw.index) ? raw.index : pos
      const call = calls.get(index) || { id: '', type: 'function', function: { name: '', arguments: '' } }
      if (raw.id) call.id = isDelta ? raw.id : String(raw.id)
      if (raw.type) call.type = raw.type
      const fn = raw.function || {}
      if (typeof fn.name === 'string') {
        call.function.name = isDelta ? call.function.name + fn.name : fn.name
      }
      if (typeof fn.arguments === 'string') {
        call.function.arguments = isDelta
          ? call.function.arguments + fn.arguments
          : fn.arguments
      } else if (fn.arguments && typeof fn.arguments === 'object') {
        call.function.arguments = JSON.stringify(fn.arguments)
      }
      calls.set(index, call)
    }
  }

  try {
    while (!done) {
      const part = await reader.read()
      done = part.done
      buffer += decoder.decode(part.value || new Uint8Array(), { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const raw of lines) {
        const line = raw.trim()
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') {
          done = true
          break
        }
        if (payload) processPayload(payload)
      }
    }
    if (buffer.trim().startsWith('data:')) processPayload(buffer.trim().slice(5))
  } finally {
    reader.releaseLock()
  }
  return {
    message: {
      role: 'assistant',
      content,
      tool_calls: [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => call),
    },
    streamed,
    usage,
  }
}

export async function readOllamaStream(response, opts) {
  if (/^application\/json\b/i.test(response.headers.get('content-type') || '')) {
    const data = await response.json()
    const message = data?.message || data?.choices?.[0]?.message || {}
    const text = visibleText(message.content)
    if (text && typeof opts.onDelta === 'function') opts.onDelta(text)
    return {
      message: { ...message, content: text },
      streamed: Boolean(text && typeof opts.onDelta === 'function'),
      usage: data?.usage || (data?.prompt_eval_count != null || data?.eval_count != null
        ? {
            prompt_tokens: Number(data.prompt_eval_count) || 0,
            completion_tokens: Number(data.eval_count) || 0,
            total_tokens: (Number(data.prompt_eval_count) || 0) + (Number(data.eval_count) || 0),
          }
        : null),
    }
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Ollama 流式响应缺少 response body')
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let toolCalls = []
  let message = null
  let streamed = false
  let usage = null

  const processLine = (raw) => {
    const line = String(raw || '').trim()
    if (!line) return
    const chunk = JSON.parse(line)
    if (chunk?.usage && typeof chunk.usage === 'object') usage = chunk.usage
    if (chunk?.prompt_eval_count != null || chunk?.eval_count != null) {
      const prompt = Number(chunk.prompt_eval_count) || 0
      const completion = Number(chunk.eval_count) || 0
      usage = { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion }
    }
    const part = chunk?.message && typeof chunk.message === 'object' ? chunk.message : null
    if (part) {
      message = { ...message, ...part }
      const text = visibleText(part.content)
      if (text) {
        content += text
        if (typeof opts.onDelta === 'function') {
          opts.onDelta(text)
          streamed = true
        }
      }
      if (Array.isArray(part.tool_calls) && part.tool_calls.length) toolCalls = part.tool_calls
    }
    const choice = chunk?.choices?.[0]
    if (!part && choice) {
      const data = choice.delta || choice.message || {}
      const text = visibleText(data.content)
      if (text) {
        content += text
        if (typeof opts.onDelta === 'function') {
          opts.onDelta(text)
          streamed = true
        }
      }
      if (Array.isArray(data.tool_calls) && data.tool_calls.length) toolCalls = data.tool_calls
    }
  }

  let done = false
  try {
    while (!done) {
      const part = await reader.read()
      done = part.done
      buffer += decoder.decode(part.value || new Uint8Array(), { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const line of lines) processLine(line)
    }
    if (buffer.trim()) processLine(buffer)
  } finally {
    reader.releaseLock()
  }
  return {
    message: { ...(message || {}), role: 'assistant', content, tool_calls: toolCalls },
    streamed,
    usage,
  }
}

/**
 * @returns {Promise<
 *   | { kind: 'cloud'; url: string; headers: Record<string,string>; model: string; providerName: string }
 *   | { kind: 'ollama'; base: string; model: string }
 *   | { kind: 'none'; error: string }
 * >}
 */
export function resolveChatBackend(preferredModel, preferredMode) {
  const settings = loadChatSettings()
  const model = String(preferredModel || settings?.model || '').trim()
  const requestedMode =
    preferredMode === 'local-mcp' || preferredMode === 'claude-code' ? preferredMode : ''
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
  const localCandidate = String(preferredModel || settings?.localOllamaModel || '').trim()

  // 手选本地模型时按已解析通道硬路由，绝不交给云供应商做名称回退。
  if (requestedMode === 'local-mcp') {
    if (localCandidate && localPool.has(localCandidate)) {
      return { kind: 'ollama', base: ollamaBase, model: localCandidate }
    }
    return {
      kind: 'none',
      error: `所选本地模型「${localCandidate || model}」不在本地启用池，已停止执行；不会改用云模型。`,
    }
  }

  // 兼容未携带 mode 的旧调用：精确命中本地池仍优先走 Ollama。
  if (!requestedMode && localCandidate && localPool.has(localCandidate)) {
    return { kind: 'ollama', base: ollamaBase, model: localCandidate }
  }

  if (model && model !== 'auto') {
    try {
      const resolved = cloudProviders.resolveEnvForModel(model, { fallback: false, settings })
      if (!resolved.error && resolved.env) {
        const apiKey = String(
          resolved.env.ANTHROPIC_API_KEY || resolved.env.ANTHROPIC_AUTH_TOKEN || '',
        ).trim()
        const directInfo = cloudProviders.supportsDirectApi(resolved.providerName)
        const isKnown = directInfo.direct && directInfo.apiBase
        const configuredBase = isKnown
          ? String(directInfo.apiBase).replace(/\/+$/, '')
          : String(resolved.env.ANTHROPIC_BASE_URL || '').replace(/\/+$/, '')
        const anthropicModel = resolved.providerName === 'Anthropic' || /^claude-/i.test(model)
        const effectiveBase = configuredBase || (anthropicModel ? 'https://api.anthropic.com' : '')
        const isGemini =
          /generativelanguage\.googleapis/i.test(effectiveBase) ||
          resolved.providerName === 'Google Gemini'
        const isAnthropicNative =
          anthropicModel && /api\.anthropic\.com/i.test(effectiveBase)
        if (apiKey && isGemini) {
          const root = effectiveBase
            .replace(/\/?models\/?$/i, '')
            .replace(/\/+$/, '')
          const apiModel = String(resolved.model || model).replace(/^models\//i, '')
          return {
            kind: 'gemini',
            url: `${root}/models/${encodeURIComponent(apiModel)}:streamGenerateContent?alt=sse`,
            headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
            model: String(resolved.model || model),
            providerName: String(resolved.providerName || 'Google Gemini'),
          }
        }
        if (apiKey && isAnthropicNative) {
          const tokenAuth = !resolved.env.ANTHROPIC_API_KEY && Boolean(resolved.env.ANTHROPIC_AUTH_TOKEN)
          const anthropicBase = effectiveBase.replace(/\/v1$/i, '')
          return {
            kind: 'anthropic',
            url: `${anthropicBase}/v1/messages`,
            headers: {
              ...(tokenAuth ? { Authorization: `Bearer ${apiKey}` } : { 'x-api-key': apiKey }),
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            model: String(resolved.model || model),
            providerName: String(resolved.providerName || 'Anthropic'),
          }
        }
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

  if (requestedMode === 'claude-code') {
    return {
      kind: 'none',
      error: `所选云模型「${model}」没有可用的云供应商，已停止执行；不会改用本地模型。`,
    }
  }

  const candidate = localCandidate
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

function isCloudBackend(kind) {
  return kind === 'cloud' || kind === 'anthropic' || kind === 'gemini'
}

function describeBackend(backend) {
  return isCloudBackend(backend.kind)
    ? `cloud:${backend.model}`
    : `${backend.kind}:${backend.model}`
}

const TRANSIENT_MODEL_STATUSES = new Set([429, 500, 502, 503, 504])
const MAX_RETRY_AFTER_MS = 8_000
const MAX_MODEL_RETRIES = 3

function retryAfterMs(response, attempt) {
  const raw = String(response.headers.get('retry-after') || '').trim()
  if (raw) {
    const seconds = Number(raw)
    const parsed = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(raw) - Date.now()
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed <= MAX_RETRY_AFTER_MS ? parsed : null
    }
  }
  return Math.min(2_000, 400 * (2 ** attempt)) + Math.floor(Math.random() * 150)
}

export async function fetchModelResponse(url, init, metrics = {}) {
  const signal = init?.signal
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, init)
    if (
      attempt >= MAX_MODEL_RETRIES ||
      !TRANSIENT_MODEL_STATUSES.has(response.status)
    ) return response
    const delay = retryAfterMs(response, attempt)
    if (delay == null) return response
    metrics.onRetry?.({ attempt: attempt + 1, status: response.status, delayMs: delay })
    try { await response.body?.cancel() } catch { /* release the first response before retrying */ }
    await new Promise((resolve, reject) => {
      const finish = () => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }
      const timer = setTimeout(finish, delay)
      const onAbort = () => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        reject(signal.reason || new Error('请求已中止'))
      }
      if (signal?.aborted) onAbort()
      else signal?.addEventListener('abort', onAbort, { once: true })
    })
  }
}

export async function probeOllamaVersion(base, signal) {
  try {
    const response = await fetch(`${String(base || '').replace(/\/+$/, '')}/api/version`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(2_000)].filter(Boolean)),
    })
    if (!response.ok) return null
    const data = await response.json()
    return String(data?.version || '').trim() || null
  } catch {
    return null
  }
}

/**
 * @param {any} backend
 * @param {any[]} messages
 * @param {{ toolChoice?: 'auto' | 'required', signal?: AbortSignal, localContextLength?: number|null, disableTools?: boolean, temperature?: number, tools?: any[], toolNames?: string[], onRetry?: (detail: any) => void }} [opts]
 */
async function chatOnce(backend, messages, opts = {}) {
  const toolChoice = opts.toolChoice === 'required' ? 'required' : 'auto'
  const activeTools = Array.isArray(opts.tools) ? opts.tools : TOOLS
  const activeToolNames = Array.isArray(opts.toolNames) ? opts.toolNames : TOOL_NAMES
  const nativeAdapter = getNativeModelAdapter(backend.kind)
  if (nativeAdapter) {
    const body = nativeAdapter.buildRequest(messages, activeTools, toolChoice, backend.model)
    const res = await fetchModelResponse(backend.url, {
      method: 'POST',
      headers: backend.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.any([opts.signal, AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS)].filter(Boolean)),
    }, { onRetry: opts.onRetry })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      if (isToolsUnsupportedError(res.status, errText)) {
        return {
          ok: false,
          toolsUnsupported: true,
          error: `${backend.providerName} 不支持当前工具调用（HTTP ${res.status}）：${errText.slice(0, 220)}`,
        }
      }
      return { ok: false, error: `${backend.providerName} HTTP ${res.status}: ${errText.slice(0, 280)}` }
    }
    const streamedResponse = await nativeAdapter.readStream(res, opts)
    const normalized = normalizeHostMessage(streamedResponse.message, activeToolNames)
    return {
      ok: true,
      message: normalized.message,
      thought: String(normalized.message.content || '').trim(),
      toolCalls: normalized.toolCalls.map((call, index) => ({
        ...call,
        ...(backend.kind === 'gemini' && normalized.message.nativeCallIds?.[index]
          ? { providerCallId: normalized.message.nativeCallIds[index] }
          : {}),
      })),
      protocol: normalized.protocol,
      streamed: streamedResponse.streamed,
      dialect: backend.kind,
      usage: streamedResponse.usage || null,
    }
  }
  if (backend.kind === 'cloud') {
    const res = await fetchModelResponse(backend.url, {
      method: 'POST',
      headers: backend.headers,
      body: JSON.stringify({
        model: backend.model,
        messages,
        tools: activeTools,
        tool_choice: toolChoice,
        stream: true,
        stream_options: { include_usage: true },
        ...cloudProviders.deepSeekRequestExtras(backend.model),
      }),
      signal: AbortSignal.any([opts.signal, AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS)].filter(Boolean)),
    }, { onRetry: opts.onRetry })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
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
    const streamedResponse = await readOpenAiStream(res, opts)
    const msg = streamedResponse.message
    const normalized = normalizeHostMessage(msg, activeToolNames)
    return {
      ok: true,
      message: normalized.message,
      thought: String(normalized.message.content || '').trim(),
      toolCalls: normalized.toolCalls,
      protocol: normalized.protocol,
      streamed: streamedResponse.streamed,
      dialect: 'openai',
      usage: streamedResponse.usage || null,
    }
  }

  const body = {
    model: backend.model,
    messages,
    stream: true,
    keep_alive: '30m',
    options: {
      num_ctx: Math.max(
        1024,
        Math.floor(
          Math.min(
            LOCAL_DIRECT_NUM_CTX,
            Number(opts.localContextLength) >= 1024
              ? Number(opts.localContextLength)
              : LOCAL_DIRECT_NUM_CTX,
          ),
        ),
      ),
      // 正常编码低温稳定；验证失败后的修复回合由调用方适度升温，避免固化错误决策。
      temperature: Number.isFinite(Number(opts.temperature))
        ? Math.max(0, Math.min(1, Number(opts.temperature)))
        : 0.2,
    },
  }
  if (!opts.disableTools) body.tools = activeTools
  if (toolChoice === 'required' && !opts.disableTools) body.tool_choice = 'required'

  let res
  try {
    res = await fetchModelResponse(`${backend.base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.any([opts.signal, AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS)].filter(Boolean)),
    }, { onRetry: opts.onRetry })
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
  const streamedResponse = await readOllamaStream(res, opts)
  const msg = streamedResponse.message
  if (opts.disableTools) {
    const content = visibleText(msg.content)
    return {
      ok: true,
      message: { ...msg, content, tool_calls: [] },
      thought: content.trim(),
      toolCalls: [],
      protocol: 'none',
      streamed: streamedResponse.streamed,
      dialect: 'ollama',
      usage: streamedResponse.usage || null,
    }
  }
  const normalized = normalizeHostMessage(msg, activeToolNames)
  return {
    ok: true,
    message: normalized.message,
    thought: String(normalized.message.content || '').trim(),
    toolCalls: normalized.toolCalls,
    protocol: normalized.protocol,
    streamed: streamedResponse.streamed,
    dialect: 'ollama',
    usage: streamedResponse.usage || null,
  }
}

function pushAssistantWithTools(messages, round, dialect) {
  // Ollama /api/chat 的 assistant 工具历史要求 function.arguments 保持 JSON 对象。
  // normalizeHostMessage 内部统一为 OpenAI 风格字符串，这里必须按协议边界还原；
  // 仅使用已通过 normalizeToolCalls 严格解析的参数，不修补、不猜测模型输出。
  const toolCalls = dialect === 'ollama'
    ? round.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: {
          name: call.name,
          arguments: JSON.parse(JSON.stringify(call.args)),
        },
      }))
    : round.message.tool_calls
  if (dialect === 'openai') {
    messages.push({
      role: 'assistant',
      content: round.thought || null,
      tool_calls: toolCalls,
    })
  } else {
    messages.push({
      role: 'assistant',
      content: round.thought || '',
      tool_calls: toolCalls,
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
    if (dialect === 'openai' || dialect === 'anthropic') {
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content,
      })
    } else {
      messages.push({
        role: 'tool',
        tool_name: call.name,
        tool_call_id: dialect === 'gemini' ? call.providerCallId : call.id,
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
    call.name === 'search_replace' ||
    call.name === 'apply_patch' ||
    call.name === 'delete_file' ||
    call.name === 'list_dir'
  ) {
    return String(call.args?.path || '')
  }
  if (call.name === 'move_file') return `${call.args?.from || ''} → ${call.args?.to || ''}`
  if (call.name === 'multi_edit') return `${Array.isArray(call.args?.edits) ? call.args.edits.length : 0} edits`
  if (call.name === 'todo_write') return `${Array.isArray(call.args?.items) ? call.args.items.length : 0} items`
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
 *   requireAppliedWrite?: boolean,
 *   allowedMcpServers?: string[],
 *   onDelta?: (chunk: string) => void,
 *   onToolEvent?: (ev: { type: 'tool', name: string, arg?: string, path?: string, status: 'running'|'ok'|'fail', output?: string }) => void,
 * }} opts
 */
export async function runHostAgentLoop(opts) {
  const runStartedAt = Date.now()
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
  const requireAppliedWrite = opts.requireAppliedWrite === true

  const preferredModel = String(opts.model || opts.orchestratorModel || '').trim()
  let backend = resolveChatBackend(preferredModel, opts.modelMode)
  if (backend.kind === 'none') {
    return { ok: false, content: '', error: backend.error || '无可用模型后端' }
  }

  const requestId = String(opts.requestId || '').trim()
  const requestController = new AbortController()
  const cancelState = { cancelled: false, controller: requestController, cancelSource: '' }
  if (requestId) activeHost.set(requestId, cancelState)
  let modelContextLength = null
  let modelToolCapability
  let modelDigest = ''
  let ollamaVersion = null
  const settings = loadChatSettings()
  try {
    const local = backend.kind === 'ollama'
    const capability = await resolveModelCapabilities({
      modelId: backend.model,
      pool: local ? 'local' : 'cloud',
      providerName: backend.providerName,
      settings,
      signal: requestController.signal,
      ...(local ? { ollamaBase: backend.base } : {}),
    })
    modelContextLength = local
      ? (capability.contextLength
        ? Math.min(LOCAL_DIRECT_NUM_CTX, capability.contextLength)
        : LOCAL_DIRECT_NUM_CTX)
      : capability.contextLength || null
    modelToolCapability = capability.capabilities?.tools
    modelDigest = String(capability.digest || '').trim()
    if (local && !modelDigest) {
      const catalog = await listOllamaModelsWithCapabilities(backend.base, { refreshShow: false })
      const matched = (catalog.models || []).find((item) => item.name === backend.model)
      modelDigest = String(matched?.digest || '').trim()
    }
  } catch {
    if (backend.kind === 'ollama') modelContextLength = LOCAL_DIRECT_NUM_CTX
    // Cloud models use provider capability or caller override when available.
  }
  if (backend.kind === 'ollama') {
    ollamaVersion = await probeOllamaVersion(backend.base, requestController.signal)
  }
  if (modelToolCapability === false) {
    if (requestId) activeHost.delete(requestId)
    return {
      ok: false,
      content: '',
      error: `模型「${backend.model}」在能力注册表中未声明工具调用支持；Host 工具环已停止本轮，请改用支持 tools 的模型或更新能力覆盖。`,
      model: backend.model,
      backend: backend.kind,
    }
  }
  let mcpRuntime = null
  let activeTools = [...TOOLS]
  let activeToolSchemas = { ...TOOL_SCHEMAS }
  let activeToolNames = [...TOOL_NAMES]
  const allowedMcpServerIds = Array.isArray(opts.allowedMcpServers)
    ? opts.allowedMcpServers.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  if (allowedMcpServerIds.length) {
    try {
      mcpRuntime = await connectHostMcpRuntime({
        workspaceRoot: root,
        mcpConfigAbsolutePath: settings.mcpConfigAbsolutePath || '',
        allowedMcpServerIds,
        signal: requestController.signal,
      })
      if (!mcpRuntime.tools.length) {
        await mcpRuntime.close()
        mcpRuntime = null
        if (requestId) activeHost.delete(requestId)
        return {
          ok: false,
          content: '',
          error: `已选择 MCP（${allowedMcpServerIds.join('、')}），但没有可供 Host 调用的只读工具。请检查 MCP 健康状态；写文件仍须使用 IDE 内置编辑工具。`,
        }
      }
      activeTools = [...TOOLS, ...mcpRuntime.tools]
      activeToolSchemas = Object.fromEntries(
        activeTools.map((tool) => [tool.function.name, tool.function.parameters]),
      )
      activeToolNames = Object.keys(activeToolSchemas)
    } catch (error) {
      if (requestId) activeHost.delete(requestId)
      return {
        ok: false,
        content: '',
        error: `Host MCP 连接失败：${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
  const closeMcpRuntime = async () => {
    const runtime = mcpRuntime
    mcpRuntime = null
    if (runtime) await runtime.close()
  }
  const requestedContextLength = Number(opts.contextLength)
  if (Number.isFinite(requestedContextLength) && requestedContextLength >= 1_024) {
    modelContextLength = modelContextLength
      ? Math.min(modelContextLength, Math.floor(requestedContextLength))
      : Math.floor(requestedContextLength)
  }
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
  const readSnapshots = new Map()
  const rollbackSnapshots = new Map()
  const effectiveContextLength = modelContextLength || Number(opts.contextLength) || 8_192
  const readMaxChars = Math.max(2_000, Math.min(16_000, Math.floor(effectiveContextLength * 4 * 0.25)))
  /** @type {Array<{ path: string, before?: string, after?: string, checkpointBefore?: string, beforeTruncated?: boolean, afterTruncated?: boolean, isNewFile?: boolean }>} */
  const filePatches = []
  const ctx = {
    root,
    userLine: String(opts.userLine || ''),
    mode,
    deferredWrites,
    writtenPaths,
    readPaths,
    readSnapshots,
    readCoverage: new Map(),
    rollbackSnapshots,
    readMaxChars,
    filePatches,
    ranVerify: false,
    verificationPassed: false,
    lastVerificationOutput: '',
    lastVerificationTool: '',
    writeRevision: 0,
    requestId,
    requestSignal: requestController.signal,
    mcpRuntime,
    turnCheckpoint: null,
    commandChangedPaths: new Set(),
    todos: [],
    editRecoveryPaths: new Set(),
    identifierSearches: new Map(),
    codeSearches: new Map(),
    codeSearchResults: new Map(),
    codeSearchCounts: new Map(),
    lastFailedVerificationCommand: null,
  }

  const systemConstraint = String(opts.systemConstraint || '').trim()
  // 写盘/只读规则优先 systemConstraint（turn-policy 单源）；无约束时才用 mode 兜底
  const modeWriteFallback = systemConstraint
    ? ''
    : mode === 'ask'
      ? 'Ask：只读；禁止所有文件修改工具和 run_tests；run_command 仅只读探测。'
      : mode === 'plan' || mode === 'propose'
        ? 'Plan：用 search_replace / write_file / apply_patch / multi_edit 提出改动（暂存待 Accept）；可用 run_command 探测。'
        : [
            'Agent：仅当本轮用户明确要求修改时才使用文件修改工具；纯问答禁止写盘。',
            '把同一任务涉及的源码、测试、配置视为一个写入事务：先连续完成全部相关文件，再 run_tests（或针对性 run_command），最后 get_diagnostics；失败则修复再测。',
            '无 Claude CLI 时本 Host 环即为完整开发路径；禁止假装已改盘。',
          ].join('')
  const system = [
    '你是工作区编码 Agent。',
    '工具顺序：todo_write（复杂任务）→ code_search|list_dir|glob → read_file → search_replace|apply_patch|multi_edit|write_file|move_file|delete_file → run_tests|run_command → get_diagnostics|git_status。',
    '复杂或包含多个交付项的任务先用 todo_write；每完成一项及时更新，最多一个 in_progress。',
    '多文件任务必须先完成全部相关文件的写入，再统一验证；不要在第一个文件写完后提前结束。Host 会在你停止调用工具时自动验证整个事务。',
    '单次输出长度、代码围栏或上下文长度都不是停止理由；Host 会自动压缩上下文。用户原任务未完成时必须在同一回合继续调用工具，禁止说“分批完成、后续再做、接下来实现”。',
    '只有全部 todo 已 completed、相关文件已写入且验证成功后才能给最终答复；不得把中途进度说明当作收尾。',
    '检索必须用 code_search + read_file；禁止用 run_command 跑 grep/rg/find -name。',
    '工具任务必须使用接口返回的原生 tool_calls；正文 JSON、Markdown 围栏或自然语言不得作为工具调用执行。',
    'run_command 仅用于 pip/npm、flask db、pytest、git 等。',
    mcpRuntime
      ? 'MCP 工具名以 mcp__ 开头，只负责读取或外部能力；工作区修改必须使用内置文件修改工具。'
      : '',
    '禁止在正文贴整文件或大段 ``` 代码；改动只经内置文件修改工具。',
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
  const repositoryMap = buildRepositoryMap(root, {
    maxChars: Math.min(6_000, Math.max(2_400, Math.floor(effectiveContextLength * 4 * 0.12))),
  })
  const userContent = [
    String(opts.userLine || '').slice(0, 20_000),
    repositoryMap ? `\n\n${repositoryMap}` : '',
    appendix ? `\n\n${appendix.slice(0, 6000)}` : '',
  ].join('')

  /** @type {any[]} */
  const messages = [
    { role: 'system', content: system },
    ...slimPriorMessagesForApi(
      opts.priorMessages || [],
      resolvePriorBudget({
        forceDirectChat: Boolean(opts.forceDirectChat) || mode === 'ask',
        allowTools: mode !== 'ask',
        contextLevel: opts.contextLevel,
      }),
    ),
    { role: 'user', content: userContent },
  ]

  let maxTurns = Math.min(MAX_TURNS, Math.max(1, Number(opts.maxTurns) || MAX_TURNS))
  let finalText = ''
  const toolTrace = []
  let turnCount = 0
  let selectedProtocol = 'none'
  let usedModel = backend.model
  let usedBackend = backend.kind
  let lastError = ''
  /** @type {string[]} */
  const backendsTried = [describeBackend(backend)]
  let verifyRepairCount = 0
  let verifyNudgeCount = 0
  let toolNudgeCount = 0
  let editNudgeUsed = false
  let confirmNudgeUsed = false
  let summaryNudgeUsed = false
  let forcePlainAnswerNext = false
  let relatedFilesNudgeCount = 0
  let taskObligationNudgeCount = 0
  let taskObligationCheckpoint = ''
  let buildSummaryNudgeCount = 0
  let deferredContinueCount = 0
  let deferredContinueCheckpoint = ''
  let compactCount = 0
  let toolFailCount = 0
  let retryCount = 0
  const prewriteEvidence = new Set()
  let prewriteProgressPending = false
  let promptTokenTotal = 0
  let completionTokenTotal = 0
  const tokenLimit = Math.max(0, Math.floor(Number(settings.agentTurnTokenLimit) || 0))
  const costLimitUsd = Math.max(0, Number(settings.agentTurnCostLimitUsd) || 0)
  const usageSnapshot = () => ({
    prompt_tokens: promptTokenTotal,
    completion_tokens: completionTokenTotal,
    total_tokens: promptTokenTotal + completionTokenTotal,
    costUsd: isCloudBackend(usedBackend)
      ? estimateUsageCostUsd(
          { prompt_tokens: promptTokenTotal, completion_tokens: completionTokenTotal },
          usedModel,
          settings.tokenPricing || {},
        )
      : 0,
  })
  /** 下一轮强制 tool_choice=required：Agent/Plan 默认；Ask 仅当用户话含检索/改码意图 */
  let forceToolsNext =
    mode === 'agent' ||
    mode === 'plan' ||
    mode === 'propose' ||
    looksLikeToolIntent(opts.userLine) ||
    looksLikeEditIntent(opts.userLine)
  let telemetryWritten = false
  const recordTelemetry = (outcome, error = '') => {
    if (telemetryWritten) return
    telemetryWritten = true
    const lowerError = String(error || '').toLowerCase()
    const errorType = !error ? undefined
      : /abort|cancel|stop/.test(lowerError) ? 'cancelled'
        : /timeout|timed out/.test(lowerError) ? 'timeout'
          : /http\s*(429|5\d\d)|rate.?limit/.test(lowerError) ? 'upstream-retryable'
            : /tool|function|schema|argument/.test(lowerError) ? 'tool-protocol'
              : 'request-failed'
    try {
      projectLogs.appendLogEntry({
        source: 'event',
        level: outcome === 'success' ? 'INFO' : outcome === 'aborted' ? 'WARN' : 'ERROR',
        message: `agent-turn ${outcome}`,
        meta: {
          model: usedModel,
          backend: usedBackend,
          durationMs: Date.now() - runStartedAt,
          contextLength: modelContextLength || null,
          ctx_window: modelContextLength || null,
          prompt_tok: promptTokenTotal || null,
          cost_usd: usageSnapshot().costUsd,
          eval_ms: Date.now() - runStartedAt,
          turns: turnCount,
          toolProtocol: selectedProtocol,
          protocol: selectedProtocol,
          toolCalls: toolTrace.length,
          tool_fail: toolFailCount,
          compact: compactCount,
          retry: retryCount,
          ollama_ver: ollamaVersion,
          model_digest: modelDigest || contentFingerprint(`${usedBackend}:${usedModel}`).slice(0, 16),
          mcp_calls: toolTrace.filter((item) => String(item.tool || '').startsWith('mcp__')).length,
          tools: [...new Set(toolTrace.map((x) => x.tool).filter(Boolean))],
          toolFailures: toolTrace
            .filter((item) => item?.ok === false)
            .slice(-8)
            .map((item) => ({
              tool: item.tool,
              ...(item.path ? { path: item.path } : {}),
              ...(item.detail ? { detail: String(item.detail).slice(0, 240) } : {}),
              error: String(item.output || '').slice(0, 500),
            })),
          writtenFiles: writtenPaths.size,
          verified: Boolean(ctx.verificationPassed),
          ...(cancelState.cancelSource ? { cancelSource: cancelState.cancelSource } : {}),
          ...(errorType ? { errorType } : {}),
        },
      })
    } catch {
      // Telemetry must never fail or alter the active coding turn.
    }
  }

  const failHost = async (error, extra = {}) => {
    recordTelemetry(extra.aborted ? 'aborted' : 'failed', error)
    if (requestId) activeHost.delete(requestId)
    await closeMcpRuntime()
    return {
      ok: false,
      content: '',
      error: `${error}（已试：${backendsTried.join(' → ')}）`,
      deferredWrites: [],
      writtenPaths: [...writtenPaths],
      filePatches: [...filePatches],
      toolTrace,
      turns: turnCount,
      mode,
      model: usedModel,
      backend: usedBackend,
      todos: [...ctx.todos],
      usage: usageSnapshot(),
      ...extra,
    }
  }

  const recentToolFailureEvidence = () => {
    const failures = toolTrace.filter((item) => item?.ok === false).slice(-6)
    if (!failures.length) return ''
    return failures
      .map((item) => {
        const target = item.path || item.detail
        const reason = String(item.output || '未返回错误详情').replace(/\s+/g, ' ').slice(0, 500)
        return `${item.tool}${target ? ` (${String(target).slice(0, 180)})` : ''}: ${reason}`
      })
      .join('；')
  }

  /** 模型/协议失败属于事务失败：已写入的部分必须恢复，不能留下半成品。 */
  const failModelTransaction = async (error) => {
    const rollback = writtenPaths.size
      ? await rollbackHostWrites(ctx)
      : { restored: [], failed: [] }
    const rollbackNote = rollback.restored.length
      ? `已恢复本事务修改的 ${rollback.restored.length} 个文件。`
      : ''
    return failHost(`${error}${rollbackNote}`, {
      rolledBack: rollback.failed.length === 0,
      rolledBackPaths: rollback.restored,
      rollbackFailures: rollback.failed,
      writtenPaths: rollback.failed.map((item) => item.path).filter(Boolean),
      filePatches: [],
      verified: false,
    })
  }

  /** 模型结束连续写入后，Host 对整个回合事务做一次确定性验证。 */
  const verifyWriteTransaction = async () => {
    const failedCommand = ctx.lastFailedVerificationCommand
    const verificationTool = failedCommand?.command ? 'run_command' : 'run_tests'
    const verificationArgs = failedCommand?.command ? failedCommand : {}
    const label = agentTraceToolLabel(verificationTool)
    emit(`\n⋯ ${label} · transaction…\n`)
    emitTool({ type: 'tool', name: label, arg: 'transaction', status: 'running' })
    let result = await runTool(verificationTool, verificationArgs, ctx)
    const unavailable =
      result?.ok === false &&
      /未探测到可用测试、类型检查或 lint 命令/.test(String(result?.output || result?.error || ''))
    if (unavailable) {
      const diagnostics = await runTool('get_diagnostics', { paths: [...writtenPaths] }, ctx)
      const problems = Array.isArray(diagnostics?.problems) ? diagnostics.problems : []
      const staticOk = diagnostics?.ok !== false && problems.length === 0
      const staticOutput = staticOk
        ? '未探测到项目测试命令；已完成本事务变更文件的静态诊断，未发现问题。'
        : `未探测到项目测试命令；静态诊断发现 ${problems.length} 个问题。`
      toolTrace.push({
        tool: 'get_diagnostics',
        detail: 'auto-static-fallback',
        transaction: true,
        paths: [...writtenPaths],
        ok: staticOk,
        output: staticOk ? undefined : JSON.stringify(problems).slice(0, 4000),
        exitCode: staticOk ? 0 : 1,
      })
      ctx.ranVerify = true
      ctx.verificationPassed = staticOk
      ctx.lastVerificationOutput = staticOutput
      ctx.lastVerificationTool = 'get_diagnostics'
      result = {
        ok: staticOk,
        exitCode: staticOk ? 0 : 1,
        output: staticOutput,
        diagnostics: problems,
        degraded: true,
      }
    }
    const failed = result?.ok === false
    if (failed) toolFailCount += 1
    const output = String(result?.output || result?.error || '').slice(0, 8000)
    emitTool({
      type: 'tool',
      name: label,
      arg: 'transaction',
      status: failed ? 'fail' : 'ok',
      ...(output ? { output } : {}),
    })
    toolTrace.push({
      tool: verificationTool,
      detail: failedCommand?.command || 'auto',
      transaction: true,
      paths: [...writtenPaths],
      ok: !failed,
      output,
      exitCode: typeof result?.exitCode === 'number'
        ? result.exitCode
        : failed ? 1 : 0,
    })
    const failureContexts = []
    if (failed && output) {
      const queuedPaths = verificationFailureWorkspacePaths(output, root, 5)
      const seenPaths = new Set()
      while (queuedPaths.length && seenPaths.size < 8) {
        const rel = queuedPaths.shift()
        if (!rel || seenPaths.has(rel)) continue
        seenPaths.add(rel)
        const read = await runTool('read_file', { path: rel, limit: 240 }, ctx)
        const readOk = read?.ok !== false
        emitTool({
          type: 'tool',
          name: agentTraceToolLabel('read_file'),
          arg: 'failure-context',
          path: rel,
          status: readOk ? 'ok' : 'fail',
        })
        toolTrace.push({
          tool: 'read_file',
          detail: 'auto-failure-context',
          path: rel,
          args: { path: rel },
          ok: readOk,
          output: readOk ? undefined : String(read?.error || '').slice(0, 2000),
          exitCode: readOk ? 0 : 1,
        })
        if (readOk && read?.content) {
          const content = String(read.content)
          failureContexts.push(`失败涉及文件 ${rel}（已自动只读）：\n${content.slice(0, 5000)}`)
          const gutterless = content
            .split(/\r?\n/)
            .map((line) => line.replace(/^\s*\d+\s*[|│]\s?/, ''))
            .join('\n')
          const importSpecs = []
          const importRe = /(?:from\s+|import\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g
          const requireRe = /require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g
          for (const matcher of [importRe, requireRe]) {
            for (let match = matcher.exec(gutterless); match; match = matcher.exec(gutterless)) {
              importSpecs.push(match[1])
            }
          }
          for (const spec of importSpecs) {
            const imported = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec))
            const candidates = path.posix.extname(imported)
              ? [imported]
              : [`${imported}.js`, `${imported}.ts`, path.posix.join(imported, 'index.js')]
            for (const candidate of candidates) {
              const abs = resolveSafeHostPath(root, candidate)
              if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile() && !seenPaths.has(candidate)) {
                queuedPaths.push(candidate)
                break
              }
            }
          }
        }
      }
    }
    const semanticHint =
      failed &&
      /actual\s*[:=]?\s*12[\s\S]{0,160}expected\s*[:=]?\s*0|12\s*!==\s*0/.test(output) &&
      failureContexts.some((context) => context.includes('Number.parseInt'))
        ? [
            '语义修复提示：`Number.parseInt("12x", 10)` 会接受前缀并返回 12，不适合“整串必须是合法整数”的要求。',
            '应先用 `Number(value)` 解析完整字符串，再用 `Number.isSafeInteger(parsed)` 判断；合法则返回 parsed，否则返回 0。',
          ].join('\n')
        : ''
    messages.push({
      role: 'user',
      content: failed
        ? [
            '【系统·事务验证失败】本回合相关文件已全部写入，但统一验证失败。',
            `真实失败输出：\n${output.slice(-5000)}`,
            verificationRepairHint(output, root),
            semanticHint,
            ...failureContexts,
            '立即修复上述现有文件，再 run_tests。同一个短文件若有多处关联问题，优先用一次 write_file 整体修正，不要每轮只改一行；不要只解释错误。',
          ].filter(Boolean).join('\n\n')
        : `【系统·事务验证通过】本回合 ${writtenPaths.size} 个相关文件已统一验证通过。${output ? `\n${output.slice(-2000)}` : ''}`,
    })
    return result
  }

  /**
   * 如果模型已把某标识符从一个命中文件中移除，但同次 code_search 的其他落点仍保留该标识符，
   * 则事务还未完整。只返回真实检索命中，不猜测新的修改目标。
   */
  const unresolvedIdentifierReferences = () => {
    const unresolved = new Map()
    for (const [identifier, paths] of ctx.identifierSearches) {
      const renameStarted = [...rollbackSnapshots.entries()].some(([rel, snapshot]) => {
        if (!writtenPaths.has(rel)) return false
        const abs = resolveSafeHostPath(root, rel)
        if (!abs || !fs.existsSync(abs)) return false
        return String(snapshot?.before || '').includes(identifier) &&
          !fs.readFileSync(abs, 'utf8').includes(identifier)
      })
      if (!renameStarted) continue
      const remaining = paths.filter((rel) => {
        const abs = resolveSafeHostPath(root, rel)
        return Boolean(abs && fs.existsSync(abs) && fs.statSync(abs).isFile() && fs.readFileSync(abs, 'utf8').includes(identifier))
      })
      if (remaining.length) unresolved.set(identifier, remaining)
    }
    return unresolved
  }

  /** 从用户明确要求中提取可确定验收的任务条件，防止模型“做了一点就收尾”。 */
  const pendingTaskObligation = () => {
    const line = String(opts.userLine || '')
    const normalizedWritten = [...writtenPaths].map((rel) => String(rel).replace(/^\.\//, ''))
    const unfinishedTodos = ctx.todos.filter((item) => item?.status !== 'completed')
    if (unfinishedTodos.length) {
      return {
        type: 'todo-incomplete',
        message: `任务计划仍有 ${unfinishedTodos.length} 项未完成：${unfinishedTodos.map((item) => item.title).join('；')}。继续执行当前项，并在完成后用 todo_write 更新状态。`,
        contextPaths: [],
      }
    }
    const dependencyObligation = dependencyTaskObligation({
      userLine: line,
      root,
      toolTrace,
    })
    if (dependencyObligation) return dependencyObligation
    const explicitCommandMatch = line.match(
      /(?:先|再|最后)?\s*运行\s+((?:node|npm|pnpm|yarn|bun|pytest|python)\b[^\uff0c。；\n]*)/i,
    )
    if (explicitCommandMatch) {
      const expectedCommand = explicitCommandMatch[1].trim()
      const commandWasRun = toolTrace.some((item) =>
        item?.tool === 'run_command' && String(item?.detail || '').includes(expectedCommand),
      )
      if (!commandWasRun) {
        return {
          type: 'explicit-command',
          message: `用户明确要求先运行 \`${expectedCommand}\`，但工具轨迹中尚无该命令证据。立即用 run_command 执行该原命令；如果失败，根据真实输出修复后重跑。`,
          contextPaths: [],
        }
      }
    }
    const asksForNewTest = /(?:增加|新增|添加|补(?:充)?).{0,12}测试|add.{0,12}test/i.test(line)
    const wroteTest = normalizedWritten.some((rel) =>
      /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i.test(rel),
    )
    if (asksForNewTest && !wroteTest) {
      return {
        type: 'test-file',
        message: '用户明确要求新增测试，但本事务尚未创建或修改任何 *.test.* / *.spec.* / test 目录文件。不要把测试代码覆盖到源文件；立即创建符合现有测试器的测试文件。',
        contextPaths: [],
      }
    }

    const moveMatch = line.match(
      /(?:将|把)\s*[`'"]?([A-Za-z0-9_@./-]+\.[A-Za-z0-9]+)[`'"]?.{0,20}?(?:移到|移动到|迁移到)\s*[`'"]?([A-Za-z0-9_@./-]+\.[A-Za-z0-9]+)[`'"]?/i,
    )
    if (moveMatch) {
      const from = moveMatch[1].replace(/^\.\//, '')
      const to = moveMatch[2].replace(/^\.\//, '')
      const fromAbs = resolveSafeHostPath(root, from)
      const toAbs = resolveSafeHostPath(root, to)
      const oldReference = from.split('/').slice(-2).join('/')
      const searchedPaths = [...new Set([...ctx.codeSearches.values()].flat())]
      const remainingReferences = searchedPaths.filter((rel) => {
        const abs = resolveSafeHostPath(root, rel)
        return Boolean(abs && fs.existsSync(abs) && fs.statSync(abs).isFile() && fs.readFileSync(abs, 'utf8').includes(oldReference))
      })
      if (
        !toAbs || !fs.existsSync(toAbs) ||
        (fromAbs && fs.existsSync(fromAbs)) ||
        remainingReferences.length
      ) {
        return {
          type: 'move-file',
          message: `迁移任务尚未闭合：必须用 move_file 将 ${from} 移到 ${to}，并清除所有对 ${oldReference} 的旧引用。`,
          contextPaths: [...new Set([from, ...remainingReferences])],
        }
      }
    }

    const asksForBuild = /(?:运行|执行|检查).{0,20}(?:build|构建)|(?:build|构建).{0,20}(?:脚本|命令)/i.test(line)
    const ranBuild = toolTrace.some((item) =>
      item?.ok !== false &&
      (item?.tool === 'run_command' || item?.tool === 'run_tests') &&
      /build/i.test(String(item?.detail || item?.args?.command || '')),
    )
    if (asksForBuild && !ranBuild) {
      return {
        type: 'run-build',
        message: '用户要求运行现有 build 脚本，但尚无成功的构建命令证据。立即 read_file 读取 package.json，然后用 run_command 运行其 build 脚本，成功后检查产物并在最终答复中说明路径。',
        contextPaths: fs.existsSync(path.join(root, 'package.json')) ? ['package.json'] : [],
      }
    }
    return null
  }

  const searchEvidenceText = () => {
    const rows = []
    for (const [query, result] of ctx.codeSearchResults) {
      const direct = workspaceRipgrep({ query, maxResults: 12 })
      const hits = (result?.ripgrep || []).length ? result.ripgrep : (direct?.hits || [])
      for (const hit of hits) {
        rows.push(`${hit.relPath}:${hit.line}: ${hit.text}`)
        if (rows.length >= 12) break
      }
      if (!hits.length) {
        for (const hit of result?.semantic || []) {
          const rel = String(hit?.relPath || hit?.path || hit?.file || '')
          const snippet = String(hit?.text || hit?.content || hit?.snippet || '')
          if (rel || snippet) rows.push(`${rel}${hit?.line ? `:${hit.line}` : ''}: ${snippet}`)
          if (rows.length >= 12) break
        }
      }
      if (rows.length >= 12) break
      if (!rows.length && result?.graph?.preview) rows.push(`${query}: ${String(result.graph.preview).slice(0, 1000)}`)
    }
    try {
      const packagePath = path.join(root, 'package.json')
      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
        const buildScript = String(pkg?.scripts?.build || '')
        const scriptMatch = buildScript.match(/(?:^|\s)node\s+([^\s;&|]+)/)
        const rel = String(scriptMatch?.[1] || '').replace(/^['"]|['"]$/g, '').replace(/^\.\//, '')
        const abs = rel ? resolveSafeHostPath(root, rel) : null
        if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
          const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/)
          lines.forEach((line, index) => {
            if (/(?:dist|build|out)[/\\]|writeFile|mkdir/i.test(line)) {
              rows.push(`${rel}:${index + 1}: ${line.trim()}`)
            }
          })
        }
      }
    } catch {
      // 证据补充不影响主执行环。
    }
    return rows.join('\n')
  }

  const deterministicSearchAnswer = () => {
    const evidence = searchEvidenceText()
    return evidence ? `根据工作区实际检索结果：\n${evidence}` : ''
  }

  let forceCompactOnce = Boolean(opts.forceCompact)
  for (let turn = 0; turn < maxTurns; turn++) {
    turnCount = turn + 1
    if (cancelState.cancelled) {
      return failHost('aborted', { aborted: true, content: '（已中止）' })
    }

    const compacted = compactMessagesIfNeeded(messages, {
      workspaceRoot: root,
      force: forceCompactOnce,
      contextLength: modelContextLength || undefined,
      isLocal: backend.kind === 'ollama',
    })
    if (compacted.compacted) {
      compactCount += 1
      const arch = compacted.archivePath ? ` · 归档 ${compacted.archivePath}` : ''
      emit(
        `\n⋯ 上下文已压缩（${compacted.beforeChars}→${compacted.afterChars} 字符` +
          `${compacted.beforeTokens != null ? ` · ~${compacted.beforeTokens}→${compacted.afterTokens} tok` : ''}）${arch}…\n`,
      )
      forceCompactOnce = false
    }
    const wantRequired =
      forceToolsNext ||
      (mode === 'agent' && writtenPaths.size > 0 && !ctx.verificationPassed) ||
      (mode === 'agent' &&
        editNudgeUsed &&
        writtenPaths.size === 0 &&
        looksLikeEditIntent(opts.userLine))

    const turnTemperature =
      mode === 'agent' && ctx.ranVerify && !ctx.verificationPassed
        ? Math.min(1, 0.6 + verifyNudgeCount * 0.2)
        : 0.2
    const usePlainAnswer = forcePlainAnswerNext
    let round
    try {
      round = await chatOnce(backend, messages, {
        toolChoice: usePlainAnswer ? 'auto' : wantRequired ? 'required' : 'auto',
        signal: requestController.signal,
        localContextLength: backend.kind === 'ollama' ? modelContextLength : null,
        disableTools: usePlainAnswer,
        tools: activeTools,
        toolNames: activeToolNames,
        temperature: turnTemperature,
        onRetry: () => { retryCount += 1 },
      })
    } catch (e) {
      if (cancelState.cancelled || requestController.signal.aborted) {
        return failHost('aborted', { aborted: true, content: '（已中止）' })
      }
      lastError = e instanceof Error ? e.message : String(e)
      if (isCloudBackend(backend.kind)) {
        return failModelTransaction(`云端请求失败：${lastError}。为避免未告知地切换模型，本轮未自动改用本地模型；请确认后重试或手动切换。`)
      }
      return failModelTransaction(`Ollama 不可用：${lastError}`)
    }

    if (cancelState.cancelled || requestController.signal.aborted) {
      return failHost('aborted', { aborted: true, content: '（已中止）' })
    }

    forceToolsNext = false
    forcePlainAnswerNext = false

    if (!round.ok) {
      lastError = round.error || 'chat failed'
      const toolsUnsupported = Boolean(round.toolsUnsupported)
      if (isCloudBackend(backend.kind)) {
        return failModelTransaction(
          toolsUnsupported
            ? `${lastError}。当前云端模型不支持此工具任务；本轮不会静默切换到本地模型，请手动切换后重试。`
            : `云端请求失败：${lastError}。本轮不会静默切换到本地模型，请手动切换后重试。`,
        )
      }
      return failModelTransaction(
        `${lastError}。工具事务已停止；不会移除工具历史、禁用 tools、改用正文 JSON 或切换执行通道。`,
      )
    }

    if (round?.usage) {
      promptTokenTotal += Math.max(0, Number(round.usage.prompt_tokens) || 0)
      completionTokenTotal += Math.max(0, Number(round.usage.completion_tokens) || 0)
    }

    const currentUsage = usageSnapshot()
    const budget = evaluateTurnBudget({
      totalTokens: currentUsage.total_tokens,
      costUsd: currentUsage.costUsd,
      tokenLimit,
      costLimitUsd,
    })
    if (budget.exceeded) {
      const rollback = writtenPaths.size
        ? await rollbackHostWrites(ctx)
        : { restored: [], failed: [] }
      return failHost(
        budget.message,
        {
          errorType: 'budget-limit',
          rolledBack: rollback.failed.length === 0,
          rolledBackPaths: rollback.restored,
          rollbackFailures: rollback.failed,
          writtenPaths: rollback.failed.map((item) => item.path),
          filePatches: [],
          verified: false,
        },
      )
    }

    selectedProtocol = round.protocol || selectedProtocol
    usedModel = backend.model
    const calls = round.toolCalls
    const thoughtRaw = round.thought
    const thought = thoughtRaw ? stripLargeCodeFences(thoughtRaw) : ''
    if (thought) {
      finalText = thought
      // 长过程进 thinking 折叠；短句才直出
      if (!round.streamed) emit(compressThoughtForStream(thought))
    } else if (thoughtRaw && countLargeCodeFences(thoughtRaw) > 0) {
      emit('⋯ 已省略正文整文件代码块（请用工具写盘）…\n')
    }

    if (!calls.length) {
      const unfinishedTodos = ctx.todos.filter((item) => item?.status !== 'completed')
      const deferredExecution =
        mode === 'agent' &&
        unfinishedTodos.length > 0
      if (deferredExecution) {
        const checkpoint = [
          Number(ctx.writeRevision || 0),
          ...ctx.todos.map((item) => `${item.id}:${item.status}`),
        ].join('|')
        if (checkpoint !== deferredContinueCheckpoint) {
          deferredContinueCheckpoint = checkpoint
          deferredContinueCount = 0
        }
        if (deferredContinueCount >= DEFERRED_CONTINUE_MAX) {
          const rollback = writtenPaths.size
            ? await rollbackHostWrites(ctx)
            : { restored: [], failed: [] }
          return failHost(
            `模型连续 ${DEFERRED_CONTINUE_MAX} 次只说明后续工作而未继续执行；任务未被误报为完成。${rollback.restored.length ? `已恢复本事务修改的 ${rollback.restored.length} 个文件。` : ''}`,
            {
              rolledBack: rollback.failed.length === 0,
              rolledBackPaths: rollback.restored,
              rollbackFailures: rollback.failed,
              writtenPaths: rollback.failed.map((item) => item.path),
              filePatches: [],
              verified: false,
            },
          )
        }
        deferredContinueCount += 1
        if (thought || thoughtRaw) messages.push({ role: 'assistant', content: thought || thoughtRaw })
        messages.push({
          role: 'user',
          content: [
            '【系统·自动继续】你的上一条答复明确表示用户原任务尚未完成，因此不能结束本回合。',
            unfinishedTodos.length
              ? `未完成计划：${unfinishedTodos.map((item) => `${item.id} ${item.title}`).join('；')}`
              : '',
            '不要解释输出长度、不要提出分批交付、不要询问用户。立即从刚才所述的下一步继续调用工具，完成全部剩余文件和验证后再收尾。',
          ].filter(Boolean).join('\n\n'),
        })
        forceToolsNext = true
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS * 6,
          Math.max(maxTurns, turn + 4),
        )
        emit(`\n⋯ 自动继续：检测到原任务未完成（${deferredContinueCount}/${DEFERRED_CONTINUE_MAX}）…\n`)
        continue
      }
      const obligation = mode === 'agent' ? pendingTaskObligation() : null
      if (obligation) {
        // 只有“同一验收缺口且写入版本未变”才累加重试。
        // 移动文件或每清除一个旧引用都是真实进展，不应消耗无进展的三次上限。
        const obligationCheckpoint = [
          obligation.type,
          Number(ctx.writeRevision || 0),
          ...obligation.contextPaths.map((rel) => String(rel).replace(/^\.\//, '')).sort(),
        ].join('|')
        if (obligationCheckpoint !== taskObligationCheckpoint) {
          taskObligationCheckpoint = obligationCheckpoint
          taskObligationNudgeCount = 0
        }
        if (taskObligationNudgeCount >= 3) {
          const rollback = writtenPaths.size
            ? await rollbackHostWrites(ctx)
            : { restored: [], failed: [] }
          return failHost(
            `任务完成条件未满足：${obligation.message}${rollback.restored.length ? `已恢复本事务修改的 ${rollback.restored.length} 个文件。` : ''}`,
            {
              rolledBack: rollback.failed.length === 0,
              rolledBackPaths: rollback.restored,
              rollbackFailures: rollback.failed,
              writtenPaths: rollback.failed.map((item) => item.path),
              filePatches: [],
              verified: false,
            },
          )
        }
        taskObligationNudgeCount += 1
        const contexts = []
        for (const rel of obligation.contextPaths.slice(0, 10)) {
          const read = await runTool('read_file', { path: rel, limit: 260 }, ctx)
          const readOk = read?.ok !== false
          toolTrace.push({
            tool: 'read_file',
            detail: 'auto-obligation-context',
            path: rel,
            args: { path: rel },
            ok: readOk,
            output: readOk ? undefined : String(read?.error || '').slice(0, 2000),
            exitCode: readOk ? 0 : 1,
          })
          if (readOk && read?.content) contexts.push(`${rel}：\n${String(read.content).slice(0, 5000)}`)
        }
        if (thought || thoughtRaw) messages.push({ role: 'assistant', content: thought || thoughtRaw })
        messages.push({
          role: 'user',
          content: [
            `【系统·任务验收未完成】${obligation.message}`,
            ...contexts,
            '继续调用工具直到该条件满足，然后再统一验证；不要只输出计划。',
          ].filter(Boolean).join('\n\n'),
        })
        forceToolsNext = true
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS * VERIFY_REPAIR_MAX,
          Math.max(maxTurns, turn + 4),
        )
        continue
      }

      const asksForBuildSummary =
        mode === 'agent' &&
        /(?:运行|执行|检查).{0,20}(?:build|构建)|(?:build|构建).{0,20}(?:脚本|命令)/i.test(String(opts.userLine || '')) &&
        toolTrace.some((item) =>
          item?.ok !== false && item?.tool === 'run_command' && /build/i.test(String(item?.detail || '')),
        )
      if (asksForBuildSummary && buildSummaryNudgeCount < 1) {
        buildSummaryNudgeCount += 1
        if (thought || thoughtRaw) messages.push({ role: 'assistant', content: thought || thoughtRaw })
        messages.push({
          role: 'user',
          content: [
            '【系统·构建已成功】不要再调用工具。请根据已有的 package/build 脚本检索结果，用 1–3 句说明构建成功、生成目录和关键产物的准确路径。',
            searchEvidenceText() ? `已有检索证据：\n${searchEvidenceText()}` : '',
          ].filter(Boolean).join('\n\n'),
        })
        forceToolsNext = false
        forcePlainAnswerNext = true
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS,
          Math.max(maxTurns, turn + 2),
        )
        continue
      }

      if (mode === 'ask' && ctx.codeSearchResults.size > 0) {
        const fallbackAnswer = deterministicSearchAnswer()
        if (fallbackAnswer) {
          finalText = fallbackAnswer
          toolNudgeCount = TOOL_NUDGE_MAX
        }
      }

      // 模型停止调用工具，表示连续写入阶段结束；此时才验证整个多文件事务。
      if (
        mode === 'agent' &&
        writtenPaths.size > 0 &&
        !ctx.ranVerify
      ) {
        const unresolved = unresolvedIdentifierReferences()
        if (unresolved.size) {
          if (relatedFilesNudgeCount >= 2) {
            const rollback = await rollbackHostWrites(ctx)
            const detail = [...unresolved.entries()]
              .map(([identifier, paths]) => `${identifier}: ${paths.join('、')}`)
              .join('；')
            return failHost(
              `跨文件修改未闭合（${detail}）；已恢复本事务修改的 ${rollback.restored.length} 个文件。`,
              {
                rolledBack: rollback.failed.length === 0,
                rolledBackPaths: rollback.restored,
                rollbackFailures: rollback.failed,
                writtenPaths: rollback.failed.map((item) => item.path),
                filePatches: [],
                verified: false,
              },
            )
          }
          relatedFilesNudgeCount += 1
          const contexts = []
          for (const [identifier, paths] of unresolved) {
            for (const rel of paths.slice(0, 8)) {
              const read = await runTool('read_file', { path: rel, limit: 240 }, ctx)
              const readOk = read?.ok !== false
              toolTrace.push({
                tool: 'read_file',
                detail: 'auto-related-context',
                path: rel,
                args: { path: rel },
                ok: readOk,
                output: readOk ? undefined : String(read?.error || '').slice(0, 2000),
                exitCode: readOk ? 0 : 1,
              })
              if (readOk && read?.content) {
                contexts.push(`${identifier} 仍出现于 ${rel}：\n${String(read.content).slice(0, 5000)}`)
              }
            }
          }
          if (thought || thoughtRaw) messages.push({ role: 'assistant', content: thought || thoughtRaw })
          messages.push({
            role: 'user',
            content: [
              '【系统·跨文件事务未闭合】你已开始重命名，但同次检索命中仍有未处理的定义、导入或调用点。',
              ...contexts,
              '立即用 multi_edit 一次修改全部剩余文件，或逐个 search_replace；全部完成后再统一验证。不要只解释。',
            ].join('\n\n'),
          })
          forceToolsNext = true
          maxTurns = Math.min(
            MAX_TURNS + VERIFY_EXTRA_TURNS * VERIFY_REPAIR_MAX,
            Math.max(maxTurns, turn + 4),
          )
          continue
        }
        if (thought || thoughtRaw) {
          messages.push({ role: 'assistant', content: thought || thoughtRaw })
        }
        const transactionVerification = await verifyWriteTransaction()
        if (transactionVerification?.ok === false) {
          verifyRepairCount += 1
          if (verifyRepairCount >= VERIFY_REPAIR_MAX) {
            const rollback = await rollbackHostWrites(ctx)
            const rollbackNote = rollback.failed.length
              ? `已恢复 ${rollback.restored.length} 个文件，${rollback.failed.length} 个文件因外部变化未自动覆盖。`
              : `已恢复本事务修改的 ${rollback.restored.length} 个文件。`
            return failHost(
              `连续 ${VERIFY_REPAIR_MAX} 次事务验证失败；${rollbackNote}`,
              {
                rolledBack: rollback.failed.length === 0,
                rolledBackPaths: rollback.restored,
                rollbackFailures: rollback.failed,
                writtenPaths: rollback.failed.map((item) => item.path),
                filePatches: [],
                verified: false,
              },
            )
          }
          forceToolsNext = true
          maxTurns = Math.min(
            MAX_TURNS + VERIFY_EXTRA_TURNS * VERIFY_REPAIR_MAX,
            Math.max(maxTurns, turn + 4),
          )
          continue
        }
      }

      // 1) 最近一次写盘尚未验证成功：最多自动续修三轮，仍失败则恢复本轮写入。
      if (
        mode === 'agent' &&
        writtenPaths.size > 0 &&
        !ctx.verificationPassed &&
        verifyRepairCount < VERIFY_REPAIR_MAX &&
        verifyNudgeCount < VERIFY_REPAIR_MAX
      ) {
        verifyNudgeCount += 1
        forceToolsNext = true
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS * VERIFY_REPAIR_MAX,
          Math.max(maxTurns, turn + 1 + VERIFY_EXTRA_TURNS),
        )
        const failure = String(ctx.lastVerificationOutput || '').trim().slice(-4_000)
        if (thought || thoughtRaw) {
          messages.push({ role: 'assistant', content: thought || thoughtRaw })
        }
        messages.push({
          role: 'user',
          content: ctx.ranVerify
            ? [
                `【系统·自动修复 ${Math.max(1, verifyRepairCount)}/${VERIFY_REPAIR_MAX}】最近一次验证失败，任务尚未完成。`,
                failure ? `真实失败输出：\n${failure}` : '',
                '根据错误重新定位相关源码与现有测试；优先修改现有文件，禁止另建测试来绕过失败。修复后必须再次 run_tests（或运行原失败命令），直到成功。不要询问用户。',
              ].filter(Boolean).join('\n\n')
            : '【系统】你已改盘但尚未验证成功。立即调用 run_tests（或运行项目原有测试命令）；失败则根据真实输出修复并再次验证。不要询问用户。不要只输出计划。',
        })
        emit(ctx.ranVerify
          ? `\n⋯ 自动修复：验证失败，继续处理（${Math.max(1, verifyRepairCount)}/${VERIFY_REPAIR_MAX}）…\n`
          : '\n⋯ 系统催促：写盘后验证…\n')
        continue
      }

      if (mode === 'agent' && writtenPaths.size > 0 && !ctx.verificationPassed) {
        const rollback = await rollbackHostWrites(ctx)
        const rollbackNote = rollback.failed.length
          ? `已恢复 ${rollback.restored.length} 个文件，${rollback.failed.length} 个文件因外部变化未自动覆盖。`
          : `已恢复本轮修改的 ${rollback.restored.length} 个文件。`
        return failHost(
          `连续 ${VERIFY_REPAIR_MAX} 次自动修复后验证仍未通过；${rollbackNote}`,
          {
            rolledBack: rollback.failed.length === 0,
            rolledBackPaths: rollback.restored,
            rollbackFailures: rollback.failed,
            writtenPaths: rollback.failed.map((item) => item.path),
            filePatches: [],
            verified: false,
          },
        )
      }

      // 2) 零工具收尾 / 口述计划 / 征求确认：强制调工具
      const needTools =
        toolTrace.length === 0 ||
        ctx.editRecoveryPaths.size > 0 ||
        looksLikeToolIntent(thoughtRaw || thought) ||
        looksLikeAskingConfirmation(thoughtRaw || thought) ||
        (mode !== 'ask' && requireAppliedWrite && writtenPaths.size === 0)
      if (needTools && toolNudgeCount < TOOL_NUDGE_MAX) {
        toolNudgeCount += 1
        forceToolsNext = true
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS,
          Math.max(maxTurns, turn + 1 + VERIFY_EXTRA_TURNS),
        )
        messages.push({
          role: 'assistant',
          content: thought || thoughtRaw || '',
        })
        messages.push({
          role: 'user',
          content:
            ctx.editRecoveryPaths.size > 0
              ? `【系统·编辑恢复】任务尚未完成。立即 read_file 重新读取：${[...ctx.editRecoveryPaths].join('、')}；然后用精确 search_replace 或 write_file 重试并完成全部相关文件，最后统一 run_tests。不要只解释失败。`
              : mode === 'ask'
              ? '【系统】禁止只描述计划。立即用 tool calls：code_search 和/或 read_file（必要时 git_status）。禁止 grep/rg。'
              : [
                  '【系统】禁止征求确认或选择题。立即 tool calls：code_search→read_file→search_replace|write_file→run_tests。默认 memory:// 与 migrations；禁止 grep/rg 与正文大代码块。',
                ].filter(Boolean).join('\n'),
        })
        emit('\n⋯ 系统催促：必须调用工具…\n')
        continue
      }

      // 3) 已读未写（编辑任务）
      if (
        mode === 'agent' &&
        requireAppliedWrite &&
        readPaths.size > 0 &&
        writtenPaths.size === 0 &&
        !editNudgeUsed
      ) {
        editNudgeUsed = true
        forceToolsNext = true
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS,
          Math.max(maxTurns, turn + 1 + VERIFY_EXTRA_TURNS),
        )
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
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS,
          Math.max(maxTurns, turn + 1 + VERIFY_EXTRA_TURNS),
        )
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
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS,
          Math.max(maxTurns, turn + 1 + VERIFY_EXTRA_TURNS),
        )
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

      if (
        mode === 'agent' &&
        requireAppliedWrite &&
        writtenPaths.size === 0
      ) {
        return failHost('模型在自动执行后仍未产生任何文件修改，任务未完成。')
      }

      if (mode === 'ask') {
        const fallbackAnswer = deterministicSearchAnswer()
        if (fallbackAnswer) finalText = fallbackAnswer
      }
      const buildPassed =
        mode === 'agent' &&
        toolTrace.some((item) =>
          item?.ok !== false && item?.tool === 'run_command' && /build/i.test(String(item?.detail || '')),
        )
      if (buildPassed && (!String(finalText || '').trim() || !/(?:dist|build|out)\//i.test(finalText))) {
        const evidence = searchEvidenceText()
        finalText = [
          '构建已成功。',
          evidence ? `生成目录与关键产物依已读取的构建脚本为：\n${evidence}` : '',
        ].filter(Boolean).join('\n')
      }

      if (requestId) activeHost.delete(requestId)
      recordTelemetry('success')
      const checkpointId = persistTurnCheckpoint(ctx)
      await closeMcpRuntime()
      return finalizeHostResult({
        ok: true,
        content: finalText || '（无输出）',
        deferredWrites,
        writtenPaths: [...writtenPaths],
        filePatches: [...filePatches],
        toolTrace,
        turns: turnCount,
        mode,
        model: usedModel,
        backend: usedBackend,
        verified: ctx.verificationPassed,
        todos: [...ctx.todos],
        usage: usageSnapshot(),
        checkpointId,
      })
    }

    pushAssistantWithTools(messages, round, round.dialect)
    const results = []
    for (const call of calls) {
      if (cancelState.cancelled) break
      // 将 Cursor/常见本地模型的参数方言归一到 Host 内置工具，后续仍经过 schema、路径边界和原子事务检查。
      if (call.name === 'move_file' && call.args && typeof call.args === 'object') {
        if (call.args.from == null) call.args.from = call.args.source ?? call.args.src
        if (call.args.to == null) call.args.to = call.args.destination ?? call.args.dest ?? call.args.dst
      }
      if (call.name === 'write_file' && call.args && typeof call.args === 'object') {
        const oldString = call.args.old_string ?? call.args.before ?? call.args.search ?? call.args.search_pattern
        const newString = call.args.new_string ?? call.args.after ?? call.args.replace ?? call.args.replace_pattern
        if (
          call.args.content == null &&
          typeof oldString === 'string' &&
          typeof newString === 'string'
        ) {
          call.name = 'search_replace'
          call.args = {
            path: call.args.path ?? call.args.file ?? call.args.file_path,
            old_string: oldString,
            new_string: newString,
            ...(call.args.replaceAll ? { replaceAll: true } : {}),
          }
        }
      }
      if (call.name === 'search_replace' && call.args && typeof call.args === 'object') {
        const oldString = call.args.old_string ?? call.args.before ?? call.args.search ?? call.args.pattern ?? call.args.search_pattern
        const newString = call.args.new_string ?? call.args.after ?? call.args.replace ?? call.args.replacement ?? call.args.replace_pattern
        const filePaths = Array.isArray(call.args.files)
          ? call.args.files
          : Array.isArray(call.args.file_paths)
            ? call.args.file_paths
            : null
        if (filePaths && typeof oldString === 'string' && typeof newString === 'string') {
          call.name = 'multi_edit'
          call.args = {
            edits: filePaths.map((file) => ({
              path: String(file || ''),
              old_string: oldString,
              new_string: newString,
              ...(call.args.replaceAll ? { replaceAll: true } : {}),
            })),
          }
        } else {
          if (call.args.old_string == null && typeof oldString === 'string') call.args.old_string = oldString
          if (call.args.new_string == null && typeof newString === 'string') call.args.new_string = newString
          if (call.args.path == null) {
            const pathAlias = call.args.file ?? call.args.file_path
            if (typeof pathAlias === 'string') call.args.path = pathAlias
          }
        }
      }
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
      const argsCheck = toolCallProtocol.validateToolArguments(
        call.args,
        activeToolSchemas[call.name],
      )
      const recoveryTargets = mutationPaths(call)
        .map((candidate) => String(candidate || '').replace(/^[/\\]+/, '').replace(/\\/g, '/'))
        .filter(Boolean)
      const sameFileWriteFallback =
        call.name === 'write_file' &&
        recoveryTargets.length > 0 &&
        recoveryTargets.length === ctx.editRecoveryPaths.size &&
        recoveryTargets.every((rel) => {
          if (!ctx.editRecoveryPaths.has(rel)) return false
          const abs = resolveSafeHostPath(root, rel)
          if (!abs || !fs.existsSync(abs)) return false
          const expected = ctx.readSnapshots.get(rel)
          return Boolean(expected && expected === contentFingerprint(fs.readFileSync(abs, 'utf8')))
        })
      const recoveryBlocked =
        mode === 'agent' &&
        isHostMutationTool(call.name) &&
        ctx.editRecoveryPaths.size > 0 &&
        !sameFileWriteFallback
      const result = recoveryBlocked
        ? {
            ok: false,
            error: `上一次编辑失败后尚未重新读取真实文件：${[...ctx.editRecoveryPaths].join('、')}。请先 read_file，再重新编辑；不得改测试或其他文件绕过失败。`,
          }
        : argsCheck.ok
          ? await runTool(call.name, call.args, ctx)
          : { ok: false, argumentError: true, error: `工具「${call.name}」参数无效：${argsCheck.error}` }
      if (mode === 'agent' && call.name === 'read_file' && result?.ok) {
        const rel = String(call.args?.path || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
        ctx.editRecoveryPaths.delete(rel)
      }
      if (mode === 'agent' && isHostMutationTool(call.name) && result?.ok) {
        for (const rel of recoveryTargets) ctx.editRecoveryPaths.delete(rel)
      }
      if (
        mode === 'agent' &&
        !recoveryBlocked &&
        isHostMutationTool(call.name) &&
        result?.ok === false &&
        result?.argumentError !== true &&
        result?.preserveExisting !== true
      ) {
        for (const candidate of mutationPaths(call)) {
          const rel = String(candidate || '').replace(/^[/\\]+/, '').replace(/\\/g, '/')
          if (rel) ctx.editRecoveryPaths.add(rel)
        }
      }
      results.push(result)
      const fail = result?.ok === false
      if (fail) toolFailCount += 1
      const output =
        call.name === 'run_command' || call.name === 'run_tests'
          ? String(result?.output || result?.error || '').slice(0, 8000)
          : call.name === 'code_search' && result?.ok !== false
            ? JSON.stringify({
                ripgrep: (result?.ripgrep || []).slice(0, 10),
                semantic: (result?.semantic || []).slice(0, 5),
                graphFiles: (result?.graph?.files || []).slice(0, 10),
              }).slice(0, 4000)
          : fail
            ? String(result?.error || result?.output || '').slice(0, 4000)
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

    if (calls.some((call) => call.name === 'todo_write')) {
      maxTurns = plannedTurnLimit(maxTurns, ctx.todos.length)
    }

    const wroteThisRound = calls.some((call, index) =>
      isHostMutationTool(call.name) && results[index]?.ok !== false,
    )

    // 固定轮次不能在模型仍在获得新的真实工作区证据时把写入任务提前截断。
    // 只有成功且首次出现的只读调用才算进展；重复调用、失败调用和文本表态都不延长执行。
    if (mode === 'agent' && requireAppliedWrite && writtenPaths.size === 0) {
      calls.forEach((call, index) => {
        if (results[index]?.ok === false || isHostMutationTool(call.name) || call.name === 'todo_write') return
        const signature = contentFingerprint(JSON.stringify({ name: call.name, args: call.args }))
        if (prewriteEvidence.has(signature)) return
        prewriteEvidence.add(signature)
        prewriteProgressPending = true
      })
    }

    const failedEdits = calls
      .map((call, index) => ({ call, result: results[index] }))
      .filter(({ call, result }) =>
        isHostMutationTool(call?.name) &&
        result?.ok === false &&
        result?.argumentError !== true &&
        result?.preserveExisting !== true,
      )
    if (mode === 'agent' && requireAppliedWrite && failedEdits.length) {
      forceToolsNext = true
      maxTurns = Math.min(
        MAX_TURNS + VERIFY_EXTRA_TURNS * VERIFY_REPAIR_MAX,
        Math.max(maxTurns, turn + 4),
      )
      messages.push({
        role: 'user',
        content: [
          '【系统·编辑恢复】刚才的文件编辑没有成功，任务尚未完成。',
          ...failedEdits.map(({ call, result }) =>
            `${call.name}${call.args?.path ? ` ${call.args.path}` : ''}: ${String(result.error || '未知错误').slice(0, 1000)}`),
          '先 read_file 读取真实文件内容，再用精确的 search_replace 或 write_file 重试；写入后运行验证。不要只总结错误。',
        ].join('\n'),
      })
    }

    const lastTestFail = results.some(
      (r, i) =>
        (calls[i]?.name === 'run_tests' || calls[i]?.name === 'run_command') &&
        r &&
        r.ok === false &&
        typeof r.exitCode === 'number' &&
        r.exitCode !== 0,
    )
    if (lastTestFail && mode === 'agent') {
      // 用户常明确要求“先跑失败测试”用于定位。写盘前的预期失败是诊断证据，
      // 只有本事务已产生写入后的验证失败，才消耗三次修复上限。
      const failedAfterWrite = writtenPaths.size > 0
      if (failedAfterWrite) verifyRepairCount += 1
      if (failedAfterWrite && verifyRepairCount >= VERIFY_REPAIR_MAX) {
        const rollback = await rollbackHostWrites(ctx)
        const rollbackNote = rollback.failed.length
          ? `已恢复 ${rollback.restored.length} 个文件，${rollback.failed.length} 个文件因外部变化未自动覆盖。`
          : `已恢复本轮修改的 ${rollback.restored.length} 个文件。`
        return failHost(
          `连续 ${VERIFY_REPAIR_MAX} 次验证失败；${rollbackNote}`,
          {
            rolledBack: rollback.failed.length === 0,
            rolledBackPaths: rollback.restored,
            rollbackFailures: rollback.failed,
            writtenPaths: rollback.failed.map((item) => item.path),
            filePatches: [],
            verified: false,
          },
        )
      }
      forceToolsNext = true
      const failureOutput = results
        .map((result, index) =>
          (calls[index]?.name === 'run_tests' || calls[index]?.name === 'run_command') && result?.ok === false
            ? String(result?.output || result?.error || '')
            : '',
        )
        .filter(Boolean)
        .join('\n')
        .slice(-8_000)
      const failureContexts = []
      const queuedPaths = verificationFailureWorkspacePaths(failureOutput, root, 5)
      const seenPaths = new Set()
      while (queuedPaths.length && seenPaths.size < 8) {
        const rel = queuedPaths.shift()
        if (!rel || seenPaths.has(rel)) continue
        seenPaths.add(rel)
        const read = await runTool('read_file', { path: rel, limit: 260 }, ctx)
        const readOk = read?.ok !== false
        toolTrace.push({
          tool: 'read_file',
          detail: 'auto-failure-context',
          path: rel,
          args: { path: rel },
          ok: readOk,
          output: readOk ? undefined : String(read?.error || '').slice(0, 2000),
          exitCode: readOk ? 0 : 1,
        })
        if (!readOk || !read?.content) continue
        const content = String(read.content)
        failureContexts.push(`${rel}：\n${content.slice(0, 5000)}`)
        const gutterless = content
          .split(/\r?\n/)
          .map((line) => line.replace(/^\s*\d+\s*[|│]\s?/, ''))
          .join('\n')
        const importRe = /(?:from\s+|import\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g
        for (let match = importRe.exec(gutterless); match; match = importRe.exec(gutterless)) {
          const imported = path.posix.normalize(path.posix.join(path.posix.dirname(rel), match[1]))
          const candidates = path.posix.extname(imported)
            ? [imported]
            : [`${imported}.js`, `${imported}.ts`, path.posix.join(imported, 'index.js')]
          for (const candidate of candidates) {
            const abs = resolveSafeHostPath(root, candidate)
            if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile() && !seenPaths.has(candidate)) {
              queuedPaths.push(candidate)
              break
            }
          }
        }
      }
      const semanticHint =
        /actual\s*[:=]?\s*12[\s\S]{0,160}expected\s*[:=]?\s*0|12\s*!==\s*0/.test(failureOutput) &&
        failureContexts.some((context) => context.includes('Number.parseInt'))
          ? [
              '语义修复提示：`Number.parseInt("12x", 10)` 会接受前缀并返回 12，不适合“整串必须是合法整数”的要求。',
              '应先用 `Number(value)` 解析完整字符串，再用 `Number.isSafeInteger(parsed)` 判断；合法则返回 parsed，否则返回 0。',
            ].join('\n')
          : ''
      messages.push({
        role: 'user',
        content: [
          '【系统·失败命令修复】刚才的命令真实失败，已自动读取堆栈文件及其本地导入源文件。',
          failureOutput ? `失败输出：\n${failureOutput.slice(-5000)}` : '',
          verificationRepairHint(failureOutput, root),
          semanticHint,
          ...failureContexts,
          '按用户原要求修复源文件，不得通过修改测试绕过失败；修复后重新运行原命令。',
        ].filter(Boolean).join('\n\n'),
      })
      if (turn + 3 > maxTurns) {
        maxTurns = Math.min(
          MAX_TURNS + VERIFY_EXTRA_TURNS * VERIFY_REPAIR_MAX,
          Math.max(maxTurns, turn + 4),
        )
      }
    }

    if (
      mode === 'ask' &&
      calls.some((call) => call.name === 'code_search') &&
      [...ctx.codeSearchCounts.values()].some((count) => count >= 2)
    ) {
      forceToolsNext = false
      forcePlainAnswerNext = true
      messages.push({
        role: 'user',
        content: '【系统】已获得足够的全仓检索结果。下一回合禁止再调用工具；直接根据上述真实结果回答用户问题，包含文件路径和关键值。',
      })
    }

    /** 写盘本轮后若未跑 diagnostics，下一轮强制工具（诊断闭环） */
    const ranDiag = calls.some((c) => c.name === 'get_diagnostics')
    if (wroteThisRound && !ranDiag && mode === 'agent') {
      forceToolsNext = true
    }

    if (
      mode === 'agent' &&
      requireAppliedWrite &&
      writtenPaths.size === 0 &&
      prewriteProgressPending &&
      turn + 1 >= maxTurns &&
      maxTurns < PREWRITE_PROGRESS_MAX_TURNS
    ) {
      maxTurns = Math.min(PREWRITE_PROGRESS_MAX_TURNS, maxTurns + VERIFY_EXTRA_TURNS)
      prewriteProgressPending = false
      forceToolsNext = true
      const failures = recentToolFailureEvidence()
      messages.push({
        role: 'user',
        content: [
          '【系统·执行未完成】本轮刚获得了新的真实工作区证据，但用户要求的修改仍为零写入，不得因固定轮次提前结束。',
          failures ? `近期工具失败（真实返回）：${failures}` : '',
          '根据已读取的真实内容继续执行原任务；参数或编辑失败时按工具返回精确修正，不得猜测文件内容。',
        ].filter(Boolean).join('\n\n'),
      })
      emit(`\n⋯ 自动继续：检测到新的工作区证据且原任务仍未写入…\n`)
    }
  }

  if (mode === 'agent' && writtenPaths.size > 0 && !ctx.verificationPassed) {
    const rollback = await rollbackHostWrites(ctx)
    return failHost(
      `达到工具轮次上限时验证仍未通过；已恢复本轮修改的 ${rollback.restored.length} 个文件。`,
      {
        rolledBack: rollback.failed.length === 0,
        rolledBackPaths: rollback.restored,
        rollbackFailures: rollback.failed,
        writtenPaths: rollback.failed.map((item) => item.path),
        filePatches: [],
        verified: false,
      },
    )
  }
  if (
    mode === 'agent' &&
    requireAppliedWrite &&
    writtenPaths.size === 0
  ) {
    const failures = recentToolFailureEvidence()
    return failHost(
      `达到工具轮次上限，但任务未产生任何文件修改。${failures ? ` 最近失败证据：${failures}` : ''}`,
    )
  }
  if (mode === 'ask') {
    const fallbackAnswer = deterministicSearchAnswer()
    if (fallbackAnswer) finalText = fallbackAnswer
  }
  const buildPassedAtLimit =
    mode === 'agent' &&
    toolTrace.some((item) =>
      item?.ok !== false && item?.tool === 'run_command' && /build/i.test(String(item?.detail || '')),
    )
  if (buildPassedAtLimit && (!String(finalText || '').trim() || !/(?:dist|build|out)\//i.test(finalText))) {
    const evidence = searchEvidenceText()
    finalText = [
      '构建已成功。',
      evidence ? `生成目录与关键产物依已读取的构建脚本为：\n${evidence}` : '',
    ].filter(Boolean).join('\n')
  }
  if (requestId) activeHost.delete(requestId)
  recordTelemetry('truncated')
  const checkpointId = persistTurnCheckpoint(ctx)
  await closeMcpRuntime()
  return finalizeHostResult({
    ok: true,
    content: finalText || '（达到工具轮次上限）',
    deferredWrites,
    writtenPaths: [...writtenPaths],
    filePatches: [...filePatches],
    toolTrace,
    turns: turnCount,
    mode,
    model: usedModel,
    backend: usedBackend,
    verified: ctx.verificationPassed,
    todos: [...ctx.todos],
    usage: usageSnapshot(),
    truncated: true,
    checkpointId,
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
