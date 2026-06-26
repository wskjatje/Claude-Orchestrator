import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterHistoryItems,
  groupHistoryByDate,
  groupHistoryByWorkspace,
  shortenWorkspaceLabel,
  type ChatHistoryListItem,
} from "@/lib/chat-history-groups";
import { workspaceSessionKey } from "@/lib/chat-session-workspace";

export type ChatHistoryScope = "project" | "all";

type Props = {
  scope: ChatHistoryScope;
  onScopeChange: (scope: ChatHistoryScope) => void;
  projectItems: ChatHistoryListItem[];
  allItems: ChatHistoryListItem[];
  activeId: string;
  sendingSessions: Record<string, boolean>;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

function HistoryRow({
  item,
  active,
  sending,
  showWorkspace,
  onSelect,
  onDelete,
}: {
  item: ChatHistoryListItem;
  active: boolean;
  sending: boolean;
  showWorkspace: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group/row flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-secondary/60">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2"
        onClick={onSelect}
      >
        {sending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
        ) : active ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-left text-[12px] leading-snug">{item.title}</span>
          {showWorkspace ? (
            <span className="mt-0.5 block truncate text-left text-[10px] text-muted-foreground">
              {shortenWorkspaceLabel(workspaceSessionKey(item.workspacePath))}
            </span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover/row:opacity-100 focus-visible:opacity-100"
        title="删除此对话"
        aria-label={`删除 ${item.title}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

/** Cursor 式历史下拉内容（Bridge / SQLite 数据，非浏览器存储） */
export function ChatHistoryDropdown({
  scope,
  onScopeChange,
  projectItems,
  allItems,
  activeId,
  sendingSessions,
  onSelectSession,
  onDeleteSession,
}: Props) {
  const [query, setQuery] = useState("");
  const source = scope === "project" ? projectItems : allItems;
  const filtered = useMemo(() => filterHistoryItems(source, query), [source, query]);
  const dateGroups = useMemo(() => groupHistoryByDate(filtered), [filtered]);
  const workspaceGroups = useMemo(() => groupHistoryByWorkspace(filtered), [filtered]);

  return (
    <div className="chat-history-dropdown flex max-h-[min(440px,70vh)] w-[min(320px,calc(100vw-24px))] flex-col">
      <div className="shrink-0 border-b border-border/60 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索对话…"
            className="h-8 w-full rounded-md border border-border/70 bg-muted/15 pl-8 pr-2 text-[12px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="mt-2 flex gap-0.5 rounded-md bg-muted/25 p-0.5">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-[5px] px-2 py-1 text-[10px] font-medium transition",
              scope === "project"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onScopeChange("project")}
          >
            当前项目
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-[5px] px-2 py-1 text-[10px] font-medium transition",
              scope === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onScopeChange("all")}
          >
            全部项目
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-1.5 scrollbar-thin">
        {!filtered.length ? (
          <div className="px-2 py-6 text-center text-[11px] text-muted-foreground">
            {query.trim() ? "没有匹配的对话" : "暂无聊天记录"}
          </div>
        ) : scope === "project" ? (
          dateGroups.map((group) => (
            <section key={group.label} className="mb-2">
              <div className="px-2 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    active={item.id === activeId}
                    sending={Boolean(sendingSessions[item.id])}
                    showWorkspace={false}
                    onSelect={() => onSelectSession(item.id)}
                    onDelete={() => onDeleteSession(item.id)}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          workspaceGroups.map((group) => (
            <section key={group.workspaceKey || "__none__"} className="mb-2">
              <div className="px-2 pb-0.5 text-[10px] font-semibold text-muted-foreground">
                {group.workspaceLabel}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    active={item.id === activeId}
                    sending={Boolean(sendingSessions[item.id])}
                    showWorkspace={false}
                    onSelect={() => onSelectSession(item.id)}
                    onDelete={() => onDeleteSession(item.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
