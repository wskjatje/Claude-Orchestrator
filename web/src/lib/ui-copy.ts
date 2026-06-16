/** 面向用户的界面文案（统一语气，避免开发/设计过程描述） */

export const APP_NAME = "Claude Orchestrator";

export const BRIDGE_OFFLINE_BANNER =
  "无法连接本机服务。请确认 Claude Orchestrator 已启动，然后刷新页面。";

export const BRIDGE_OFFLINE_LEGACY =
  "本机服务未连接。请完成连接配置后刷新页面。";

export const BRIDGE_OFFLINE_TOAST = "未连接本机服务，请启动应用后重试";

export const BRIDGE_RESTART_TOAST = "连接异常，请重启 Claude Orchestrator 后重试";

export const BRIDGE_CONNECTED_SIDEBAR = "本机服务已连接";

export const BRIDGE_CONNECTING_SIDEBAR = "正在连接…";

/** Bridge 健康检查返回的简短状态（勿再拼接「Claude Code ·」前缀） */
export const BRIDGE_CONNECTED_VERSION = "已连接";

export const BRIDGE_OFFLINE_VERSION = "未连接";

export const BRIDGE_ELECTRON_VERSION = "桌面版";

export const HELP_DOCS_EXTERNAL_URL = "https://code.claude.com/docs";

/** @deprecated 请改用 BRIDGE_OFFLINE_TOAST */
export const MSG_BRIDGE_OFFLINE = BRIDGE_OFFLINE_TOAST;

export const MSG_API_NOT_READY = "功能暂不可用，请重启 Claude Orchestrator 后刷新页面。";

export const MSG_API_OUTDATED = "应用版本过旧，请重启 Claude Orchestrator 后再试。";

export const MSG_FEATURE_REQUIRES_CONNECTION = "请先连接本机服务。";

export const MSG_MODEL_SETTINGS = "请在「设置 → 模型与连接」检查 API 地址、Key 与模型 ID。";

export const LOCAL_ONLY_HINT = "需连接本机服务后可用";

export const DEMO_LIST_BANNER = "示例数据。连接本机后点「刷新」加载。";

export const AGENTS_DISK_SYNC_HINT = "已与 Claude Code Agent 目录同步。";

export const AGENTS_DEMO_HINT = "示例列表。连接本机后点「刷新」加载。";

/** 各页 PageHeader 副标题 */
export const PAGE_DESC = {
  overview: "连接、用量与运行概况",
  agents: "管理本机 Agent",
  skills: "管理本机 Skill",
  chains: "多步任务流水线",
  comms: "MCP 工具配置",
  workspaces: "选择 AI 读写代码的根目录",
  logs: "运行日志与追踪",
  reports: "Agent 执行日报",
  scheduled: "定时自动任务",
  help: "文档、快捷键与关于",
  settings: {
    general: "聊天与通用偏好",
    models: "云模型与本地 Ollama",
    advanced: "GitHub 同步",
  },
} as const;

export const SETTINGS_TAB_HINT = {
  general: "配置默认落盘路径；工作区在侧栏修改。",
  models: "添加云模型或本地 Ollama，与聊天页同步。",
  advanced: "与 GitHub 同步编排资产。",
} as const;

export const GIT_PUSH_HINT = "推送：本机内容上传到 GitHub，会直接更新远程。";

export const GIT_PUSH_HINT_DETAIL =
  "无需先拉取。上方说明可选，留空也会推送；会一并同步 Agent、Skill、任务链与 MCP 配置。";

export const GIT_DEPLOY_HINT = "部署到本地：从 GitHub 取回编排配置并写入本机。";

export const GIT_PUSH_REASON_LABEL = "本次变更（可选）";

export const GIT_PUSH_REASON_PLACEHOLDER = "可写这次改了什么；留空也能推送";

export const CHAINS_INFO_HINT = "官方链已内置；对话中用 /chain 调用。";

export const MCP_INFO_HINT = "配置保存在本机；详情内可健康检查。";

export const MCP_EMPTY_BANNER = "尚未配置 MCP。点「添加」选择模板。";

export const REPORTS_INFO_HINT = "Agent 与任务链执行会自动写入日报。";

export const OVERVIEW_INFO_HINT = "工作区 → 侧栏；模型 → 设置；MCP → MCP 页。";

export const AGENTS_EDITOR_HINT = "右侧编辑；「工作流优化」可生成修订稿。";

export const SKILLS_EDITOR_HINT = "本机目录扫描；编辑对应文件即可。";

export const SCHEDULED_BANNER_ONLINE = "每 30 秒检查；开关即时保存。";

export const MODELS_PANEL_FOOTER = "与聊天页模型下拉同步；使用中的不可删。";

export const MODELS_EMPTY_HINT = "尚未添加云模型。点「添加云模型」开始配置。";

export const USAGE_SECTION_DESC = "云端与本地用量汇总。";

export const TODAY_KPIS_DESC = "今日关键指标。";

export const CONFIRM_WRITE_SECTION_HINT = "回复无落盘块时写入此路径。";

export const CONFIRM_WRITE_FOOTER = "部分角色需在聊天中确认后再写入。";

export const HELP_SECTION_DESC = {
  guide: "Agent、Skill、任务链与 MCP",
  external: "官方文档与社区",
  shortcuts: "macOS（Windows 用 Ctrl）",
  about: "版本与反馈",
} as const;

export const NO_DISK_AGENTS = "请先连接本机并刷新智能体列表。";

export const SETTINGS_SAVED_LOCAL = "设置保存在本机，不会同步到云端。";

export const SETTINGS_SAVED_PROJECT =
  "设置保存在当前项目中，不会同步到云端。";

export const WORKSPACE_PICK_HINT = "选择 AI 读写代码的项目根目录。";

export const WORKSPACE_HISTORY_HINT = "记录最近打开的项目文件夹。";

export const WORKSPACE_API_MISSING =
  "未连接本机服务。请启动 Claude Orchestrator 并刷新本页。";

export const CHOOSE_WORKSPACE_OFFLINE_TITLE = "无法连接本机服务";

export const CHOOSE_WORKSPACE_OFFLINE_DESC =
  "请启动 Claude Orchestrator 并刷新页面。";

export const COMPOSER_PLACEHOLDER =
  "输入内容，@ 引用文件，/ 使用命令";

export const BROWSER_MODE_CHAT_MESSAGE =
  "请使用 Claude Orchestrator 桌面窗口打开，以使用完整聊天、工作区与对话记录。";

export const WORKSPACE_PANEL_OFFLINE =
  "未连接本机时无法浏览项目文件。请先连接服务并在「工作目录」中选择项目。";

export const WORKSPACE_TREE_OFFLINE = "未连接本机时无法加载文件树。";

export const TERMINAL_OFFLINE =
  "未连接本机时无法打开终端。请启动 Claude Orchestrator 后重试。";

export const GIT_STATUS_OFFLINE =
  "未连接本机时无法查看 Git 状态。请使用桌面版或连接本机服务。";

export const GIT_DIFF_OFFLINE =
  "未连接本机时无法查看改动差异。请使用桌面版或连接本机服务。";

export const WORKBENCH_SIDEPANEL_OFFLINE = "请连接本机服务并选择工作目录。";

export const OPENCLAW_TOKEN_UNAVAILABLE = "当前模式下无法读取 OpenClaw 令牌。";

export const OPENCLAW_TOKEN_PLACEHOLDER = "可选填写";

export const PREVIEW_BUTTON = "预览项目";

export const PREVIEW_STARTING = "启动中…";

export const PREVIEW_FILE_HINT = "点击文件可查看内容；网页文件可一键预览。";

export const PROJECT_PREVIEW_UNSUPPORTED =
  "项目预览功能暂不可用，请重启 Claude Orchestrator 后重试。";

export const PROJECT_PREVIEW_API_MISSING =
  "预览接口未就绪，请重启 Claude Orchestrator 后再试。";

export const PROJECT_PREVIEW_STOP_UNSUPPORTED = "当前无法停止预览，请在本机终端结束相关进程。";

export const REPORTS_API_OFFLINE = "日报功能需要本机服务，请重启应用后重试。";

export const SCHEDULED_OFFLINE =
  "未连接本机：定时任务不会在本地自动执行。";

export const WORKSPACE_HISTORY_API_OFFLINE =
  "无法读取打开记录，请重启 Claude Orchestrator 后刷新本页。";

export const WORKSPACE_BROWSE_HINT =
  "点击「浏览目录」可在本机选择项目文件夹。";

export const RPC_CONNECTION_ERROR = (detail: string) =>
  `无法连接本机服务：${detail}。请确认 Claude Orchestrator 已启动。`;

export const RPC_CONNECTION_TIMEOUT_HINT =
  "若长时间无响应，可尝试缩短对话上下文或重启应用。";
