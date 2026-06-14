# 本地 Claude Code 工作区

本目录为 [anthropics/claude-code](https://github.com/anthropics/claude-code) 源码克隆，用于查阅文档与插件；日常使用请用系统已安装的 `claude` CLI。

## 快速开始（Ollama + CC Switch）

1. 确认 Ollama 与 CC Switch 已安装并运行。
2. 执行：

```bash
./scripts/setup-ollama-cc-switch.sh
```

3. 在 CC Switch 中确认导入 **Ollama Local** 并设为当前 Claude Code 供应商。
4. 在项目目录运行：`claude --model qwen2.5-coder:latest`

完整说明见 [docs/setup-ollama-cc-switch.md](docs/setup-ollama-cc-switch.md)。

## Web 前端（来自 Claude code12）

界面在 `web/`，通过 **Web Bridge** 连接本机 Claude Code CLI（无需 Electron）。

```bash
# 推荐：Bridge + 前端一起启动
npm run web:dev:full

# 或分开两个终端：
npm run bridge          # http://127.0.0.1:18790  +  ws://127.0.0.1:18789
npm run web:dev         # http://127.0.0.1:5188/
```

默认工作区：`~/claudecode`；CLI：`/opt/homebrew/bin/claude`；provider 仍由 CC Switch / `~/.claude/settings.json` 控制。

Bridge 数据目录：`~/.claude-workbench/`（工作区路径、聊天会话、设置）。

详见 `web/BRIDGE.md`。
