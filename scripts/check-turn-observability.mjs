import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { aggregateAgentTurnRows } = require('../server/project-logs.cjs')

const source = fs.readFileSync(new URL('../server/host-agent-loop.mjs', import.meta.url), 'utf8')
for (const field of [
  'ctx_window', 'prompt_tok', 'eval_ms', 'protocol', 'tool_fail', 'compact',
  'retry', 'ollama_ver', 'model_digest', 'mcp_calls',
]) {
  assert.match(source, new RegExp(`\\b${field}\\s*:`), `turn telemetry includes ${field}`)
}
assert.match(source, /compactCount \+= 1/)
assert.match(source, /toolFailCount \+= 1/)
assert.match(source, /startsWith\('mcp__'\)/)
assert.match(source, /prompt_tok:\s*promptTokenTotal\s*\|\|\s*null/)
assert.match(source, /retry:\s*retryCount/)
assert.match(source, /ollama_ver:\s*ollamaVersion/)
assert.match(source, /toolFailures:\s*toolTrace/)
assert.match(source, /probeOllamaVersion/)
assert.match(source, /usage:\s*usageSnapshot\(\)/)
assert.match(
  source,
  /: fail\s*\? String\(result\?\.error \|\| result\?\.output \|\| ''\)\.slice\(0, 4000\)/,
  'failed non-command tools retain a bounded error reason',
)

const chatSend = fs.readFileSync(new URL('../web/src/hooks/use-chat-send.ts', import.meta.url), 'utf8')
assert.match(
  chatSend,
  /hostToolTrace\s*=\s*Array\.isArray\(res\.toolTrace\)[\s\S]{0,300}if \(!res\?\.ok\) return;/,
  'failed Host turns retain tool trace before returning to the error branch',
)
assert.match(chatSend, /failureStreamEvents\s*=\s*toolTraceToStreamEvents\(hostToolTrace\)/)

const trend = aggregateAgentTurnRows([
  { message: 'agent-turn success', meta: JSON.stringify({ model: 'local-a', backend: 'ollama', eval_ms: 100, prompt_tok: 20, retry: 1 }) },
  { message: 'agent-turn failed', meta: JSON.stringify({ model: 'local-a', backend: 'ollama', eval_ms: 300, prompt_tok: 30, tool_fail: 2 }) },
])
assert.equal(trend.trends[0].turns, 2)
assert.equal(trend.trends[0].successRate, 0.5)
assert.equal(trend.trends[0].avgDurationMs, 200)
assert.match(trend.content, /成功 1\/2 \(50%\)/)

console.log('check-turn-observability: ok')
