import { TerminalSquare, X } from "lucide-react";
import { trimTerminalDisplay } from "@/lib/chat-terminal-paste";
import {
  formatTerminalChipLabel,
  type TerminalSelectionPayload,
} from "@/lib/terminal-selection-meta";
import { cn } from "@/lib/utils";

export type PendingTerminalSnippet = TerminalSelectionPayload & {
  id: string;
};

/** Cursor 式终端选区 chip：紧凑 pill，悬停显示全文、可删除 */
export function ComposerTerminalAttachments({
  snippets,
  onRemove,
  className,
}: {
  snippets: PendingTerminalSnippet[];
  onRemove: (id: string) => void;
  className?: string;
}) {
  if (!snippets.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 px-3 pt-2.5 pb-1", className)}>
      {snippets.map((snippet) => {
        const chipLabel = formatTerminalChipLabel(snippet);
        const preview = trimTerminalDisplay(snippet.text);
        return (
          <span
            key={snippet.id}
            className="group/chip terminal-context-chip inline-flex max-w-full items-center gap-1 rounded-[5px] px-1.5 py-0.5 font-mono text-[12px] leading-none"
            title={preview}
          >
            <TerminalSquare className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
            <span className="truncate">{chipLabel}</span>
            <button
              type="button"
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-current/70 opacity-0 transition hover:bg-black/10 hover:text-current group-hover/chip:opacity-100 dark:hover:bg-white/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(snippet.id);
              }}
              title="移除终端选区"
              aria-label={`移除 ${chipLabel}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
