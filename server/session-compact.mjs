/**
 * 结构化会话 compact：窗口过大时用摘要替换旧 user/assistant，保留近 N 轮原文。
 * compact 管本会话；跨会话经验仍走 memory。
 */
import { estimateMessagesChars, clearStaleToolResults } from './context-tool-results.mjs'
import {
  COMPACT_CHAR_THRESHOLD,
  COMPACT_KEEP_RECENT_TURNS,
  PRIOR_MESSAGE_CHAR_CAP,
  PRIOR_KEEP_RECENT,
} from '../shared/context-budget.mjs'

export {
  COMPACT_CHAR_THRESHOLD,
  COMPACT_KEEP_RECENT_TURNS,
  PRIOR_MESSAGE_CHAR_CAP,
  PRIOR_KEEP_RECENT,
}

/**
 * 发送前瘦 prior（Host / 本地 / 云端直连共用）：截断单条 + 只留近 N 条。
 * @param {Array<{ role?: string, content?: string, attachments?: unknown }>} prior
 * @param {{ keepRecent?: number, charCap?: number }} [opts]
 */
export function slimPriorMessagesForApi(prior, opts = {}) {
  const keep = Math.max(2, Number(opts.keepRecent) || PRIOR_KEEP_RECENT)
  const cap = Math.max(500, Number(opts.charCap) || PRIOR_MESSAGE_CHAR_CAP)
  const list = Array.isArray(prior) ? prior : []
  const filtered = list.filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
  const recent = filtered.slice(-keep)
  return recent.map((m) => {
    const content = String(m.content || '')
    const next = {
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content:
        content.length > cap
          ? content.slice(0, cap) + `\n…[prior truncated ${content.length - cap} chars]`
          : content,
    }
    if (Array.isArray(m.attachments) && m.attachments.length) {
      next.attachments = m.attachments
    }
    return next
  })
}

/**
 * @param {any[]} messages — 含 system 的完整列表
 * @returns {{ summary: string, keptFrom: number } | null}
 */
export function buildStructuredCompactSummary(messages) {
  const body = (messages || []).filter((m) => m.role === 'user' || m.role === 'assistant')
  if (body.length < COMPACT_KEEP_RECENT_TURNS + 2) return null

  const goals = []
  const decisions = []
  const todos = []
  const files = new Set()
  const errors = []

  for (const m of body) {
    const t = String(m.content || '')
    if (m.role === 'user') {
      const line = t.split('\n').find((l) => l.trim()) || ''
      if (line && goals.length < 8) goals.push(line.slice(0, 200))
    }
    for (const fm of t.matchAll(
      /(?:^|[\s`"'(])((?:src|web|server|desktop|app|lib|components|hooks|routes)\/[\w./-]+\.[a-zA-Z0-9]+)/g,
    )) {
      files.add(fm[1])
    }
    if (/决定|采用|改为|选择|default|改用/i.test(t) && decisions.length < 8) {
      decisions.push(t.slice(0, 180).replace(/\s+/g, ' '))
    }
    if (/待办|TODO|FIXME|未完成|下一步/i.test(t) && todos.length < 8) {
      todos.push(t.slice(0, 160).replace(/\s+/g, ' '))
    }
    if (/error|失败|✗|Error:|Traceback/i.test(t) && errors.length < 6) {
      errors.push(t.slice(0, 160).replace(/\s+/g, ' '))
    }
  }

  const lines = [
    '【会话摘要·compact】',
    goals.length ? `目标：\n- ${goals.slice(0, 5).join('\n- ')}` : null,
    decisions.length ? `决策：\n- ${decisions.slice(0, 5).join('\n- ')}` : null,
    files.size ? `涉及文件：${[...files].slice(0, 20).join(', ')}` : null,
    todos.length ? `待办：\n- ${todos.slice(0, 5).join('\n- ')}` : null,
    errors.length ? `近期错误：\n- ${errors.slice(0, 4).join('\n- ')}` : null,
    '（以上为压缩摘要；近几轮原文仍保留在后文。）',
  ].filter(Boolean)

  return {
    summary: lines.join('\n'),
    keptFrom: Math.max(0, body.length - COMPACT_KEEP_RECENT_TURNS),
  }
}

/**
 * 就地 compact：保留首条 system；插入摘要 user；保留最近 turns 的 user/assistant；清空旧 tool。
 * @param {any[]} messages
 * @param {{ threshold?: number, keepRecent?: number }} [opts]
 * @returns {{ compacted: boolean, beforeChars: number, afterChars: number }}
 */
export function compactMessagesIfNeeded(messages, opts = {}) {
  const threshold = Number(opts.threshold) || COMPACT_CHAR_THRESHOLD
  const beforeChars = estimateMessagesChars(messages)
  clearStaleToolResults(messages, { keepRecent: opts.keepRecentTool ?? 4 })

  if (beforeChars < threshold) {
    return { compacted: false, beforeChars, afterChars: estimateMessagesChars(messages) }
  }

  const system = messages.filter((m) => m.role === 'system')
  const rest = messages.filter((m) => m.role !== 'system')
  const built = buildStructuredCompactSummary(rest)
  if (!built) {
    return { compacted: false, beforeChars, afterChars: estimateMessagesChars(messages) }
  }

  const dialogue = rest.filter((m) => m.role === 'user' || m.role === 'assistant')
  const keepN = Number(opts.keepRecent) || COMPACT_KEEP_RECENT_TURNS
  const recent = dialogue.slice(-keepN)

  messages.length = 0
  for (const s of system) messages.push(s)
  messages.push({ role: 'user', content: built.summary })
  messages.push({
    role: 'assistant',
    content: '已理解会话摘要，将基于摘要与后续原文继续。',
  })
  for (const m of recent) messages.push({ role: m.role, content: String(m.content || '').slice(0, 6000) })

  const afterChars = estimateMessagesChars(messages)
  return { compacted: true, beforeChars, afterChars }
}
