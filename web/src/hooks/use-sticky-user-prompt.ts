import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { ChatBubbleMessage } from "@/components/chat-message-bubble";
import { groupChatTurns } from "@/lib/chat-turns";

const SCROLL_ANCHOR_OFFSET = 16;

function findActiveTurnIndex(root: HTMLElement, turnElements: (HTMLElement | null)[]): number {
  if (!turnElements.length) return -1;

  const anchorY = root.getBoundingClientRect().top + SCROLL_ANCHOR_OFFSET;
  const first = turnElements[0];
  if (first && anchorY < first.getBoundingClientRect().top - 8) return -1;

  let active = 0;
  for (let i = 0; i < turnElements.length; i++) {
    const el = turnElements[i];
    if (!el) continue;
    if (el.getBoundingClientRect().top <= anchorY) active = i;
  }
  return active;
}

/** 用户提问气泡已滚出可视区顶部 → 顶部固定栏承接展示（Cursor 同款） */
function isUserBubbleScrolledAway(root: HTMLElement, userEl: HTMLElement | null): boolean {
  if (!userEl) return false;
  const rootTop = root.getBoundingClientRect().top + SCROLL_ANCHOR_OFFSET;
  return userEl.getBoundingClientRect().bottom < rootTop + 2;
}

/** Cursor 式：列表内按时间展示完整轮次；仅当提问滚出视口时顶部固定栏显示该轮提问 */
export function useStickyUserPrompt(
  scrollAreaRef: RefObject<HTMLDivElement | null>,
  messages: ChatBubbleMessage[],
  opts?: { forceSticky?: boolean },
) {
  const turnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const userRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeTurnIndex, setActiveTurnIndex] = useState(-1);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const { leadingOrphans, turns } = useMemo(() => groupChatTurns(messages), [messages]);

  const setTurnRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      turnRefs.current[index] = el;
    },
    [],
  );

  const setUserRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      userRefs.current[index] = el;
    },
    [],
  );

  useEffect(() => {
    turnRefs.current.length = turns.length;
    userRefs.current.length = turns.length;
  }, [turns.length]);

  const syncStickyState = useCallback(() => {
    const root = scrollAreaRef.current;
    if (!root || turns.length === 0) {
      setActiveTurnIndex(-1);
      setShowStickyHeader(false);
      return;
    }

    const nextActive = findActiveTurnIndex(root, turnRefs.current);
    setActiveTurnIndex((prev) => (prev === nextActive ? prev : nextActive));

    if (opts?.forceSticky) {
      setShowStickyHeader(true);
      return;
    }

    const userEl =
      nextActive >= 0 && nextActive < userRefs.current.length
        ? userRefs.current[nextActive]
        : null;
    const away = isUserBubbleScrolledAway(root, userEl);
    setShowStickyHeader((prev) => (prev === away ? prev : away));
  }, [scrollAreaRef, turns.length, opts?.forceSticky]);

  useLayoutEffect(() => {
    syncStickyState();
  }, [syncStickyState, messages.length, turns]);

  useEffect(() => {
    const root = scrollAreaRef.current;
    if (!root) return;

    syncStickyState();
    root.addEventListener("scroll", syncStickyState, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncStickyState) : null;
    ro?.observe(root);
    for (const el of turnRefs.current) {
      if (el) ro?.observe(el);
    }
    for (const el of userRefs.current) {
      if (el) ro?.observe(el);
    }

    return () => {
      root.removeEventListener("scroll", syncStickyState);
      ro?.disconnect();
    };
  }, [scrollAreaRef, syncStickyState, turns.length]);

  const stickyUser =
    showStickyHeader && activeTurnIndex >= 0 && activeTurnIndex < turns.length
      ? (turns[activeTurnIndex]?.user ?? null)
      : opts?.forceSticky && turns.length > 0
        ? (turns[turns.length - 1]?.user ?? null)
        : null;

  return {
    leadingOrphans,
    turns,
    activeTurnIndex,
    stickyUser,
    showStickyHeader: Boolean(opts?.forceSticky || showStickyHeader),
    setTurnRef,
    setUserRef,
  };
}
