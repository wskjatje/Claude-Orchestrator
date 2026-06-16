/**
 * 解析 Claude Code `--output-format stream-json` NDJSON，转为聊天 UI 可展示的 Markdown 增量。
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

function normalizeToolName(name) {
  const n = String(name || '').trim()
  if (!n) return 'Tool'
  if (n === 'Explored' || n === 'Search') return 'Grep'
  return n
}

function formatToolLine(name, arg) {
  const tool = normalizeToolName(name)
  const detail = String(arg || '').trim().replace(/^[`'"]|[`'"]$/g, '')
  return detail ? `${tool} ${detail}` : tool
}

function extractToolArg(input) {
  if (input == null) return ''
  if (typeof input === 'string') return input.trim()
  if (typeof input === 'object') {
    return (
      input.file_path ||
      input.path ||
      input.pattern ||
      input.command ||
      input.url ||
      input.query ||
      input.description ||
      JSON.stringify(input).slice(0, 240)
    )
  }
  return String(input)
}

/**
 * @typedef {object} StreamDisplayState
 * @property {string} display
 * @property {string} [thinkingOpen]
 * @property {Set<string>} seenTools
 * @property {string} [lastTextTail]
 */

/** @returns {StreamDisplayState} */
export function createStreamDisplayState() {
  return {
    display: '',
    thinkingOpen: undefined,
    seenTools: new Set(),
    lastTextTail: '',
  }
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

  if (type === 'assistant' && ev.message?.content) {
    for (const block of ev.message.content) {
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
        }
      } else if (kind === 'tool_use') {
        const key = `${block.name}:${JSON.stringify(block.input || {})}`
        if (!state.seenTools.has(key)) {
          state.seenTools.add(key)
          state.display += `\n\n${formatToolLine(block.name, extractToolArg(block.input))}\n`
        }
      }
    }
    return state.display.slice(before)
  }

  if (type === 'tool_use' || type === 'tool_use_summary') {
    const name = ev.name || ev.tool_name || ev.tool
    const arg = extractToolArg(ev.input ?? ev.args ?? ev.parameters)
    const key = `${name}:${arg}`
    if (!state.seenTools.has(key)) {
      state.seenTools.add(key)
      state.display += `\n\n${formatToolLine(name, arg)}\n`
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
        state.display += `\n\n${formatToolLine(name, arg)} · running\n`
      }
    }
    return state.display.slice(before)
  }

  if (type === 'result' && typeof ev.result === 'string' && !state.display.trim()) {
    state.display = ev.result
    return state.display.slice(before)
  }

  return state.display.slice(before)
}

/** 收尾：关闭未闭合 thinking 块 */
export function finalizeStreamDisplay(state) {
  const before = state.display.length
  if (state.thinkingOpen) {
    state.display += '\n</thinking>\n\n'
    state.thinkingOpen = undefined
  }
  return state.display.slice(before)
}
