import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'host-verification-closure-'))
const workspace = path.join(temp, 'workspace')
fs.mkdirSync(path.join(workspace, 'src'), { recursive: true })
process.env.CLAUDE_ORCHESTRATOR_PROJECT_ROOT = process.cwd()
process.env.CLAUDE_ORCHESTRATOR_USER_DATA = path.join(temp, 'user-data')
process.env.WORKBENCH_WORKSPACE = workspace

const sourceOriginal = "export function greeting(name) { return `hello, ${name}` }\n"
const testOriginal = "import assert from 'node:assert/strict'; import { greeting } from './src/greeting.js'; assert.equal(greeting('Ada'), 'hello, Ada');\n"
const resetFixture = () => {
  fs.writeFileSync(path.join(workspace, 'src/greeting.js'), sourceOriginal, 'utf8')
  fs.writeFileSync(path.join(workspace, 'test.js'), testOriginal, 'utf8')
  fs.writeFileSync(path.join(workspace, 'package.json'), '{"type":"module","scripts":{"test":"node test.js"}}\n', 'utf8')
}
resetFixture()

const store = await import('../server/store.mjs')
store.saveWorkspace(workspace)
store.saveChatSettings({
  model: 'fixture-tools:latest',
  localOllamaModel: 'fixture-tools:latest',
  localModelCatalog: ['fixture-tools:latest'],
  chatEnabledLocalModels: ['fixture-tools:latest'],
  orchestrationMode: 'local-mcp',
  ollamaBase: 'http://ollama-fixture:11434',
})
const {
  codeSearchResultPaths,
  dependencyTaskObligation,
  runHostAgentLoop,
} = await import('../server/host-agent-loop.mjs')
const originalFetch = globalThis.fetch

assert.deepEqual(
  codeSearchResultPaths({
    ripgrep: [],
    semantic: [
      { relPath: 'src/pages/home.js' },
      { relPath: 'src/jobs/daily.js' },
    ],
    graph: { files: ['src/pages/home.js'] },
  }),
  ['src/pages/home.js', 'src/jobs/daily.js'],
  'migration closure must retain semantic-only reference locations when literal search is empty',
)

fs.mkdirSync(path.join(workspace, 'scripts'), { recursive: true })
fs.writeFileSync(path.join(workspace, 'scripts/status.js'), "console.log('ready')\n", 'utf8')
assert.equal(
  dependencyTaskObligation({
    userLine: '安装 picocolors，使用它修改 scripts/status.js。',
    root: workspace,
    toolTrace: [],
  })?.type,
  'dependency-install',
  'dependency tasks must require a manifest change before completion',
)
fs.writeFileSync(
  path.join(workspace, 'package.json'),
  '{"type":"module","dependencies":{"picocolors":"^1.1.1"}}\n',
  'utf8',
)
assert.equal(
  dependencyTaskObligation({
    userLine: '安装 picocolors，使用它修改 scripts/status.js。',
    root: workspace,
    toolTrace: [{ tool: 'run_command', detail: 'npm install picocolors', ok: true }],
  })?.type,
  'dependency-use',
  'dependency tasks must require the named source file to use the installed package',
)
fs.writeFileSync(
  path.join(workspace, 'scripts/status.js'),
  "import pc from 'picocolors'; console.log(pc.green('ready'))\n",
  'utf8',
)
assert.equal(
  dependencyTaskObligation({
    userLine: '安装 picocolors，使用它修改 scripts/status.js。',
    root: workspace,
    toolTrace: [{ tool: 'run_command', detail: 'npm install picocolors', ok: true }],
  }),
  null,
  'dependency task is complete only after install and source usage',
)
resetFixture()

const toolReply = (name, args, id) => new Response(JSON.stringify({
  message: {
    role: 'assistant',
    content: '',
    tool_calls: [{ id, type: 'function', function: { name, arguments: args } }],
  },
  done: true,
}), { status: 200, headers: { 'content-type': 'application/json' } })

try {
  let chatCall = 0
  let fullSchemaRepairRequestSeen = false
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/api/show')) {
      return new Response(JSON.stringify({
        capabilities: ['tools'],
        model_info: { 'fixture.context_length': 32_768 },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (!String(url).endsWith('/api/chat')) throw new Error(`Unexpected URL: ${url}`)
    chatCall += 1
    if (chatCall === 1) return toolReply('read_file', { path: 'src/greeting.js' }, 'read-source')
    if (chatCall === 2) return toolReply('search_replace', {
      path: 'src/greeting.js', old_string: 'hello', new_string: 'bonjour', replaceAll: true,
    }, 'edit-source')
    if (chatCall === 3) return toolReply('read_file', { path: 'test.js' }, 'read-test')
    if (chatCall === 4) return toolReply('search_replace', {
      path: 'test.js', old_string: 'hello, Ada', new_string: 'bonjour, Ada', replaceAll: true,
    }, 'edit-test')
    return new Response(JSON.stringify({
      message: { role: 'assistant', content: '源码与原有测试已同步，验证通过。' }, done: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const repaired = await runHostAgentLoop({
    model: 'fixture-tools:latest',
    userLine: '把默认问候语改成 bonjour，同步更新对应测试并运行测试。',
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    maxTurns: 10,
    requestId: 'fixture-verification-repair',
  })
  assert.equal(repaired.ok, true, repaired.error)
  assert.equal(repaired.verified, true)
  assert.match(fs.readFileSync(path.join(workspace, 'src/greeting.js'), 'utf8'), /bonjour/)
  assert.match(fs.readFileSync(path.join(workspace, 'test.js'), 'utf8'), /bonjour, Ada/)
  assert.ok(chatCall >= 5, 'sequential writes must be allowed before transaction verification')
  const testEditIndex = repaired.toolTrace.findIndex(
    (item) => item.tool === 'search_replace' && item.path === 'test.js',
  )
  const transactionVerifyIndex = repaired.toolTrace.findIndex(
    (item) => item.tool === 'run_tests' && item.transaction === true,
  )
  assert.ok(testEditIndex >= 0, 'the related test file must be edited in the same transaction')
  assert.ok(
    transactionVerifyIndex > testEditIndex,
    'deterministic verification must run only after all related writes finish',
  )

  fs.rmSync(path.join(workspace, 'test.js'))
  fs.rmSync(path.join(workspace, 'package.json'))
  fs.writeFileSync(
    path.join(workspace, 'src/queue.js'),
    'export class LegacyQueue { push(value) { this.items ??= []; this.items.push(value) } }\n',
    'utf8',
  )
  fs.writeFileSync(
    path.join(workspace, 'src/worker.js'),
    "import { LegacyQueue } from './queue.js'; export const queue = new LegacyQueue();\n",
    'utf8',
  )
  fs.writeFileSync(
    path.join(workspace, 'src/index.js'),
    "export { LegacyQueue } from './queue.js';\n",
    'utf8',
  )
  chatCall = 0
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/api/show')) {
      return new Response(JSON.stringify({ capabilities: ['tools'] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (!String(url).endsWith('/api/chat')) throw new Error(`Unexpected URL: ${url}`)
    chatCall += 1
    if (chatCall === 1) return toolReply('code_search', { query: 'LegacyQueue' }, 'rename-search')
    if (chatCall === 2) return toolReply('read_file', { path: 'src/worker.js' }, 'rename-read-first')
    if (chatCall === 3) return toolReply('search_replace', {
      path: 'src/worker.js', old_string: 'LegacyQueue', new_string: 'TaskQueue',
    }, 'rename-first')
    if (chatCall === 4) {
      return new Response(JSON.stringify({
        message: { role: 'assistant', content: '重命名已完成。' }, done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (chatCall === 5) return toolReply('multi_edit', {
      edits: [
        { path: 'src/queue.js', old_string: 'LegacyQueue', new_string: 'TaskQueue' },
        { path: 'src/index.js', old_string: 'LegacyQueue', new_string: 'TaskQueue' },
      ],
    }, 'rename-remaining')
    return new Response(JSON.stringify({
      message: { role: 'assistant', content: '所有定义、导入和导出已统一。' }, done: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const renamedTransaction = await runHostAgentLoop({
    model: 'fixture-tools:latest',
    userLine: '将项目里的 LegacyQueue 接口统一改名为 TaskQueue。',
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    maxTurns: 10,
    requestId: 'fixture-cross-file-rename-closure',
  })
  assert.equal(
    renamedTransaction.ok,
    true,
    `${renamedTransaction.error}\n${JSON.stringify(renamedTransaction.toolTrace, null, 2)}`,
  )
  assert.equal(renamedTransaction.verified, true)
  assert.deepEqual([...renamedTransaction.writtenPaths].sort(), [
    'src/index.js', 'src/queue.js', 'src/worker.js',
  ])
  assert.ok(
    renamedTransaction.toolTrace.some((item) => item.detail === 'auto-related-context'),
    'the host must prefetch remaining identifier references before transaction verification',
  )
  assert.ok(
    renamedTransaction.toolTrace.some((item) =>
      (item.detail === 'auto-static-fallback' && item.ok) ||
      (item.transaction === true && item.ok && /静态诊断/.test(String(item.output || ''))),
    ),
    'a project without a test command must fall back to static diagnostics',
  )
  for (const rel of ['src/queue.js', 'src/worker.js', 'src/index.js']) {
    const content = fs.readFileSync(path.join(workspace, rel), 'utf8')
    assert.match(content, /TaskQueue/)
    assert.doesNotMatch(content, /LegacyQueue/)
  }

  resetFixture()
  chatCall = 0
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/api/show')) {
      return new Response(JSON.stringify({ capabilities: ['tools'] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (!String(url).endsWith('/api/chat')) throw new Error(`Unexpected URL: ${url}`)
    chatCall += 1
    if (chatCall === 1) return toolReply('write_file', {
      path: 'src/greeting.js', content: "export function greeting(name) { return `broken, ${name}` }\n",
    }, 'write-broken')
    if (chatCall === 2) return toolReply('write_file', {
      path: 'test.js', content: `${testOriginal}// transaction touched\n`,
    }, 'write-related-test')
    return toolReply('run_tests', {}, `failed-test-${chatCall}`)
  }

  const rolledBack = await runHostAgentLoop({
    model: 'fixture-tools:latest',
    userLine: '修改问候语并确保测试通过。',
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    maxTurns: 10,
    requestId: 'fixture-verification-rollback',
  })
  assert.equal(rolledBack.ok, false)
  assert.equal(rolledBack.rolledBack, true)
  assert.deepEqual(
    [...rolledBack.rolledBackPaths].sort(),
    ['src/greeting.js', 'test.js'],
  )
  assert.equal(fs.readFileSync(path.join(workspace, 'src/greeting.js'), 'utf8'), sourceOriginal)
  assert.equal(fs.readFileSync(path.join(workspace, 'test.js'), 'utf8'), testOriginal)
  assert.match(String(rolledBack.error), /连续 3 次验证失败/)

  resetFixture()
  chatCall = 0
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/api/show')) {
      return new Response(JSON.stringify({ capabilities: ['tools'] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (!String(url).endsWith('/api/chat')) throw new Error(`Unexpected URL: ${url}`)
    chatCall += 1
    if (chatCall === 1) return toolReply('search_replace', {
      path: 'src/greeting.js', old_string: 'return "hello"', new_string: 'return "bonjour"',
    }, 'bad-first-edit')
    if (chatCall === 2) {
      return new Response(JSON.stringify({
        message: { role: 'assistant', content: '没有找到匹配内容。' }, done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (chatCall === 3) return toolReply('read_file', { path: 'src/greeting.js' }, 'recover-read')
    if (chatCall === 4) return toolReply('search_replace', {
      path: 'src/greeting.js', old_string: 'hello!', new_string: 'bonjour', replaceAll: true,
    }, 'bad-second-edit')
    if (chatCall === 5) return toolReply('write_file', {
      path: 'src/greeting.js', content: "export function greeting(name) { return `bonjour, ${name}` }\n",
    }, 'same-file-write-fallback')
    if (chatCall === 6) return toolReply('read_file', { path: 'test.js' }, 'recover-read-test')
    if (chatCall === 7) return toolReply('search_replace', {
      path: 'test.js', old_string: 'hello, Ada', new_string: 'bonjour, Ada', replaceAll: true,
    }, 'recover-test')
    return new Response(JSON.stringify({
      message: { role: 'assistant', content: '相关文件已经全部修改。' }, done: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const recoveredEdit = await runHostAgentLoop({
    model: 'fixture-tools:latest',
    userLine: '把默认问候语改成 bonjour，同步更新对应测试并运行测试。',
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    maxTurns: 12,
    requestId: 'fixture-edit-recovery-transaction',
  })
  assert.equal(
    recoveredEdit.ok,
    true,
    `${recoveredEdit.error}\nchatCall=${chatCall}\n${JSON.stringify(recoveredEdit.toolTrace, null, 2)}`,
  )
  assert.equal(recoveredEdit.verified, true)
  assert.match(fs.readFileSync(path.join(workspace, 'src/greeting.js'), 'utf8'), /bonjour/)
  assert.match(fs.readFileSync(path.join(workspace, 'test.js'), 'utf8'), /bonjour, Ada/)
  assert.ok(
    recoveredEdit.toolTrace.some((item) => item.tool === 'read_file' && item.path === 'src/greeting.js'),
    'an empty model reply after a failed edit must not bypass mandatory reread recovery',
  )
  assert.ok(
    recoveredEdit.toolTrace.some((item) => item.tool === 'write_file' && item.ok),
    'a fingerprint-safe write_file fallback on the same failed path must be allowed',
  )

  resetFixture()
  chatCall = 0
  fullSchemaRepairRequestSeen = false
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/api/show')) {
      return new Response(JSON.stringify({ capabilities: ['tools'] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (!String(url).endsWith('/api/chat')) throw new Error(`Unexpected URL: ${url}`)
    chatCall += 1
    if (chatCall === 1) return toolReply('read_file', { path: 'src/greeting.js' }, 'prefetch-source')
    if (chatCall === 2) return toolReply('search_replace', {
      path: 'src/greeting.js', old_string: 'hello', new_string: 'bonjour', replaceAll: true,
    }, 'prefetch-edit-source')
    if (chatCall === 3) {
      return new Response(JSON.stringify({
        message: { role: 'assistant', content: '源码已修改。' }, done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (chatCall === 4) {
      return new Response(JSON.stringify({
        message: { role: 'assistant', content: '测试仍需处理。' }, done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (chatCall === 5) {
      const requestBody = JSON.parse(String(init?.body || '{}'))
      fullSchemaRepairRequestSeen = Boolean(requestBody.tools?.length)
      return toolReply('search_replace', {
        path: 'test.js',
        old_string: 'hello, Ada',
        new_string: 'bonjour, Ada',
        replaceAll: true,
      }, 'repair-test-native')
    }
    return new Response(JSON.stringify({
      message: { role: 'assistant', content: '相关测试已同步。' }, done: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const prefetchedFailure = await runHostAgentLoop({
    model: 'fixture-tools:latest',
    userLine: '把默认问候语改成 bonjour，同步更新对应测试并运行测试。',
    allowWrites: true,
    autoApplyWrites: true,
    interactionMode: 'agent',
    maxTurns: 10,
    requestId: 'fixture-verification-failure-prefetch',
  })
  assert.equal(
    prefetchedFailure.ok,
    true,
    `${prefetchedFailure.error}\n${JSON.stringify(prefetchedFailure.toolTrace, null, 2)}`,
  )
  assert.equal(prefetchedFailure.verified, true)
  assert.ok(
    prefetchedFailure.toolTrace.some(
      (item) => item.tool === 'read_file' && item.detail === 'auto-failure-context' && item.path === 'test.js',
    ),
    'transaction verification failure should prefetch the referenced workspace test file',
  )
  assert.equal(fullSchemaRepairRequestSeen, true, 'repair turn must retain the full native tools schema')
  assert.ok(
    prefetchedFailure.toolTrace.some((item) => item.tool === 'search_replace' && item.path === 'test.js'),
    'native repair call should execute through the normal tool loop',
  )

  resetFixture()
  chatCall = 0
  let firstRequestKeptNativeTools = false
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/api/show')) {
      return new Response(JSON.stringify({ capabilities: ['tools'] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (!String(url).endsWith('/api/chat')) throw new Error(`Unexpected URL: ${url}`)
    chatCall += 1
    if (chatCall === 1) {
      const requestBody = JSON.parse(String(init?.body || '{}'))
      firstRequestKeptNativeTools = Boolean(requestBody.tools?.length)
      return new Response(JSON.stringify({
        message: {
          role: 'assistant',
          content: JSON.stringify({
            name: 'read_file',
            arguments: { path: 'src/greeting.js' },
          }),
        },
        done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (chatCall === 2) {
      const requestBody = JSON.parse(String(init?.body || '{}'))
      assert.equal(Boolean(requestBody.tools?.length), true, 'retry after content JSON keeps native tools')
      return toolReply('read_file', { path: 'src/greeting.js' }, 'native-read-after-json')
    }
    return new Response(JSON.stringify({
      message: { role: 'assistant', content: '已读取问候语源码。' }, done: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const strictNativeProtocol = await runHostAgentLoop({
    model: 'fixture-tools:latest',
    userLine: '读取 src/greeting.js 并告诉我它定义了什么。',
    allowWrites: false,
    autoApplyWrites: false,
    interactionMode: 'agent',
    maxTurns: 4,
    requestId: 'fixture-strict-native-protocol',
  })
  assert.equal(strictNativeProtocol.ok, true, strictNativeProtocol.error)
  assert.equal(firstRequestKeptNativeTools, true, 'first required turn must always send native tools')
  assert.ok(
    strictNativeProtocol.toolTrace.some((item) => item.tool === 'read_file' && item.path === 'src/greeting.js'),
    'content JSON must be ignored until the model returns a native tool call',
  )

  console.log('ok: multi-file transaction closes safely and all execution turns retain native tools')
} finally {
  globalThis.fetch = originalFetch
  fs.rmSync(temp, { recursive: true, force: true })
}
