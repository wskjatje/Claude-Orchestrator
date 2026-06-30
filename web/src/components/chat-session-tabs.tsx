import { useEffect, useRef, useState } from "react";
import {
  Clock,
  MoreHorizontal,
  PanelRightClose,
  Plus,
  TerminalSquare,
  X,
} from "lucide-react";
import { ChatHistoryDropdown } from "@/components/chat-history-dropdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ChatHistoryListItem } from "@/lib/chat-history-groups";
import { cn } from "@/lib/utils";

type Session = { id: string; title: string; modelId?: string | null };

type Props = {
  sessions: Session[];
  activeId: string;
  sendingSessions: Record<string, boolean>;
  activeStreamRequestId: string | null;
  onSessionChange: (id: string) => void;
  onNewSession: () => void;
  onCloseSession: (id: string) => void;
  hasDesktopApi: boolean;
  onClosePanel: () => void;
  terminalOpen?: boolean;
  onToggleTerminal?: () => void;
  projectHistoryItems: ChatHistoryListItem[];
  allHistoryItems: ChatHistoryListItem[];
  onSelectHistorySession: (sessionId: string) => void;
  onDeleteHistorySession: (sessionId: string) => void;
  onHistoryOpen?: () => void;
};

export function ChatSessionTabs({
  sessions,
  activeId,
  sendingSessions,
  onSessionChange,
  onNewSession,
  onCloseSession,
  hasDesktopApi,
  onClosePanel,
  activeStreamRequestId,
  terminalOpen,
  onToggleTerminal,
  projectHistoryItems,
  allHistoryItems,
  onSelectHistorySession,
  onDeleteHistorySession,
  onHistoryOpen,
}: Props) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyScope, setHistoryScope] = useState<"project" | "all">("project");

  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-session-id="${activeId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, sessions.length]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const onTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabsRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  };

  const handleSelectHistory = (sessionId: string) => {
    onSelectHistorySession(sessionId);
    setHistoryOpen(false);
  };

  const handleDeleteHistory = (sessionId: string) => {
    onDeleteHistorySession(sessionId);
  };

  return (
    <div className="chat-session-tabs-bar group/chat-tabs flex h-[35px] min-h-[35px] shrink-0 items-stretch border-b border-border bg-card/90">
      <div
        ref={tabsRef}
        onWheel={onTabsWheel}
        className="chat-session-tabs-scroll flex min-w-0 flex-1 items-stretch"
        role="tablist"
        aria-label="聊天会话"
      >
        {sessions.map((s) => {
          const active = s.id === activeId;
          const sending = Boolean(sendingSessions[s.id]) && activeStreamRequestId !== null;
          return (
            <div
              key={s.id}
              data-session-id={s.id}
              role="tab"
              aria-selected={active}
              aria-busy={sending || undefined}
              className={cn(
                "chat-session-tab group relative flex h-[35px] max-w-[200px] min-w-[72px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-border/70 px-2 text-[11px] transition-colors",
                active
                  ? "bg-background text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                active && sending && "chat-session-tab--sending",
              )}
              onClick={() => onSessionChange(s.id)}
              title={s.title}
            >
              {/* 思考指示器：均衡条动画 */}
              {sending ? (
                <span className="thinking-dots shrink-0" aria-hidden>
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                </span>
              ) : (
                <span className="inline-block h-2 w-2 shrink-0 rounded-full opacity-40" aria-hidden />
              )}
              <span
                className={cn(
                  "chat-tab-title",
                  sending && "chat-tab-title--sending",
                )}
              >
                {s.title}
              </span>
              {/* 底部思考进度条 */}
              {sending && active && <span className="chat-tab-progress" aria-hidden />}
              {sessions.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-80 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                  title="关闭会话"
                  aria-label={`关闭 ${s.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSession(s.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          );
        })}

        <div className="chat-session-tabs-empty min-h-[35px] min-w-[8px] flex-1" aria-hidden />
      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-l border-border/70 px-1">
        <button
          type="button"
          onClick={onNewSession}
          disabled={!hasDesktopApi}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
          title="新对话"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <Popover
          open={historyOpen}
          onOpenChange={(open) => {
            setHistoryOpen(open);
            if (open) {
              setHistoryScope("project");
              onHistoryOpen?.();
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!hasDesktopApi}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md transition",
                historyOpen
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                !hasDesktopApi && "opacity-40",
              )}
              title="对话历史"
              aria-label="对话历史"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={6}
            className="w-auto border-border/80 p-0 shadow-lg"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <ChatHistoryDropdown
              scope={historyScope}
              onScopeChange={setHistoryScope}
              projectItems={projectHistoryItems}
              allItems={allHistoryItems}
              activeId={activeId}
              sendingSessions={sendingSessions}
              onSelectSession={handleSelectHistory}
              onDeleteSession={handleDeleteHistory}
            />
          </PopoverContent>
        </Popover>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={!hasDesktopApi || sessions.length <= 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
            title="更多"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-popover py-1 shadow-lg">
              {sessions.length > 1 ? (
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-[11px] text-destructive transition hover:bg-secondary"
                  onClick={() => {
                    onCloseSession(activeId);
                    setMenuOpen(false);
                  }}
                >
                  关闭当前会话
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {onToggleTerminal ? (
          <button
            type="button"
            onClick={onToggleTerminal}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md transition",
              terminalOpen
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            title="终端（Ctrl+`）"
            aria-pressed={terminalOpen}
          >
            <TerminalSquare className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClosePanel}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          title="隐藏聊天面板"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
