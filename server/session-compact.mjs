/**
 * 结构化会话 compact：窗口过大时用摘要替换旧 user/assistant，保留近 N 轮原文。
 * compact 管本会话；跨会话经验仍走 memory。
 * 对齐 Cursor：自动保近尾；手动 force 更狠；旧对话可归档供 read_file 回查。
 */
import fs from 'node:fs'
import path from 'node:path'
import { clearStaleToolResults, estimateMessagesChars } from './context-tool-results.mjs'
import {
  COMPACT_CHAR_THRESHOLD,
  COMPACT_TOKEN_THRESHOLD,
  COMPACT_KEEP_RECENT_TURNS,
  COMPACT_FORCE_KEEP_RECENT,
  COMPACT_MIN_DIALOGUE_MESSAGES,
  PRIOR_MESSAGE_CHAR_CAP,
  PRIOR_KEEP_RECENT,
  PRIOR_KEEP_RECENT_DIRECT,
  PRIOR_MESSAGE_CHAR_CAP_DIRECT,
  resolvePriorBudget,
  resolveLocalGenBudget,
  resolveCompactThresholds,
} from '../shared/context-budget.mjs'
import {
  buildStructuredCompactSummary,
  compactDialogueBody,
  shouldAutoCompact,
  isSummarizeSlashCommand,
  estimateMessagesTokens,
} from '../shared/compact-summary.mjs'

export {
  COMPACT_CHAR_THRESHOLD,
  COMPACT_TOKEN_THRESHOLD,
  COMPACT_KEEP_RECENT_TURNS,
  COMPACT_FORCE_KEEP_RECENT,
  COMPACT_MIN_DIALOGUE_MESSAGES,
  PRIOR_MESSAGE_CHAR_CAP,
  PRIOR_KEEP_RECENT,
  PRIOR_KEEP_RECENT_DIRECT,
  PRIOR_MESSAGE_CHAR_CAP_DIRECT,
  resolvePriorBudget,
  resolveLocalGenBudget,
  resolveCompactThresholds,
  buildStructuredCompactSummary,
  shouldAutoCompact,
  isSummarizeSlashCommand,
  estimateMessagesTokens,
  estimateMessagesChars,
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
 * @param {string} workspaceRoot
 * @param {any[]} dropped
 * @returns {string} relative path or ''
 */
function archiveDroppedTurns(workspaceRoot, dropped) {
  const root = String(workspaceRoot || '').trim()
  if (!root || !dropped?.length) return ''
  try {
    const dir = path.join(root, '.claudecode', 'compact-archive')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${Date.now()}-turns.jsonl`)
    const lines = dropped.map((m) =>
      JSON.stringify({
        role: m.role,
        content: String(m.content || '').slice(0, 50_000),
        ts: Date.now(),
      }),
    )
    fs.writeFileSync(file, `${lines.join('\n')}\n`, 'utf8')
    return path.relative(root, file).replace(/\\/g, '/')
  } catch {
    return ''
  }
}

/**
 * 就地 compact：保留 system；插入摘要；保留最近 turns；清空旧 tool。
 * @param {any[]} messages
 * @param {{
 *   threshold?: number
 *   thresholdTokens?: number
 *   keepRecent?: number
 *   keepRecentTool?: number
 *   force?: boolean
 *   workspaceRoot?: string
 *   contextLength?: number|null
 *   isLocal?: boolean
 * }} [opts]
 * @returns {{
 *   compacted: boolean
 *   beforeChars: number
 *   afterChars: number
 *   archivePath?: string
 *   beforeTokens?: number
 *   afterTokens?: number
 * }}
 */
export function compactMessagesIfNeeded(messages, opts = {}) {
  const force = Boolean(opts.force)
  const beforeChars = estimateMessagesChars(messages)
  const beforeTokens = estimateTokensFromMessages(beforeChars)
  clearStaleToolResults(messages, { keepRecent: opts.keepRecentTool ?? 4 })

  const modelTh = resolveCompactThresholds({
    contextLength: opts.contextLength,
    isLocal: opts.isLocal,
  })
  const thresholdChars = Number(opts.threshold) || modelTh.thresholdChars
  const thresholdTokens = Number(opts.thresholdTokens) || modelTh.thresholdTokens

  const system = messages.filter((m) => m.role === 'system')
  const rest = messages.filter((m) => m.role !== 'system')
  const dialogue = rest.filter((m) => m.role === 'user' || m.role === 'assistant')

  // 功能优先：对话太短不自动压（手动 force 除外）
  if (!force && dialogue.length < COMPACT_MIN_DIALOGUE_MESSAGES) {
    return {
      compacted: false,
      beforeChars,
      afterChars: estimateMessagesChars(messages),
      beforeTokens,
      afterTokens: estimateTokensFromMessages(estimateMessagesChars(messages)),
    }
  }

  if (
    !force &&
    !shouldAutoCompact(beforeChars, {
      thresholdChars,
      thresholdTokens,
    })
  ) {
    return {
      compacted: false,
      beforeChars,
      afterChars: estimateMessagesChars(messages),
      beforeTokens,
      afterTokens: estimateTokensFromMessages(estimateMessagesChars(messages)),
    }
  }

  const keepN = force
    ? Number(opts.keepRecent) || COMPACT_FORCE_KEEP_RECENT
    : Number(opts.keepRecent) || COMPACT_KEEP_RECENT_TURNS

  const droppedPreview =
    keepN > 0 ? dialogue.slice(0, Math.max(0, dialogue.length - keepN)) : dialogue
  const archivePath = archiveDroppedTurns(opts.workspaceRoot || '', droppedPreview)

  const packed = compactDialogueBody(rest, {
    keepRecent: keepN,
    force,
    archivePath: archivePath || undefined,
  })
  if (!packed) {
    return {
      compacted: false,
      beforeChars,
      afterChars: estimateMessagesChars(messages),
      beforeTokens,
      afterTokens: beforeTokens,
    }
  }

  messages.length = 0
  for (const s of system) messages.push(s)
  for (const m of packed.messages) messages.push(m)

  const afterChars = estimateMessagesChars(messages)
  return {
    compacted: true,
    beforeChars,
    afterChars,
    archivePath: archivePath || undefined,
    beforeTokens,
    afterTokens: estimateTokensFromMessages(afterChars),
  }
}

function estimateTokensFromMessages(chars) {
  return Math.ceil(Math.max(0, chars) / 4)
}
