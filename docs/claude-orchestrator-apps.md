# Claude Orchestrator · 前端实现说明

本机优先的 **编码 Agent** Web 前端：React + TanStack Router，Electron 桌面壳，经 Bridge 连接 Claude Code CLI 与本机数据。主任务是工作台里写代码；Agent / Skill / 任务链等管理页降权到「设置 → 高级」。

**技术栈**：React 19 · TanStack Router · Vite · Tailwind · shadcn/ui · react-resizable-panels · Electron

> 推送到个人 GitHub 时自动更新；内容与侧栏导航及当前 Web 实现一致。

## 整体 UI

- 顶栏：品牌、主题切换（无全局搜索；⌘/Ctrl+K 为编辑器 Inline Edit）
- 侧栏（默认）：聊天 · 应用设置 · 帮助；连接状态在侧栏底部
- 聊天页：可拖拽三栏工作台（文件 · 编辑预览 · 对话）
- 编排/运维页：保留路由，从「设置 → 高级」进入；定时任务 / 执行日报归入「实验」

## 页面与功能

### 工作区

#### 聊天 · 工作台 `/`

> 三栏主界面（产品主入口）

左侧资源面板、中间编辑/预览、右侧 Claude 对话。

**已实现界面：**

- 左栏：文件树、Git；工作目录入口在资源管理器与设置
- 中栏：多文件编辑与预览
- 右栏：会话与流式对话（**默认 Agent**：CLI `--permission-mode acceptEdits`，Edit/Write 直接落盘；**禁止征求「要不要落盘」**，若模型停问则强制续写一轮）
- 气泡密度：过程轨迹持久化为 `agentTurn.streamEvents`（成功回合不压缩替换）；`Explored N tools` 可展开；`Edit`/`Bash` 顶层；Agent 写盘后轻量 Edit 行（点开中栏 Diff）；收尾短自然语言
- **Ask**：只读；**Plan**：需 Accept 才落盘；**Agent**：默认可写盘
- 中栏：**Diff Review**（Manual 待审；Agent 写盘后默认聚合已写入；支持按 hunk 接受）；**⌘/Ctrl+K Inline Edit**；幽灵文本 / LS 补全；符号跳转 / Lint
- 底栏 Composer：Agent / Ask / Plan（Shift+Tab 切换）；`@selection` `@git` `@codebase[:query]` `@rule:path` 真实展开；项目规则注入 prompt
- 任务链：Agent 模式下围栏自动落盘（模式写入 `.claudecode/interaction-mode.json`）

#### IDE 能力矩阵

| 能力 | 状态 | 说明 |
|------|------|------|
| 幽灵文本续写 | 已实现 | 停顿请求模型；注释/字符串抑制；`ghostTextEnabled` / `completionMode` |
| TS/JS 补全 | 已实现 | Language Service 主源；AI 仅显式触发 |
| 定义 / 悬停 / 签名 | 已实现 | F12；悬停含 signature help；Alt+F12 类型、⌘F12 实现 |
| 引用 / 重命名 | 已实现 | Shift+F12 / F2 走 LS；底栏 Peek；跨文件打开定位 |
| 诊断 | 已实现 | ESLint + 与 LS 共用 TypeScript diagnostics（LRU） |
| 项目规则 | 已实现 | `.cursor/rules` 热更新；`alwaysApply` / `globs`；排除 AGENTS/CLAUDE 双重注入 |
| `@codebase` | 已实现 | **结构索引（graph.json，`file_type=code` 加权）+ 语义索引 + ripgrep**；缺图/陈旧显式报错；写盘节流 `graphify update`；Composer 图谱芯片可重建 |
| 本地语义索引 | 已实现 | BM25 + Ollama embeddings hybrid；`codeIndexEnsureHybrid` 可启动 Ollama/拉模型/重建；写盘后 `updateCodeIndexForFiles` 增量 |
| Claude CLI 自愈 | 已实现 | 失效路径清空；`ensureCli` npm 安装；Bridge 启动探测；**Agent 发送前再 ensureCli 一次**再回落 Host |
| Host Agent 工具环 | 已实现 | search/read/**search_replace**/write/**run_command/run_tests/get_diagnostics/git_status**；探索禁裸 grep；气泡（工具行/`Explored N`/Edit 行 + 短自然语言，无四行模板）；写盘默认开聚合 Diff Review；无 tool_calls 强制续轮；`host-agent:abort` |
| `@problems` / 打开文件上下文 | 已实现 | Ask/Agent/Manual 自动注入 Problems + 打开文件列表；`@problems` 仍可显式展开 |
| Diff Review | 已实现 | Manual 待审；Agent 写盘后默认中栏「已写入」聚合 Diff（不抢开首文件）+ SCM |
| 跨文件 Rename | 已实现 | F2 后 Peek 勾选批写；同文件即时改 |
| Organize Imports | 已实现 | `Shift+Alt+O`（TS/JS Language Service） |
| Quick Fix | 已实现 | `Alt+.` / `⌘.`；可跨文件写盘 |
| Agent 瞬态重试 | 已实现 | timeout / 限流 / 网络失败退避重试（对齐链步骤） |
| 多语言 LSP | Python/Go/Rust | 崩溃自动重启；状态栏显示缺命令/运行中/错误 |

> **诚实差距**：无 VS Code 扩展生态与 Background Agent；终端为受控非交互命令子集（非完整 PTY 进环）。语义索引依赖本机 Ollama 嵌入。Agent 发送链：**ensureCli → CLI → Host（云端无 tools 则回落 Ollama）**；若已启用需 MCP 的服务器（不含自动三省六部），CLI/本地编排失败则**硬失败**，禁止 Host/cloudDirect 静默兜底。失败只显示真实 error、**不产生待应用 Diff**；禁止无工具证据冒充已改盘/已开应用。

#### 工作目录 `/workspaces`

> 工作区选择（高级入口；也可从设置卡片进入）

选择 AI 读写代码的项目根目录，并管理最近打开记录。

**已实现界面：**

- 浏览目录选取项目根路径
- 打开记录列表，一键切回历史工作区
- 清除当前工作区与历史记录

### 运行（高级）

#### 概览 `/overview`

> 连接与用量仪表盘（设置 → 高级）

展示本机 Bridge 状态、今日 KPI 与用量统计。

**已实现界面：**

- 本机服务条：在线状态、Bridge 地址、重连、claude doctor、高级连接配置
- 结构索引图谱卡（graphify）；节点状态图折叠在页底「实验」
- 运行概况 KPI：今日消息、会话数、云端费用、当前模型、定时任务
- 用量统计：按今天/7天/30天切换；云端费用、Token、本地 Ollama 轮次等

#### 定时任务 `/scheduled`（实验）

> 本机 cron 式调度；设置 → 高级 → 实验

列表 + 详情双栏，管理定时触发的 Agent 或 shell 任务。

**已实现界面：**

- 任务列表搜索、启用开关即时保存
- 每 30 秒检查一次调度
- 新建/编辑 cron 表达式与执行命令

#### 日志 `/logs`

> 运行日志查看

工作台 app.log、Claude CLI 日志与追踪文件。

**已实现界面：**

- Tab 切换：工作台 / Claude / 追踪
- 倒序滚动、刷新与清空
- Claude 多源日志选择（events / debug / history）

#### 智能体执行日报 `/reports`（实验）

> Agent 执行沉淀；设置 → 高级 → 实验

按 Agent × 日期浏览 Markdown 日报，支持项目汇总视图。

**已实现界面：**

- 按智能体 / 项目汇总 Tab
- 日期导航、Markdown 预览与复制
- 与聊天 /agent、任务链执行自动关联

### 编排（高级 · 设置入口）

#### Agent `/agents`

> 本机 Agent 管理

卡片网格浏览 ~/.claude/agents，右侧编辑配置与 Markdown 正文。

**已实现界面：**

- 搜索 + 分类筛选（全部 / 项目 / 通用 / 实验）
- 统计：总计、启用数、项目 Agent 数
- 同步 Skill 与工具、从本机刷新、Finder 打开目录
- 新建 Agent、启用开关、工作流优化生成修订稿
- 推送时导出至 docs/agents/

#### Skill `/skills`

> 本机 Skill 库

卡片网格展示 ~/.claude/skills，按类别筛选与启用管理。

**已实现界面：**

- 统计：总计、已启用、本周调用、缺少依赖
- 分类：工程 / 写作 / 集成 / 分析 / 媒体 / 本机
- 卡片展示描述、调用次数与启用状态
- 推送时导出至 docs/skills/

#### 任务链 `/chains`

> 多步 Agent 流水线

官方通用链 + 自定义链 + WBS 工作区链统一管理。

**已实现界面：**

- 统计：任务链数、已启用、执行中
- 筛选：全部 / 单 Agent / 流水线 / 自定义
- 卡片：步骤摘要、进度条、待执行/已完成/执行中状态
- WBS 文档链自动发现与优先展示
- 添加/编辑/启用/执行/重置；对话 /chain 调用
- 推送时导出至 docs/chains/（idle 状态）

### 集成

#### MCP 服务器 `/comms`

> MCP 工具配置面板。外部应用（如打开链接/本机路径）走 MCP 模板「外部应用」，说明见 `docs/external-apps-mcp.md`。

管理本机 mcp.json：预设模板、健康检查、启用开关。

**已实现界面：**

- 统计：服务器数、已启用、在线数
- 卡片：filesystem / fetch / memory 等，展示启动命令
- 一键添加内置模板、详情内健康检查
- 推送时脱敏导出 .mcp.json

### 系统

#### 应用设置 `/settings`

> 模型、同步与偏好

「基础设置 / 高级」两个页签。

**已实现界面：**

- 基础设置：用户偏好（`.claudecode/user-preferences.mdc`，每轮注入）、模型与连接（云 API、本地 Ollama、同步到 Claude CLI）
- 高级：编排入口（工作区 / 角色 / Skill / 任务链 / MCP / 日志）、GitHub 个人仓同步、官方 upstream 同步；定时任务与执行日报在「实验」分组
- 推送时自动生成本文档并写入提交说明

#### 帮助与链接 `/help`

> 文档与快捷键

编排入门、外部文档、快捷键与关于信息。

**已实现界面：**

- Agent / Skill / 任务链 / MCP 操作指引
- 官方文档与社区链接
- macOS 快捷键一览

## 本地运行

```bash
npm run web:dev:full # Web + 本机 Bridge
npm run desktop # Electron 桌面版
```

## 维护说明

页面说明源文件：`docs/claude-orchestrator/frontend-apps.catalog.json`。修改后推送个人 GitHub 即可同步到提交信息与本文档。
