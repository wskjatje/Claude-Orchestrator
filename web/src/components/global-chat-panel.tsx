/**
 * 跨路由流式续流（无 UI）：ChatPage 卸载后仍订阅 message_delta，写入 perSessionMessages。
 * 不渲染浮动面板，避免与工作台聊天双轨抢焦点。
 */
import { useCallback, useEffect } from "react";
import { useChatState } from "@/contexts/chat-state-context";
import { useChatStream } from "@/hooks/use-chat-stream";
import { getDesktop } from "@/lib/desktop-api";
import { onBridgeEvent } from "@/lib/install-desktop-bridge";
import {
  isRequestIdInActiveMap,
  sessionIdForActiveRequest,
} from "@/lib/chat-send-helpers";

export function GlobalChatPanel() {
  const {
    activeId,
    activeStreamRequestId,
    sending,
    isChatPageMounted,
    syncMessages,
    syncSending,
    syncSendingSessions,
    syncActiveStreamRequestId,
    syncSessionMessages,
    messagesRef,
    activeIdRef,
    activeRequestIdsRef,
    perSessionMessagesRef,
  } = useChatState();

  const onDelta = useCallback(
    (_sessionId: string, content: string, requestId: string) => {
      // activeRequestIdsRef: sessionId → requestId（非 requestId → sessionId）
      const realSessionId = sessionIdForActiveRequest(
        activeRequestIdsRef.current,
        requestId,
        _sessionId,
      );
      const perSession = perSessionMessagesRef.current[realSessionId];
      const cur = perSession?.length ? perSession : messagesRef.current;
      if (!cur || cur.length === 0) return;
      const last = cur[cur.length - 1];
      if (last?.role !== "assistant") return;
      const updated = [...cur];
      updated[updated.length - 1] = {
        ...last,
        content: last.content === "__WAITING__" ? content : last.content + content,
      };
      syncSessionMessages(realSessionId, updated);
      if (realSessionId === activeIdRef.current) {
        syncMessages(updated);
      }
    },
    [
      syncMessages,
      syncSessionMessages,
      messagesRef,
      activeIdRef,
      activeRequestIdsRef,
      perSessionMessagesRef,
    ],
  );

  // ChatPage 在页时由其自己订阅；离开聊天页才由本组件接棒。
  // 匹配 activeRequestIds 中任意 requestId，避免「切页早于 activeStreamRequestId 落盘」丢 delta。
  useChatStream({
    activeSessionId: activeId,
    requestId: activeStreamRequestId,
    enabled: !isChatPageMounted,
    matchRequestId: (rid) =>
      Boolean(rid) &&
      (rid === activeStreamRequestId ||
        isRequestIdInActiveMap(activeRequestIdsRef.current, rid)),
    onDelta,
  });

  useEffect(() => {
    if (isChatPageMounted) return;
    const off = onBridgeEvent("chat-sessions:changed", () => {
      const api = getDesktop();
      if (!api?.loadChatSessions) return;
      void (async () => {
        try {
          const disk = await api.loadChatSessions();
          if (!disk?.sessions) return;
          const curAid = activeIdRef.current;
          const updatedSession = disk.sessions.find((s) => s.id === curAid);
          if (!updatedSession?.history?.length) return;
          if (!activeStreamRequestId) {
            syncSending(false);
            syncSendingSessions({});
            return;
          }
          const lastMsg = updatedSession.history[updatedSession.history.length - 1];
          if (
            lastMsg?.role === "assistant" &&
            lastMsg.content &&
            lastMsg.content !== "__WAITING__"
          ) {
            syncSending(false);
            syncSendingSessions({});
            syncActiveStreamRequestId(null);
          }
        } catch {
          /* ignore */
        }
      })();
    });
    return () => {
      off?.();
    };
  }, [
    isChatPageMounted,
    activeStreamRequestId,
    activeIdRef,
    syncSending,
    syncSendingSessions,
    syncActiveStreamRequestId,
  ]);

  useEffect(() => {
    if (isChatPageMounted) return;
    if (!activeStreamRequestId && sending) {
      const t = setTimeout(() => syncSending(false), 600);
      return () => clearTimeout(t);
    }
  }, [isChatPageMounted, activeStreamRequestId, sending, syncSending]);

  return null;
}
