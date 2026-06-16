import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { A as AppShell, P as PageHeader, C as Clock } from "./app-shell-DfKeMRG5.js";
import { P as PageRoot, e as PageBanner, L as ListDetailLayout, D as DetailPane, f as DetailBody, T as ToggleSwitch, g as DetailActions, h as ListPane, i as ListToolbar, j as ListSearch, k as ListStats, l as ListScrollArea, m as ListCard, n as ListEmpty } from "./page-layout-p7fHu6c0.js";
import { P as PAGE_DESC, q as hasDesktop, r as SCHEDULED_OFFLINE, s as SCHEDULED_BANNER_ONLINE, e as cn, g as getDesktop } from "./router-CCRumuR1.js";
import { P as Plus } from "./plus-CUtIIuQz.js";
import { S as Save } from "./save-s2gnsGqd.js";
import { P as Play } from "./play-Dke1oMkU.js";
import { T as Trash2 } from "./trash-2-BpzVwa3Q.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function taskSummary(t) {
  const sched = t.scheduleType === "interval" ? `每 ${t.intervalMinutes} 分钟` : `每天 ${t.dailyTime}`;
  const act = t.action === "toast" ? "桌面通知" : t.action === "log" ? "写应用日志" : "定时问询";
  return `${sched} · ${act}`;
}
function defaultTask() {
  return {
    id: `t${Date.now()}`,
    name: "新任务",
    enabled: false,
    scheduleType: "interval",
    intervalMinutes: 60,
    dailyTime: "09:00",
    action: "toast",
    payload: "",
    chatSessionId: ""
  };
}
function formatLastRun(t, short = false) {
  if (!t.lastRunAt) return short ? "未执行" : "尚未执行";
  const when = new Date(t.lastRunAt).toLocaleString(void 0, {
    hour12: false,
    month: short ? "numeric" : "2-digit",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  if (t.lastRunError) return short ? "上次失败" : `${when} · ${t.lastRunError}`;
  return when;
}
function ScheduledPage() {
  const [tasks, setTasks] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [hint, setHint] = reactExports.useState("");
  const [q, setQ] = reactExports.useState("");
  const [activeId, setActiveId] = reactExports.useState(null);
  const [draft, setDraft] = reactExports.useState(null);
  const load = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) {
      setLoading(false);
      return;
    }
    const r = await api.scheduledTasksGet();
    if (r.ok && Array.isArray(r.tasks)) setTasks(r.tasks);
    setLoading(false);
  }, []);
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  reactExports.useEffect(() => {
    const api = getDesktop();
    if (!api?.onScheduledTasksChanged) return;
    return api.onScheduledTasksChanged((data) => {
      if (Array.isArray(data?.tasks)) setTasks(data.tasks);
    });
  }, []);
  const persist = async (next) => {
    const api = getDesktop();
    if (!api) return;
    const r = await api.scheduledTasksSave(next);
    if (!r.ok) setHint(r.error || "保存失败");
    else {
      setHint("已保存");
      if (r.tasks) setTasks(r.tasks);
    }
  };
  const applyTasks = (next) => {
    setTasks(next);
    void persist(next);
  };
  const runNow = async (id) => {
    const api = getDesktop();
    if (!api) return;
    const r = await api.scheduledTasksRunNow(id);
    setHint(r.ok ? "已触发执行" : r.error || "执行失败");
  };
  const filtered = reactExports.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tasks;
    return tasks.filter((t) => t.name.toLowerCase().includes(s) || taskSummary(t).toLowerCase().includes(s));
  }, [tasks, q]);
  const active = tasks.find((t) => t.id === activeId) ?? null;
  const editing = draft ?? active;
  const isNew = Boolean(draft && !tasks.some((t) => t.id === draft.id));
  const isDirty = draft !== null;
  const patchEditing = (patch) => {
    if (draft) setDraft({
      ...draft,
      ...patch
    });
    else if (active) setDraft({
      ...active,
      ...patch
    });
  };
  const openNew = () => {
    const t = defaultTask();
    setDraft(t);
    setActiveId(t.id);
  };
  const selectTask = (t) => {
    setDraft(null);
    setActiveId(t.id);
  };
  const saveChanges = () => {
    if (!draft) return;
    const exists = tasks.some((t) => t.id === draft.id);
    const next = exists ? tasks.map((t) => t.id === draft.id ? draft : t) : [...tasks, draft];
    setDraft(null);
    applyTasks(next);
  };
  const discardChanges = () => {
    setDraft(null);
    if (isNew) setActiveId(null);
  };
  const deleteActive = () => {
    if (!activeId) return;
    const next = tasks.filter((t) => t.id !== activeId);
    setActiveId(null);
    setDraft(null);
    applyTasks(next);
  };
  const enabledCount = tasks.filter((t) => t.enabled).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { variant: "fill", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PageRoot, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "定时任务", description: PAGE_DESC.scheduled, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => openNew(), disabled: !hasDesktop() || loading, className: "btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold shadow-sm transition hover:opacity-95 disabled:opacity-40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
      " 添加任务"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageBanner, { className: !hasDesktop() ? "border-warning/30 bg-warning/10 text-warning" : void 0, children: !hasDesktop() ? SCHEDULED_OFFLINE : SCHEDULED_BANNER_ONLINE }),
    hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 border-b border-primary/20 bg-primary-soft/25 px-4 py-2 text-[12px] text-foreground sm:px-5 lg:px-6", children: hint }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(ListDetailLayout, { detailWidth: "420px", list: /* @__PURE__ */ jsxRuntimeExports.jsxs(ListPane, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ListToolbar, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ListSearch, { value: q, onChange: setQ, placeholder: "搜索任务…" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(ListStats, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "共 ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: tasks.length })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "启用 ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-success", children: enabledCount })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ListScrollArea, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] text-muted-foreground", children: "加载中…" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2", children: [
        filtered.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(ListCard, { active: activeId === t.id, onClick: () => selectTask(t), icon: Clock, title: t.name, badge: t.enabled ? "启用" : void 0, description: taskSummary(t), trailing: /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleSwitch, { checked: t.enabled, onClick: (e) => e.stopPropagation(), onChange: (en) => {
          applyTasks(tasks.map((x) => x.id === t.id ? {
            ...x,
            enabled: en
          } : x));
        } }), children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("mt-1.5 text-[11px]", t.lastRunError ? "text-destructive" : "text-muted-foreground"), children: formatLastRun(t, true) }) }, t.id)),
        filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(ListEmpty, { children: "暂无任务，点击「添加任务」创建。" })
      ] }) })
    ] }), detail: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailPane, { empty: "选择左侧任务，或添加新任务。", children: editing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(DetailBody, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-start justify-between gap-3 border-b border-border pb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: editing.name, onChange: (e) => patchEditing({
            name: e.target.value
          }), className: "w-full border-0 bg-transparent p-0 text-[16px] font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground focus:ring-0", placeholder: "任务名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: taskSummary(editing) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: cn("mt-0.5 text-[11px]", editing.lastRunError ? "text-destructive" : "text-muted-foreground"), children: [
            "上次执行 · ",
            formatLastRun(editing)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex shrink-0 flex-col items-end gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "启用" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleSwitch, { checked: editing.enabled, onChange: (en) => {
            if (isNew) {
              patchEditing({
                enabled: en
              });
              return;
            }
            applyTasks(tasks.map((t) => t.id === editing.id ? {
              ...t,
              enabled: en
            } : t));
            setDraft(null);
          } })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "shrink-0 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", children: "调度" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "类型", className: "col-span-2 sm:col-span-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: editing.scheduleType, onChange: (e) => patchEditing({
            scheduleType: e.target.value
          }), className: fieldInputClass, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "interval", children: "固定间隔" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "daily", children: "每日时刻" })
          ] }) }),
          editing.scheduleType === "interval" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "间隔（分钟）", className: "col-span-2 sm:col-span-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 1, value: editing.intervalMinutes, onChange: (e) => patchEditing({
            intervalMinutes: Math.max(1, parseInt(e.target.value, 10) || 60)
          }), className: cn(fieldInputClass, "font-mono") }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "时间 HH:MM", className: "col-span-2 sm:col-span-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: editing.dailyTime, onChange: (e) => patchEditing({
            dailyTime: e.target.value
          }), className: cn(fieldInputClass, "font-mono"), placeholder: "09:00" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex min-h-0 flex-1 flex-col gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", children: "动作" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "类型", className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: editing.action, onChange: (e) => patchEditing({
          action: e.target.value
        }), className: fieldInputClass, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "toast", children: "桌面通知" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "log", children: "写应用日志" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "reportAppend", children: "定时问询（Claude → 日报）" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "文案 / 问询要点", className: "flex min-h-0 flex-1 flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: editing.payload, onChange: (e) => patchEditing({
          payload: e.target.value
        }), placeholder: "通知内容或交给模型的问询要点…", className: cn(fieldInputClass, "min-h-[120px] flex-1 resize-none py-2 leading-relaxed") }) }),
        editing.action === "reportAppend" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "关联会话 ID（可选）", className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: editing.chatSessionId, onChange: (e) => patchEditing({
          chatSessionId: e.target.value
        }), placeholder: "s0", className: cn(fieldInputClass, "font-mono") }) }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto shrink-0 border-t border-border pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 font-mono text-[10px] text-muted-foreground/80", children: editing.id }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DetailActions, { className: "pt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
          isDirty ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => saveChanges(), className: "btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
              isNew ? "创建任务" : "保存修改"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => discardChanges(), className: "rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium hover:bg-secondary", children: "取消" })
          ] }) : !isNew ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void runNow(editing.id), disabled: !hasDesktop(), className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium hover:bg-secondary disabled:opacity-40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "h-3.5 w-3.5" }),
            " 立即执行"
          ] }) : null,
          !isNew ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => deleteActive(), className: "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12.5px] font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }),
            " 删除"
          ] }) : null
        ] }) })
      ] })
    ] }) : null }) })
  ] }) });
}
const fieldInputClass = "h-9 w-full rounded-lg border border-border bg-background px-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
function Field({
  label,
  children,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1.5 shrink-0 text-[11px] font-medium text-muted-foreground", children: label }),
    children
  ] });
}
export {
  ScheduledPage as component
};
