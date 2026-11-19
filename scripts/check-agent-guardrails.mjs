import assert from 'node:assert/strict'
import fs from 'node:fs'
import { evaluateTurnBudget } from '../server/host-agent-loop.mjs'

assert.equal(evaluateTurnBudget({ totalTokens: 999, tokenLimit: 1000 }).exceeded, false)
const token = evaluateTurnBudget({ totalTokens: 1000, tokenLimit: 1000 })
assert.equal(token.exceeded, true)
assert.equal(token.type, 'token')
assert.match(token.message, /token 上限 1000/)

const cost = evaluateTurnBudget({ costUsd: 0.051, costLimitUsd: 0.05 })
assert.equal(cost.exceeded, true)
assert.equal(cost.type, 'cost')
assert.match(cost.message, /费用.*\$0\.0500/)

const host = fs.readFileSync(new URL('../server/host-agent-loop.mjs', import.meta.url), 'utf8')
assert.match(host, /await rollbackHostWrites\(ctx\)/, 'budget stop keeps rollback path')
assert.match(host, /errorType: 'budget-limit'/)

const send = fs.readFileSync(new URL('../web/src/hooks/use-chat-send.ts', import.meta.url), 'utf8')
assert.match(send, /settings\.modelRouteLock === "local"[\s\S]*"prefer-local"/)
assert.match(send, /settings\.modelRouteLock === "cloud"[\s\S]*"prefer-cloud"/)

const settingsUi = fs.readFileSync(new URL('../web/src/components/models-connections-panel.tsx', import.meta.url), 'utf8')
assert.match(settingsUi, /data-testid="agent-model-guardrails"/)
assert.match(settingsUi, /只用本地模型/)
assert.match(settingsUi, /只用云模型/)

console.log('check-agent-guardrails: ok')
