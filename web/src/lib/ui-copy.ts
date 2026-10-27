/** 面向用户的界面文案 */

export const APP_NAME = "Claude Orchestrator";

export const BRIDGE_OFFLINE_BANNER =
  "无法连接本机服务。请确认 Claude Orchestrator 已启动，然后刷新页面。";

export const BRIDGE_OFFLINE_LEGACY = "本机服务未连接。请完成连接配置后刷新页面。";

export const BRIDGE_OFFLINE_TOAST = "未连接本机服务，请启动应用后重试";

export const BRIDGE_CONNECTED_VERSION = "已连接";

export const BRIDGE_OFFLINE_VERSION = "未连接";

export const BRIDGE_ELECTRON_VERSION = "桌面版";

/** @deprecated 请改用 BRIDGE_OFFLINE_TOAST */
export const MSG_BRIDGE_OFFLINE = BRIDGE_OFFLINE_TOAST;

export const MSG_API_NOT_READY = "功能暂不可用，请重启 Claude Orchestrator 后刷新页面。";

export const MSG_API_OUTDATED = "应用版本过旧，请重启 Claude Orchestrator 后再试。";

export const MSG_MODEL_SETTINGS = "请在「设置 → 模型配置」中检查 API 地址、密钥与模型 ID。";

export const LOCAL_ONLY_HINT = "需连接本机服务后可用";

/** 列表空态：无本机能力时不引导「点击添加」 */
export const EMPTY_STATE_OFFLINE = LOCAL_ONLY_HINT;

/** @deprecated 已支持 frontmatter 写盘；保留兼容旧断言 */
export const ENABLE_TOGGLE_NOT_PERSISTED = "启用状态暂无法保存";

/** 目录内条目 */
export const DISK_ENTRY_PRESENT = "目录内";

export const AGENT_DISABLED = "该智能体已停用";
export const SKILL_DISABLED = "该 Skill 已停用";
export const ENABLE_TOGGLE_BUSY = "正在保存启用状态…";

/** 用户偏好加载失败时的默认可行动文案 */
export const USER_PREFS_LOAD_FAILED = "无法加载用户偏好，请重试";

export const AGENTS_DISK_SYNC_HINT = "已与 Claude Code Agent 目录同步。";

export const SKILLS_DISK_SYNC_HINT = "已与 Claude Code Skill 目录同步。";

/** 页头副文案：默认空（禁冗余描述）；设置 basic 保留最短上下文 */
export const PAGE_DESC = {
  overview: "",
  agents: "",
  skills: "",
  chains: "",
  comms: "",
  workspaces: "",
  logs: "",
  reports: "",
  scheduled: "",
  help: "",
  settings: {
    basic: "",
    advanced: "",
  },
} as const;

/** 设置 → 高级「编排与运维」入口分组（列表导航，非页内页签） */
export type SettingsOpsGroup = "环境" | "编排" | "运维" | "实验";

/** 设置 → 高级：编码相关管理（侧栏已降权） */
export const SETTINGS_ADVANCED_LINKS = [
  { to: "/workspaces", label: "工作目录", group: "环境" },
  { to: "/overview", label: "概览", group: "环境" },
  { to: "/agents", label: "角色", group: "编排" },
  { to: "/skills", label: "Skill", group: "编排" },
  { to: "/chains", label: "任务链", group: "编排" },
  { to: "/comms", label: "MCP 服务器", group: "运维" },
  { to: "/logs", label: "日志", group: "运维" },
] as const satisfies ReadonlyArray<{
  to: string;
  label: string;
  group: SettingsOpsGroup;
}>;

/** 设置 → 高级 → 实验：非编码主路径，默认不宣传 */
export const SETTINGS_EXPERIMENTAL_LINKS = [
  { to: "/scheduled", label: "定时任务", group: "实验" },
  { to: "/reports", label: "执行日报", group: "实验" },
] as const satisfies ReadonlyArray<{
  to: string;
  label: string;
  group: SettingsOpsGroup;
}>;

export const GIT_PUSH_HINT = "推送后直接更新远程。";

export const GIT_PUSH_HINT_DETAIL =
  "同步 Agent、Skill、任务链与 MCP 到个人 GitHub。聊天、日志与工作区文件不上传。";

export const GIT_DEPLOY_HINT = "从 GitHub 取回编排配置写入本机。";

export const GIT_PUSH_REASON_LABEL = "本次变更";

export const GIT_PUSH_REASON_PLACEHOLDER = "简要说明本次变更内容";

export const GIT_PUSH_REASON_REQUIRED = "请填写变更说明后再提交。";

export const CHAINS_INFO_HINT = "";

export const MCP_INFO_HINT = "";

export const MCP_EMPTY_BANNER = "尚未配置 MCP 服务器。";

export const REPORTS_INFO_HINT = "";

export const OVERVIEW_INFO_HINT = "";

export const AGENTS_EDITOR_HINT = "";

export const SKILLS_EDITOR_HINT = "";

export const USAGE_SECTION_DESC = "";

export const TODAY_KPIS_DESC = "";

export const HELP_SECTION_DESC = {
  guide: "",
  external: "",
  shortcuts: "",
  about: "",
} as const;

export const WORKSPACE_HISTORY_HINT = "";

export const WORKSPACE_API_MISSING = "未连接本机服务。请启动 Claude Orchestrator 后刷新页面。";

export const CHOOSE_WORKSPACE_OFFLINE_TITLE = "无法连接本机服务";

export const CHOOSE_WORKSPACE_OFFLINE_DESC = "请启动 Claude Orchestrator 后刷新页面。";

export const COMPOSER_PLACEHOLDER = "Plan, Build, Agent…  / 技能  @ 上下文";

/** 长会话默认只渲染最近若干轮；其余折叠 */
export const CHAT_VISIBLE_TURN_CAP = 8;
export const CHAT_SHOW_EARLIER_TURNS = (hidden: number) =>
  hidden <= 0 ? "" : `显示更早的 ${hidden} 轮`;

/** Ask + 方案言语：Composer 一句诚实提示（不堆百科） */
export const COMPOSER_ASK_PLAN_HINT = "切 Plan/Agent 才会写入方案文件";

/** Ask 下点 Build（对齐 Cursor：Ask 不执行方案） */
export const PLAN_BUILD_ASK_BLOCKED = "请先切到 Plan 或 Agent";

/** 方案文档旁主按钮（Cursor 文案 Build） */
export const PLAN_BUILD_BUTTON = "Build";

export const BROWSER_MODE_CHAT_MESSAGE = "请在 Claude Orchestrator 桌面应用中打开。";

export const WORKSPACE_PANEL_OFFLINE = "未连接本机服务，无法浏览项目文件。";

export const WORKSPACE_TREE_OFFLINE = "未连接本机服务，无法加载文件树。";

export const TERMINAL_OFFLINE = "未连接本机服务，无法使用终端。请启动后重试。";

export const GIT_STATUS_OFFLINE = "未连接本机服务，无法查看 Git 状态。";

export const GIT_DIFF_OFFLINE = "未连接本机服务，无法查看变更差异。";

export const WORKBENCH_SIDEPANEL_OFFLINE = "请连接本机服务并选择工作目录。";

/** hydration / 桥接垫片注入中：禁止用离线文案冒充（对齐 Cursor「连接中」） */
export const DESKTOP_HYDRATING = "连接中…";

/** 发送钮在桥接注入完成前的提示 */
export const COMPOSER_SEND_CONNECTING = "连接中，就绪后自动发送";

/**
 * 列表 / 文件 / 配置等数据拉取中（桥已就绪）。
 * 与 DESKTOP_HYDRATING「连接中…」语义分离：勿混用。
 */
export const CONTENT_LOADING = "加载中…";

/** 会话从磁盘/上下文恢复时消息区占位 */
export const CHAT_SESSIONS_RESTORING = "正在恢复对话…";

/** /summarize 对话过短无法压缩 */
export const CHAT_SUMMARIZE_TOO_SHORT = "对话还不够长，暂无需压缩。";

/** Composer 上下文占用芯片 title（短） */
export const CHAT_CONTEXT_USAGE_TITLE = (
  percent: number,
  suggest: boolean,
  source?: "usage" | "estimate",
  windowKind?: "local" | "cloud",
  windowSource?: "catalog" | "fallback",
  channelSwitched?: boolean,
  /** 与芯片一致：低于此值显示 `<N` */
  minPercent?: number,
) => {
  // 字符粗估 或 窗口用了默认值 → 都标「约」
  const approx = source === "estimate" || windowSource === "fallback" ? "约 " : "";
  const win = windowKind === "local" ? "本窗" : windowKind === "cloud" ? "云窗" : "上下文";
  const winNote = windowSource === "fallback" ? "（估算窗口）" : "";
  const switchNote = channelSwitched ? " · 已切换通道窗口" : "";
  const min = typeof minPercent === "number" && minPercent > 0 ? minPercent : 0;
  const pctLabel =
    min > 0 && percent < min ? `<${min}` : String(Math.max(0, Math.round(percent)));
  const base = suggest
    ? `${win}${approx}${pctLabel}%${winNote} · 建议 /summarize`
    : `${win}${approx}${pctLabel}%${winNote}`;
  return `${base}${switchNote}`;
};

/**
 * CLI 长会话：只提示，不自动清 session / 不截断云端上下文。
 * /summarize 时才会主动结束旧 CLI session，使压缩生效。
 */
export const CHAT_CLI_CONTEXT_HINT =
  "上下文较满。可发 /summarize（将开新云端会话以生效）或新开对话。";

/** /summarize 时若曾绑定 Claude CLI session */
export const CHAT_SUMMARIZE_CLI_SESSION_RESET =
  "已结束旧的云端会话，后续按压缩后的摘要继续。";

/** RPC 被用户离开页面或主动取消 */
export const RPC_REQUEST_CANCELLED = "请求已取消";

/** 桥接仍健康但请求中断（如切页） */
export const RPC_REQUEST_INTERRUPTED = "请求已中断，请重试";

/** 本机 Agent 目录为空（已同步，非筛选无结果） */
export const AGENTS_EMPTY_DISK = "本机暂无智能体";

export const SKILLS_EMPTY_DISK = "暂无技能。";

export const MCP_EMPTY_ACTION_HINT = "点击添加或使用常用模板";

export const CHAINS_EMPTY_ACTION_HINT = "调整筛选条件，或添加自定义任务链";

export const SCHEDULED_EMPTY_OFFLINE = EMPTY_STATE_OFFLINE;

export const SCHEDULED_EMPTY_ACTION = "暂无任务，点击「添加任务」创建。";

export const OPENCLAW_TOKEN_UNAVAILABLE = "当前模式不支持读取 OpenClaw 令牌。";

export const OPENCLAW_TOKEN_PLACEHOLDER = "可选";

export const PREVIEW_BUTTON = "预览项目";

export const PREVIEW_STARTING = "启动中…";

export const PREVIEW_FILE_HINT = "点击文件查看内容，网页文件可实时预览。";

export const PROJECT_PREVIEW_UNSUPPORTED = "项目预览暂不可用，请重启 Claude Orchestrator 后重试。";

export const PROJECT_PREVIEW_API_MISSING = "预览接口未就绪，请重启 Claude Orchestrator 后再试。";

export const PROJECT_PREVIEW_STOP_UNSUPPORTED = "无法通过界面停止预览，请在本机终端结束相关进程。";

export const REPORTS_API_OFFLINE = "日报需本机服务支持，请重启应用后重试。";

export const SCHEDULED_OFFLINE = "未连接本机服务，定时任务不会自动执行。";

export const WORKSPACE_HISTORY_API_OFFLINE =
  "无法读取项目历史记录，请重启 Claude Orchestrator 后刷新页面。";

export const WORKSPACE_BROWSE_HINT = "点击「浏览」选择 AI 工作目录。";

/** 用户可见的连接失败句（不夹带 Failed to fetch / 命令行）。 */
export const RPC_CONNECTION_ERROR = (_detail?: string) =>
  "无法连接本机服务。请确认应用已启动后重试。";

export const RPC_CONNECTION_TIMEOUT_HINT = "长时间无响应时，可缩短对话后再试，或重启应用。";
