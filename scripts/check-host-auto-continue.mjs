import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'host-auto-continue-'))
const workspace = path.join(temp, 'workspace')
fs.mkdirSync(workspace, { recursive: true })
// 固定数量只是回归夹具；运行时仅根据 todo 状态判断是否完成。
const taskFiles = Array.from({ length: 6 }, (_, index) => `optimization_${index + 1}.py`)
for (const file of taskFiles) {
  fs.writeFileSync(path.join(workspace, file), 'STATUS = "pending"\n', 'utf8')
}
process.env.CLAUDE_ORCHESTRATOR_PROJECT_ROOT = process.cwd()
process.env.CLAUDE_ORCHESTRATOR_USER_DATA = path.join(temp, 'user-data')
process.env.WORKBENCH_WORKSPACE = workspace

const store = await import('../server/store.mjs')
store.saveWorkspace(workspace)
store.saveChatSettings({
  model: 'fixture-auto-continue:latest',
  localOllamaModel: 'fixture-auto-continue:latest',
  localModelCatalog: ['fixture-auto-continue:latest'],
  chatEnabledLocalModels: ['fixture-auto-continue:latest'],
  orchestrationMode: 'local-mcp',
  ollamaBase: 'http://ollama-fixture:11434',
})
const { runHostAgentLoop } = await import('../server/host-agent-loop.mjs')
const originalFetch = globalThis.fetch
const streamed = []
let chatCall = 0

const nativeToolReply = (name, args, id) => new Response(JSON.stringify({
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
    chatCall += 1
    const body = JSON.parse(init.body)
    if (chatCall === 1) {
      return nativeToolReply('todo_write', {
        items: taskFiles.map((file, index) => ({
          id: `item-${index + 1}`,
          title: `完成 ${file}`,
          status: index === 0 ? 'in_progress' : 'pending',
        })),
      }, 'plan-six-items')
    }
    if (chatCall === 2) {
      return nativeToolReply('search_replace', {
        path: taskFiles[0],
        old_string: 'STATUS = "pending"',
        new_string: 'STATUS = "completed"',
      }, 'edit-first-item')
    }
    if (chatCall === 3) {
      return nativeToolReply('todo_write', {
        items: taskFiles.map((file, index) => ({
          id: `item-${index + 1}`,
          title: `完成 ${file}`,
          status: index === 0 ? 'completed' : index === 1 ? 'in_progress' : 'pending',
        })),
      }, 'mark-first-complete')
    }
    if (chatCall === 4) {
      return textReply('阶段性进展已记录。')
    }
    if (chatCall === 5) {
      assert.equal(Boolean(body.tools?.length), true, 'auto-continue keeps the native tools schema')
      return nativeToolReply('multi_edit', {
          edits: taskFiles.slice(1).map((file) => ({
            path: file,
            old_string: 'STATUS = "pending"',
            new_string: 'STATUS = "completed"',
          })),
      }, 'edit-remaining-items')
    }
    if (chatCall === 6) {
      assert.equal(Boolean(body.tools?.length), true, 'todo completion keeps the native tools schema')
      return nativeToolReply('todo_write', {
          items: taskFiles.map((file, index) => ({
            id: `item-${index + 1}`,
            title: `完成 ${file}`,
            status: 'completed',
          })),
      }, 'complete-all-items')
    }
    return textReply('所有相关文件已修改并验证完成。')
  }

  const result = await runHostAgentLoop({
    model: 'fixture-auto-continue:latest',
    userLine: `完成全部 6 项优化并验证：${taskFiles.join('、')}。`,
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    requireAppliedWrite: true,
    maxTurns: 12,
    requestId: 'fixture-auto-continue',
    onDelta: (chunk) => streamed.push(String(chunk)),
  })

  assert.equal(result.ok, true, `${result.error}\n${JSON.stringify(result.toolTrace, null, 2)}`)
  assert.equal(result.verified, true)
  for (const file of taskFiles) {
    assert.match(
      fs.readFileSync(path.join(workspace, file), 'utf8'),
      /STATUS = "completed"/,
      `${file} must be completed before success`,
    )
  }
  assert.ok(chatCall >= 7, 'a reply after item 1 of 6 must not terminate the task')
  assert.match(streamed.join(''), /自动继续：检测到原任务未完成/)
  assert.ok(
    result.toolTrace.some((item) => item.tool === 'multi_edit'),
    'the remaining five items must be edited in the same turn',
  )
  assert.equal(result.todos.every((item) => item.status === 'completed'), true)
  console.log('check-host-auto-continue: ok (1/6 partial reply resumed through all 6 items + verify)')
} finally {
  globalThis.fetch = originalFetch
  fs.rmSync(temp, { recursive: true, force: true })
}
