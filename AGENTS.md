# 本仓库 · Codex 约定

## 语言（强制）

1. **会话回复**：一律使用**简体中文**（与 `.Codex/settings.json` 中 `language: chinese` 一致）。
2. **向用户说明**：步骤、结论、风险、待确认项均用简体中文；代码、命令、路径、标识符保持原样。
3. **例外**：用户明确要求其他语言时，按当次请求执行。

## graphify（结构索引）

用途：`@codebase` / 编码导航的 AST 子图。详见 `docs/graphify-usage.md`。

- 有 `graphify-out/graph.json` 时：编码问题先 `graphify query`（或产品内 `workspace:graphifyQuery`），再读具体文件。
- 无图或 `.needs_update`：先构建/更新，再当结构依据；禁止把过期图当真相。
- 改代码后：`graphify update .`（AST-only）。
- `/graphify` 显式调用时按 `.agents/skills/graphify/SKILL.md`。

## Playwright（Cursor Agent）

- 本机跑 `check:ui-playwright` / `browser:install`：**必须出沙箱**（`required_permissions: ["all"]`），详见 `.cursor/rules/playwright-sandbox.mdc`。
- CI 真浏览器 job 使用 Playwright 官方镜像，避免 Ubuntu `install-deps` 冷启动过慢。
