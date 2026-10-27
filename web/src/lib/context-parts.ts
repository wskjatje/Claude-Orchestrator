/** 上下文分桶：只统计本轮实际注入 / MCP 调用与工具输出，再按 chars/4 粗估 token。
 * 无测量值则不写字段（禁止虚构 Rules/MCP 行）。
 */

import { estimateTokensFromChars } from "../../../shared/context-budget.mjs";
import { isMcpToolName } from "@/lib/compress-agent-display";

export type ContextParts = {
  /** 本轮注入的项目规则片段（含标题）粗估 token */
  rulesEstTokens?: number;
  /** 本轮 MCP 工具 output 合计粗估 token（仅 mcp__*；无 output 不计 token） */
  mcpEstTokens?: number;
  /** 本轮 mcp__* 工具事件次数（有调用即可计，不依赖 output） */
  mcpCallCount?: number;
};

export type ContextPartsMsg = {
  contextParts?: ContextParts | null;
};

type Toolish = {
  type?: string;
  name?: string;
  tool?: string;
  output?: string;
} | null;

/** 由实测字符得到粗估 token；≤0 → undefined */
export function estTokensFromMeasuredChars(chars: number): number | undefined {
  const n = Math.floor(Number(chars) || 0);
  if (n <= 0) return undefined;
  const t = estimateTokensFromChars(n);
  return t > 0 ? t : undefined;
}

function mcpNameOf(e: Toolish): string {
  if (!e) return "";
  return String(e.name || e.tool || "").trim();
}

function isMcpToolEvent(e: Toolish): boolean {
  if (!e) return false;
  if (e.type && e.type !== "tool") return false;
  return isMcpToolName(mcpNameOf(e));
}

/** 汇总 MCP 工具的 output 字数（无 output 的事件计 0，不猜） */
export function measureMcpOutputChars(
  events?: Toolish[] | null,
  toolTrace?: Toolish[] | null,
): number {
  let n = 0;
  for (const e of events || []) {
    if (!isMcpToolEvent(e)) continue;
    n += String(e?.output || "").length;
  }
  for (const e of toolTrace || []) {
    if (!isMcpToolName(mcpNameOf(e))) continue;
    n += String(e?.output || "").length;
  }
  return n;
}

/** 统计 mcp__* 调用次数：优先 stream 事件；无则看 toolTrace（避免两边重复计次） */
export function measureMcpCallCount(
  events?: Toolish[] | null,
  toolTrace?: Toolish[] | null,
): number {
  let n = 0;
  for (const e of events || []) {
    if (isMcpToolEvent(e)) n += 1;
  }
  if (n > 0) return n;
  for (const e of toolTrace || []) {
    if (isMcpToolName(mcpNameOf(e))) n += 1;
  }
  return n;
}

/**
 * 仅在有实测注入/MCP 调用或输出时组装 contextParts。
 * skill 暂不单列（无 Cursor 对等桶约定时不扩）。
 */
export function buildContextParts(opts: {
  rulesSnippet?: string | null;
  streamEvents?: Toolish[] | null;
  toolTrace?: Toolish[] | null;
}): ContextParts | undefined {
  const rulesEstTokens = estTokensFromMeasuredChars(String(opts.rulesSnippet || "").length);
  const mcpEstTokens = estTokensFromMeasuredChars(
    measureMcpOutputChars(opts.streamEvents, opts.toolTrace),
  );
  const calls = measureMcpCallCount(opts.streamEvents, opts.toolTrace);
  const mcpCallCount = calls > 0 ? calls : undefined;
  if (rulesEstTokens == null && mcpEstTokens == null && mcpCallCount == null) {
    return undefined;
  }
  return {
    ...(rulesEstTokens != null ? { rulesEstTokens } : {}),
    ...(mcpEstTokens != null ? { mcpEstTokens } : {}),
    ...(mcpCallCount != null ? { mcpCallCount } : {}),
  };
}

export function hasMeasuredContextParts(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as ContextParts;
  return (
    (typeof p.rulesEstTokens === "number" && p.rulesEstTokens > 0) ||
    (typeof p.mcpEstTokens === "number" && p.mcpEstTokens > 0) ||
    (typeof p.mcpCallCount === "number" && p.mcpCallCount > 0)
  );
}

/** 自尾向前取最近一条带 contextParts 的消息 */
export function latestContextPartsFromHistory(
  history: ContextPartsMsg[] | null | undefined,
): ContextParts | null {
  const list = history || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]?.contextParts;
    if (hasMeasuredContextParts(p)) return p as ContextParts;
  }
  return null;
}
