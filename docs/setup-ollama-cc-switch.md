# Claude Code + CC Switch 多 Provider 配置

本仓库已从 GitHub 克隆 [anthropics/claude-code](https://github.com/anthropics/claude-code) 源码；日常 CLI 由 **单一 runtime** 维护，**不在 Claudx / Cursor / 终端** 分散配置 provider。

## 架构约束（长期固定）

| 层 | 权威来源 | 固定值 |
|----|----------|--------|
| Provider | **CC Switch** | 唯一 provider authority |
| Runtime | Homebrew cask | `/opt/homebrew/bin/claude` |
| Local inference | Ollama | `http://localhost:11434` |
| Workspace shell | Claudx | Project: `~/claudecode` |
| Editor | Cursor | 不单独 export API key |
| Governance | 本仓库 | `CLAUDE.md` + `.claude/settings.json` |

**禁止**：在 Claudx、Cursor、多个 terminal profile 里各自配 provider / API key —— 会导致 topology 重新污染。

```
Cursor / Claudx
      ↓
Claude Code  (/opt/homebrew/bin/claude)
      ↓
   CC Switch  ← 唯一 provider authority
      ↓
┌─────┬─────────┬──────────┬──────────┐
Ollama  Gemini   Claude     DeepSeek
Local   Router   Official   API
```

## Runtime governance defaults（本地 inference 运行约束）

以下不是临时 workaround，而是 **local 14B + agent loop** 的稳定运行约束。已写入 `~/.claude/settings.json` 与本仓 `.claude/settings.json`：

| 约束 | 值 / 做法 | 作用 |
|------|-----------|------|
| Output token 上限 | `CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192` | 减少 runaway generation、32k overflow |
| 本地冒烟测试 | `--tools ""` | 隔离 tool loop，只测 provider chain |
| 交互首条延迟 | 接受 2–5 分钟 | 14B 加载 + 首轮推理，非 provider 故障 |
| Agent 重任务 | 切 Claude Official | Claude Code 为 frontier agent 优化 |

在 CC Switch 为 **Ollama Local**（及可选 DeepSeek）profile 中，确认 `env` 含 `CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192`；切换 provider 后若被覆盖，在 CC Switch 供应商编辑页补回。

## Provider 回归测试（smoke test）

provider 切换、CC Switch 更新、Ollama 升级、换模型后执行：

```bash
cd ~/claudecode
claude --model qwen2.5-coder:14b -p "你好" --tools "" < /dev/null
```

通过标准：中文回复、无 `/login`、无 Execution error、无 Connection refused、无 provider/auth 报错。

该命令**不进入** tool loop / agent recursion / MCP，只验证：

```
runtime → provider adapter → Ollama → model response
```

## 四路 Provider 与 CC Switch 配置

**原则**：一套 Claude Code runtime，只在 CC Switch 切换供应商 profile。

### 1. Ollama Local（日常默认）

| 项 | 值 |
|----|-----|
| 端点 | `http://localhost:11434` |
| Token | `ollama`（`ANTHROPIC_AUTH_TOKEN`） |
| API Key | 留空 |
| 模型 | `qwen2.5-coder:14b`（勿写 `qwen2.5:14b`） |
| 模式 | 交互 / 轻量任务；`-p` 加 `--tools ""` |

**适合**：中文讨论、repo 阅读、小 patch、docs、架构 brainstorming、离线私有迭代。

**不适合**：长 agent loop、MCP-heavy、autonomous refactor。

一键导入：

```bash
OLLAMA_CLAUDE_MODEL=qwen2.5-coder:14b ./scripts/setup-ollama-cc-switch.sh
```

### 2. Claude Official（最强 agent 层）

| 项 | 值 |
|----|-----|
| 认证 | CC Switch 内置「Claude Official」或 API Key |
| 模型 | Sonnet / Opus（按订阅） |
| 模式 | full agent，tools 开启 |

**适合**：autonomous refactor、多工具循环、长 planning、MCP、worktree orchestration。

在 CC Switch → Claude Code → 启用 **Claude Official**，终端 `claude` 后按提示 `/login` 或使用 API Key。**无需** `ccr` 或本地 router。

### 3. Google Gemini（大上下文 / 快速推理）

Claude Code **不能**把 AI Studio `AIzaSy...` 直接当 Anthropic Key；需本机 **claude-code-router** 做协议转换。

| 项 | 值 |
|----|-----|
| Router | `ccr start` → `http://127.0.0.1:3456` |
| Token | `gemini` |
| 模型 | `gemini-2.5-flash`（Pro 免费 tier 易 429，慎用） |

**适合**：大仓库扫读、长上下文 synthesis、快速 reasoning。

一键导入：

```bash
GEMINI_API_KEY='你的_AIza_密钥' ./scripts/setup-gemini-cc-switch.sh
ccr start   # 保持运行
# CC Switch → Claude Code → 启用 Google Gemini
claude --model gemini-2.5-flash
```

### 4. DeepSeek（低成本执行层）

DeepSeek 提供 [Anthropic 兼容 API](https://api-docs.deepseek.com/)，可直接作为 Claude Code 后端。

| 项 | 值 |
|----|-----|
| 端点 | `https://api.deepseek.com` |
| API Key | `sk-...` |
| 模型 | `deepseek-chat` / `deepseek-reasoner` |

**适合**：批量代码生成、routine coding、非关键 refactor、低成本推理。

一键导入：

```bash
DEEPSEEK_API_KEY='sk-...' ./scripts/setup-deepseek-cc-switch.sh
# CC Switch → Claude Code → 启用 DeepSeek
claude --model deepseek-chat
```

### 5. 云梦 AI（Anthropic 兼容聚合）

| 项 | 值 |
|----|-----|
| 官网 | `https://ai.yunmengai.top` |
| API 根地址 | `https://api.yunmengai.top`（**勿加** `/v1`；Claude Code 会自动拼 `/v1/messages`） |
| 认证 | 控制台 API Key → `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` |
| 模型 | 以控制台模型 ID 为准（示例 `claude-sonnet-4-20250514`） |

**适合**：国内低价聚合、Claude 系列中转、日常 coding（按云梦控制台定价）。

一键导入并写入 CC Switch DB（`yunmeng-claude`）：

```bash
YUNMENG_API_KEY='sk-...' ./scripts/setup-yunmeng-cc-switch.sh
# 可选指定模型 ID：
YUNMENG_API_KEY='sk-...' YUNMENG_MODEL='claude-sonnet-4-20250514' ./scripts/setup-yunmeng-cc-switch.sh

# 启用 + 同步 Web 界面
./scripts/switch-to-yunmeng.sh claude-sonnet-4-20250514
npm run sync:cc-switch
```

若 API 地址与默认不同，设置 `YUNMENG_BASE_URL` 后再运行 setup。

## Workload routing policy（推荐）

| 场景 | Provider |
|------|----------|
| 日常 chat / 代码解释 / 小改动 | **Ollama** |
| 架构讨论 / 长上下文阅读 | **Ollama** 或 **Gemini Flash** |
| 超长文档 synthesis | **Gemini Flash** |
| 大批量 routine 生成 | **DeepSeek** 或 **云梦 AI** |
| Autonomous refactor / 长 tool loop | **Claude Official** |
| MCP-heavy / 多步执行 | **Claude Official** |

## 当前环境

| 组件 | 状态 |
|------|------|
| Claude Code CLI | `/opt/homebrew/bin/claude`（`brew install --cask claude-code`） |
| Ollama | `http://127.0.0.1:11434` |
| CC Switch | `/Applications/CC Switch.app` |
| 推荐本地模型 | `qwen2.5-coder:14b` |

## 更新 Claude Code

**源码（本目录）：** `git pull`

**CLI（推荐）：**

```bash
brew install --cask claude-code
# 或官方安装器
curl -fsSL https://claude.ai/install.sh | bash
```

**勿再使用** `npm install -g @anthropic-ai/claude-code`（macOS 上易留下 `.exe` shim 污染 PATH）。

## 启动 Claude Code

CC Switch 切到目标 provider 后：

```bash
cd ~/claudecode
claude
# 或指定模型
claude --model qwen2.5-coder:14b
```

本地 Ollama 交互模式首条回复可能较慢；`-p` 快速验收请加 `--tools ""`。

## 回复语言（简体中文）

- 项目：`.claude/settings.json` + `CLAUDE.md`
- 全局：`~/.claude/settings.json` 的 `"language": "chinese"`
- 界面 spinner / tips：本仓已配中文；`/clear` 或重开 `claude` 生效

## Claudx 接线

| 字段 | 值 |
|------|-----|
| Binary Path | `/opt/homebrew/bin/claude` |
| Project | `~/claudecode` |

**不要**在 Claudx 配置 provider 或 export API key。

## 验证清单

```bash
# Runtime 唯一性
which -a claude          # 应均为 /opt/homebrew/bin/claude
claude --version
file "$(which claude)"   # Mach-O arm64

# Ollama
ollama list
curl -s http://127.0.0.1:11434/api/tags | head

# Provider chain（Ollama）
cd ~/claudecode
claude --model qwen2.5-coder:14b -p "你好" --tools "" < /dev/null
```

## 常见问题

- **选了 Gemini 仍显示 qwen2.5-coder:14b**：
  1. CC Switch **启动时会从 `~/.cc-switch/cc-switch.db` 读取 env 并覆盖** `~/.claude/settings.json`；仅改 settings.json 不够
  2. 检查 DB：`python3 -c "import sqlite3,json;..."` 或运行 `./scripts/switch-to-gemini-native.sh`
  3. 「Gemini Native」须 `ccr start`；BASE_URL 应为 `http://127.0.0.1:3456`
  4. 修复后 **完全退出 CC Switch 再重开**，然后从其终端按钮启动 Claude Code
  5. 项目 `.claude/settings.json` 不要写死 `ANTHROPIC_DEFAULT_*_MODEL`
- **模型找不到**：`ollama pull qwen2.5-coder:14b`；勿用不存在的 `qwen2.5:14b`
- **Execution error + Ctrl+C**：多为中断，非 provider 故障；本地 14B 请等 2–5 分钟
- **32k token overflow**：确认 `CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192`；本地任务加 `--tools ""`
- **仍走官方 API**：CC Switch 确认当前不是 Claude Official（若要用 Ollama）
- **Gemini Connection refused**：先 `ccr start`
- **Gemini 429**：换 `gemini-2.5-flash`，勿默认 Pro

## 参考

- [anthropics/claude-code](https://github.com/anthropics/claude-code)
- [farion1231/cc-switch](https://github.com/farion1231/cc-switch)
- [Claude Code × Ollama](https://docs.ollama.com/integrations/claude-code)
- [DeepSeek API](https://api-docs.deepseek.com/)
