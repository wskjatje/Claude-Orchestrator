import { CornerUpLeft, TerminalSquare } from "lucide-react";
import { ChatMarkdown } from "@/components/chat-markdown";
import {
  looksLikeMarkdown,
  looksLikeTerminalPaste,
  trimTerminalDisplay,
} from "@/lib/chat-terminal-paste";
import {
  formatTerminalChipLabel,
  inferTerminalSourceLabel,
  type TerminalSelectionPayload,
} from "@/lib/terminal-selection-meta";
import { splitUserDisplayText } from "@/lib/restore-user-composer";
import type { UserImageAttachment } from "@/lib/ollama-messages";
import { cn } from "@/lib/utils";

function TerminalChip({
  payload,
}: {
  payload: Pick<TerminalSelectionPayload, "sourceLabel" | "startLine" | "endLine">;
}) {
  return (
    <span className="terminal-context-chip inline-flex max-w-full items-center gap-1 rounded-[5px] px-1.5 py-0.5 font-mono text-[11.5px] leading-none">
      <TerminalSquare className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
      <span className="truncate">{formatTerminalChipLabel(payload)}</span>
    </span>
  );
}

/** Cursor 式用户气泡：chip + 正文 + 附图；点击正文编辑，箭头重新发起。 */
export function ChatUserMessageBody({
  content,
  attachments,
  terminalSnippets,
  onEdit,
  onResend,
  editable,
}: {
  content: string;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  onEdit?: () => void;
  onResend?: () => void;
  editable?: boolean;
}) {
  const { lead, terminal } = splitUserDisplayText(content);
  const chips: TerminalSelectionPayload[] =
    terminalSnippets?.length
      ? terminalSnippets
      : terminal
        ? [
            {
              text: terminal,
              sourceLabel: inferTerminalSourceLabel("zsh", terminal),
            },
          ]
        : [];

  const showTerminalBlock = Boolean(terminal) && !terminalSnippets?.length;
  const hasImages =
    attachments?.some((a) => a.kind === "image" && a.dataUrl.startsWith("data:")) ?? false;

  return (
    <div
      className={cn(
        "chat-user-body relative min-w-0 pr-6",
        editable && "cursor-pointer",
      )}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onClick={
        editable && onEdit
          ? (e) => {
              const t = e.target as HTMLElement;
              if (t.closest("button, a, [role=menuitem]")) return;
              onEdit();
            }
          : undefined
      }
      onKeyDown={
        editable && onEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit();
              }
            }
          : undefined
      }
    >
      {(hasImages || chips.length > 0) && (
        <div className="mb-2 flex flex-wrap items-start gap-2">
          {attachments?.map((a, idx) =>
            a.kind === "image" && a.dataUrl.startsWith("data:") ? (
              <div
                key={idx}
                className="chat-user-thumb shrink-0 overflow-hidden rounded-md border border-border/40"
              >
                <img
                  src={a.dataUrl}
                  alt={a.name || ""}
                  className="max-h-14 max-w-[4.5rem] object-cover"
                />
              </div>
            ) : null,
          )}
          {chips.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {chips.map((c, i) => (
                <TerminalChip key={i} payload={c} />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {lead ? (
        looksLikeMarkdown(lead) ? (
          <ChatMarkdown content={lead} className="text-[13px] leading-relaxed" />
        ) : (
          <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--chat-user-fg,var(--foreground))]">
            {lead}
          </div>
        )
      ) : null}
      {showTerminalBlock ? (
        <pre
          className={cn(
            "workbench-code mt-2 max-h-[min(280px,36vh)] overflow-auto rounded-md border border-border/40 bg-black/10 p-2.5 text-[11px] leading-relaxed dark:bg-black/25",
            !lead && "mt-0",
          )}
        >
          {trimTerminalDisplay(terminal!)}
        </pre>
      ) : null}

      {onResend || (editable && onEdit) ? (
        <button
          type="button"
          className="chat-user-reply-btn absolute bottom-0 right-0 rounded-md p-1 text-muted-foreground/70 opacity-0 transition hover:bg-black/10 hover:text-foreground group-hover/bubble:opacity-100 dark:hover:bg-white/10"
          title={onResend ? "重新发起提问" : "编辑并重新发送"}
          aria-label={onResend ? "重新发起提问" : "编辑并重新发送"}
          onClick={(e) => {
            e.stopPropagation();
            if (onResend) onResend();
            else onEdit?.();
          }}
        >
          <CornerUpLeft className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
