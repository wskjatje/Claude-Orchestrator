/**
 * 回合审计单源：前端 / bridge 写入 log_entries 的文案格式。
 * 禁止各处手写不一致的 audit 行。
 */

/**
 * @param {{
 *   interactionMode?: string
 *   intent?: string
 *   allowWrites?: boolean
 *   autoApplyWrites?: boolean
 *   forceDirectChat?: boolean
 *   modelId?: string
 *   channel?: string
 *   writeParsed?: number
 *   writeApplied?: number
 *   writeFailed?: number
 *   ok?: boolean
 *   error?: string
 *   latencyMs?: number
 * }} fields
 */
export function formatTurnAuditMessage(fields) {
  const f = fields && typeof fields === 'object' ? fields : {}
  const parts = [
    '[turn]',
    `mode=${f.interactionMode || '—'}`,
    `intent=${f.intent || '—'}`,
    `writes=${f.allowWrites ? 1 : 0}`,
    `auto=${f.autoApplyWrites ? 1 : 0}`,
    `direct=${f.forceDirectChat ? 1 : 0}`,
    `model=${String(f.modelId || '—').slice(0, 80)}`,
    `ch=${f.channel || '—'}`,
    `parsed=${Number(f.writeParsed) || 0}`,
    `applied=${Number(f.writeApplied) || 0}`,
    `failed=${Number(f.writeFailed) || 0}`,
    `ok=${f.ok === false ? 0 : 1}`,
  ]
  if (typeof f.latencyMs === 'number' && f.latencyMs >= 0) {
    parts.push(`ms=${Math.round(f.latencyMs)}`)
  }
  if (f.error) parts.push(`err=${String(f.error).replace(/\s+/g, ' ').slice(0, 240)}`)
  return parts.join(' ')
}
