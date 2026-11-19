import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-command-cancel-'))
const workspace = path.join(temp, 'workspace')
fs.mkdirSync(workspace, { recursive: true })
process.env.CLAUDE_ORCHESTRATOR_PROJECT_ROOT = process.cwd()
process.env.CLAUDE_ORCHESTRATOR_USER_DATA = path.join(temp, 'user-data')
process.env.WORKBENCH_WORKSPACE = workspace

const workerPath = path.join(workspace, 'long-runner.mjs')
const pidPath = path.join(workspace, 'child.pid')
fs.writeFileSync(
  workerPath,
  [
    "import fs from 'node:fs'",
    "fs.writeFileSync(process.argv[2], String(process.pid), 'utf8')",
    "setInterval(() => process.stdout.write('tick\\n'), 100)",
    '',
  ].join('\n'),
  'utf8',
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const waitUntil = async (predicate, timeoutMs) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return true
    await sleep(20)
  }
  return predicate()
}
const processExists = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

let childPid = 0
try {
  const store = await import('../server/store.mjs')
  const { workspaceRunCommand, abortWorkspaceRunCommand } = await import('../server/workspace-run-command.mjs')
  store.saveWorkspace(workspace)

  const requestId = `cancel-fixture-${process.pid}`
  const pending = workspaceRunCommand({
    command: `node long-runner.mjs child.pid`,
    mode: 'agent',
    timeoutMs: 30_000,
    runId: requestId,
  })
  assert.equal(await waitUntil(() => fs.existsSync(pidPath), 3_000), true, 'long-running child must start')
  childPid = Number(fs.readFileSync(pidPath, 'utf8'))
  assert.equal(Number.isInteger(childPid) && childPid > 1, true, 'fixture must record a valid child pid')

  const abortStartedAt = performance.now()
  assert.deepEqual(abortWorkspaceRunCommand(requestId), { ok: true, aborted: 1 })
  const result = await Promise.race([
    pending,
    sleep(2_000).then(() => ({ timedOutWaitingForAbort: true })),
  ])
  const abortMs = Math.round(performance.now() - abortStartedAt)
  const childGone = await waitUntil(() => !processExists(childPid), 1_000)

  assert.equal(result?.timedOutWaitingForAbort, undefined, 'aborted command promise must settle')
  assert.equal(result?.aborted, true, `command must report aborted, got ${JSON.stringify(result)}`)
  assert.ok(abortMs < 300, `command cancellation took ${abortMs}ms (expected <300ms)`)
  assert.equal(childGone, true, `child process ${childPid} survived cancellation`)
  assert.deepEqual(abortWorkspaceRunCommand(requestId), { ok: false, aborted: 0 })

  console.log(`check-workspace-command-cancel: ok (${abortMs}ms, child ${childPid} reaped)`)
} finally {
  if (childPid && processExists(childPid)) {
    try { process.kill(childPid, 'SIGKILL') } catch { /* already gone */ }
  }
  fs.rmSync(temp, { recursive: true, force: true })
}
