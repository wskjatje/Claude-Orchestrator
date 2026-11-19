import assert from 'node:assert/strict'
import {
  fetchModelResponse,
  isVerificationCommand,
} from '../server/host-agent-loop.mjs'

let calls = 0
globalThis.fetch = async () => {
  calls += 1
  return new Response('limited', { status: 429, headers: { 'retry-after': '2' } })
}
const controller = new AbortController()
const pending = fetchModelResponse('https://provider.invalid/chat', { signal: controller.signal })
setTimeout(() => controller.abort(new Error('test cancelled')), 15)
await assert.rejects(pending, /test cancelled/)
assert.equal(calls, 1, 'abort during Retry-After backoff prevents another request')

let retryCalls = 0
let observedRetries = 0
globalThis.fetch = async () => {
  retryCalls += 1
  if (retryCalls <= 3) {
    return new Response('busy', { status: retryCalls === 1 ? 503 : 502, headers: { 'retry-after': '0' } })
  }
  return new Response('ok', { status: 200 })
}
const retried = await fetchModelResponse('https://provider.invalid/chat', {}, {
  onRetry: () => { observedRetries += 1 },
})
assert.equal(retried.status, 200)
assert.equal(retryCalls, 4, 'transient responses get at most three retries (four total attempts)')
assert.equal(observedRetries, 3, 'retry callback reports every retry')

assert.equal(isVerificationCommand('node test.js'), true)
assert.equal(isVerificationCommand('npm run build'), true)
assert.equal(isVerificationCommand('graphify-out'), false)
assert.equal(isVerificationCommand('pip install graphify-out'), false)
assert.equal(isVerificationCommand('custom-check', '请运行 custom-check 验证结果'), true)
console.log('ok: bounded retry/cancel and verification-command contracts')
