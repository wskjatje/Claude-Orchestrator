/** 会话上下文占用粗估（对齐 Cursor 占用条）。
 * 有消息上的 usage.prompt_tokens 时优先用实参；否则 chars/4。
 * 只影响展示与「建议 summarize」提示，不改变发送内容。
 */

import {
  CONTEXT_SUMMARIZE_HINT_CLEAR_RATIO,
  CONTEXT_SUMMARIZE_HINT_RATIO,
  DEFAULT_CLOUD_CONTEXT_TOKENS,
  DEFAULT_LOCAL_CONTEXT_TOKENS,
  LOCAL_USAGE_WINDOW_CAP,
  estimateTokensFromChars,
  resolveCompactThresholds,
} from "../../../shared/context-budget.mjs";
import { estimateMessagesChars } from "../../../shared/compact-summary.mjs";
import { estimateTurnUsage } from "@/lib/turn-usage";
import {
  latestContextPartsFromHistory,
  type ContextParts,
} from "@/lib/context-parts";

export type ContextUsageMsg = {
  content?: string;
  role?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    /** 客户端字符粗估补全，非接口实参 */
    estimated?: boolean;
  };
  contextParts?: ContextParts | null;
};

export type ContextUsageSnapshot = {
  chars: number;
  tokens: number;
  /** 仅字符粗估，便于明细对照接口用量 */
  estimatedTokens: number;
  /** 最近一条消息上的 prompt / completion（有则展示分项） */
  lastPromptTokens: number | null;
  lastCompletionTokens: number | null;
  windowTokens: number;
  /** 0–100 */
  percent: number;
  suggestSummarize: boolean;
  compactAtPercent: number;
  /** usage=实参；estimate=字符粗估 */
  source: "usage" | "estimate";
  /** 本窗=本地小窗；云窗=云端大窗（避免 100% 被误解为云端已满） */
  windowKind: "local" | "cloud";
  /**
   * 窗口来自模型目录缓存；fallback=缺缓存或云端异常偏小，已用默认大窗。
   * UI 可标「约」以免把默认窗当成真实配额。
   */
  windowSource: "catalog" | "fallback";
  /** 有实测注入/MCP 调用或输出时才有；无则 UI 不画对应行 */
  parts: ContextParts | null;
};

/** 自尾向前取最近一次有效 usage 片段；旧会话无落盘时按末轮字符粗估回填展示 */
export function latestUsageFromHistory(
  history: ContextUsageMsg[] | null | undefined,
): { prompt: number | null; completion: number | null; estimated: boolean } {
  const list = history || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const u = list[i]?.usage;
    if (!u) continue;
    const prompt =
      typeof u.prompt_tokens === "number" && Number.isFinite(u.prompt_tokens) && u.prompt_tokens > 0
        ? Math.floor(u.prompt_tokens)
        : null;
    const completion =
      typeof u.completion_tokens === "number" &&
      Number.isFinite(u.completion_tokens) &&
      u.completion_tokens > 0
        ? Math.floor(u.completion_tokens)
        : null;
    if (prompt != null || completion != null) {
      return { prompt, completion, estimated: u.estimated === true };
    }
  }
  // 展示层回填：不写盘，仅让明细出现「最近输入/输出」
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.role !== "assistant") continue;
    const est = estimateTurnUsage(list.slice(0, i), String(list[i]?.content || ""));
    return {
      prompt: est.prompt_tokens,
      completion: est.completion_tokens > 0 ? est.completion_tokens : null,
      estimated: true,
    };
  }
  return { prompt: null, completion: null, estimated: false };
}

/** 自尾向前取最近一次有效 prompt_tokens */
export function latestPromptTokensFromHistory(
  history: ContextUsageMsg[] | null | undefined,
): number | null {
  return latestUsageFromHistory(history).prompt;
}

/**
 * @param history 会话 history（有 modelHistory 时传 model 侧更准）
 * @param opts.contextLength 模型窗口；opts.isLocal 本地默认小窗
 * @param opts.prevSuggest 上一帧是否已建议 summarize（迟滞，防闪烁）
 */
export function estimateContextUsage(
  history: ContextUsageMsg[] | null | undefined,
  opts?: {
    contextLength?: number | null;
    isLocal?: boolean;
    prevSuggest?: boolean;
  },
): ContextUsageSnapshot {
  const chars = estimateMessagesChars(history || []);
  const estimated = estimateTokensFromChars(chars);
  const lastUsage = latestUsageFromHistory(history);
  const fromUsage = lastUsage.prompt;
  // 实参优先；本地改 history 后粗估更大时抬一点，避免条「假空」
  // 但实参明显大于粗估×3 时仍信实参（真窗口用量）
  let tokens: number;
  let source: "usage" | "estimate";
  if (fromUsage != null && !lastUsage.estimated) {
    source = "usage";
    tokens = Math.max(fromUsage, Math.floor(estimated * 0.5));
  } else if (fromUsage != null) {
    // 有分项粗估行，但计量仍标「字符粗估」
    source = "estimate";
    tokens = Math.max(fromUsage, Math.floor(estimated * 0.5));
  } else {
    source = "estimate";
    tokens = estimated;
  }
  let contextLength = opts?.contextLength;
  let windowSource: "catalog" | "fallback" = "catalog";
  // 云端无缓存时勿落到本地小窗；缓存异常偏小（<32k）且非本地时改用云端默认
  if (!opts?.isLocal) {
    const cl = Number(contextLength);
    if (!Number.isFinite(cl) || cl < 32_768) {
      contextLength = DEFAULT_CLOUD_CONTEXT_TOKENS;
      windowSource = "fallback";
    }
  } else {
    // 本窗：强制本地分母。缺探测 → 默认小窗+估算；云侧大窗误绑 → 改回本地默认（不算估算噪声）
    const cl = Number(contextLength);
    if (!Number.isFinite(cl) || cl < 1024) {
      contextLength = DEFAULT_LOCAL_CONTEXT_TOKENS;
      windowSource = "fallback";
    } else if (cl > LOCAL_USAGE_WINDOW_CAP) {
      contextLength = DEFAULT_LOCAL_CONTEXT_TOKENS;
      windowSource = "catalog";
    }
  }
  const th = resolveCompactThresholds({
    contextLength,
    isLocal: opts?.isLocal,
  });
  const ratio = tokens / Math.max(1, th.windowTokens);
  const percent = Math.min(100, Math.round(ratio * 100));
  const show =
    opts?.prevSuggest === true
      ? ratio >= CONTEXT_SUMMARIZE_HINT_CLEAR_RATIO
      : ratio >= CONTEXT_SUMMARIZE_HINT_RATIO;
  const windowKind: "local" | "cloud" = opts?.isLocal ? "local" : "cloud";
  return {
    chars,
    tokens,
    estimatedTokens: estimated,
    lastPromptTokens: lastUsage.prompt,
    lastCompletionTokens: lastUsage.completion,
    windowTokens: th.windowTokens,
    percent,
    suggestSummarize: show,
    compactAtPercent: Math.round(100 * (th.thresholdTokens / th.windowTokens)),
    source,
    windowKind,
    windowSource,
    parts: latestContextPartsFromHistory(history),
  };
}
