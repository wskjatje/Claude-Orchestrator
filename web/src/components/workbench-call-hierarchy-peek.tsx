import { useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  clearCallHierarchyPeek,
  getCallHierarchyPeek,
  getCallHierarchyStackDepth,
  popCallHierarchyPeek,
  setCallHierarchyPeek,
  subscribeCallHierarchyPeek,
  type CallHierarchyPeekState,
} from "@/lib/workbench-call-hierarchy";
import { fetchTsCallHierarchy, type TsCallHierarchyItem } from "@/lib/workspace-tsservice-client";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import { useWorkbenchWorkspaceOptional } from "@/contexts/workbench-workspace-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Row({
  it,
  onOpen,
  onExpand,
}: {
  it: TsCallHierarchyItem;
  onOpen: () => void;
  onExpand: () => void;
}) {
  return (
    <li className="flex items-center gap-1 py-0.5">
      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        title="展开此符号的调用层次"
        aria-label="展开"
        onClick={onExpand}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left font-mono text-[length:var(--font-size-xs)] text-foreground hover:underline"
        onClick={onOpen}
        title={`${it.relPath}:${it.line}`}
      >
        {it.name}
        {it.containerName ? (
          <span className="text-muted-foreground"> · {it.containerName}</span>
        ) : null}
        <span className="text-muted-foreground">
          {" "}
          — {it.relPath}:{it.line}
        </span>
      </button>
    </li>
  );
}

/** Call Hierarchy Peek（真 LSP；展开可返回上一层） */
export function WorkbenchCallHierarchyPeek() {
  const peek = useSyncExternalStore(
    subscribeCallHierarchyPeek,
    getCallHierarchyPeek,
    getCallHierarchyPeek,
  );
  const stackDepth = useSyncExternalStore(
    subscribeCallHierarchyPeek,
    getCallHierarchyStackDepth,
    getCallHierarchyStackDepth,
  );
  const ws = useWorkbenchWorkspaceOptional();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");

  if (!peek?.item) return null;

  const openAt = (it: TsCallHierarchyItem) => {
    setPendingLineGoto(it.relPath, it.line, it.column || 1);
    void ws?.openFile?.(it.relPath, { line: it.line, column: it.column || 1, pin: true });
  };

  const expandAt = async (it: TsCallHierarchyItem) => {
    setBusy(true);
    try {
      const r = await fetchTsCallHierarchy({
        relPath: it.relPath,
        line: it.line,
        column: it.column || 1,
      });
      if (!r?.item) {
        toast.message(r?.error || "此处无调用层次");
        return;
      }
      const next: CallHierarchyPeekState = {
        item: r.item,
        incoming: r.incoming,
        outgoing: r.outgoing,
      };
      setCallHierarchyPeek(next, { push: true });
    } finally {
      setBusy(false);
    }
  };

  const list = tab === "incoming" ? peek.incoming : peek.outgoing;

  return (
    <div
      className="absolute bottom-2 left-2 right-2 z-30 max-h-[40%] overflow-hidden rounded-md border border-border bg-surface-elevated shadow-lg"
      role="dialog"
      aria-label="调用层次结构"
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-2.5 py-1.5">
        {stackDepth > 0 ? (
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="返回上一层"
            aria-label="返回上一层"
            onClick={() => popCallHierarchyPeek()}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <span className="min-w-0 flex-1 truncate font-mono text-[length:var(--font-size-xs)] font-medium">
          {peek.item.name}
          {peek.item.containerName ? (
            <span className="font-normal text-muted-foreground"> · {peek.item.containerName}</span>
          ) : null}
        </span>
        <button
          type="button"
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-medium",
            tab === "incoming" ? "bg-secondary text-foreground" : "text-muted-foreground",
          )}
          onClick={() => setTab("incoming")}
        >
          Incoming ({peek.incoming.length})
        </button>
        <button
          type="button"
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-medium",
            tab === "outgoing" ? "bg-secondary text-foreground" : "text-muted-foreground",
          )}
          onClick={() => setTab("outgoing")}
        >
          Outgoing ({peek.outgoing.length})
        </button>
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="关闭"
          onClick={() => clearCallHierarchyPeek()}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-[14rem] overflow-y-auto px-2 py-1">
        {busy ? (
          <p className="px-1 py-2 text-[length:var(--font-size-xs)] text-muted-foreground">加载中…</p>
        ) : list.length === 0 ? (
          <p className="px-1 py-2 text-[length:var(--font-size-xs)] text-muted-foreground">
            {tab === "incoming" ? "无传入调用" : "无传出调用"}
          </p>
        ) : (
          <ul>
            {list.map((it, i) => (
              <Row
                key={`${it.relPath}:${it.line}:${it.column}:${i}`}
                it={it}
                onOpen={() => openAt(it)}
                onExpand={() => void expandAt(it)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
