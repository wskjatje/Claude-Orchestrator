/**
 * 上下文 / 生成预算单源（Host、本地直聊、compact、前端 prior 瘦身共用）。
 */

/** 约 80% of 100k-char budget（粗代理，非精确 tokenizer） */
export const COMPACT_CHAR_THRESHOLD = 80_000
export const COMPACT_KEEP_RECENT_TURNS = 6

/** 发送给模型的 prior 单条上限（chars） */
export const PRIOR_MESSAGE_CHAR_CAP = 6_000
/** prior 最多保留最近 user/assistant 条数 */
export const PRIOR_KEEP_RECENT = 12

/** 工具结果在消息里保留最近条数 */
export const TOOL_RESULT_KEEP_RECENT = 6

/** Host / 工具环最大轮次 */
export const HOST_MAX_TURNS = 16
export const HOST_VERIFY_EXTRA_TURNS = 4

/** 通用 HTTP / 命令超时（ms） */
export const DEFAULT_REQUEST_TIMEOUT_MS = 180_000

/** 本地直聊 Ollama 生成预算 */
export const LOCAL_DIRECT_NUM_PREDICT = 8192
export const LOCAL_DIRECT_NUM_CTX = 8192
/** 崩溃降级时的预算（仍须够写完一段方案） */
export const LOCAL_RECOVERY_NUM_PREDICT = 4096
export const LOCAL_RECOVERY_NUM_CTX = 4096
