import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { b as useHasDesktop, R as REPORTS_API_OFFLINE, P as PAGE_DESC, e as cn, v as REPORTS_INFO_HINT, w as BRIDGE_OFFLINE_BANNER, g as getDesktop, x as Link } from "./router-CCRumuR1.js";
import { c as createLucideIcon, A as AppShell, P as PageHeader, S as Search, B as Bot, d as FileText, a as Sparkles } from "./app-shell-DfKeMRG5.js";
import { e as PageBanner } from "./page-layout-p7fHu6c0.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { r as resolveAgentDisplayName } from "./agent-display-name-DbLOtgcU.js";
import { C as ChevronRight } from "./chevron-right-rhsxL97Q.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
import { S as Save } from "./save-s2gnsGqd.js";
import { E as ExternalLink } from "./external-link-BWfpy5Z8.js";
import { X } from "./x-CgW_RKjX.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode$1 = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]];
const ChevronLeft = createLucideIcon("chevron-left", __iconNode$1);
const __iconNode = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
  ["path", { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2", key: "4jdomd" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v4", key: "3hqy98" }],
  ["path", { d: "M21 14H11", key: "1bme5i" }],
  ["path", { d: "m15 10-4 4 4 4", key: "5dvupr" }]
];
const ClipboardCopy = createLucideIcon("clipboard-copy", __iconNode);
function isLikelyAgentStem(stem) {
  const s = String(stem || "").trim();
  if (!s || /^\d+$/.test(s)) return false;
  return /[a-zA-Z]/.test(s);
}
function resolveRegistryEntry(registry, stem) {
  const key = String(stem || "").trim();
  if (!key) return void 0;
  const direct = registry.get(key);
  if (direct) return direct;
  const lower = key.toLowerCase();
  for (const [k, v] of registry) {
    if (k.toLowerCase() === lower) return v;
  }
  return void 0;
}
function mergeAgentRowsWithRegistry(rows, registry) {
  const known = new Set(rows.map((r) => r.stem.toLowerCase()));
  const extras = [];
  for (const entry of registry.values()) {
    if (known.has(entry.stem.toLowerCase())) continue;
    if (entry.status !== "working" && entry.execCount <= 0) continue;
    const stem = entry.stem;
    extras.push({
      id: `exec:${stem}`,
      stem,
      basename: `${stem}.md`,
      displayName: stem,
      description: isLikelyAgentStem(stem) ? "（执行记录中有活动，但未在 Agent 目录找到同名文件）" : "（任务链可能误将编号当作 Agent，请检查 WBS「执行 Agent」列）",
      source: "root",
      registryOnly: true
    });
  }
  return extras.length ? [...rows, ...extras] : rows;
}
const STATUS_FILTERS = ["全部", "工作中", "已执行", "未执行"];
function todayIso() {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function shiftDate(iso, delta) {
  const d = /* @__PURE__ */ new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function diskItemsToRows(items) {
  return items.map((row) => ({
    id: row.source === "sanshengliubu" ? `sl:${row.stem}` : row.stem,
    stem: row.stem,
    basename: row.basename,
    displayName: row.displayName?.trim() || resolveAgentDisplayName({
      stem: row.stem,
      basename: row.basename,
      name: row.name,
      nameZh: row.nameZh,
      heading: row.heading,
      description: row.description
    }),
    description: row.description.trim() || "（可在 frontmatter 中加 description）",
    source: row.source
  }));
}
function AgentDailyReportsPage() {
  const hasDesktopApi = useHasDesktop();
  const [viewTab, setViewTab] = reactExports.useState("agent");
  const [date, setDate] = reactExports.useState(todayIso);
  const [rows, setRows] = reactExports.useState([]);
  const [listErr, setListErr] = reactExports.useState(null);
  const [listLoading, setListLoading] = reactExports.useState(false);
  const [q, setQ] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("全部");
  const [activeStem, setActiveStem] = reactExports.useState(null);
  const [drawerOpen, setDrawerOpen] = reactExports.useState(false);
  const [content, setContent] = reactExports.useState("");
  const [draft, setDraft] = reactExports.useState(null);
  const [missing, setMissing] = reactExports.useState(false);
  const [loadErr, setLoadErr] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  const [busy, setBusy] = reactExports.useState(null);
  const [hint, setHint] = reactExports.useState("");
  const [projectContent, setProjectContent] = reactExports.useState("");
  const [projectDraft, setProjectDraft] = reactExports.useState(null);
  const [projectMissing, setProjectMissing] = reactExports.useState(false);
  const [registry, setRegistry] = reactExports.useState(/* @__PURE__ */ new Map());
  const loadAgentRegistry = reactExports.useCallback(async (d) => {
    const api = getDesktop();
    if (!api?.agentDailyReportsListAgentRegistry) {
      setRegistry(/* @__PURE__ */ new Map());
      return;
    }
    const r = await api.agentDailyReportsListAgentRegistry(d);
    if (!r.ok || !r.agents) {
      setRegistry(/* @__PURE__ */ new Map());
      return;
    }
    setRegistry(new Map(r.agents.map((a) => [a.stem, a])));
  }, []);
  const reloadAgentIndex = reactExports.useCallback(async () => {
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
    setActiveStem((prev) => prev && next.some((x) => x.stem === prev) ? prev : null);
  }, []);
  const loadAgentReport = reactExports.useCallback(async (stem, d) => {
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
    const r = await api.agentDailyReportsGet({
      date: d,
      stem
    });
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
  const loadProjectReport = reactExports.useCallback(async (d) => {
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
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    void reloadAgentIndex();
  }, [hasDesktopApi, reloadAgentIndex]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    void loadAgentRegistry(date);
  }, [hasDesktopApi, date, loadAgentRegistry]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api?.onAgentExecChanged) return;
    return api.onAgentExecChanged((detail) => {
      const d = detail && typeof detail === "object" && "date" in detail ? String(detail.date) : date;
      if (d === date) void loadAgentRegistry(date);
    });
  }, [hasDesktopApi, date, loadAgentRegistry]);
  reactExports.useEffect(() => {
    if (viewTab !== "agent" || !hasDesktopApi || !activeStem || !drawerOpen) return;
    void loadAgentReport(activeStem, date);
  }, [activeStem, date, viewTab, loadAgentReport, hasDesktopApi, drawerOpen]);
  reactExports.useEffect(() => {
    if (viewTab !== "agent") setDrawerOpen(false);
  }, [viewTab]);
  reactExports.useEffect(() => {
    if (viewTab !== "project" || !hasDesktopApi) return;
    void loadProjectReport(date);
  }, [date, viewTab, loadProjectReport, hasDesktopApi]);
  const listRows = reactExports.useMemo(() => mergeAgentRowsWithRegistry(rows, registry), [rows, registry]);
  const filtered = reactExports.useMemo(() => {
    const qq = q.trim().toLowerCase();
    let base = !qq ? listRows : listRows.filter((r) => r.stem.toLowerCase().includes(qq) || r.displayName.toLowerCase().includes(qq) || r.description.toLowerCase().includes(qq));
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
  const executedTodayCount = reactExports.useMemo(() => [...registry.values()].filter((e) => e.execCount > 0 || e.status === "working").length, [registry]);
  const workingCount = reactExports.useMemo(() => [...registry.values()].filter((e) => e.status === "working").length, [registry]);
  const closeDrawer = () => {
    setDrawerOpen(false);
    setDraft(null);
  };
  const openAgentDrawer = (stem) => {
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
    const r = await api.agentDailyReportsSave({
      date,
      stem: activeStem,
      content: draft
    });
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
    const r = await api.agentDailyReportsBuildFromEvents({
      date,
      stem: activeStem
    });
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
    const r = await api.agentDailyReportsGenerate({
      date,
      stem: activeStem
    });
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
    const r = await api.dailyReportsSave({
      date,
      content: body
    });
    setBusy(null);
    if (!r.ok) setHint(r.error || "保存失败");
    else {
      setHint("项目汇总已保存");
      setProjectContent(body);
      setProjectDraft(null);
      setProjectMissing(false);
    }
  };
  const copyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setHint("已复制");
    } catch {
      setHint("复制失败");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "智能体执行日报", description: PAGE_DESC.reports, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex rounded-lg border border-border bg-surface p-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setViewTab("agent"), className: cn("rounded-md px-2.5 py-1 text-[12px] font-medium", viewTab === "agent" ? "bg-primary-soft text-primary" : "text-muted-foreground"), children: "按智能体" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setViewTab("project"), className: cn("rounded-md px-2.5 py-1 text-[12px] font-medium", viewTab === "project" ? "bg-primary-soft text-primary" : "text-muted-foreground"), children: "项目汇总" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 rounded-lg border border-border bg-surface px-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "rounded p-1 text-muted-foreground hover:text-foreground", onClick: () => setDate((d) => shiftDate(d, -1)), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: date, onChange: (e) => setDate(e.target.value || todayIso()), className: "h-8 border-0 bg-transparent px-1 font-mono text-[12px] outline-none" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "rounded p-1 text-muted-foreground hover:text-foreground", onClick: () => setDate((d) => shiftDate(d, 1)), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: listLoading || !hasDesktopApi, onClick: () => {
        void reloadAgentIndex();
        void loadAgentRegistry(date);
      }, className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium hover:bg-secondary disabled:opacity-40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", listLoading && "animate-spin") }),
        "刷新"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { side: "left", children: REPORTS_INFO_HINT })
    ] }) }),
    !hasDesktopApi && /* @__PURE__ */ jsxRuntimeExports.jsx(PageBanner, { className: "border-warning/30 bg-warning/10 text-warning", children: BRIDGE_OFFLINE_BANNER }),
    (hint || listErr || loadErr) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 border-b border-border bg-primary-soft/25 px-4 py-2 text-[12px] sm:px-6", children: [
      listErr && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-destructive", children: [
        listErr,
        " "
      ] }),
      loadErr && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-destructive", children: [
        loadErr,
        " "
      ] }),
      hint && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: hint })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-5 sm:px-6 lg:px-7", children: viewTab === "agent" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 grid grid-cols-2 gap-3 md:grid-cols-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "全部智能体", value: rows.length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "今日已执行", value: executedTodayCount, valueClass: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "工作中", value: workingCount, valueClass: workingCount ? "text-success" : void 0 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "列表显示", value: filtered.length })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-[220px] max-w-md flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "搜索 Agent 名称或描述…", className: "h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5", children: STATUS_FILTERS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setStatusFilter(f), className: cn("rounded-md px-2.5 py-1 text-[11.5px] font-medium transition", statusFilter === f ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"), children: f }, f)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto font-mono text-[11.5px] text-muted-foreground", children: date })
      ] }),
      filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border py-16 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "mx-auto mb-3 h-10 w-10 text-muted-foreground/40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] font-medium text-foreground", children: "无匹配的智能体" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] text-muted-foreground", children: "调整搜索或筛选条件" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3", children: filtered.map((r) => {
        const meta = resolveRegistryEntry(registry, r.stem);
        const isWorking = meta?.status === "working";
        const hasRun = Boolean(meta && (meta.execCount > 0 || isWorking));
        const isActive = r.stem === activeStem && drawerOpen;
        const statusLabel = isWorking ? "工作中" : hasRun ? "空闲" : "未执行";
        Boolean(r.registryOnly);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => openAgentDrawer(r.stem), className: cn("group rounded-xl border bg-surface-elevated p-4 text-left shadow-xs transition", isActive ? "border-primary/50 ring-2 ring-primary/15" : "border-border hover:border-primary/30"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "h-4 w-4" }),
              isWorking ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface-elevated animate-pulse" }) : null
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                hasRun && meta ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 font-mono text-[10px] text-muted-foreground", children: [
                  "#",
                  meta.order
                ] }) : null,
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12.5px] font-semibold text-foreground", children: r.displayName }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 truncate font-mono text-[10px] text-muted-foreground/80 max-w-[7rem]", children: r.stem })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground", children: r.description })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: date }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("font-medium", isWorking ? "text-success" : hasRun ? "text-muted-foreground" : "text-muted-foreground/60"), children: statusLabel })
          ] })
        ] }, r.id);
      }) })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 sm:px-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-2 text-[12px] font-medium", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 text-muted-foreground" }),
          "项目汇总 · ",
          date,
          "-mcp-agent.md",
          projectMissing ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-normal text-muted-foreground", children: "（暂无，定时任务 reportAppend 会写入）" }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: projectDraft !== null ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void saveProject(), className: "btn-gradient-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
          " 保存"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setProjectDraft(projectContent || `# 项目日报 · ${date}
`), className: "rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary", children: "编辑" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: projectDraft ?? projectContent, readOnly: projectDraft === null, onChange: (e) => projectDraft !== null && setProjectDraft(e.target.value), className: "min-h-0 flex-1 resize-none border-0 bg-code-bg/30 px-4 py-4 font-mono text-[12px] leading-relaxed outline-none sm:px-6", placeholder: "（暂无项目汇总）" })
    ] }) }),
    viewTab === "agent" && drawerOpen && activeStem ? /* @__PURE__ */ jsxRuntimeExports.jsx(AgentReportDrawer, { activeRow, activeStem, date, missing, loading, editing, isDirty, busy, hasDesktopApi, onClose: closeDrawer, onDraftChange: setDraft, onSave: () => void saveAgent(), onBuildFromEvents: () => void buildFromEvents(), onGenerate: () => void generateReport(), onCopy: () => void copyText(editing), onEdit: () => setDraft(editing || `# ${activeStem} · ${date}
`) }) : null
  ] });
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
  onEdit
}) {
  reactExports.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full max-h-screen w-full max-w-2xl flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[14px] font-semibold text-foreground", children: activeRow?.displayName ?? activeStem }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "truncate font-mono text-[11px] text-muted-foreground", children: [
                activeStem,
                " · ",
                date,
                missing && !isDirty ? " · 尚无日报" : ""
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/logs", search: {
              tab: "trace",
              stem: activeStem
            }, className: "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3.5 w-3.5" }),
              " 原始追踪"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !hasDesktopApi || Boolean(busy), onClick: onBuildFromEvents, className: "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-3.5 w-3.5" }),
              " 从 events 重建"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !hasDesktopApi || Boolean(busy), onClick: onGenerate, className: "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5" }),
              " 生成日报"
            ] }),
            isDirty ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onSave, className: "btn-gradient-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
              " 保存"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !editing, onClick: onCopy, className: "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardCopy, { className: "h-3.5 w-3.5" }),
                " 复制"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onEdit, className: "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary", children: "编辑" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "shrink-0 rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: editing, readOnly: !isDirty, onChange: (e) => isDirty && onDraftChange(e.target.value), className: cn("min-h-0 flex-1 resize-none border-0 bg-code-bg/30 px-5 py-4 font-mono text-[12px] leading-relaxed outline-none", !isDirty && "text-foreground/90"), placeholder: loading ? "加载中…" : "（暂无内容）" })
    ] })
  ] });
}
function StatCard({
  label,
  value,
  valueClass
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-surface-elevated p-4 shadow-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] font-medium uppercase tracking-wider text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("mt-1 text-[22px] font-bold tracking-tight text-foreground", valueClass), children: value })
  ] });
}
export {
  AgentDailyReportsPage as component
};
