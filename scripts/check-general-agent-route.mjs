import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { shouldUseUnifiedAgentLoop } from '../shared/agent-execution-route.mjs'
import { resolveTurnPolicy } from '../server/turn-policy.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const generalAgentWrite = resolveTurnPolicy({
  displayLine: '执行全部已确认优化并验证',
  interactionMode: 'agent',
  isGeneralTurn: true,
  isNamedAgent: false,
})
assert.equal(generalAgentWrite.allowTools, true)
assert.equal(generalAgentWrite.forceDirectChat, false)
assert.equal(
  shouldUseUnifiedAgentLoop(generalAgentWrite),
  true,
  '通用 Agent 多项写任务必须进入 Host 工具闭环',
)

const generalPlanWrite = resolveTurnPolicy({
  displayLine: '写一份完整优化方案',
  interactionMode: 'plan',
  isGeneralTurn: true,
  isNamedAgent: false,
})
assert.equal(
  shouldUseUnifiedAgentLoop(generalPlanWrite),
  true,
  '通用 Plan 工具任务也应使用 Host 闭环，但保持待 Accept 语义',
)

const directQuestion = resolveTurnPolicy({
  displayLine: '这个项目是做什么的？',
  interactionMode: 'agent',
  isGeneralTurn: true,
  isNamedAgent: false,
})
assert.equal(
  shouldUseUnifiedAgentLoop(directQuestion),
  false,
  '普通问答仍保持直聊，不误进工具环',
)

const askWrite = resolveTurnPolicy({
  displayLine: '修改 README.md',
  interactionMode: 'ask',
  isGeneralTurn: true,
  isNamedAgent: false,
})
assert.equal(shouldUseUnifiedAgentLoop(askWrite), false, 'Ask 始终不得进入写工具环')

assert.equal(
  shouldUseUnifiedAgentLoop({
    interactionMode: 'future-mode',
    allowTools: true,
    forceDirectChat: false,
  }),
  true,
  '新增交互模式无需修改路由硬编码',
)

const sendSource = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
assert.match(
  sendSource,
  /const wantsUnifiedAgentLoop = shouldUseUnifiedAgentLoop\(turnPolicy\)/,
  '发送入口必须使用策略路由单源',
)
assert.doesNotMatch(
  sendSource,
  /const wantsUnifiedAgentLoop\s*=\s*isAgentMode\s*&&/,
  '禁止再用具名 Agent 状态卡住 Host 路由',
)
assert.match(
  sendSource,
  /if \(!api\.hostAgentPrompt\)/,
  'Host 不可用时工具回合必须明确失败',
)
assert.doesNotMatch(
  sendSource,
  /!api\.hostAgentPrompt\s*&&\s*!?\(mode === ["']local-mcp["'] && api\.localOrchestrationPrompt\)/,
  '禁止 Host 不可用时回落到本地编排',
)

console.log('check-general-agent-route: ok')
