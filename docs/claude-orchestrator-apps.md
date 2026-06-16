# Claude Orchestrator · 前端实现说明

本机优先的 AI 编排工作台 Web 前端：React + TanStack Router，Electron 桌面壳，经 Bridge 连接 Claude Code CLI 与本机数据。

**技术栈**：React 19 · TanStack Router · Vite · Tailwind · shadcn/ui · react-resizable-panels · Electron

> 推送到个人 GitHub 时自动更新；内容与侧栏导航及当前 Web 实现一致。

## 整体 UI

- 顶栏：品牌、全局搜索（⌘K）、主题切换
- 侧栏：分组导航 + 连接状态 / 任务链徽章
- 聊天页：可拖拽三栏工作台（文件 · 编辑预览 · 对话）
- 列表页：统一 PageHeader + 统计卡片 + 搜索筛选 + 卡片网格

## 页面与功能

### 工作区

#### 聊天 · 工作台 `/`

> Cursor 式三栏主界面

项目主入口：左侧资源面板、中间编辑/预览、右侧 Claude 对话。

**已实现界面：**

- 左栏 Tab：文件树、Git 状态、改动列表；支持工作区目录浏览
- 中栏：多文件 Tab 编辑、Markdown/代码预览、内嵌浏览器打开本地页面
- 右栏：会话列表、流式对话、Agent / 模型选择、@ 引用文件、/ 命令
- 底栏 Composer：附件、链执行状态徽章、停止/重发
- 布局比例可拖拽记忆（react-resizable-panels）

#### 工作目录 `/workspaces`

> 全应用唯一工作区入口

选择 AI 读写代码的项目根目录，并管理最近打开记录。

**已实现界面：**

- 浏览目录选取项目根路径
- 打开记录列表，一键切回历史工作区
- 清除当前工作区与历史记录

### 运行

#### 概览 `/overview`

> 连接与用量仪表盘

展示本机 Bridge 状态、今日 KPI 与用量统计。

**已实现界面：**

- 本机服务条：在线状态、Bridge 地址、重连、claude doctor、高级连接配置
- 运行概况 KPI：今日消息、会话数、云端费用、当前模型、定时任务
- 用量统计：按今天/7天/30天切换；云端费用、Token、本地 Ollama 轮次等

#### 定时任务 `/scheduled`

> 本机 cron 式调度

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

#### 智能体执行日报 `/reports`

> Agent 执行沉淀

按 Agent × 日期浏览 Markdown 日报，支持项目汇总视图。

**已实现界面：**

- 按智能体 / 项目汇总 Tab
- 日期导航、Markdown 预览与复制
- 与聊天 /agent、任务链执行自动关联

### 编排

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

> MCP 工具配置面板

管理本机 mcp.json：预设模板、健康检查、启用开关。

**已实现界面：**

- 统计：服务器数、已启用、在线数
- 卡片：filesystem / fetch / memory 等，展示启动命令
- 一键添加内置模板、详情内健康检查
- 推送时脱敏导出 .mcp.json

### 系统

#### 应用设置 `/settings`

> 模型、同步与偏好

通用 / 模型与连接 / 编排与高级 三个 Tab。

**已实现界面：**

- 通用：一键确认写入默认路径
- 模型与连接：云 API 供应商、本地 Ollama、同步到 Claude CLI
- 编排与高级：GitHub 个人仓库 push/pull、官方 upstream 同步
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
npm run web:dev:full   # Web + 本机 Bridge
npm run desktop        # Electron 桌面版
```

## 维护说明

页面说明源文件：`docs/claude-orchestrator/frontend-apps.catalog.json`。修改后推送个人 GitHub 即可同步到提交信息与本文档。
