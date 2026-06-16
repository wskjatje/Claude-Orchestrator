import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { A as AppShell, P as PageHeader, F as FolderTree, C as Clock } from "./app-shell-DfKeMRG5.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { P as PageRoot, S as SinglePaneLayout, a as PageContent, b as PageSection } from "./page-layout-p7fHu6c0.js";
import { t as toast, C as CHOOSE_WORKSPACE_OFFLINE_DESC, a as CHOOSE_WORKSPACE_OFFLINE_TITLE, u as useDesktopReady, b as useHasDesktop, W as WORKSPACE_HISTORY_API_OFFLINE, P as PAGE_DESC, c as WORKSPACE_API_MISSING, i as isWebBridge, d as WORKSPACE_BROWSE_HINT, e as cn, f as WORKSPACE_HISTORY_HINT, g as getDesktop } from "./router-CCRumuR1.js";
import { s as shortenWorkspaceLabel } from "./chat-history-groups-_t-rOT_Z.js";
import { F as FolderOpen } from "./folder-open-uOwKTjyl.js";
import { T as Trash2 } from "./trash-2-BpzVwa3Q.js";
import { X } from "./x-CgW_RKjX.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const WORKSPACE_TOAST_ID = "workbench-workspace-toast";
function workspaceToastSuccess(title, description) {
  toast.success(title, { id: WORKSPACE_TOAST_ID, description, duration: 4e3 });
}
function workspaceToastError(title, description, duration = 6e3) {
  toast.error(title, { id: WORKSPACE_TOAST_ID, description, duration });
}
async function chooseWorkspaceWithFeedback(api) {
  try {
    const p = await api.chooseWorkspace();
    if (p && typeof p === "string") {
      workspaceToastSuccess("已设为当前工作区", p);
      return p;
    }
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Bridge|ECONNREFUSED|500|fetch/i.test(msg)) {
      workspaceToastError(
        CHOOSE_WORKSPACE_OFFLINE_TITLE,
        CHOOSE_WORKSPACE_OFFLINE_DESC,
        8e3
      );
      return null;
    }
    const manual = window.prompt(
      `无法打开目录选择器（${msg}）。请粘贴工作区绝对路径：`,
      ""
    );
    if (!manual?.trim()) return null;
    try {
      const p = await api.chooseWorkspace(manual.trim());
      if (p && typeof p === "string") {
        workspaceToastSuccess("已设为当前工作区", p);
        return p;
      }
      workspaceToastError("路径无效或不存在", manual.trim());
    } catch (e2) {
      workspaceToastError(e2 instanceof Error ? e2.message : String(e2));
    }
    return null;
  }
}
async function openWorkspacePathWithFeedback(api, targetPath) {
  const trimmed = targetPath.trim();
  if (!trimmed) return null;
  try {
    const p = await api.chooseWorkspace(trimmed);
    if (p && typeof p === "string") {
      workspaceToastSuccess("已打开工作区", p);
      return p;
    }
    return null;
  } catch (e) {
    workspaceToastError(e instanceof Error ? e.message : String(e));
    return null;
  }
}
function formatWorkspaceHistoryLabel(absPath) {
  return shortenWorkspaceLabel(absPath);
}
function formatWorkspaceHistoryTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const now = /* @__PURE__ */ new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function WorkspacesPage() {
  const desktopReady = useDesktopReady();
  const desktop = useHasDesktop();
  const [cwd, setCwd] = reactExports.useState(null);
  const [history, setHistory] = reactExports.useState([]);
  const [hint, setHint] = reactExports.useState("");
  const refresh = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    let p = null;
    try {
      p = await api.getWorkspace();
      setCwd(p);
    } catch {
      setCwd(null);
    }
    if (typeof api.getWorkspaceHistory !== "function") {
      setHistory(p ? [{
        path: p,
        openedAt: Date.now()
      }] : []);
      setHint(`${WORKSPACE_HISTORY_API_OFFLINE} 若仍为空，请刷新页面。`);
      return;
    }
    try {
      const hist = await api.getWorkspaceHistory();
      setHistory(hist.entries ?? []);
      setHint("");
    } catch {
      setHistory(p ? [{
        path: p,
        openedAt: Date.now()
      }] : []);
      setHint(WORKSPACE_HISTORY_API_OFFLINE);
    }
  }, []);
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  reactExports.useEffect(() => {
    const api = getDesktop();
    if (!api?.onWorkspaceChanged) return;
    const off = api.onWorkspaceChanged(() => {
      void refresh();
    });
    return () => {
      try {
        off?.();
      } catch {
      }
    };
  }, [refresh]);
  const choose = async () => {
    const api = getDesktop();
    if (!api) return;
    setHint("");
    const p = await chooseWorkspaceWithFeedback(api);
    if (p) {
      setCwd(p);
      void refresh();
    }
  };
  const openFromHistory = async (path) => {
    const api = getDesktop();
    if (!api) return;
    setHint("");
    const p = await openWorkspacePathWithFeedback(api, path);
    if (p) {
      setCwd(p);
      void refresh();
    }
  };
  const removeHistoryEntry = async (path) => {
    const api = getDesktop();
    if (!api?.removeWorkspaceHistoryEntry) return;
    const next = await api.removeWorkspaceHistoryEntry(path);
    setHistory(next.entries ?? []);
  };
  const clearHistory = async () => {
    const api = getDesktop();
    if (!api?.clearWorkspaceHistory) return;
    if (!window.confirm("确定清空全部打开记录？（不会删除磁盘上的项目文件夹）")) return;
    const next = await api.clearWorkspaceHistory();
    setHistory(next.entries ?? []);
    setHint("已清空打开记录。");
  };
  const clear = async () => {
    const api = getDesktop();
    if (!api) return;
    await api.clearWorkspace();
    setCwd(null);
    setHint("已清除工作区（聊天写入将受限直至重新选择）。");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PageRoot, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "工作目录", description: PAGE_DESC.workspaces }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SinglePaneLayout, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PageContent, { className: "space-y-4", children: [
      desktopReady && !desktop && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[12.5px] text-warning", children: WORKSPACE_API_MISSING }),
      desktopReady && desktop && isWebBridge() && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border bg-secondary/40 px-4 py-3 text-[12.5px] text-muted-foreground", children: WORKSPACE_BROWSE_HINT }),
      hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border bg-secondary/50 px-4 py-3 text-[12px] text-muted-foreground", children: hint }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(PageSection, { title: "当前工作区", hint: /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { children: "全应用唯一可修改工作区的入口" }), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderTree, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 font-mono text-[12px] leading-relaxed text-foreground break-all", children: cwd ?? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "（未设置）" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 lg:justify-end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void choose(), disabled: !desktop, className: "btn-gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12.5px] font-semibold shadow-sm transition hover:opacity-95 disabled:opacity-40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "h-4 w-4" }),
            " 浏览目录…"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => void refresh(), disabled: !desktop, className: "rounded-lg border border-border bg-surface px-4 py-2 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-40", children: "刷新" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void clear(), disabled: !desktop || !cwd, className: "inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-[12.5px] font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }),
            " 清除"
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PageSection, { title: "打开记录", hint: /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { children: WORKSPACE_HISTORY_HINT }), children: !history.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-dashed border-border bg-surface/50 px-4 py-8 text-center text-[12px] text-muted-foreground", children: "暂无打开记录。选择工作区后会自动记录。" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overflow-hidden rounded-lg border border-border bg-surface", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border/70", children: history.map((entry) => {
          const active = cwd === entry.path;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-stretch gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !desktop, onClick: () => void openFromHistory(entry.path), className: cn("flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left transition hover:bg-secondary/60 disabled:opacity-40", active && "bg-primary/8"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate font-mono text-[12px] text-foreground", children: formatWorkspaceHistoryLabel(entry.path) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 block truncate font-mono text-[10px] text-muted-foreground", title: entry.path, children: entry.path }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-1 block text-[10px] text-muted-foreground", children: [
                  formatWorkspaceHistoryTime(entry.openedAt),
                  active ? " · 当前" : ""
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: !desktop, onClick: () => void removeHistoryEntry(entry.path), className: "inline-flex w-9 shrink-0 items-center justify-center text-muted-foreground transition hover:bg-secondary hover:text-destructive disabled:opacity-40", title: "从记录中移除", "aria-label": "从记录中移除", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
          ] }, entry.path);
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/70 px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: !desktop, onClick: () => void clearHistory(), className: "text-[11px] text-muted-foreground transition hover:text-destructive disabled:opacity-40", children: "清空全部记录" }) })
      ] }) })
    ] }) })
  ] }) });
}
export {
  WorkspacesPage as component
};
