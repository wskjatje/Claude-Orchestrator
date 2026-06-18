export type OrchestrationState = {
  steps?: { agentName?: string; taskId?: string; instruction?: string; skills?: string[]; mcps?: string[] }[]
  currentIndex?: number
  status?: string
}

/** 用户手动创建的任务链摘要（.claudecode/orchestration/chains/） */
export type SavedChainSummary = {
  id: string
  name: string
  description: string
  category: "single" | "pipeline" | "custom"
  enabled: boolean
  templateId: string | null
  /** 内置通用官方链（id 以 official- 开头） */
  official?: boolean
  /** 注册表步骤涉及的 Agent stem */
  agentStems?: string[]
  stepCount: number
  status: string
  currentIndex: number
  createdAt: string | null
  updatedAt: string | null
}

export type SavedChainDetail = SavedChainSummary & {
  state: OrchestrationState & { steps: NonNullable<OrchestrationState["steps"]> }
}

export type CcSwitchProviderSummary = {
  id: string
  name: string
  isCurrent: boolean
  baseUrl: string
  models: string[]
  hasApiKey: boolean
  apiKeyPreview: string
  websiteUrl?: string
  notes?: string
}

/** 与主进程 `workspace:listPanelTree` 返回的 `tree` 节点一致（侧栏文件树） */
export type WorkspacePanelTreeNode = {
  name: string
  type: 'file' | 'dir'
  ext?: string
  children?: WorkspacePanelTreeNode[]
}

/** 与会话 JSON（sanitizeChatMessage）对齐的单条消息 */
export type UsageStatsSummary = {
  msgUser: number
  msgAssistant: number
  sessionsInRange: number
  promptTok: number
  completionTok: number
  totalTok: number
  apiTurns: number
  errors: number
  latencySumMs: number
  latencySamples: number
  workspaceWriteHints: number
  throughputTokPerSec: number | null
  avgTokPerMsg: number | null
  errRate: number
  topModel: string
  modelCounts: Record<string, number>
  /** 云端 API 回合（会话落库 + CLI 合并前） */
  cloudTurns?: number
  localTurns?: number
  cloudPromptTok?: number
  cloudCompletionTok?: number
  localPromptTok?: number
  localCompletionTok?: number
  cloudTotalTok?: number
  localTotalTok?: number
  /** 会话消息按单价表估算的云端费用 */
  sessionCloudCostUsd?: number
  /** CLI ~/.claude/projects jsonl 估算云端费用 */
  cliCostUsd?: number
  /** 合并后的云端费用（cli + session） */
  cloudCostUsd?: number
  cloudCostFormatted?: string
  localCostUsd?: number
  localCostFormatted?: string
}

export type ChatHistoryMsg = {
  role: 'user' | 'assistant'
  content: string
  ts?: number
  /** Ollama OpenAI 兼容接口返回的 usage（assistant 且模型上报时才有） */
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  /** 本轮请求耗时（毫秒），仅 assistant */
  latencyMs?: number
  /** Ollama/API 失败写入助手气泡时为 true */
  requestError?: boolean
  /** 计费来源：云端 API 或本地 Ollama */
  billingSource?: 'cloud' | 'local'
  /** 本条助手消息使用的模型（用于费用估算） */
  modelId?: string
  attachments?: {
    kind: 'image'
    name?: string
    mime?: string
    dataUrl: string
  }[]
}

/** 项目库中 Agent 当日执行顺序与状态 */
export type AgentExecRegistryEntry = {
  stem: string
  order: number
  status: 'working' | 'idle'
  lastExecAt: string | null
  startedAt: string | null
  execCount: number
}

/** 与主进程 sanitizeScheduledTask 对齐 */
export type ScheduledTask = {
  id: string
  name: string
  enabled: boolean
  scheduleType: 'daily' | 'interval'
  intervalMinutes: number
  dailyTime: string
  action: 'toast' | 'log' | 'reportAppend'
  payload: string
  chatSessionId: string
  /** 上次执行时间（毫秒时间戳） */
  lastRunAt?: number | null
  /** 上次执行错误（空表示成功） */
  lastRunError?: string
}

/**
 * 与 `coding-assistant-desktop/preload.js` 中 `contextBridge.exposeInMainWorld('desktop', …)` 对齐
 */
export type DesktopApi = {
  getWorkspace: () => Promise<string | null>
  chooseWorkspace: (manualPath?: string) => Promise<string | null>
  getWorkspaceHistory: () => Promise<{ version: number; entries: { path: string; openedAt: number }[] }>
  removeWorkspaceHistoryEntry: (path: string) => Promise<{ version: number; entries: { path: string; openedAt: number }[] }>
  clearWorkspaceHistory: () => Promise<{ version: number; entries: { path: string; openedAt: number }[] }>
  /** 系统原生文件选择（Electron）；浏览器预览请用隐藏 input[type=file] */
  chooseReferenceFiles: (opts?: {
    multiple?: boolean
    onlyImages?: boolean
    title?: string
  }) => Promise<{ canceled: boolean; filePaths: string[] }>
  clearWorkspace: () => Promise<null>
  workspaceApplyWriteFence: (items: unknown) => Promise<{
    ok: boolean
    error?: string
    written?: string[]
    errors?: string[]
  }>
  /** 解析助手全文并写盘；ensureChainArtifact → docs/chain-steps/；ensureAgentArtifact → Agent 专属路径 */
  workspaceIngestFromAssistantText?: (payload: {
    text: string
    agentName?: string
    taskId?: string
    ensureChainArtifact?: boolean
    ensureAgentArtifact?: boolean
    /** 实现类 Agent：自动从 workspace-write / 代码块落盘到项目路径 */
    autoWriteProject?: boolean
    manualConfirmOnly?: boolean
  }) => Promise<{
    ok: boolean
    error?: string
    written?: string[]
    errors?: string[]
    displayText?: string
  }>
  /** 扫描多条助手回复，合并代码块/workspace-write 后批量落盘 */
  workspaceBulkIngestFromHistory?: (payload: {
    texts: string[]
    agentName?: string
  }) => Promise<{
    ok: boolean
    error?: string
    written?: string[]
    errors?: string[]
    displayText?: string
    scanned?: number
    missingPaths?: string[]
  }>
  workspaceStartPreview?: (payload: {
    hint?: string
    preferStatic?: boolean
    preferPython?: boolean
    entryRel?: string
  }) => Promise<{
    ok: boolean
    error?: string
    url?: string | null
    kind?: string | null
    label?: string | null
    entryRel?: string | null
    command?: string | null
    port?: number | null
    guide?: string | null
    plan?: Record<string, unknown>
  }>
  workspaceStopPreview?: () => Promise<{ ok: boolean }>
  workspaceGetPreviewStatus?: () => Promise<{
    ok: boolean
    running?: boolean
    url?: string | null
    kind?: string | null
    label?: string | null
    entryRel?: string | null
  }>
  workspaceDetectRunPlan?: (payload: {
    hint?: string
    userLine?: string
    preferStatic?: boolean
    preferPython?: boolean
  }) => Promise<{
    ok: boolean
    kind?: string
    error?: string
    label?: string
    command?: string
    terminalCommand?: string
    script?: string
    entryRel?: string
    cwdRel?: string
    scanSummary?: string[]
    ctx?: {
      name?: string
      description?: string
      framework?: string
      frameworkVersion?: string
      scripts?: Record<string, string>
      deps?: Record<string, string>
      pythonVersion?: string
      venv?: string
    }
  }>
  workspaceGetExecutionSnapshot: () => Promise<{ ok: boolean; text?: string; error?: string }>
  /** 从当前工作区根目录读取相对路径文件（UTF-8），供发消息前注入 PRD 等 */
  readWorkspaceTextFile?: (relPath: string) => Promise<{
    ok: boolean
    text?: string | null
    relPath?: string
    truncated?: boolean
    binary?: boolean
    base64?: string | null
    previewBytes?: number
    size?: number
    error?: string
  }>
  workspaceLintFiles?: (
    relPaths: string[],
    mode?: 'open' | 'full',
  ) => Promise<{
    ok: boolean
    problems?: {
      relPath: string
      line: number
      column: number
      endLine?: number
      endColumn?: number
      severity: 'error' | 'warning'
      message: string
      rule?: string | null
    }[]
    error?: string
  }>
  listWorkspaceMarkdownFiles?: () => Promise<{
    ok: boolean
    files?: { relPath: string; mtimeMs: number; size: number }[]
    error?: string
  }>
  /** 侧栏「文件」：当前工作区根下目录树（主进程裁剪体积） */
  listWorkspacePanelTree?: () => Promise<{
    ok: boolean
    root?: string | null
    tree?: WorkspacePanelTreeNode[]
    /** git status --porcelain 中的相对路径，供资源管理器「已修改」圆点 */
    gitChanged?: string[]
    /** git status 字母（U/M/A/…），与 Cursor 资源管理器右侧一致 */
    gitStatus?: { path: string; letter: string }[]
    error?: string | null
  }>
  /** 侧栏「Shell」：工作区内只读 Git 快照（非交互终端） */
  workspaceGetShellSnapshot?: () => Promise<{
    ok: boolean
    text?: string
    error?: string | null
  }>
  /** 侧栏「改动」：`git diff HEAD` 文本（可能截断） */
  workspaceGetGitDiff?: () => Promise<{
    ok: boolean
    diff?: string
    statusLine?: string
    error?: string | null
  }>
  /** 工作区目录变更（选择 / 清除）后由主进程广播 */
  onWorkspaceChanged?: (fn: (detail: { workspace: string | null }) => void) => () => void
  /** ~/.claude/memory/ 下经验库与写盘索引尾部，供多 Agent 共享（见 memory-cross-agent.js；仅 Electron 预加载） */
  getCrossAgentContext?: () => Promise<{
    ok: boolean
    text: string
    error?: string | null
  }>
  getChatSettings: () => Promise<{
    ollamaBase: string
    model: string
    /** MCP ollama_chat 建议使用的本机模型标签 */
    localOllamaModel?: string
    claudeCliPath?: string
    /** claude-code：需登录 Claude Code；local-mcp：本机 Ollama 编排 + MCP，无需 Anthropic 登录 */
    orchestrationMode?: 'claude-code' | 'local-mcp'
    /** 本地编排时注入的 Agent 文件名（可带或不带 .md） */
    localAgentBasename?: string
    /** 一键确认写入时的默认相对路径（无可解析 workspace-write 时使用） */
    defaultConfirmWritePath?: string
    /**
     * 本地 MCP 编排用：含 mcpServers 的 JSON 绝对路径；空则读 ~/.claude/config.json 再试 mcp.json
     */
    mcpConfigAbsolutePath?: string
    /** 本地 MCP 编排工具循环详细日志（会话级；勿在正式安装包内写死 DEBUG 环境变量） */
    devMcpOrchDebug?: boolean
    cloudModelCatalog?: string[]
    /** 用户在「模型与连接」中手动添加的本地 Ollama 模型 */
    localModelCatalog?: string[]
    /** Workbench「添加云模型」写入的项目内供应商 ID */
    cloudProviderCatalog?: string[]
    /** 聊天区已启用的云供应商 ID */
    chatEnabledCloudProviders?: string[]
    /** 聊天区已启用的本地模型 ID */
    chatEnabledLocalModels?: string[]
    /** 个人 fork：push 与个人 pull 共用（origin） */
    personalGithubRepo?: string
    /** Git 提交身份：push / 个人 pull 共用 */
    gitUserName?: string
    gitUserEmail?: string
    /** 官方 upstream：仅官方 path-scoped pull */
    upstreamGithubRepo?: string
  }>
  getUiPrefs?: () => Promise<{
    ok: boolean
    prefs?: {
      themeMode: 'light' | 'dark' | 'system'
      bridgeUrl: string
      localSecret?: string
      defaultSessionTag?: string
      layoutStorage?: Record<string, string>
      skipCheckpointConfirm?: boolean
      defaultTerminalShell?: 'bash' | 'zsh'
    }
    error?: string
  }>
  saveUiPrefs?: (body: {
    themeMode?: 'light' | 'dark' | 'system'
    bridgeUrl?: string
    localSecret?: string
    defaultSessionTag?: string
    layoutStorage?: Record<string, string>
    skipCheckpointConfirm?: boolean
    defaultTerminalShell?: 'bash' | 'zsh'
  }) => Promise<{
    ok: boolean
    prefs?: {
      themeMode: 'light' | 'dark' | 'system'
      bridgeUrl: string
      localSecret?: string
      defaultSessionTag?: string
      layoutStorage?: Record<string, string>
      skipCheckpointConfirm?: boolean
      defaultTerminalShell?: 'bash' | 'zsh'
    }
    error?: string
  }>
  getProjectDbInfo?: () => Promise<{
    ok: boolean
    dbPath?: string
    dataDir?: string
    legacyDir?: string
    error?: string
  }>
  saveChatSettings: (body: {
    ollamaBase?: string
    model?: string
    localOllamaModel?: string
    claudeCliPath?: string
    orchestrationMode?: 'claude-code' | 'local-mcp'
    localAgentBasename?: string
    defaultConfirmWritePath?: string
    mcpConfigAbsolutePath?: string
    devMcpOrchDebug?: boolean
    cloudModelCatalog?: string[]
    localModelCatalog?: string[]
    cloudProviderCatalog?: string[]
    chatEnabledCloudProviders?: string[]
    chatEnabledLocalModels?: string[]
    personalGithubRepo?: string
    gitUserName?: string
    gitUserEmail?: string
    upstreamGithubRepo?: string
  }) => Promise<unknown>
  ccSwitchStatus?: () => Promise<{ ok: boolean; installed: boolean; dbPath?: string; error?: string }>
  ccSwitchListProviders?: () => Promise<{
    ok: boolean
    providers?: CcSwitchProviderSummary[]
    error?: string
  }>
  ccSwitchUpsertProvider?: (body: {
    id?: string
    name: string
    endpoint: string
    apiKey?: string
    homepage?: string
    sonnetModel?: string
    haikuModel?: string
    opusModel?: string
    extraModels?: string | string[]
    setCurrent?: boolean
    syncWorkbench?: boolean
    notes?: string
  }) => Promise<{
    ok: boolean
    providerId?: string
    provider?: CcSwitchProviderSummary
    importLink?: string
    error?: string
  }>
  ccSwitchDeleteProvider?: (body: {
    providerId: string
  }) => Promise<{ ok: boolean; providerId?: string; error?: string }>
  ccSwitchSetCurrentProvider?: (body: {
    providerId: string
    model?: string
    syncWorkbench?: boolean
  }) => Promise<{ ok: boolean; providerId?: string; model?: string; error?: string }>
  ccSwitchSyncWorkbench?: () => Promise<{
    ok: boolean
    providerId?: string
    providerName?: string
    model?: string
    baseUrl?: string
    modelCount?: number
    error?: string
  }>
  ccSwitchRefreshCloudModels?: (opts?: { fetchRemote?: boolean }) => Promise<{
    ok: boolean
    models?: string[]
    remoteModels?: string[]
    cloudModelCatalog?: string[]
    error?: string
  }>
  chooseClaudeCliExecutable: () => Promise<{
    ok: boolean
    path: string | null
    error?: string
  }>
  loadChatSessions: () => Promise<{
    version?: number
    activeId: string
    activeByWorkspace?: Record<string, string>
    composerDrafts?: Record<
      string,
      {
        input?: string
        pendingImages?: unknown[]
        pendingTerminalSnippets?: unknown[]
      }
    >
    sessions: {
      id: string
      title: string
      modelId: string
      workspacePath?: string | null
      history: ChatHistoryMsg[]
    }[]
  }>
  saveChatSessions: (payload: {
    activeId: string
    activeByWorkspace?: Record<string, string>
    composerDrafts?: Record<
      string,
      {
        input?: string
        pendingImages?: unknown[]
        pendingTerminalSnippets?: unknown[]
      }
    >
    sessions: {
      id: string
      title: string
      modelId: string
      workspacePath?: string | null
      history: ChatHistoryMsg[]
    }[]
  }) => Promise<{ ok?: boolean; error?: string }>
  listOllamaModels: (base: string) => Promise<{ ok: boolean; models?: string[]; error?: string }>
  /** 单轮 headless：当前工作区下执行 `claude -p`，加载 ~/.claude MCP/Skills */
  claudeCodePrompt: (payload: {
    prompt: string
    model?: string
    requestId?: string
    claudeSessionId?: string
    sessionName?: string
    isNewClaudeSession?: boolean
    attachmentCount?: number
    timeoutMs?: number
    attachments?: { kind: 'image'; name?: string; mime?: string; dataUrl: string }[]
  }) => Promise<{
    ok: boolean
    content?: string
    error?: string | null
    aborted?: boolean
    claudeSessionId?: string
  }>
  /** 中止对应 requestId 的 Claude Code CLI 子进程 */
  claudeCodeAbort: (requestId: string) => Promise<{ ok: boolean }>
  /** Claude Code CLI 可用的 `--model` 别名列表（sonnet / opus / haiku） */
  claudeCodeListModels: () => Promise<{ ok: boolean; models?: string[]; error?: string | null }>
  /** 本机 Ollama 为编排大脑，经 MCP 调工具链（无需 Claude Code 登录） */
  localOrchestrationPrompt: (payload: {
    priorMessages: {
      role: 'user' | 'assistant'
      content: string
      attachments?: { kind: 'image'; name?: string; mime?: string; dataUrl: string }[]
    }[]
    userLine: string
    userAttachments?: { kind: 'image'; name?: string; mime?: string; dataUrl: string }[]
    orchestratorModel: string
    requestId?: string
    /** 仅本轮：覆盖设置中的 Agent 文件名，如 project-manager.md（与 /agent 指令一致） */
    agentBasenameOverride?: string
  }) => Promise<{
    ok: boolean
    content?: string
    error?: string | null
    aborted?: boolean
    /** 本地编排层附加说明（如 Ollama 曾拒绝 tools 而已降级重试） */
    orchestrationHints?: string[]
  }>
  localOrchestrationAbort: (requestId: string) => Promise<{ ok: boolean }>
  /** 将系统对话框返回的图片路径读成聊天用附件（仅图片扩展名） */
  readReferenceFilesAsImageAttachments: (filePaths: string[]) => Promise<{
    ok: boolean
    items?: {
      kind: 'image'
      name: string
      mime: string
      dataUrl: string
    }[]
  }>
  /** 将聊天附图落盘到工作区 `.claudecode/chat-images/`（供 Claude Read 工具） */
  saveChatImageAttachments?: (attachments: {
    kind: 'image'
    name?: string
    mime?: string
    dataUrl: string
  }[]) => Promise<{ ok: boolean; paths?: string[]; error?: string }>
  /** 附图预解析：DeepSeek 等不支持视觉时，用本机 Ollama 视觉模型写入文字描述 */
  enrichChatUserLineForImages?: (payload: {
    userLine: string
    userAttachments: { kind: 'image'; name?: string; mime?: string; dataUrl: string }[]
    orchestratorModel?: string
  }) => Promise<{ userLine: string; images?: string[]; visionModel?: string | null }>
  openExternal: (url: string) => Promise<unknown>
  restartClaudeCodeDesktop: () => Promise<{ ok?: boolean; error?: string }>
  /** 检测本机 `claude` CLI 路径、版本、npm registry 最新版（仅 npm 分发说明） */
  claudeCodeCliStatus: () => Promise<{
    ok: boolean
    error?: string
    /** 用户配置里保存的原始路径（可含 ~） */
    configuredPath?: string
    claudePath?: string
    versionLine?: string
    /** manual=使用下面配置路径，path=从 PATH 解析 */
    detectionSource?: 'manual' | 'path'
    latestNpmVersion?: string
    hint?: string
  }>
  claudeCodeDoctor: () => Promise<{
    ok: boolean
    content?: string
    exitCode?: number
    error?: string | null
  }>
  claudeProjectsListRecent: (opts?: { workspacePath?: string | null; limit?: number }) => Promise<{
    ok: boolean
    sessions?: {
      sessionId: string
      title: string
      model: string
      lastActivityMs: number
      cwd?: string
      source: string
    }[]
    error?: string
  }>
  claudeProjectsUsageSummary: (opts?: {
    workspacePath?: string | null
    startMs?: number
    endMs?: number
  }) => Promise<{
    ok: boolean
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    costUsd?: number
    costUsdFormatted?: string
    turns?: number
    sessionsInRange?: number
    error?: string
  }>
  /** 从 workbench.db 读取已聚合的用量 KPI（按日/小时桶缓存） */
  getUsageSummary?: (opts?: { startMs?: number; endMs?: number }) => Promise<{
    ok: boolean
    summary?: UsageStatsSummary
    daily?: UsageStatsSummary & { date: string }[]
    hourly?: UsageStatsSummary & { hourStartMs: number; label: string }[]
    lastBuiltAt?: number | null
    error?: string
  }>
  /** 从当前会话历史全量重建用量统计缓存 */
  rebuildUsageStats?: () => Promise<{ ok: boolean; lastBuiltAt?: number | null; error?: string }>
  mcpHealthCheckAll: () => Promise<{
    ok: boolean
    missing?: boolean
    okCount?: number
    total?: number
    servers?: { name: string; status: string; transport?: string; error?: string | null; last_health_at?: string }[]
    error?: string
  }>
  mcpHealthCheckOne: (name: string) => Promise<{
    ok: boolean
    server?: { name: string; status: string; transport?: string; error?: string | null; last_health_at?: string }
    repaired?: boolean
    repairs?: string[]
    error?: string
  }>
  /** 读取 workbench.db 中缓存的 MCP 健康快照（启动时或手动检查后写入） */
  mcpGetHealthSnapshot: () => Promise<{
    ok: boolean
    configPath?: string | null
    missing?: boolean
    snapshot?: {
      version?: number
      configPath?: string
      checkedAt?: string
      servers?: Record<
        string,
        { status: string; transport?: string; error?: string | null; last_health_at?: string }
      >
    } | null
    error?: string
  }>
  /** 仅 npm 全局更新；返回是否确有版本变化（用于避免无谓提示刷新界面） */
  claudeCodeCliUpdate: () => Promise<{
    ok: boolean
    actuallyUpdated?: boolean
    command?: string
    method?: string
    versionBefore?: string
    versionAfter?: string
    stdout?: string
    stderr?: string
    combined?: string
  }>
  workbenchGitStatus: () => Promise<{
    ok: boolean
    repoRoot?: string
    branch?: string
    dirty?: boolean
    dirtySummary?: string
    upstreamUrl?: string
    personalUrl?: string
    originUrl?: string
    gitUserName?: string
    gitUserEmail?: string
    remotes?: { name: string; url: string }[]
    pullMode?: string
    syncScopeNote?: string
    workspacePath?: string
    defaultPushReason?: string
    error?: string
  }>
  workbenchGitCheckUpstream: (payload?: { upstreamGithubRepo?: string }) => Promise<{
    ok: boolean
    hasUpdates?: boolean
    upstreamRef?: string
    upstreamSha?: string
    headLine?: string
    lastSyncSha?: string | null
    message?: string
    error?: string
  }>
  workbenchGitPullUpstream: (payload?: { upstreamGithubRepo?: string }) => Promise<{
    ok: boolean
    branch?: string
    headLine?: string
    upstreamUrl?: string
    upstreamRef?: string
    syncedPaths?: string[]
    failedPaths?: { path: string; error?: string }[]
    pathScoped?: boolean
    combined?: string
    error?: string
    dirty?: boolean
    conflict?: boolean
  }>
  workbenchGitPullPersonal: (payload?: { personalGithubRepo?: string }) => Promise<{
    ok: boolean
    branch?: string
    headLine?: string
    personalUrl?: string
    originRef?: string
    fullSync?: boolean
    deployed?: {
      ok?: boolean
      summary?: string
      error?: string
    }
    combined?: string
    error?: string
    dirty?: boolean
    conflict?: boolean
  }>
  workbenchGitDeployPersonal: (payload?: { overwrite?: boolean }) => Promise<{
    ok: boolean
    summary?: string
    combined?: string
    error?: string
  }>
  workbenchGitPushPersonal: (payload?: {
    clearPersonalConfig?: boolean
    reason?: string
    message?: string
    personalGithubRepo?: string
  }) => Promise<{
    ok: boolean
    pushed?: boolean
    nothingToCommit?: boolean
    clearedConfig?: boolean
    branch?: string
    personalUrl?: string
    combined?: string
    error?: string
    committed?: boolean
  }>
  workbenchGitSaveGithubSettings: (body: {
    personalGithubRepo?: string
    gitUserName?: string
    gitUserEmail?: string
    upstreamGithubRepo?: string
  }) => Promise<{ ok: boolean; error?: string }>
  claudeCodeRunChainStep?: (payload: {
    step: { agentName: string; taskId?: string; instruction: string }
  }) => Promise<{ ok: boolean; output?: string; error?: string | null }>
  getLocalWallClock: () => Promise<{ ok?: boolean; full?: string }>
  orchestrationLoadChain: () => Promise<{ ok: boolean; state?: OrchestrationState; error?: string }>
  orchestrationAdvanceChain: () => Promise<{ ok: boolean; state?: OrchestrationState; error?: string }>
  /** 写入 .claudecode/orchestration/active-chain.json，并将 currentIndex 置 0 */
  orchestrationSaveChain?: (payload: {
    state: OrchestrationState & { steps: NonNullable<OrchestrationState["steps"]> }
  }) => Promise<{ ok: boolean; path?: string | null; state?: OrchestrationState | null; error?: string | null }>
  /** 删除 active-chain.json，清空当前任务链 */
  orchestrationClearChain?: () => Promise<{ ok: boolean; error?: string | null }>
  orchestrationListChains?: () => Promise<{
    ok: boolean
    items?: SavedChainSummary[]
    activeChainId?: string | null
    error?: string | null
  }>
  orchestrationEnsureOfficialChains?: (payload: {
    items: {
      templateId: string
      name: string
      description?: string
      category?: SavedChainSummary["category"]
      steps: NonNullable<OrchestrationState["steps"]>
    }[]
  }) => Promise<{ ok: boolean; synced?: number; error?: string | null }>
  orchestrationListChainsForAgent?: (agentStem: string) => Promise<{
    ok: boolean
    items?: SavedChainSummary[]
    error?: string | null
  }>
  orchestrationGetChain?: (id: string) => Promise<{ ok: boolean; chain?: SavedChainDetail | null; error?: string | null }>
  orchestrationCreateChain?: (payload: {
    name: string
    description?: string
    category?: SavedChainSummary["category"]
    templateId?: string | null
    state: OrchestrationState & { steps: NonNullable<OrchestrationState["steps"]> }
  }) => Promise<{ ok: boolean; chain?: SavedChainDetail | null; error?: string | null }>
  orchestrationUpdateChain?: (payload: {
    id: string
    name?: string
    description?: string
    enabled?: boolean
    state?: OrchestrationState & { steps: NonNullable<OrchestrationState["steps"]> }
  }) => Promise<{ ok: boolean; chain?: SavedChainDetail | null; error?: string | null }>
  orchestrationDeleteChain?: (id: string) => Promise<{ ok: boolean; error?: string | null }>
  orchestrationActivateChain?: (id: string) => Promise<{ ok: boolean; state?: OrchestrationState | null; error?: string | null }>
  orchestrationToggleChainEnabled?: (payload: {
    id: string
    enabled: boolean
  }) => Promise<{ ok: boolean; chain?: SavedChainDetail | null; error?: string | null }>
  /** 在 Bridge 服务端后台跑链（切换页签不中断） */
  orchestrationStartChainRun?: (payload?: {
    pinnedSessionId?: string
  }) => Promise<{ ok: boolean; started?: boolean; error?: string | null }>
  orchestrationStopChainRun?: () => Promise<{ ok: boolean }>
  orchestrationGetChainRunStatus?: () => Promise<{
    ok: boolean
    running?: boolean
    stopRequested?: boolean
    pinnedSessionId?: string | null
    lastError?: string | null
    activeChainId?: string | null
  }>
  onOrchestrationChainStatus?: (fn: (detail: Record<string, unknown>) => void) => () => void
  /** delegation-v1：解析 JSON → 顺序执行子 Agent → 可选汇总（真实 Multi-Agent Runtime，非纯 prompt） */
  /** 当前嵌入的 agent-os-runtime 版本号（主进程 require） */
  agentOsRuntimeVersion?: () => Promise<{ ok: boolean; version?: string; error?: string }>
  agentOsMetaAnalyze?: () => Promise<Record<string, unknown>>
  agentOsWorkflowRun?: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>
  agentOsQualityReport?: () => Promise<{ ok?: boolean; report?: string; error?: string }>
  multiAgentExecuteDelegation?: (payload: {
    rawText?: string
    delegation?: Record<string, unknown>
    orchestratorModel?: string
  }) => Promise<{
    ok: boolean
    error?: string | null
    stepResults?: Array<{
      agentName: string
      taskId: string
      ok: boolean
      output: string
      error: string | null
    }>
    synthesis?: {
      ok: boolean
      agentName: string
      output: string
      error: string | null
    } | null
  }>
  memoryAppendEvent: (payload: Record<string, unknown>) => Promise<unknown>
  onChatSessionsChanged: (fn: (detail: Record<string, unknown>) => void) => () => void
  onChatSettingsChanged?: (fn: () => void) => () => void
  onSchedulerToast: (fn: (data: { title?: string; body?: string }) => void) => () => void
  onScheduledTasksChanged: (fn: (data: { tasks?: ScheduledTask[] }) => void) => () => void
  onAgentExecChanged: (fn: (data: { date?: string; stem?: string; status?: string }) => void) => () => void
  scheduledTasksGet: () => Promise<{ ok: boolean; tasks?: ScheduledTask[]; error?: string }>
  scheduledTasksSave: (tasks: ScheduledTask[]) => Promise<{ ok: boolean; tasks?: ScheduledTask[]; error?: string }>
  scheduledTasksRunNow: (taskId: string) => Promise<{ ok: boolean; error?: string }>
  logsReadTail: (opts: {
    maxLines?: number
    maxBytes?: number
    source?: 'app' | 'claudeEvents' | 'claudeDebugLatest' | 'claudeHistoryJsonl' | 'claudeLibraryLogs'
  }) => Promise<{ ok: boolean; content: string; lines?: number; error?: string }>
  logsOverviewSnapshot: () => Promise<{
    ok: boolean
    appHighlight?: string
    eventsHighlight?: string
    error?: string
  }>
  logsClear: () => Promise<{ ok: boolean; error?: string }>
  agentDailyReportsListDates: () => Promise<{ ok: boolean; dates?: string[]; error?: string }>
  agentDailyReportsListAgents: (date: string) => Promise<{ ok: boolean; date?: string; stems?: string[]; error?: string }>
  agentDailyReportsListAgentRegistry: (date: string) => Promise<{
    ok: boolean
    date?: string
    agents?: AgentExecRegistryEntry[]
    error?: string
  }>
  agentDailyReportsGet: (payload: {
    date: string
    stem: string
  }) => Promise<{ ok: boolean; date?: string; stem?: string; content?: string; missing?: boolean; error?: string }>
  agentDailyReportsSave: (payload: {
    date: string
    stem: string
    content: string
  }) => Promise<{ ok: boolean; date?: string; stem?: string; error?: string }>
  agentDailyReportsBuildFromEvents: (payload: {
    date: string
    stem: string
  }) => Promise<{ ok: boolean; date?: string; stem?: string; error?: string }>
  agentDailyReportsGenerate: (payload: {
    date: string
    stem: string
  }) => Promise<{ ok: boolean; date?: string; stem?: string; error?: string }>
  dailyReportsList: () => Promise<{ ok: boolean; files?: string[]; error?: string }>
  dailyReportsGet: (date: string) => Promise<{ ok: boolean; date?: string; content?: string; missing?: boolean; error?: string }>
  dailyReportsSave: (payload: { date: string; content: string }) => Promise<{ ok: boolean; date?: string; error?: string }>
  dailyReportsTemplate: () => Promise<{ ok: boolean; content?: string; error?: string }>
  claudeMemoryTodayEventsSummary: (date: string) => Promise<{
    ok: boolean
    markdown?: string
    count?: number
    error?: string
  }>
  claudeLogsBundleMarkdown: (opts: { maxLinesPerSection?: number }) => Promise<{ ok: boolean; markdown?: string; error?: string }>
  /** 按 Agent 主文件名（stem）聚合应用日志与 memory/events.jsonl 中的相关记录 */
  readAgentExecutionLog: (
    agentStem: string,
  ) => Promise<{ ok: boolean; content?: string; error?: string }>
  readClaudeAgentMarkdown: (basename: string) => Promise<{ ok: boolean; content: string | null; error: string | null }>
  readClaudeSkillMarkdown: (basename: string) => Promise<{ ok: boolean; content: string | null; error: string | null }>
  saveClaudeSkillMarkdown?: (body: {
    basename: string
    content: string
    createOnly?: boolean
  }) => Promise<{ ok: boolean; basename?: string; path?: string; error?: string }>
  /** 从 GitHub（anthropics/skills 等）下载 Skill 并写入 ~/.claude/skills/，同步 Agent frontmatter */
  syncAgentSkillsFromGithub?: (body?: {
    agentStem?: string
    agentBasename?: string
    allAgents?: boolean
    onlyMissing?: boolean
    overwrite?: boolean
  }) => Promise<{
    ok: boolean
    summary?: string
    agents?: number
    downloaded?: { stem: string; source?: string; action?: string }[]
    templated?: { stem: string; error?: string; action?: string }[]
    skipped?: { stem: string; action?: string }[]
    failed?: { stem: string; error?: string; action?: string }[]
    agentResults?: { agentStem: string; basename?: string; ok: boolean; skillStems?: string[]; tools?: string[]; error?: string }[]
    error?: string
  }>
  readClaudeDotfileMarkdown: (basename: string) => Promise<{ ok: boolean; content: string | null; error: string | null }>
  /** 扫描 ~/.claude/agents 下 .md（含 sanshengliubu 子目录中与根不重名的文件） */
  listClaudeAgentMarkdown: () => Promise<{
    ok: boolean
    items?: {
      basename: string
      source: 'root' | 'sanshengliubu'
      stem: string
      description: string
      /** 界面展示用中文名；执行仍用 stem / basename */
      displayName: string
      name?: string
      nameZh?: string
      heading?: string
      /** frontmatter `category: 项目|通用|实验` */
      category?: '项目' | '通用' | '实验'
      /** frontmatter `skills:` 关联的 Skill 文件 stem */
      skills?: string[]
    }[]
    error?: string | null
  }>
  /** 在访达/资源管理器中打开 ~/.claude/agents 或 ~/.claude/skills（不存在则创建目录） */
  openClaudeUserSubdir: (
    which: 'agents' | 'skills',
  ) => Promise<{ ok: boolean; path?: string; error?: string }>
  /** 在 ~/.claude/agents 新建 Agent Markdown（stem 不含 .md；空串则自动生成文件名） */
  createClaudeAgentMarkdown: (
    stem?: string,
  ) => Promise<{
    ok: boolean
    stem?: string
    basename?: string
    fullPath?: string
    error?: string
  }>
  saveClaudeAgentMarkdown?: (body: {
    basename: string
    content: string
    createOnly?: boolean
  }) => Promise<{ ok: boolean; basename?: string; path?: string; error?: string }>
  /** 用系统默认应用打开 ~/.claude/agents 下的 .md */
  openClaudeAgentMarkdownFile: (
    basename: string,
  ) => Promise<{ ok: boolean; error?: string }>
  /** 扫描 ~/.claude/skills 与工作区 .claude/skills 下平铺 .md */
  listClaudeSkillMarkdown: () => Promise<{
    ok: boolean
    items?: {
      basename: string
      source: 'user' | 'project'
      stem: string
      description: string
      displayName: string
      name?: string
      nameZh?: string
      heading?: string
      category?: '项目' | '通用' | '实验'
    }[]
    error?: string | null
  }>
  /** 读取 ~/.claude/mcp.json 或 settings.json（标准 JSON） */
  readClaudeConfigJson: (
    name: 'mcp.json' | 'settings.json',
  ) => Promise<{
    ok: boolean
    data?: unknown
    raw?: string | null
    missing?: boolean
    path?: string
    repaired?: boolean
    repairs?: string[]
    homeDir?: string
    error?: string | null
  }>
  /** Bridge 内置 MCP 预设的实际启动命令（如 sanshengliubu） */
  bundledMcpCommandLines?: () => Promise<{ ok: boolean; lines?: Record<string, string>; error?: string | null }>
  /** 写入/更新 mcpServers 条目（遵循设置中的 MCP 配置文件路径） */
  upsertClaudeMcpServer: (payload: {
    name: string
    transport?: 'stdio' | 'http' | 'sse'
    command?: string
    args?: string[]
    url?: string
  }) => Promise<{ ok: boolean; path?: string; name?: string; error?: string | null }>
  removeClaudeMcpServer: (name: string) => Promise<{ ok: boolean; path?: string; error?: string | null }>
  setClaudeMcpServerEnabled: (payload: {
    name: string
    enabled: boolean
  }) => Promise<{ ok: boolean; path?: string; name?: string; enabled?: boolean; error?: string | null }>
  getOpenclawGatewayToken: () => Promise<{
    ok: boolean
    token?: string
    error?: string | null
  }>
  logout: () => Promise<{ ok: boolean; cleared?: string[]; error?: string | null }>
}

declare global {
  interface Window {
    desktop?: DesktopApi
  }
}

export {}
