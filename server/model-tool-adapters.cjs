'use strict'

function parseArguments(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch { return {} }
  }
  return {}
}

function textContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((part) => String(part?.text || '')).join('')
  return ''
}

function appendMessage(messages, role, content) {
  const last = messages[messages.length - 1]
  if (last?.role === role) last.content.push(...content)
  else messages.push({ role, content })
}

function appendGeminiContent(contents, role, parts) {
  const last = contents[contents.length - 1]
  if (last?.role === role) last.parts.push(...parts)
  else contents.push({ role, parts })
}

function toAnthropicRequest(messages, tools, toolChoice, model) {
  const system = messages.filter((m) => m?.role === 'system').map((m) => textContent(m.content)).filter(Boolean).join('\n\n')
  const out = []
  for (const message of messages) {
    if (!message || message.role === 'system') continue
    if (message.role === 'tool') {
      appendMessage(out, 'user', [{
        type: 'tool_result',
        tool_use_id: String(message.tool_call_id || ''),
        content: String(message.content || ''),
      }])
      continue
    }
    const role = message.role === 'assistant' ? 'assistant' : 'user'
    const blocks = []
    const text = textContent(message.content)
    if (text) blocks.push({ type: 'text', text })
    if (role === 'assistant' && Array.isArray(message.tool_calls)) {
      for (const call of message.tool_calls) {
        const fn = call?.function || {}
        if (!fn.name) continue
        blocks.push({
          type: 'tool_use',
          id: String(call.id || `call_${blocks.length}`),
          name: String(fn.name),
          input: parseArguments(fn.arguments),
        })
      }
    }
    appendMessage(out, role, blocks.length ? blocks : [{ type: 'text', text: '' }])
  }
  return {
    model,
    max_tokens: 4096,
    ...(system ? { system } : {}),
    messages: out,
    tools: tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    })),
    tool_choice: { type: toolChoice === 'required' ? 'any' : 'auto' },
    stream: true,
  }
}

function toGeminiRequest(messages, tools, toolChoice) {
  const system = messages.filter((m) => m?.role === 'system').map((m) => textContent(m.content)).filter(Boolean).join('\n\n')
  const contents = []
  for (const message of messages) {
    if (!message || message.role === 'system') continue
    if (message.role === 'tool') {
      appendGeminiContent(contents, 'user', [{ functionResponse: {
          ...(message.tool_call_id ? { id: String(message.tool_call_id) } : {}),
          name: String(message.tool_name || 'tool'),
          response: { output: String(message.content || '') },
        } }])
      continue
    }
    const role = message.role === 'assistant' ? 'model' : 'user'
    const parts = []
    const text = textContent(message.content)
    if (text) parts.push({ text })
    if (role === 'model' && Array.isArray(message.tool_calls)) {
      for (const call of message.tool_calls) {
        const fn = call?.function || {}
        if (fn.name) parts.push({ functionCall: { name: String(fn.name), args: parseArguments(fn.arguments) } })
      }
    }
    if (parts.length) appendGeminiContent(contents, role, parts)
  }
  return {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
    tools: [{ functionDeclarations: tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    })) }],
    toolConfig: { functionCallingConfig: { mode: toolChoice === 'required' ? 'ANY' : 'AUTO' } },
  }
}

function normalizeAnthropicResponse(data) {
  const blocks = Array.isArray(data?.content) ? data.content : []
  return {
    role: 'assistant',
    content: blocks.filter((block) => block?.type === 'text').map((block) => String(block.text || '')).join(''),
    tool_calls: blocks.filter((block) => block?.type === 'tool_use').map((block, index) => ({
      id: String(block.id || `call_${index}`),
      type: 'function',
      function: { name: String(block.name || ''), arguments: block.input || {} },
    })),
  }
}

function normalizeGeminiResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts
  const list = Array.isArray(parts) ? parts : []
  const calls = list.filter((part) => part?.functionCall?.name)
  return {
    role: 'assistant',
    content: list.map((part) => String(part?.text || '')).join(''),
    nativeCallIds: calls.map((part) => String(part.functionCall.id || '')),
    tool_calls: calls.map((part, index) => ({
      id: String(part.functionCall.id || `call_${index}`),
      type: 'function',
      function: { name: String(part.functionCall.name), arguments: part.functionCall.args || {} },
    })),
  }
}

function normalizeNativeUsage(data, dialect) {
  const raw = dialect === 'anthropic' ? data?.usage : data?.usageMetadata
  if (!raw || typeof raw !== 'object') return null
  const prompt = Number(
    dialect === 'anthropic' ? raw.input_tokens : raw.promptTokenCount,
  ) || 0
  const completion = Number(
    dialect === 'anthropic' ? raw.output_tokens : raw.candidatesTokenCount,
  ) || 0
  const total = Number(raw.totalTokenCount) || prompt + completion
  return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: total }
}

async function readNativeStream(response, dialect, opts = {}) {
  const normalize = dialect === 'anthropic' ? normalizeAnthropicResponse : normalizeGeminiResponse
  const contentType = response.headers.get('content-type') || ''
  if (/application\/json/i.test(contentType)) {
    const data = await response.json()
    const message = normalize(data)
    const streamed = Boolean(message.content && typeof opts.onDelta === 'function')
    if (streamed) opts.onDelta(message.content)
    return { message, streamed, usage: normalizeNativeUsage(data, dialect) }
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error(`${dialect} 流式响应缺少 response body`)
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let streamed = false
  const calls = new Map()
  let currentBlock = null
  let pendingEvent = ''
  let usage = null
  const emitText = (chunk) => {
    if (!chunk) return
    text += chunk
    if (typeof opts.onDelta === 'function') {
      opts.onDelta(chunk)
      streamed = true
    }
  }
  const processData = (raw, eventName = '') => {
    if (!raw || raw === '[DONE]') return
    const data = JSON.parse(raw)
    if (dialect === 'anthropic') {
      const type = eventName || data.type
      if (type === 'message_start') usage = normalizeNativeUsage(data.message, dialect) || usage
      if (type === 'message_delta' && data?.usage) {
        const completion = Number(data.usage.output_tokens) || 0
        usage = {
          prompt_tokens: Number(usage?.prompt_tokens) || 0,
          completion_tokens: completion,
          total_tokens: (Number(usage?.prompt_tokens) || 0) + completion,
        }
      }
      if (type === 'content_block_start') {
        const block = data.content_block || {}
        if (block.type === 'tool_use') {
          currentBlock = Number.isInteger(data.index) ? data.index : 0
          calls.set(currentBlock, { id: String(block.id || ''), type: 'function', function: { name: String(block.name || ''), arguments: '' } })
        }
      } else if (type === 'content_block_delta') {
        const delta = data.delta || {}
        if (delta.type === 'text_delta') emitText(String(delta.text || ''))
        if (delta.type === 'input_json_delta') {
          const index = Number.isInteger(data.index) ? data.index : (currentBlock ?? 0)
          const call = calls.get(index)
          if (call) call.function.arguments += String(delta.partial_json || '')
        }
      }
      return
    }
    usage = normalizeNativeUsage(data, dialect) || usage
    const message = normalizeGeminiResponse(data)
    emitText(message.content)
    for (let i = 0; i < message.tool_calls.length; i += 1) {
      const call = message.tool_calls[i]
      const key = call.id || `${call.function.name}:${i}`
      call.providerCallId = message.nativeCallIds[i] || ''
      calls.set(key, call)
    }
  }
  try {
    let done = false
    while (!done) {
      const part = await reader.read()
      done = part.done
      buffer += decoder.decode(part.value || new Uint8Array(), { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (line.startsWith('event:')) pendingEvent = line.slice(6).trim()
        else if (line.startsWith('data:')) {
          processData(line.slice(5).trim(), pendingEvent)
          pendingEvent = ''
        }
      }
    }
    if (buffer.trim().startsWith('data:')) processData(buffer.trim().slice(5).trim())
  } finally {
    reader.releaseLock()
  }
  return {
    message: {
      role: 'assistant',
      content: text,
      nativeCallIds: [...calls.values()].map((call) => call.providerCallId || ''),
      tool_calls: [...calls.values()].map((call) => ({
        ...call,
        function: {
          ...call.function,
          arguments: call.function.arguments || '{}',
        },
      })),
    },
    streamed,
    usage,
  }
}

module.exports = {
  toAnthropicRequest,
  toGeminiRequest,
  normalizeAnthropicResponse,
  normalizeGeminiResponse,
  readNativeStream,
}
