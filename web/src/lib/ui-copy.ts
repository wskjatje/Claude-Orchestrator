/** 面向用户的界面文案 */

export const APP_NAME = "Claude Orchestrator";

export const BRIDGE_OFFLINE_BANNER =
  "无法连接本机服务。请确认 Claude Orchestrator 已启动，然后刷新页面。";

export const BRIDGE_OFFLINE_LEGACY =
  "本机服务未连接。请完成连接配置后刷新页面。";

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

export const DEMO_LIST_BANNER = "示例数据，连接本机服务后刷新加载。";

export const AGENTS_DISK_SYNC_HINT = "已与 Claude Code Agent 目录同步。";

export const AGENTS_DEMO_HINT = "示例数据，连接本机服务后刷新加载。";

export const PAGE_DESC = {
  overview: "工作区用量与运行时概览",
  agents: "配置与管理 Agent 编排",
  skills: "Skill 能力管理",
  chains: "多步任务流水线编排",
  comms: "MCP 协议工具连接管理",
  workspaces: "设定 AI 可访问的项目目录",
  logs: "运行时日志流水",
  reports: "Agent 与任务链执行日报",
  scheduled: "定时任务配置",
  help: "文档指引、快捷键与版本信息",
  settings: {
    basic: "管理运行环境：模型供应商、本地 Ollama 与项目概览",
    advanced: "Git 同步编排资产、管理提交分支、检查部署环境",
  },
} as const;

export const GIT_PUSH_HINT = "推送后直接更新远程。";

export const GIT_PUSH_HINT_DETAIL =
  "同步 Agent、Skill、任务链与 MCP 到个人 GitHub。聊天、日志与工作区文件不上传。";

export const GIT_DEPLOY_HINT = "从 GitHub 取回编排配置写入本机。";

export const GIT_PUSH_REASON_LABEL = "本次变更";

export const GIT_PUSH_REASON_PLACEHOLDER = "简要说明本次变更内容";

export const GIT_PUSH_REASON_REQUIRED = "请填写变更说明后再提交。";

export const CHAINS_INFO_HINT = "官方链已内置，对话中可用 /chain 调用。";

export const MCP_INFO_HINT = "配置存储在本机，可在详情中执行健康检查。";

export const MCP_EMPTY_BANNER = "尚未配置 MCP 服务器，点击「添加」从模板开始。";

export const REPORTS_INFO_HINT = "Agent 与任务链执行记录自动汇总为日报。";

export const OVERVIEW_INFO_HINT = "工作目录切换、模型配置与 MCP 管理分别在侧栏与设置页。";

export const AGENTS_EDITOR_HINT = "右侧编辑 Agent 定义，支持工作流优化生成建议。";

export const SKILLS_EDITOR_HINT = "编辑对应源文件以调整 Skill 定义。";

export const USAGE_SECTION_DESC = "用量统计。";

export const TODAY_KPIS_DESC = "今日关键指标。";

export const HELP_SECTION_DESC = {
  guide: "Agent、Skill、任务链与 MCP 快速上手指南",
  external: "官方文档与社区资源",
  shortcuts: "快捷键（macOS，Windows 使用 Ctrl）",
  about: "版本信息与反馈",
} as const;


export const WORKSPACE_HISTORY_HINT = "最近使用的项目文件夹。";

export const WORKSPACE_API_MISSING =
  "未连接本机服务。请启动 Claude Orchestrator 后刷新页面。";

export const CHOOSE_WORKSPACE_OFFLINE_TITLE = "无法连接本机服务";

export const CHOOSE_WORKSPACE_OFFLINE_DESC =
  "请启动 Claude Orchestrator 后刷新页面。";

export const COMPOSER_PLACEHOLDER =
  "输入指令，@ 引用文件，/ 触发命令";

export const BROWSER_MODE_CHAT_MESSAGE =
  "请在 Claude Orchestrator 桌面应用中打开。";

export const WORKSPACE_PANEL_OFFLINE =
  "未连接本机服务，无法浏览项目文件。";

export const WORKSPACE_TREE_OFFLINE = "未连接本机服务，无法加载文件树。";

export const TERMINAL_OFFLINE =
  "未连接本机服务，无法使用终端。请启动后重试。";

export const GIT_STATUS_OFFLINE =
  "未连接本机服务，无法查看 Git 状态。";

export const GIT_DIFF_OFFLINE =
  "未连接本机服务，无法查看变更差异。";

export const WORKBENCH_SIDEPANEL_OFFLINE = "请连接本机服务并选择工作目录。";

export const OPENCLAW_TOKEN_UNAVAILABLE = "当前模式不支持读取 OpenClaw 令牌。";

export const OPENCLAW_TOKEN_PLACEHOLDER = "可选";

export const PREVIEW_BUTTON = "预览项目";

export const PREVIEW_STARTING = "启动中…";

export const PREVIEW_FILE_HINT = "点击文件查看内容，网页文件可实时预览。";

export const PROJECT_PREVIEW_UNSUPPORTED =
  "项目预览暂不可用，请重启 Claude Orchestrator 后重试。";

export const PROJECT_PREVIEW_API_MISSING =
  "预览接口未就绪，请重启 Claude Orchestrator 后再试。";

export const PROJECT_PREVIEW_STOP_UNSUPPORTED = "无法通过界面停止预览，请在本机终端结束相关进程。";

export const REPORTS_API_OFFLINE = "日报需本机服务支持，请重启应用后重试。";

export const SCHEDULED_OFFLINE =
  "未连接本机服务，定时任务不会自动执行。";

export const WORKSPACE_HISTORY_API_OFFLINE =
  "无法读取项目历史记录，请重启 Claude Orchestrator 后刷新页面。";

export const WORKSPACE_BROWSE_HINT =
  "点击「浏览」选择 AI 工作目录。";

export const RPC_CONNECTION_ERROR = (detail: string) =>
  `无法连接本机服务：${detail}。请确认 Claude Orchestrator 已启动。`;

export const RPC_CONNECTION_TIMEOUT_HINT =
  "长时间无响应时，可尝试缩短对话上下文或重启应用。";
