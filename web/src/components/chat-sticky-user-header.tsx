import { useRef } from "react";
import { ChatComposerShell, type ChatComposerShellProps } from "@/components/chat-composer-shell";
import { ChatMessageContextMenu } from "@/components/chat-message-context-menu";
import { ChatUserMessageBody } from "@/components/chat-user-message-body";
import type { ChatBubbleMessage } from "@/components/chat-message-bubble";

type Props = {
  message: ChatBubbleMessage;
  isEditing?: boolean;
  inlineComposer?: ChatComposerShellProps | null;
  hasDesktopApi?: boolean;
  onEditUserMessage?: (historyIndex: number) => void;
  /** Parent shows checkpoint dialog before resend when needed. */
  onRequestResendUserMessage?: (historyIndex: number) => void;
};

/** 顶部固定用户提问栏：点击后展开内联 Composer */
export function ChatStickyUserHeader({
  message,
  isEditing = false,
  inlineComposer,
  hasDesktopApi,
  onEditUserMessage,
  onRequestResendUserMessage,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const editable =
    !isEditing &&
    message.historyIndex != null &&
    typeof onEditUserMessage === "function" &&
    message.content !== "__WAITING__";
  const canResend =
    !isEditing &&
    message.historyIndex != null &&
    typeof onRequestResendUserMessage === "function" &&
    message.content !== "__WAITING__";

  if (isEditing && inlineComposer) {
    return (
      <div
        ref={headerRef}
        className="chat-sticky-user-header chat-sticky-user-header--editing"
        data-testid="chat-sticky-user-header"
      >
        <ChatComposerShell
          {...inlineComposer}
          variant="inline"
          editHistoryActive
        />
      </div>
    );
  }

  return (
    <ChatMessageContextMenu
        role="user"
        rowRef={rowRef}
        content={message.content}
        historyIndex={message.historyIndex}
        hasDesktopApi={hasDesktopApi}
        onEdit={
          editable && message.historyIndex != null
            ? () => onEditUserMessage!(message.historyIndex!)
            : undefined
        }
        onResend={
          canResend && message.historyIndex != null
            ? () => onRequestResendUserMessage!(message.historyIndex!)
            : undefined
        }
      >
        <div
          ref={headerRef}
          className="chat-sticky-user-header group/bubble"
          data-testid="chat-sticky-user-header"
        >
          <div className="chat-bubble-user chat-sticky-user-header-bubble">
            <ChatUserMessageBody
              content={message.content}
              attachments={message.attachments}
              terminalSnippets={message.terminalSnippets}
              editable={editable}
              onEdit={
                message.historyIndex != null && onEditUserMessage
                  ? () => onEditUserMessage(message.historyIndex!)
                  : undefined
              }
              onResend={
                canResend && message.historyIndex != null
                  ? () => onRequestResendUserMessage!(message.historyIndex!)
                  : undefined
              }
            />
          </div>
        </div>
      </ChatMessageContextMenu>
  );
}
