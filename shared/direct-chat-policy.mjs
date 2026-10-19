/**
 * 直聊（本地 Ollama direct / 云 cloudDirect）输出约束单源。
 * 禁止在各处复制粘贴规则文案；server orch 与 web prompt 均从此读取。
 */

/** 用户要完整方案/优化计划（用于续写判定与完整性提示） */
export const FULL_PLAN_USER_RE =
  /(?:优化方案|合理优化|优化计划|给出.{0,8}方案|怎么优化|该怎么优化|改进方案|实施计划)/

/**
 * @param {string} userLine
 */
export function userAskedForFullPlanReply(userLine) {
  return FULL_PLAN_USER_RE.test(String(userLine || ''))
}

/**
 * 直聊可见正文规则：禁止伪工具协议（真工具环另走 CLI/Host/MCP，不走本规则替代）。
 */
export const DIRECT_CHAT_OUTPUT_RULE =
  '【直聊输出】只输出用户可读 Markdown 正文。禁止：<thinking>、<tool_call>、DSML、Thought/Action JSON、伪 bash/工具围栏、声称已读盘或已写盘。没有实时工具；勿模拟工具调用。' +
  '格式（对齐 Cursor Ask）：先 1 句结论，再扁平编号列表 1. 2. 3.（最多 6 条、每条一两句）。' +
  '禁止 ## 1/## 2 分节、禁止 - **加粗小标题**： 嵌套百科体、禁止 LaTeX（箭头写「→」）。' +
  '勿文末推销下一步、切 Plan/Agent、征求确认。'

/**
 * 直聊正文是否像被截断（云/本地共用，轻量；不含完整方案强制续写逻辑）。
 * @param {string} text
 */
export function looksLikeTruncatedDirectReply(text) {
  const t = String(text || '').trim()
  if (!t || t.length < 40) return false
  if (/[。！？.!?…」』）)\]]$/.test(t)) return false
  if (/[,，、:：;；—\-（(【\[\u201c\u2018`]$/.test(t)) return true
  if (/[的了在是与和为及把被从对到中有没要不也可以能会就都还更比很非常且而或则]$/.test(t)) {
    return true
  }
  const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length
  if (cjk >= 40 && /[A-Za-z0-9]$/.test(t)) return true
  if ((t.match(/```/g) || []).length % 2 === 1) return true
  // 逗号/句读后残段过短 → 半词截断（如「……，防止推」）
  if (!/[。！？.!?]$/.test(t)) {
    const afterBreak = (t.split(/[，。！？\n]/).pop() || '').trim()
    if (
      afterBreak.length > 0 &&
      afterBreak.length <= 4 &&
      /^[\u4e00-\u9fff]+$/.test(afterBreak)
    ) {
      return true
    }
  }
  return false
}

/**
 * 方案类完整性（接在 OUTPUT_RULE 后，仅当 userAskedForFullPlanReply）。
 */
export const FULL_PLAN_COMPLETENESS_RULE =
  '【方案完整性】须一次写完所有优先级条目（至少到第 2～3 点），中途不要停在半句或未闭合的行内代码上。'

/**
 * @param {string} userLine
 * @returns {string} 可直接拼进 system / preamble；无则空串
 */
export function buildDirectChatPolicyBlock(userLine) {
  const parts = [DIRECT_CHAT_OUTPUT_RULE]
  if (userAskedForFullPlanReply(userLine)) parts.push(FULL_PLAN_COMPLETENESS_RULE)
  return parts.join('\n')
}
