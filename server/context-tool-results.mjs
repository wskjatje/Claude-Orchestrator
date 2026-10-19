/**
 * 工具结果外置 / 截断 / 旧结果清空（Host 会话上下文管理）
 * 对齐 Anthropic tool-result clearing：可再取的大结果不长期占窗口。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { TOOL_RESULT_KEEP_RECENT } from '../shared/context-budget.mjs'

/** 单条 tool 结果进模型的字符上限（超出则外置） */
export const TOOL_RESULT_INLINE_MAX = 8_000
/** 仍小于此则直接截断，不落盘 */
export const TOOL_RESULT_TRUNCATE_ONLY = 12_000
export { TOOL_RESULT_KEEP_RECENT }

/**
 * @param {unknown} result
 * @returns {string}
 */
export function stringifyToolResult(result) {
  try {
    if (typeof result === 'string') return result
    return JSON.stringify(result ?? null)
  } catch {
    return String(result)
  }
}

/**
 * @param {string} workspaceRoot
 * @param {string} toolName
 * @param {string} raw
 * @returns {{ content: string, offloaded?: string, truncated?: boolean }}
 */
export function maybeOffloadToolResult(workspaceRoot, toolName, raw) {
  const text = String(raw || '')
  if (text.length <= TOOL_RESULT_INLINE_MAX) {
    return { content: text }
  }
  const root = String(workspaceRoot || '').trim()
  if (!root) {
    return {
      content:
        text.slice(0, TOOL_RESULT_INLINE_MAX) +
        `\n…[truncated ${text.length - TOOL_RESULT_INLINE_MAX} chars]`,
      truncated: true,
    }
  }
  try {
    const dir = path.join(root, '.claudecode', 'tool-results')
    fs.mkdirSync(dir, { recursive: true })
    const hash = crypto.createHash('sha1').update(text).digest('hex').slice(0, 12)
    const safeName = String(toolName || 'tool').replace(/[^\w.-]+/g, '_').slice(0, 40)
    const file = path.join(dir, `${Date.now()}-${safeName}-${hash}.json`)
    fs.writeFileSync(file, text, 'utf8')
    const rel = path.relative(root, file).replace(/\\/g, '/')
    const preview = text.slice(0, 1_200)
    return {
      content: JSON.stringify({
        ok: true,
        offloaded: true,
        path: rel,
        bytes: text.length,
        preview,
        note: '完整结果已外置；需要细节时再 read_file 该路径或重跑工具。',
      }),
      offloaded: rel,
      truncated: true,
    }
  } catch {
    return {
      content:
        text.slice(0, TOOL_RESULT_INLINE_MAX) +
        `\n…[truncated ${text.length - TOOL_RESULT_INLINE_MAX} chars]`,
      truncated: true,
    }
  }
}

/**
 * 清空历史深处的 tool 消息内容，保留近 N 条完整结果。
 * @param {any[]} messages
 * @param {{ keepRecent?: number }} [opts]
 * @returns {{ cleared: number }}
 */
export function clearStaleToolResults(messages, opts = {}) {
  const keep = Math.max(0, Number(opts.keepRecent) ?? TOOL_RESULT_KEEP_RECENT)
  const idxs = []
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.role === 'tool') idxs.push(i)
  }
  if (idxs.length <= keep) return { cleared: 0 }
  const drop = idxs.slice(0, idxs.length - keep)
  let cleared = 0
  for (const i of drop) {
    const m = messages[i]
    const prev = String(m.content || '')
    if (prev.length <= 80 && /已清空|cleared|offloaded/i.test(prev)) continue
    messages[i] = {
      ...m,
      content: JSON.stringify({
        cleared: true,
        note: '旧工具结果已清空以节省上下文；需要时请重新调用该工具。',
      }),
    }
    cleared += 1
  }
  return { cleared }
}

/**
 * 估算 messages 总字符（粗略 token 代理）
 * @param {any[]} messages
 */
export function estimateMessagesChars(messages) {
  let n = 0
  for (const m of messages || []) {
    n += String(m?.content || '').length
    if (Array.isArray(m?.tool_calls)) {
      try {
        n += JSON.stringify(m.tool_calls).length
      } catch {
        /* ignore */
      }
    }
  }
  return n
}
