# Claude Orchestrator 桌面助手

本目录为 **Claude Orchestrator** 的 Electron 桌面客户端：独立窗口运行 Web UI，并通过 preload 注入完整 `window.desktop` API（非浏览器 Bridge 垫片）。

## 首次使用

```bash
# 仓库根目录
npm run web:install          # Web 依赖（若尚未安装）
npm run desktop:install      # Electron 依赖
```

## 启动

```bash
npm run desktop
```

等价于依次启动：

1. 本机 Bridge（`server/index.mjs`，:18790 / :18789）
2. Web UI（Vite，:5188）
3. Electron 窗口（加载 http://127.0.0.1:5188/）

若你已在另一终端运行 `npm run web:dev:full`，也可只开 Electron：

```bash
cd desktop && npm start
```

## 与浏览器模式的区别

| 能力 | 浏览器 + Bridge | 桌面助手 |
|------|-----------------|----------|
| 聊天 / 任务链 / MCP | ✅ | ✅ |
| 本机目录选择 | macOS 脚本对话框 | ✅ |
| 引用文件 / 图片附件 | ✅（Bridge 原生对话框） | ✅（Electron 对话框） |
| 侧栏显示 | 「已连接 Claude Code」 | 「桌面版 · Claude Code」 |
| 需手动开浏览器 | 是 | 否 |

## 环境变量

| 变量 | 说明 |
|------|------|
| `CLAUDE_ORCHESTRATOR_URL` | 覆盖加载地址，默认 `http://127.0.0.1:5188/` |
| `CLAUDE_ORCHESTRATOR_DEVTOOLS` | 设为 `1` 打开 DevTools |

## 架构

```
desktop/main.mjs      → BrowserWindow + 原生文件对话框 IPC
desktop/preload.cjs   → window.desktop + WebSocket 事件
desktop/run-dev.mjs   → Bridge + Vite + Electron 一键启动
server/index.mjs      → RPC / WebSocket 后端（与浏览器模式共用）
```

前端在检测到 `window.__ELECTRON_DESKTOP__` 时不会注入 Web Bridge 垫片，避免重复连接与 API 覆盖。
