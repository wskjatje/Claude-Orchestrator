/**
 * node scripts/check-turn-policy.mjs
 */
import {
  classifyTurnIntent,
  resolveTurnPolicy,
  shouldInjectProjectBootstrap,
  effectiveWriteMode,
  cliPermissionModeFromWriteMode,
} from '../server/turn-policy.mjs'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

assert(classifyTurnIntent('告诉我这个项目是做什么的') === 'readonly', 'Q → readonly')
assert(classifyTurnIntent('这个项目主要做了什么') === 'readonly', 'Q2 → readonly')
assert(classifyTurnIntent('请把登录文案改成中文并写入 templates/login.html') === 'write', 'mutation → write')
assert(classifyTurnIntent('修复 auth.py 里的 token 过期 bug') === 'write', 'fix → write')
assert(shouldInjectProjectBootstrap('告诉我这个项目是做什么的'), 'slim context')

const askQ = resolveTurnPolicy({
  displayLine: '告诉我这个项目是做什么的',
  interactionMode: 'ask',
  isGeneralTurn: true,
})
assert(!askQ.allowWrites && askQ.forceDirectChat && !askQ.autoApplyWrites, 'Ask+Q')

const agentQ = resolveTurnPolicy({
  displayLine: '告诉我这个项目是做什么的',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(!agentQ.allowWrites && agentQ.forceDirectChat && !agentQ.autoApplyWrites, 'Agent+Q still readonly')

const agentW = resolveTurnPolicy({
  displayLine: '请把 README 第一段改成中文并保存',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(agentW.allowWrites && agentW.autoApplyWrites && !agentW.forceDirectChat, 'Agent+mutation → write')

const agentHi = resolveTurnPolicy({
  displayLine: '你好',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(agentHi.forceDirectChat && !agentHi.allowTools && !agentHi.allowWrites, 'Agent+hi → direct, no tools/writes')

const agentChatNamed = resolveTurnPolicy({
  displayLine: '继续说说架构',
  interactionMode: 'agent',
  isGeneralTurn: false,
  isNamedAgent: true,
})
assert(!agentChatNamed.allowWrites, 'Agent+named+chat → no writes')

/** 云端路由语义（与 use-chat-send wantsToolLoop 对齐） */
function cloudWantsToolLoop(policy, ixMode) {
  return (
    Boolean(policy.allowTools) &&
    !policy.forceDirectChat &&
    (ixMode === 'agent' || ixMode === 'plan')
  )
}
function cloudCliPerm(policy, ixMode) {
  if (policy.allowWrites === false) return 'plan'
  return ixMode === 'agent' ? 'acceptEdits' : 'plan'
}

assert(!cloudWantsToolLoop(agentQ, 'agent'), 'cloud: Agent+Q → no tool loop')
assert(cloudCliPerm(agentQ, 'agent') === 'plan', 'cloud: Agent+Q → plan perm')
assert(cloudWantsToolLoop(agentW, 'agent'), 'cloud: Agent+mutation → tool loop')
assert(cloudCliPerm(agentW, 'agent') === 'acceptEdits', 'cloud: Agent+mutation → acceptEdits')
assert(!cloudWantsToolLoop(askQ, 'ask'), 'cloud: Ask+Q → no tool loop')

assert(effectiveWriteMode(agentQ) === 'ask', 'writeMode: Agent+Q → ask')
assert(effectiveWriteMode(agentW) === 'agent', 'writeMode: Agent+mutation → agent')
assert(effectiveWriteMode(askQ) === 'ask', 'writeMode: Ask+Q → ask')
const planW = resolveTurnPolicy({
  displayLine: '请把 README 第一段改成中文并保存',
  interactionMode: 'plan',
  isGeneralTurn: true,
})
assert(effectiveWriteMode(planW) === 'plan', 'writeMode: Plan+mutation → plan')
assert(cliPermissionModeFromWriteMode('ask') === 'plan', 'cliPerm: ask→plan')
assert(cliPermissionModeFromWriteMode('agent') === 'acceptEdits', 'cliPerm: agent→acceptEdits')

if (process.exitCode) {
  console.error('\ncheck-turn-policy: FAILED')
  process.exit(1)
}
console.log('\ncheck-turn-policy: PASSED')
