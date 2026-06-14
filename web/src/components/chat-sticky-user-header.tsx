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
  onWriteToWorkspace?: (content: string) => void;
  onGenerateChain?: (content: string) => void;
  onEditUserMessage?: (historyIndex: number) => void;
  /** Parent shows Cursor checkpoint dialog before resend when needed. */
  onRequestResendUserMessage?: (historyIndex: number) => void;
};

/** 顶部固定用户提问栏：点击后展开 Cursor 式内联 Composer */
export function ChatStickyUserHeader({
  message,
  isEditing = false,
  inlineComposer,
  hasDesktopApi,
  onWriteToWorkspace,
  onGenerateChain,
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
      <div ref={headerRef} className="chat-sticky-user-header chat-sticky-user-header--editing">
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
        rowRef={rowRef}
        content={message.content}
        hasDesktopApi={hasDesktopApi}
        onWriteToWorkspace={onWriteToWorkspace}
        onGenerateChain={onGenerateChain}
      >
        <div ref={headerRef} className="chat-sticky-user-header group/bubble">
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
