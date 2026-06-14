import { memo, useRef } from "react";
import { ChatAssistantContent } from "@/components/chat-assistant-content";
import { ChatMessageContextMenu } from "@/components/chat-message-context-menu";
import { ChatUserMessageBody } from "@/components/chat-user-message-body";
import type { UserImageAttachment } from "@/lib/ollama-messages";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";

export type ChatBubbleMessage = {
  role: "user" | "assistant";
  name?: string;
  time?: string;
  content: string;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  /** 对应会话 history 中的下标（仅 user 消息） */
  historyIndex?: number;
};

function UserMessageBody({
  content,
  attachments,
  terminalSnippets,
  editable,
  onEdit,
}: {
  content: string;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  editable?: boolean;
  onEdit?: () => void;
}) {
  return (
    <ChatUserMessageBody
      content={content}
      attachments={attachments}
      terminalSnippets={terminalSnippets}
      editable={editable}
      onEdit={onEdit}
    />
  );
}

function WaitingReply({ modelName }: { modelName: string }) {
  return (
    <div className="chat-waiting flex items-center gap-2 py-1 text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
      </span>
      <span className="text-[12px]">{modelName}</span>
    </div>
  );
}

function MessageBubbleInner({
  m,
  hasDesktopApi,
  onWriteToWorkspace,
  onGenerateChain,
  onEditUserMessage,
}: {
  m: ChatBubbleMessage;
  hasDesktopApi?: boolean;
  onWriteToWorkspace?: (content: string) => void;
  onGenerateChain?: (content: string) => void;
  onEditUserMessage?: (historyIndex: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (m.role === "user") {
    return (
      <ChatMessageContextMenu
        rowRef={rowRef}
        content={m.content}
        hasDesktopApi={hasDesktopApi}
        onWriteToWorkspace={onWriteToWorkspace}
        onGenerateChain={onGenerateChain}
      >
      <div ref={rowRef} className="chat-message-row chat-message-row--user">
        <div className="group/bubble chat-message-col">
          <div className="chat-bubble-user">
            <UserMessageBody
              content={m.content}
              attachments={m.attachments}
              terminalSnippets={m.terminalSnippets}
              editable={
                m.historyIndex != null &&
                typeof onEditUserMessage === "function" &&
                m.content !== "__WAITING__"
              }
              onEdit={
                m.historyIndex != null && onEditUserMessage
                  ? () => onEditUserMessage(m.historyIndex!)
                  : undefined
              }
            />
          </div>
        </div>
      </div>
      </ChatMessageContextMenu>
    );
  }

  return (
    <ChatMessageContextMenu
      rowRef={rowRef}
      content={m.content}
      hasDesktopApi={hasDesktopApi}
      onWriteToWorkspace={onWriteToWorkspace}
      onGenerateChain={onGenerateChain}
    >
    <div ref={rowRef} className="chat-message-row chat-message-row--assistant">
      <div className="group/bubble chat-message-col chat-message-col--wide">
        <div className="chat-bubble-assistant">
          {m.content === "__WAITING__" ? (
            <WaitingReply modelName={m.name ?? "assistant"} />
          ) : (
            <ChatAssistantContent content={m.content} />
          )}
        </div>
      </div>
    </div>
    </ChatMessageContextMenu>
  );
}

function attachmentsEqual(
  a?: ChatBubbleMessage["attachments"],
  b?: ChatBubbleMessage["attachments"],
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((item, i) => item.dataUrl === b[i]?.dataUrl && item.name === b[i]?.name);
}

function terminalSnippetsEqual(
  a?: TerminalSelectionPayload[],
  b?: TerminalSelectionPayload[],
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.text === b[i]?.text &&
      item.sourceLabel === b[i]?.sourceLabel &&
      item.startLine === b[i]?.startLine &&
      item.endLine === b[i]?.endLine,
  );
}

export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  return (
    prev.m.role === next.m.role &&
    prev.m.content === next.m.content &&
    prev.m.name === next.m.name &&
    prev.m.time === next.m.time &&
    prev.hasDesktopApi === next.hasDesktopApi &&
    prev.onWriteToWorkspace === next.onWriteToWorkspace &&
    prev.onGenerateChain === next.onGenerateChain &&
    prev.onEditUserMessage === next.onEditUserMessage &&
    prev.m.historyIndex === next.m.historyIndex &&
    attachmentsEqual(prev.m.attachments, next.m.attachments) &&
    terminalSnippetsEqual(prev.m.terminalSnippets, next.m.terminalSnippets)
  );
});
