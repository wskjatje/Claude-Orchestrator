# Claude Orchestrator 桌面应用

Electron 客户端：独立窗口运行 Web UI，注入完整 `window.desktop` API。

## 方式一：打包安装（推荐，无需命令）

在仓库根目录执行**一次**打包：

```bash
npm run web:install      # 首次
npm run desktop:pack     # 构建 .dmg / .app
```

产物位于 `desktop/release/`：

- **macOS**：打开 `.dmg`，将 **Claude Orchestrator** 拖入「应用程序」
- 之后从启动台或 Dock 直接打开，**无需**再运行 `npm run desktop`

打包版会自动启动本机 Bridge（:18789 / :18790）与内置 Web UI（:5188）。  
运行时数据保存在 `~/Library/Application Support/Claude Orchestrator/`。

**仍需本机已安装**：`claude` CLI（Claude Code）及常用工具路径。

### 经微信 / AirDrop 发送后提示「已损坏」

这是 macOS **隔离属性**（`com.apple.quarantine`）与未公证安装包共同导致的常见现象，**不是**文件真损坏。

在**安装应用的 Mac** 上执行（路径按实际修改）：

```bash
xattr -cr "/Applications/Claude Orchestrator.app"
```

或在仓库根目录：

```bash
bash scripts/macos-fix-quarantine-app.sh
```

若仍被拦截：**右键**「Claude Orchestrator」→ **打开** → 确认一次。  
重新打包请在本机执行 `npm run desktop:pack`（会自动 ad-hoc 签名并清除 release 目录隔离属性）。

## 方式二：开发模式（改代码时用）

```bash
npm run web:install
npm run desktop:install
npm run desktop          # Bridge + Vite + Electron 一键启动
```

若已在另一终端运行 `npm run web:dev:full`，可只开 Electron：

```bash
cd desktop && npm start
```

## 与浏览器模式的区别

| 能力 | 浏览器 + Bridge | 桌面应用 |
|------|-----------------|----------|
| 聊天 / 任务链 / MCP | ✅ | ✅ |
| 本机目录选择 | macOS 脚本 | ✅ 原生对话框 |
| 引用文件 / 附件 | ✅ | ✅ |
| 需手动开终端命令 | 是 | 打包版否 |

## 环境变量（开发）

| 变量 | 说明 |
|------|------|
| `CLAUDE_ORCHESTRATOR_URL` | 覆盖加载地址，默认 `http://127.0.0.1:5188/` |
| `CLAUDE_ORCHESTRATOR_DEVTOOLS` | 设为 `1` 打开 DevTools |

## 架构

```
desktop/main.mjs       → BrowserWindow；打包版调用 runtime 自启后端
desktop/runtime.mjs    → Bridge + 静态 UI（ELECTRON_RUN_AS_NODE）
desktop/preload.cjs    → window.desktop + WebSocket
server/index.mjs       → RPC / WebSocket 后端
server/packaged-ui-server.mjs → 打包版静态页 + /api 代理
```
