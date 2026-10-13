# 本仓库 · Claude Code 约定

## 语言（强制）

1. **会话回复**：一律使用**简体中文**（与 `.claude/settings.json` 中 `language: chinese` 一致）。
2. **向用户说明**：步骤、结论、风险、待确认项均用简体中文；代码、命令、路径、标识符保持原样。
3. **例外**：用户明确要求其他语言时，按当次请求执行。

## graphify（结构索引）

用途：`@codebase` / 编码导航的 AST 子图。详见 `docs/graphify-usage.md`。

- 有 `graphify-out/graph.json` 时：编码问题先 `graphify query`，再读文件。
- 无图或 `.needs_update`：先构建/更新；禁止把过期图当真相。
- 改代码后：`graphify update .`（AST-only）。
