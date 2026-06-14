import { MessageCirclePlus } from "lucide-react";
import { cn } from "@/lib/utils";

/** 终端选区浮动按钮（类 Cursor「Add to Chat ⌘L」） */
export function TerminalAddToChatButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "pointer-events-auto absolute right-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-popover/95 px-2 py-1 text-[11px] font-medium text-foreground shadow-md backdrop-blur-sm transition hover:bg-secondary",
        className,
      )}
      title="添加到对话 (⌘L)"
      aria-label="添加到对话"
    >
      <MessageCirclePlus className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      <span>Add to Chat</span>
      <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-px font-mono text-[10px] leading-none text-muted-foreground">
        ⌘L
      </kbd>
    </button>
  );
}
