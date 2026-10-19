/**
 * 工作区保真 + 问答禁写 · 固定回归门禁
 * node scripts/check-workspace-fidelity.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  classifyTurnIntent,
  resolveTurnPolicy,
  shouldInjectProjectBootstrap,
} from '../server/turn-policy.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

/** slim brief 首行必须能带绝对路径（实现契约，供前端 buildSlimProjectBrief 对齐） */
function slimBriefHeader(absRoot) {
  const cleaned = String(absRoot || '').trim().replace(/\/+$/, '')
  if (!cleaned) return ''
  const base = cleaned.split(/[/\\]/).filter(Boolean).pop() || cleaned
  return `【当前工作区】${cleaned}\n【项目名】${base}`
}

assert(
  slimBriefHeader('/Users/me/proj/models').includes('【当前工作区】/Users/me/proj/models'),
  'slim: abs path first line',
)
assert(slimBriefHeader('/Users/me/proj/models').includes('【项目名】models'), 'slim: basename')
assert(slimBriefHeader('') === '', 'slim: empty root → empty header')

/** 换仓后产品问答仍只读 + slim（与 check-turn-policy 同句） */
const qAfterSwitch = resolveTurnPolicy({
  displayLine: '告诉我这个项目是做什么的',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(
  !qAfterSwitch.allowWrites &&
    qAfterSwitch.forceDirectChat &&
    qAfterSwitch.contextLevel === 'slim-product',
  'switch-ws: product Q → slim readonly',
)

const techAfterSwitch = resolveTurnPolicy({
  displayLine: '依赖有哪些',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
assert(!techAfterSwitch.allowWrites && shouldInjectProjectBootstrap('依赖有哪些'), 'switch-ws: tech Q')

/** 写意图不被 readonly 误杀 */
assert(classifyTurnIntent('请修改 src/App.tsx 里的标题') === 'write', 'write intent preserved')
assert(classifyTurnIntent('这个项目主要做了什么') === 'readonly', 'product Q2 → readonly')

/** turn-policy 单源 shared；web/server 再导出 */
const sharedPolicy = fs.readFileSync(path.join(root, 'shared/turn-policy.mjs'), 'utf8')
const webPolicy = fs.readFileSync(path.join(root, 'web/src/lib/turn-policy.ts'), 'utf8')
const serverPolicy = fs.readFileSync(path.join(root, 'server/turn-policy.mjs'), 'utf8')
assert(/shared\/turn-policy\.mjs/.test(webPolicy) && /shared\/turn-policy\.mjs/.test(serverPolicy), 'turn-policy re-export both')
assert(/TECHNICAL_QA_RE/.test(sharedPolicy), 'TECHNICAL_QA_RE both sides')
assert(/WORKSPACE_TOPIC_RE/.test(sharedPolicy), 'WORKSPACE_TOPIC_RE both sides')
assert(/slim-product/.test(sharedPolicy), 'slim-product both sides')
assert(/forceDirectChat/.test(sharedPolicy), 'forceDirectChat both sides')

/** Composer 工作区芯片与发送前 getWorkspace 校验须存在 */
const composer = fs.readFileSync(path.join(root, 'web/src/components/chat-composer-shell.tsx'), 'utf8')
const sendHook = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
const slimBrief = fs.readFileSync(path.join(root, 'web/src/lib/expand-user-line-workspace-files.ts'), 'utf8')
assert(/workspaceBasename/.test(composer), 'composer: workspace chip')
assert(/getWorkspace/.test(sendHook) && /请先选择工作区/.test(sendHook), 'send: workspace gate')
assert(/【当前工作区】/.test(slimBrief), 'slim brief: abs path marker')

/** 本地直聊：勿把「优化/怎么用」误导向只答「做什么」；半截答复须可续写 */
const localOrch = fs.readFileSync(
  path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js'),
  'utf8',
)
assert(!/按摘录回答「做什么」即可/.test(localOrch), 'direct: no default-to-做什么 prompt')
assert(/紧扣本轮所问/.test(localOrch), 'direct: answer current question')
assert(/looksLikeIncompleteAssistantReply/.test(localOrch), 'direct: incomplete detector')
assert(/auto-continue/.test(localOrch) && /maxContinues/.test(localOrch), 'direct: auto-continue on truncate')
assert(/sanitizeToolDescriptionForOllama/.test(localOrch), 'tools: sanitize descriptions')
assert(!/fence-write fallback/.test(localOrch), 'tools: no fence-write 兜底')
assert(/think: false/.test(localOrch), 'tools loop: think false')
assert(/ensureWorkspaceWriteTool/.test(localOrch), 'tools: inject workspace-write for writes')
assert(/probeOllamaToolsAccepted/.test(localOrch), 'tools: preflight probe')
assert(/本地写盘不绕开 tools/.test(localOrch), 'tools: fail-fast no silent degrade')

if (process.exitCode) {
  console.error('\ncheck-workspace-fidelity: FAILED')
  process.exit(1)
}
console.log('\ncheck-workspace-fidelity: PASSED')
