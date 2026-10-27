/**
 * P2-5 / 切片 D：Ask/Plan/Agent 契约 + 去兜底静态断言（无静默 Host/换池/假成功）。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const {
  resolveTurnPolicy,
} = await import(path.join(root, 'server/turn-policy.mjs'))
const {
  CLOUD_PROVIDER_REQUIRED_ERROR,
  LOCAL_PROVIDER_REQUIRED_ERROR,
  LOCAL_MODEL_NOT_INSTALLED_ERROR,
  MODEL_NOT_IN_POOL_ERROR,
  resolveModelForExecution,
} = await import(path.join(root, 'server/resolve-execution-model.mjs'))

function ok(cond, msg) {
  assert.ok(cond, msg)
  console.log('ok:', msg)
}

const askPlan = resolveTurnPolicy({
  displayLine: '请给出完整优化方案',
  interactionMode: 'ask',
  isGeneralTurn: true,
})
ok(!askPlan.allowWrites && askPlan.forceDirectChat, 'Ask+优化方案 → 禁写')

const planOral = resolveTurnPolicy({
  displayLine: '请给出完整优化方案',
  interactionMode: 'plan',
  isGeneralTurn: true,
})
ok(
  !planOral.allowWrites && planOral.forceDirectChat && planOral.contextLevel === 'slim-product',
  'Plan+口头方案 → 只聊（对齐 Cursor，不强制写 md）',
)

const planDoc = resolveTurnPolicy({
  displayLine: '写一份完整优化方案',
  interactionMode: 'plan',
  isGeneralTurn: true,
})
ok(planDoc.allowWrites && !planDoc.autoApplyWrites, 'Plan+写一份方案 → 可暂存写')
ok(
  planDoc.systemConstraint.includes('禁止硬编码固定文件名') ||
    planDoc.systemConstraint.includes('【写盘内容·Cursor】'),
  'Plan 约束无硬编码 optimization-plan.md',
)
ok(!planDoc.systemConstraint.includes('docs/optimization-plan.md'), 'Plan 约束无固定 path 样例')

const agentExec = resolveTurnPolicy({
  displayLine: '按方案执行',
  interactionMode: 'agent',
  isGeneralTurn: true,
})
ok(agentExec.allowWrites && agentExec.autoApplyWrites, 'Agent+按方案执行 → 自动写')

/** 服务端必须认盘上的 plan（禁止当成 agent 自动写） */
const bridgeSrc = fs.readFileSync(path.join(root, 'server/cad-bridge.cjs'), 'utf8')
ok(
  /m === 'plan' \|\| m === 'propose' \|\| m === 'manual'/.test(bridgeSrc) ||
    /m === 'plan' \|\| m === 'propose'/.test(bridgeSrc),
  'bridge: readWorkspaceInteractionMode 认 plan',
)
ok(
  /if \(m === 'plan'\) return 'plan'/.test(bridgeSrc) &&
    /if \(m === 'agent'\) return 'agent'/.test(bridgeSrc),
  'bridge: writeModeFromWorkspace 三分档',
)
ok(/默认 ask/.test(bridgeSrc) || /return 'ask'/.test(bridgeSrc), 'bridge: 缺文件默认 ask（对齐 Cursor）')
ok(!/if \(m === 'ask' \|\| m === 'propose' \|\| m === 'agent'\) return m/.test(bridgeSrc), 'bridge: 旧三态（无 plan）已废除')
ok(/待用户 Accept（Plan）/.test(bridgeSrc), 'bridge: Plan 排队文案')

const closeLoopSrc = fs.readFileSync(path.join(root, 'web/src/lib/turn-write-close.ts'), 'utf8')
ok(!/path:\/content:/.test(closeLoopSrc), 'write-close: 不再暗示 YAML 合法')
ok(/本轮需要改文件，但未写入任何内容/.test(closeLoopSrc), 'write-close: 用户可见零写入文案')
ok(
  !/error:\s*[\s\S]{0,80}search_replace/.test(closeLoopSrc) &&
    !/须用 search_replace/.test(closeLoopSrc),
  'write-close: 错误文案无工具协议词',
)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-parity-'))
const planPath = path.join(tmp, 'docs', 'topic-plan.md')
fs.mkdirSync(path.dirname(planPath), { recursive: true })
fs.writeFileSync(planPath, '# plan\n', 'utf8')
ok(fs.existsSync(planPath), '方案路径可 fs.exists（模拟落盘）')
fs.rmSync(tmp, { recursive: true, force: true })

const orch = fs.readFileSync(
  path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js'),
  'utf8',
)
ok(!/fenceWriteFallback/.test(orch), 'orch 无 fenceWriteFallback')
ok(!/num_gpu:\s*0,\s*num_ctx:\s*8192/.test(orch), 'orch 无静默 GPU/ctx 换参重试')
ok(/不会自动改 GPU\/上下文参数重试/.test(orch), 'orch runner 崩溃仅提示硬失败')

ok(
  resolveModelForExecution({
    selectedModel: 'auto',
    cloudModels: [],
    localModels: ['qwen'],
    allCloudModels: [],
    routeHint: 'prefer-cloud',
  }) == null,
  'prefer-cloud 空云池 → null',
)
ok(
  resolveModelForExecution({
    selectedModel: 'auto',
    cloudModels: ['claude-sonnet'],
    localModels: [],
    routeHint: 'prefer-local',
  }) == null,
  'prefer-local 空本地池 → null',
)
ok(String(CLOUD_PROVIDER_REQUIRED_ERROR).includes('未启用云供应商'), '云硬错误文案')
ok(String(LOCAL_PROVIDER_REQUIRED_ERROR).includes('未启用本地模型'), '本地硬错误文案')
ok(String(MODEL_NOT_IN_POOL_ERROR).includes('不在已启用池内'), '池外硬错误文案')
ok(
  String(LOCAL_MODEL_NOT_INSTALLED_ERROR).includes('未安装到本机 Ollama'),
  '未安装本地模型硬错误文案',
)
ok(
  /resolveInstalledOllamaTag|LOCAL_MODEL_NOT_INSTALLED_ERROR/.test(
    fs.readFileSync(path.join(root, 'server/cad-bridge.cjs'), 'utf8'),
  ),
  '本地编排入口校验 Ollama tags',
)

const mcpHint = fs.readFileSync(path.join(root, 'web/src/lib/mcp-health-hint.ts'), 'utf8')
ok(/assertMcpHealthForTurn/.test(mcpHint), 'MCP 硬闸存在')
ok(/MCP_HEALTH_SNAPSHOT_UNAVAILABLE_MESSAGE/.test(mcpHint), 'MCP 快照异常硬失败文案')
ok(!/catch\s*\{\s*return\s*\{\s*ok:\s*true/.test(mcpHint), 'MCP catch 不静默 ok')

const send = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
ok(/不会自动改用 Host 或直聊/.test(send), 'CLI 失败禁 Host/直聊 文案')
ok(!/setLiveExecChannel\(['"]falling-back['"]/.test(send), 'use-chat-send 无 falling-back 通道')
ok(!/hostAgentPrompt\(/.test(send), 'use-chat-send 不调用 hostAgentPrompt 静默回落')
ok(
  /isClaudeCliModel\(modelId\) &&\s*\n?\s*turnPolicy\.allowTools/.test(send),
  '云供应商模型不进 CLI；Claude 的 Agent/Plan 仍走工具环',
)
ok(/!usedToolLoop && wantsToolLoop/.test(send), 'Plan/Agent 工具环失败均硬失败')

const bridge = fs.readFileSync(path.join(root, 'server/cad-bridge.cjs'), 'utf8')
ok(/已禁止 stub 占位成功/.test(bridge), 'workflow stub 禁假成功')

const toolUi = fs.readFileSync(path.join(root, 'web/src/components/chat-tool-activity.tsx'), 'utf8')
ok(/label: "Edited"/.test(toolUi) && /label: "Ran"/.test(toolUi), '时间线 Edited/Ran 标签')

const compress = fs.readFileSync(path.join(root, 'web/src/lib/compress-agent-display.ts'), 'utf8')
ok(/normalizeStreamEventName/.test(compress), 'streamEvents 规范名')

const agentFix = fs.readFileSync(path.join(root, 'web/src/lib/agent-fix-request.ts'), 'utf8')
ok(/looksLikeTerminalFailure/.test(agentFix) && /requestAgentFix/.test(agentFix), 'Agent 修 fail-gate')

const editor = fs.readFileSync(path.join(root, 'web/src/components/workbench-code-editor.tsx'), 'utf8')
ok(/待确认行内 diff/.test(editor) && /buildLineDiffPreview/.test(editor), '编辑器行内 Accept/Reject 预览')

const fileSync = fs.readFileSync(
  path.join(root, 'web/src/components/workbench-composer-file-sync.tsx'),
  'utf8',
)
ok(/openAgentWrittenReview/.test(fileSync) && /subscribePendingWrites/.test(fileSync), '文件条合并 pending+written')
ok(/subscribeRecentlyWrittenPaths/.test(fileSync), '文件条合并 recently written')
ok(/undoWrittenPathsOnDisk|takeWorkspaceWriteCheckpoint/.test(fileSync), 'Undo All 可还原已写盘')

const dock = fs.readFileSync(path.join(root, 'web/src/components/workbench-chat-composer.tsx'), 'utf8')
ok(/composer-pending-bar/.test(dock) && /全部接受/.test(dock), 'Composer 待确认全部接受条')
const footerPanel = fs.readFileSync(
  path.join(root, 'web/src/components/composer-turn-footer-panel.tsx'),
  'utf8',
)
ok(
  /composer-file-changes-bar-count/.test(footerPanel) &&
    /Undo All/.test(footerPanel) &&
    />\s*Review\s*</.test(footerPanel),
  'Composer > N Files + Undo All + Review',
)
ok(/requestPlanBuild/.test(footerPanel) && /PLAN_BUILD_BUTTON/.test(footerPanel), 'Composer 方案底栏含 Build')
ok(/>\s*Open\s*</.test(footerPanel), 'Composer 方案底栏含 Open')
const ixMode = fs.readFileSync(path.join(root, 'web/src/lib/workbench-interaction-mode.ts'), 'utf8')
ok(/\["agent", "plan", "ask"\]/.test(ixMode), 'Shift+Tab 顺序 Agent→Plan→Ask（对齐 Cursor）')
ok(!/\["agent", "ask", "plan"\]/.test(ixMode), '旧 Ask-before-Plan 循环已废除')
ok(
  /ComposerTurnFooterPanel/.test(dock) &&
    /getComposerCanvasPlan/.test(dock) &&
    /getComposerBackgroundTerminalRuns/.test(dock),
  'Composer 挂接回合底栏',
)
ok(
  /composer-turn-footer/.test(footerPanel) &&
    /background terminal/.test(footerPanel) &&
    />\s*Open\s*</.test(footerPanel) &&
    /aria-expanded/.test(footerPanel),
  '回合底栏可展开终端命令与文件路径',
)

const turnFooter = fs.readFileSync(
  path.join(root, 'web/src/lib/workbench-composer-turn-footer.ts'),
  'utf8',
)
ok(
  /trackComposerCanvasPlan/.test(turnFooter) &&
    /recordBackgroundTerminalRun/.test(turnFooter) &&
    /publishOpenTerminalSessions/.test(turnFooter) &&
    /snapshotComposerTurnFooter/.test(turnFooter) &&
    /getComposerBackgroundTerminalRuns[\s\S]*?return runs/.test(turnFooter) &&
    !/function visibleRuns/.test(turnFooter),
  '回合底栏：方案快照 + 成功终端命令跟随打开的会话（runs 引用稳定）',
)

const toastTrack = fs.readFileSync(path.join(root, 'web/src/lib/toast-workspace-write.ts'), 'utf8')
ok(/trackAgentWrittenPaths/.test(toastTrack), '写盘成功 track 路径供文件条（不强制开 Review）')
ok(/trackComposerCanvasPlan/.test(toastTrack), '写盘方案文档挂 Canvas 底栏')

const atLib = fs.readFileSync(path.join(root, 'web/src/lib/composer-at-mention.ts'), 'utf8')
ok(/extractAtMentionTokens/.test(atLib) && /removeAtMentionToken/.test(atLib), '@ 引用 pill 契约')

const cm = fs.readFileSync(path.join(root, 'web/src/components/codemirror-workbench.tsx'), 'utf8')
ok(/editor-selection-chat-btn/.test(cm) && /@selection/.test(cm), '选区 Ask 浮动入口')
ok(/Inline Edit/.test(cm) && /setInlineEditOpen\(true\)/.test(cm), '选区 Edit ⌘K 入口')

const inline = fs.readFileSync(path.join(root, 'web/src/components/codemirror-inline-edit.tsx'), 'utf8')
ok(/selectionAnchorStyle/.test(inline) && /Ask · 仅预览/.test(inline), 'Cmd+K 贴选区 + Ask 预览不写盘')

const userBody = fs.readFileSync(path.join(root, 'web/src/components/chat-user-message-body.tsx'), 'utf8')
ok(/splitLeadForAtPills/.test(userBody) && /chat-user-at-pill/.test(userBody), '用户气泡 @ pill')

const editorMenu = fs.readFileSync(
  path.join(root, 'web/src/lib/codemirror-editor-menu.ts'),
  'utf8',
)
ok(!/disabled:\s*true/.test(editorMenu), '编辑器菜单无永久 disabled 占位')
ok(
  /id:\s*"call-hierarchy"/.test(editorMenu) &&
    /showCallHierarchyAt/.test(editorMenu) &&
    /callHierarchyLike/.test(editorMenu),
  '调用层次结构按 callHierarchyLike 接线（无永久灰项）',
)
ok(/requestWorkbenchCommandPalette/.test(editorMenu), '菜单命令面板已接线')
ok(/format-doc/.test(editorMenu) && /goto-impl/.test(editorMenu), '格式化/转到实现按 tsLike 条件出现')

const callHierPeek = fs.readFileSync(
  path.join(root, 'web/src/components/workbench-call-hierarchy-peek.tsx'),
  'utf8',
)
ok(/WorkbenchCallHierarchyPeek/.test(callHierPeek), 'Call Hierarchy Peek 组件存在')
ok(
  /popCallHierarchyPeek/.test(callHierPeek) && /push:\s*true/.test(callHierPeek),
  'Call Hierarchy Peek 支持返回上一层',
)
const centerEd = fs.readFileSync(
  path.join(root, 'web/src/components/workbench-center-editor.tsx'),
  'utf8',
)
ok(/WorkbenchCallHierarchyPeek/.test(centerEd), 'Call Hierarchy Peek 已挂到中心编辑器')

const cmdPalette = fs.readFileSync(
  path.join(root, 'web/src/components/workbench-command-palette.tsx'),
  'utf8',
)
ok(/requestWorkbenchQuickOpen/.test(cmdPalette), '命令面板含转到文件')
ok(/@problems/.test(cmdPalette), '命令面板含 @problems')
ok(/恢复会话检查点/.test(cmdPalette) && /requestRestoreSessionCheckpoint/.test(cmdPalette), '命令面板可恢复会话检查点')

const fmtRpc = fs.readFileSync(path.join(root, 'server/workspace-tsservice.mjs'), 'utf8')
ok(/export function tsFormatDocument/.test(fmtRpc), 'tsFormatDocument RPC 存在')
ok(/export function tsCallHierarchyAt/.test(fmtRpc), 'tsCallHierarchyAt RPC 存在')

const extLsp = fs.readFileSync(path.join(root, 'server/workspace-external-lsp.mjs'), 'utf8')
ok(/export async function externalLspCallHierarchyAt/.test(extLsp), '外部 LSP Call Hierarchy')
ok(/export async function externalLspDocumentSymbols/.test(extLsp), '外部 LSP DocumentSymbol')

const streamParse = fs.readFileSync(path.join(root, 'server/claude-stream-parse.mjs'), 'utf8')
ok(/extractToolResultOutput/.test(streamParse) && /toolUseById/.test(streamParse), 'CLI tool_result 捕获 output')
ok(/extractClaudeStreamUsage/.test(streamParse) && /state\.usage/.test(streamParse), 'CLI stream 捕获 usage 实参')

const streamEv = fs.readFileSync(path.join(root, 'web/src/lib/stream-agent-events.ts'), 'utf8')
ok(/output\?:\s*string/.test(streamEv), 'StreamAgentEvent 含 output')

const runCmd = fs.readFileSync(path.join(root, 'server/workspace-run-command.mjs'), 'utf8')
ok(/node-pty/.test(runCmd) && /ptyMode/.test(runCmd) && /runViaPty/.test(runCmd), 'run_command 优先真 PTY')

const liveExec = fs.readFileSync(path.join(root, 'web/src/lib/live-exec-channel.ts'), 'utf8')
ok(/bindLiveExecTerminalSession/.test(liveExec), 'live-exec 可绑定终端会话')

const outlinePanel = fs.readFileSync(
  path.join(root, 'web/src/components/workbench-outline-panel.tsx'),
  'utf8',
)
ok(/fetchExternalLspDocumentSymbols/.test(outlinePanel), '大纲接外部 LSP DocumentSymbol')

ok(
  /call-hierarchy/.test(cmdPalette) && /showCallHierarchyAt/.test(cmdPalette),
  '命令面板含调用层次结构',
)

const chips = fs.readFileSync(path.join(root, 'web/src/components/chat/composer-chips.tsx'), 'utf8')
ok(!/export function SpeedChip/.test(chips), '已删除未接线 SpeedChip')

const bottom = fs.readFileSync(path.join(root, 'web/src/components/workbench-bottom-panel.tsx'), 'utf8')
ok(/label: "控制台"/.test(bottom), '底栏控制台已去调试器暗示')
ok(/label: "端口"/.test(bottom), '底栏端口 Tab 对齐 Cursor 命名')
ok(
  !/px-2\.5 py-1\.5[\s\S]{0,80}uppercase tracking-wide/.test(bottom),
  '底栏 Tab 无全大写 tracking',
)
ok(/terminalPtyMode/.test(bottom) && /"PTY"/.test(bottom) && /"PIPE"/.test(bottom), '底栏终端模式徽章')

const termRunBridge = fs.readFileSync(
  path.join(root, 'web/src/lib/workbench-terminal-run-bridge.ts'),
  'utf8',
)
ok(
  /echoAgentRunsInWorkbenchTerminal/.test(termRunBridge) && /echoAgentRun/.test(termRunBridge),
  'Agent 命令回显桥接',
)
ok(
  /echoAgentRunsInWorkbenchTerminal/.test(
    fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8'),
  ),
  '发送路径回显 Agent 命令到终端',
)

const explorerCss = fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8')
ok(
  /\.explorer-section-header\s*\{[^}]*text-transform:\s*none/.test(explorerCss),
  '资源管理器根标题非全大写',
)
ok(
  !/\.workbench-explorer-sidebar \.explorer-section-actions\s*\{\s*opacity:\s*1/.test(explorerCss),
  '资源管理器操作钮非常显（hover 显示）',
)
ok(/height:\s*22px/.test(explorerCss) && /\.explorer-tree-row/.test(explorerCss), 'explorer 行高 22px')

const emptyEd = fs.readFileSync(
  path.join(root, 'web/src/components/workbench-center-editor.tsx'),
  'utf8',
)
ok(/⌘P 转到文件/.test(emptyEd) && !/从左侧资源管理器打开/.test(emptyEd), '空编辑器极简空态')

const uiCopy = fs.readFileSync(path.join(root, 'web/src/lib/ui-copy.ts'), 'utf8')
ok(/Plan, Build/.test(uiCopy) && !/输入指令/.test(uiCopy), 'Composer placeholder 对齐 Cursor 场景')

const composerShell = fs.readFileSync(
  path.join(root, 'web/src/components/chat-composer-shell.tsx'),
  'utf8',
)
ok(/多 Agent 并行/.test(composerShell), '并行收入扩展菜单')
ok(
  !/composer-chrome-chip[\s\S]{0,120}并行<\/span>/.test(composerShell),
  'Composer 底栏无常驻并行 chip',
)

const ckpt = fs.readFileSync(path.join(root, 'web/src/lib/session-history-checkpoint.ts'), 'utf8')
ok(/saveSessionHistoryCheckpoint[\s\S]*:\s*boolean/.test(ckpt), '检查点保存返回 boolean')
ok(/requestRestoreSessionCheckpoint/.test(ckpt), '检查点恢复请求 API')

const indexRoute = fs.readFileSync(path.join(root, 'web/src/routes/index.tsx'), 'utf8')
ok(/检查点不存在或已失效/.test(indexRoute), '撤销检查点失败硬 toast')
ok(/无法保存检查点/.test(indexRoute), '保存检查点失败硬 toast')
ok(/!saved[\s\S]*return/.test(indexRoute) || /if\s*\(\s*!saved\s*\)[\s\S]*return/.test(indexRoute), '保存失败取消截断')

const ctxMenu = fs.readFileSync(path.join(root, 'web/src/components/chat-message-context-menu.tsx'), 'utf8')
ok(/role:\s*"user"\s*\|\s*"assistant"/.test(ctxMenu), '气泡右键按角色拆分')
ok(/编辑此消息/.test(ctxMenu) && /重新发送/.test(ctxMenu), '用户右键含编辑/重发')
ok(/role === "user"/.test(ctxMenu) && /role === "assistant"/.test(ctxMenu), '右键菜单按 role 分支')
ok(/buildFenceOnlyWriteItems/.test(ctxMenu), '助手写入仅围栏')
ok(/role !== "assistant"/.test(ctxMenu) && /将本条气泡写入工作区/.test(ctxMenu), '写入项仅助手可启用')
ok(/onWriteToWorkspace!\(content\)/.test(ctxMenu) && !/role === "user"[\s\S]{0,400}onWriteToWorkspace/.test(ctxMenu), '用户右键不挂写入回调')

const confirmWrite = fs.readFileSync(path.join(root, 'web/src/lib/confirm-write.ts'), 'utf8')
ok(!/inferCanonicalMdPathByContent/.test(confirmWrite), 'confirm-write 无关键词硬编码路径推断')
ok(/buildFenceOnlyWriteItems/.test(confirmWrite), '围栏专用写入 items')
ok(/defaultRelativePath/.test(confirmWrite), '一键写入仅围栏或显式默认路径')

const help = fs.readFileSync(path.join(root, 'web/src/routes/help.tsx'), 'utf8')
ok(/恢复会话检查点/.test(help) && /气泡右键/.test(help), 'help 含检查点/右键说明')
ok(
  /调用层次结构/.test(help) && /Plan · Build/.test(help) && /终端模式徽章/.test(help),
  'help 含调用层次 / Plan·Build / 终端徽章',
)
ok(/修复真 PTY|node-pty/.test(
  fs.readFileSync(path.join(root, 'web/src/components/workbench-bottom-panel.tsx'), 'utf8'),
), 'PIPE 模式可复制 node-pty 修复命令')

const chatSend = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
ok(
  /!closeLoop\.ok[\s\S]*content:\s*displayContent/.test(chatSend),
  '写盘闭环失败保留助手正文 displayContent',
)
ok(
  /!closeLoop\.ok[\s\S]*requestErrorDetail:\s*closeLoop\.error/.test(chatSend),
  '写盘闭环失败用 requestErrorDetail 横幅，不替换 content',
)
ok(!/content:\s*closeLoop\.error/.test(chatSend), '禁止用 closeLoop.error 覆盖气泡正文')

const writeGuard = fs.readFileSync(path.join(root, 'web/src/lib/workspace-write-guard.ts'), 'utf8')
ok(!/任务状态\|已完成\|执行完毕/.test(writeGuard), '声称写盘检测不含泛化「已完成」')
ok(!/docs\/prd\.md/.test(writeGuard), '缺围栏提示无硬编码 docs/prd.md')

const replyLang = fs.readFileSync(path.join(root, 'server/reply-language.mjs'), 'utf8')
ok(/ok 恒为 true|永不因此拒发|不出站拒发/.test(replyLang), '回复语言模块对齐 Cursor（不出站拒发）')
ok(!/已拒绝发送/.test(replyLang), '语言模块无「已拒绝发送」硬闸文案')

const orchLang = fs.readFileSync(
  path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js'),
  'utf8',
)
ok(/language-mismatch advisory \(content kept\)/.test(orchLang), '编排语言不一致仅审计并保留正文')
ok(!/回复语言与用户不一致，已拒绝发送/.test(orchLang), '编排无语言拒发空 content 分支')

const toastWrite = fs.readFileSync(path.join(root, 'web/src/lib/toast-workspace-write.ts'), 'utf8')
ok(/autoOpenScm === true/.test(toastWrite), '写盘成功默认不自动开 SCM（显式 true 才开）')
ok(/autoOpenReview === true/.test(toastWrite), '写盘成功默认不自动开 Review')
ok(/autoOpenFirstFile === true/.test(toastWrite), '写盘成功默认不自动开首文件')
ok(!/autoOpenScm !== false/.test(toastWrite), '无旧默认 autoOpenScm 为 true 的逻辑')

const chatSendToast = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
ok(
  !/toastWorkspaceWriteSuccess\([\s\S]*autoOpenFirstFile:\s*true/.test(chatSendToast),
  'Agent 写盘不强制 autoOpenFirstFile',
)
ok(/quiet:\s*true/.test(chatSendToast), 'Agent 写盘成功 quiet toast（对齐 Cursor）')
ok(/filePatches/.test(chatSendToast), '写盘补丁进 agentTurn.filePatches')

const toastQuiet = fs.readFileSync(path.join(root, 'web/src/lib/toast-workspace-write.ts'), 'utf8')
ok(/quiet\?:\s*boolean/.test(toastQuiet) || /opts\?\.quiet/.test(toastQuiet), 'toast 支持 quiet')
ok(/opts\?\.quiet !== false/.test(toastQuiet), '写盘成功 toast 默认安静（须 quiet:false 才弹）')
ok(
  !/toastWorkspaceWriteSuccess\(`已写入/.test(
    fs.readFileSync(path.join(root, 'web/src/routes/index.tsx'), 'utf8'),
  ),
  '一键/围栏写入不再弹「已写入 N 个文件」',
)

const undoSnap = fs.readFileSync(path.join(root, 'web/src/components/chat-assistant-content.tsx'), 'utf8')
ok(/无法精确撤销：缺少写前快照/.test(undoSnap), 'Undo 无快照硬提示')
ok(/editFromFilePatch/.test(undoSnap), 'Agent 气泡优先 filePatches Diff 卡')
ok(
  !/toastWorkspaceWriteSuccess\(`已接受/.test(undoSnap),
  'Accept All 不再弹「已接受 N 个文件」',
)

const toolStreamHook = fs.readFileSync(
  path.join(root, 'web/src/hooks/use-agent-tool-stream.ts'),
  'utf8',
)
ok(/agent_tool_event/.test(toolStreamHook), '工具行直播订阅 agent_tool_event')

const serverIndex = fs.readFileSync(path.join(root, 'server/index.mjs'), 'utf8')
ok(/agent_tool_event/.test(serverIndex), 'Bridge 白名单含 agent_tool_event')

const mergeEvents = fs.readFileSync(path.join(root, 'web/src/lib/compress-agent-display.ts'), 'utf8')
ok(
  !/status === "running" \? "ok"/.test(mergeEvents),
  'mergeStreamEvents 不再把 running 强改 ok',
)
ok(/status === "running"\s*\?\s*"running"/.test(mergeEvents), 'mergeStreamEvents 保留 running')

const cliPatches = fs.readFileSync(path.join(root, 'server/claude-cli.mjs'), 'utf8')
ok(/snapshotCliEditBefore|finalizeCliFilePatches/.test(cliPatches), 'CLI Edit/Write 写前快照')
ok(/filePatches/.test(cliPatches) && /buildCliWriteExtras/.test(cliPatches), 'CLI 回传 filePatches')

ok(/normalizeWritePatches\(res\?\.filePatches\)/.test(chatSendToast), '前端消费 CLI filePatches')
ok(/capThoughtForFold|THOUGHT_FOLD_MAX/.test(mergeEvents), 'Thought 折叠截短')
ok(/summarizeToolOutput/.test(undoSnap), '终端卡用工具 output 摘要')

const fileEditCss = fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8')
ok(/\.cursor-diff-lines/.test(fileEditCss) && /\.cursor-diff-line--add/.test(fileEditCss), 'Cursor 同源 diff 行样式')
ok(
  /\.cursor-diff-line--add[\s\S]{0,80}var\(--diff-add\)/.test(fileEditCss),
  '增行直接用 --diff-add（Cursor 淡色）',
)
ok(
  /\.cursor-diff-line--del[\s\S]{0,80}var\(--diff-del\)/.test(fileEditCss),
  '删行直接用 --diff-del（Cursor 淡色）',
)

const cursorDiffLines = fs.readFileSync(
  path.join(root, 'web/src/components/cursor-diff-lines.tsx'),
  'utf8',
)
ok(/cursor-diff-gutter/.test(cursorDiffLines), 'Cursor 单栏行号 gutter')
ok(!/cursor-diff-gutter--old/.test(cursorDiffLines), '对话 diff 非双栏 old gutter')
ok(
  /grid-template-columns:\s*2\.5rem 1\.1rem minmax\(0,\s*1fr\)/.test(fileEditCss),
  'Cursor 单栏 gutter 网格',
)
ok(
  /chat-file-edit-card-head[\s\S]{0,220}grid-template-columns:\s*auto minmax\(0,\s*1fr\) auto/.test(
    fileEditCss,
  ),
  '文件卡头防粘连网格（icon | basename | stats，无左侧箭头）',
)
ok(
  /chat-assistant-blocks--compact/.test(
    fs.readFileSync(path.join(root, 'web/src/components/chat-assistant-content.tsx'), 'utf8'),
  ),
  '助手对话启用 compact 样式作用域',
)

const chatFileCard = fs.readFileSync(
  path.join(root, 'web/src/components/chat-file-edit-card.tsx'),
  'utf8',
)
ok(/CursorDiffLines/.test(chatFileCard) && /SetiFileIcon/.test(chatFileCard), '对话文件卡用 CursorDiff + Seti')
ok(/\bKeep\b/.test(chatFileCard) && /\bUndo\b/.test(chatFileCard), '对话卡 Keep/Undo 文案（对齐 Cursor）')
ok(!/chat-file-edit-card-dir/.test(chatFileCard), '对话卡头不内联目录（防粘连）')
ok(!/ChatDockCollapsibleChevron/.test(chatFileCard), '对话文件卡头无左侧展开箭头（对齐 Cursor）')
ok(!/ClassicFileEditCard/.test(chatFileCard), '对话文件卡无 classic 双轨')

const diffReview = fs.readFileSync(
  path.join(root, 'web/src/components/workbench-diff-review.tsx'),
  'utf8',
)
ok(/CursorDiffLines/.test(diffReview), 'Diff Review 用 CursorDiffLines')
ok(/>Review</.test(diffReview) || /font-medium">Review</.test(diffReview), 'Review 标题对齐 Cursor')

const appliedReview = fs.readFileSync(
  path.join(root, 'web/src/components/workbench-applied-diff-review.tsx'),
  'utf8',
)
ok(/CursorDiffLines/.test(appliedReview), '已写入 Review 用 CursorDiffLines')

const explorerIcon = fs.readFileSync(
  path.join(root, 'web/src/lib/explorer-file-icon.tsx'),
  'utf8',
)
ok(/if \(isDir\) return null/.test(explorerIcon), '目录无文件夹图标（对齐 Cursor）')
ok(/SetiFileIcon/.test(explorerIcon), '文件走 SetiFileIcon')
ok(
  /--explorer-icon-size:\s*18px/.test(
    fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8'),
  ),
  '文件图标 18px（对齐 Cursor 视觉体量）',
)
ok(
  /\.explorer-tree-folder-icon\s*\{[^}]*display:\s*none/.test(
    fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8'),
  ),
  'CSS 隐藏目录文件夹图标',
)

const resolveSeti = fs.readFileSync(
  path.join(root, 'web/src/lib/seti/resolve-seti-icon.ts'),
  'utf8',
)
ok(/matchFileExtension/.test(resolveSeti), 'Seti 最长后缀匹配')
ok(!/\\uE023/.test(resolveSeti) && !/#bfc2c1/.test(resolveSeti), 'Seti 无硬编码默认灰块兜底')
ok(/throw new Error\(`Seti iconDefinitions/.test(resolveSeti), '缺 Seti 定义抛错')

const workspacePanel = fs.readFileSync(
  path.join(root, 'web/src/components/workspace-panel.tsx'),
  'utf8',
)
ok(/ExplorerTreeIcon/.test(workspacePanel), 'workspace-panel 树用 ExplorerTreeIcon')
ok(!/function iconFor\(/.test(workspacePanel), 'workspace-panel 无 Lucide iconFor 双轨')

const terminalTheme = fs.readFileSync(path.join(root, 'web/src/lib/terminal-theme.ts'), 'utf8')
ok(!/#f8f6f3/.test(terminalTheme) && !/#3f3f46/.test(terminalTheme), 'terminal-theme 无 zinc 静默色')
ok(/throw new Error\(`CSS 变量/.test(terminalTheme), 'terminal 缺 CSS 变量抛错')

const workbenchFonts = fs.readFileSync(path.join(root, 'web/src/lib/workbench-fonts.ts'), 'utf8')
ok(/WORKBENCH_CODE_FONT_SIZE_PX/.test(workbenchFonts), 'code 字号常量单源')
ok(/缺少 CSS token --font-size-code/.test(workbenchFonts), '缺 --font-size-code 抛错')
const monoCss = (fileEditCss.match(/--font-mono:\s*([^;]+);/) || [])[1] || ''
ok(
  workbenchFonts.includes(monoCss.replace(/\s+/g, ' ').trim().slice(0, 40)) ||
    /JetBrains Mono/.test(workbenchFonts),
  'WORKBENCH_MONO_FONT 与 --font-mono 同源栈',
)

ok(
  /\.explorer-tree-row[\s\S]{0,200}font-size:\s*var\(--font-size-sm\)/.test(fileEditCss),
  'explorer 行字号走 --font-size-sm',
)
ok(
  /\.chat-bubble-user[\s\S]{0,280}font-size:\s*var\(--font-size-sm\)/.test(fileEditCss),
  '用户气泡字号走 token',
)
ok(
  /\.cursor-diff-lines[\s\S]{0,120}font-size:\s*var\(--font-size-xs\)/.test(fileEditCss),
  'diff 行字号走 token',
)

console.log('\ncheck-cursor-parity-e2e: PASSED')
