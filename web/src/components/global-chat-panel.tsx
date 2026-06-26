import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, MessageCircle, PanelRightClose, SendHorizontal } from "lucide-react";
import { EMPTY_CHAT_SEARCH, type ChatRouteSearch } from "@/lib/chat-route-search";
import { useChatState, type Msg } from "@/contexts/chat-state-context";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ChatAssistantContent } from "@/components/chat-assistant-content";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { onBridgeEvent } from "@/lib/install-desktop-bridge";

/**
 * 全局持久化聊天面板（已禁用，在所有页面隐藏）
 */
export function GlobalChatPanel() {
  return null;
}

function GlobalChatPanelInner() {
  const router = useRouter();
  const {
    sessions, activeId, messages, globalModel,
    activeStreamRequestId, sending, isChatPageMounted,
    syncMessages, syncSending, syncSendingSessions, syncActiveStreamRequestId, syncSessionMessages,
    messagesRef, activeIdRef, activeRequestIdsRef, perSessionMessagesRef,
  } = useChatState();

  const [open, setOpen] = useState(true);

  // 当前会话
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  // ---------- 流式 delta ----------
  // 始终订阅 message_delta 并累加到 context，消除 ChatPage 挂载/卸载间隙的丢失。
  const onDelta = useCallback(
    (_sessionId: string, content: string, requestId: string) => {
      // 通过 activeRequestIdsRef 找出 delta 真正所属的会话
      const realSessionId = activeRequestIdsRef.current.get(requestId) || _sessionId;
      // 优先使用 per-session 累积消息（切换会话后仍保留），否则回退到当前活动会话的消息
      const perSession = perSessionMessagesRef.current[realSessionId];
      const cur = perSession?.length ? perSession : messagesRef.current;
      if (!cur || cur.length === 0) return;
      const last = cur[cur.length - 1];
      if (last?.role !== "assistant") return;
      const updated = [...cur];
      updated[updated.length - 1] = { ...last, content: last.content === "__WAITING__" ? content : last.content + content };
      // 写入 per-session 累积池（始终执行，跨会话切换时保留）
      syncSessionMessages(realSessionId, updated);
      // 如果属于当前活动会话，同时更新显示消息
      if (realSessionId === activeIdRef.current) {
        syncMessages(updated);
      }
    },
    [syncMessages, syncSessionMessages, messagesRef, activeIdRef, activeRequestIdsRef, perSessionMessagesRef],
  );

  useChatStream({
    activeSessionId: activeId,
    requestId: activeStreamRequestId,
    enabled: true, // 始终启用，消除订阅间隙
    onDelta,
  });

  // 当 ChatPage 卸载后，后端保存完成时通过 chat-sessions:changed 刷新 sessions
  useEffect(() => {
    const off = onBridgeEvent("chat-sessions:changed", () => {
      const api = getDesktop();
      if (!api) return;
      void (async () => {
        try {
          const disk = await api.loadChatSessions();
          if (disk?.sessions) {
            const curAid = activeIdRef.current;
            const updatedSession = disk.sessions.find((s: any) => s.id === curAid);
            if (updatedSession && updatedSession.history?.length && !activeStreamRequestId) {
              syncSending(false);
              syncSendingSessions({});
            } else if (updatedSession && updatedSession.history?.length && activeStreamRequestId) {
              // 后端已保存完整回复（含 assistant 正文），但 finally 块尚未清理流式状态：
              // 确认最后一条消息是完整的 assistant 回复而非 __WAITING__，则主动清理
              const lastMsg = updatedSession.history[updatedSession.history.length - 1];
              if (lastMsg && lastMsg.role === "assistant" && lastMsg.content && lastMsg.content !== "__WAITING__") {
                syncSending(false);
                syncSendingSessions({});
                syncActiveStreamRequestId(null);
              }
            }
          }
        } catch {}
      })();
    });
    return () => { if (off) off(); };
  }, [activeStreamRequestId, syncSendingSessions, syncActiveStreamRequestId]);

  // 流结束后清理 sending
  useEffect(() => {
    if (!activeStreamRequestId && sending) {
      const t = setTimeout(() => syncSending(false), 600);
      return () => clearTimeout(t);
    }
  }, [activeStreamRequestId, sending]);

  // ---------- UI ----------

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 z-50 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-l-md border border-border/60 bg-surface shadow-md hover:bg-secondary"
        title="显示聊天面板"
      >
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <ChatPanelShell
      header={
        <ChatPanelHeader
          sessions={sessions}
          activeId={activeId}
          onSessionClick={(id) => {
            router.navigate({ to: "/", search: { session: id, new: undefined, claudeResume: undefined } satisfies ChatRouteSearch });
          }}
          onClose={() => setOpen(false)}
        />
      }
      footer={
        <ChatPanelFooter
          activeSessionId={activeId}
          onGoToChat={() => router.navigate({ to: "/", search: EMPTY_CHAT_SEARCH })}
        />
      }
    >
      {/* 消息列表 */}
      <ChatMessagesView
        messages={messages}
        sending={sending && !isChatPageMounted}
        modelLabel={activeSession?.modelId || globalModel || ""}
      />
    </ChatPanelShell>
  );
}

// ---- Layout Shell ----

function ChatPanelShell({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed right-0 top-0 z-40 flex h-full w-96 flex-col border-l border-border/60 bg-background shadow-xl">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer}
    </div>
  );
}

// ---- Header ----

function ChatPanelHeader({
  sessions,
  activeId,
  onSessionClick,
  onClose,
}: {
  sessions: { id: string; title: string }[];
  activeId: string;
  onSessionClick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col border-b border-border/40">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold text-foreground/70">聊天</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="收起"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto px-2 pb-2">
        {sessions.slice(0, 10).map((s) => (
          <button
            key={s.id}
            onClick={() => onSessionClick(s.id)}
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-[11px] transition",
              s.id === activeId
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {s.title?.slice(0, 14) || "新对话"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Footer ----

function ChatPanelFooter({
  activeSessionId,
  onGoToChat,
}: {
  activeSessionId: string;
  onGoToChat: () => void;
}) {
  const [quickInput, setQuickInput] = useState("");

  const handleSend = useCallback(() => {
    if (!quickInput.trim()) return;
    // 导航到聊天页，附带一条新消息
    const search: ChatRouteSearch = {
      session: activeSessionId,
      new: undefined,
      claudeResume: undefined,
    };
    window.location.href = `/?session=${encodeURIComponent(activeSessionId)}&prompt=${encodeURIComponent(quickInput.trim())}`;
    setQuickInput("");
  }, [quickInput, activeSessionId]);

  return (
    <div className="flex flex-col gap-2 border-t border-border/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-surface/50 px-2 py-1.5">
        <input
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="快速输入消息..."
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/40"
        />
        <button
          onClick={handleSend}
          disabled={!quickInput.trim()}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30"
        >
          <SendHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        onClick={onGoToChat}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        前往完整聊天
      </button>
    </div>
  );
}

// ---- Message List ----

function ChatMessagesView({
  messages,
  sending,
  modelLabel,
}: {
  messages: Msg[];
  sending: boolean;
  modelLabel: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const prevLenRef = useRef(messages.length);

  // 新消息或流式追加时自动滚到底
  useEffect(() => {
    if (messages.length === 0) return;
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom || messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages.length, messages[messages.length - 1]?.content]);

  // 监听手动滚动
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowJump(!isNearBottom);
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground/40">暂无消息，开始一个新对话吧</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-3"
    >
      {messages.map((msg, i) => (
        <MessageItem key={i} msg={msg} modelLabel={i === messages.length - 1 ? modelLabel : ""} />
      ))}

      {sending && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2.5">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <span className="text-[11px] text-muted-foreground">AI 正在回复…</span>
        </div>
      )}

      <div ref={bottomRef} />

      {showJump && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="sticky bottom-2 left-1/2 z-10 mx-auto flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-border/50 bg-surface shadow-md transition hover:bg-secondary"
        >
          <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ---- Single Message ----

function MessageItem({ msg, modelLabel }: { msg: Msg; modelLabel: string }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/10 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="max-w-full rounded-2xl rounded-bl-md bg-muted/20 px-3.5 py-2.5">
        {modelLabel ? (
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
            {modelLabel}
          </div>
        ) : null}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ChatAssistantContent content={msg.content} />
        </div>
      </div>
    </div>
  );
}
