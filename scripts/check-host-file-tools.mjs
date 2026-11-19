import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { applyUnifiedPatch } = require('../server/edit-patch.cjs')

const patched = applyUnifiedPatch(
  'one\ntwo\nthree\n',
  '@@ -1,3 +1,3 @@\n one\n-two\n+TWO\n three',
)
assert.equal(patched.ok, true)
assert.equal(patched.content, 'one\nTWO\nthree\n')
assert.equal(applyUnifiedPatch('one\n', '@@ -1 +1 @@\n-wrong\n+two').ok, false)

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-host-file-tools-'))
process.env.WORKBENCH_WORKSPACE = root
fs.mkdirSync(path.join(root, 'src'), { recursive: true })
fs.writeFileSync(path.join(root, 'src/a.txt'), 'alpha\nbeta\ngamma\n')
fs.writeFileSync(path.join(root, 'src/b.txt'), 'first\nsecond\n')

const { runTool, plannedTurnLimit } = await import('../server/host-agent-loop.mjs')
assert.equal(plannedTurnLimit(16, 4), 16)
assert.equal(plannedTurnLimit(16, 5), 34)
assert.equal(plannedTurnLimit(16, 20), 40)
const ctx = {
  root,
  mode: 'agent',
  deferredWrites: [],
  writtenPaths: new Set(),
  readPaths: new Set(),
  readSnapshots: new Map(),
  rollbackSnapshots: new Map(),
  readMaxChars: 16_000,
  filePatches: [],
  ranVerify: false,
  verificationPassed: false,
  lastVerificationOutput: '',
  lastVerificationTool: '',
  writeRevision: 0,
  requestId: 'file-tools-test',
  requestSignal: new AbortController().signal,
  mcpRuntime: null,
  turnCheckpoint: null,
  commandChangedPaths: new Set(),
}

try {
  const listed = await runTool('list_dir', { path: 'src' }, ctx)
  assert.equal(listed.ok, true)
  assert.deepEqual(listed.entries.map((entry) => entry.name), ['a.txt', 'b.txt'])

  const globbed = await runTool('glob', { pattern: 'src/**/*.txt' }, ctx)
  assert.equal(globbed.ok, true)
  assert.deepEqual(globbed.matches, ['src/a.txt', 'src/b.txt'])

  const todos = await runTool('todo_write', {
    items: [
      { id: 'read', title: '读取文件', status: 'completed' },
      { id: 'edit', title: '修改文件', status: 'in_progress' },
    ],
  }, ctx)
  assert.equal(todos.ok, true)
  assert.equal(todos.completed, 1)
  const invalidTodos = await runTool('todo_write', {
    items: [
      { id: 'a', title: 'A', status: 'in_progress' },
      { id: 'b', title: 'B', status: 'in_progress' },
    ],
  }, ctx)
  assert.equal(invalidTodos.ok, false)

  const patchResult = await runTool('apply_patch', {
    path: 'src/a.txt',
    patch: '@@ -1,3 +1,3 @@\n alpha\n-beta\n+BETA\n gamma',
  }, ctx)
  assert.equal(patchResult.ok, true)
  assert.match(fs.readFileSync(path.join(root, 'src/a.txt'), 'utf8'), /BETA/)

  const multi = await runTool('multi_edit', {
    edits: [
      { path: 'src/a.txt', old_string: 'gamma', new_string: 'GAMMA' },
      { path: 'src/b.txt', old_string: 'second', new_string: 'SECOND' },
    ],
  }, ctx)
  assert.equal(multi.ok, true)
  assert.deepEqual(multi.written, ['src/a.txt', 'src/b.txt'])

  const moved = await runTool('move_file', { from: 'src/b.txt', to: 'src/c.txt' }, ctx)
  assert.equal(moved.ok, true)
  assert.equal(fs.existsSync(path.join(root, 'src/b.txt')), false)
  assert.equal(fs.existsSync(path.join(root, 'src/c.txt')), true)

  const deleted = await runTool('delete_file', { path: 'src/c.txt' }, ctx)
  assert.equal(deleted.ok, true)
  assert.equal(fs.existsSync(path.join(root, 'src/c.txt')), false)

  const planCtx = { ...ctx, mode: 'plan' }
  const planMove = await runTool('move_file', { from: 'src/a.txt', to: 'src/z.txt' }, planCtx)
  assert.equal(planMove.ok, false)
  assert.equal(planMove.deferred, true)

  console.log('check-host-file-tools: ok')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
