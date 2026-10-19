import { useMemo, useState } from "react";
import { CornerUpLeft } from "lucide-react";
import { SetiShellIcon } from "@/lib/seti/seti-file-icon";
import { ChatMarkdown } from "@/components/chat-markdown";
import { ImageLightbox } from "@/components/image-lightbox";
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
import { atMentionPillLabel, splitLeadForAtPills } from "@/lib/composer-at-mention";
import type { UserImageAttachment } from "@/lib/ollama-messages";
import { cn } from "@/lib/utils";

function TerminalChip({
  payload,
}: {
  payload: Pick<TerminalSelectionPayload, "sourceLabel" | "startLine" | "endLine">;
}) {
  return (
    <span className="terminal-context-chip inline-flex max-w-full items-center gap-1 rounded-[5px] px-1.5 py-0.5 font-mono text-[11.5px] leading-none">
      <SetiShellIcon className="text-[12px]" />
      <span className="truncate">{formatTerminalChipLabel(payload)}</span>
    </span>
  );
}

/** 用户气泡：chip + 正文 + 附图；点击正文编辑，箭头重新发起。 */
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
  const { pills: atPills, text: leadText } = useMemo(() => splitLeadForAtPills(lead), [lead]);
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

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const showTerminalBlock = Boolean(terminal) && !terminalSnippets?.length;
  const hasImages =
    attachments?.some((a) => a.kind === "image" && a.dataUrl.startsWith("data:")) ?? false;
  const hasContextRow = hasImages || chips.length > 0 || atPills.length > 0;

  return (
    <div
      className={cn(
        "chat-user-body relative min-w-0 pr-6",
        editable && "cursor-pointer",
      )}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      title={editable ? "单击编辑此提问" : undefined}
      onClick={
        editable && onEdit
          ? (e) => {
              const t = e.target as HTMLElement;
              // 缩略图 / 箭头 / 链接不抢编辑；正文区单击进入编辑（对齐 Cursor）
              if (t.closest("button, a, [role=menuitem], .chat-user-thumb")) return;
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
      {hasContextRow ? (
        <div className="mb-1.5 flex flex-wrap items-start gap-1.5">
          {attachments?.map((a, idx) =>
            a.kind === "image" && a.dataUrl.startsWith("data:") ? (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                className="chat-user-thumb shrink-0 cursor-pointer overflow-hidden rounded-md border border-border/40 transition hover:border-border/70 hover:shadow-sm"
                title="预览大图"
                aria-label={a.name || "预览图片"}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxSrc(a.dataUrl);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setLightboxSrc(a.dataUrl);
                  }
                }}
              >
                <img
                  src={a.dataUrl}
                  alt={a.name || ""}
                  className="pointer-events-none max-h-14 max-w-[4.5rem] object-cover"
                  draggable={false}
                />
              </div>
            ) : null,
          )}
          {atPills.map((token) => (
            <span
              key={token}
              className="composer-at-pill chat-user-at-pill"
              title={`@${token}`}
            >
              <span className="truncate">{atMentionPillLabel(token)}</span>
            </span>
          ))}
          {chips.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {chips.map((c, i) => (
                <TerminalChip key={i} payload={c} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {leadText ? (
        looksLikeMarkdown(leadText) ? (
          <ChatMarkdown content={leadText} className="text-[13px] leading-relaxed" />
        ) : (
          <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--chat-user-fg,var(--foreground))]">
            {leadText}
          </div>
        )
      ) : null}
      {showTerminalBlock ? (
        <pre
          className={cn(
            "workbench-code mt-2 max-h-[min(280px,36vh)] overflow-auto rounded-md border border-border/40 bg-black/10 p-2.5 text-[11px] leading-relaxed dark:bg-black/25",
            !leadText && "mt-0",
          )}
        >
          {trimTerminalDisplay(terminal!)}
        </pre>
      ) : null}

      {onResend || (editable && onEdit) ? (
        <button
          type="button"
          className="chat-user-reply-btn absolute bottom-0 right-0 rounded-md p-1 text-muted-foreground/70 opacity-0 transition hover:bg-black/10 hover:text-foreground group-hover/bubble:opacity-100 dark:hover:bg-white/10"
          title={onResend ? "重新发起提问（需确认）" : "编辑并重新发送（需确认）"}
          aria-label={onResend ? "重新发起提问" : "编辑并重新发送"}
          onClick={(e) => {
            e.stopPropagation();
            // 仅 Icon 走确认弹框；正文单击已直接进编辑
            if (onResend) onResend();
            else onEdit?.();
          }}
        >
          <CornerUpLeft className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <ImageLightbox
        src={lightboxSrc || ""}
        open={Boolean(lightboxSrc)}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
