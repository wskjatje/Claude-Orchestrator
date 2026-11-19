import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runTool } from '../server/host-agent-loop.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-read-page-'))
try {
  fs.writeFileSync(path.join(root, 'sample.txt'), 'one\ntwo\nthree\nfour\n', 'utf8')
  const ctx = { root, mode: 'ask', writtenPaths: new Set(), readPaths: new Set(), readSnapshots: new Map(), readCoverage: new Map(), readMaxChars: 2_000 }
  const first = await runTool('read_file', { path: 'sample.txt', offset: 1, limit: 2 }, ctx)
  assert.equal(first.lineCount, 5)
  assert.match(first.content, /^    2 │ two\n    3 │ three$/)
  assert.equal(first.nextOffset, 3)
  const second = await runTool('read_file', { path: 'sample.txt', offset: first.nextOffset, limit: 2 }, ctx)
  assert.match(second.content, /^    4 │ four\n    5 │ $/)
  assert.equal(second.nextOffset, null)

  fs.writeFileSync(path.join(root, 'long.txt'), `${'x'.repeat(2_500)}\ntail`, 'utf8')
  const long = await runTool('read_file', { path: 'long.txt', offset: 0, limit: 2 }, ctx)
  assert.equal(long.lineTruncated, true)
  assert.equal(long.nextOffset, 1)
  assert.match(long.content, /^    1 │ x+/)

  const agentCtx = { ...ctx, mode: 'agent' }
  const blockedOverwrite = await runTool('write_file', { path: 'long.txt', content: 'replacement\n' }, agentCtx)
  assert.equal(blockedOverwrite.ok, false)
  assert.equal(blockedOverwrite.preserveExisting, true)
  assert.match(blockedOverwrite.error, /禁止用 write_file 整体覆盖/)
  assert.equal(fs.readFileSync(path.join(root, 'long.txt'), 'utf8'), `${'x'.repeat(2_500)}\ntail`)
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}

console.log('ok: read_file pages maintain line numbers, nextOffset, and oversized-line truncation')
