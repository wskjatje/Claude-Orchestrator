import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { b as useHasDesktop, e as cn, g as getDesktop, V as Route, w as BRIDGE_OFFLINE_BANNER, P as PAGE_DESC, x as Link } from "./router-CCRumuR1.js";
import { A as AppShell, P as PageHeader, B as Bot } from "./app-shell-DfKeMRG5.js";
import { e as PageBanner, P as PageRoot } from "./page-layout-p7fHu6c0.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
import { C as ChevronDown } from "./chevron-down-oOVv_n18.js";
import { T as Trash2 } from "./trash-2-BpzVwa3Q.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const HOOK_EVENT_REF = [
  { id: "PreToolUse", desc: "工具调用前，可拦截危险操作" },
  { id: "PostToolUse", desc: "工具调用后，常用于格式化/测试" },
  { id: "UserPromptSubmit", desc: "用户提交提示前" },
  { id: "Stop", desc: "模型完成回复时" },
  { id: "SessionStart", desc: "会话开始时" },
  { id: "PostToolUseFailure", desc: "工具调用失败时" }
];
function summarizeHooks(hooks) {
  if (!hooks || typeof hooks !== "object") return [];
  const out = [];
  for (const [event, raw] of Object.entries(hooks)) {
    const groups = Array.isArray(raw) ? raw : [];
    const sampleCommands = [];
    for (const g of groups) {
      if (!g || typeof g !== "object") continue;
      const handlers = Array.isArray(g.hooks) ? g.hooks : [];
      for (const h of handlers) {
        if (h && typeof h === "object" && "command" in h) {
          const cmd = String(h.command ?? "").trim();
          if (cmd) sampleCommands.push(cmd.slice(0, 100));
        }
      }
    }
    out.push({ event, matcherCount: groups.length, sampleCommands: sampleCommands.slice(0, 2) });
  }
  return out.sort((a, b) => a.event.localeCompare(b.event));
}
function ClaudeHooksPanel({ compact = false }) {
  const hasDesktopApi = useHasDesktop();
  const [settingsHooksJson, setSettingsHooksJson] = reactExports.useState(null);
  const [settingsHooksRaw, setSettingsHooksRaw] = reactExports.useState(void 0);
  const [settingsHooksErr, setSettingsHooksErr] = reactExports.useState(null);
  const [settingsMissing, setSettingsMissing] = reactExports.useState(false);
  const [hooksLoading, setHooksLoading] = reactExports.useState(false);
  const loadHooks = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.readClaudeConfigJson) return;
    setHooksLoading(true);
    setSettingsHooksErr(null);
    const r = await api.readClaudeConfigJson("settings.json");
    setHooksLoading(false);
    if (!r.ok) {
      setSettingsHooksErr(r.error ?? "读取失败");
      setSettingsHooksJson(null);
      setSettingsHooksRaw(void 0);
      setSettingsMissing(false);
      return;
    }
    if (r.missing) {
      setSettingsMissing(true);
      setSettingsHooksJson(null);
      setSettingsHooksRaw(void 0);
      return;
    }
    setSettingsMissing(false);
    const h = r.data && typeof r.data === "object" && r.data !== null && "hooks" in r.data ? r.data.hooks : void 0;
    setSettingsHooksRaw(h);
    try {
      setSettingsHooksJson(
        h !== void 0 ? JSON.stringify(h, null, 2) : "// settings.json 中尚无顶层 hooks 字段"
      );
    } catch {
      setSettingsHooksErr("无法序列化 hooks");
    }
  }, []);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    void loadHooks();
  }, [hasDesktopApi, loadHooks]);
  const hookSummaries = reactExports.useMemo(() => summarizeHooks(settingsHooksRaw), [settingsHooksRaw]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: cn("text-muted-foreground", compact ? "text-[11.5px]" : "text-[12px]"), children: [
        compact ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          "读取",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-code-bg px-1 font-mono text-[10.5px]", children: "~/.claude/settings.json" }),
          " ",
          "中的 hooks。"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          "用户级配置：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "mx-1 rounded bg-code-bg px-1 font-mono text-[11px]", children: "~/.claude/settings.json" }),
          "顶层 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-code-bg px-1 font-mono text-[11px]", children: "hooks" }),
          "。编辑请在 Claude Code 配置侧完成，此处仅只读查看。"
        ] }),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: "https://code.claude.com/docs/en/hooks",
            className: "text-primary underline-offset-2 hover:underline",
            target: "_blank",
            rel: "noreferrer",
            children: "官方文档"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: !hasDesktopApi || hooksLoading,
          onClick: () => void loadHooks(),
          className: "btn-row shrink-0",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3 w-3", hooksLoading && "animate-spin") }),
            " 刷新"
          ]
        }
      )
    ] }),
    settingsHooksErr && /* @__PURE__ */ jsxRuntimeExports.jsx(PageBanner, { className: "border-destructive/30 bg-destructive/10 text-destructive", children: settingsHooksErr }),
    settingsMissing && !settingsHooksErr && /* @__PURE__ */ jsxRuntimeExports.jsx(PageBanner, { children: "尚未创建 settings.json，或其中没有 hooks 字段。" }),
    hookSummaries.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("grid gap-2", compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"), children: hookSummaries.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[11.5px] font-semibold text-primary", children: h.event }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-0.5 text-[10.5px] text-muted-foreground", children: [
        h.matcherCount,
        " 组 matcher"
      ] }),
      !compact && h.sampleCommands.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate font-mono text-[10px] text-foreground/80", title: c, children: c }, i))
    ] }, h.event)) }),
    !settingsHooksErr && !settingsMissing && settingsHooksJson !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-lg border border-border bg-surface-elevated/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer px-3 py-2 text-[12px] font-medium", children: "原始 hooks JSON" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "max-h-[min(320px,40vh)] overflow-auto whitespace-pre-wrap break-words border-t border-border p-3 font-mono text-[11px] leading-relaxed", children: settingsHooksJson })
    ] }),
    !compact ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 text-[12px] font-medium text-foreground", children: "常见事件参考" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid gap-1.5 sm:grid-cols-2", children: HOOK_EVENT_REF.map((ev) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "rounded-md border border-border/60 bg-surface px-2.5 py-1.5 text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-primary", children: ev.id }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
          " — ",
          ev.desc
        ] })
      ] }, ev.id)) })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-lg border border-border/70 bg-surface/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer px-3 py-2 text-[11.5px] font-medium text-muted-foreground", children: "常见 Hook 事件说明" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1 border-t border-border px-3 py-2", children: HOOK_EVENT_REF.map((ev) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-primary", children: ev.id }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
          " — ",
          ev.desc
        ] })
      ] }, ev.id)) })
    ] })
  ] });
}
const CLAUDE_SOURCES = [{
  value: "claudeEvents",
  label: "事件日志 events.jsonl"
}, {
  value: "claudeDebugLatest",
  label: "调试 debug/latest"
}, {
  value: "claudeHistoryJsonl",
  label: "历史 history.jsonl"
}, {
  value: "claudeLibraryLogs",
  label: "系统 Library/Logs"
}];
function colorize(line) {
  const tsMatch = line.match(/^\[([^\]]+)\]/);
  const ts = tsMatch ? tsMatch[0] : "";
  const rest = line.slice(ts.length);
  const levelMatch = rest.match(/\s*(INFO|WARN|ERROR|DEBUG)\b/);
  const level = levelMatch ? levelMatch[1] : "";
  const after = level ? rest.slice(rest.indexOf(level) + level.length) : rest;
  const levelColor = level === "INFO" ? "text-info" : level === "WARN" ? "text-warning" : level === "ERROR" ? "text-destructive" : "text-muted-foreground";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-muted-foreground", children: ts }),
    level && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `ml-2 font-semibold ${levelColor}`, children: level }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "break-all text-foreground/90", children: after })
  ] });
}
function LogsPage() {
  const hasDesktopApi = useHasDesktop();
  const {
    tab,
    stem: searchStem
  } = Route.useSearch();
  const [claudeSource, setClaudeSource] = reactExports.useState("claudeEvents");
  const [traceStem, setTraceStem] = reactExports.useState(searchStem || "");
  const [text, setText] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const [hint, setHint] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (searchStem) setTraceStem(searchStem);
  }, [searchStem]);
  const refresh = reactExports.useCallback(async () => {
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
        const r2 = await api.readAgentExecutionLog(s);
        if (!r2.ok) {
          setText("");
          setHint(r2.error || "读取失败");
          return;
        }
        setText(r2.content || "");
        return;
      }
      const source = tab === "workbench" ? "app" : claudeSource;
      const r = await api.logsReadTail({
        source,
        maxLines: 400,
        maxBytes: 28e4
      });
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
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  const clearAppLog = async () => {
    const api = getDesktop();
    if (!api || tab !== "workbench") return;
    await api.logsClear();
    await refresh();
  };
  const lines = reactExports.useMemo(() => [...text.split("\n")].reverse(), [text]);
  const tabLabel = tab === "workbench" ? "工作台 app.log" : tab === "claude" ? CLAUDE_SOURCES.find((x) => x.value === claudeSource)?.label : `追踪 · ${traceStem || "?"}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { variant: "fill", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PageRoot, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "日志", description: PAGE_DESC.logs }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-7", children: [
      !hasDesktopApi && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 shrink-0 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning", children: BRIDGE_OFFLINE_BANNER }),
      hint && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 shrink-0 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-[12px] text-muted-foreground", children: hint }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex shrink-0 flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex rounded-lg border border-border bg-surface p-0.5", children: [["workbench", "工作台"], ["claude", "Claude"], ["trace", "追踪"]].map(([id, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/logs", search: {
          tab: id,
          stem: id === "trace" ? traceStem : void 0
        }, className: cn("rounded-md px-2.5 py-1 text-[12px] font-medium transition", tab === id ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"), children: label }, id)) }),
        tab === "claude" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: claudeSource, onChange: (e) => setClaudeSource(e.target.value), className: "h-8 appearance-none rounded-lg border border-border bg-surface px-3 pr-8 text-[12.5px] outline-none focus:border-primary", children: CLAUDE_SOURCES.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.value, children: o.label }, o.value)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" })
        ] }),
        tab === "trace" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: traceStem, onChange: (e) => setTraceStem(e.target.value), placeholder: "Agent 标识（stem）", className: "h-8 w-40 rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none focus:border-primary" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void refresh(), disabled: !hasDesktopApi || loading, className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium hover:bg-secondary disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3 w-3", loading && "animate-spin") }),
          " 刷新"
        ] }),
        tab === "workbench" && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void clearAppLog(), disabled: !hasDesktopApi || loading, className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] text-muted-foreground hover:text-destructive disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" }),
          " 清空 app.log"
        ] })
      ] }),
      tab === "claude" && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mb-3 shrink-0 rounded-xl border border-border bg-surface-elevated/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer px-4 py-2 text-[12px] font-medium text-foreground", children: [
          "Claude Hooks（只读）",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 font-normal text-muted-foreground", children: "配置在 ~/.claude/settings.json，Orchestrator 无需单独配置" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClaudeHooksPanel, { compact: true }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex shrink-0 items-center gap-1.5 border-b border-border bg-secondary/30 px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 font-mono text-[11px] text-muted-foreground", children: [
          tabLabel,
          " · tail · 最新在上"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words bg-secondary/20 px-4 py-3 font-mono text-[11.5px] leading-relaxed scrollbar-thin", children: lines.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-sm py-0.5 hover:bg-secondary/40", children: line.trim() ? colorize(line) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground/40", children: " " }) }, i)) })
      ] })
    ] })
  ] }) });
}
export {
  LogsPage as component
};
