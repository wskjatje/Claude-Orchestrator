'use strict'

/**
 * 链步骤执行错误分类 — 按错误文本区分可重试与不可重试错误。
 *
 * 参考 mco-org/mco runtime/errors.py 设计：
 *   RETRYABLE：timeout / rate_limit / transient_network
 *   NON_RETRYABLE：auth / invalid_input / unsupported
 *   UNKNOWN：无法分类
 */

/** 可重试的错误类型集 */
const RETRYABLE_KINDS = new Set(['timeout', 'rate_limit', 'transient_network'])

/** 最大重试次数 */
const MAX_RETRIES = 3

/** 指数退避基准（毫秒） */
const BASE_DELAY_MS = 2000

/**
 * @param {string} msg 错误消息原文
 * @returns {string} 错误分类标识
 */
function classifyChainError(msg) {
  const text = String(msg || '').toLowerCase()

  // 超时
  if (
    /\b(timed?\s*out|timeout|etimedout|econnaborted)\b/i.test(text) ||
    /\bexit\s+code\s+(124|142)\b/i.test(text) ||
    /killed\s+by\s+signal/i.test(text)
  ) {
    return 'timeout'
  }

  // 限流
  if (
    /\brate\s*limit/i.test(text) ||
    /\b429\b/.test(text) ||
    /too\s+many\s+requests/i.test(text)
  ) {
    return 'rate_limit'
  }

  // 临时网络错误
  if (
    /\b(connection\s+reset|temporary\s+failure|econnreset|ehostunreach|enetunreach|econnrefused)\b/i.test(text) ||
    /\bnetwork\s+(error|failure|unreachable)\b/i.test(text) ||
    /couldn'?t\s+connect\s+to\s+server/i.test(text)
  ) {
    return 'transient_network'
  }

  // 认证错误（不可重试）
  if (
    /\b(invalid\s+api\s+key|unauthorized|authentication\s+failed|auth\s+failed|not\s+logged\s+in)\b/i.test(text) ||
    /\b401\b/.test(text) ||
    /\b403\b/.test(text)
  ) {
    return 'auth'
  }

  // 无效输入（不可重试）
  if (
    /\b(invalid\s+input|validation\s+failed|missing\s+required|invalid\s+type)\b/i.test(text)
  ) {
    return 'invalid_input'
  }

  // 不支持的能力（不可重试）
  if (
    /unsupported\s+capability/i.test(text) ||
    /not\s+supported/i.test(text) ||
    /unknown\s+arguments/i.test(text)
  ) {
    return 'unsupported'
  }

  return 'unknown'
}

/**
 * 计算指数退避延迟
 * @param {number} attempt 当前第几次重试（从 1 开始）
 * @returns {number} 延迟毫秒数
 */
function retryDelayMs(attempt) {
  const base = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), 30000)
  // 加入最多 25% 的随机抖动，避免所有重试同时发出
  const jitter = 1 + (Math.random() - 0.5) * 0.5
  return Math.round(base * jitter)
}

/**
 * 判断错误是否应该重试
 * @param {string} errorKind 错误分类
 * @returns {boolean}
 */
function shouldRetry(errorKind) {
  return RETRYABLE_KINDS.has(errorKind)
}

/**
 * 判断重试次数是否已达上限
 * @param {number} attempts 已尝试次数
 * @returns {boolean}
 */
function isMaxRetries(attempts) {
  return attempts >= MAX_RETRIES
}

/**
 * 生成人类可读的错误说明
 * @param {string} errorKind 错误分类
 * @param {number} attempts 已尝试次数
 * @returns {string}
 */
function retryHint(errorKind, attempts) {
  const labels = {
    timeout: '超时',
    rate_limit: '限流',
    transient_network: '网络异常',
    auth: '认证失败',
    invalid_input: '输入无效',
    unsupported: '不支持',
    unknown: '未知错误',
  }
  const label = labels[errorKind] || errorKind
  if (shouldRetry(errorKind)) {
    if (isMaxRetries(attempts)) {
      return `${label}（已重试 ${attempts} 次达上限，暂停）`
    }
    return `${label}（第 ${attempts} 次失败，将自动重试…）`
  }
  return `${label}（不可重试，暂停）`
}

module.exports = {
  classifyChainError,
  retryDelayMs,
  shouldRetry,
  isMaxRetries,
  retryHint,
  MAX_RETRIES,
  RETRYABLE_KINDS,
}
