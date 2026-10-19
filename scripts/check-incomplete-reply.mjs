#!/usr/bin/env node
/**
 * 闸门：半截直聊判定 + shared 方案意图单源。
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import {
  userAskedForFullPlanReply,
  buildDirectChatPolicyBlock,
  DIRECT_CHAT_OUTPUT_RULE,
  looksLikeTruncatedDirectReply,
} from '../shared/direct-chat-policy.mjs'
import { sanitizeDirectChatReply } from '../shared/sanitize-direct-reply.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const orchPath = path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js')
const src = fs.readFileSync(orchPath, 'utf8')

const start = src.indexOf('function looksLikeIncompleteAssistantReply')
const mergeStart = src.indexOf('function mergeContinuedAssistantReply')
const mergeEnd = src.indexOf('\nfunction flattenToolMessagesForOllamaFallback')
if (start < 0 || mergeStart < 0 || mergeEnd < 0 || mergeStart <= start) {
  console.error('check-incomplete-reply: cannot locate incomplete/merge helpers')
  process.exit(1)
}
const code = src.slice(start, mergeEnd)
const sandbox = {}
vm.runInNewContext(
  `${code}\nthis.looksLikeIncompleteAssistantReply = looksLikeIncompleteAssistantReply;\nthis.mergeContinuedAssistantReply = mergeContinuedAssistantReply;`,
  sandbox,
)

const policy = { userAskedForFullPlanReply }
const truncated = `ComfyUI 是一个高度模块化、基于节点流的 AI 引擎。要优化这个项目，建议从三个维度着手。以下是按优先级排序的合理优化方案：

### 1. 【高优先级】依赖管理与环境稳定性（最紧迫）
* **锁定核心依赖版本**：torch、transformers、numpy 是 AI 推理的核心。目前 numpy 仅有 >=1.25.0，建议在生产环境下通过 \`poetry\``

const user = '告诉我这个项目该怎么优化，给我一个合理优化方案'
const cases = [
  {
    name: 'poetry mid-sentence',
    ok:
      sandbox.looksLikeIncompleteAssistantReply(
        truncated,
        { done: true, done_reason: 'stop' },
        user,
        policy,
      ) === true,
  },
  {
    name: 'userAskedForFullPlan shared',
    ok: userAskedForFullPlanReply(user) === true,
  },
  {
    name: 'policy block has output rule',
    ok: buildDirectChatPolicyBlock(user).includes(DIRECT_CHAT_OUTPUT_RULE),
  },
  {
    name: 'sanitize strips tool_call',
    ok: !sanitizeDirectChatReply(
      '你好\n<tool_call>{"name":"Bash"}</tool_call>\n继续',
    ).includes('<tool_call>'),
  },
  {
    name: 'sanitize drops fake-tool thinking shell',
    ok: (() => {
      const out = sanitizeDirectChatReply(`<thinking>
<tool_call>
{"name": "Bash", "arguments": {"command": "ls"}}
</tool_call>
探索中
</thinking>

已完成。`)
      return (
        !out.includes('<thinking>') &&
        !out.includes('tool_call') &&
        !out.includes('已完成') &&
        !/探索中/.test(out)
      )
    })(),
  },
  {
    name: 'sanitize unwraps clean plan thinking',
    ok: (() => {
      const out = sanitizeDirectChatReply(`<thinking>
### 1. 高优先级
把路由收敛到单一目录。
</thinking>

已完成。`)
      return out.includes('高优先级') && !out.includes('<thinking>') && !out.includes('已完成')
    })(),
  },
  {
    name: 'sanitize strips double-pipe DSML',
    ok: (() => {
      const out = sanitizeDirectChatReply(
        '前言\n<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name="Bash">\nls\n</｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>\n后语',
      )
      return !/DSML/i.test(out) && out.includes('前言') && out.includes('后语')
    })(),
  },
  {
    name: 'sanitize latex arrow and upsell tail',
    ok: (() => {
      const out = sanitizeDirectChatReply(
        '状态：PENDING $\\rightarrow$ RUNNING\n\n---\n\n> 本轮只是建议。需要我下一轮动手请切到 Plan/Agent。',
      )
      return (
        out.includes('PENDING → RUNNING') &&
        !out.includes('$') &&
        !out.includes('需要我下一轮') &&
        !out.includes('切到 Plan')
      )
    })(),
  },
  {
    name: 'policy forbids latex and upsell',
    ok:
      /→|LaTeX|下一步|Plan/.test(DIRECT_CHAT_OUTPUT_RULE) &&
      DIRECT_CHAT_OUTPUT_RULE.includes('只输出用户可读 Markdown'),
  },
  {
    name: 'complete short not plan',
    ok:
      sandbox.looksLikeIncompleteAssistantReply(
        '可以。ComfyUI 适合节点化工作流，按需加载模型即可。',
        { done: true, done_reason: 'stop' },
        '你好',
        policy,
      ) === false,
  },
  {
    name: 'ask long with ## sections ignores ollama length',
    ok:
      sandbox.looksLikeIncompleteAssistantReply(
        `${'甲'.repeat(200)}\n## 1. 一项\n- **a**：说明\n## 2. 二项\n- **b**：说明\n## 3. 三项\n- **c**：说明。`,
        { done: true, done_reason: 'length' },
        '告诉我还有哪些可以优化',
        policy,
      ) === false,
  },
  {
    name: 'ask sentence-complete with 2 flats ignores length',
    ok:
      sandbox.looksLikeIncompleteAssistantReply(
        '结论：先做集成验证。\n\n1. 挂 watcher。\n2. 暴露 metrics。',
        { done: true, done_reason: 'length' },
        '告诉我还有哪些可以优化',
        policy,
      ) === false,
  },
  {
    name: 'ask mid-word still incomplete on length',
    ok:
      sandbox.looksLikeIncompleteAssistantReply(
        '结论：先做集成验证与目录收敛。下一步需要把 AssetWatcher 挂到 main.py 的启动钩子并完成路由注',
        { done: true, done_reason: 'length' },
        '告诉我还有哪些可以优化',
        policy,
      ) === true,
  },
  {
    name: 'sanitize flattens ## encyclopedia to Ask list',
    ok: (() => {
      const out = sanitizeDirectChatReply(`## 结论
先收尾集成。

## 1. 核心链路
- **生命周期**：挂到 main.py。
- **指标**：暴露 /metrics。

## 2. 目录收敛
- **双路由**：按 ROUTES.md 收拢。

## 3. 工程守卫
- **锁依赖**：生成 requirements.lock。`)
      return (
        !/^##\s*\d+/m.test(out) &&
        /^结论/.test(out) &&
        /^1\.\s/m.test(out) &&
        /^2\.\s/m.test(out) &&
        /^3\.\s/m.test(out) &&
        !/^- \*\*/m.test(out)
      )
    })(),
  },
  {
    name: 'sanitize soft ## 结论 only',
    ok: (() => {
      const out = sanitizeDirectChatReply(
        '## 结论\n先核对落点。\n\n1. 挂 watcher。\n2. 暴露 metrics。',
      )
      return !out.includes('## 结论') && out.includes('结论') && /^1\.\s/m.test(out)
    })(),
  },
  {
    name: 'sanitize no invented conclusion or silent drop',
    ok: (() => {
      const out = sanitizeDirectChatReply(`## 1. 甲
- **a**：一。
## 2. 乙
- **b**：二。
## 3. 丙
- **c**：三。
## 4. 丁
- **d**：四。
## 5. 戊
- **e**：五。
## 6. 己
- **f**：六。
## 7. 庚
- **g**：七。`)
      return (
        !/见下列/.test(out) &&
        !/^结论/.test(out) &&
        /^1\.\s/m.test(out) &&
        /^7\.\s/m.test(out) &&
        !/^##\s*\d+/m.test(out)
      )
    })(),
  },
  {
    name: 'orch no buildFallbackFromRecentTools',
    ok: !/buildFallbackFromRecentTools/.test(src),
  },
  {
    name: 'orch Ask continue uses truncated-only',
    ok:
      /askTruncatedOnly|looksLikeTruncatedDirectReply/.test(src) &&
      /stripLocalAskDecorativeBold/.test(src) &&
      /maxContinues = wantsFullPlan \? 3 : 1/.test(src),
  },
  {
    name: 'orch uses shared policy loader',
    ok: /loadDirectChatPolicy|direct-chat-policy\.mjs/.test(src),
  },
  {
    name: 'orch audits to project-logs',
    ok: /auditDirectChat|project-logs\.cjs/.test(src),
  },
  {
    name: 'orch no silent fence fallback comment only ok — no fenceWriteFallback',
    ok: !/fenceWriteFallback|silentFallbackToFence/.test(src),
  },
  {
    name: 'merge avoids API半句粘连',
    ok: (() => {
      const merged = sandbox.mergeContinuedAssistantReply(
        '确保实现从“代码存在”到“API',
        '可实现从“代码存在”到“API 可访问”的闭环。',
      )
      return (
        merged.includes('可访问') &&
        !/API可实现从/.test(merged) &&
        (merged.match(/代码存在/g) || []).length <= 1
      )
    })(),
  },
  {
    name: 'truncated mid-word 防止推',
    ok:
      looksLikeTruncatedDirectReply(
        '把 Ruff/Pylint 挂进 CI，并锁依赖。规则够用，缺的是每次改动都跑一次。requirements.lock，防止推',
      ) === true,
  },
  {
    name: 'complete list item not truncated',
    ok:
      looksLikeTruncatedDirectReply(
        '## 结论\n先收尾。\n\n1. 把模块挂进 main.py。\n2. 收敛双路由。',
      ) === false,
  },
  {
    name: 'cloud-direct continues truncated',
    ok: /looksLikeTruncatedDirectReply|finishDirectOk\(streamed\.content,\s*continueCtx\)/.test(
      fs.readFileSync(path.join(root, 'server/cloud-direct.cjs'), 'utf8'),
    ),
  },
]

const failed = cases.filter((c) => !c.ok)
if (failed.length) {
  console.error(
    'check-incomplete-reply FAILED:',
    failed.map((c) => c.name).join(', '),
  )
  process.exit(1)
}
console.log('check-incomplete-reply: ok')
