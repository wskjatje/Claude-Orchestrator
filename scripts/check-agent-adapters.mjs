#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { TOOL_NAMES, TOOLS, TOOL_SCHEMAS } from '../server/tool-registry.mjs'
import { getNativeModelAdapter } from '../server/model-adapters.mjs'

const require = createRequire(import.meta.url)
const native = require('../server/model-tool-adapters.cjs')

assert.deepEqual(TOOL_NAMES, [
  'code_search', 'read_file', 'list_dir', 'glob', 'search_replace', 'write_file',
  'apply_patch', 'multi_edit', 'move_file', 'delete_file',
  'todo_write',
  'run_command', 'run_tests', 'get_diagnostics', 'git_status',
])
assert.equal(TOOLS.length, TOOL_NAMES.length)
for (const name of TOOL_NAMES) {
  assert.ok(TOOL_SCHEMAS[name], `${name} schema exists`)
  assert.equal(TOOLS.find((tool) => tool.function.name === name)?.function.parameters, TOOL_SCHEMAS[name])
}
assert.deepEqual(TOOL_SCHEMAS.read_file.required, ['path'])
assert.deepEqual(TOOL_SCHEMAS.search_replace.required, ['path', 'old_string', 'new_string'])

const messages = [{ role: 'user', content: 'hello' }]
for (const [kind, expected] of [
  ['anthropic', native.toAnthropicRequest(messages, TOOLS, 'required', 'claude-test')],
  ['gemini', native.toGeminiRequest(messages, TOOLS, 'required')],
]) {
  const adapter = getNativeModelAdapter(kind)
  assert.ok(adapter, `${kind} adapter registered`)
  assert.deepEqual(adapter.buildRequest(messages, TOOLS, 'required', 'claude-test'), expected)
  assert.equal(typeof adapter.readStream, 'function')
}
assert.equal(getNativeModelAdapter('cloud'), null)
assert.equal(getNativeModelAdapter('ollama'), null)
assert.equal(getNativeModelAdapter('Anthropic'), null)

const anthropicJson = await getNativeModelAdapter('anthropic').readStream(
  new Response(JSON.stringify({
    content: [{ type: 'text', text: 'ok' }],
    usage: { input_tokens: 10, output_tokens: 2 },
  }), { headers: { 'content-type': 'application/json' } }),
  {},
)
assert.deepEqual(anthropicJson.usage, {
  prompt_tokens: 10,
  completion_tokens: 2,
  total_tokens: 12,
})

const geminiJson = await getNativeModelAdapter('gemini').readStream(
  new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 3, totalTokenCount: 11 },
  }), { headers: { 'content-type': 'application/json' } }),
  {},
)
assert.deepEqual(geminiJson.usage, {
  prompt_tokens: 8,
  completion_tokens: 3,
  total_tokens: 11,
})
const hostSource = fs.readFileSync(new URL('../server/host-agent-loop.mjs', import.meta.url), 'utf8')
assert.match(hostSource, /from '\.\/tool-registry\.mjs'/, 'Host imports the shared tool registry')
assert.match(hostSource, /from '\.\/model-adapters\.mjs'/, 'Host imports the model adapter boundary')
assert.doesNotMatch(hostSource, /const TOOLS\s*=\s*\[/, 'tool declarations are not duplicated in Host')
assert.doesNotMatch(hostSource, /modelToolAdapters\./, 'Host does not bypass the adapter boundary')
assert.match(hostSource, /Math\.min\(1, 0\.6 \+ verifyNudgeCount \* 0\.2\)/, 'Ollama repair turns use bounded adaptive temperature')
assert.doesNotMatch(hostSource, /getToolProtocolStrategy|rememberToolProtocolSuccess|forceJsonToolProtocolNext/, 'Host never learns or activates a degraded JSON tool route')
assert.match(hostSource, /工具任务必须使用接口返回的原生 tool_calls/, 'Host requires native tool calls')
assert.match(hostSource, /不会移除工具历史、禁用 tools、改用正文 JSON 或切换执行通道/, 'Host schema failures stop the transaction explicitly')
assert.match(hostSource, /call\.args\.file_paths/, 'Host normalizes Cursor-style file_paths edit arguments')
assert.match(hostSource, /call\.args\.pattern/, 'Host normalizes pattern/replacement edit arguments')
assert.match(hostSource, /call\.args\.file_path/, 'Host normalizes Cursor-style file_path edit arguments')
assert.match(hostSource, /call\.args\.search_pattern/, 'Host normalizes search_pattern/replace_pattern edit arguments')
assert.match(hostSource, /call\.name = 'search_replace'/, 'Host converts write_file before/after edits into search_replace')
assert.match(hostSource, /call\.args\.dst/, 'Host normalizes move_file dst arguments')
assert.match(hostSource, /result\?\.argumentError !== true/, 'invalid arguments do not create a false edit-conflict recovery lock')
assert.match(hostSource, /const failedAfterWrite = writtenPaths\.size > 0/, 'pre-write diagnostic failures do not consume repair attempts')
const evalSource = fs.readFileSync(new URL('./eval-agent-suite.mjs', import.meta.url), 'utf8')
assert.match(evalSource, /const sharedUserData = fs\.mkdtempSync/, 'eval suite keeps one IDE-level user-data root per report')
assert.match(evalSource, /userData: sharedUserData/, 'isolated task workspaces reuse the report user-data root')

console.log(`check-agent-adapters: PASSED (${TOOL_NAMES.length} tool contracts, 2 native protocol adapters)`)
