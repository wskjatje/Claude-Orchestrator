import { memo, useEffect, useState, type RefObject } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble, type ChatBubbleMessage } from "@/components/chat-message-bubble";
import { ChatStickyUserHeader } from "@/components/chat-sticky-user-header";
import type { ChatComposerShellProps } from "@/components/chat-composer-shell";
import { useStickyUserPrompt } from "@/hooks/use-sticky-user-prompt";
import { ErrorBoundary } from "@/components/error-boundary";
import { CHAT_SESSIONS_RESTORING, CHAT_SHOW_EARLIER_TURNS, CHAT_VISIBLE_TURN_CAP } from "@/lib/ui-copy";

export type ChatMessagesPaneProps = {
  messages: ChatBubbleMessage[];
  editHistoryIndex?: number | null;
  editingUserMessage?: ChatBubbleMessage | null;
  inlineComposer?: ChatComposerShellProps | null;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  showJumpLatest: boolean;
  onJumpToLatest: () => void;
  hasDesktopApi: boolean;
  /** 会话尚未从磁盘/上下文恢复完且消息为空时展示骨架 */
  sessionsRestoring?: boolean;
  onWriteToWorkspace?: (content: string) => void;
  onGenerateChain?: (content: string) => void;
  onEditUserMessage?: (historyIndex: number) => void;
  onRequestResendUserMessage?: (historyIndex: number) => void;
  onAssistantContentPatch?: (historyIndex: number, nextContent: string) => void | Promise<void>;
};

function chatMessagesPanePropsEqual(prev: ChatMessagesPaneProps, next: ChatMessagesPaneProps) {
  return (
    prev.messages === next.messages &&
    prev.editHistoryIndex === next.editHistoryIndex &&
    prev.editingUserMessage === next.editingUserMessage &&
    prev.inlineComposer === next.inlineComposer &&
    prev.showJumpLatest === next.showJumpLatest &&
    prev.hasDesktopApi === next.hasDesktopApi &&
    prev.sessionsRestoring === next.sessionsRestoring &&
    prev.scrollAreaRef === next.scrollAreaRef &&
    prev.messagesEndRef === next.messagesEndRef &&
    prev.onJumpToLatest === next.onJumpToLatest &&
    prev.onWriteToWorkspace === next.onWriteToWorkspace &&
    prev.onGenerateChain === next.onGenerateChain &&
    prev.onEditUserMessage === next.onEditUserMessage &&
    prev.onRequestResendUserMessage === next.onRequestResendUserMessage &&
    prev.onAssistantContentPatch === next.onAssistantContentPatch
  );
}

export const ChatMessagesPane = memo(function ChatMessagesPane({
  messages,
  editHistoryIndex = null,
  editingUserMessage = null,
  inlineComposer = null,
  scrollAreaRef,
  messagesEndRef,
  showJumpLatest,
  onJumpToLatest,
  hasDesktopApi,
  sessionsRestoring = false,
  onWriteToWorkspace,
  onGenerateChain,
  onEditUserMessage,
  onRequestResendUserMessage,
  onAssistantContentPatch,
}: ChatMessagesPaneProps) {
  const isEditingSticky =
    editHistoryIndex != null && editingUserMessage != null && inlineComposer != null;

  const { leadingOrphans, turns, stickyUser, showStickyHeader, setTurnRef, setUserRef } =
    useStickyUserPrompt(scrollAreaRef, messages, { forceSticky: isEditingSticky });

  const [showAllTurns, setShowAllTurns] = useState(false);
  /** 仅换会话时收起；流式追加消息不得重置 */
  const sessionKey =
    messages.find((m) => m.role === "user")?.historyIndex ??
    (messages[0] ? `${messages[0].role}:${String(messages[0].content).slice(0, 48)}` : "empty");
  useEffect(() => {
    setShowAllTurns(false);
  }, [sessionKey]);

  const hiddenTurnCount =
    !showAllTurns && turns.length > CHAT_VISIBLE_TURN_CAP
      ? turns.length - CHAT_VISIBLE_TURN_CAP
      : 0;
  const visibleTurns = hiddenTurnCount > 0 ? turns.slice(hiddenTurnCount) : turns;
  const visibleTurnOffset = hiddenTurnCount;

  const headerMessage = isEditingSticky ? editingUserMessage : stickyUser;

  const priorUserLineFor = (assistantIndex: number): string => {
    for (let j = assistantIndex - 1; j >= 0; j--) {
      const prev = messages[j];
      if (prev?.role === "user") return String(prev.content || "");
    }
    return "";
  };

  const priorUserHistoryIndexFor = (assistantIndex: number): number | undefined => {
    for (let j = assistantIndex - 1; j >= 0; j--) {
      const prev = messages[j];
      if (prev?.role === "user" && prev.historyIndex != null) return prev.historyIndex;
    }
    return undefined;
  };

  const stickyHistoryIndex = headerMessage?.historyIndex;
  const stickyMatches = (m: ChatBubbleMessage) => {
    if (!showStickyHeader && !isEditingSticky) return false;
    if (stickyHistoryIndex != null && m.historyIndex != null) {
      return stickyHistoryIndex === m.historyIndex;
    }
    return Boolean(headerMessage && headerMessage === m);
  };

  const renderUser = (m: ChatBubbleMessage, turnIndex: number) => (
    <div
      key={`user:${m.historyIndex ?? turnIndex}`}
      ref={setUserRef(turnIndex)}
      className={cn("chat-turn-user", stickyMatches(m) && "chat-turn-user--sticky-hidden")}
      aria-hidden={stickyMatches(m) || undefined}
    >
      <MessageBubble
        m={m}
        hasDesktopApi={hasDesktopApi}
        onWriteToWorkspace={onWriteToWorkspace}
        onGenerateChain={onGenerateChain}
        onEditUserMessage={onEditUserMessage}
        onRequestResendUserMessage={onRequestResendUserMessage}
        onAssistantContentPatch={onAssistantContentPatch}
      />
    </div>
  );

  const renderAssistant = (i: number) => (
    <MessageBubble
      key={`${i}:${messages[i].role}:${messages[i].content.length}`}
      m={messages[i]}
      priorUserLine={priorUserLineFor(i)}
      priorUserHistoryIndex={priorUserHistoryIndexFor(i)}
      hasDesktopApi={hasDesktopApi}
      onWriteToWorkspace={onWriteToWorkspace}
      onGenerateChain={onGenerateChain}
      onEditUserMessage={onEditUserMessage}
      onRequestResendUserMessage={onRequestResendUserMessage}
      onAssistantContentPatch={onAssistantContentPatch}
    />
  );

  return (
    <div className="chat-pane-messages">
      {(showStickyHeader || isEditingSticky) && headerMessage ? (
        <ChatStickyUserHeader
          message={headerMessage}
          isEditing={isEditingSticky}
          inlineComposer={isEditingSticky ? inlineComposer : null}
          hasDesktopApi={hasDesktopApi}
          onEditUserMessage={onEditUserMessage}
          onRequestResendUserMessage={onRequestResendUserMessage}
        />
      ) : null}
      <div
        ref={scrollAreaRef}
        data-testid="chat-messages-scroll"
        className="chat-pane-messages-scroll overscroll-contain scrollbar-thin"
      >
        <div className="chat-messages-inner">
          <ErrorBoundary>
            <div className="chat-messages-list">
              {sessionsRestoring && messages.length === 0 ? (
                <div
                  className="flex flex-col gap-3 px-1 py-4"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <p className="text-[12px] text-muted-foreground">{CHAT_SESSIONS_RESTORING}</p>
                  <div className="space-y-2.5" aria-hidden>
                    <div className="ml-auto h-9 w-[55%] max-w-sm animate-pulse rounded-2xl bg-secondary/80" />
                    <div className="h-16 w-[75%] max-w-md animate-pulse rounded-2xl bg-muted/60" />
                    <div className="ml-auto h-9 w-[40%] max-w-xs animate-pulse rounded-2xl bg-secondary/80" />
                    <div className="h-12 w-[65%] max-w-sm animate-pulse rounded-2xl bg-muted/60" />
                  </div>
                </div>
              ) : null}
              {hiddenTurnCount > 0 ? (
                <div className="flex justify-center py-2">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-[12px] text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
                    onClick={() => setShowAllTurns(true)}
                  >
                    {CHAT_SHOW_EARLIER_TURNS(hiddenTurnCount)}
                  </button>
                </div>
              ) : null}
              {hiddenTurnCount === 0 ? leadingOrphans.map((i) => renderAssistant(i)) : null}
              {visibleTurns.map((turn, i) => {
                const turnIndex = visibleTurnOffset + i;
                return (
                  <div
                    key={`turn:${turn.userIndex}`}
                    ref={setTurnRef(turnIndex)}
                    className="chat-turn-section"
                  >
                    {renderUser(turn.user, turnIndex)}
                    {turn.replyIndices.map((idx) => renderAssistant(idx))}
                  </div>
                );
              })}
            </div>
          </ErrorBoundary>
          <div ref={messagesEndRef} className="chat-messages-anchor" aria-hidden />
        </div>
      </div>
      {messages.length > 0 && showJumpLatest ? (
        <div className="chat-jump-latest">
          <button type="button" onClick={onJumpToLatest} className="chat-jump-latest-btn">
            <ArrowDown className="h-3.5 w-3.5" />
            回到最新消息
          </button>
        </div>
      ) : null}
    </div>
  );
}, chatMessagesPanePropsEqual);
