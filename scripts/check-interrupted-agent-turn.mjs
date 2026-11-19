#!/usr/bin/env node
import assert from 'node:assert/strict'
import { buildInterruptedAssistantMessage } from '../shared/interrupted-agent-turn.mjs'

const traced = buildInterruptedAssistantMessage(
  [
    { role: 'user', content: '按照建议执行' },
    {
      role: 'assistant',
      content: '',
      agentTurn: {
        writtenPaths: ['server/example.mjs'],
        streamEvents: [
          { type: 'tool', name: 'Explored', arg: 'server/example.mjs', status: 'ok' },
          { type: 'tool', name: 'Edited', arg: 'server/example.mjs', status: 'ok' },
        ],
      },
    },
  ],
  '执行连接已中断',
)

assert.equal(traced.content, '')
assert.equal(traced.requestError, true)
assert.equal(traced.requestErrorDetail, '执行连接已中断')
assert.equal(traced.agentTurn.streamEvents.length, 2)
assert.deepEqual(traced.agentTurn.writtenPaths, ['server/example.mjs'])

const plain = buildInterruptedAssistantMessage(
  [{ role: 'assistant', content: '__WAITING__' }],
  '无法连接本机服务',
)
assert.equal(plain.content, '无法连接本机服务')
assert.equal(plain.requestErrorDetail, undefined)

console.log('check-interrupted-agent-turn: PASSED')
