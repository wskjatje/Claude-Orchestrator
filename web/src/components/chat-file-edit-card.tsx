import { useState } from "react";
import { ChevronRight, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fileBadgeFromPath,
  type ChatFileEdit,
  type ChatFileEditLine,
} from "@/lib/parse-chat-file-edits";

function EditLine({ line }: { line: ChatFileEditLine }) {
  return (
    <div
      className={cn(
        "chat-file-edit-line font-mono text-[11.5px] leading-[1.45] whitespace-pre-wrap break-all",
        line.kind === "add" && "chat-file-edit-line--add",
        line.kind === "del" && "chat-file-edit-line--del",
        line.kind === "ctx" && "text-muted-foreground",
      )}
    >
      {line.text || " "}
    </div>
  );
}

/** Cursor 式紧凑文件行：默认仅文件名 + +/-，点击展开 diff。 */
export function ChatFileEditCard({ edit }: { edit: ChatFileEdit }) {
  const [open, setOpen] = useState(false);
  const badge = fileBadgeFromPath(edit.path);
  const fileName = edit.path.split("/").pop() ?? edit.path;
  const hasPreview = edit.previewLines.length > 0;
  const showStats = edit.added > 0 || edit.removed > 0;
  const expandable = hasPreview;

  return (
    <div className="chat-file-edit-row">
      <button
        type="button"
        className={cn(
          "chat-file-edit-row-btn flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left transition",
          expandable && "hover:bg-muted/40",
          !expandable && "cursor-default",
        )}
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={expandable ? open : undefined}
      >
        {expandable ? (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
        ) : (
          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            <span className="chat-file-edit-badge">{badge}</span>
          </span>
        )}
        <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-500/85 dark:text-sky-400/90" aria-hidden />
        <span className="min-w-0 truncate font-mono text-[12px] text-foreground/90" title={edit.path}>
          {fileName}
        </span>
        {showStats ? (
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums">
            {edit.added > 0 ? (
              <span className="text-[var(--diff-add-fg)]">+{edit.added}</span>
            ) : null}
            {edit.removed > 0 ? (
              <span className="ml-1.5 text-[var(--diff-del-fg)]">-{edit.removed}</span>
            ) : null}
          </span>
        ) : edit.summaryOnly ? (
          <span className="ml-auto shrink-0 text-[10.5px] text-muted-foreground">已写入</span>
        ) : null}
      </button>
      {open && hasPreview ? (
        <div className="chat-file-edit-preview mt-0.5 overflow-hidden rounded-md border border-border/50 bg-code-bg/70">
          <div className="max-h-[min(220px,32vh)] overflow-auto px-2.5 py-2">
            {edit.previewLines.map((line, i) => (
              <EditLine key={i} line={line} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChatFileEditList({ edits }: { edits: ChatFileEdit[] }) {
  if (!edits.length) return null;
  return (
    <div className="chat-file-edit-list mt-2 space-y-0.5">
      {edits.map((edit) => (
        <ChatFileEditCard key={edit.path} edit={edit} />
      ))}
    </div>
  );
}
