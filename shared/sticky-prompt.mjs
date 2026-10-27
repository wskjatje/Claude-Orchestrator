/**
 * 聊天粘性提问：几何判定（无 DOM/React 依赖，可供闸门与 hook 共用）。
 */

export const SCROLL_ANCHOR_OFFSET = 16
/** 显示粘性：提问底边须越过锚点（更严） */
export const STICKY_SHOW_GAP = 2
/** 隐藏粘性：提问须更多回到视口内（迟滞，防临界抖开关） */
export const STICKY_HIDE_GAP = 36

/**
 * @param {{ getBoundingClientRect: () => { top: number } }} root
 * @param {Array<{ getBoundingClientRect: () => { top: number } } | null>} turnElements
 */
export function findActiveTurnIndex(root, turnElements) {
  if (!turnElements.length) return -1

  const anchorY = root.getBoundingClientRect().top + SCROLL_ANCHOR_OFFSET
  let firstMounted = null
  let active = -1
  for (let i = 0; i < turnElements.length; i++) {
    const el = turnElements[i]
    if (!el) continue
    if (!firstMounted) {
      firstMounted = el
      if (anchorY < el.getBoundingClientRect().top - 8) return -1
    }
    if (el.getBoundingClientRect().top <= anchorY) active = i
  }
  return active
}

/**
 * @param {{ getBoundingClientRect: () => { top: number } }} root
 * @param {{ getBoundingClientRect: () => { bottom: number } } | null} userEl
 * @param {boolean} stickyVisible
 */
export function isUserBubbleScrolledAway(root, userEl, stickyVisible) {
  if (!userEl) return false
  const rootTop = root.getBoundingClientRect().top + SCROLL_ANCHOR_OFFSET
  const bottom = userEl.getBoundingClientRect().bottom
  const gap = stickyVisible ? STICKY_HIDE_GAP : STICKY_SHOW_GAP
  return bottom < rootTop + gap
}
