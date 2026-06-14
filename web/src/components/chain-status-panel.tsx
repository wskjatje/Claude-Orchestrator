import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  Loader2,
  PauseCircle,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChainExecutionView } from "@/lib/chain-execution-view";

export function ChainStatusPanel({
  view,
  dirty,
  chainRunning,
  lastError,
  onRefresh,
}: {
  view: ChainExecutionView;
  dirty: boolean;
  chainRunning: boolean;
  lastError?: string | null;
  onRefresh?: () => void;
}) {
  const toneClass =
    view.phase === "running"
      ? "border-success/35 bg-success/5 text-success"
      : view.phase === "completed"
        ? "border-primary/30 bg-primary/5 text-primary"
        : view.phase === "draft"
          ? "border-warning/35 bg-warning/5 text-warning"
          : view.phase === "paused"
            ? "border-muted-foreground/30 bg-secondary/50 text-muted-foreground"
            : "border-border bg-surface-elevated/40 text-foreground";

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-surface-elevated/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", toneClass)}>
              {view.phaseLabel}
              {dirty && view.phase !== "draft" ? " · 有未保存修改" : ""}
            </span>
            {view.total > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {view.completedCount}/{view.total} 步
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">{view.statusText}</p>
          <p className="font-mono text-[10.5px] text-muted-foreground/80">{view.fileLabel}</p>
        </div>
        {onRefresh ? (
          <button type="button" onClick={onRefresh} className="btn-row shrink-0 text-[11px]">
            刷新状态
          </button>
        ) : null}
      </div>

      {view.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10.5px] text-muted-foreground">
            <span>执行进度</span>
            <span>{view.progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                view.phase === "completed" ? "bg-primary" : chainRunning ? "bg-success" : "bg-primary/70",
              )}
              style={{ width: `${view.progressPct}%` }}
            />
          </div>
        </div>
      )}

      {view.stepRows.length > 0 && (
        <ol className="space-y-1">
          {view.stepRows.map((row) => (
            <li
              key={row.index}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
                row.current && chainRunning && "bg-success/10",
                row.current && !chainRunning && "bg-primary/10",
                row.done && "opacity-70",
              )}
            >
              {row.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : row.current && chainRunning ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-success" />
              ) : row.current ? (
                <PauseCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono">
                {row.index + 1}. {row.taskId} · {row.agentName || "—"}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {row.done ? "已完成" : row.current ? (chainRunning ? "执行中" : "下一待执行") : "待执行"}
              </span>
            </li>
          ))}
        </ol>
      )}

      {lastError ? (
        <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">{lastError}</span>
        </div>
      ) : null}

      <Link
        to="/reports"
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
      >
        <FileText className="h-3.5 w-3.5" />
        查看智能体执行日报
      </Link>
    </div>
  );
}
