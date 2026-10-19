/**
 * node scripts/check-shared-parity.mjs
 * 校验 shared 单源与消费方 / 双份镜像关键片段一致。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PRIOR_KEEP_RECENT,
  PRIOR_MESSAGE_CHAR_CAP,
  LOCAL_DIRECT_NUM_PREDICT,
  TOOL_RESULT_KEEP_RECENT,
} from '../shared/context-budget.mjs'
import { DEFAULT_OLLAMA_BASE } from '../shared/defaults.mjs'
import {
  PRIOR_KEEP_RECENT as SC_KEEP,
  PRIOR_MESSAGE_CHAR_CAP as SC_CAP,
} from '../server/session-compact.mjs'
import { TOOL_RESULT_KEEP_RECENT as CTR_KEEP } from '../server/context-tool-results.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

assert(SC_KEEP === PRIOR_KEEP_RECENT, 'session-compact PRIOR_KEEP re-export')
assert(SC_CAP === PRIOR_MESSAGE_CHAR_CAP, 'session-compact PRIOR_CAP re-export')
assert(CTR_KEEP === TOOL_RESULT_KEEP_RECENT, 'context-tool-results KEEP re-export')
assert(DEFAULT_OLLAMA_BASE.includes('11434'), 'default ollama base')

const host = fs.readFileSync(path.join(root, 'server/host-agent-loop.mjs'), 'utf8')
assert(!/keepRecent:\s*10\b/.test(host), 'host: no keepRecent=10 override')
assert(/PRIOR_KEEP_RECENT/.test(host), 'host: uses PRIOR_KEEP_RECENT')
assert(!/systemConstraint\}\n\n\$\{hostUserLine\}/.test(host), 'host file itself ok')

const send = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
assert(
  !/hostUserLine = `\$\{turnPolicy\.systemConstraint\}\\n\\n\$\{hostUserLine\}`/.test(send),
  'send: no systemConstraint double-inject into userLine',
)

const claudePrompt = fs.readFileSync(path.join(root, 'web/src/lib/claude-prompt.ts'), 'utf8')
assert(/policyBlock \? "" : interactionModePromptBlock/.test(claudePrompt), 'claude: skip mode when policy')

const plain = fs.readFileSync(path.join(root, 'web/src/lib/chat-send-helpers.ts'), 'utf8')
assert(/有回合策略时不再叠 mode/.test(plain) || /systemConstraint/.test(plain), 'plain: policy-first')

const slimTs = fs.readFileSync(path.join(root, 'web/src/lib/slim-prior-messages.ts'), 'utf8')
assert(/shared\/context-budget\.mjs/.test(slimTs), 'web slim-prior imports shared')

const orch = fs.readFileSync(path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js'), 'utf8')
assert(/LOCAL_DIRECT_NUM_PREDICT/.test(orch), 'local orch uses shared predict')
assert(LOCAL_DIRECT_NUM_PREDICT >= 4096, 'direct predict budget')
assert(/direct-chat-policy\.mjs/.test(orch), 'orch loads direct-chat-policy')
assert(/sanitize-direct-reply\.mjs/.test(orch), 'orch loads sanitize-direct-reply')
assert(/auditDirectChat/.test(orch), 'orch audits direct chat')

const cloudDirect = fs.readFileSync(path.join(root, 'server/cloud-direct.cjs'), 'utf8')
assert(/sanitize-direct-reply\.mjs/.test(cloudDirect), 'cloud-direct sanitizes final content')
assert(/finishDirectOk|sanitizeCloudDirectContent/.test(cloudDirect), 'cloud-direct finish sanitizer')

const readonlyDisp = fs.readFileSync(path.join(root, 'web/src/lib/readonly-turn-display.ts'), 'utf8')
assert(/sanitize-direct-reply\.mjs/.test(readonlyDisp), 'readonly display uses shared sanitize')

assert(/buildDirectChatPolicyBlock/.test(plain), 'plain prompt uses shared direct policy')

/** turn-policy 单源 shared；web/server 仅再导出 */
const sharedPol = fs.readFileSync(path.join(root, 'shared/turn-policy.mjs'), 'utf8')
const webPol = fs.readFileSync(path.join(root, 'web/src/lib/turn-policy.ts'), 'utf8')
const srvPol = fs.readFileSync(path.join(root, 'server/turn-policy.mjs'), 'utf8')
assert(/shared\/turn-policy\.mjs/.test(webPol), 'web turn-policy re-exports shared')
assert(/shared\/turn-policy\.mjs/.test(srvPol), 'server turn-policy re-exports shared')
assert(!/MUTATION_SPEECH_ACT_RE/.test(webPol), 'web turn-policy no duplicate regex')
assert(!/MUTATION_SPEECH_ACT_RE/.test(srvPol), 'server turn-policy no duplicate regex')
const markers = [
  '【回合策略·只读】',
  '怎么优化/如何改进/怎么用/还有哪些可以优化',
  '对齐 Cursor Ask',
  '禁止 ## 1/## 2 分节',
  '禁止文末推销下一步',
  'forceDirectChat',
  'slim-product',
  'TECHNICAL_QA_RE',
  'PLAN_DOCUMENT_SPEECH_ACT_RE',
  '【回合策略·方案文档】',
  '是否需你接入',
  'Cursor 执行反馈',
  '下一步 / P2',
  '禁止缺 path 瞎猜',
  '禁止格式错误时静默兜底',
  '【写盘内容·Cursor】',
  '禁止模块头教学式适配示例',
  'isPlanDocumentRequest',
  'suggestPlanDocumentRelPath',
  '禁止硬编码固定文件名',
]
for (const m of markers) {
  assert(sharedPol.includes(m), `turn-policy shared: ${m}`)
}

/** model-route 关键逻辑两侧 */
const webCat = fs.readFileSync(path.join(root, 'web/src/lib/model-catalog.ts'), 'utf8')
const srvRoute = fs.readFileSync(path.join(root, 'server/resolve-execution-model.mjs'), 'utf8')
assert(/preferredCloudModel/.test(webCat) && /preferredCloudModel/.test(srvRoute), 'preferred model both')
assert(/prefer-local/.test(webCat) && /prefer-local/.test(srvRoute), 'route hint both')
assert(
  /LOCAL_PROVIDER_REQUIRED_ERROR/.test(webCat) && /LOCAL_PROVIDER_REQUIRED_ERROR/.test(srvRoute),
  'local provider hard-fail both',
)
assert(
  /MODEL_NOT_IN_POOL_ERROR/.test(webCat) && /MODEL_NOT_IN_POOL_ERROR/.test(srvRoute),
  'model not in pool both',
)
assert(
  /routeHint === ['"]prefer-local['"]\) return pickLocal\(\)/.test(webCat) &&
    /routeHint === ['"]prefer-local['"]\) return pickLocal\(\)/.test(srvRoute),
  'prefer-local returns pickLocal only',
)
assert(
  !/routeHint === ['"]prefer-local['"]\) return pickLocal\(\)\s*\|\|/.test(webCat) &&
    !/routeHint === ['"]prefer-local['"]\) return pickLocal\(\)\s*\|\|/.test(srvRoute),
  'prefer-local no silent cloud fallback',
)
assert(
  sharedPol.includes('禁止硬编码固定文件名') && sharedPol.includes('optimization-plan.md'),
  'plan path no hardcoded optimization-plan.md',
)
assert(!fs.existsSync(path.join(root, 'server/write-policy.cjs')), 'dead write-policy.cjs removed')
assert(!fs.existsSync(path.join(root, 'web/src/lib/write-policy.ts')), 'dead write-policy.ts removed')
const cadBridge = fs.readFileSync(path.join(root, 'server/cad-bridge.cjs'), 'utf8')
assert(/toolWrittenPaths: writeMode === 'agent'/.test(cadBridge), 'local orch returns toolWrittenPaths')
assert(/sessionWritten/.test(cadBridge), 'tracking writer records agent writes')

const chain = fs.readFileSync(path.join(root, 'server/cad-bridge.cjs'), 'utf8')
assert(!/Manual 模式/.test(chain), 'chain hint: no Manual')
assert(/Plan 模式/.test(chain), 'chain hint: Plan')

if (process.exitCode) {
  console.error('\ncheck-shared-parity: FAILED')
  process.exit(1)
}
console.log('\ncheck-shared-parity: PASSED')
