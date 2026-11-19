import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  contentFingerprint,
  resolveSafeWorkspacePath,
  applyTextEdit,
  rollbackTextEdits,
} = require('../server/edit-engine.cjs')
const {
  captureWorkspaceCheckpoint,
  finalizeWorkspaceCheckpoint,
  restoreWorkspaceCheckpoint,
  saveWorkspaceCheckpoint,
  loadWorkspaceCheckpoint,
} = require('../server/workspace-checkpoint.cjs')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-edit-engine-'))
try {
  const first = applyTextEdit({ workspaceRoot: root, path: 'src/a.txt', content: 'one' })
  assert.equal(first.ok, true)
  assert.equal(first.isNewFile, true)
  assert.equal(fs.readFileSync(path.join(root, 'src/a.txt'), 'utf8'), 'one')

  const stale = applyTextEdit({
    workspaceRoot: root,
    path: 'src/a.txt',
    content: 'two',
    expectedFingerprint: contentFingerprint('stale'),
  })
  assert.equal(stale.ok, false)
  assert.equal(stale.conflict, true)
  assert.equal(fs.readFileSync(path.join(root, 'src/a.txt'), 'utf8'), 'one')

  const second = applyTextEdit({
    workspaceRoot: root,
    path: 'src/a.txt',
    content: 'two',
    expectedFingerprint: contentFingerprint('one'),
  })
  assert.equal(second.ok, true)

  const snapshots = new Map([
    ['src/a.txt', {
      before: second.before,
      isNewFile: second.isNewFile,
      originalMode: second.originalMode,
      lastWrittenFingerprint: second.afterFingerprint,
    }],
  ])
  const rolledBack = rollbackTextEdits({ workspaceRoot: root, snapshots })
  assert.deepEqual(rolledBack.failed, [])
  assert.equal(fs.readFileSync(path.join(root, 'src/a.txt'), 'utf8'), 'one')

  const third = applyTextEdit({ workspaceRoot: root, path: 'src/a.txt', content: 'agent' })
  fs.writeFileSync(path.join(root, 'src/a.txt'), 'user-change')
  const protectedRollback = rollbackTextEdits({
    workspaceRoot: root,
    snapshots: new Map([['src/a.txt', {
      before: third.before,
      isNewFile: false,
      originalMode: third.originalMode,
      lastWrittenFingerprint: third.afterFingerprint,
    }]]),
  })
  assert.equal(protectedRollback.failed.length, 1)
  assert.equal(fs.readFileSync(path.join(root, 'src/a.txt'), 'utf8'), 'user-change')

  assert.equal(resolveSafeWorkspacePath(root, '../outside.txt'), null)
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-edit-outside-'))
  fs.symlinkSync(outside, path.join(root, 'linked'))
  assert.equal(resolveSafeWorkspacePath(root, 'linked/escape.txt'), null)
  fs.rmSync(outside, { recursive: true, force: true })

  const commandRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-command-checkpoint-'))
  const checkpointData = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-checkpoint-data-'))
  fs.writeFileSync(path.join(commandRoot, 'tracked.txt'), 'before')
  const checkpoint = captureWorkspaceCheckpoint({ workspaceRoot: commandRoot, id: 'test-turn' })
  assert.equal(checkpoint.ok, true)
  fs.writeFileSync(path.join(commandRoot, 'tracked.txt'), 'after')
  fs.writeFileSync(path.join(commandRoot, 'created.txt'), 'created')
  const finalized = finalizeWorkspaceCheckpoint(checkpoint)
  assert.equal(finalized.ok, true)
  assert.deepEqual(finalized.changes.map((change) => change.path), ['created.txt', 'tracked.txt'])
  const savedCheckpoint = saveWorkspaceCheckpoint(checkpointData, finalized)
  assert.equal(savedCheckpoint.saved, true)
  const loadedCheckpoint = loadWorkspaceCheckpoint(checkpointData, 'test-turn')
  const commandRollback = restoreWorkspaceCheckpoint(loadedCheckpoint)
  assert.deepEqual(commandRollback.failed, [])
  assert.equal(fs.readFileSync(path.join(commandRoot, 'tracked.txt'), 'utf8'), 'before')
  assert.equal(fs.existsSync(path.join(commandRoot, 'created.txt')), false)
  fs.rmSync(commandRoot, { recursive: true, force: true })
  fs.rmSync(checkpointData, { recursive: true, force: true })

  const workspaceWriter = fs.readFileSync(path.join(process.cwd(), 'server/workspace-write.cjs'), 'utf8')
  const hostLoop = fs.readFileSync(path.join(process.cwd(), 'server/host-agent-loop.mjs'), 'utf8')
  const orchestrator = fs.readFileSync(
    path.join(process.cwd(), 'server/vendor/cad/local-mcp-orchestrator.js'),
    'utf8',
  )
  assert.match(workspaceWriter, /require\('\.\/edit-engine\.cjs'\)/)
  assert.match(hostLoop, /require\('\.\/edit-engine\.cjs'\)/)
  assert.match(orchestrator, /MCP_DIRECT_WRITE_BLOCKED/)
  assert.match(hostLoop, /captureWorkspaceCheckpoint/)
  assert.match(hostLoop, /persistTurnCheckpoint/)

  console.log('check-edit-engine: ok')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
