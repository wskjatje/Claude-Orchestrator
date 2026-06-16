import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { A as AppShell, P as PageHeader, S as Search, a as Sparkles } from "./app-shell-DfKeMRG5.js";
import { b as useHasDesktop, P as PAGE_DESC, L as LOCAL_ONLY_HINT, e as cn, S as SKILLS_EDITOR_HINT, D as DEMO_LIST_BANNER, g as getDesktop } from "./router-CCRumuR1.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
import { F as FolderOpen } from "./folder-open-uOwKTjyl.js";
import { P as Power } from "./power-DJyGZDzR.js";
import { T as TriangleAlert } from "./triangle-alert-YhT9MF73.js";
import { X } from "./x-CgW_RKjX.js";
import { F as FileCodeCorner } from "./file-code-corner-DqPHoMlQ.js";
import { H as Hash } from "./hash-Cg15RQ4o.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const CATS = ["全部", "工程", "写作", "集成", "分析", "媒体", "本机"];
function diskSkillRowToSkill(row) {
  const displayName = row.displayName?.trim() || row.name?.trim() || row.stem;
  return {
    stem: row.stem,
    name: displayName,
    description: row.description.trim() || "（可在 frontmatter 中加 description，或写好正文首段）",
    category: row.category?.trim() || "本机",
    enabled: true,
    calls: 0
  };
}
function SkillsPage() {
  const hasDesktopApi = useHasDesktop();
  const [items, setItems] = reactExports.useState([]);
  const [listFromDisk, setListFromDisk] = reactExports.useState(false);
  const [listErr, setListErr] = reactExports.useState(null);
  const [listLoading, setListLoading] = reactExports.useState(false);
  const [q, setQ] = reactExports.useState("");
  const [cat, setCat] = reactExports.useState("全部");
  const [detail, setDetail] = reactExports.useState(null);
  const [skillMd, setSkillMd] = reactExports.useState(null);
  const [skillMdErr, setSkillMdErr] = reactExports.useState(null);
  const filtered = items.filter((s) => (cat === "全部" || s.category === cat || cat === "本机" && s.category === "项目") && (q === "" || s.stem.includes(q.toLowerCase()) || s.name.includes(q) || s.description.includes(q)));
  const toggle = (stem) => setItems((arr) => arr.map((s) => s.stem === stem ? {
    ...s,
    enabled: !s.enabled
  } : s));
  const reloadSkillList = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api || !hasDesktopApi) {
      setListFromDisk(false);
      setItems([]);
      setListErr(null);
      return;
    }
    setListLoading(true);
    setListErr(null);
    const r = await api.listClaudeSkillMarkdown();
    setListLoading(false);
    if (!r.ok || !r.items) {
      setListErr(r.error ?? "无法枚举技能目录");
      setListFromDisk(false);
      return;
    }
    setListFromDisk(true);
    setItems(r.items.map(diskSkillRowToSkill));
  }, [hasDesktopApi]);
  const openSkillsFolder = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.openClaudeUserSubdir) {
      window.alert("当前环境无法打开系统文件夹，请使用「Claude Orchestrator」桌面客户端。");
      return;
    }
    const r = await api.openClaudeUserSubdir("skills");
    if (!r.ok) window.alert(r.error ?? "无法打开文件夹");
  }, []);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    void reloadSkillList();
  }, [hasDesktopApi, reloadSkillList]);
  reactExports.useEffect(() => {
    let cancelled = false;
    const api = getDesktop();
    if (!detail || !api || !hasDesktopApi) {
      setSkillMd(null);
      setSkillMdErr(null);
      return;
    }
    void api.readClaudeSkillMarkdown(`${detail.stem}.md`).then((r) => {
      if (cancelled) return;
      if (r.ok && r.content) {
        setSkillMd(r.content);
        setSkillMdErr(null);
      } else {
        setSkillMd(null);
        setSkillMdErr(r.error ?? "无法读取");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [detail?.stem, hasDesktopApi]);
  const enabled = items.filter((s) => s.enabled).length;
  const broken = items.filter((s) => s.warning).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Skill", description: PAGE_DESC.skills, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void reloadSkillList(), disabled: listLoading || !hasDesktopApi, title: !hasDesktopApi ? LOCAL_ONLY_HINT : void 0, className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", listLoading && "animate-spin") }),
        " 从本机刷新"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void openSkillsFolder(), disabled: !hasDesktopApi, title: !hasDesktopApi ? LOCAL_ONLY_HINT : "在访达中打开 ~/.claude/skills", className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "h-3.5 w-3.5" }),
        " 在 Finder 打开"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { side: "left", children: SKILLS_EDITOR_HINT })
    ] }) }),
    hasDesktopApi && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border bg-surface-elevated/80 px-4 py-2.5 sm:px-6 lg:px-7", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[12px] leading-relaxed text-muted-foreground", children: [
      listFromDisk ? /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "已与 Claude Code Skill 目录同步。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: DEMO_LIST_BANNER }),
      listErr ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-destructive", children: listErr }) : null
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-5 sm:px-6 lg:px-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 grid grid-cols-2 gap-3 md:grid-cols-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "总计技能", value: items.length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "已启用", value: enabled, valueClass: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "本周调用", value: items.reduce((a, s) => a + s.calls, 0) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "缺少依赖", value: broken, valueClass: broken ? "text-warning" : void 0 })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[220px] max-w-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "搜索技能名或描述…", className: "h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5", children: CATS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCat(c), className: cn("rounded-md px-2.5 py-1 text-[11.5px] font-medium transition", cat === c ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"), children: c }, c)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3", children: [
        filtered.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setDetail(s), className: cn("group rounded-xl border bg-surface-elevated p-4 text-left shadow-xs transition hover:border-primary/30", s.enabled ? "border-border" : "border-border opacity-75"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", s.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12.5px] font-semibold text-foreground", children: s.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground", children: s.category })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground", children: s.description })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "button", onClick: (e) => {
              e.stopPropagation();
              toggle(s.stem);
            }, className: cn("cursor-pointer rounded-md p-1.5 transition", s.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary"), title: s.enabled ? "停用" : "启用", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3.5 w-3.5" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
              "本周 ",
              s.calls,
              " 次调用"
            ] }),
            s.warning ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-warning", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3 w-3" }),
              " ",
              s.warning
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("font-medium", s.enabled ? "text-success" : "text-muted-foreground"), children: s.enabled ? "● 已启用" : "○ 已停用" })
          ] })
        ] }, s.stem)),
        filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full rounded-xl border border-dashed border-border py-12 text-center text-[12.5px] text-muted-foreground", children: listFromDisk && items.length === 0 && !q ? "~/.claude/skills 下暂无 .md，可与 Claude Code 共用同一目录添加 SKILL.md。" : "无匹配的技能" })
      ] })
    ] }),
    detail && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: () => setDetail(null) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full max-w-md flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex h-9 w-9 items-center justify-center rounded-lg", detail.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[13px] font-semibold text-foreground", children: detail.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
                detail.category,
                " · ",
                detail.stem
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(null), className: "rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12.5px] leading-relaxed text-foreground/80", children: detail.description }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "本周调用" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[16px] font-bold tabular-nums text-foreground", children: detail.calls })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "状态" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("mt-0.5 text-[13px] font-semibold", detail.enabled ? "text-success" : "text-muted-foreground"), children: detail.enabled ? "已启用" : "已停用" })
            ] })
          ] }),
          detail.warning && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 inline-flex items-center gap-1 font-medium", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3 w-3" }),
              " 依赖告警"
            ] }),
            detail.warning
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileCodeCorner, { className: "h-3 w-3" }),
              " 本机文件（平铺）"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("code", { className: "font-mono text-[12px] text-foreground", children: [
              "~/.claude/skills/",
              detail.stem,
              ".md"
            ] }),
            (skillMd || skillMdErr) && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-code-bg/60 p-2 font-mono text-[11px] leading-relaxed", children: skillMdErr ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: skillMdErr }) : skillMd })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Hash, { className: "h-3 w-3" }),
              " 最近调用"
            ] }),
            detail.calls > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-1 text-[12px] text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex justify-between border-b border-border py-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "2 小时前" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success", children: "成功" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex justify-between border-b border-border py-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "昨天 16:42" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success", children: "成功" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex justify-between py-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "3 天前" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success", children: "成功" })
              ] })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded border border-dashed border-border py-6 text-center text-[12px] text-muted-foreground", children: "尚无调用记录" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 border-t border-border px-5 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            toggle(detail.stem);
            setDetail((d) => d ? {
              ...d,
              enabled: !d.enabled
            } : d);
          }, className: cn("flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition", detail.enabled ? "border border-border bg-surface text-foreground hover:bg-secondary" : "text-primary-foreground shadow-sm hover:opacity-95"), style: !detail.enabled ? {
            backgroundImage: "var(--gradient-primary)"
          } : void 0, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3.5 w-3.5" }),
            " ",
            detail.enabled ? "停用" : "启用"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium text-foreground transition hover:bg-secondary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileCodeCorner, { className: "h-3.5 w-3.5" }),
            " 在编辑器中打开"
          ] })
        ] })
      ] })
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
  SkillsPage as component
};
