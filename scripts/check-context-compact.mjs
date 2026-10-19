/**
 * node scripts/check-context-compact.mjs
 */
import {
  maybeOffloadToolResult,
  clearStaleToolResults,
  stringifyToolResult,
  TOOL_RESULT_INLINE_MAX,
} from '../server/context-tool-results.mjs'
import {
  buildStructuredCompactSummary,
  compactMessagesIfNeeded,
  slimPriorMessagesForApi,
  COMPACT_CHAR_THRESHOLD,
} from '../server/session-compact.mjs'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

const small = maybeOffloadToolResult('/tmp', 'read_file', '{"ok":true}')
assert(small.content.includes('ok') && !small.offloaded, 'small result inline')

const big = 'x'.repeat(TOOL_RESULT_INLINE_MAX + 500)
const truncated = maybeOffloadToolResult('', 'run_command', big)
assert(truncated.truncated && truncated.content.includes('[truncated'), 'no-root truncates')

const msgs = []
for (let i = 0; i < 10; i++) {
  msgs.push({ role: 'tool', content: JSON.stringify({ i, pad: 'y'.repeat(200) }) })
}
const cleared = clearStaleToolResults(msgs, { keepRecent: 3 })
assert(cleared.cleared >= 7, `cleared stale tools (${cleared.cleared})`)
assert(JSON.parse(msgs[msgs.length - 1].content).i === 9, 'kept recent tool')

const dialogue = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: '请实现登录功能' },
  { role: 'assistant', content: '将改 src/auth.ts' },
  { role: 'user', content: '继续修 bug' },
  { role: 'assistant', content: '决定采用 JWT' },
  { role: 'user', content: '跑测试' },
  { role: 'assistant', content: 'Error: fail' },
  { role: 'user', content: '再试' },
  { role: 'assistant', content: 'ok' },
  { role: 'user', content: '收尾' },
  { role: 'assistant', content: 'done' },
]
const sum = buildStructuredCompactSummary(dialogue)
assert(sum && /会话摘要/.test(sum.summary), 'structured summary')

const fat = [{ role: 'system', content: 's' }]
for (let i = 0; i < 40; i++) {
  fat.push({ role: 'user', content: `task ${i} ` + 'z'.repeat(3000) })
  fat.push({ role: 'assistant', content: `reply ${i} ` + 'w'.repeat(3000) })
}
const r = compactMessagesIfNeeded(fat, { threshold: COMPACT_CHAR_THRESHOLD })
assert(r.compacted && r.afterChars < r.beforeChars, 'compact shrinks')
assert(stringifyToolResult({ a: 1 }).includes('a'), 'stringify')

const prior = []
for (let i = 0; i < 20; i++) {
  prior.push({ role: 'user', content: `u${i} ` + 'p'.repeat(800) })
  prior.push({ role: 'assistant', content: `a${i} ` + 'q'.repeat(800) })
}
const slim = slimPriorMessagesForApi(prior, { keepRecent: 6, charCap: 500 })
assert(slim.length === 6, `slim keep recent (${slim.length})`)
assert(slim.every((m) => m.content.includes('prior truncated')), 'slim truncates long prior')

if (process.exitCode) {
  console.error('\ncheck-context-compact: FAILED')
  process.exit(1)
}
console.log('\ncheck-context-compact: PASSED')
