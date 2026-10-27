/** 与 shared/context-budget.mjs + server/session-compact.mjs 对齐（前端发送前瘦历史） */

import {
  PRIOR_MESSAGE_CHAR_CAP as SHARED_CHAR_CAP,
  PRIOR_KEEP_RECENT as SHARED_KEEP,
  PRIOR_KEEP_RECENT_DIRECT,
  PRIOR_MESSAGE_CHAR_CAP_DIRECT,
  resolvePriorBudget,
} from "../../../shared/context-budget.mjs";

export const PRIOR_MESSAGE_CHAR_CAP = SHARED_CHAR_CAP;
export const PRIOR_KEEP_RECENT = SHARED_KEEP;
export { PRIOR_KEEP_RECENT_DIRECT, PRIOR_MESSAGE_CHAR_CAP_DIRECT, resolvePriorBudget };

export type SlimPriorTurn = {
  role: "user" | "assistant";
  content: string;
  attachments?: unknown[];
};

export function slimPriorMessagesForApi<T extends SlimPriorTurn>(
  prior: T[],
  opts?: { keepRecent?: number; charCap?: number },
): T[] {
  const keep = Math.max(2, Number(opts?.keepRecent) || PRIOR_KEEP_RECENT);
  const cap = Math.max(500, Number(opts?.charCap) || PRIOR_MESSAGE_CHAR_CAP);
  const filtered = (prior || []).filter((m) => m && (m.role === "user" || m.role === "assistant"));
  const recent = filtered.slice(-keep);
  return recent.map((m) => {
    const content = String(m.content || "");
    const next = {
      ...m,
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content:
        content.length > cap
          ? content.slice(0, cap) + `\n…[prior truncated ${content.length - cap} chars]`
          : content,
    };
    return next as T;
  });
}
