# 本仓库 · Codex 约定

## 语言（强制）

1. **会话回复**：一律使用**简体中文**（与 `.Codex/settings.json` 中 `language: chinese` 一致）。
2. **向用户说明**：步骤、结论、风险、待确认项均用简体中文；代码、命令、路径、标识符保持原样。
3. **例外**：用户明确要求其他语言时，按当次请求执行。

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Cloud Agent

开发服务由环境的 `start` 启动：`npm run web:dev:full`。Bridge 在 `http://127.0.0.1:18790`，Web UI 在 `http://127.0.0.1:5188`。该命令不打开 Electron。

镜像自带的 Node 22.14 会在加载 Bridge 和 Vite 时抛出 `ERR_REQUIRE_CYCLE_MODULE`。安装脚本把 Node 22.23.3 放到 `/opt/cursor-node`，并通过 `/etc/profile.d/cursor-node.sh` 放到 `PATH` 前面。确认 `node -v` 为 `v22.23.3` 后再启动服务。

依赖安装使用 `bash scripts/cloud-agent-install.sh`（根目录与 `web/` 的 `npm ci`，以及 `npm run vendor:install`）。`server/vendor/` 不入库。目录里还没有 CAD 源码时，脚本只补启动所需的依赖和占位模块，已有文件不会被覆盖。任务链与本地 MCP 编排仍依赖本机完整 CAD 树。
