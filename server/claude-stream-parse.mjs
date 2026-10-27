/**
 * 解析 Claude Code `--output-format stream-json` NDJSON，转为聊天 UI 可展示的 Markdown 增量，
 * 并保留结构化 events 供步骤时间线使用。
 */

const TOOL_NAMES = new Set([
  'Read',
  'Glob',
  'Grep',
  'Edit',
  'Write',
  'MultiEdit',
  'Bash',
  'WebFetch',
  'WebSearch',
  'Task',
  'Agent',
])

const FILE_EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit'])

const STREAM_EVENTS_BEGIN = '<<<stream-events>>>'
const STREAM_EVENTS_END = '<<<end-stream-events>>>'

function normalizeToolName(name) {
  const n = String(name || '').trim()
  if (!n) return 'Tool'
  if (n === 'Explored' || n === 'Search') return 'Grep'
  return n
}

/** 短轨迹行：⋯ Read · path（对齐 Host Agent ） */
function formatToolLine(name, arg) {
  const tool = normalizeToolName(name)
  let detail = String(arg || '').trim().replace(/^[`'"]|[`'"]$/g, '')
  if (tool === 'Bash' || tool === 'bash') {
    detail = detail.replace(/\s+/g, ' ').slice(0, 80)
  } else {
    detail = detail.slice(0, 120)
  }
  return detail ? `⋯ ${tool} · ${detail}` : `⋯ ${tool}`
}

function extractToolArg(input) {
  if (input == null) return ''
  if (typeof input === 'string') return input.trim().slice(0, 200)
  if (typeof input === 'object') {
    const raw =
      input.file_path ||
      input.path ||
      input.pattern ||
      input.command ||
      input.url ||
      input.query ||
      input.description ||
      JSON.stringify(input).slice(0, 200)
    return String(raw || '').trim()
  }
  return String(input).slice(0, 200)
}

function extractToolPath(input) {
  if (!input || typeof input !== 'object') return ''
  const p = input.file_path || input.path || ''
  return String(p || '').trim().replace(/\\/g, '/')
}

const MAX_TOOL_OUTPUT = 8000

/**
 * @typedef {object} StreamAgentEvent
 * @property {'thinking'|'tool'|'text'} type
 * @property {string} [name]
 * @property {string} [arg]
 * @property {'running'|'ok'|'fail'} [status]
 * @property {string} [path]
 * @property {string} [output]
 * @property {string} [toolUseId]
 */

/**
 * @typedef {object} StreamUsage
 * @property {number} prompt_tokens
 * @property {number} completion_tokens
 * @property {number} total_tokens
 */

/**
 * @typedef {object} StreamDisplayState
 * @property {string} display
 * @property {string} [thinkingOpen]
 * @property {Set<string>} seenTools
 * @property {string} [lastTextTail]
 * @property {StreamAgentEvent[]} events
 * @property {boolean} eventsFlushed
 * @property {Map<string, { name: string, arg: string }>} toolUseById
 * @property {StreamUsage | null} [usage] 仅当 NDJSON 带实参时写入，禁止字符粗估
 */

/** @returns {StreamDisplayState} */
export function createStreamDisplayState() {
  return {
    display: '',
    thinkingOpen: undefined,
    seenTools: new Set(),
    lastTextTail: '',
    events: [],
    eventsFlushed: false,
    toolUseById: new Map(),
    usage: null,
  }
}

/**
 * 从 Claude Code stream-json / transcript 形态抽取 usage（与 claude-projects 字段同源）。
 * 无有效数字则返回 null，禁止用 0 或估算冒充。
 * @param {unknown} raw
 * @returns {StreamUsage | null}
 */
export function extractClaudeStreamUsage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const u = /** @type {Record<string, unknown>} */ (raw)
  const prompt = Math.floor(
    Number(u.input_tokens ?? u.prompt_tokens ?? 0),
  )
  const completion = Math.floor(
    Number(u.output_tokens ?? u.completion_tokens ?? 0),
  )
  if (!(prompt > 0 || completion > 0)) return null
  const total = Math.floor(Number(u.total_tokens) || prompt + completion)
  return {
    prompt_tokens: Math.max(0, prompt),
    completion_tokens: Math.max(0, completion),
    total_tokens: Math.max(0, total),
  }
}

/** @param {StreamDisplayState} state @param {unknown} raw */
function rememberStreamUsage(state, raw) {
  const next = extractClaudeStreamUsage(raw)
  if (next) state.usage = next
}

/**
 * 从 tool_result / content 块抽出可回显正文（兼容多版 Claude Code NDJSON）。
 * 导出供闸门脚本直接测。
 * @param {unknown} raw
 */
export function extractToolResultOutput(raw) {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw.slice(0, MAX_TOOL_OUTPUT)
  if (Array.isArray(raw)) {
    const parts = []
    for (const block of raw) {
      if (typeof block === 'string') {
        parts.push(block)
      } else if (block && typeof block === 'object') {
        const t = String(block.type || '')
        if (typeof block.text === 'string') parts.push(block.text)
        else if (typeof block.content === 'string') parts.push(block.content)
        else if (t === 'text' && typeof block.text === 'string') parts.push(block.text)
        else if (typeof block.stdout === 'string' || typeof block.stderr === 'string') {
          const out = [block.stdout, block.stderr].filter(Boolean).join('\n')
          if (out) parts.push(out)
        } else if (block.content != null) {
          const nested = extractToolResultOutput(block.content)
          if (nested) parts.push(nested)
        }
      }
      if (parts.join('\n').length >= MAX_TOOL_OUTPUT) break
    }
    return parts.join('\n').slice(0, MAX_TOOL_OUTPUT)
  }
  if (typeof raw === 'object') {
    if (typeof raw.stdout === 'string' || typeof raw.stderr === 'string') {
      return [raw.stdout, raw.stderr].filter(Boolean).join('\n').slice(0, MAX_TOOL_OUTPUT)
    }
    if (typeof raw.output === 'string') return raw.output.slice(0, MAX_TOOL_OUTPUT)
    if (typeof raw.result === 'string') return raw.result.slice(0, MAX_TOOL_OUTPUT)
    if (typeof raw.text === 'string') return raw.text.slice(0, MAX_TOOL_OUTPUT)
    if (typeof raw.content === 'string') return raw.content.slice(0, MAX_TOOL_OUTPUT)
    if (raw.content != null) return extractToolResultOutput(raw.content)
  }
  const s = String(raw)
  // 避免把 [object Object] 当输出
  if (s === '[object Object]') return ''
  return s.slice(0, MAX_TOOL_OUTPUT)
}

/**
 * @param {StreamDisplayState} state
 * @param {string} name
 * @param {string} arg
 * @param {'running'|'ok'|'fail'} [status]
 * @param {{ path?: string, output?: string, toolUseId?: string }} [extra]
 */
function pushToolEvent(state, name, arg, status = 'ok', extra = {}) {
  const tool = normalizeToolName(name)
  const detail = String(arg || '').trim().replace(/^[`'"]|[`'"]$/g, '')
  const path =
    extra.path ||
    (FILE_EDIT_TOOLS.has(tool) && /\.\w+$/.test(detail) ? detail : undefined)
  const output = extra.output != null ? String(extra.output).slice(0, MAX_TOOL_OUTPUT) : undefined
  const toolUseId = extra.toolUseId ? String(extra.toolUseId) : undefined

  if (toolUseId && status !== 'running') {
    const byId = state.events.find(
      (e) => e.type === 'tool' && e.toolUseId === toolUseId && e.status === 'running',
    )
    if (byId) {
      byId.status = status
      if (path) byId.path = path
      if (output) byId.output = output
      if (detail && !byId.arg) byId.arg = detail
      return
    }
  }

  const last = state.events[state.events.length - 1]
  if (
    last &&
    last.type === 'tool' &&
    last.name === tool &&
    (last.arg || '') === detail &&
    last.status === 'running' &&
    status !== 'running'
  ) {
    last.status = status
    if (path) last.path = path
    if (output) last.output = output
    return
  }

  // Bash 结果常缺 name/arg：挂到最近 running 的 Bash
  if (
    status !== 'running' &&
    (!tool || tool === 'Tool') &&
    output
  ) {
    for (let i = state.events.length - 1; i >= 0; i--) {
      const e = state.events[i]
      if (e.type === 'tool' && e.status === 'running' && /^(Bash|Ran)$/i.test(String(e.name || ''))) {
        e.status = status
        e.output = output
        return
      }
    }
  }

  if (
    status !== 'running' &&
    /^(Bash|Ran)$/i.test(tool) &&
    output &&
    (!detail || detail === '')
  ) {
    for (let i = state.events.length - 1; i >= 0; i--) {
      const e = state.events[i]
      if (e.type === 'tool' && e.status === 'running' && /^(Bash|Ran)$/i.test(String(e.name || ''))) {
        e.status = status
        e.output = output
        return
      }
    }
  }

  state.events.push({
    type: 'tool',
    name: tool,
    arg: detail || undefined,
    status,
    path,
    ...(output ? { output } : {}),
    ...(toolUseId ? { toolUseId } : {}),
  })
}

/**
 * 将单行 NDJSON 事件追加到 display，返回本次新增文本（可能为空）。
 * @param {string} line
 * @param {StreamDisplayState} state
 */
export function appendStreamJsonLine(line, state) {
  const before = state.display.length
  let ev
  try {
    ev = JSON.parse(line)
  } catch {
    return ''
  }
  if (!ev || typeof ev !== 'object') return ''

  const type = String(ev.type || '')

  if (type === 'stream_event') {
    const delta = ev.event?.delta
    const deltaType = String(delta?.type || '')
    if (deltaType === 'text_delta' && typeof delta.text === 'string') {
      state.display += delta.text
    } else if (
      (deltaType === 'thinking_delta' || deltaType === 'reasoning_delta') &&
      typeof delta.text === 'string'
    ) {
      if (!state.thinkingOpen) {
        state.display += '\n\n<thinking>\n'
        state.thinkingOpen = 'stream'
        state.events.push({ type: 'thinking' })
      }
      state.display += delta.text
    }
    return state.display.slice(before)
  }

  if (type === 'content_block_delta') {
    const delta = ev.delta
    const deltaType = String(delta?.type || '')
    if (deltaType === 'text_delta' && typeof delta.text === 'string') {
      state.display += delta.text
    } else if (
      (deltaType === 'thinking_delta' || deltaType === 'reasoning_delta') &&
      typeof delta.text === 'string'
    ) {
      if (!state.thinkingOpen) {
        state.display += '\n\n<thinking>\n'
        state.thinkingOpen = 'stream'
        state.events.push({ type: 'thinking' })
      }
      state.display += delta.text
    }
    return state.display.slice(before)
  }

  if (type === 'content_block_stop' && state.thinkingOpen === 'stream') {
    state.display += '\n</thinking>\n\n'
    state.thinkingOpen = undefined
    return state.display.slice(before)
  }

  if (type === 'assistant' && ev.message) {
    if (ev.message.usage) rememberStreamUsage(state, ev.message.usage)
    else if (ev.usage) rememberStreamUsage(state, ev.usage)
    const content = ev.message.content
    if (Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== 'object') continue
        const kind = String(block.type || '')
        if (kind === 'text' && typeof block.text === 'string') {
          const text = block.text
          if (text.startsWith(state.lastTextTail)) {
            state.display += text.slice(state.lastTextTail.length)
          } else if (!state.display.includes(text)) {
            state.display += text
          }
          state.lastTextTail = text
        } else if (kind === 'thinking' && typeof block.thinking === 'string') {
          if (!state.display.includes(block.thinking)) {
            state.display += `\n\n<thinking>\n${block.thinking}\n</thinking>\n\n`
            state.events.push({ type: 'thinking' })
          }
        } else if (kind === 'tool_use') {
          const key = `${block.name}:${JSON.stringify(block.input || {})}`
          if (!state.seenTools.has(key)) {
            state.seenTools.add(key)
            const arg = extractToolArg(block.input)
            const path = extractToolPath(block.input)
            const toolUseId = block.id ? String(block.id) : undefined
            if (toolUseId) {
              state.toolUseById.set(toolUseId, { name: String(block.name || ''), arg: path || arg })
            }
            state.display += `\n${formatToolLine(block.name, arg)}…\n`
            // 工具开始时标 running；ok/fail 等 tool_result（finalize 仍会把遗留 running 收成 ok）
            pushToolEvent(state, block.name, path || arg, 'running', { path: path || undefined, toolUseId })
          }
        }
      }
    }
    return state.display.slice(before)
  }

  // user 消息里的 tool_result（Claude Code stream-json 常见）
  if (type === 'user' && ev.message?.content) {
    for (const block of ev.message.content) {
      if (!block || typeof block !== 'object') continue
      if (String(block.type || '') !== 'tool_result') continue
      const toolUseId = block.tool_use_id ? String(block.tool_use_id) : undefined
      const meta = toolUseId ? state.toolUseById.get(toolUseId) : null
      const name = meta?.name || block.tool_name || block.name || 'Bash'
      const arg = meta?.arg || extractToolArg(block.input ?? block.args)
      const output = extractToolResultOutput(block.content ?? block.output ?? block.result)
      const fail = Boolean(block.is_error)
      pushToolEvent(state, name, arg, fail ? 'fail' : 'ok', { output: output || undefined, toolUseId })
    }
    return state.display.slice(before)
  }

  if (type === 'tool_use' || type === 'tool_use_summary') {
    const name = ev.name || ev.tool_name || ev.tool
    const arg = extractToolArg(ev.input ?? ev.args ?? ev.parameters)
    const toolUseId = ev.id || ev.tool_use_id ? String(ev.id || ev.tool_use_id) : undefined
    const key = `${name}:${arg}`
    if (!state.seenTools.has(key)) {
      state.seenTools.add(key)
      if (toolUseId) state.toolUseById.set(toolUseId, { name: String(name || ''), arg })
      state.display += `\n${formatToolLine(name, arg)}…\n`
      pushToolEvent(state, name, arg, 'running', { toolUseId })
    }
    return state.display.slice(before)
  }

  if (type === 'tool_progress' || type === 'tool_start') {
    const name = ev.tool_name || ev.name
    const arg = extractToolArg(ev.input ?? ev.message ?? ev.detail)
    if (name && TOOL_NAMES.has(normalizeToolName(name))) {
      const key = `progress:${name}:${arg}`
      if (!state.seenTools.has(key)) {
        state.seenTools.add(key)
        state.display += `\n${formatToolLine(name, arg)}…\n`
        pushToolEvent(state, name, arg, 'running')
      }
    }
    return state.display.slice(before)
  }

  if (type === 'tool_result' || type === 'tool_finished' || type === 'tool_end') {
    const toolUseId = ev.tool_use_id || ev.toolUseId ? String(ev.tool_use_id || ev.toolUseId) : undefined
    const meta = toolUseId ? state.toolUseById.get(toolUseId) : null
    const name = ev.tool_name || ev.name || ev.tool || meta?.name || 'Bash'
    const arg = extractToolArg(ev.input ?? ev.args ?? ev.parameters ?? ev.message) || meta?.arg || ''
    const output = extractToolResultOutput(
      ev.content ??
        ev.result ??
        ev.output ??
        ev.message?.content ??
        (ev.stdout != null || ev.stderr != null
          ? { stdout: ev.stdout, stderr: ev.stderr }
          : undefined),
    )
    pushToolEvent(state, name, arg, ev.is_error ? 'fail' : 'ok', {
      output: output || undefined,
      toolUseId,
    })
    return state.display.slice(before)
  }

  // content_block 形态的 tool_result（部分 stream-json 变体）
  if (type === 'content_block_start' && ev.content_block?.type === 'tool_result') {
    const block = ev.content_block
    const toolUseId = block.tool_use_id ? String(block.tool_use_id) : undefined
    const meta = toolUseId ? state.toolUseById.get(toolUseId) : null
    const name = meta?.name || block.tool_name || 'Bash'
    const output = extractToolResultOutput(block.content ?? block.output)
    pushToolEvent(state, name, meta?.arg || '', block.is_error ? 'fail' : 'ok', {
      output: output || undefined,
      toolUseId,
    })
    return state.display.slice(before)
  }

  if (type === 'result') {
    if (ev.usage) rememberStreamUsage(state, ev.usage)
    else if (ev.message?.usage) rememberStreamUsage(state, ev.message.usage)
    if (typeof ev.result === 'string' && !state.display.trim()) {
      state.display = ev.result
      return state.display.slice(before)
    }
    return state.display.slice(before)
  }

  return state.display.slice(before)
}

/** 收尾：关闭未闭合 thinking 块，并追加结构化 events 块 */
export function finalizeStreamDisplay(state) {
  const before = state.display.length
  if (state.thinkingOpen) {
    state.display += '\n</thinking>\n\n'
    state.thinkingOpen = undefined
  }
  for (const e of state.events) {
    if (e.type === 'tool' && e.status === 'running') e.status = 'ok'
  }
  if (!state.eventsFlushed && state.events.length > 0) {
    state.display += `\n\n${STREAM_EVENTS_BEGIN}\n${JSON.stringify(state.events)}\n${STREAM_EVENTS_END}\n`
    state.eventsFlushed = true
  }
  return state.display.slice(before)
}
