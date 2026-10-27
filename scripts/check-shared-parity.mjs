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
  PRIOR_KEEP_RECENT_DIRECT,
  PRIOR_MESSAGE_CHAR_CAP_DIRECT,
  LOCAL_DIRECT_NUM_PREDICT,
  LOCAL_ASK_NUM_PREDICT,
  TOOL_RESULT_KEEP_RECENT,
  resolvePriorBudget,
  resolveLocalGenBudget,
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
assert(PRIOR_KEEP_RECENT_DIRECT < PRIOR_KEEP_RECENT, 'Ask prior keep < Agent')
assert(PRIOR_MESSAGE_CHAR_CAP_DIRECT < PRIOR_MESSAGE_CHAR_CAP, 'Ask prior cap < Agent')
assert(PRIOR_KEEP_RECENT_DIRECT >= 8, 'Ask prior keep usable')
assert(PRIOR_MESSAGE_CHAR_CAP_DIRECT >= 4000, 'Ask prior cap usable')
assert(LOCAL_ASK_NUM_PREDICT < LOCAL_DIRECT_NUM_PREDICT, 'Ask predict < Direct')
assert(LOCAL_ASK_NUM_PREDICT >= 4096, 'Ask predict not tiny')
assert(
  resolvePriorBudget({ forceDirectChat: true }).keepRecent === PRIOR_KEEP_RECENT_DIRECT,
  'resolvePriorBudget Ask',
)
assert(
  resolvePriorBudget({ contextLevel: 'agent-full', allowTools: true }).keepRecent ===
    PRIOR_KEEP_RECENT,
  'resolvePriorBudget Agent',
)
assert(
  resolvePriorBudget({
    forceDirectChat: true,
    contextLevel: 'agent-full',
    allowTools: true,
  }).keepRecent === PRIOR_KEEP_RECENT,
  'agent-full wins over forceDirectChat',
)
assert(
  resolveLocalGenBudget({ forceDirectChat: true }).num_predict === LOCAL_ASK_NUM_PREDICT,
  'resolveLocalGenBudget Ask',
)
assert(
  resolveLocalGenBudget({ forceDirectChat: true, wantsFullPlan: true }).num_predict ===
    LOCAL_DIRECT_NUM_PREDICT,
  'resolveLocalGenBudget full plan',
)

const host = fs.readFileSync(path.join(root, 'server/host-agent-loop.mjs'), 'utf8')
assert(!/keepRecent:\s*10\b/.test(host), 'host: no keepRecent=10 override')
assert(/resolvePriorBudget/.test(host), 'host: uses resolvePriorBudget')
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
assert(/resolveLocalGenBudget/.test(orch), 'local orch uses resolveLocalGenBudget')
assert(/resolvePriorBudget/.test(orch), 'local orch uses resolvePriorBudget')
assert(/refreshMcpToolBudget|MCP_TOOL_DESC_MAX/.test(orch), 'orch slims MCP tool descriptions')
assert(/loadMcpToolCatalog|mcp-tool-catalog/.test(orch), 'orch writes MCP tool catalog')
assert(/Cursor 式省 token/.test(orch) || /mcp_describe_tool/.test(orch), 'orch prompts catalog discovery')
assert(LOCAL_DIRECT_NUM_PREDICT >= 4096, 'direct predict budget')

const budgetSrc = fs.readFileSync(path.join(root, 'shared/context-budget.mjs'), 'utf8')
assert(/MCP_TOOL_DESC_MAX\s*=\s*96/.test(budgetSrc), 'MCP tool desc cap 96')
assert(/MAX_MERGED_MCP_TOOLS\s*=\s*48/.test(budgetSrc), 'MCP tool count cap 48')

const catMod = fs.readFileSync(path.join(root, 'shared/mcp-tool-catalog.mjs'), 'utf8')
assert(/writeMcpToolCatalog/.test(catMod), 'mcp catalog writer')
assert(/shortMcpToolDescription/.test(catMod), 'mcp short description')
assert(/skeletonMcpParameters/.test(catMod), 'mcp skeleton params')
assert(/mcp_describe_tool/.test(catMod), 'mcp_describe_tool')
assert(/readMcpToolCatalogByCallName/.test(catMod), 'mcp describe reader')
assert(/mcp_describe_tool/.test(orch), 'orch executes mcp_describe_tool')
assert(/direct-chat-policy\.mjs/.test(orch), 'orch loads direct-chat-policy')
assert(/sanitize-direct-reply\.mjs/.test(orch), 'orch loads sanitize-direct-reply')
assert(/auditDirectChat/.test(orch), 'orch audits direct chat')

const sendBudget = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
assert(/resolvePriorBudget/.test(sendBudget), 'send: resolvePriorBudget for prior')
assert(/claudeSessionId: null/.test(sendBudget), 'summarize clears CLI session so compact applies')
assert(/modelHistory/.test(sendBudget), 'summarize dual-track modelHistory')
assert(/nextModelHistoryPatch|resolveModelPriorBase/.test(sendBudget), 'summarize prior uses modelHistory helpers')
assert(/CHAT_CLI_CONTEXT_HINT/.test(sendBudget), 'CLI high usage only toasts hint')

const sumTs = fs.readFileSync(path.join(root, 'web/src/lib/session-summarize.ts'), 'utf8')
assert(/modelHistory/.test(sumTs), 'session-summarize returns modelHistory')
assert(/界面仍保留完整对话/.test(sumTs), 'summarize notice keeps UI transcript')
assert(/usage/.test(sumTs) && /nextModelHistoryPatch/.test(sumTs), 'modelHistory patch preserves turn usage')
assert(/hydrateContextHistoryUsage/.test(sumTs), 'hydrate usage from full history onto modelHistory')
assert(
  /post\.slice\(0,\s*-1\)|newPost/.test(sumTs),
  'modelHistory patch keeps prior post-summarize turns across sends',
)
assert(
  /rebuildModelHistoryFromDisplayHistory|needsModelHistoryRebuild|repairSessionModelHistoryIfNeeded/.test(
    sumTs,
  ),
  'deterministic modelHistory rebuild from summarize notice',
)
assert(
  /repairSessionModelHistoryIfNeeded/.test(
    fs.readFileSync(path.join(root, 'web/src/routes/index.tsx'), 'utf8'),
  ),
  'session hydrate repairs corrupted modelHistory when anchor exists',
)
assert(
  !/模型列表使用默认项/.test(
    fs.readFileSync(path.join(root, 'web/src/routes/index.tsx'), 'utf8'),
  ),
  'bridge offline does not invent default model pool / orchestrationMode',
)
assert(
  /hydrateContextHistoryUsage/.test(
    fs.readFileSync(path.join(root, 'web/src/routes/index.tsx'), 'utf8'),
  ),
  'composer sessionHistory hydrates usage for context ring',
)
assert(
  /softenHistoricLocalModelError/.test(
    fs.readFileSync(path.join(root, 'web/src/lib/chat-send-helpers.ts'), 'utf8'),
  ),
  'historic local model 404 bubbles are softened',
)
assert(
  /lastSuccessfulOllamaTags/.test(
    fs.readFileSync(path.join(root, 'server/handlers.mjs'), 'utf8'),
  ),
  'getModelPools persists lastSuccessfulOllamaTags when live tags reachable',
)
assert(
  !/ollamaTagsFromCache/.test(
    fs.readFileSync(path.join(root, 'server/cloud-providers.cjs'), 'utf8'),
  ),
  'installed pools never soft-filter via cached tags (no兜底)',
)
assert(
  /orchModeReady/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-composer-shell.tsx'), 'utf8'),
  ) &&
    /orchModeReady/.test(
      fs.readFileSync(path.join(root, 'web/src/routes/index.tsx'), 'utf8'),
    ),
  'context ring waits for orchModeReady (no default 云窗)',
)

const ctxUsage = fs.readFileSync(path.join(root, 'web/src/lib/context-usage.ts'), 'utf8')
assert(/prompt_tokens/.test(ctxUsage), 'context usage prefers prompt_tokens')
assert(/source:\s*"usage"\s*\|\s*"estimate"/.test(ctxUsage) || /source: "usage"/.test(ctxUsage), 'usage source tag')
assert(/CONTEXT_SUMMARIZE_HINT_CLEAR_RATIO|prevSuggest/.test(ctxUsage), 'usage suggest hysteresis')
assert(/DEFAULT_CLOUD_CONTEXT_TOKENS/.test(ctxUsage), 'cloud usage avoids local tiny window')

assert(/catalog-only|inRequestCallNames/.test(catMod), 'mcp catalog marks request cap omissions')
assert(/skeletonNode|depth/.test(catMod) || /properties/.test(catMod), 'mcp skeleton keeps nested shape')
assert(/mcpSchemaNeedsDescribe/.test(catMod), 'mcp complex schema needs describe')
assert(/Must mcp_describe_tool first|requireDescribe/.test(catMod), 'mcp short desc can require describe')
assert(/mcpSchemaNeedsDescribe/.test(orch), 'orch uses mcpSchemaNeedsDescribe')

assert(/windowKind/.test(ctxUsage), 'context usage windowKind local|cloud')
assert(/windowSource/.test(ctxUsage), 'context usage windowSource catalog|fallback')
assert(/LOCAL_USAGE_WINDOW_CAP/.test(ctxUsage), 'local usage ignores cloud-sized window')
assert(
  /DEFAULT_LOCAL_CONTEXT_TOKENS/.test(ctxUsage),
  'local usage falls back to DEFAULT_LOCAL_CONTEXT_TOKENS',
)
assert(
  /LOCAL_USAGE_WINDOW_CAP\s*=\s*65_?536/.test(
    fs.readFileSync(path.join(root, 'shared/context-budget.mjs'), 'utf8'),
  ),
  'context-budget declares LOCAL_USAGE_WINDOW_CAP',
)
assert(
  /modelfile|PARAMETER\s+num_ctx/.test(
    fs.readFileSync(path.join(root, 'server/model-capabilities.mjs'), 'utf8'),
  ),
  'ollama show parses modelfile num_ctx',
)
assert(
  /getKnownProviderContextLength|defaultContextLength/.test(
    fs.readFileSync(path.join(root, 'server/cloud-providers.cjs'), 'utf8'),
  ),
  'cloud providers declare defaultContextLength',
)
const pkgJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8')
assert(/check:ui-playwright/.test(pkgJson), 'dev-gates includes ui-playwright')
assert(/check:ui-playwright:ci/.test(pkgJson), 'ci playwright script with CHECK_UI_PLAYWRIGHT')
assert(
  /chatModelPoolForMode/.test(
    fs.readFileSync(path.join(root, 'web/src/routes/index.tsx'), 'utf8'),
  ),
  'index picks model from mode-scoped pool',
)
assert(
  /orchMode === \"local-mcp\" \? \[\]/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-model-selector.tsx'), 'utf8'),
  ),
  'local-mcp model picker hides cloud list',
)
assert(
  /nextLocalContextOverride|点击切换本窗覆盖/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-composer-shell.tsx'), 'utf8'),
  ),
  'composer usage chip can cycle local window override',
)
assert(
  !/toast\.message\(/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-composer-shell.tsx'), 'utf8'),
  ),
  'composer does not toast on window override (Cursor: chip in-place)',
)
assert(
  /prevWindowTokensRef/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-composer-shell.tsx'), 'utf8'),
  ),
  'composer flashes chip when window tokens change',
)
assert(
  /窗 \${Math\.round\(contextUsage\.windowTokens \/ 1024\)}k/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-composer-shell.tsx'), 'utf8'),
  ),
  'composer tooltip shows window size like Cursor hover detail',
)
assert(
  /fetch\('http:\/\/127\.0\.0\.1:5188\/'\)/.test(
    fs.readFileSync(path.join(root, '.github/workflows/dev-gates.yml'), 'utf8'),
  ),
  'CI probes Vite with node fetch (playwright image may lack curl)',
)
assert(
  /unified|活跃会话与 settings\.model/.test(
    fs.readFileSync(path.join(root, 'web/src/routes/index.tsx'), 'utf8'),
  ),
  'hydrate unifies active session model with settings',
)
assert(
  /dev-gates\.yml/.test(
    fs.readFileSync(path.join(root, '.github/workflows/dev-gates.yml'), 'utf8'),
  ) || fs.existsSync(path.join(root, '.github/workflows/dev-gates.yml')),
  'CI workflow dev-gates.yml present',
)
assert(
  /check:dev-gates|playwright-browsers/.test(
    fs.readFileSync(path.join(root, '.github/workflows/dev-gates.yml'), 'utf8'),
  ),
  'CI caches playwright and runs check:dev-gates',
)
const gatesYml = fs.readFileSync(path.join(root, '.github/workflows/dev-gates.yml'), 'utf8')
assert(
  /mcr\.microsoft\.com\/playwright:v1\.61\.1-jammy/.test(gatesYml),
  'CI ui-playwright uses Playwright Docker image (no install-deps cold start)',
)
assert(
  !/playwright install-deps|npx playwright install --with-deps/.test(gatesYml),
  'CI does not run playwright install-deps / --with-deps on ui-playwright',
)
assert(
  /PLAYWRIGHT_BROWSERS_PATH:\s*\/ms-playwright/.test(gatesYml),
  'CI uses image-bundled browsers at /ms-playwright',
)
assert(
  fs.existsSync(path.join(root, '.cursor/rules/playwright-sandbox.mdc')),
  'Cursor rule playwright-sandbox.mdc present',
)
assert(
  /required_permissions.*all|出沙箱/.test(
    fs.readFileSync(path.join(root, '.cursor/rules/playwright-sandbox.mdc'), 'utf8'),
  ),
  'playwright-sandbox rule requires all permissions',
)
assert(
  /providerDefaultContextLength|getKnownProviderContextLength/.test(
    fs.readFileSync(path.join(root, 'server/model-capabilities.mjs'), 'utf8'),
  ),
  'cloud resolve fills contextLength from provider',
)
assert(
  /subscribeModelCapabilityCache/.test(
    fs.readFileSync(path.join(root, 'web/src/lib/model-capability-cache.ts'), 'utf8'),
  ),
  'model caps cache is subscribable',
)
assert(
  /CONTEXT_USAGE_CHIP_MIN_PERCENT\s*=\s*1/.test(
    fs.readFileSync(path.join(root, 'shared/context-budget.mjs'), 'utf8'),
  ),
  'context chip min percent 1 (visible after summarize)',
)
const composerShell = fs.readFileSync(
  path.join(root, 'web/src/components/chat-composer-shell.tsx'),
  'utf8',
)
assert(/CONTEXT_USAGE_CHIP_MIN_PERCENT/.test(composerShell), 'composer uses CONTEXT_USAGE_CHIP_MIN_PERCENT')
assert(
  /composer-context-usage-chip/.test(composerShell),
  'composer context usage has stable testid',
)
assert(
  /ComposerContextUsageRing|composer-context-ring/.test(composerShell),
  'composer uses Cursor-style context ring',
)
assert(
  /ComposerContextUsageBreakdown/.test(composerShell),
  'composer wires usage breakdown popover',
)
const usageBreakdown = fs.readFileSync(
  path.join(root, 'web/src/components/composer-context-usage-breakdown.tsx'),
  'utf8',
)
assert(
  /composer-context-usage-breakdown/.test(usageBreakdown),
  'usage breakdown has stable testid',
)
assert(
  /下一档本窗覆盖/.test(usageBreakdown),
  'local window override steps from breakdown',
)
assert(
  /composer-context-usage-meter|role=\"meter\"/.test(usageBreakdown),
  'usage breakdown shows fill meter',
)
assert(
  /字符粗估|计入占用|窗口上限|建议压缩/.test(usageBreakdown),
  'usage breakdown lists honest buckets from available stats',
)
assert(
  /最近输入|最近输出|composer-context-usage-buckets/.test(usageBreakdown),
  'usage breakdown can show prompt/completion rows when usage exists',
)
assert(
  /规则·注入|MCP·调用|MCP·工具输出/.test(usageBreakdown),
  'usage breakdown can show measured rules/MCP rows when present',
)
assert(
  /source === ["']estimate["'][\s\S]*?字符粗估|正文粗估·对照/.test(usageBreakdown),
  'usage breakdown hides primary 字符粗估 when metering is API usage',
)
assert(
  /models-add-pending-local|addPendingLocalToCatalog/.test(
    fs.readFileSync(path.join(root, 'web/src/components/models-connections-panel.tsx'), 'utf8'),
  ),
  'models panel can add pending live tags into localModelCatalog',
)
{
  const modelsPanel = fs.readFileSync(
    path.join(root, 'web/src/components/models-connections-panel.tsx'),
    'utf8',
  )
  assert(
    /finishLocalDrawer[\s\S]*?chatEnabledLocalModels:\s*nextEnabled/.test(modelsPanel),
    'local drawer finish enables newly cataloged models like 加入未编目',
  )
}
assert(
  /ensureChatTurns/.test(
    fs.readFileSync(path.join(root, 'scripts/check-ui-playwright.mjs'), 'utf8'),
  ),
  'ui-playwright seeds real chat turns before sticky assert',
)
assert(
  /claudeConfig:peekWorkspaceMcp|claudeConfig:importWorkspaceMcp/.test(
    fs.readFileSync(path.join(root, 'server/handlers.mjs'), 'utf8'),
  ),
  'handlers expose workspace .mcp.json peek/import',
)
assert(
  /mcp-import-workspace|importFromWorkspace|peekWorkspaceMcp/.test(
    fs.readFileSync(path.join(root, 'web/src/routes/comms.tsx'), 'utf8'),
  ),
  'MCP page can import workspace .mcp.json when present',
)
assert(
  /本机 ~\/\.claude\/mcp\.json；工作区有 \.mcp\.json 时可在 MCP 页导入/.test(
    fs.readFileSync(path.join(root, 'web/src/routes/help.tsx'), 'utf8'),
  ),
  'help copy distinguishes home mcp.json vs workspace import',
)
assert(
  /Array\.isArray\(sessionHistory\)/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-composer-shell.tsx'), 'utf8'),
  ),
  'composer shows context ring for empty session history when orch ready',
)
assert(
  /mcpCallCount|measureMcpCallCount/.test(
    fs.readFileSync(path.join(root, 'web/src/lib/context-parts.ts'), 'utf8'),
  ),
  'context-parts measures mcp call count without inventing output tokens',
)
assert(
  /estimatedTokens|lastPromptTokens|lastCompletionTokens/.test(
    fs.readFileSync(path.join(root, 'web/src/lib/context-usage.ts'), 'utf8'),
  ),
  'context-usage snapshot exposes estimate and last usage fields',
)
assert(
  /parts:/.test(fs.readFileSync(path.join(root, 'web/src/lib/context-usage.ts'), 'utf8')) &&
    fs.existsSync(path.join(root, 'web/src/lib/context-parts.ts')),
  'context-usage exposes measured context parts helper',
)
assert(
  /buildContextParts|contextParts/.test(
    fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8'),
  ),
  'chat-send attaches measured contextParts when available',
)
{
  const sessSum = fs.readFileSync(path.join(root, 'web/src/lib/session-summarize.ts'), 'utf8')
  assert(
    /mapAdded[\s\S]*?contextParts/.test(sessSum),
    'modelHistory patch preserves contextParts for usage ring',
  )
  assert(
    /hasMeasuredContextParts|donorParts/.test(sessSum),
    'hydrateContextHistoryUsage backfills contextParts from display history',
  )
}
assert(
  /models-pending-local-count|pendingLocalNotInCatalog/.test(
    fs.readFileSync(path.join(root, 'web/src/components/models-connections-panel.tsx'), 'utf8'),
  ),
  'models panel surfaces pending live tags not in catalog',
)
assert(
  /options:\s*--ipc=host/.test(
    fs.readFileSync(path.join(root, '.github/workflows/dev-gates.yml'), 'utf8'),
  ),
  'CI Playwright container uses --ipc=host',
)
assert(
  /z-\[200\]|chat-history-popover/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-session-tabs.tsx'), 'utf8'),
  ),
  'history popover stacks above composer',
)
assert(
  /resolveSessionDisplayTitle|resolveSessionAiTitle|firstUserPreview/.test(
    fs.readFileSync(path.join(root, 'web/src/lib/chat-history-groups.ts'), 'utf8'),
  ),
  'session tab title prefers first user prompt; AI title secondary',
)
assert(
  fs.existsSync(path.join(root, 'web/src/lib/turn-usage.ts')),
  'turn-usage helper present',
)
assert(
  /resolveTurnUsage/.test(
    fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8'),
  ),
  'chat-send attaches turn usage (api or estimated)',
)
assert(
  /extractOpenAiCompatibleUsage|extractGeminiUsage/.test(
    fs.readFileSync(path.join(root, 'server/cloud-direct.cjs'), 'utf8'),
  ),
  'cloud-direct forwards API usage when present',
)
assert(
  /stream_options[\s\S]*include_usage|include_usage:\s*true/.test(
    fs.readFileSync(path.join(root, 'server/cloud-direct.cjs'), 'utf8'),
  ),
  'cloud-direct stream requests include_usage when supported',
)
assert(
  /streamed\.usage|chunkUsage/.test(
    fs.readFileSync(path.join(root, 'server/cloud-direct.cjs'), 'utf8'),
  ),
  'cloud-direct merges usage from SSE stream chunks',
)
assert(
  /extractOllamaUsage|accumulateOllamaUsage/.test(
    fs.readFileSync(path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js'), 'utf8'),
  ),
  'local orch extracts/accumulates Ollama eval_count usage',
)
assert(
  /usageAcc|\.\.\.\s*usageAcc|\(usageAcc \? \{ usage/.test(
    fs.readFileSync(path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js'), 'utf8'),
  ),
  'local orch returns accumulated usage on success paths',
)
assert(
  /\.\.\.\(r\.usage|\.\.\.\s*r\.usage|usage:\s*r\.usage/.test(
    fs.readFileSync(path.join(root, 'server/cad-bridge.cjs'), 'utf8'),
  ),
  'cad-bridge forwards orch usage to client',
)
assert(
  /estimated/.test(
    fs.readFileSync(path.join(root, 'web/src/lib/context-usage.ts'), 'utf8'),
  ),
  'context-usage treats estimated usage as estimate source',
)
assert(
  /estimateTurnUsage|展示层回填/.test(
    fs.readFileSync(path.join(root, 'web/src/lib/context-usage.ts'), 'utf8'),
  ),
  'context-usage backfills last in/out for old sessions without usage',
)
assert(
  /\bmodal\b/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-session-tabs.tsx'), 'utf8'),
  ),
  'history popover uses modal to capture pointer over composer',
)
assert(
  /percent >= 50/.test(composerShell),
  'percent label beside ring only when usage is high',
)
assert(
  /composer-context-ring/.test(
    fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8'),
  ),
  'styles define composer-context-ring',
)
assert(
  fs.existsSync(path.join(root, 'web/src/components/composer-context-usage-ring.tsx')),
  'composer-context-usage-ring.tsx present',
)
assert(/channelKindFlash|已切换通道窗口/.test(composerShell), 'composer channelKindFlash only on windowKind change')
assert(/usageRingFlash/.test(composerShell), 'composer usageRingFlash on kind or tokens change')
assert(
  /windowUsageBootstrappedRef/.test(composerShell),
  'composer skips channel flash on first windowUsage hydrate',
)
assert(
  /if \(!channelKindFlash\) return/.test(composerShell),
  'composer channelKindFlash off-timer is isolated from windowTokens churn',
)
assert(
  /data-testid=\"chat-messages-scroll\"/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-messages-pane.tsx'), 'utf8'),
  ),
  'messages scroll has stable testid chat-messages-scroll',
)
assert(
  /chat-messages-scroll/.test(
    fs.readFileSync(path.join(root, 'scripts/check-ui-playwright.mjs'), 'utf8'),
  ),
  'playwright sticky uses chat-messages-scroll testid',
)
assert(/SKELETON_MAX_DEPTH\s*=\s*2/.test(catMod), 'mcp skeleton expands two nest levels')
assert(/schemaNestingDepth/.test(catMod), 'mcp describe uses nesting depth helper')
const pwUi = fs.readFileSync(path.join(root, 'scripts/check-ui-playwright.mjs'), 'utf8')
assert(/findInstalledChromiumBinary|launchChromium/.test(pwUi), 'playwright scans installed chromium')
assert(/composer-context-usage-chip/.test(pwUi), 'playwright asserts context usage testid')
assert(
  /连接中…/.test(pwUi) && /composer-context-usage-chip/.test(pwUi),
  'playwright waits for bridge hydrate before context chip soft-skip',
)
assert(
  /data-testid=\"composer-send\"/.test(composerShell),
  'composer send has stable testid composer-send',
)
{
  const modelsPanel = fs.readFileSync(
    path.join(root, 'web/src/components/models-connections-panel.tsx'),
    'utf8',
  )
  assert(
    /openLocalConfig[\s\S]*?testLocalConnection\(\)/.test(modelsPanel),
    'local model drawer auto-probes live Ollama tags on open',
  )
  const streamParse = fs.readFileSync(
    path.join(root, 'server/claude-stream-parse.mjs'),
    'utf8',
  )
  assert(/extractClaudeStreamUsage/.test(streamParse), 'claude stream extracts API usage')
  assert(
    /rememberStreamUsage/.test(streamParse) && /type === 'result'/.test(streamParse),
    'claude stream remembers usage from assistant/result events',
  )
  const claudeCli = fs.readFileSync(path.join(root, 'server/claude-cli.mjs'), 'utf8')
  assert(/streamState\?\.usage/.test(claudeCli), 'claude-cli returns stream usage to RPC')
}
assert(
  /cursor-sandbox-cache|回退/.test(pwUi),
  'playwright falls back from empty sandbox browsers path',
)
const stickyShared = fs.readFileSync(path.join(root, 'shared/sticky-prompt.mjs'), 'utf8')
assert(/firstMounted/.test(stickyShared), 'sticky shared skips sparse null refs')
const stickyTs = fs.readFileSync(path.join(root, 'web/src/hooks/use-sticky-user-prompt.ts'), 'utf8')
assert(/shared\/sticky-prompt\.mjs/.test(stickyTs), 'sticky hook imports shared geometry')
assert(/chat-messages-list/.test(stickyTs), 'sticky observes content resize')
const bridgeTs = fs.readFileSync(path.join(root, 'web/src/hooks/use-bridge.tsx'), 'utf8')
assert(/failStreak|OFFLINE_GRACE/.test(bridgeTs), 'bridge offline grace against flap')

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
  /LOCAL_MODEL_NOT_INSTALLED_ERROR/.test(webCat) &&
    /LOCAL_MODEL_NOT_INSTALLED_ERROR/.test(srvRoute),
  'local model not installed error both',
)
assert(
  /filterLocalModelsToInstalled|intersectLocalWithLiveOllama|resolveInstalledOllamaTag/.test(
    webCat,
  ),
  'web model-catalog intersects local pool with live Ollama tags',
)
assert(
  /buildModelPoolsInstalled|resolveInstalledOllamaTag/.test(
    fs.readFileSync(path.join(root, 'server/cloud-providers.cjs'), 'utf8'),
  ),
  'cloud-providers intersects local pool with Ollama tags',
)
assert(
  /buildModelPoolsInstalled/.test(
    fs.readFileSync(path.join(root, 'server/handlers.mjs'), 'utf8'),
  ),
  'getModelPools returns installed-only local models',
)
assert(
  /pruneLocalModelsAgainstInstalled/.test(
    fs.readFileSync(path.join(root, 'server/handlers.mjs'), 'utf8'),
  ),
  'getModelPools persists prune of uninstalled local models',
)
assert(
  /function pruneLocalModelsAgainstInstalled/.test(
    fs.readFileSync(path.join(root, 'server/cloud-providers.cjs'), 'utf8'),
  ),
  'cloud-providers pruneLocalModelsAgainstInstalled helper',
)
assert(
  /resolveInstalledOllamaTag|LOCAL_MODEL_NOT_INSTALLED_ERROR/.test(
    fs.readFileSync(path.join(root, 'server/cad-bridge.cjs'), 'utf8'),
  ),
  'cad-bridge hard-fails uninstalled Ollama models',
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
