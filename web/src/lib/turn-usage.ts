/** 回合 usage：优先接口实参，否则按字符粗估（标 estimated，勿冒充接口用量）。 */

import { estimateTokensFromChars } from "../../../shared/context-budget.mjs";
import { estimateMessagesChars } from "../../../shared/compact-summary.mjs";

export type TurnUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** true=字符粗估，明细计量应显示「字符粗估」而非「接口用量」 */
  estimated?: boolean;
};

function floorPos(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}

/** 归一化 OpenAI / Ollama / Anthropic 风格 usage 字段 */
export function normalizeApiUsage(raw: unknown): TurnUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const prompt = floorPos(
    u.prompt_tokens ?? u.input_tokens ?? u.prompt_eval_count,
  );
  const completion = floorPos(
    u.completion_tokens ?? u.output_tokens ?? u.eval_count,
  );
  if (prompt <= 0 && completion <= 0) return null;
  const total =
    floorPos(u.total_tokens) || prompt + completion;
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: total,
  };
}

/** 按「当前 history（含本轮 user）+ assistant 正文」粗估本回合 */
export function estimateTurnUsage(
  historyThroughUser: { content?: string; role?: string }[] | null | undefined,
  assistantContent: string,
): TurnUsage {
  const prompt = estimateTokensFromChars(
    estimateMessagesChars(historyThroughUser || []),
  );
  const completion = estimateTokensFromChars(
    String(assistantContent || "").length,
  );
  return {
    prompt_tokens: Math.max(1, prompt),
    completion_tokens: Math.max(0, completion),
    total_tokens: Math.max(1, prompt) + Math.max(0, completion),
    estimated: true,
  };
}

/** 接口有则用之；否则粗估并标 estimated */
export function resolveTurnUsage(
  apiUsage: unknown,
  historyThroughUser: { content?: string; role?: string }[] | null | undefined,
  assistantContent: string,
): TurnUsage {
  return (
    normalizeApiUsage(apiUsage) ||
    estimateTurnUsage(historyThroughUser, assistantContent)
  );
}
