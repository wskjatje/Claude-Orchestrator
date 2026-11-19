import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'host-prewrite-progress-'))
const workspace = path.join(temp, 'workspace')
fs.mkdirSync(workspace, { recursive: true })
fs.writeFileSync(path.join(workspace, 'first.txt'), 'first evidence\n', 'utf8')
fs.writeFileSync(path.join(workspace, 'target.txt'), 'STATUS=pending\n', 'utf8')

process.env.CLAUDE_ORCHESTRATOR_PROJECT_ROOT = process.cwd()
process.env.CLAUDE_ORCHESTRATOR_USER_DATA = path.join(temp, 'user-data')
process.env.WORKBENCH_WORKSPACE = workspace

const store = await import('../server/store.mjs')
store.saveWorkspace(workspace)
store.saveChatSettings({
  model: 'fixture-progress:latest',
  localOllamaModel: 'fixture-progress:latest',
  localModelCatalog: ['fixture-progress:latest'],
  chatEnabledLocalModels: ['fixture-progress:latest'],
  orchestrationMode: 'local-mcp',
  ollamaBase: 'http://ollama-fixture:11434',
})

const { runHostAgentLoop } = await import('../server/host-agent-loop.mjs')
const originalFetch = globalThis.fetch
const bodies = []
let scenario = 'progress'
let failureCalls = 0

const toolReply = (name, args, id) => new Response(JSON.stringify({
  message: {
    role: 'assistant',
    content: '',
    tool_calls: [{ id, type: 'function', function: { name, arguments: args } }],
  },
  done: true,
}), { status: 200, headers: { 'content-type': 'application/json' } })

const textReply = (content) => new Response(JSON.stringify({
  message: { role: 'assistant', content },
  done: true,
}), { status: 200, headers: { 'content-type': 'application/json' } })

try {
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith('/api/show')) {
      return new Response(JSON.stringify({
        capabilities: ['tools'],
        model_info: { 'fixture.context_length': 32_768 },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (!String(url).endsWith('/api/chat')) throw new Error(`Unexpected URL: ${url}`)
    const body = JSON.parse(init.body)
    if (scenario === 'failure-evidence') {
      failureCalls += 1
      return toolReply('search_replace', { path: 'target.txt' }, `invalid-edit-${failureCalls}`)
    }
    bodies.push(body)
    if (bodies.length === 1) return toolReply('read_file', { path: 'first.txt' }, 'read-first')
    if (bodies.length === 2) return toolReply('read_file', { path: 'target.txt' }, 'read-target')
    if (bodies.length === 3) {
      return toolReply('search_replace', {
        path: 'target.txt',
        old_string: 'STATUS=pending',
        new_string: 'STATUS=completed',
      }, 'write-target')
    }
    return textReply('目标文件已修改完成。')
  }

  const streamed = []
  const result = await runHostAgentLoop({
    model: 'fixture-progress:latest',
    userLine: '读取必要文件后，把 target.txt 的状态改为 completed 并验证。',
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    requireAppliedWrite: true,
    maxTurns: 2,
    requestId: 'fixture-prewrite-progress',
    onDelta: (chunk) => streamed.push(String(chunk)),
  })

  assert.equal(result.ok, true, `${result.error}\n${JSON.stringify(result.toolTrace, null, 2)}`)
  assert.ok(bodies.length > 2, '有新读取证据时，不得在初始轮次上限提前结束')
  assert.match(streamed.join(''), /自动继续：检测到新的工作区证据/)
  assert.match(fs.readFileSync(path.join(workspace, 'target.txt'), 'utf8'), /STATUS=completed/)
  assert.equal(result.verified, true)
  assert.ok(bodies.every((body) => body.tools?.length), '继续执行不得移除原生 tools')

  scenario = 'failure-evidence'
  const failed = await runHostAgentLoop({
    model: 'fixture-progress:latest',
    userLine: '修改 target.txt，但工具参数不完整时必须如实失败。',
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    requireAppliedWrite: true,
    maxTurns: 1,
    requestId: 'fixture-failure-evidence',
    onDelta: () => {},
  })
  assert.equal(failed.ok, false)
  assert.match(failed.error, /最近失败证据：search_replace/)
  assert.match(failed.error, /参数无效/)
  assert.equal(failureCalls, 1, '失败调用不能伪装成执行进展并延长轮次')
  console.log('check-host-prewrite-progress: ok (progress extends; failed tools retain exact evidence without extension)')
} finally {
  globalThis.fetch = originalFetch
  fs.rmSync(temp, { recursive: true, force: true })
}
