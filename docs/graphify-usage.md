# 结构索引（graphify）用法

定位：工作区**代码 AST 结构索引**，服务 `@codebase` 与 Host `code_search`。不是文档库，不替代 Language Service。

## 分工

| 层 | 职责 |
|----|------|
| graphify | contains / imports / calls 子图 |
| code-index | BM25 / 可选嵌入 |
| ripgrep | 精确文本 |
| LS | 定义 / 引用 / 补全 |

`@codebase:关键词` = 结构 → 语义 → 文本；任一层失败须在结果中可见。

## 语料

由仓库根 `.graphifyignore` 决定。默认排除 docs、plugins、媒体与构建产物，主图为可执行代码。

## 运维

- 构建：`graphify update <工作区> --no-cluster` 后 `graphify export html`（产品内「构建索引」走同一路径）
- 写盘后会节流触发 update；失败留下 `graphify-out/.needs_update`
- 解析顺序：`WORKBENCH_GRAPHIFY` → PATH 上 `graphify` → `WORKBENCH_GRAPHIFY_PYTHON` / `graphify-out/.graphify_python` 的 `python -m graphify`
- 大改 `.graphifyignore` 后需全量重建（`--force`）
- 查询只读 `graph.json`（`file_type=code` 加权）；无匹配 / 无图返回错误，不静默降级

## Agent 约定

有 `graphify-out/graph.json` 时，编码问题先查结构子图再读文件。图谱任务本身除外。
