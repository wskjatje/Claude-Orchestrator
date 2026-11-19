#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const routes = read('web/src/routes/index.tsx')
const closeStart = routes.indexOf('const handleCloseSession = async')
const closeEnd = routes.indexOf('\n  const runPmDelegationRuntime', closeStart)
assert.ok(closeStart >= 0 && closeEnd > closeStart, 'handleCloseSession section exists')
const closeSession = routes.slice(closeStart, closeEnd)
assert.doesNotMatch(closeSession, /(?:Abort|abort)\(/, 'closing a tab must not abort its running task')
assert.doesNotMatch(
  closeSession,
  /activeRequestIdsRef\.current\.delete|setSessionSending\([^,]+,\s*false\)/,
  'closing a tab must not forge completion state for a running task',
)

const wbsStart = routes.indexOf('const runWorkflowFromWbs = async')
const wbsEnd = routes.indexOf('\n  runWorkflowFromWbsRef.current', wbsStart)
assert.ok(wbsStart >= 0 && wbsEnd > wbsStart, 'runWorkflowFromWbs section exists')
const wbs = routes.slice(wbsStart, wbsEnd)
const busyStart = wbs.indexOf('if (opts?.autoRun && (runningNow || sendingRef.current))')
const busyEnd = wbs.indexOf('\n      }', busyStart)
assert.ok(busyStart >= 0 && busyEnd > busyStart, 'auto-run busy guard exists')
const busyGuard = wbs.slice(busyStart, busyEnd)
assert.doesNotMatch(busyGuard, /stopChat\(|stopChainExecution\(/, 'auto-run must not kill active work')
assert.match(busyGuard, /return \{ ok: false, error \}/, 'auto-run must report the busy conflict')

const chatSend = read('web/src/hooks/use-chat-send.ts')
const abortCalls = [...chatSend.matchAll(/hostAgentAbort\(([^\n]+)\)/g)]
assert.equal(abortCalls.length, 1, 'Host cancellation has exactly one UI call site')
assert.match(abortCalls[0][1], /source:\s*["']user-stop["']/, 'UI cancellation carries explicit user provenance')

const handlers = read('server/handlers.mjs')
const abortHandlerStart = handlers.indexOf('"host-agent:abort"')
const abortHandlerEnd = handlers.indexOf('\n  "claude-code:ensureCli"', abortHandlerStart)
const abortHandler = handlers.slice(abortHandlerStart, abortHandlerEnd)
assert.match(abortHandler, /source !== ["']user-stop["']/, 'server rejects non-user cancellation sources')

console.log('check-explicit-agent-cancel: PASSED')
