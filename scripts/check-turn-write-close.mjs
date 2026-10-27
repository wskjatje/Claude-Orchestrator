#!/usr/bin/env node
/**
 * 闸门：写意图 0 落盘须失败；requestError 不剥围栏原文。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const closeSrc = fs.readFileSync(path.join(root, 'web/src/lib/turn-write-close.ts'), 'utf8')
const readonlySrc = fs.readFileSync(
  path.join(root, 'web/src/lib/readonly-turn-display.ts'),
  'utf8',
)
const orchSrc = fs.readFileSync(
  path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js'),
  'utf8',
)
const sendSrc = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else console.log('ok:', msg)
}

assert(/requireAppliedWrite/.test(closeSrc), 'close-loop has requireAppliedWrite')
assert(/本轮需要改文件，但未写入任何内容/.test(closeSrc), 'zero-write error copy (user-facing)')
assert(/softenStoredRequestError/.test(closeSrc), 'stored protocol banners hidden')
assert(/softenStoredAssistantFailure/.test(closeSrc), 'stored connection failures softened')
assert(!/须用 search_replace/.test(closeSrc), 'zero-write copy has no tool jargon')
assert(
  /if \(opts\.requestError\) return false/.test(readonlySrc),
  'requestError does not force readonly sanitize',
)
assert(/requireAppliedWrite/.test(sendSrc), 'use-chat-send passes requireAppliedWrite')
assert(/intent === ["']write["']/.test(sendSrc), 'require write only on mutation intent')
assert(/未能写入文件|未写入任何|声称已改文件/.test(sendSrc), 'local repair covers zero-write')
assert(/ensureLocalCodingTools/.test(orchSrc), 'local coding tools injected')
assert(/explore nudge/.test(orchSrc), 'explore-before-write nudge')
assert(/write nudge/.test(orchSrc), 'write-before-finish nudge')
assert(/incomplete final → continue/.test(orchSrc), 'react incomplete continue')
assert(/list_dir/.test(orchSrc) && /search_replace/.test(orchSrc), 'cursor-like local tools')
assert(/isFragileOllamaToolsModel/.test(orchSrc), 'gemma fragile tools detector')
assert(/isMeasuredOllamaToolsSchemaRejectModel/.test(orchSrc), 'qwen2.5:32b measured tools reject detector')
assert(/qwen2\.5:32b/.test(orchSrc) && /不会改走直聊/.test(orchSrc), '32b hard-fail copy forbids direct fallback')
assert(!/请换 qwen2\.5 \/ qwen2\.5-coder/.test(orchSrc), 'schema reject copy must not recommend qwen2.5 family')
assert(!/如 qwen2\.5 \/ qwen2\.5-coder/.test(orchSrc), 'probe reject copy must not recommend qwen2.5 family')
assert(!/未测出该 400 的 qwen2\.5-coder:14b/.test(orchSrc), 'must not claim coder:14b never 400s')
assert(/toolsTrace/.test(orchSrc) && /extractOfferedToolNames/.test(orchSrc), 'zero-call toolsTrace on success return')
assert(/loopOut\.toolsTrace/.test(orchSrc), 'outer orch return forwards loopOut.toolsTrace')
assert(
  /policyAllowsTools\s*\?\s*false\s*:\s*shouldUseDirectReplyMode/.test(orchSrc),
  'policyAllowsTools overrides directReplyMode heuristic',
)
assert(/flattenToolMessagesForPlainChat/.test(orchSrc), 'flatten tool history for plain finish')
assert(/flatten\+plain finish/.test(orchSrc), 'schema 400 after tool history uses plain finish')
assert(/buildFragileModelCodingToolsOnly/.test(orchSrc), 'gemma coding-only tools')
assert(/fragileModel=/.test(orchSrc), 'gemma strips MCP tools pack')
assert(/tools schema reject → retry coding-only/.test(orchSrc), 'schema 400 retries coding-only')
assert(/stripBraceNoiseForFragileModel/.test(orchSrc), 'fragile strips braces in system')
assert(/runLocalFragileFenceWriteChat/.test(orchSrc), 'gemma fence-write path')
assert(/fragileFenceWrite/.test(orchSrc), 'fence-write flag for direct chat')
assert(/→ fence-write/.test(orchSrc) || /fence-write'/.test(orchSrc), 'gemma early fence-write branch')

const mcpHealthSrc = fs.readFileSync(path.join(root, 'server/mcp-health.mjs'), 'utf8')
assert(/stderr:\s*['"]pipe['"]/.test(mcpHealthSrc), 'mcp-health pipes stderr')
assert(
  mcpHealthSrc.includes("\\bnpx\\b") &&
    /npx 缓存可能损坏/.test(mcpHealthSrc) &&
    /Connection closed\|ERR_MODULE_NOT_FOUND/.test(mcpHealthSrc),
  'npx cache hint gated on npx command',
)
assert(/stderr: \$\{stderrText\}/.test(mcpHealthSrc), 'health error appends stderr')

/** Cursor 执行反馈模板：写盘后短收尾 + 禁下一步推销 */
const compressSrc = fs.readFileSync(
  path.join(root, 'web/src/lib/compress-agent-display.ts'),
  'utf8',
)
assert(/applyCursorExecFeedbackTemplate/.test(compressSrc), 'compress: Cursor exec feedback template')
assert(/takeCursorExecCloseProse/.test(compressSrc), 'compress: 1–3 sentence close')
assert(/looksLikeUpsellLine/.test(compressSrc), 'compress: upsell filter')
assert(/looksLikeWriteCloseChatter/.test(compressSrc), 'compress: write-chatter detector')
assert(/hasWrites/.test(compressSrc) && /applyCursorExecFeedbackTemplate/.test(compressSrc), 'compress: writes force template')
assert(
  /writtenForTurn\.length/.test(sendSrc) && /shapeAgentTurnDisplay/.test(sendSrc),
  'send: shape after any successful writes',
)

if (process.exitCode) {
  console.error('check-turn-write-close: FAILED')
  process.exit(1)
}
console.log('check-turn-write-close: PASSED')
