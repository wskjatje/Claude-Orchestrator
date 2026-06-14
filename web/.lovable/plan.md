## 🎯 目标
将当前通用本地 LLM 客户端,精准定位为 **「本地 Claude Code 工作台 (Claude Workbench)」**——围绕代码仓库、Agent 编排、MCP 工具、Hooks 钩子、会话审计构建。

---

## 📐 阶段 1 — 品牌与外壳 (`src/components/app-shell.tsx`)

- Logo 文案:`本地代码助手 / Local · Ollama` → **`Claude Workbench / Local · Anthropic CLI`**
- 修复 SSR hydration mismatch(中英文混用 `Local · Ollama` ↔ `本地 · 奥拉马`),统一为英文 `Local · Anthropic`
- 底部状态徽章:绿点 + `Claude CLI · v1.x.x` + 链接 `claude doctor`(模拟值)
- 导航分组重排:
  ```
  工作区:  聊天 · 工作目录(新增,挂载本地仓库列表)
  运行:    概览 · 定时任务 · 日志 · 用量 · 会话总结
  编排:    Agent · 技能 · 任务链(Hooks)
  集成:    MCP 服务器(替换"通信")
  系统:    应用设置 · 帮助
  ```

## 📐 阶段 2 — 聊天页 (`src/routes/index.tsx`) 大改

**保留** 7 个主技能芯片(快速/写作/编程/图像/PPT/视频/更多),仅替换语义与图标:

| 原技能 | 新语义 | 新图标 |
|---|---|---|
| 快速 | 快速问答 (Sonnet) | `Zap` |
| 帮我写作 | 文档撰写 (README/Docstring) | `FileText` |
| 编程 | 代码编辑 (Plan/Build) | `Code2` |
| 图像生成 | 架构图 (Mermaid) | `Workflow` |
| PPT 生成 | 技术方案 | `FileCode` |
| 视频生成 | 终端录制 (asciinema) | `Terminal` |
| 更多 | 更多 Skill | `MoreHorizontal` |

**新增元素:**
- 顶部 CWD 选择器:`📁 ~/projects/foo ▾`
- 模型芯片:`claude-sonnet-4 / opus-4 / haiku-4`
- 模式切换:`Plan ↔ Build ↔ Auto-accept`
- 输入框右下:实时 token 计数 `≈ 1.2k / 200k`
- 助手消息渲染增强:Diff 卡片 + 工具调用气泡(`🔧 Read(file.ts)` `⚙️ Bash(...)` 紧凑卡片)

**移除:**
- 云端模型选择(Seedream / Seedance / FLUX / Kling / DALL·E)
- "引入开源仓库" GitHub 弹窗(简化为本地仓库选择,复用 FinderDialog)
- 比例/篇幅/风格/模板等创作参数(图像/视频技能内的子菜单替换为 Mermaid 主题、终端宽高等)

## 📐 阶段 3 — 概览页重构 (`src/routes/overview.tsx`)

- 移除:WebSocket URL、网关令牌、IM 频道提示卡
- 新增:
  - **CLI 状态卡**:`claude --version`、登录账号、订阅类型(Pro/Max/API)、剩余配额
  - **MCP 服务器卡**:已连接服务器数、健康状态(类似 `claude mcp list`)
  - **本周用量**:Input/Output/Cache token + USD 估算
  - **最近会话**:列出 `~/.claude/projects/<hash>/*.jsonl`(项目名、模型、消息数、时间)
  - **快速操作**:`新建` / `继续上次`(`claude --continue`)/ `恢复`(`claude --resume`)
- Bridge 连接卡:展示 Bridge 在线状态、版本、`ws://127.0.0.1:18789` 配置入口

## 📐 阶段 4 — 各功能页对齐

| 文件 | 改动 |
|---|---|
| `routes/agents.tsx` | 列出 `~/.claude/agents/` 下 Subagent,显示 description/tools/model;支持启停 |
| `routes/skills.tsx` | 列出 `~/.claude/skills/`,显示 allowed-tools / 调用次数 |
| `routes/chains.tsx` | 「工作流 + Hooks」:展示 PreToolUse/PostToolUse/Stop/SubagentStop 钩子 |
| `routes/comms.tsx` → **重命名内容为 MCP 服务器** | 上半屏:已配置 MCP servers 列表(filesystem/github/postgres,可启停);下半屏:推荐 MCP 一键配置 |
| `routes/scheduled.tsx` | cron/launchd 触发 `claude -p "..."` 非交互模式 |
| `routes/logs.tsx` | 按会话分组,展示 transcript jsonl 摘要 + 系统日志 |
| `routes/reports.tsx` → **「会话总结」** | 基于真实 transcript 生成 |
| `routes/settings.tsx` | `~/.claude/settings.json` 编辑器:模型、allowedTools、mcpServers、hooks、API Base URL、Bridge 配置 |

## 📐 阶段 5 — 设计 Token (`src/styles.css`)

- 新增 `--font-mono-ui` (JetBrains Mono / SF Mono / Menlo) 用于路径与 token 数
- 新增 Diff 颜色:`--diff-add` / `--diff-del` / `--diff-hunk`
- 新增工具调用配色:`--tool-read`(蓝)/`--tool-edit`(橙)/`--tool-bash`(紫)/`--tool-web`(青)
- 保留现有深浅主题 + macOS 玻璃风,不改主调色

## 📐 阶段 6 — 真实 Claude CLI 对接架构(本轮全部交付)

**架构图:**
```
浏览器(本应用)
   │
   ├── (主路径)─── Lovable Cloud server function /api/bridge/relay
   │                  ⇅ WebSocket
   │              本机 Bridge 守护进程(用户单独运行,本轮不交付)
   │                  ⇅
   │              claude / @anthropic-ai/claude-agent-sdk
   │                  ⇅
   │              ~/.claude/* 文件系统
   │
   └── (降级)──── Lovable AI Gateway(Bridge 离线时,使用云端 LLM 代替)
```

**Lovable Cloud 后端工作:**
- 启用 Lovable Cloud(自动开通 Supabase + AI Gateway)
- 创建表:
  - `bridge_sessions` (id, user_id, bridge_token, last_seen_at, claude_version, account_label)
  - `chat_sessions` (id, user_id, cwd, model, mode, title, created_at)
  - `chat_messages` (id, session_id, role, content, tool_calls jsonb, token_in, token_out, created_at)
  - `mcp_servers` (id, user_id, name, transport, command, args, status, last_health_at)
  - `skills_cache` (id, user_id, name, description, allowed_tools, call_count)
  - `agents_cache` (id, user_id, name, description, system_prompt, tools)
  - `usage_daily` (user_id, day, input_tokens, output_tokens, cache_tokens, cost_usd)
- RLS:全部按 `user_id = auth.uid()` 限定;`user_roles` 表 + `has_role` SECURITY DEFINER 函数
- Server functions(`createServerFn`):
  - `bridgeUpsertHeartbeat`(Bridge → Cloud 心跳)
  - `bridgePushMessage`(Bridge → Cloud 上报消息)
  - `chatSend`(浏览器 → Cloud → Bridge,降级时 → AI Gateway)
  - `mcpList / mcpAdd / mcpRemove`
- Server route:`/api/public/bridge/ws` 反向 WebSocket 入口(签名验证)

**前端工作:**
- `src/lib/bridge-client.ts`:封装 WS 客户端、自动重连、心跳、事件订阅
- `useBridge()` Hook:暴露在线状态、调用方法
- 全局右上角:Bridge 状态指示灯(在线/离线)
- 离线时所有页面顶部条幅提示「Bridge 离线,显示缓存数据」

**注意**:本轮交付前端 + Cloud 后端全部代码;**本机 Bridge 守护进程**作为独立 npm 包另行分发(README 中提供启动指引与最小示例代码片段)。

## 📐 阶段 7 — 修复

- 修复 `app-shell.tsx` 中文/英文混用导致的 SSR hydration mismatch
- 修复 React Minified Error #418(同源,均为 hydration 问题)

---

## 🛠 涉及文件清单

**新建:**
- `src/lib/bridge-client.ts`(WS 客户端)
- `src/hooks/use-bridge.tsx`(Bridge 状态 hook)
- `src/components/cwd-picker.tsx`(工作目录选择器)
- `src/components/model-chip.tsx`(模型/模式芯片)
- `src/components/tool-call-bubble.tsx`(工具调用气泡)
- `src/components/diff-block.tsx`(Diff 渲染)
- `src/routes/workspaces.tsx`(工作目录页)
- `src/utils/claude.functions.ts`(server functions)
- Supabase migration:创建上述 7 张表 + RLS + has_role
- `BRIDGE.md`(本机 Bridge 启动指引文档)

**修改:**
- `src/components/app-shell.tsx`(品牌、导航、修复 hydration)
- `src/routes/__root.tsx`(注入 Bridge Provider)
- `src/routes/index.tsx`(聊天页大改)
- `src/routes/overview.tsx`(完全重写)
- `src/routes/agents.tsx`、`skills.tsx`、`chains.tsx`、`comms.tsx`、`scheduled.tsx`、`logs.tsx`、`reports.tsx`、`settings.tsx`(对齐 Claude Code 语义)
- `src/styles.css`(新增 token)
- `src/components/finder-dialog.tsx`(适配 CWD 选择)

---

## ✅ 验收标准

1. 所有页面无 hydration 错误,首屏白屏问题消失
2. 聊天页技能芯片图标全部替换,无云端模型残留
3. 概览页展示 CLI 状态、MCP、用量、最近会话四大核心区块
4. MCP 服务器页可显示 servers 列表、添加、启停
5. Lovable Cloud 后端表与 RLS 通过 security scan
6. Bridge 离线时所有页面优雅降级,顶部出现状态条
7. `bunx tsc --noEmit` 通过
8. 提供 `BRIDGE.md` 给用户后续运行守护进程

完成后请审阅并点击确认,我将切换到执行模式逐步交付。