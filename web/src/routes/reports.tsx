import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { PageBanner, PageRoot } from "@/components/page-layout";
import {
  Bot,
  RefreshCw,
  Search,
  Save,
  Sparkles,
  ClipboardCopy,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";
import { getDesktop } from "@/lib/desktop-api";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { resolveAgentDisplayName } from "@/lib/agent-display-name";
import type { AgentExecRegistryEntry } from "@/types/desktop";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "智能体执行日报 · 本地代码助手" }] }),
  component: AgentDailyReportsPage,
});

type AgentRow = {
  id: string;
  stem: string;
  basename: string;
  displayName: string;
  description: string;
  source: "root" | "sanshengliubu";
};

type ViewTab = "agent" | "project";

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shiftDate(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function diskItemsToRows(
  items: {
    basename: string;
    stem: string;
    description: string;
    displayName?: string;
    name?: string;
    nameZh?: string;
    heading?: string;
    source: "root" | "sanshengliubu";
  }[],
): AgentRow[] {
  return items.map((row) => ({
    id: row.source === "sanshengliubu" ? `sl:${row.stem}` : row.stem,
    stem: row.stem,
    basename: row.basename,
    displayName:
      row.displayName?.trim() ||
      resolveAgentDisplayName({
        stem: row.stem,
        basename: row.basename,
        name: row.name,
        nameZh: row.nameZh,
        heading: row.heading,
        description: row.description,
      }),
    description: row.description.trim() || "（可在 frontmatter 中加 description）",
    source: row.source,
  }));
}

function AgentDailyReportsPage() {
  const hasDesktopApi = useHasDesktop();
  const [viewTab, setViewTab] = useState<ViewTab>("agent");
  const [date, setDate] = useState(todayIso);
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [q, setQ] = useState("");
  const [activeStem, setActiveStem] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [projectContent, setProjectContent] = useState("");
  const [projectDraft, setProjectDraft] = useState<string | null>(null);
  const [projectMissing, setProjectMissing] = useState(false);
  const [registry, setRegistry] = useState<Map<string, AgentExecRegistryEntry>>(new Map());

  const loadAgentRegistry = useCallback(async (d: string) => {
    const api = getDesktop();
    if (!api?.agentDailyReportsListAgentRegistry) {
      setRegistry(new Map());
      return;
    }
    const r = await api.agentDailyReportsListAgentRegistry(d);
    if (!r.ok || !r.agents) {
      setRegistry(new Map());
      return;
    }
    setRegistry(new Map(r.agents.map((a) => [a.stem, a])));
  }, []);

  const reloadAgentIndex = useCallback(async () => {
    const api = getDesktop();
    if (!api?.listClaudeAgentMarkdown) {
      setRows([]);
      setListErr(null);
      return;
    }
    setListLoading(true);
    setListErr(null);
    const r = await api.listClaudeAgentMarkdown();
    setListLoading(false);
    if (!r.ok || !r.items?.length) {
      setListErr(r.error ?? "无法枚举 ~/.claude/agents");
      setRows([]);
      setActiveStem(null);
      return;
    }
    const next = diskItemsToRows(r.items);
    setRows(next);
    setActiveStem((prev) => {
      if (prev && next.some((x) => x.stem === prev)) return prev;
      return next[0]?.stem ?? null;
    });
  }, []);

  const loadAgentReport = useCallback(async (stem: string | null, d: string) => {
    if (!stem) {
      setContent("");
      setDraft(null);
      setMissing(false);
      return;
    }
    const api = getDesktop();
    if (!api?.agentDailyReportsGet) {
      setLoadErr("请重启 npm run web:dev:full 以加载日报 API");
      return;
    }
    setLoading(true);
    setLoadErr(null);
    const r = await api.agentDailyReportsGet({ date: d, stem });
    setLoading(false);
    if (!r.ok) {
      setLoadErr(r.error ?? "读取失败");
      setContent("");
      setDraft(null);
      return;
    }
    setContent(r.content ?? "");
    setDraft(null);
    setMissing(Boolean(r.missing));
  }, []);

  const loadProjectReport = useCallback(async (d: string) => {
    const api = getDesktop();
    if (!api?.dailyReportsGet) return;
    setLoading(true);
    const r = await api.dailyReportsGet(d);
    setLoading(false);
    if (!r.ok) {
      setLoadErr(r.error ?? "读取失败");
      return;
    }
    setProjectContent(r.content ?? "");
    setProjectDraft(null);
    setProjectMissing(Boolean(r.missing));
  }, []);

  useEffect(() => {
    if (!hasDesktopApi) return;
    void reloadAgentIndex();
  }, [hasDesktopApi, reloadAgentIndex]);

  useEffect(() => {
    if (!hasDesktopApi) return;
    void loadAgentRegistry(date);
  }, [hasDesktopApi, date, loadAgentRegistry]);

  useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api?.onAgentExecChanged) return;
    return api.onAgentExecChanged((detail) => {
      const d = detail && typeof detail === "object" && "date" in detail ? String(detail.date) : date;
      if (d === date) void loadAgentRegistry(date);
    });
  }, [hasDesktopApi, date, loadAgentRegistry]);

  useEffect(() => {
    if (viewTab !== "agent" || !hasDesktopApi || !activeStem) return;
    void loadAgentReport(activeStem, date);
  }, [activeStem, date, viewTab, loadAgentReport, hasDesktopApi]);

  useEffect(() => {
    if (viewTab !== "project" || !hasDesktopApi) return;
    void loadProjectReport(date);
  }, [date, viewTab, loadProjectReport, hasDesktopApi]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base = !qq
      ? rows
      : rows.filter(
          (r) =>
            r.stem.toLowerCase().includes(qq) ||
            r.displayName.toLowerCase().includes(qq) ||
            r.description.toLowerCase().includes(qq),
        );
    return [...base].sort((a, b) => {
      const ra = registry.get(a.stem);
      const rb = registry.get(b.stem);
      const wa = ra?.status === "working" ? 0 : 1;
      const wb = rb?.status === "working" ? 0 : 1;
      if (wa !== wb) return wa - wb;
      const oa = ra?.order ?? Number.MAX_SAFE_INTEGER;
      const ob = rb?.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.displayName.localeCompare(b.displayName, "zh-CN");
    });
  }, [rows, q, registry]);

  const executedTodayCount = useMemo(
    () => [...registry.values()].filter((e) => e.execCount > 0 || e.status === "working").length,
    [registry],
  );

  const workingCount = useMemo(
    () => [...registry.values()].filter((e) => e.status === "working").length,
    [registry],
  );

  const activeRow = rows.find((r) => r.stem === activeStem) ?? null;
  const editing = draft ?? content;
  const isDirty = draft !== null;

  const saveAgent = async () => {
    if (!activeStem || draft === null) return;
    const api = getDesktop();
    if (!api?.agentDailyReportsSave) return;
    setBusy("save");
    const r = await api.agentDailyReportsSave({ date, stem: activeStem, content: draft });
    setBusy(null);
    if (!r.ok) setHint(r.error || "保存失败");
    else {
      setHint("已保存");
      setContent(draft);
      setDraft(null);
      setMissing(false);
    }
  };

  const buildFromEvents = async () => {
    if (!activeStem) return;
    const api = getDesktop();
    if (!api?.agentDailyReportsBuildFromEvents) return;
    setBusy("build");
    const r = await api.agentDailyReportsBuildFromEvents({ date, stem: activeStem });
    setBusy(null);
    if (!r.ok) setHint(r.error || "重建失败");
    else {
      setHint("已从 events 重建活动记录");
      void loadAgentReport(activeStem, date);
    }
  };

  const generateReport = async () => {
    if (!activeStem) return;
    const api = getDesktop();
    if (!api?.agentDailyReportsGenerate) return;
    setBusy("gen");
    setHint("正在调用 Claude 生成摘要…");
    const r = await api.agentDailyReportsGenerate({ date, stem: activeStem });
    setBusy(null);
    if (!r.ok) setHint(r.error || "生成失败");
    else {
      setHint("日报已生成");
      void loadAgentReport(activeStem, date);
    }
  };

  const saveProject = async () => {
    const body = projectDraft ?? projectContent;
    const api = getDesktop();
    if (!api?.dailyReportsSave) return;
    setBusy("proj");
    const r = await api.dailyReportsSave({ date, content: body });
    setBusy(null);
    if (!r.ok) setHint(r.error || "保存失败");
    else {
      setHint("项目汇总已保存");
      setProjectContent(body);
      setProjectDraft(null);
      setProjectMissing(false);
    }
  };

  const copyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setHint("已复制");
    } catch {
      setHint("复制失败");
    }
  };

  return (
    <AppShell variant="fill">
      <PageRoot>
        <PageHeader
          title="智能体执行日报"
          description="按 Agent × 日期沉淀 Markdown；原始追踪见日志中心"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setViewTab("agent")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[12px] font-medium",
                    viewTab === "agent" ? "bg-primary-soft text-primary" : "text-muted-foreground",
                  )}
                >
                  按智能体
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab("project")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[12px] font-medium",
                    viewTab === "project" ? "bg-primary-soft text-primary" : "text-muted-foreground",
                  )}
                >
                  项目汇总
                </button>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface px-1">
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setDate((d) => shiftDate(d, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value || todayIso())}
                  className="h-8 border-0 bg-transparent px-1 font-mono text-[12px] outline-none"
                />
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setDate((d) => shiftDate(d, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                disabled={listLoading || !hasDesktopApi}
                onClick={() => {
                  void reloadAgentIndex();
                  void loadAgentRegistry(date);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium hover:bg-secondary disabled:opacity-40"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", listLoading && "animate-spin")} />
                刷新
              </button>
              <InfoHint side="left">
                聊天 /agent 与任务链会写入 agent_exec，并自动追加到当日 Agent 日报「今日活动」。
              </InfoHint>
            </div>
          }
        />

        {!hasDesktopApi && (
          <PageBanner className="border-warning/30 bg-warning/10 text-warning">
            Bridge 未连接：请运行 npm run web:dev:full。
          </PageBanner>
        )}
        {(hint || listErr || loadErr) && (
          <div className="shrink-0 border-b border-border bg-primary-soft/25 px-4 py-2 text-[12px] sm:px-6">
            {listErr && <span className="text-destructive">{listErr} </span>}
            {loadErr && <span className="text-destructive">{loadErr} </span>}
            {hint && <span className="text-foreground">{hint}</span>}
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
          {viewTab === "agent" ? (
            <>
              <aside className="flex min-h-0 flex-col border-r border-border bg-surface-elevated/40">
                <div className="border-b border-border p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="搜索智能体…"
                      className="h-8 w-full rounded-lg border border-border bg-surface pl-8 pr-2 text-[12px] outline-none focus:border-primary"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {date} · {q.trim() ? `匹配 ${filtered.length} / 全部 ${rows.length}` : `全部 ${rows.length} 个`}
                    {workingCount > 0 ? ` · 工作中 ${workingCount} 个（置顶）` : ""}
                    {executedTodayCount > 0 ? ` · 今日已执行 ${executedTodayCount} 个` : ""}
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-2">
                  {filtered.map((r) => {
                    const meta = registry.get(r.stem);
                    const isWorking = meta?.status === "working";
                    const hasRun = Boolean(meta && (meta.execCount > 0 || isWorking));
                    return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setActiveStem(r.stem);
                        setDraft(null);
                      }}
                      className={cn(
                        "mb-1 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition",
                        r.stem === activeStem ? "bg-primary-soft ring-1 ring-primary/20" : "hover:bg-secondary/60",
                      )}
                    >
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                        <Bot className="h-3.5 w-3.5" />
                        {isWorking ? (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface-elevated animate-pulse" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {hasRun && meta ? (
                            <span className="shrink-0 font-mono text-[9px] text-muted-foreground">#{meta.order}</span>
                          ) : null}
                          <div className="truncate text-[12px] font-semibold">{r.displayName}</div>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="truncate font-mono text-[10px] text-muted-foreground">{r.stem}</span>
                          {meta ? (
                            <span
                              className={cn(
                                "shrink-0 rounded px-1 py-px text-[9px] font-medium",
                                isWorking
                                  ? "bg-success/15 text-success"
                                  : hasRun
                                    ? "bg-secondary text-muted-foreground"
                                    : "text-muted-foreground/60",
                              )}
                            >
                              {isWorking ? "工作中" : hasRun ? "空闲" : "未执行"}
                            </span>
                          ) : (
                            <span className="shrink-0 text-[9px] text-muted-foreground/60">未执行</span>
                          )}
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
              </aside>

              <div className="flex min-h-0 flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 sm:px-5">
                  <span className="truncate text-[12px] font-medium">
                    {activeRow ? `${activeRow.displayName} · ${date}` : "—"}
                    {missing && !isDirty ? (
                      <span className="ml-2 text-[11px] font-normal text-muted-foreground">（尚无日报，可重建或编辑）</span>
                    ) : null}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/logs"
                      search={{ tab: "trace", stem: activeStem ?? undefined }}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> 原始追踪
                    </Link>
                    <button
                      type="button"
                      disabled={!activeStem || !hasDesktopApi || Boolean(busy)}
                      onClick={() => void buildFromEvents()}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> 从 events 重建
                    </button>
                    <button
                      type="button"
                      disabled={!activeStem || !hasDesktopApi || Boolean(busy)}
                      onClick={() => void generateReport()}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> 生成日报
                    </button>
                    {isDirty ? (
                      <button
                        type="button"
                        onClick={() => void saveAgent()}
                        className="btn-gradient-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
                      >
                        <Save className="h-3.5 w-3.5" /> 保存
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={!editing}
                          onClick={() => void copyText(editing)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
                        >
                          <ClipboardCopy className="h-3.5 w-3.5" /> 复制
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft(editing || `# ${activeStem} · ${date}\n`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary"
                        >
                          编辑
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <textarea
                  value={editing}
                  readOnly={!isDirty}
                  onChange={(e) => isDirty && setDraft(e.target.value)}
                  className={cn(
                    "min-h-0 flex-1 resize-none border-0 bg-code-bg/30 px-4 py-4 font-mono text-[12px] leading-relaxed outline-none sm:px-6",
                    !isDirty && "text-foreground/90",
                  )}
                  placeholder={loading ? "加载中…" : "选择左侧智能体"}
                />
              </div>
            </>
          ) : (
            <div className="col-span-full flex min-h-0 flex-col lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 sm:px-5">
                <span className="inline-flex items-center gap-2 text-[12px] font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  项目汇总 · {date}-mcp-agent.md
                  {projectMissing ? (
                    <span className="font-normal text-muted-foreground">（暂无，定时任务 reportAppend 会写入）</span>
                  ) : null}
                </span>
                <div className="flex gap-2">
                  {projectDraft !== null ? (
                    <button
                      type="button"
                      onClick={() => void saveProject()}
                      className="btn-gradient-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
                    >
                      <Save className="h-3.5 w-3.5" /> 保存
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProjectDraft(projectContent || `# 项目日报 · ${date}\n`)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary"
                    >
                      编辑
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={projectDraft ?? projectContent}
                readOnly={projectDraft === null}
                onChange={(e) => projectDraft !== null && setProjectDraft(e.target.value)}
                className="min-h-0 flex-1 resize-none border-0 bg-code-bg/30 px-4 py-4 font-mono text-[12px] leading-relaxed outline-none sm:px-6"
                placeholder="（暂无项目汇总）"
              />
            </div>
          )}
        </div>
      </PageRoot>
    </AppShell>
  );
}
