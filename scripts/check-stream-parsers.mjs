import assert from 'node:assert/strict'
import { readOllamaStream, readOpenAiStream } from '../server/host-agent-loop.mjs'

function responseInChunks(body, chunkSize = 7) {
  const bytes = new TextEncoder().encode(body)
  const stream = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.slice(i, i + chunkSize))
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
}

const deltas = []
const sse = [
  'data: {"choices":[{"delta":{"content":"重复的的"}}]}\r\n\r\n',
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"read_","arguments":"{\\"path\\":"}}]}}]}\n\n',
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"file","arguments":"\\"README.md\\"}"}}]}}]}\n\n',
  'data: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":3,"total_tokens":15}}\n\n',
  'data: [DONE]\n\n',
].join('')
const cloud = await readOpenAiStream(responseInChunks(sse, 5), { onDelta: (x) => deltas.push(x) })
assert.equal(deltas.join(''), '重复的的', 'UTF-8 content survives arbitrary SSE chunk boundaries')
assert.equal(cloud.message.tool_calls.length, 1)
assert.equal(cloud.message.tool_calls[0].function.name, 'read_file')
assert.deepEqual(JSON.parse(cloud.message.tool_calls[0].function.arguments), { path: 'README.md' })
assert.deepEqual(cloud.usage, { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 })

const ollamaDeltas = []
const ollama = await readOllamaStream(responseInChunks([
  '{"message":{"role":"assistant","content":"的的的"},"done":false}\n',
  '{"message":{"role":"assistant","content":"完成"},"done":true,"prompt_eval_count":21,"eval_count":4}',
].join(''), 3), { onDelta: (x) => ollamaDeltas.push(x) })
assert.equal(ollamaDeltas.join(''), '的的的完成')
assert.equal(ollama.message.content, '的的的完成')
assert.deepEqual(ollama.usage, { prompt_tokens: 21, completion_tokens: 4, total_tokens: 25 })

console.log('ok: SSE and Ollama streams preserve split UTF-8, repeated text, and fragmented tool calls')
