/**
 * 会话摘要 / compact 纯逻辑（无 fs）。
 * 对齐 Cursor 摘要字段形态：目标、技术要点、文件、错误、待办、当前步骤；
 * 自动保留近尾；手动 force 更狠。
 */
import {
  COMPACT_CHAR_THRESHOLD,
  COMPACT_KEEP_RECENT_TURNS,
  COMPACT_TOKEN_THRESHOLD,
  estimateTokensFromChars,
} from './context-budget.mjs'

/** @param {string} line */
export function isSummarizeSlashCommand(line) {
  const s = String(line || '').trim()
  // 中文无 \b；英文命令后允许空白或结束
  return /^\/(?:summarize|compress|compact)(?:\s|$)/i.test(s) || /^\/(?:压缩上下文|压缩)(?:\s|$)/.test(s)
}

/**
 * @param {any[]} messages
 * @returns {number}
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

/** @param {any[]} messages */
export function estimateMessagesTokens(messages) {
  return estimateTokensFromChars(estimateMessagesChars(messages))
}

/**
 * @param {any[]} messages — user/assistant（可含 system，会被忽略进摘要体）
 * @returns {{ summary: string, keptFrom: number, archiveHint?: string } | null}
 */
export function buildStructuredCompactSummary(messages) {
  const body = (messages || []).filter((m) => m.role === 'user' || m.role === 'assistant')
  if (body.length < COMPACT_KEEP_RECENT_TURNS + 2) return null

  const goals = []
  const tech = []
  const decisions = []
  const todos = []
  const files = new Set()
  const errors = []
  let currentStep = ''

  for (let i = 0; i < body.length; i++) {
    const m = body[i]
    const t = String(m.content || '')
    if (m.role === 'user') {
      const line = t.split('\n').find((l) => l.trim()) || ''
      if (line && goals.length < 8) goals.push(line.slice(0, 200))
      currentStep = line.slice(0, 160) || currentStep
    } else if (m.role === 'assistant' && i >= body.length - 3) {
      const first = t.split('\n').find((l) => l.trim()) || ''
      if (first && tech.length < 6) tech.push(first.slice(0, 160).replace(/\s+/g, ' '))
    }
    for (const fm of t.matchAll(
      /(?:^|[\s`"'(])((?:src|web|server|desktop|app|lib|components|hooks|routes|shared|scripts|docs)\/[\w./-]+\.[a-zA-Z0-9]+)/g,
    )) {
      files.add(fm[1])
    }
    if (/决定|采用|改为|选择|default|改用|改为用/i.test(t) && decisions.length < 8) {
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
    goals.length ? `目标 / 意图：\n- ${goals.slice(0, 5).join('\n- ')}` : null,
    tech.length ? `技术要点：\n- ${tech.slice(0, 4).join('\n- ')}` : null,
    decisions.length ? `决策：\n- ${decisions.slice(0, 5).join('\n- ')}` : null,
    files.size ? `涉及文件：${[...files].slice(0, 20).join(', ')}` : null,
    todos.length ? `待办：\n- ${todos.slice(0, 5).join('\n- ')}` : null,
    errors.length ? `近期错误与修复线索：\n- ${errors.slice(0, 4).join('\n- ')}` : null,
    currentStep ? `当前步骤：${currentStep}` : null,
    '（有损压缩；细节不足时可说明要回查的文件/工具结果路径。）',
  ].filter(Boolean)

  return {
    summary: lines.join('\n'),
    keptFrom: Math.max(0, body.length - COMPACT_KEEP_RECENT_TURNS),
  }
}

/**
 * 是否应触发自动 compact（字符或估算 token 任一过阈）。
 * @param {number} chars
 * @param {{ thresholdChars?: number, thresholdTokens?: number }} [opts]
 */
export function shouldAutoCompact(chars, opts = {}) {
  const c = Number(chars) || 0
  const thC = Number(opts.thresholdChars) || COMPACT_CHAR_THRESHOLD
  const thT = Number(opts.thresholdTokens) || COMPACT_TOKEN_THRESHOLD
  return c >= thC || estimateTokensFromChars(c) >= thT
}

/**
 * 压缩对话数组（不含 system 外置逻辑）：返回新 messages 列表主体。
 * @param {any[]} dialogue — user/assistant/tool
 * @param {{
 *   keepRecent?: number
 *   force?: boolean
 *   archivePath?: string
 *   charCapRecent?: number
 * }} [opts]
 * @returns {{
 *   ok: boolean
 *   messages: any[]
 *   summary: string
 *   beforeChars: number
 *   afterChars: number
 *   dropped: any[]
 * } | null}
 */
export function compactDialogueBody(dialogue, opts = {}) {
  const body = (dialogue || []).filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
  const beforeChars = estimateMessagesChars(dialogue || [])
  const built = buildStructuredCompactSummary(body)
  if (!built) return null

  const force = Boolean(opts.force)
  const keepN = force
    ? Math.max(0, Number(opts.keepRecent) || 2)
    : Math.max(2, Number(opts.keepRecent) || COMPACT_KEEP_RECENT_TURNS)
  const recent = keepN > 0 ? body.slice(-keepN) : []
  const dropped = body.slice(0, Math.max(0, body.length - keepN))
  const cap = Math.max(500, Number(opts.charCapRecent) || 6_000)

  let summary = built.summary
  if (opts.archivePath) {
    summary += `\n归档：${opts.archivePath}（需要细节时请 read_file 该路径）`
  }

  /** @type {any[]} */
  const next = [
    { role: 'user', content: summary },
    {
      role: 'assistant',
      content: force
        ? '已按手动压缩重建上下文；将基于摘要继续。'
        : '已理解会话摘要，将基于摘要与后续原文继续。',
    },
  ]
  for (const m of recent) {
    next.push({ role: m.role, content: String(m.content || '').slice(0, cap) })
  }

  return {
    ok: true,
    messages: next,
    summary,
    beforeChars,
    afterChars: estimateMessagesChars(next),
    dropped,
  }
}
