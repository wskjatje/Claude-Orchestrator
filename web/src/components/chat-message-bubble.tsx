import { memo, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChatAssistantContent } from "@/components/chat-assistant-content";
import { ChatMessageContextMenu } from "@/components/chat-message-context-menu";
import { ChatUserMessageBody } from "@/components/chat-user-message-body";
import { CopyTextButton } from "@/components/copy-text-button";
import type { UserImageAttachment } from "@/lib/ollama-messages";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";
import type { AgentTurnMeta } from "@/lib/agent-turn-meta";
import {
  sanitizeReadonlyAssistantContent,
  shouldForceReadonlyAssistantDisplay,
  stripAgentTurnForReadonlyDisplay,
} from "@/lib/readonly-turn-display";

export type ChatBubbleMessage = {
  role: "user" | "assistant";
  name?: string;
  time?: string;
  content: string;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  /** 对应会话 history 中的下标（仅 user 消息） */
  historyIndex?: number;
  /** API / 请求失败 */
  requestError?: boolean;
  /** 硬失败详情横幅；有正文时与 content 并存（对齐 Cursor，不覆盖气泡） */
  requestErrorDetail?: string;
  agentTurn?: AgentTurnMeta;
  suppressFileEdits?: boolean;
  localChannel?: "direct" | "orch";
};

function UserMessageBody({
  content,
  attachments,
  terminalSnippets,
  editable,
  onEdit,
  onResend,
}: {
  content: string;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  editable?: boolean;
  onEdit?: () => void;
  onResend?: () => void;
}) {
  return (
    <ChatUserMessageBody
      content={content}
      attachments={attachments}
      terminalSnippets={terminalSnippets}
      editable={editable}
      onEdit={onEdit}
      onResend={onResend}
    />
  );
}

function WaitingReply({ modelName }: { modelName: string }) {
  return (
    <div
      className="chat-waiting flex items-center gap-2 py-0.5 text-muted-foreground"
      aria-live="polite"
      aria-label={`${modelName} 正在思考`}
    >
      <span className="thinking-dots" aria-hidden>
        <span className="thinking-dot" />
        <span className="thinking-dot" />
        <span className="thinking-dot" />
      </span>
      <span className="chat-waiting-label text-[12px] tracking-tight">Thinking</span>
      <span className="chat-waiting-model truncate text-[11px] opacity-55">{modelName}</span>
    </div>
  );
}

/** 通道徽章用户层文案（title 仍保留技术通道说明） */
function backendBadgeLabel(
  backend: string | undefined,
  mcpUsed?: boolean,
): { label: string; title: string } {
  if (backend === "cli") {
    return { label: "Agent", title: "执行通道：Claude Code CLI" };
  }
  if (backend === "local") {
    return mcpUsed
      ? { label: "本地 · MCP", title: "执行通道：本地编排（已调用 MCP 工具）" }
      : { label: "本地", title: "执行通道：本地编排（未调用 MCP 工具）" };
  }
  if (backend === "host") {
    return { label: "Host", title: "执行通道：Host 工具环" };
  }
  return { label: "直聊", title: "执行通道：直聊问答" };
}

function MessageBubbleInner({
  m,
  priorUserLine,
  priorUserHistoryIndex,
  hasDesktopApi,
  onWriteToWorkspace,
  onGenerateChain,
  onEditUserMessage,
  onRequestResendUserMessage,
  onAssistantContentPatch,
}: {
  m: ChatBubbleMessage;
  /** 本条助手回复前一条用户原文；用于渲染硬闸（不问改就不刷 Edit / 本地MCP） */
  priorUserLine?: string;
  /** 前一条用户 historyIndex；失败助手「重试」用 */
  priorUserHistoryIndex?: number;
  hasDesktopApi?: boolean;
  onWriteToWorkspace?: (content: string) => void;
  onGenerateChain?: (content: string) => void;
  onEditUserMessage?: (historyIndex: number) => void;
  onRequestResendUserMessage?: (historyIndex: number) => void;
  onAssistantContentPatch?: (historyIndex: number, nextContent: string) => void | Promise<void>;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (m.role === "user") {
    return (
      <ChatMessageContextMenu
        role="user"
        rowRef={rowRef}
        content={m.content}
        historyIndex={m.historyIndex}
        hasDesktopApi={hasDesktopApi}
        onEdit={
          m.historyIndex != null && onEditUserMessage
            ? () => onEditUserMessage(m.historyIndex!)
            : undefined
        }
        onResend={
          m.historyIndex != null && onRequestResendUserMessage
            ? () => onRequestResendUserMessage(m.historyIndex!)
            : undefined
        }
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
              onResend={
                m.historyIndex != null && onRequestResendUserMessage
                  ? () => onRequestResendUserMessage(m.historyIndex!)
                  : undefined
              }
            />
          </div>
        </div>
      </div>
      </ChatMessageContextMenu>
    );
  }

  const forceReadonly = shouldForceReadonlyAssistantDisplay({
    userLine: priorUserLine || "",
    suppressFileEdits: m.suppressFileEdits,
    requestError: m.requestError,
  });
  const displayContent =
    m.content === "__WAITING__"
      ? m.content
      : forceReadonly
        ? sanitizeReadonlyAssistantContent(m.content)
        : m.content;
  const displayAgentTurn = forceReadonly
    ? stripAgentTurnForReadonlyDisplay(m.agentTurn)
    : m.agentTurn;
  const suppressEdits = Boolean(forceReadonly || m.requestError || m.suppressFileEdits);
  // 仅真实直聊通道显示「直聊」；requestError 不再误标直聊（编排/tools 失败常见）
  const showDirectBadge = m.localChannel === "direct";

  return (
    <ChatMessageContextMenu
      role="assistant"
      rowRef={rowRef}
      content={displayContent}
      hasDesktopApi={hasDesktopApi}
      onWriteToWorkspace={onWriteToWorkspace}
      onGenerateChain={onGenerateChain}
      onRetry={
        m.requestError &&
        priorUserHistoryIndex != null &&
        onRequestResendUserMessage
          ? () => onRequestResendUserMessage(priorUserHistoryIndex)
          : undefined
      }
    >
    <div
      ref={rowRef}
      className="chat-message-row chat-message-row--assistant"
      data-history-index={m.historyIndex != null ? String(m.historyIndex) : undefined}
    >
      <div className="group/bubble chat-message-col chat-message-col--wide">
        <div className="chat-message-meta">
          <span className="assistant-name">{m.name ?? "assistant"}</span>
          {m.time ? <span className="chat-message-time">{m.time}</span> : null}
          {showDirectBadge ? (
            <span
              className="chat-backend-badge"
              title="执行通道：直聊问答（未使用 MCP/写盘工具）"
            >
              {m.localChannel === "direct" || forceReadonly ? "Ask" : "直聊"}
            </span>
          ) : displayAgentTurn?.backend ? (
            (() => {
              const b = backendBadgeLabel(displayAgentTurn.backend, displayAgentTurn.mcpUsed);
              return (
                <span className="chat-backend-badge" title={b.title}>
                  {b.label}
                </span>
              );
            })()
          ) : null}
          {!suppressEdits && displayAgentTurn?.mcpUsed && displayAgentTurn.backend !== "local" ? (
            <span
              className="chat-backend-badge chat-backend-badge--accent"
              title="本轮轨迹中调用了 MCP 工具"
            >
              MCP
            </span>
          ) : null}
          {displayContent !== "__WAITING__" ? (
            <CopyTextButton
              text={displayContent}
              label="复制"
              copiedLabel="已复制"
              size="xs"
              className="copy-text-btn"
            />
          ) : null}
        </div>
        <div
          className={cn(
            "chat-bubble-assistant",
            /* 仅「整段即错误文案」时整泡标红；有 detail+正文则横幅提示，正文正常展示 */
            m.requestError && !m.requestErrorDetail && "chat-bubble-assistant--error",
          )}
        >
          {m.requestErrorDetail ? (
            <div className="chat-assistant-fail-banner" role="alert">
              {m.requestErrorDetail}
            </div>
          ) : null}
          {displayContent === "__WAITING__" ? (
            <WaitingReply modelName={m.name ?? "assistant"} />
          ) : (
            <ChatAssistantContent
              content={displayContent}
              agentTurn={displayAgentTurn}
              suppressFileEdits={suppressEdits}
              onContentPatch={
                m.historyIndex != null && onAssistantContentPatch && !m.requestError && !suppressEdits
                  ? (next) => onAssistantContentPatch(m.historyIndex!, next)
                  : undefined
              }
            />
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

function agentTurnEqual(a?: AgentTurnMeta, b?: AgentTurnMeta): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.backend === b.backend &&
    a.mcpUsed === b.mcpUsed &&
    a.verified === b.verified &&
    a.summary === b.summary &&
    (a.writtenPaths || []).join("\0") === (b.writtenPaths || []).join("\0") &&
    (a.filePatches || [])
      .map((p) => `${p.path}:${(p.before || "").length}:${(p.after || "").length}`)
      .join("\0") ===
      (b.filePatches || [])
        .map((p) => `${p.path}:${(p.before || "").length}:${(p.after || "").length}`)
        .join("\0") &&
    (a.streamEvents?.length || 0) === (b.streamEvents?.length || 0) &&
    JSON.stringify(a.streamEvents || []) === JSON.stringify(b.streamEvents || []) &&
    JSON.stringify(a.turnFooter || null) === JSON.stringify(b.turnFooter || null)
  );
}

export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  return (
    prev.m.role === next.m.role &&
    prev.m.content === next.m.content &&
    prev.m.name === next.m.name &&
    prev.m.time === next.m.time &&
    prev.priorUserLine === next.priorUserLine &&
    prev.priorUserHistoryIndex === next.priorUserHistoryIndex &&
    prev.hasDesktopApi === next.hasDesktopApi &&
    prev.onWriteToWorkspace === next.onWriteToWorkspace &&
    prev.onGenerateChain === next.onGenerateChain &&
    prev.onEditUserMessage === next.onEditUserMessage &&
    prev.onRequestResendUserMessage === next.onRequestResendUserMessage &&
    prev.onAssistantContentPatch === next.onAssistantContentPatch &&
    prev.m.historyIndex === next.m.historyIndex &&
    prev.m.requestError === next.m.requestError &&
    prev.m.requestErrorDetail === next.m.requestErrorDetail &&
    prev.m.suppressFileEdits === next.m.suppressFileEdits &&
    prev.m.localChannel === next.m.localChannel &&
    agentTurnEqual(prev.m.agentTurn, next.m.agentTurn) &&
    attachmentsEqual(prev.m.attachments, next.m.attachments) &&
    terminalSnippetsEqual(prev.m.terminalSnippets, next.m.terminalSnippets)
  );
});
