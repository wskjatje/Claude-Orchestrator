import { useSyncExternalStore, type RefObject } from "react";
import { ChatComposerShell, type ChatComposerShellProps } from "@/components/chat-composer-shell";
import { cn } from "@/lib/utils";
import {
  getComposerFileBarState,
  subscribeComposerFileBar,
} from "@/lib/workbench-composer-file-bar";

export type ChatComposerCursorProps = ChatComposerShellProps & {
  dockRef: RefObject<HTMLDivElement | null>;
  chainStatusLabel: string;
  chainStatusTone: "active" | "paused" | "done" | "neutral" | "idle";
};

/** Cursor 式 Composer：底部始终保留输入框；历史编辑在顶部内联 Composer。 */
export function ChatComposerCursor({
  dockRef,
  chainStatusLabel,
  chainStatusTone,
  editHistoryActive,
  onCancelEdit,
  ...shellProps
}: ChatComposerCursorProps) {
  const fileBar = useSyncExternalStore(
    subscribeComposerFileBar,
    getComposerFileBarState,
    getComposerFileBarState,
  );

  return (
    <div ref={dockRef} className="chat-pane-composer border-t border-border/70 bg-card">
      {fileBar.count > 0 ? (
        <div className="composer-file-changes-bar mb-2 flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/35 px-2.5 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
            &gt; {fileBar.count} Files
          </span>
          <button
            type="button"
            className="shrink-0 text-[12px] text-muted-foreground transition hover:text-foreground"
            onClick={() => fileBar.undoAll?.()}
          >
            Undo All
          </button>
          <button
            type="button"
            className="shrink-0 rounded-md bg-secondary px-2.5 py-0.5 text-[12px] font-medium text-foreground transition hover:bg-secondary/80"
            onClick={() => fileBar.review?.()}
          >
            Review
          </button>
        </div>
      ) : null}

      <ChatComposerShell
        {...shellProps}
        editHistoryActive={editHistoryActive}
        onCancelEdit={onCancelEdit}
        variant="dock"
      />

      {chainStatusLabel &&
      chainStatusLabel !== "链：—" &&
      chainStatusTone !== "done" ? (
        <div className="mt-1.5 flex justify-start px-0.5">
          <span
            className={cn(
              "inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium",
              chainStatusTone === "active" &&
                "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              chainStatusTone === "idle" &&
                "border-sky-400/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
              chainStatusTone === "paused" &&
                "border-amber-400/45 bg-amber-500/12 text-amber-800 dark:text-amber-300",
              chainStatusTone === "done" &&
                "border-blue-400/40 bg-blue-500/10 text-blue-800 dark:text-blue-300",
              chainStatusTone === "neutral" &&
                "border-border/70 bg-background/35 text-muted-foreground",
            )}
            title="任务链状态"
          >
            {chainStatusLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
