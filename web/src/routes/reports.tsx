import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { PageBanner } from "@/components/page-layout";
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";
import { getDesktop } from "@/lib/desktop-api";
import { BRIDGE_OFFLINE_BANNER, PAGE_DESC, REPORTS_API_OFFLINE, REPORTS_INFO_HINT } from "@/lib/ui-copy";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { resolveAgentDisplayName } from "@/lib/agent-display-name";
import {
  mergeAgentRowsWithRegistry,
  resolveRegistryEntry,
} from "@/lib/agent-exec-registry-match";
import type { AgentExecRegistryEntry } from "@/types/desktop";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "智能体执行日报 · Claude Orchestrator" }] }),
  component: AgentDailyReportsPage,
});

type AgentRow = {
  id: string;
  stem: string;
  basename: string;
  displayName: string;
  description: string;
  source: "root" | "sanshengliubu";
  registryOnly?: boolean;
};

type ViewTab = "agent" | "project";
type StatusFilter = "全部" | "工作中" | "已执行" | "未执行";

const STATUS_FILTERS: StatusFilter[] = ["全部", "工作中", "已执行", "未执行"];

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

function formatUsageDateLabel(iso: string | null | undefined): string | null {
  const raw = String(iso || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function agentCardUsageDate(meta: AgentExecRegistryEntry | undefined): string {
  if (!meta) return "未使用";
  if (meta.status === "working") {
    return formatUsageDateLabel(meta.startedAt) ?? formatUsageDateLabel(meta.lastExecAt) ?? "未使用";
  }
  return formatUsageDateLabel(meta.lastExecAt) ?? "未使用";
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全部");
  const [activeStem, setActiveStem] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    setActiveStem((prev) => (prev && next.some((x) => x.stem === prev) ? prev : null));
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
      setLoadErr(REPORTS_API_OFFLINE);
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
    if (viewTab !== "agent" || !hasDesktopApi || !activeStem || !drawerOpen) return;
    void loadAgentReport(activeStem, date);
  }, [activeStem, date, viewTab, loadAgentReport, hasDesktopApi, drawerOpen]);

  useEffect(() => {
    if (viewTab !== "agent") setDrawerOpen(false);
  }, [viewTab]);

  useEffect(() => {
    if (viewTab !== "project" || !hasDesktopApi) return;
    void loadProjectReport(date);
  }, [date, viewTab, loadProjectReport, hasDesktopApi]);

  const listRows = useMemo(
    () => mergeAgentRowsWithRegistry(rows, registry),
    [rows, registry],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let base = !qq
      ? listRows
      : listRows.filter(
          (r) =>
            r.stem.toLowerCase().includes(qq) ||
            r.displayName.toLowerCase().includes(qq) ||
            r.description.toLowerCase().includes(qq),
        );
    if (statusFilter !== "全部") {
      base = base.filter((r) => {
        const meta = resolveRegistryEntry(registry, r.stem);
        const isWorking = meta?.status === "working";
        const hasRun = Boolean(meta && (meta.execCount > 0 || isWorking));
        if (statusFilter === "工作中") return isWorking;
        if (statusFilter === "已执行") return hasRun;
        if (statusFilter === "未执行") return !hasRun;
        return true;
      });
    }
    return [...base].sort((a, b) => {
      const ra = resolveRegistryEntry(registry, a.stem);
      const rb = resolveRegistryEntry(registry, b.stem);
      const wa = ra?.status === "working" ? 0 : 1;
      const wb = rb?.status === "working" ? 0 : 1;
      if (wa !== wb) return wa - wb;
      const oa = ra?.order ?? Number.MAX_SAFE_INTEGER;
      const ob = rb?.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.displayName.localeCompare(b.displayName, "zh-CN");
    });
  }, [listRows, q, registry, statusFilter]);

  const executedTodayCount = useMemo(
    () => [...registry.values()].filter((e) => e.execCount > 0 || e.status === "working").length,
    [registry],
  );

  const workingCount = useMemo(
    () => [...registry.values()].filter((e) => e.status === "working").length,
    [registry],
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDraft(null);
  };

  const openAgentDrawer = (stem: string) => {
    setActiveStem(stem);
    setDraft(null);
    setDrawerOpen(true);
  };
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
    <AppShell>
      <PageHeader
          title="智能体执行日报"
          description={PAGE_DESC.reports}
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
              <InfoHint side="left">{REPORTS_INFO_HINT}</InfoHint>
            </div>
          }
        />

        {!hasDesktopApi && (
          <PageBanner className="border-warning/30 bg-warning/10 text-warning">
            {BRIDGE_OFFLINE_BANNER}
          </PageBanner>
        )}
        {(hint || listErr || loadErr) && (
          <div className="shrink-0 border-b border-border bg-primary-soft/25 px-4 py-2 text-[12px] sm:px-6">
            {listErr && <span className="text-destructive">{listErr} </span>}
            {loadErr && <span className="text-destructive">{loadErr} </span>}
            {hint && <span className="text-foreground">{hint}</span>}
          </div>
        )}

        <div className="px-4 py-5 sm:px-6 lg:px-7">
          {viewTab === "agent" ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="全部智能体" value={rows.length} />
                <StatCard label="今日已执行" value={executedTodayCount} valueClass="text-success" />
                <StatCard
                  label="工作中"
                  value={workingCount}
                  valueClass={workingCount ? "text-success" : undefined}
                />
                <StatCard label="列表显示" value={filtered.length} />
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] max-w-md flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="搜索 Agent 名称或描述…"
                    className="h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStatusFilter(f)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                        statusFilter === f
                          ? "bg-surface text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">{date}</span>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-[13px] font-medium text-foreground">无匹配的智能体</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">调整搜索或筛选条件</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((r) => {
                    const meta = resolveRegistryEntry(registry, r.stem);
                    const isWorking = meta?.status === "working";
                    const hasRun = Boolean(meta && (meta.execCount > 0 || isWorking));
                    const isActive = r.stem === activeStem && drawerOpen;
                    const statusLabel = isWorking ? "工作中" : hasRun ? "空闲" : "未执行";
                    const registryOnly = Boolean(r.registryOnly);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openAgentDrawer(r.stem)}
                        className={cn(
                          "group rounded-xl border bg-surface-elevated p-4 text-left shadow-xs transition",
                          isActive
                            ? "border-primary/50 ring-2 ring-primary/15"
                            : "border-border hover:border-primary/30",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                            <Bot className="h-4 w-4" />
                            {isWorking ? (
                              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface-elevated animate-pulse" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {hasRun && meta ? (
                                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">#{meta.order}</span>
                              ) : null}
                              <span className="truncate text-[12.5px] font-semibold text-foreground">{r.displayName}</span>
                              <span className="shrink-0 truncate font-mono text-[10px] text-muted-foreground/80 max-w-[7rem]">
                                {r.stem}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                              {r.description}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]">
                          <span className="text-muted-foreground">{agentCardUsageDate(meta)}</span>
                          <span
                            className={cn(
                              "font-medium",
                              isWorking
                                ? "text-success"
                                : hasRun
                                  ? "text-muted-foreground"
                                  : "text-muted-foreground/60",
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xs">
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

        {viewTab === "agent" && drawerOpen && activeStem ? (
          <AgentReportDrawer
            activeRow={activeRow}
            activeStem={activeStem}
            date={date}
            missing={missing}
            loading={loading}
            editing={editing}
            isDirty={isDirty}
            busy={busy}
            hasDesktopApi={hasDesktopApi}
            onClose={closeDrawer}
            onDraftChange={setDraft}
            onSave={() => void saveAgent()}
            onBuildFromEvents={() => void buildFromEvents()}
            onGenerate={() => void generateReport()}
            onCopy={() => void copyText(editing)}
            onEdit={() => setDraft(editing || `# ${activeStem} · ${date}\n`)}
          />
        ) : null}
    </AppShell>
  );
}

function AgentReportDrawer({
  activeRow,
  activeStem,
  date,
  missing,
  loading,
  editing,
  isDirty,
  busy,
  hasDesktopApi,
  onClose,
  onDraftChange,
  onSave,
  onBuildFromEvents,
  onGenerate,
  onCopy,
  onEdit,
}: {
  activeRow: AgentRow | null;
  activeStem: string;
  date: string;
  missing: boolean;
  loading: boolean;
  editing: string;
  isDirty: boolean;
  busy: string | null;
  hasDesktopApi: boolean;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onBuildFromEvents: () => void;
  onGenerate: () => void;
  onCopy: () => void;
  onEdit: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/25 backdrop-blur-sm" onClick={onClose} />
      <div className="flex h-full max-h-screen w-full max-w-2xl flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-foreground">
                  {activeRow?.displayName ?? activeStem}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {activeStem} · {date}
                  {missing && !isDirty ? " · 尚无日报" : ""}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/logs"
                search={{ tab: "trace", stem: activeStem }}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary"
              >
                <ExternalLink className="h-3.5 w-3.5" /> 原始追踪
              </Link>
              <button
                type="button"
                disabled={!hasDesktopApi || Boolean(busy)}
                onClick={onBuildFromEvents}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5" /> 从 events 重建
              </button>
              <button
                type="button"
                disabled={!hasDesktopApi || Boolean(busy)}
                onClick={onGenerate}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" /> 生成日报
              </button>
              {isDirty ? (
                <button
                  type="button"
                  onClick={onSave}
                  className="btn-gradient-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
                >
                  <Save className="h-3.5 w-3.5" /> 保存
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!editing}
                    onClick={onCopy}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> 复制
                  </button>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary"
                  >
                    编辑
                  </button>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <textarea
          value={editing}
          readOnly={!isDirty}
          onChange={(e) => isDirty && onDraftChange(e.target.value)}
          className={cn(
            "min-h-0 flex-1 resize-none border-0 bg-code-bg/30 px-5 py-4 font-mono text-[12px] leading-relaxed outline-none",
            !isDirty && "text-foreground/90",
          )}
          placeholder={loading ? "加载中…" : "（暂无内容）"}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: number | string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 shadow-xs">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-[22px] font-bold tracking-tight text-foreground", valueClass)}>{value}</div>
    </div>
  );
}
