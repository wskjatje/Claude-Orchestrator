#!/usr/bin/env node
/**
 * 闸门：写盘禁止猜路径旁路（A+B+P1+B2）。
 * - ingest 不得保留 extract* / ensure*Artifact 自动写
 * - 链须有缺围栏续写 + 变更意图硬失败
 * - 官方链文案不得承诺「无围栏→系统写 chain-steps」
 * - 前端气泡解析仅认 workspace-write（与 server 同契约）
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const {
  ingestTextAndApplyWorkspaceWrite,
  collectWritableItemsFromText,
  MISSING_WRITE_FENCE_ERROR,
} = require('../server/workspace-write.cjs')

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else console.log('ok:', msg)
}

const ww = fs.readFileSync(path.join(root, 'server/workspace-write.cjs'), 'utf8')
assert(/MISSING_WRITE_FENCE_ERROR/.test(ww), 'MISSING_WRITE_FENCE_ERROR exported')
assert(/ensure\*Artifact \/ 代码块猜路径 \/ 默认 docs 已废除/.test(ww), 'ingest documents no-guess')
assert(!/ensureChainArtifact && body\.trim\(\)/.test(ww), 'no ensureChainArtifact auto-write block')
assert(!/ensureAgentArtifact && agentName/.test(ww), 'no ensureAgentArtifact auto-write block')
assert(!/function extractCodeFenceWrites/.test(ww), 'dead extractCodeFenceWrites removed')
assert(!/function extractOrderedPathCodeWrites/.test(ww), 'dead extractOrdered removed')
assert(!/function extractJsonPathContentWrites/.test(ww), 'dead extractJson removed')
assert(!/function buildChainStepArtifactRelPath/.test(ww), 'dead chain-steps default path builder removed')
assert(!/fromAdjacent = extractCodeFenceWrites/.test(ww), 'ingest no extractCodeFenceWrites')
assert(!/fromOrdered = extractOrderedPathCodeWrites/.test(ww), 'ingest no extractOrdered')

const bareMd = '```workspace-write\n# 方案\n\n很长的正文用来从前猜路径 abcdefghijklmnopqrstuvwxyz0123456789\n```'
assert(collectWritableItemsFromText(bareMd).length === 0, 'runtime: bare md fence → 0 items')

const yaml = '```workspace-write\npath: docs/a.md\ncontent: hi\n```'
assert(collectWritableItemsFromText(yaml).length === 0, 'runtime: YAML fence → 0 items')

const plainJson =
  '```json\n{"path":"docs/via-json.md","content":"no"}\n```'
assert(collectWritableItemsFromText(plainJson).length === 0, 'runtime: plain ```json → 0 items')

const jsonOk =
  '```workspace-write\n{"path":"docs/a.md","content":"hello"}\n```'
assert(
  collectWritableItemsFromText(jsonOk).length === 1 &&
    collectWritableItemsFromText(jsonOk)[0].path === 'docs/a.md',
  'runtime: JSON fence ok',
)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-ww-'))
try {
  const guessed = ingestTextAndApplyWorkspaceWrite(
    '```js\nconsole.log(1)\n```\n`src/app.js`\n',
    tmp,
    { applyWrites: true, autoWriteProject: true, agentName: 'demo', ensureChainArtifact: true },
  )
  assert(guessed.ok === false && guessed.missingWriteFence === true, 'runtime: ensure*Artifact rejected')
  assert(
    String(guessed.error || '').includes('ensure*Artifact') ||
      String(guessed.error || '').includes('workspace-write') ||
      guessed.error === MISSING_WRITE_FENCE_ERROR,
    'runtime: ensure/missing fence error copy',
  )
  const files = fs.readdirSync(tmp, { recursive: true })
  assert(
    !files.some((f) => String(f).includes('docs') || String(f).endsWith('.js')),
    'runtime: no files written on guess/ensure',
  )

  const ok = ingestTextAndApplyWorkspaceWrite(jsonOk, tmp, { applyWrites: true })
  assert(ok.ok === true && ok.written?.includes('docs/a.md'), 'runtime: JSON writes')
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

const bridge = fs.readFileSync(path.join(root, 'server/cad-bridge.cjs'), 'utf8')
assert(/finalizeChainStepWrite/.test(bridge), 'bridge: finalizeChainStepWrite')
assert(/CHAIN_WRITE_FENCE_NUDGE/.test(bridge), 'bridge: fence nudge')
assert(/classifyTurnIntent/.test(bridge), 'bridge: write-intent gate')
assert(/【写盘·Cursor】/.test(bridge), 'bridge: CHAIN_REPLY_HINT Cursor write')
assert(!/ensureChainArtifact:\s*true/.test(bridge), 'bridge: no ensureChainArtifact:true')
assert(
  /ensure\*Artifact 已废除/.test(bridge),
  'bridge: IPC hard-rejects ensure*Artifact',
)

const webIngest = fs.readFileSync(path.join(root, 'web/src/lib/assistant-reply.ts'), 'utf8')
assert(
  /已禁止猜路径兜底/.test(webIngest),
  'web chain ingest: no-guess error',
)
assert(
  /仅 ```workspace-write``` JSON/.test(webIngest) ||
    /仅 \`\`\`workspace-write\`\`\` JSON/.test(webIngest),
  'web bubble parse: workspace-write only',
)
assert(!/fenceRe = \/```\(\?:json\)/.test(webIngest), 'web: no ```json strip/parse fallback')
assert(
  !/parseWorkspaceWriteItemsFromBubble\(\s*["']```json/.test(webIngest),
  'web: no wrap-as-json parse',
)

const chainInstr = fs.readFileSync(
  path.join(root, 'web/src/lib/chain-step-instruction.ts'),
  'utf8',
)
assert(!/system writes summary/.test(chainInstr), 'chain instr: no system-summary write')
assert(!/docs\/chain-steps\/\{taskId\}/.test(chainInstr), 'chain instr: no default chain-steps path')
assert(/无围栏则本步失败/.test(chainInstr), 'chain instr: hard-fail on missing fence')

const resync = fs.readFileSync(path.join(root, 'scripts/resync-official-chains.js'), 'utf8')
assert(!/system writes summary/.test(resync), 'resync: no system-summary write')
assert(/artifactPath: defaultArtifactPath/.test(resync), 'resync: step.artifactPath')
assert(/无围栏则本步失败/.test(resync), 'resync: hard-fail copy')

const chainTpl = fs.readFileSync(path.join(root, 'web/src/lib/chain-templates.ts'), 'utf8')
assert(/artifactPath: defaultArtifactPathForAgent/.test(chainTpl), 'templates: step.artifactPath')

const officialDir = path.join(root, 'docs/chains')
if (fs.existsSync(officialDir)) {
  const sample = fs
    .readdirSync(officialDir)
    .filter((f) => f.startsWith('official-') && f.endsWith('.json'))
    .slice(0, 5)
  assert(sample.length > 0, 'official chains exist under docs/chains')
  for (const f of sample) {
    const body = fs.readFileSync(path.join(officialDir, f), 'utf8')
    assert(!/system writes summary/.test(body), `official ${f}: no system-summary write`)
    assert(!/No fence → system writes/.test(body), `official ${f}: no No-fence auto-write`)
    assert(/"artifactPath"\s*:/.test(body), `official ${f}: has artifactPath`)
    assert(/无围栏则本步失败/.test(body), `official ${f}: hard-fail copy`)
  }
}

if (process.exitCode) {
  console.error('check-workspace-write-no-guess: FAILED')
  process.exit(1)
}
console.log('check-workspace-write-no-guess: PASSED')
