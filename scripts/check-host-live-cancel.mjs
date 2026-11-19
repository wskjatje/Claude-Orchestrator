import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

const base = String(process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '')
const tagsResponse = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5_000) })
assert.equal(tagsResponse.ok, true, `Ollama /api/tags returned HTTP ${tagsResponse.status}`)
const tags = await tagsResponse.json()
const models = Array.isArray(tags?.models) ? tags.models : []
const preferred = String(process.env.EVAL_MODEL || 'qwen2.5-coder:14b')
const selected = models.find((item) => item?.name === preferred) || models.find((item) =>
  Array.isArray(item?.capabilities) && item.capabilities.includes('completion'),
)
assert.ok(selected?.name, 'no local completion model is available for live cancellation')

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'host-live-cancel-'))
const workspace = path.join(temp, 'workspace')
fs.mkdirSync(workspace, { recursive: true })
fs.writeFileSync(path.join(workspace, 'README.md'), '# cancellation fixture\n', 'utf8')
process.env.CLAUDE_ORCHESTRATOR_PROJECT_ROOT = process.cwd()
process.env.CLAUDE_ORCHESTRATOR_USER_DATA = path.join(temp, 'user-data')
process.env.WORKBENCH_WORKSPACE = workspace

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  const store = await import('../server/store.mjs')
  const { abortHostAgent, runHostAgentLoop } = await import('../server/host-agent-loop.mjs')
  store.saveWorkspace(workspace)
  store.saveChatSettings({
    model: selected.name,
    localOllamaModel: selected.name,
    localModelCatalog: [selected.name],
    chatEnabledLocalModels: [selected.name],
    orchestrationMode: 'local-mcp',
    ollamaBase: base,
  })

  const requestId = `live-cancel-${process.pid}`
  let abortStartedAt = 0
  let abortResult = null
  let fallbackTimer = null
  const triggerAbort = () => {
    if (abortStartedAt) return
    abortStartedAt = performance.now()
    abortResult = abortHostAgent(requestId, { source: 'user-stop' })
  }
  fallbackTimer = setTimeout(triggerAbort, 5_000)
  const result = await Promise.race([
    runHostAgentLoop({
      model: selected.name,
      userLine: '请用中文详细解释一个大型软件项目从需求到发布的完整流程，至少包含二十个步骤。',
      interactionMode: 'ask',
      allowWrites: false,
      autoApplyWrites: false,
      maxTurns: 2,
      requestId,
      onDelta: triggerAbort,
    }),
    sleep(10_000).then(() => ({ timedOutWaitingForAbort: true })),
  ])
  clearTimeout(fallbackTimer)
  const abortMs = abortStartedAt ? Math.round(performance.now() - abortStartedAt) : Infinity

  assert.deepEqual(abortResult, { ok: true }, 'live request must be registered before cancellation')
  assert.equal(result?.timedOutWaitingForAbort, undefined, 'live host cancellation must settle')
  assert.equal(result?.aborted, true, `live host result must report aborted, got ${JSON.stringify(result)}`)
  assert.ok(abortMs < 300, `live host cancellation took ${abortMs}ms (expected <300ms)`)
  assert.deepEqual(
    abortHostAgent(requestId, { source: 'user-stop' }),
    { ok: false },
    'completed cancellation must leave no active request',
  )

  console.log(`check-host-live-cancel: ok (${selected.name}, ${abortMs}ms)`)
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
