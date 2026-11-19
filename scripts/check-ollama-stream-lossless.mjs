#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { appendOllamaIncrement } = require(path.join(root, 'shared/ollama-stream.cjs'))

let content = ''
const emitted = []
for (let i = 0; i < 30; i++) {
  content = appendOllamaIncrement(content, '的', (chunk) => emitted.push(chunk))
}
assert.equal(content, '的'.repeat(30), '30 个重复汉字必须全部保留')
assert.deepEqual(emitted, Array(30).fill('的'), '每个有效增量都应发出一次')

content = ''
for (const chunk of ['ha', 'ha', 'haha', 'ha']) {
  content = appendOllamaIncrement(content, chunk)
}
assert.equal(content, 'ha'.repeat(5), '重复的尾部文本不能触发重叠去重')

let emptyDeltaCount = 0
assert.equal(appendOllamaIncrement(content, ''), content, '空增量不改变结果')
assert.equal(appendOllamaIncrement(content, null), content, '非字符串增量不改变结果')
appendOllamaIncrement(content, '', () => emptyDeltaCount++)
assert.equal(emptyDeltaCount, 0, '空增量不发出展示事件')

console.log('check-ollama-stream-lossless: PASSED (30/30 repeated characters preserved)')
