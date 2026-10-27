/** @see context-budget.mjs */
export const COMPACT_CHAR_THRESHOLD: number;
export const COMPACT_TOKEN_THRESHOLD: number;
export const COMPACT_TRIGGER_RATIO: number;
export const COMPACT_TRIGGER_RATIO_SMALL: number;
export const COMPACT_SMALL_WINDOW_TOKENS: number;
export const CONTEXT_SUMMARIZE_HINT_RATIO: number;
export const CONTEXT_SUMMARIZE_HINT_CLEAR_RATIO: number;
export const CONTEXT_USAGE_CHIP_MIN_PERCENT: number;
export const DEFAULT_CLOUD_CONTEXT_TOKENS: number;
export const DEFAULT_LOCAL_CONTEXT_TOKENS: number;
export const LOCAL_USAGE_WINDOW_CAP: number;
export const COMPACT_KEEP_RECENT_TURNS: number;
export const COMPACT_FORCE_KEEP_RECENT: number;
export const COMPACT_MIN_DIALOGUE_MESSAGES: number;
export function estimateTokensFromChars(chars: number): number;
export function resolveCompactThresholds(opts?: {
  contextLength?: number | null;
  isLocal?: boolean;
  ratio?: number;
}): {
  thresholdChars: number;
  thresholdTokens: number;
  windowTokens: number;
  ratio: number;
};
export const PRIOR_MESSAGE_CHAR_CAP: number;
export const PRIOR_KEEP_RECENT: number;
export const PRIOR_KEEP_RECENT_DIRECT: number;
export const PRIOR_MESSAGE_CHAR_CAP_DIRECT: number;
export const TOOL_RESULT_KEEP_RECENT: number;
export const MCP_TOOL_DESC_MAX: number;
export const MCP_PROP_DESC_MAX: number;
export const MAX_MERGED_MCP_TOOLS: number;
export const HOST_MAX_TURNS: number;
export const HOST_VERIFY_EXTRA_TURNS: number;
export const DEFAULT_REQUEST_TIMEOUT_MS: number;
export const LOCAL_DIRECT_NUM_PREDICT: number;
export const LOCAL_DIRECT_NUM_CTX: number;
export const LOCAL_ASK_NUM_PREDICT: number;
export const LOCAL_ASK_NUM_CTX: number;
export const LOCAL_RECOVERY_NUM_PREDICT: number;
export const LOCAL_RECOVERY_NUM_CTX: number;

export function resolvePriorBudget(opts?: {
  forceDirectChat?: boolean;
  allowTools?: boolean;
  contextLevel?: "none" | "slim-product" | "agent-full" | string;
}): { keepRecent: number; charCap: number };

export function resolveLocalGenBudget(opts?: {
  forceDirectChat?: boolean;
  wantsFullPlan?: boolean;
}): { num_predict: number; num_ctx: number };
