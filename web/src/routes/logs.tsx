import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { PageRoot } from "@/components/page-layout";
import { RefreshCw, Trash2, ChevronDown, Bot } from "lucide-react";
import { ClaudeHooksPanel } from "@/components/claude-hooks-panel";
import { getDesktop } from "@/lib/desktop-api";
import { BRIDGE_OFFLINE_BANNER, PAGE_DESC } from "@/lib/ui-copy";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { cn } from "@/lib/utils";

type LogTab = "workbench" | "claude" | "trace";
type ClaudeSource = "claudeEvents" | "claudeDebugLatest" | "claudeHistoryJsonl" | "claudeLibraryLogs";

const CLAUDE_SOURCES: { value: ClaudeSource; label: string }[] = [
  { value: "claudeEvents", label: "事件日志 events.jsonl" },
  { value: "claudeDebugLatest", label: "调试 debug/latest" },
  { value: "claudeHistoryJsonl", label: "历史 history.jsonl" },
  { value: "claudeLibraryLogs", label: "系统 Library/Logs" },
];

export const Route = createFileRoute("/logs")({
  head: () => ({ meta: [{ title: "日志 · Claude Orchestrator" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "claude" || search.tab === "trace" ? (search.tab as LogTab) : ("workbench" as LogTab),
    stem: typeof search.stem === "string" ? search.stem : "",
  }),
  component: LogsPage,
});

function colorize(line: string) {
  const tsMatch = line.match(/^\[([^\]]+)\]/);
  const ts = tsMatch ? tsMatch[0] : "";
  const rest = line.slice(ts.length);
  const levelMatch = rest.match(/\s*(INFO|WARN|ERROR|DEBUG)\b/);
  const level = levelMatch ? levelMatch[1] : "";
  const after = level ? rest.slice(rest.indexOf(level) + level.length) : rest;
  const levelColor =
    level === "INFO"
      ? "text-info"
      : level === "WARN"
        ? "text-warning"
        : level === "ERROR"
          ? "text-destructive"
          : "text-muted-foreground";
  return (
    <>
      <span className="shrink-0 text-muted-foreground">{ts}</span>
      {level && <span className={`ml-2 font-semibold ${levelColor}`}>{level}</span>}
      <span className="break-all text-foreground/90">{after}</span>
    </>
  );
}

function LogsPage() {
  const hasDesktopApi = useHasDesktop();
  const { tab, stem: searchStem } = Route.useSearch();
  const [claudeSource, setClaudeSource] = useState<ClaudeSource>("claudeEvents");
  const [traceStem, setTraceStem] = useState(searchStem || "");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (searchStem) setTraceStem(searchStem);
  }, [searchStem]);

  const refresh = useCallback(async () => {
    const api = getDesktop();
    if (!api) {
      setHint(BRIDGE_OFFLINE_BANNER);
      return;
    }
    setLoading(true);
    setHint("");
    try {
      if (tab === "trace") {
        const s = traceStem.trim();
        if (!s) {
          setText("");
          setHint("请输入 Agent stem");
          return;
        }
        if (!api.readAgentExecutionLog) {
          setHint("readAgentExecutionLog 不可用");
          return;
        }
        const r = await api.readAgentExecutionLog(s);
        if (!r.ok) {
          setText("");
          setHint(r.error || "读取失败");
          return;
        }
        setText(r.content || "");
        return;
      }
      const source = tab === "workbench" ? "app" : claudeSource;
      const r = await api.logsReadTail({ source, maxLines: 400, maxBytes: 280_000 });
      if (!r.ok) {
        setText("");
        setHint(r.error || "读取失败");
        return;
      }
      setText(r.content || "");
    } finally {
      setLoading(false);
    }
  }, [tab, claudeSource, traceStem]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearAppLog = async () => {
    const api = getDesktop();
    if (!api || tab !== "workbench") return;
    await api.logsClear();
    await refresh();
  };

  const lines = useMemo(() => [...text.split("\n")].reverse(), [text]);

  const tabLabel =
    tab === "workbench"
      ? "工作台 app.log"
      : tab === "claude"
        ? CLAUDE_SOURCES.find((x) => x.value === claudeSource)?.label
        : `追踪 · ${traceStem || "?"}`;

  return (
    <AppShell variant="fill">
      <PageRoot>
        <PageHeader title="日志" description={PAGE_DESC.logs} />

        <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-7">
          {!hasDesktopApi && (
            <p className="mb-3 shrink-0 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
              {BRIDGE_OFFLINE_BANNER}
            </p>
          )}

          {hint && (
            <p className="mb-3 shrink-0 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-[12px] text-muted-foreground">
              {hint}
            </p>
          )}

          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {(
                [
                  ["workbench", "工作台"],
                  ["claude", "Claude"],
                  ["trace", "追踪"],
                ] as const
              ).map(([id, label]) => (
                <Link
                  key={id}
                  to="/logs"
                  search={{ tab: id, stem: id === "trace" ? traceStem : undefined }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[12px] font-medium transition",
                    tab === id ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            {tab === "claude" && (
              <div className="relative">
                <select
                  value={claudeSource}
                  onChange={(e) => setClaudeSource(e.target.value as ClaudeSource)}
                  className="h-8 appearance-none rounded-lg border border-border bg-surface px-3 pr-8 text-[12.5px] outline-none focus:border-primary"
                >
                  {CLAUDE_SOURCES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            )}

            {tab === "trace" && (
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <input
                  value={traceStem}
                  onChange={(e) => setTraceStem(e.target.value)}
                  placeholder="Agent 标识（stem）"
                  className="h-8 w-40 rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none focus:border-primary"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={!hasDesktopApi || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium hover:bg-secondary disabled:opacity-40"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> 刷新
            </button>
            {tab === "workbench" && (
              <button
                type="button"
                onClick={() => void clearAppLog()}
                disabled={!hasDesktopApi || loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] text-muted-foreground hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" /> 清空 app.log
              </button>
            )}
          </div>

          {tab === "claude" && (
            <details className="mb-3 shrink-0 rounded-xl border border-border bg-surface-elevated/60">
              <summary className="cursor-pointer px-4 py-2 text-[12px] font-medium text-foreground">
                Claude Hooks（只读）
                <span className="ml-2 font-normal text-muted-foreground">
                  配置在 ~/.claude/settings.json，Orchestrator 无需单独配置
                </span>
              </summary>
              <div className="border-t border-border px-4 py-3">
                <ClaudeHooksPanel compact />
              </div>
            </details>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xs">
            <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-secondary/30 px-4 py-2.5">
              <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                {tabLabel} · tail · 最新在上
              </span>
            </div>
            <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words bg-secondary/20 px-4 py-3 font-mono text-[11.5px] leading-relaxed scrollbar-thin">
              {lines.map((line, i) => (
                <div key={i} className="rounded-sm py-0.5 hover:bg-secondary/40">
                  {line.trim() ? colorize(line) : <span className="text-muted-foreground/40"> </span>}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </PageRoot>
    </AppShell>
  );
}
