import { memo, type RefObject } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble, type ChatBubbleMessage } from "@/components/chat-message-bubble";
import { ChatStickyUserHeader } from "@/components/chat-sticky-user-header";
import type { ChatComposerShellProps } from "@/components/chat-composer-shell";
import { useStickyUserPrompt } from "@/hooks/use-sticky-user-prompt";

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
  onWriteToWorkspace?: (content: string) => void;
  onGenerateChain?: (content: string) => void;
  onEditUserMessage?: (historyIndex: number) => void;
  onRequestResendUserMessage?: (historyIndex: number) => void;
};

function chatMessagesPanePropsEqual(prev: ChatMessagesPaneProps, next: ChatMessagesPaneProps) {
  return (
    prev.messages === next.messages &&
    prev.editHistoryIndex === next.editHistoryIndex &&
    prev.editingUserMessage === next.editingUserMessage &&
    prev.inlineComposer === next.inlineComposer &&
    prev.showJumpLatest === next.showJumpLatest &&
    prev.hasDesktopApi === next.hasDesktopApi &&
    prev.scrollAreaRef === next.scrollAreaRef &&
    prev.messagesEndRef === next.messagesEndRef &&
    prev.onJumpToLatest === next.onJumpToLatest &&
    prev.onWriteToWorkspace === next.onWriteToWorkspace &&
    prev.onGenerateChain === next.onGenerateChain &&
    prev.onEditUserMessage === next.onEditUserMessage &&
    prev.onRequestResendUserMessage === next.onRequestResendUserMessage
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
  onWriteToWorkspace,
  onGenerateChain,
  onEditUserMessage,
  onRequestResendUserMessage,
}: ChatMessagesPaneProps) {
  const isEditingSticky =
    editHistoryIndex != null && editingUserMessage != null && inlineComposer != null;

  const { leadingOrphans, turns, stickyUser, showStickyHeader, setTurnRef, setUserRef } =
    useStickyUserPrompt(scrollAreaRef, messages, { forceSticky: isEditingSticky });

  const headerMessage = isEditingSticky ? editingUserMessage : stickyUser;

  const renderUser = (m: ChatBubbleMessage, turnIndex: number) => (
    <div key={`user:${m.historyIndex ?? turnIndex}`} ref={setUserRef(turnIndex)} className="chat-turn-user">
      <MessageBubble
        m={m}
        hasDesktopApi={hasDesktopApi}
        onWriteToWorkspace={onWriteToWorkspace}
        onGenerateChain={onGenerateChain}
        onEditUserMessage={onEditUserMessage}
      />
    </div>
  );

  const renderAssistant = (i: number) => (
    <MessageBubble
      key={`${i}:${messages[i].role}:${messages[i].content.length}`}
      m={messages[i]}
      hasDesktopApi={hasDesktopApi}
      onWriteToWorkspace={onWriteToWorkspace}
      onGenerateChain={onGenerateChain}
      onEditUserMessage={onEditUserMessage}
    />
  );

  return (
    <div
      className={cn(
        "chat-pane-messages",
        (showStickyHeader && headerMessage) || isEditingSticky
          ? "chat-pane-messages--sticky-user"
          : null,
      )}
    >
      {(showStickyHeader || isEditingSticky) && headerMessage ? (
        <ChatStickyUserHeader
          message={headerMessage}
          isEditing={isEditingSticky}
          inlineComposer={isEditingSticky ? inlineComposer : null}
          hasDesktopApi={hasDesktopApi}
          onWriteToWorkspace={onWriteToWorkspace}
          onGenerateChain={onGenerateChain}
          onEditUserMessage={onEditUserMessage}
          onRequestResendUserMessage={onRequestResendUserMessage}
        />
      ) : null}
      <div
        ref={scrollAreaRef}
        className="chat-pane-messages-scroll overscroll-contain scrollbar-thin"
      >
        <div className="chat-messages-inner">
          <div className="chat-messages-list">
            {leadingOrphans.map((i) => renderAssistant(i))}
            {turns.map((turn, turnIndex) => (
              <div
                key={`turn:${turn.userIndex}`}
                ref={setTurnRef(turnIndex)}
                className="chat-turn-section"
              >
                {renderUser(turn.user, turnIndex)}
                {turn.replyIndices.map((i) => renderAssistant(i))}
              </div>
            ))}
          </div>
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
