# 本仓库 · Claude Code 约定

## 语言（强制）

1. **会话回复**：一律使用**简体中文**（与 `.claude/settings.json` 中 `language: chinese` 一致）。
2. **向用户说明**：步骤、结论、风险、待确认项均用简体中文；代码、命令、路径、标识符保持原样。
3. **例外**：用户明确要求其他语言时，按当次请求执行。

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
