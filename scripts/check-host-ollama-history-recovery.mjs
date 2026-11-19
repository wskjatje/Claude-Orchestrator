import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ollama-recovery-'))
const workspace = path.join(temp, 'workspace')
fs.mkdirSync(workspace, { recursive: true })
fs.writeFileSync(path.join(workspace, 'README.md'), '{"message":"fixture {json}"}\n', 'utf8')
process.env.CLAUDE_ORCHESTRATOR_PROJECT_ROOT = process.cwd()
process.env.CLAUDE_ORCHESTRATOR_USER_DATA = path.join(temp, 'user-data')
process.env.WORKBENCH_WORKSPACE = workspace

const store = await import('../server/store.mjs')
store.saveWorkspace(workspace)
store.saveChatSettings({
  model: 'qwen2.5-coder:14b',
  localOllamaModel: 'qwen2.5-coder:14b',
  localModelCatalog: ['qwen2.5-coder:14b'],
  chatEnabledLocalModels: ['qwen2.5-coder:14b'],
  orchestrationMode: 'local-mcp',
  ollamaBase: 'http://ollama-fixture:11434',
})
const { runHostAgentLoop } = await import('../server/host-agent-loop.mjs')
const originalFetch = globalThis.fetch
const chatBodies = []

try {
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith('/api/show')) {
      return new Response(JSON.stringify({ capabilities: ['tools'], model_info: { 'qwen.context_length': 32_768 } }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (!String(url).endsWith('/api/chat')) throw new Error(`Unexpected URL: ${url}`)
    const body = JSON.parse(init.body)
    chatBodies.push(body)
    const invalidHistoryCall = body.messages
      ?.filter((message) => message?.role === 'assistant')
      .flatMap((message) => Array.isArray(message.tool_calls) ? message.tool_calls : [])
      .find((call) => typeof call?.function?.arguments !== 'object' || call.function.arguments === null)
    if (invalidHistoryCall) {
      return new Response(JSON.stringify({ error: "Value looks like object, but can't find closing '}' symbol" }), { status: 400 })
    }
    if (chatBodies.length === 1) {
      return new Response(JSON.stringify({
        message: {
          role: 'assistant', content: '',
          tool_calls: [{ id: 'read-1', type: 'function', function: { name: 'read_file', arguments: { path: 'README.md' } } }],
        },
        done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (chatBodies.length === 2) {
      return new Response(JSON.stringify({
        message: {
          role: 'assistant', content: '',
          tool_calls: [{
            id: 'edit-1', type: 'function', function: {
              name: 'search_replace',
              arguments: {
                path: 'README.md', old_string: 'fixture {json}', new_string: 'changed {json}',
              },
            },
          }],
        },
        done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ message: { role: 'assistant', content: 'README 已修改完成。' }, done: true }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }

  const result = await runHostAgentLoop({
    model: 'qwen2.5-coder:14b',
    userLine: '把 README.md 中的 fixture 改为 changed，并完成验证。',
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    requireAppliedWrite: true,
    maxTurns: 5,
    requestId: 'fixture-recovery',
    onDelta: () => {},
  })
  assert.equal(result.ok, true, `${result.error}\n${JSON.stringify(result.toolTrace, null, 2)}`)
  assert.ok(chatBodies.length >= 3, 'the model must receive tool history after read and edit calls')
  assert.ok(chatBodies.every((body) => body.tools?.length), 'every execution request retains the full native tools schema')
  assert.ok(chatBodies[1].messages.some((message) => message.role === 'tool'), 'tool history remains intact')
  for (const body of chatBodies.slice(1)) {
    for (const message of body.messages.filter((item) => item.role === 'assistant')) {
      for (const call of message.tool_calls || []) {
        assert.equal(typeof call.function.arguments, 'object', 'Ollama assistant tool history keeps arguments as an object')
      }
    }
  }
  assert.match(fs.readFileSync(path.join(workspace, 'README.md'), 'utf8'), /changed \{json\}/)
  assert.equal(result.verified, true)
  console.log('ok: Host preserves Ollama object arguments across native tool-history turns')
} finally {
  globalThis.fetch = originalFetch
  fs.rmSync(temp, { recursive: true, force: true })
}
