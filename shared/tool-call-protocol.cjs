'use strict'

function asObjectArguments(raw) {
  if (raw == null) return {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function knownNameSet(knownNames) {
  if (knownNames instanceof Set) return knownNames
  if (Array.isArray(knownNames)) return new Set(knownNames.map((x) => String(x || '').trim()).filter(Boolean))
  return null
}

function normalizeToolCalls(raw, knownNames) {
  if (!Array.isArray(raw)) return []
  const known = knownNameSet(knownNames)
  const out = []
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i]
    if (!item || typeof item !== 'object') continue
    const source = item
    const fn = source.function && typeof source.function === 'object' ? source.function : source
    const name = String(fn.name || '').trim()
    if (!name || (known && !known.has(name))) continue
    const args = asObjectArguments(fn.arguments ?? fn.args ?? fn.parameters)
    if (!args) continue
    out.push({
      id: typeof source.id === 'string' && source.id.trim() ? source.id.trim() : `call_${out.length}`,
      type: typeof source.type === 'string' ? source.type : 'function',
      function: { name, arguments: args },
    })
  }
  return out
}

function stringifyContent(content) {
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (!part || typeof part !== 'object') return String(part ?? '')
      return typeof part.text === 'string' ? part.text : ''
    }).join('')
  }
  if (content == null) return ''
  return typeof content === 'string' ? content : String(content)
}

function findJsonPayloads(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  const action = !fenced && trimmed.match(
    /^Thought[:：]\s*[\s\S]*?\nAction[:：]\s*([\s\S]*?)```(?:json)?\s*([\s\S]*?)```\s*$/i,
  )
  const source = (fenced ? fenced[1] : action ? action[2] : trimmed).trim()
  if (!fenced && !action && !/^[\[{]/.test(source)) return null
  if (!source || !/^[\[{]/.test(source)) return null
  const documents = []
  let cursor = 0
  while (cursor < source.length) {
    while (/\s/.test(source[cursor] || '')) cursor += 1
    if (cursor >= source.length) break
    const start = cursor
    const stack = []
    let inString = false
    let escaped = false
    for (; cursor < source.length; cursor += 1) {
      const ch = source[cursor]
      if (inString) {
        if (escaped) escaped = false
        else if (ch === '\\') escaped = true
        else if (ch === '"') inString = false
        continue
      }
      if (ch === '"') {
        inString = true
        continue
      }
      if (ch === '{' || ch === '[') stack.push(ch)
      else if (ch === '}' || ch === ']') {
        const open = stack.pop()
        if ((ch === '}' && open !== '{') || (ch === ']' && open !== '[')) return null
        if (!stack.length) {
          cursor += 1
          break
        }
      }
    }
    if (inString || stack.length || cursor <= start) return null
    try {
      const value = JSON.parse(source.slice(start, cursor))
      if (!value || typeof value !== 'object') return null
      documents.push(value)
      if (documents.length > 64) return null
    } catch {
      return null
    }
  }
  return documents.length ? documents : null
}

function extractEmbeddedToolCalls(content, knownNames) {
  const documents = findJsonPayloads(stringifyContent(content))
  if (!documents) return []
  const rawCalls = []
  for (const parsed of documents) {
    if (Array.isArray(parsed)) rawCalls.push(...parsed)
    else if (Array.isArray(parsed.tool_calls)) rawCalls.push(...parsed.tool_calls)
    else if (parsed.function && typeof parsed.function === 'object') rawCalls.push(parsed)
    else if (typeof parsed.name === 'string') rawCalls.push(parsed)
    else return []
  }
  if (!rawCalls.length) return []
  const calls = normalizeToolCalls(rawCalls, knownNames)
  return calls.length === rawCalls.length ? calls : []
}

/**
 * 仅修复一种受控的本地模型格式：完整回复只包含 name/arguments，
 * 但漏掉最外层或 arguments 的花括号。禁止夹带说明文字与未知工具。
 */
function extractRepairableFlatToolCall(content, knownNames) {
  let source = stringifyContent(content).trim()
  const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  if (fenced) source = fenced[1].trim()
  if (!source || /^[{[]/.test(source)) return []
  const match = source.match(
    /^"?name"?\s*:\s*"([A-Za-z0-9_.:-]+)"\s*,\s*"?arguments"?\s*:\s*([\s\S]+)$/,
  )
  if (!match) return []
  const known = knownNameSet(knownNames)
  const name = match[1]
  if (known && !known.has(name)) return []
  const raw = match[2].trim()
  const candidates = [raw, `{${raw}}`]
  if (raw.endsWith('}')) candidates.push(`{${raw}`)
  for (const candidate of candidates) {
    try {
      const args = JSON.parse(candidate)
      if (!args || typeof args !== 'object' || Array.isArray(args)) continue
      return normalizeToolCalls([{ name, arguments: args }], knownNames)
    } catch {
      // try the next strictly bounded brace repair
    }
  }
  return []
}

function parseAssistantToolMessage(data, knownNames) {
  const rawMessage = data?.message && typeof data.message === 'object'
    ? data.message
    : null
  if (!rawMessage) return null
  const message = { ...rawMessage }
  let toolCalls = normalizeToolCalls(message.tool_calls, knownNames)
  let protocol = toolCalls.length ? 'native' : 'none'
  if (!toolCalls.length) {
    toolCalls = extractEmbeddedToolCalls(message.content, knownNames)
    if (toolCalls.length) {
      protocol = 'content-json'
      message.content = ''
    }
  }
  if (!toolCalls.length) {
    toolCalls = extractRepairableFlatToolCall(message.content, knownNames)
    if (toolCalls.length) {
      protocol = 'content-json-repaired'
      message.content = ''
    }
  }
  if (!toolCalls.length && Array.isArray(data?.choices) && data.choices[0]?.message) {
    const alternate = data.choices[0].message
    toolCalls = normalizeToolCalls(alternate.tool_calls, knownNames)
    protocol = toolCalls.length ? 'native' : 'none'
    if (!toolCalls.length) {
      toolCalls = extractEmbeddedToolCalls(alternate.content, knownNames)
      if (toolCalls.length) protocol = 'content-json'
    }
    if (!toolCalls.length) {
      toolCalls = extractRepairableFlatToolCall(alternate.content, knownNames)
      if (toolCalls.length) protocol = 'content-json-repaired'
    }
    if (toolCalls.length) message.content = ''
  }
  message.tool_calls = toolCalls.map((call) => ({
    id: call.id,
    type: 'function',
    function: {
      name: call.function.name,
      arguments: JSON.stringify(call.function.arguments),
    },
  }))
  return { message, toolCalls, protocol }
}

function validateToolArguments(args, schema) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return { ok: false, error: '工具参数必须是 JSON 对象。' }
  }
  if (!schema || typeof schema !== 'object') return { ok: true }
  const properties = schema.properties && typeof schema.properties === 'object' ? schema.properties : {}
  for (const key of Array.isArray(schema.required) ? schema.required : []) {
    if (!Object.prototype.hasOwnProperty.call(args, key)) {
      return { ok: false, error: `缺少必填参数「${key}」。` }
    }
  }
  for (const [key, value] of Object.entries(args)) {
    const expected = properties[key]?.type
    if (!expected) continue
    const valid = expected === 'string' ? typeof value === 'string'
      : expected === 'number' ? typeof value === 'number' && Number.isFinite(value)
        : expected === 'integer' ? Number.isInteger(value)
          : expected === 'boolean' ? typeof value === 'boolean'
            : expected === 'array' ? Array.isArray(value)
              : expected === 'object' ? Boolean(value && typeof value === 'object' && !Array.isArray(value))
                : true
    if (!valid) return { ok: false, error: `参数「${key}」类型错误，应为 ${expected}。` }
  }
  return { ok: true }
}

module.exports = {
  normalizeToolCalls,
  extractEmbeddedToolCalls,
  extractRepairableFlatToolCall,
  parseAssistantToolMessage,
  validateToolArguments,
}
