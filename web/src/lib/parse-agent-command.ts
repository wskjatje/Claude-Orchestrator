/**
 * 方案 A：首条消息以 `/agent <stem>` 或短别名（如 /pm）指定本轮 Agent。
 * stem 须与 ~/.claude/agents/<stem>.md 的文件名（无扩展名）一致。
 */

/** 与本仓库 docs/claude-code-artifacts/agents 常见文件对齐 */
const KNOWN_STEMS = new Set([
  "product-manager",
  "project-manager",
  "software-architect",
  "frontend-engineer",
  "backend-engineer",
  "code-reviewer",
  "qa-engineer",
  "devops-engineer",
  "ui-ux-designer",
  "historian",
  "literature-scholar",
]);

/** 短别名 → stem */
const ALIASES: Record<string, string> = {
  pm: "product-manager",
  mgr: "project-manager",
  arch: "software-architect",
  fe: "frontend-engineer",
  be: "backend-engineer",
  reviewer: "code-reviewer",
  qa: "qa-engineer",
  devops: "devops-engineer",
  ux: "ui-ux-designer",
};

/** 与本机 `~/.claude/agents/<stem>.md` 文件名对齐（ASCII）；便于逐项点名任意自定义 Agent */
const STEM_LOWER_ASCII = /^[a-z0-9][a-z0-9_-]*$/;

function normalizeStem(token: string): string | null {
  const t = token.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  if (KNOWN_STEMS.has(lower)) return lower;
  // 任意合法文件名 stem（不再需要「必须含连字符」）；与 slash 命令、`global://` 路由一致
  if (STEM_LOWER_ASCII.test(lower)) return lower;
  return null;
}

export type ParsedAgentCommand =
  | { matched: false }
  | { matched: true; stem: string; body: string };

/**
 * 从用户输入解析 Agent 指令。正文可为空（仅切换身份）。
 * 支持：
 * - `/agent project-manager 根据 PRD 拆解任务`
 * - `/mgr 拆解 WBS`
 * - `/project-manager`（全文作为 stem，余下为 body）
 */
export function parseAgentCommand(raw: string): ParsedAgentCommand {
  const s = raw.trim();
  if (!s.startsWith("/")) return { matched: false };

  const agentPrefix = s.match(/^\/agent\s+/i);
  if (agentPrefix) {
    const rest = s.slice(agentPrefix[0].length).trim();
    const m = rest.match(/^([a-zA-Z0-9][a-zA-Z0-9_-]*)/);
    if (!m) return { matched: false };
    const stem = normalizeStem(m[1]);
    if (!stem) return { matched: false };
    const body = rest.slice(m[1].length).trim();
    return { matched: true, stem, body };
  }

  const lineMatch = s.match(/^\/([a-zA-Z][a-zA-Z0-9_-]*)(?:\s+(.*))?$/s);
  if (!lineMatch) return { matched: false };
  const token = lineMatch[1];
  if (token.toLowerCase() === "agent") return { matched: false };
  const stem = normalizeStem(token);
  if (!stem) return { matched: false };
  const body = (lineMatch[2] ?? "").trim();
  return { matched: true, stem, body };
}

/** 云模型：拼入 Claude Code subagent 行 */
export function buildSubagentUserLine(stem: string, body: string): string {
  // `claude -p` 为非交互模式，前缀 `/subagent` 会被当成未知斜杠命令报错。
  const head = `【Agent 路由】global://${stem}（桌面助手·指令指定）`;
  const lock =
    `【角色锁定】你只扮演 global://${stem}；禁止自称其它 Agent，禁止混淆产品经理与项目经理等不同职务（除非上文 Agent 全文明确允许）。`;
  if (!body.trim()) return `${head}\n${lock}`;
  return `${head}\n${lock}\n${body.trim()}`;
}
