/**
 * node scripts/check-turn-policy.mjs
 */
import {
  classifyTurnIntent,
  resolveTurnPolicy,
  shouldInjectProjectBootstrap,
  isPlanDocumentRequest,
  suggestPlanDocumentRelPath,
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

assert(classifyTurnIntent('架构怎么样') === 'readonly', 'tech: 架构 → readonly')
assert(classifyTurnIntent('依赖有哪些') === 'readonly', 'tech: 依赖 → readonly')
assert(classifyTurnIntent('登录怎么用') === 'readonly', 'tech: 怎么用 → readonly')
assert(classifyTurnIntent('性能瓶颈在哪') === 'readonly', 'tech: 性能 → readonly')
assert(classifyTurnIntent('告诉我这个项目该怎么优化') === 'readonly', 'tech: 怎么优化 → readonly')
assert(shouldInjectProjectBootstrap('架构怎么样'), 'tech: slim bootstrap')
assert(classifyTurnIntent('按照方案执行') === 'write', 'execute plan → write')
assert(classifyTurnIntent('按上面的优化方案执行') === 'write', 'execute prior plan → write')
assert(classifyTurnIntent('开始执行优化方案') === 'write', 'start execute → write')
assert(classifyTurnIntent('请按方案改代码并落盘') === 'write', '改代码落盘 → write')
assert(classifyTurnIntent('执行P2') === 'write', '执行P2 → write')
assert(classifyTurnIntent('你好') === 'chat', 'hi stays chat')
assert(!isPlanDocumentRequest('给我一个合理优化方案'), 'oral plan ≠ plan-doc write')
assert(!isPlanDocumentRequest('根据以上优化给我一个优化方案'), 'oral follow-up ≠ plan-doc')
assert(!isPlanDocumentRequest('告诉我这个项目是做什么的'), 'product Q not plan-doc')
assert(isPlanDocumentRequest('写一份优化方案'), 'explicit write plan → plan-doc')
assert(isPlanDocumentRequest('把方案写到 docs/优化方案.md'), 'path write → plan-doc')

const agentOralPlan = resolveTurnPolicy({
  displayLine: '给我一个合理优化方案',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  !agentOralPlan.allowWrites &&
    agentOralPlan.forceDirectChat &&
    agentOralPlan.contextLevel === 'slim-product',
  'Agent+口头优化方案 → slim readonly (Cursor Ask 同构)',
)

const agentAskOptimize = resolveTurnPolicy({
  displayLine: '告诉我这个项目该怎么优化，给我一个合理优化方案',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  !agentAskOptimize.allowWrites &&
    agentAskOptimize.forceDirectChat &&
    agentAskOptimize.contextLevel === 'slim-product',
  'Agent+告诉我怎么优化+方案 → 不强制写盘、无落盘失败横幅',
)

const agentPlanDoc = resolveTurnPolicy({
  displayLine: '写一份优化方案',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  agentPlanDoc.allowWrites &&
    agentPlanDoc.autoApplyWrites &&
    !agentPlanDoc.forceDirectChat &&
    agentPlanDoc.allowTools,
  'Agent+写一份优化方案 → write plan doc',
)
assert(
  /方案文档/.test(agentPlanDoc.systemConstraint) &&
    /禁止硬编码固定文件名/.test(agentPlanDoc.systemConstraint) &&
    !/docs\/optimization-plan\.md/.test(agentPlanDoc.systemConstraint),
  'Agent plan constraint (no hardcoded path)',
)

const planModeDoc = resolveTurnPolicy({
  displayLine: '写一份完整优化方案',
  interactionMode: 'plan',
  isGeneralTurn: true,
})
assert(
  planModeDoc.allowWrites &&
    !planModeDoc.autoApplyWrites &&
    !planModeDoc.forceDirectChat,
  'Plan+写一份优化方案 → staged write',
)

const askPlanDoc = resolveTurnPolicy({
  displayLine: '给我一个合理优化方案',
  interactionMode: 'ask',
  isGeneralTurn: true,
})
assert(!askPlanDoc.allowWrites && askPlanDoc.forceDirectChat, 'Ask+优化方案 still chat-only')

const agentExec = resolveTurnPolicy({
  displayLine: '按照方案执行',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  agentExec.allowWrites && agentExec.autoApplyWrites && !agentExec.forceDirectChat,
  'Agent+按方案执行 → write tools',
)
const askExec = resolveTurnPolicy({
  displayLine: '按照方案执行',
  interactionMode: 'ask',
  isGeneralTurn: true,
})
assert(!askExec.allowWrites && askExec.forceDirectChat, 'Ask+按方案执行 still readonly channel')

const techArch = resolveTurnPolicy({
  displayLine: '架构怎么样',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  !techArch.allowWrites && techArch.forceDirectChat && techArch.contextLevel === 'slim-product',
  'Agent+架构 → slim readonly',
)

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

const agentWriteYiGe = resolveTurnPolicy({
  displayLine: '写一个文件 test-mcp.txt 内容 hello',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  agentWriteYiGe.allowWrites && agentWriteYiGe.allowTools && !agentWriteYiGe.forceDirectChat,
  'Agent+写一个文件+扩展名 → write tools',
)

const agentHi = resolveTurnPolicy({
  displayLine: '你好',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(agentHi.forceDirectChat && !agentHi.allowTools && !agentHi.allowWrites, 'Agent+hi → direct, no tools/writes')

const agentMcpRead = resolveTurnPolicy({
  displayLine: '请调用 memory 的 read_graph',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  !agentMcpRead.allowWrites &&
    agentMcpRead.allowTools &&
    !agentMcpRead.forceDirectChat &&
    /只读工具/.test(agentMcpRead.systemConstraint),
  'Agent+调用 memory → tools, no writes',
)
const askMcpRead = resolveTurnPolicy({
  displayLine: '请调用 memory 的 read_graph',
  interactionMode: 'ask',
  isGeneralTurn: true,
})
assert(askMcpRead.forceDirectChat && !askMcpRead.allowTools, 'Ask+调用 memory → still direct')
const howToCall = resolveTurnPolicy({
  displayLine: '怎么调用 memory',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(howToCall.forceDirectChat && !howToCall.allowTools, '怎么调用 → not a tool turn')

const agentChatNamed = resolveTurnPolicy({
  displayLine: '继续说说架构',
  interactionMode: 'agent',
  isGeneralTurn: false,
  isNamedAgent: true,
})
assert(!agentChatNamed.allowWrites, 'Agent+named+chat → no writes')

/** 与 use-chat-send wantsToolLoop 对齐：仅 Claude 系进 CLI */
function cloudWantsToolLoop(policy, ixMode, modelId = 'claude-sonnet') {
  const claude = /^(sonnet|opus|haiku|claude)(-|$)/i.test(String(modelId || ''))
  return (
    claude &&
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
assert(cloudWantsToolLoop(agentW, 'agent', 'claude-sonnet'), 'cloud: Claude Agent+mutation → CLI')
assert(!cloudWantsToolLoop(agentW, 'agent', 'deepseek-v4-flash'), 'cloud: DeepSeek Agent → 供应商 API，不进 CLI')
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

/** 工作区保真：换仓后首问仍绑定只读 + slim（门禁） */
const afterWsSwitch = resolveTurnPolicy({
  displayLine: '这个项目主要做了什么',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  !afterWsSwitch.allowWrites && afterWsSwitch.contextLevel === 'slim-product',
  'gate: post-switch Q → slim readonly',
)
assert(classifyTurnIntent('性能怎么样') === 'readonly', 'gate: 性能怎么样 → readonly')
assert(classifyTurnIntent('请修复登录超时并写入 auth.ts') === 'write', 'gate: 修复写入 → write')

/** 边界句回归：少改规则，用用例锁行为（误判风险显式可见） */
assert(classifyTurnIntent('怎么改比较好') === 'readonly', 'boundary: 怎么改比较好 → readonly')
assert(classifyTurnIntent('优化一下') === 'chat' || classifyTurnIntent('优化一下') === 'readonly', 'boundary: 优化一下 not write')
assert(classifyTurnIntent('优化一下') !== 'write', 'boundary: 优化一下 ≠ write')
assert(classifyTurnIntent('还有哪些可以优化') === 'readonly', 'boundary: 还有哪些可以优化 → readonly')
assert(classifyTurnIntent('改成什么比较合适？') === 'write' || classifyTurnIntent('改成什么比较合适？') === 'readonly', 'boundary: 改成什么？ classified')
assert(classifyTurnIntent('请动手改') === 'write', 'boundary: 请动手改 → write')
assert(classifyTurnIntent('go ahead') === 'write', 'boundary: go ahead → write')
assert(classifyTurnIntent('写一份优化方案') !== 'write' || isPlanDocumentRequest('写一份优化方案'), 'boundary: 写方案 is plan-doc speech')
assert(isPlanDocumentRequest('写一份优化方案'), 'boundary: 写一份优化方案 → plan-doc')
assert(classifyTurnIntent('写一份优化方案') === 'chat' || classifyTurnIntent('写一份优化方案') === 'readonly', 'boundary: 写方案 alone not mutation write')

const planSuggest = suggestPlanDocumentRelPath('写一份优化方案')
assert(/^docs\/.+\.md$/i.test(planSuggest), 'suggest plan path under docs/*.md')
assert(!/optimization-plan\.md/i.test(planSuggest), 'suggest path not hardcoded optimization-plan.md')
const agentPlanSuggested = resolveTurnPolicy({
  displayLine: '写一份优化方案',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  agentPlanSuggested.systemConstraint.includes(planSuggest),
  'Agent plan constraint embeds suggested path',
)
assert(classifyTurnIntent('告诉我这个项目该怎么优化，给我一个合理优化方案') === 'readonly', 'screenshot case → readonly')

if (process.exitCode) {
  console.error('\ncheck-turn-policy: FAILED')
  process.exit(1)
}
console.log('\ncheck-turn-policy: PASSED')
