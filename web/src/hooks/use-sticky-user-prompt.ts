import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { ChatBubbleMessage } from "@/components/chat-message-bubble";
import { groupChatTurns } from "@/lib/chat-turns";
import {
  findActiveTurnIndex,
  isUserBubbleScrolledAway,
  STICKY_HIDE_GAP,
  STICKY_SHOW_GAP,
} from "../../../shared/sticky-prompt.mjs";

export {
  findActiveTurnIndex,
  isUserBubbleScrolledAway,
  STICKY_HIDE_GAP,
  STICKY_SHOW_GAP,
};

/** 列表内按时间展示完整轮次；仅当提问滚出视口时顶部固定栏显示该轮提问 */
export function useStickyUserPrompt(
  scrollAreaRef: RefObject<HTMLDivElement | null>,
  messages: ChatBubbleMessage[],
  opts?: { forceSticky?: boolean },
) {
  const turnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const userRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stickyVisibleRef = useRef(false);
  const rafRef = useRef(0);
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
      stickyVisibleRef.current = false;
      setActiveTurnIndex(-1);
      setShowStickyHeader(false);
      return;
    }

    const nextActive = findActiveTurnIndex(root, turnRefs.current);
    setActiveTurnIndex((prev) => (prev === nextActive ? prev : nextActive));

    if (opts?.forceSticky) {
      stickyVisibleRef.current = true;
      setShowStickyHeader(true);
      return;
    }

    const userEl =
      nextActive >= 0 && nextActive < userRefs.current.length
        ? userRefs.current[nextActive]
        : null;
    const away = isUserBubbleScrolledAway(root, userEl, stickyVisibleRef.current);
    stickyVisibleRef.current = away;
    setShowStickyHeader((prev) => (prev === away ? prev : away));
  }, [scrollAreaRef, turns.length, opts?.forceSticky]);

  const scheduleSync = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      syncStickyState();
    });
  }, [syncStickyState]);

  useLayoutEffect(() => {
    syncStickyState();
  }, [syncStickyState, messages.length, turns]);

  useEffect(() => {
    const root = scrollAreaRef.current;
    if (!root) return;

    syncStickyState();
    root.addEventListener("scroll", scheduleSync, { passive: true });
    // 同时观察滚动容器与内容区：内容流式增高时 root 尺寸不变，只观察 root 会漏同步
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleSync) : null;
    ro?.observe(root);
    const inner =
      root.querySelector(".chat-messages-list") ||
      root.querySelector(".chat-messages-inner") ||
      root.firstElementChild;
    if (inner && inner !== root) ro?.observe(inner);

    return () => {
      root.removeEventListener("scroll", scheduleSync);
      ro?.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [scrollAreaRef, syncStickyState, scheduleSync, turns.length]);

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
