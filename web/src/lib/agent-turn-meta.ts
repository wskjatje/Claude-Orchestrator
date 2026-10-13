/** 从会话历史提取最近一轮 Agent 写盘/验证元数据，供续跑注入 */

import type { StreamAgentEvent } from "@/lib/stream-agent-events";

export type AgentTurnMeta = {
  writtenPaths?: string[];
  verified?: boolean;
  /** cli=Claude CLI；host=Host 内置工具；local=本地 MCP 编排 */
  backend?: "cli" | "host" | "local";
  /** 本轮轨迹中是否出现 mcp__ 工具调用（与 backend=local 无关） */
  mcpUsed?: boolean;
  /** 过程轨迹真相源（与 content 分离） */
  streamEvents?: StreamAgentEvent[];
  /** 可选短摘要，不替代过程 */
  summary?: string;
};

type HistMsg = {
  role: string;
  content?: string;
  agentTurn?: AgentTurnMeta;
  requestError?: boolean;
};

/** 最近一条非错误助手消息上的 agentTurn */
export function lastAgentTurnMeta(history: HistMsg[]): AgentTurnMeta | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m?.role !== "assistant" || m.requestError) continue;
    if (
      m.agentTurn &&
      (m.agentTurn.writtenPaths?.length ||
        m.agentTurn.verified != null ||
        m.agentTurn.streamEvents?.length)
    ) {
      return m.agentTurn;
    }
    // 兼容：路径行 / Edit 轨迹 / 静音脚注
    const content = String(m.content || "");
    const pathLine = content.match(/^路径[：:]\s*(.+)$/m)?.[1]?.trim();
    const editPaths = [
      ...content.matchAll(/^⋯\s+(?:Edit|Write)\s*[·•]\s*(.+)$/gim),
    ]
      .map((x) => String(x[1] || "").trim().replace(/[…]+$/, ""))
      .filter(Boolean);
    const verified = /测试[：:].*已跑|· verified|\d+\s+passed/i.test(content);
    const backend = /Claude CLI/i.test(content)
      ? ("cli" as const)
      : /本地\s*MCP|local-mcp|本地MCP/i.test(content)
        ? ("local" as const)
        : /Host Agent/i.test(content)
          ? ("host" as const)
          : undefined;
    const mcpUsed = /mcp__/i.test(content);
    const fromPathLine =
      pathLine && pathLine !== "—"
        ? pathLine
            .replace(/…$/, "")
            .split(/[,，]\s*/)
            .map((p) => p.trim())
            .filter((p) => p && p !== "—")
        : [];
    const writtenPaths = [...new Set([...fromPathLine, ...editPaths])].slice(0, 40);
    if (writtenPaths.length) return { writtenPaths, verified, backend, ...(mcpUsed ? { mcpUsed } : {}) };
  }
  return null;
}

/** 注入到本轮 userLine 的短上下文（无冗余） */
export function formatAgentTurnMetaAppendix(meta: AgentTurnMeta | null): string {
  if (!meta?.writtenPaths?.length && !meta?.verified) return "";
  const paths = (meta.writtenPaths || []).slice(0, 12).join(", ");
  const lines = ["【上轮 Agent】"];
  if (paths) lines.push(`已写入：${paths}`);
  if (meta.verified != null) lines.push(`测试：${meta.verified ? "已验证" : "未验证"}`);
  if (meta.backend) lines.push(`后端：${meta.backend}`);
  return lines.join("\n");
}
