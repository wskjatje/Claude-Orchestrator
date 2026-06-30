import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/** 距底部在此范围内视为「跟随最新」 */
const SCROLL_BOTTOM_EPS = 56;
const LAYOUT_FREEZE_MS = 400;

type ScrollMessage = { role: string; content: string };

function isNearBottom(el: HTMLElement): boolean {
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
  return dist <= SCROLL_BOTTOM_EPS;
}

export function useChatScroll({
  messages,
  activeId,
  sending,
  streamScrollKey,
  layoutFreezeDeps = [],
}: {
  messages: ScrollMessage[];
  activeId: string;
  sending: boolean;
  streamScrollKey: string;
  layoutFreezeDeps?: unknown[];
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerDockRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef(false);
  const layoutFreezeRef = useRef(false);
  const savedScrollTopRef = useRef(0);
  const freezeTimerRef = useRef(0);
  const scrollFollowLockUntilRef = useRef(0);
  const showJumpLatestRef = useRef(false);
  const [composerDockHeight, setComposerDockHeight] = useState(200);
  const [showJumpLatest, setShowJumpLatest] = useState(false);

  const setJumpLatestVisible = useCallback((visible: boolean) => {
    if (showJumpLatestRef.current === visible) return;
    showJumpLatestRef.current = visible;
    setShowJumpLatest(visible);
  }, []);

  const markScrollContainer = useCallback((frozen: boolean) => {
    const el = scrollAreaRef.current;
    if (!el) return;
    if (frozen) el.setAttribute("data-layout-frozen", "");
    else el.removeAttribute("data-layout-frozen");
  }, []);

  const pinScrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollAreaRef.current;
    if (layoutFreezeRef.current || !el) return;
    const top = Math.max(0, el.scrollHeight - el.clientHeight);
    if (top <= 0) {
      if (el.scrollTop !== 0) el.scrollTop = 0;
      return;
    }
    if (behavior === "smooth") el.scrollTo({ top, behavior: "smooth" });
    else el.scrollTop = top;
  }, []);

  const syncScrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      pinScrollToBottom(behavior);
    },
    [pinScrollToBottom],
  );

  const updateScrollPinnedState = useCallback(() => {
    if (layoutFreezeRef.current) return;
    if (Date.now() < scrollFollowLockUntilRef.current) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    const atBottom = isNearBottom(el);
    userScrolledAwayRef.current = !atBottom;
    setJumpLatestVisible(!atBottom && messages.length > 0);
  }, [messages.length, setJumpLatestVisible]);

  const cancelLayoutFreeze = useCallback(() => {
    window.clearTimeout(freezeTimerRef.current);
    layoutFreezeRef.current = false;
    markScrollContainer(false);
  }, [markScrollContainer]);

  const startLayoutFreeze = useCallback(() => {
    const el = scrollAreaRef.current;
    if (el) {
      savedScrollTopRef.current = el.scrollTop;
      if (isNearBottom(el)) userScrolledAwayRef.current = false;
    }
    layoutFreezeRef.current = true;
    markScrollContainer(true);
    window.clearTimeout(freezeTimerRef.current);
    freezeTimerRef.current = window.setTimeout(() => {
      layoutFreezeRef.current = false;
      markScrollContainer(false);
      const scrollEl = scrollAreaRef.current;
      if (!scrollEl) return;
      if (!userScrolledAwayRef.current) {
        syncScrollToBottom("auto");
        setJumpLatestVisible(false);
        return;
      }
      scrollEl.scrollTop = savedScrollTopRef.current;
      updateScrollPinnedState();
    }, LAYOUT_FREEZE_MS);
  }, [markScrollContainer, setJumpLatestVisible, syncScrollToBottom, updateScrollPinnedState]);

  useEffect(() => {
    startLayoutFreeze();
    return () => window.clearTimeout(freezeTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅响应显式布局依赖
  }, layoutFreezeDeps);

  /** 聊天区宽度变化：冻结并恢复 scrollTop，禁止贴底重算（避免换行闪烁） */
  useLayoutEffect(() => {
    const el = scrollAreaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (Math.abs(w - lastWidth) <= 1) return;
      lastWidth = w;
      startLayoutFreeze();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [startLayoutFreeze]);

  useLayoutEffect(() => {
    const dock = composerDockRef.current;
    if (!dock || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const syncDockHeight = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = Math.ceil(dock.getBoundingClientRect().height);
        setComposerDockHeight((prev) => (Math.abs(prev - h) <= 1 ? prev : h));
      });
    };
    const ro = new ResizeObserver(syncDockHeight);
    ro.observe(dock);
    syncDockHeight();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      if (layoutFreezeRef.current) return;
      updateScrollPinnedState();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    updateScrollPinnedState();
    return () => el.removeEventListener("scroll", onScroll);
  }, [updateScrollPinnedState]);

  useLayoutEffect(() => {
    if (layoutFreezeRef.current || userScrolledAwayRef.current) return;
    syncScrollToBottom("auto");
  }, [composerDockHeight, syncScrollToBottom]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPathnameRef = useRef<string | undefined>(undefined);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      cancelLayoutFreeze();
      userScrolledAwayRef.current = false;
      setJumpLatestVisible(false);
      scrollFollowLockUntilRef.current =
        Date.now() + (behavior === "smooth" ? 700 : 180);
      const run = () => pinScrollToBottom(behavior);
      run();
      requestAnimationFrame(run);
      requestAnimationFrame(() => {
        run();
        window.setTimeout(() => {
          run();
          updateScrollPinnedState();
        }, behavior === "smooth" ? 320 : 120);
        window.setTimeout(run, behavior === "smooth" ? 520 : 280);
      });
    },
    [cancelLayoutFreeze, pinScrollToBottom, setJumpLatestVisible, updateScrollPinnedState],
  );

  useLayoutEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (pathname !== "/") return;
    const enteredChat = prev === undefined || (prev !== "/" && pathname === "/");
    if (!enteredChat) return;
    scrollToLatest("auto");
  }, [pathname, scrollToLatest]);

  useLayoutEffect(() => {
    scrollToLatest("auto");
  }, [activeId, scrollToLatest]);

  useLayoutEffect(() => {
    if (userScrolledAwayRef.current || layoutFreezeRef.current) return;
    scrollFollowLockUntilRef.current = Date.now() + 120;
    syncScrollToBottom("auto");
  }, [messages.length, activeId, syncScrollToBottom]);

  useLayoutEffect(() => {
    if (userScrolledAwayRef.current || layoutFreezeRef.current) return;
    scrollFollowLockUntilRef.current = Date.now() + (sending ? 200 : 120);
    syncScrollToBottom("auto");
    setJumpLatestVisible(false);
  }, [streamScrollKey, sending, syncScrollToBottom, setJumpLatestVisible]);

  useLayoutEffect(() => {
    if (!sending || userScrolledAwayRef.current || layoutFreezeRef.current) return;
    scrollFollowLockUntilRef.current = Date.now() + 160;
    syncScrollToBottom("auto");
  }, [sending, syncScrollToBottom]);

  const resetScrollFollow = useCallback(() => {
    scrollToLatest("auto");
  }, [scrollToLatest]);

  const jumpToLatest = useCallback(() => {
    scrollToLatest("auto");
  }, [scrollToLatest]);

  return {
    scrollAreaRef,
    messagesEndRef,
    composerDockRef,
    composerDockHeight,
    showJumpLatest,
    jumpToLatest,
    resetScrollFollow,
  };
}
