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

/** Cursor 式：顶部固定栏展示当前滚动区域对应的用户提问 */
export function useStickyUserPrompt(
  scrollAreaRef: RefObject<HTMLDivElement | null>,
  messages: ChatBubbleMessage[],
) {
  const turnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeTurnIndex, setActiveTurnIndex] = useState(-1);

  const { leadingOrphans, turns } = useMemo(() => groupChatTurns(messages), [messages]);

  const setTurnRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      turnRefs.current[index] = el;
    },
    [],
  );

  useEffect(() => {
    turnRefs.current.length = turns.length;
  }, [turns.length]);

  useLayoutEffect(() => {
    const root = scrollAreaRef.current;
    if (!root || turns.length === 0) {
      setActiveTurnIndex(-1);
      return;
    }
    setActiveTurnIndex(findActiveTurnIndex(root, turnRefs.current));
  }, [scrollAreaRef, turns, messages.length]);

  useEffect(() => {
    const root = scrollAreaRef.current;
    if (!root || turns.length === 0) {
      setActiveTurnIndex(-1);
      return;
    }

    const sync = () => {
      const next = findActiveTurnIndex(root, turnRefs.current);
      setActiveTurnIndex((prev) => (prev === next ? prev : next));
    };

    sync();
    root.addEventListener("scroll", sync, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(root);
    for (const el of turnRefs.current) {
      if (el) ro?.observe(el);
    }

    return () => {
      root.removeEventListener("scroll", sync);
      ro?.disconnect();
    };
  }, [scrollAreaRef, turns]);

  const activeUser =
    activeTurnIndex >= 0 && activeTurnIndex < turns.length
      ? turns[activeTurnIndex]?.user ?? null
      : null;

  return {
    leadingOrphans,
    turns,
    activeTurnIndex,
    activeUser,
    setTurnRef,
  };
}
