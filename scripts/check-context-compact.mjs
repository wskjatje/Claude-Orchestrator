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
  shouldAutoCompact,
  isSummarizeSlashCommand,
} from '../server/session-compact.mjs'
import {
  resolvePriorBudget,
  COMPACT_TOKEN_THRESHOLD,
  resolveCompactThresholds,
  DEFAULT_LOCAL_CONTEXT_TOKENS,
  LOCAL_USAGE_WINDOW_CAP,
  COMPACT_MIN_DIALOGUE_MESSAGES,
  PRIOR_KEEP_RECENT,
  PRIOR_KEEP_RECENT_DIRECT,
  LOCAL_ASK_NUM_PREDICT,
  LOCAL_DIRECT_NUM_PREDICT,
} from '../shared/context-budget.mjs'
import { compactDialogueBody } from '../shared/compact-summary.mjs'

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
assert(/目标|意图|技术要点|当前步骤/.test(sum.summary), 'Cursor-like summary fields')

const fat = [{ role: 'system', content: 's' }]
for (let i = 0; i < 40; i++) {
  fat.push({ role: 'user', content: `task ${i} ` + 'z'.repeat(3000) })
  fat.push({ role: 'assistant', content: `reply ${i} ` + 'w'.repeat(3000) })
}
const r = compactMessagesIfNeeded(fat, { threshold: COMPACT_CHAR_THRESHOLD })
assert(r.compacted && r.afterChars < r.beforeChars, 'compact shrinks')
assert(typeof r.beforeTokens === 'number', 'reports beforeTokens')

assert(shouldAutoCompact(COMPACT_CHAR_THRESHOLD), 'auto at char threshold')
assert(shouldAutoCompact(COMPACT_TOKEN_THRESHOLD * 4), 'auto at token×4 chars')
assert(!shouldAutoCompact(1000), 'no auto when small')

const localTh = resolveCompactThresholds({
  contextLength: DEFAULT_LOCAL_CONTEXT_TOKENS,
  isLocal: true,
})
assert(localTh.thresholdTokens < DEFAULT_LOCAL_CONTEXT_TOKENS, 'local threshold < window')
assert(localTh.windowTokens === DEFAULT_LOCAL_CONTEXT_TOKENS, 'local window')
assert(localTh.ratio >= 0.85, 'small window uses gentler ratio')
const cloudTh = resolveCompactThresholds({ contextLength: 128_000, isLocal: false })
assert(cloudTh.thresholdTokens === Math.floor(128_000 * 0.8), 'cloud 80% window')

assert(
  resolvePriorBudget({ contextLevel: 'agent-full', allowTools: true }).keepRecent ===
    PRIOR_KEEP_RECENT,
  'agent-full keeps full prior',
)
assert(
  resolvePriorBudget({ forceDirectChat: true }).keepRecent === PRIOR_KEEP_RECENT_DIRECT,
  'Ask uses direct prior',
)
assert(LOCAL_ASK_NUM_PREDICT >= 4096, 'Ask predict usable for mid answers')
assert(LOCAL_ASK_NUM_PREDICT < LOCAL_DIRECT_NUM_PREDICT, 'Ask predict still < Direct')
assert(COMPACT_MIN_DIALOGUE_MESSAGES >= 8, 'min dialogue before auto compact')

const shortFat = [{ role: 'system', content: 's' }]
for (let i = 0; i < 3; i++) {
  shortFat.push({ role: 'user', content: `u${i} ` + 'z'.repeat(5000) })
  shortFat.push({ role: 'assistant', content: `a${i} ` + 'w'.repeat(5000) })
}
const noEarly = compactMessagesIfNeeded(shortFat, { threshold: 100 })
assert(!noEarly.compacted, 'short dialogue never auto-compacts even if over char threshold')

assert(isSummarizeSlashCommand('/summarize'), 'slash summarize')
assert(isSummarizeSlashCommand('/压缩'), 'slash 压缩')
assert(!isSummarizeSlashCommand('请 summarize'), 'not bare word')

const prior = []
for (let i = 0; i < 20; i++) {
  prior.push({ role: 'user', content: `u${i} ` + 'p'.repeat(800) })
  prior.push({ role: 'assistant', content: `a${i} ` + 'q'.repeat(800) })
}
const slim = slimPriorMessagesForApi(prior, { keepRecent: 6, charCap: 500 })
assert(slim.length === 6, `slim keep recent (${slim.length})`)
assert(slim.every((m) => m.content.includes('prior truncated')), 'slim truncates long prior')

const askBudget = resolvePriorBudget({ forceDirectChat: true })
const askSlim = slimPriorMessagesForApi(prior, askBudget)
assert(askSlim.length === askBudget.keepRecent, `Ask slim keep (${askSlim.length})`)
assert(
  askSlim.every((m) => m.content.length <= askBudget.charCap + 80),
  'Ask slim respects charCap',
)

const forced = compactDialogueBody(prior, { force: true, keepRecent: 2 })
assert(forced && forced.messages.length <= 4, 'force compact keeps short tail')
assert(stringifyToolResult({ a: 1 }).includes('a'), 'stringify')

assert(
  LOCAL_USAGE_WINDOW_CAP >= 32_768 && LOCAL_USAGE_WINDOW_CAP <= 128_000,
  `LOCAL_USAGE_WINDOW_CAP sane (${LOCAL_USAGE_WINDOW_CAP})`,
)
const localCap = resolveCompactThresholds({
  contextLength: DEFAULT_LOCAL_CONTEXT_TOKENS,
  isLocal: true,
})
assert(
  localCap.windowTokens === DEFAULT_LOCAL_CONTEXT_TOKENS,
  'local resolve uses DEFAULT_LOCAL window',
)

if (process.exitCode) {
  console.error('\ncheck-context-compact: FAILED')
  process.exit(1)
}
console.log('\ncheck-context-compact: PASSED')
