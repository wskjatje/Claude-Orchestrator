# Claude Orchestrator 前端应用

本机优先的 AI 编排工作台：连接 Claude Code CLI，统一管理对话、Agent、Skill、任务链与 MCP 工具。

**技术栈**：React · TanStack Router · Electron 桌面 · 本机 Bridge 服务

> 本文档在推送到个人 GitHub 时自动更新，与应用侧栏导航一致。

## 应用一览

### 工作区

#### 聊天 `/`

与 Claude Code 对话；支持 Agent / Skill 切换、任务链执行、工作台文件树与终端。

#### 工作目录 `/workspaces`

选择项目根目录，供聊天写入、工作台浏览与任务链读写。

#### 工作台编辑器 `/editor`

聊天页内嵌代码/ Markdown 编辑与预览（由聊天路由进入）。

### 运行

#### 概览 `/overview`

本机连接状态、今日用量 KPI 与运行概况。

#### 定时任务 `/scheduled`

本机进程内定时触发 Agent 或命令。

#### 日志 `/logs`

工作台、Claude CLI 与追踪日志，便于故障排查。

#### 智能体执行日报 `/reports`

按 Agent × 日期汇总 Markdown 执行记录。

### 编排

#### Agent `/agents`

浏览、编辑与试跑本机 Agent 角色规则（docs/agents/）。

#### Skill `/skills`

管理本机 Skill 目录中的可复用提示与工具组合。

#### 任务链 `/chains`

多步 Agent 流水线；对话中可用 /chain 调用。

### 集成

#### MCP 服务器 `/comms`

配置 filesystem、fetch、memory 等 MCP 工具供编排使用。

### 系统

#### 应用设置 `/settings`

模型与连接、GitHub 同步、聊天落盘等通用偏好。

#### 帮助与链接 `/help`

快捷键、外部文档与关于信息。

## 本地运行

```bash
npm run web:dev:full   # Web + 本机 Bridge
npm run desktop        # Electron 桌面版
```
