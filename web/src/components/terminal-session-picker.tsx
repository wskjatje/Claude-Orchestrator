import { ChevronDown, TerminalSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TerminalSession } from "@/components/terminal-sessions-view";

/** 类 Cursor：仅一个终端时，顶栏右侧显示 shell 下拉 */
export function TerminalSessionPicker({
  sessions,
  activeId,
  onSelect,
}: {
  sessions: TerminalSession[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  if (sessions.length !== 1) return null;

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];
  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-[9rem] items-center gap-1 rounded px-1.5 py-1 font-mono text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          title={`终端: ${active.label}`}
        >
          <TerminalSquare className="h-3 w-3 shrink-0 opacity-70" />
          <span className="truncate">{active.label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem disabled className="font-mono text-[11px]">
          {active.label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {sessions.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => onSelect(s.id)}>
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
