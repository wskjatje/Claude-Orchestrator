export const SCROLL_ANCHOR_OFFSET: number;
export const STICKY_SHOW_GAP: number;
export const STICKY_HIDE_GAP: number;
export function findActiveTurnIndex(
  root: { getBoundingClientRect: () => { top: number } },
  turnElements: Array<{ getBoundingClientRect: () => { top: number } } | null>,
): number;
export function isUserBubbleScrolledAway(
  root: { getBoundingClientRect: () => { top: number } },
  userEl: { getBoundingClientRect: () => { bottom: number } } | null,
  stickyVisible: boolean,
): boolean;
