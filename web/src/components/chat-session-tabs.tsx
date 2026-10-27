import { useEffect, useRef, useState } from "react";
import { Clock, MoreHorizontal, PanelRightClose, Plus, X } from "lucide-react";
import { ChatHistoryDropdown } from "@/components/chat-history-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  resolveSessionDisplayTitle,
  resolveSessionTitleTooltip,
  type ChatHistoryListItem,
} from "@/lib/chat-history-groups";
import { useDesktopGate } from "@/hooks/use-desktop-ready";
import { DESKTOP_HYDRATING } from "@/lib/ui-copy";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  title: string;
  modelId?: string | null;
  history?: { role: string; content?: string }[];
};

type Props = {
  sessions: Session[];
  activeId: string;
  sendingSessions: Record<string, boolean>;
  activeStreamRequestId: string | null;
  onSessionChange: (id: string) => void;
  onNewSession: () => void;
  onCloseSession: (id: string) => void;
  hasDesktopApi: boolean;
  projectHistoryItems: ChatHistoryListItem[];
  allHistoryItems: ChatHistoryListItem[];
  onSelectHistorySession: (sessionId: string) => void;
  onDeleteHistorySession: (sessionId: string) => void;
  onHistoryOpen?: () => void;
  /** Agent 面板：折叠右侧聊天 */
  onCollapsePanel?: () => void;
};

export function ChatSessionTabs({
  sessions,
  activeId,
  sendingSessions,
  onSessionChange,
  onNewSession,
  onCloseSession,
  hasDesktopApi,
  activeStreamRequestId,
  projectHistoryItems,
  allHistoryItems,
  onSelectHistorySession,
  onDeleteHistorySession,
  onHistoryOpen,
  onCollapsePanel,
}: Props) {
  const { phase: bridgePhase } = useDesktopGate();
  const chromeConnecting = bridgePhase === "hydrating";
  const chromeBlocked = bridgePhase === "offline" || (bridgePhase === "ready" && !hasDesktopApi);
  const pendingNewRef = useRef(false);
  const pendingHistoryRef = useRef(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyScope, setHistoryScope] = useState<"project" | "all">("project");

  useEffect(() => {
    if (bridgePhase !== "ready" || !hasDesktopApi) return;
    if (pendingNewRef.current) {
      pendingNewRef.current = false;
      onNewSession();
    }
    if (pendingHistoryRef.current) {
      pendingHistoryRef.current = false;
      setHistoryOpen(true);
      onHistoryOpen?.();
    }
  }, [bridgePhase, hasDesktopApi, onNewSession, onHistoryOpen]);

  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-session-id="${activeId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, sessions.length]);

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
    <div className="chat-session-tabs-bar group/chat-tabs flex h-8 min-h-8 shrink-0 items-stretch border-b border-border/80 bg-background/80">
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
          const tabTitle = resolveSessionDisplayTitle(s.title, s.history);
          const tabTooltip = resolveSessionTitleTooltip(s.title, s.history);
          return (
            <div
              key={s.id}
              data-session-id={s.id}
              role="tab"
              aria-selected={active}
              aria-busy={sending || undefined}
              className={cn(
                "chat-session-tab group relative flex h-8 max-w-[180px] min-w-[64px] shrink-0 cursor-pointer items-center gap-1 border-r border-border/50 px-2 text-[11.5px] transition-colors",
                active
                  ? "bg-background text-foreground shadow-[inset_0_-1px_0_0_var(--primary)]"
                  : "bg-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                active && sending && "chat-session-tab--sending",
              )}
              onClick={() => onSessionChange(s.id)}
              title={tabTooltip}
            >
              {sending ? (
                <span className="thinking-dots shrink-0" aria-hidden>
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                </span>
              ) : null}
              <span
                className={cn(
                  "chat-tab-title truncate",
                  sending && "chat-tab-title--sending",
                )}
              >
                {tabTitle}
              </span>
              {sending && active && <span className="chat-tab-progress" aria-hidden />}
              {sessions.length > 1 ? (
                <button
                  type="button"
                  className="ml-auto inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                  title="关闭会话"
                  aria-label={`关闭 ${tabTitle}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSession(s.id);
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              ) : null}
            </div>
          );
        })}

        <div className="chat-session-tabs-empty min-h-8 min-w-[8px] flex-1" aria-hidden />
      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-l border-border/70 px-1">
        <button
          type="button"
          onClick={() => {
            if (chromeBlocked) return;
            if (chromeConnecting || !hasDesktopApi) {
              pendingNewRef.current = true;
              return;
            }
            onNewSession();
          }}
          disabled={chromeBlocked}
          className={cn(
            "workbench-icon-btn workbench-icon-btn--sm disabled:opacity-40",
            chromeConnecting && "animate-pulse",
          )}
          title={chromeConnecting ? DESKTOP_HYDRATING : "新对话"}
          aria-label="新对话"
          aria-busy={chromeConnecting || undefined}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <Popover
          modal
          open={historyOpen}
          onOpenChange={(open) => {
            if (open && (chromeConnecting || !hasDesktopApi) && !chromeBlocked) {
              pendingHistoryRef.current = true;
              return;
            }
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
              disabled={chromeBlocked}
              className={cn(
                "workbench-icon-btn workbench-icon-btn--sm",
                historyOpen && "workbench-icon-btn--active",
                chromeBlocked && "opacity-40",
                chromeConnecting && "animate-pulse",
              )}
              title={chromeConnecting ? DESKTOP_HYDRATING : "对话历史"}
              aria-label="对话历史"
              aria-busy={chromeConnecting || undefined}
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={6}
            collisionPadding={12}
            /* 须高于 .chat-pane-composer(z-10) / sticky(z-12)，否则长列表盖住输入区时点不到 */
            className="z-[200] w-auto border-border/80 p-0 shadow-lg"
            data-testid="chat-history-popover"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="workbench-icon-btn workbench-icon-btn--sm"
              title="更多操作"
              aria-label="聊天更多操作"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem
              disabled={sessions.length < 2}
              onClick={() => onCloseSession(activeId)}
            >
              关闭当前会话
            </DropdownMenuItem>
            {onCollapsePanel ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCollapsePanel}>隐藏聊天面板</DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        {onCollapsePanel ? (
          <button
            type="button"
            onClick={onCollapsePanel}
            className="workbench-icon-btn workbench-icon-btn--sm"
            title="隐藏聊天面板"
            aria-label="隐藏聊天面板"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
