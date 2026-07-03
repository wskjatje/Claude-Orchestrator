import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/** 距底部在此范围内视为「跟随最新」 */
const SCROLL_BOTTOM_EPS = 56;

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
}: {
  messages: ScrollMessage[];
  activeId: string;
  sending: boolean;
  streamScrollKey: string;
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerDockRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef(false);
  const showJumpLatestRef = useRef(false);
  const [composerDockHeight, setComposerDockHeight] = useState(200);
  const [showJumpLatest, setShowJumpLatest] = useState(false);

  const setJumpLatestVisible = useCallback((visible: boolean) => {
    if (showJumpLatestRef.current === visible) return;
    showJumpLatestRef.current = visible;
    setShowJumpLatest(visible);
  }, []);

  const updateScrollPinnedState = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const atBottom = isNearBottom(el);
    userScrolledAwayRef.current = !atBottom;
    setJumpLatestVisible(!atBottom && messages.length > 0);
  }, [messages.length, setJumpLatestVisible]);

  const pinScrollToBottom = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const top = Math.max(0, el.scrollHeight - el.clientHeight);
    if (top <= 0) {
      if (el.scrollTop !== 0) el.scrollTop = 0;
      return;
    }
    if (Math.abs(el.scrollTop - top) < 2) return;
    el.scrollTop = top;
  }, []);

  const syncScrollToBottom = useCallback(() => {
    pinScrollToBottom();
  }, [pinScrollToBottom]);

  // 观测输入框区域高度变化 → 更新底部间距
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

  // 滚动事件处理：标记用户是否已滚走
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => updateScrollPinnedState();
    el.addEventListener("scroll", onScroll, { passive: true });
    updateScrollPinnedState();
    return () => el.removeEventListener("scroll", onScroll);
  }, [updateScrollPinnedState]);

  // 输入框高度变化 → 未滚走则自动跟进
  useLayoutEffect(() => {
    if (userScrolledAwayRef.current) return;
    syncScrollToBottom();
  }, [composerDockHeight, syncScrollToBottom]);

  // 消息数量/对话切换 → 未滚走则自动跟进
  useLayoutEffect(() => {
    if (userScrolledAwayRef.current) return;
    syncScrollToBottom();
  }, [messages.length, activeId, syncScrollToBottom]);

  // 流式内容更新 → 未滚走则自动跟进
  useLayoutEffect(() => {
    if (userScrolledAwayRef.current) return;
    syncScrollToBottom();
    setJumpLatestVisible(false);
  }, [streamScrollKey, sending, syncScrollToBottom, setJumpLatestVisible]);

  // 开始发送 → 未滚走则自动跟进
  useLayoutEffect(() => {
    if (!sending || userScrolledAwayRef.current) return;
    syncScrollToBottom();
  }, [sending, syncScrollToBottom]);

  // 路由切换 → 进入聊天页时滚到底部
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPathnameRef = useRef<string | undefined>(undefined);

  const scrollToLatest = useCallback(() => {
    userScrolledAwayRef.current = false;
    setJumpLatestVisible(false);
    const attempt = (count = 0) => {
      pinScrollToBottom();
      if (count < 2) requestAnimationFrame(() => attempt(count + 1));
      else updateScrollPinnedState();
    };
    attempt();
  }, [pinScrollToBottom, setJumpLatestVisible, updateScrollPinnedState]);

  useLayoutEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (pathname !== "/") return;
    const enteredChat = prev === undefined || (prev !== "/" && pathname === "/");
    if (!enteredChat) return;
    scrollToLatest();
  }, [pathname, scrollToLatest]);

  // 切换对话 → 滚到底部
  useLayoutEffect(() => {
    scrollToLatest();
  }, [activeId, scrollToLatest]);

  const resetScrollFollow = useCallback(() => {
    scrollToLatest();
  }, [scrollToLatest]);

  const jumpToLatest = useCallback(() => {
    scrollToLatest();
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
