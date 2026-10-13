# 外部应用（MCP）

定位：让 Agent **像 OpenClaw 那样调用外部能力**，但走本产品已有 **MCP** 通道，不嵌入 OpenClaw 运行时。

## 原则

- 编码主路径（会话 / 写盘 / 偏好）不依赖外部 MCP；未配置或失败时对话照旧。
- 管理入口唯一：**设置 → 高级 → MCP 服务器**（`/comms`）。
- 每个外部应用 = 一个 MCP Server（官方包、社区包或本仓库内置）。

## 内置：`external-apps`

通讯页模板「外部应用」。工具：

| 工具 | 作用 |
|------|------|
| `open_url` | 系统默认浏览器打开 http(s) |
| `open_path` | 系统默认应用打开本机文件/目录（macOS 可指定 App 名） |
| `list_capabilities` | 能力说明 |

路径白名单：未设 `EXTERNAL_APPS_ALLOW_PREFIXES` 时，默认仅允许 `process.cwd()`（工作区根）及其子路径；域外 `open_path` 硬拒绝。添加模板时会尽量写入当前工作区根到该环境变量。

## 通道纪律（禁兜底）

- 已启用非内置 MCP（不含自动补全的三省六部）时：Claude CLI / 本地编排失败后**禁止**静默 Host 或 cloudDirect 回落（Host 无 MCP）。
- 无工具证据时禁止声称已打开应用；失败只报真实通道错误。

## 接入第二个应用

1. 在 `/comms` 添加 MCP（或选其它预设：Slack、Puppeteer、Fetch…）
2. 健康检查通过
3. 用 Agent 发任务，确认气泡出现 **MCP·用过**

需要 WhatsApp/多端节点时：旁路本机 [OpenClaw Gateway](https://docs.openclaw.ai/gateway/external-apps)，不要把渠道层嵌进本产品。
