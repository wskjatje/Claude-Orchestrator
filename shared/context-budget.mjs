/**
 * 上下文 / 生成预算单源（Host、本地直聊、compact、前端 prior 瘦身共用）。
 *
 * 原则：功能正确优先于极限省 token。
 * - Agent 可写：保留完整 prior，禁止误用 Ask 瘦身
 * - Ask/直聊：适度收紧，但仍够短答与代码摘录
 * - compact：小窗口延后触发，避免工具环中途被掏空
 */

/**
 * 自动 compact 回退阈值（无模型窗口信息时）。
 * 有 contextLength 时用 resolveCompactThresholds。
 */
export const COMPACT_CHAR_THRESHOLD = 64_000
export const COMPACT_TOKEN_THRESHOLD = 16_000
/** 大窗口（>16k）对齐 Cursor：约 80% 再压 */
export const COMPACT_TRIGGER_RATIO = 0.8
/** 小窗口（≤16k，常见本地）：90%，减少半截任务被压掉 */
export const COMPACT_TRIGGER_RATIO_SMALL = 0.9
export const COMPACT_SMALL_WINDOW_TOKENS = 16_384
/** 建议 /summarize：略早于自动压，但不骚扰短对话 */
export const CONTEXT_SUMMARIZE_HINT_RATIO = 0.8
/** 已提示后，低于此比例才熄灭（迟滞，防占用条闪烁） */
export const CONTEXT_SUMMARIZE_HINT_CLEAR_RATIO = 0.72
/**
 * Composer 占用芯片最低展示百分比。
 * 1%：/summarize 后 modelHistory 变短仍能看到「本窗/云窗」，避免「条消失像坏了」。
 */
export const CONTEXT_USAGE_CHIP_MIN_PERCENT = 1
export const DEFAULT_CLOUD_CONTEXT_TOKENS = 128_000
export const DEFAULT_LOCAL_CONTEXT_TOKENS = 8_192
/**
 * 本窗占用条采信的上下文窗口上限。
 * 超过则视为「云侧大窗误绑到 local-mcp」，改用本地默认分母，避免百分比骤降。
 */
export const LOCAL_USAGE_WINDOW_CAP = 65_536
export const COMPACT_KEEP_RECENT_TURNS = 6
/** 手动 /summarize：保留近尾（过少会丢连续任务状态） */
export const COMPACT_FORCE_KEEP_RECENT = 4
/** 自动 compact 最少对话条数（user+assistant），不足则只清旧 tool */
export const COMPACT_MIN_DIALOGUE_MESSAGES = 10

/** @param {number} chars */
export function estimateTokensFromChars(chars) {
  return Math.ceil(Math.max(0, Number(chars) || 0) / 4)
}

/**
 * 按模型窗口解析 compact 阈值。
 * @param {{
 *   contextLength?: number|null
 *   isLocal?: boolean
 *   ratio?: number
 * }} [opts]
 * @returns {{ thresholdChars: number, thresholdTokens: number, windowTokens: number, ratio: number }}
 */
export function resolveCompactThresholds(opts = {}) {
  let windowTokens = Number(opts.contextLength)
  if (!Number.isFinite(windowTokens) || windowTokens < 1024) {
    windowTokens = opts.isLocal ? DEFAULT_LOCAL_CONTEXT_TOKENS : DEFAULT_CLOUD_CONTEXT_TOKENS
  }
  windowTokens = Math.floor(windowTokens)
  const defaultRatio =
    windowTokens <= COMPACT_SMALL_WINDOW_TOKENS
      ? COMPACT_TRIGGER_RATIO_SMALL
      : COMPACT_TRIGGER_RATIO
  const ratio = Math.min(0.95, Math.max(0.5, Number(opts.ratio) || defaultRatio))
  // 小窗口至少留出约 1k token 余量，避免刚够一轮工具就压
  const thresholdTokens = Math.max(
    Math.min(4_096, Math.floor(windowTokens * 0.7)),
    Math.floor(windowTokens * ratio),
  )
  const thresholdChars = thresholdTokens * 4
  return { thresholdChars, thresholdTokens, windowTokens, ratio }
}

/** Agent / 工具环 */
export const PRIOR_MESSAGE_CHAR_CAP = 6_000
export const PRIOR_KEEP_RECENT = 12

/**
 * Ask / 直聊：适度收紧（仍保留够用的上下文，避免问答失忆）。
 * 勿再压到「只够一两句」——功能优先。
 */
export const PRIOR_KEEP_RECENT_DIRECT = 8
export const PRIOR_MESSAGE_CHAR_CAP_DIRECT = 4_000

export const TOOL_RESULT_KEEP_RECENT = 6

/**
 * MCP → 模型（对齐 Cursor 动态发现）：
 * 全文进 .claudecode/mcp-tool-catalog；请求里短描述 + 参数 schema（仍可直接 tool_calls）。
 */
export const MCP_TOOL_DESC_MAX = 96
export const MCP_PROP_DESC_MAX = 64
export const MAX_MERGED_MCP_TOOLS = 48

export const HOST_MAX_TURNS = 16
export const HOST_VERIFY_EXTRA_TURNS = 4

export const DEFAULT_REQUEST_TIMEOUT_MS = 180_000

export const LOCAL_DIRECT_NUM_PREDICT = 8192
export const LOCAL_DIRECT_NUM_CTX = 8192
/** Ask 输出：4096 够中等答复；完整方案仍走 LOCAL_DIRECT / wantsFullPlan */
export const LOCAL_ASK_NUM_PREDICT = 4096
export const LOCAL_ASK_NUM_CTX = 8192
export const LOCAL_RECOVERY_NUM_PREDICT = 4096
export const LOCAL_RECOVERY_NUM_CTX = 4096

/**
 * prior 窗口：agent-full + 可工具 → 始终完整；其余 Ask/只读才瘦身。
 * @param {{
 *   forceDirectChat?: boolean
 *   allowTools?: boolean
 *   contextLevel?: 'none'|'slim-product'|'agent-full'|string
 * }} [opts]
 * @returns {{ keepRecent: number, charCap: number }}
 */
export function resolvePriorBudget(opts = {}) {
  const level = String(opts.contextLevel || '')
  // 写代码路径：禁止误用 Ask 瘦身（功能优先）
  if (level === 'agent-full' && opts.allowTools !== false) {
    return {
      keepRecent: PRIOR_KEEP_RECENT,
      charCap: PRIOR_MESSAGE_CHAR_CAP,
    }
  }
  const slim =
    opts.forceDirectChat === true ||
    opts.allowTools === false ||
    level === 'slim-product' ||
    level === 'none'
  if (slim) {
    return {
      keepRecent: PRIOR_KEEP_RECENT_DIRECT,
      charCap: PRIOR_MESSAGE_CHAR_CAP_DIRECT,
    }
  }
  return {
    keepRecent: PRIOR_KEEP_RECENT,
    charCap: PRIOR_MESSAGE_CHAR_CAP,
  }
}

/**
 * @param {{ forceDirectChat?: boolean, wantsFullPlan?: boolean }} [opts]
 * @returns {{ num_predict: number, num_ctx: number }}
 */
export function resolveLocalGenBudget(opts = {}) {
  if (opts.wantsFullPlan) {
    return {
      num_predict: LOCAL_DIRECT_NUM_PREDICT,
      num_ctx: LOCAL_DIRECT_NUM_CTX,
    }
  }
  if (opts.forceDirectChat) {
    return {
      num_predict: LOCAL_ASK_NUM_PREDICT,
      num_ctx: LOCAL_ASK_NUM_CTX,
    }
  }
  return {
    num_predict: LOCAL_DIRECT_NUM_PREDICT,
    num_ctx: LOCAL_DIRECT_NUM_CTX,
  }
}
