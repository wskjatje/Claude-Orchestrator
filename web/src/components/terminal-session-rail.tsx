import { SplitSquareHorizontal, TerminalSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TerminalSession } from "@/components/terminal-sessions-view";

/** 多终端时在面板右侧竖向列表 */
export function TerminalSessionRail({
  sessions,
  activeId,
  onSelect,
  onClose,
  onSplit,
}: {
  sessions: TerminalSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onSplit?: (id: string) => void;
}) {
  if (sessions.length <= 1) return null;

  return (
    <aside
      className="terminal-session-rail flex w-[120px] shrink-0 flex-col border-l border-border bg-surface-elevated/40"
      aria-label="终端列表"
    >
      <ul className="min-h-0 flex-1 overflow-y-auto scrollbar-thin py-0.5">
        {sessions.map((session) => {
          const active = session.id === activeId;
          return (
            <li key={session.id}>
              <div
                className={cn(
                  "group relative flex items-center gap-0.5 px-1 py-0.5",
                  active && "bg-secondary/70",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-left font-mono text-[11px] transition",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  title={session.label}
                >
                  <TerminalSquare className="h-3 w-3 shrink-0 opacity-60" />
                  <span className="truncate">{session.label}</span>
                </button>
                <div
                  className={cn(
                    "absolute right-0.5 flex items-center gap-0 opacity-0 transition group-hover:opacity-100",
                    active && "opacity-100",
                  )}
                >
                  {onSplit ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(session.id);
                        onSplit(session.id);
                      }}
                      title="拆分终端"
                      aria-label="拆分终端"
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <SplitSquareHorizontal className="h-3 w-3" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(session.id);
                    }}
                    title="关闭终端"
                    aria-label="关闭终端"
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
