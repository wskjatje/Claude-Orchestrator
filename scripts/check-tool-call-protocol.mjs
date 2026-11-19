import assert from 'node:assert/strict'
import protocol from '../shared/tool-call-protocol.cjs'

const known = new Set(['read_file', 'write_file'])
const native = protocol.parseAssistantToolMessage({ message: {
  role: 'assistant', content: '', tool_calls: [{
    id: 'native-1', type: 'function', function: { name: 'read_file', arguments: '{"path":"README.md"}' },
  }],
} }, known)
assert.equal(native.protocol, 'native')
assert.deepEqual(native.toolCalls[0].function.arguments, { path: 'README.md' })

const embedded = protocol.parseAssistantToolMessage({ message: {
  role: 'assistant', content: '```json\n{"name":"write_file","arguments":{"path":"notes.txt","content":"ok"}}\n```',
} }, known)
assert.equal(embedded.protocol, 'content-json')
assert.equal(embedded.message.content, '', 'parsed tool JSON is not exposed as assistant prose')
assert.equal(embedded.toolCalls[0].function.name, 'write_file')

const sequenceText = [
  JSON.stringify({ name: 'read_file', arguments: { path: 'src/a.js' } }),
  JSON.stringify({ name: 'read_file', arguments: { path: 'src/b.js' } }),
  JSON.stringify({ name: 'write_file', arguments: { path: 'src/a.js', content: 'const value = "}";' } }),
].join('\n\n')
const sequence = protocol.parseAssistantToolMessage({ message: { role: 'assistant', content: sequenceText } }, known)
assert.equal(sequence.protocol, 'content-json', 'a strict sequence of complete JSON calls is accepted')
assert.equal(sequence.toolCalls.length, 3)
assert.equal(sequence.message.content, '')

const actionBlock = protocol.parseAssistantToolMessage({ message: {
  role: 'assistant',
  content: 'Thought: I should read the file.\n\nAction:\n```json\n{"name":"read_file","arguments":{"path":"README.md"}}\n```',
} }, known)
assert.equal(actionBlock.protocol, 'content-json', 'the explicit Thought/Action envelope is accepted')
assert.equal(actionBlock.toolCalls[0].function.name, 'read_file')
const fullWidthAction = protocol.parseAssistantToolMessage({ message: {
  role: 'assistant',
  content: 'Thought：读取模型列表。\nAction：\n```json\n{"name":"read_file","arguments":{"path":"README.md"}}\n```',
} }, known)
assert.equal(fullWidthAction.protocol, 'content-json', 'full-width Chinese punctuation in the envelope is accepted')

const plannedAction = protocol.parseAssistantToolMessage({ message: {
  role: 'assistant',
  content: 'Thought: 确认 `src/greeting.js` 文件存在。\n\nAction: \n1. 将默认问候语从 hello 改为 bonjour。\n2. 读取对应测试并运行。\n\n```json\n{"name":"write_file","arguments":{"path":"src/greeting.js","content":"bonjour"}}\n```',
} }, known)
assert.equal(plannedAction.protocol, 'content-json', 'a single offered tool call may follow a plain-text action plan')
assert.equal(plannedAction.toolCalls[0].function.name, 'write_file')
assert.deepEqual(plannedAction.toolCalls[0].function.arguments, { path: 'src/greeting.js', content: 'bonjour' })

const repairedFlat = protocol.parseAssistantToolMessage({ message: {
  role: 'assistant',
  content: '"name": "read_file", "arguments": "path": "src/clamp.js"',
} }, known)
assert.equal(repairedFlat.protocol, 'content-json-repaired')
assert.deepEqual(repairedFlat.toolCalls[0].function.arguments, { path: 'src/clamp.js' })

for (const content of [
  'Here is JSON: {"name":"write_file","arguments":{"path":"x","content":"y"}}',
  '{"name":"delete_everything","arguments":{}}',
  '{"name":"write_file","arguments":[]}',
  `${JSON.stringify({ name: 'read_file', arguments: { path: 'ok' } })}\nExplanation text`,
  `${JSON.stringify({ name: 'read_file', arguments: { path: 'ok' } })}\n${JSON.stringify({ name: 'delete_everything', arguments: {} })}`,
  'I will use a tool.\n```json\n{"name":"read_file","arguments":{"path":"ok"}}\n```',
  'Thought: use the tool.\nAction:\n```json\n{"name":"read_file","arguments":{"path":"ok"}}\n```\nExtra text',
  'Thought: use the tool.\nAction:\n1. do something\n```json\n{"name":"read_file","arguments":{"path":"ok"}}\n```\nI will do that now.',
]) {
  assert.deepEqual(protocol.extractEmbeddedToolCalls(content, known), [], 'prose, unknown tools, and non-object args are rejected')
}

assert.equal(protocol.validateToolArguments({}, {
  type: 'object', properties: { path: { type: 'string' } }, required: ['path'],
}).ok, false, 'required arguments are checked')
assert.equal(protocol.validateToolArguments({ path: 7 }, {
  type: 'object', properties: { path: { type: 'string' } }, required: ['path'],
}).ok, false, 'argument types are checked')
assert.equal(protocol.validateToolArguments({ path: 'src/main.js' }, {
  type: 'object', properties: { path: { type: 'string' } }, required: ['path'],
}).ok, true)

console.log('ok: native and strict JSON tool protocols enforce the offered-tool boundary and schema basics')
