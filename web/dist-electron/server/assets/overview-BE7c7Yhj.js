import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { q as hasDesktop, y as loadUiPrefsFromProjectDb, O as OPENCLAW_TOKEN_UNAVAILABLE, z as saveUiPrefsToProjectDb, i as isWebBridge, A as pingWebBridgeHealth, t as toast, E as MSG_BRIDGE_OFFLINE, e as cn, F as OPENCLAW_TOKEN_PLACEHOLDER, g as getDesktop, T as TODAY_KPIS_DESC, H as rangeToBounds, U as USAGE_SECTION_DESC, I as USAGE_RANGE_PRESETS, J as formatTokenCount, K as useNavigate, N as Route, P as PAGE_DESC, Q as OVERVIEW_INFO_HINT } from "./router-CCRumuR1.js";
import { c as createLucideIcon, u as useBridge, a as Sparkles, C as Clock, A as AppShell, P as PageHeader } from "./app-shell-DfKeMRG5.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { C as ChevronUp } from "./chevron-up-CBy91qLS.js";
import { C as ChevronDown } from "./chevron-down-oOVv_n18.js";
import { O as OverviewSection, a as OverviewKpiCard, b as OverviewStatLine, c as OverviewToolbar, d as OverviewSegmented } from "./overview-ui-BVEraFcg.js";
import { A as Activity } from "./activity-CjqKWzj-.js";
import { M as MessageSquare } from "./message-square-X8cIMXPJ.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./refresh-cw-QdXDuK01.js";
const __iconNode$3 = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "M18 17V9", key: "2bz60n" }],
  ["path", { d: "M13 17V5", key: "1frdt8" }],
  ["path", { d: "M8 17v-3", key: "17ska0" }]
];
const ChartColumn = createLucideIcon("chart-column", __iconNode$3);
const __iconNode$2 = [
  [
    "path",
    {
      d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
      key: "ct8e1f"
    }
  ],
  ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242", key: "151rxh" }],
  [
    "path",
    {
      d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
      key: "13bj9a"
    }
  ],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }]
];
const EyeOff = createLucideIcon("eye-off", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Eye = createLucideIcon("eye", __iconNode$1);
const __iconNode = [
  ["path", { d: "M11 2v2", key: "1539x4" }],
  ["path", { d: "M5 2v2", key: "1yf1q8" }],
  ["path", { d: "M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1", key: "rb5t3r" }],
  ["path", { d: "M8 15a6 6 0 0 0 12 0v-3", key: "x18d4x" }],
  ["circle", { cx: "20", cy: "10", r: "2", key: "ts1r5v" }]
];
const Stethoscope = createLucideIcon("stethoscope", __iconNode);
const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:18789";
function OverviewBridgeBar() {
  const bridge = useBridge();
  const [bridgeUrl, setBridgeUrl] = reactExports.useState(DEFAULT_BRIDGE_URL);
  const [bridgeToken, setBridgeToken] = reactExports.useState("");
  const [tokenHint, setTokenHint] = reactExports.useState("");
  const [showToken, setShowToken] = reactExports.useState(false);
  const [showSecret, setShowSecret] = reactExports.useState(false);
  const [localSecret, setLocalSecret] = reactExports.useState("");
  const [defaultSessionTag, setDefaultSessionTag] = reactExports.useState("claude:main");
  const [bridgeOpen, setBridgeOpen] = reactExports.useState(false);
  const [doctorRunning, setDoctorRunning] = reactExports.useState(false);
  const [doctorOpen, setDoctorOpen] = reactExports.useState(false);
  const [doctorOutput, setDoctorOutput] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (!hasDesktop()) return;
    void loadUiPrefsFromProjectDb().then((prefs) => {
      setBridgeUrl(prefs.bridgeUrl || DEFAULT_BRIDGE_URL);
      setLocalSecret(prefs.localSecret || "");
      setDefaultSessionTag(prefs.defaultSessionTag || "claude:main");
    });
  }, []);
  const loadGatewayToken = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.getOpenclawGatewayToken) {
      setTokenHint(OPENCLAW_TOKEN_UNAVAILABLE);
      return "";
    }
    const r = await api.getOpenclawGatewayToken();
    if (r.ok && r.token) {
      setBridgeToken(r.token);
      setTokenHint("已自动读取本机 OpenClaw 网关令牌。");
      return r.token;
    }
    setTokenHint(`自动读取失败：${r.error || "未知错误"}（可手动输入）`);
    return "";
  }, []);
  reactExports.useEffect(() => {
    if (!hasDesktop()) return;
    void loadGatewayToken();
  }, [loadGatewayToken]);
  const buildBridgeUrlWithToken = reactExports.useCallback((rawUrl, rawToken) => {
    const u = rawUrl.trim();
    const token = rawToken.trim();
    if (!u) return u;
    try {
      const parsed = new URL(u);
      if (token) parsed.searchParams.set("token", token);
      else parsed.searchParams.delete("token");
      return parsed.toString();
    } catch {
      return u;
    }
  }, []);
  const persistOverviewPrefs = reactExports.useCallback(
    async (patch) => {
      await saveUiPrefsToProjectDb({
        bridgeUrl: patch?.bridgeUrl ?? bridgeUrl,
        localSecret: patch?.localSecret ?? localSecret,
        defaultSessionTag: patch?.defaultSessionTag ?? defaultSessionTag
      });
    },
    [bridgeUrl, localSecret, defaultSessionTag]
  );
  const connectBridge = reactExports.useCallback(async () => {
    await persistOverviewPrefs();
    if (isWebBridge()) {
      const ok = await pingWebBridgeHealth();
      toast[ok ? "success" : "error"](
        ok ? "本机服务已连接" : MSG_BRIDGE_OFFLINE,
        { id: "overview-bridge" }
      );
      return;
    }
    const latest = await loadGatewayToken();
    const finalToken = (latest || bridgeToken).trim();
    bridge.setUrl(buildBridgeUrlWithToken(bridgeUrl, finalToken));
    toast.success("已保存连接地址", { id: "overview-bridge" });
  }, [bridge, bridgeToken, bridgeUrl, buildBridgeUrlWithToken, loadGatewayToken, persistOverviewPrefs]);
  const runDoctor = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.claudeCodeDoctor) {
      toast.error("诊断工具不可用，请先连接本机服务");
      return;
    }
    setDoctorRunning(true);
    setDoctorOpen(true);
    setDoctorOutput("正在运行 claude doctor…");
    try {
      const r = await api.claudeCodeDoctor();
      setDoctorOutput(r.content?.trim() || r.error?.trim() || "（无输出）");
      if (!r.ok) toast.warning(r.error || "doctor 检查未完全通过");
      else toast.success("doctor 检查完成");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDoctorOutput(msg);
      toast.error(msg);
    } finally {
      setDoctorRunning(false);
    }
  }, []);
  const status = bridge.online ? "在线" : bridge.connecting ? "连接中" : "离线";
  const statusColor = bridge.online ? "bg-success" : bridge.connecting ? "bg-warning" : "bg-muted-foreground/40";
  const statusText = bridge.online ? "text-success" : bridge.connecting ? "text-warning" : "text-muted-foreground";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border/60 px-5 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold tracking-tight text-foreground", children: "本机服务" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "连接状态与 Claude Code 健康检查" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3 px-5 py-3.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "relative flex h-2 w-2", children: [
          bridge.online && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("relative inline-flex h-2 w-2 rounded-full", statusColor) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("text-[13px] font-semibold", statusText), children: [
          "本机服务 ",
          status
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden h-4 w-px bg-border md:block" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "max-w-[12rem] truncate font-mono text-[12px] text-muted-foreground sm:max-w-xs", children: bridgeUrl }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "hidden text-[11.5px] text-muted-foreground lg:inline", children: [
        bridge.version ?? "未知",
        " · 心跳 ",
        isWebBridge() ? "4" : "10",
        " 秒"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => void connectBridge(),
            className: "rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-glow",
            children: bridge.online ? "重新连接" : "连接"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            disabled: !hasDesktop() || doctorRunning,
            onClick: () => void runDoctor(),
            className: "inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Stethoscope, { className: cn("h-3.5 w-3.5", doctorRunning && "animate-pulse") }),
              "claude doctor"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setBridgeOpen((v) => !v),
            className: "inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:text-foreground",
            children: [
              "高级 ",
              bridgeOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" })
            ]
          }
        )
      ] })
    ] }),
    doctorOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border bg-surface/40 px-5 py-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-semibold text-foreground", children: "claude doctor 输出" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setDoctorOpen(false),
            className: "text-[11px] text-muted-foreground hover:text-foreground",
            children: "收起"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-secondary/30 p-3 font-mono text-[11px] text-foreground/85", children: doctorOutput || "（无输出）" })
    ] }),
    bridgeOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-3 border-t border-border bg-surface/40 px-5 py-4 md:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "WebSocket 地址", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: bridgeUrl,
          onChange: (e) => setBridgeUrl(e.target.value),
          onBlur: () => void persistOverviewPrefs({ bridgeUrl }),
          className: "h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "桥接令牌", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SecretInput,
          {
            show: showToken,
            onToggle: () => setShowToken(!showToken),
            value: bridgeToken,
            onChange: setBridgeToken,
            placeholder: isWebBridge() ? OPENCLAW_TOKEN_PLACEHOLDER : "自动读取 ~/.openclaw/openclaw.json"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] text-muted-foreground", children: tokenHint || "优先自动读取本机 gateway.auth.token。" }),
          !isWebBridge() && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => void loadGatewayToken(),
              className: "shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary",
              children: "自动获取"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "本机密码（不上传）", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        SecretInput,
        {
          show: showSecret,
          onToggle: () => setShowSecret(!showSecret),
          value: localSecret,
          onChange: setLocalSecret,
          onBlur: () => void persistOverviewPrefs({ localSecret }),
          placeholder: "系统或共享密码"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "默认会话标签", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: defaultSessionTag,
          onChange: (e) => setDefaultSessionTag(e.target.value),
          onBlur: () => void persistOverviewPrefs({ defaultSessionTag }),
          className: "h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        }
      ) })
    ] })
  ] });
}
function Field({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] font-medium uppercase tracking-wider text-muted-foreground", children: label }),
    children
  ] });
}
function SecretInput({
  show,
  onToggle,
  value,
  onChange,
  onBlur,
  placeholder
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: show ? "text" : "password",
        value,
        onChange: (e) => onChange?.(e.target.value),
        onBlur,
        placeholder,
        className: "h-9 w-full rounded-lg border border-border bg-surface px-3 pr-9 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: onToggle,
        className: "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:text-foreground",
        children: show ? /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "h-3.5 w-3.5" })
      }
    )
  ] });
}
function OverviewTodayKpis({ kpis }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    OverviewSection,
    {
      title: "运行概况",
      description: TODAY_KPIS_DESC,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3 lg:grid-cols-4", children: kpis.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          OverviewKpiCard,
          {
            label: k.label,
            value: k.value,
            caption: k.caption,
            icon: k.icon,
            iconClassName: k.tint
          },
          k.label
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          OverviewStatLine,
          {
            items: ["消息与会话来自今日统计", "云端费用为 API 用量估算"],
            className: "mt-3"
          }
        )
      ]
    }
  );
}
function offlineTodayKpis() {
  return [
    { label: "今日费用", value: "$0.00", caption: "未连接本机", icon: Activity, tint: "text-info" },
    { label: "活跃会话", value: "—", caption: "连接后同步", icon: MessageSquare, tint: "text-primary" },
    { label: "技能就绪", value: "—", caption: "本机 Skill 目录", icon: Sparkles, tint: "text-warning" },
    { label: "定时任务", value: "—", caption: "连接后查看", icon: Clock, tint: "text-success" }
  ];
}
const todayKpiIcons = {
  messages: Activity,
  cost: ChartColumn,
  model: Sparkles,
  tasks: Clock
};
function buildDesktopTodayKpis(input) {
  if (!hasDesktop()) return offlineTodayKpis();
  return [
    {
      label: "聊天消息",
      value: String(input.msgTotal),
      caption: `${input.sessionsInRange} 个会话（今日）`,
      icon: todayKpiIcons.messages,
      tint: "text-info"
    },
    {
      label: "今日费用",
      value: input.todayCost,
      caption: input.todayTokenHint || "云端 API 估算",
      icon: todayKpiIcons.cost,
      tint: "text-primary"
    },
    {
      label: "当前模型",
      value: input.modelId ? input.modelId.slice(0, 18) + (input.modelId.length > 18 ? "…" : "") : "—",
      caption: input.modelCaption,
      icon: todayKpiIcons.model,
      tint: "text-warning"
    },
    {
      label: "定时任务",
      value: `${input.taskEnabled}/${input.taskTotal}`,
      caption: `${input.taskEnabled} 个启用`,
      icon: todayKpiIcons.tasks,
      tint: "text-success"
    }
  ];
}
function inTimeRange(ts, start, end) {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return false;
  return ts >= start && ts <= end;
}
function aggregateSessions(sessions, start, end) {
  let msgUser = 0;
  let msgAssistant = 0;
  let promptTok = 0;
  let completionTok = 0;
  let totalTok = 0;
  let apiTurns = 0;
  let errors = 0;
  let latencySumMs = 0;
  let latencySamples = 0;
  let workspaceWriteHints = 0;
  const sessionsTouched = /* @__PURE__ */ new Set();
  const modelCounts = {};
  for (const s of sessions) {
    let touched = false;
    const mid = (s.modelId || "").trim() || "（未标注模型）";
    for (const m of s.history ?? []) {
      if (!inTimeRange(m.ts, start, end)) continue;
      touched = true;
      if (m.role === "user") msgUser++;
      else if (m.role === "assistant") {
        msgAssistant++;
        if (m.requestError) errors++;
        const u = m.usage;
        if (u && typeof u === "object") {
          apiTurns++;
          promptTok += u.prompt_tokens ?? 0;
          completionTok += u.completion_tokens ?? 0;
          totalTok += u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
          if (typeof m.latencyMs === "number" && m.latencyMs > 0) {
            latencySumMs += m.latencyMs;
            latencySamples++;
          }
        } else if (m.requestError) {
          apiTurns++;
        }
        if (typeof m.content === "string" && /```(?:workspace-write)\b/i.test(m.content)) {
          workspaceWriteHints++;
        }
      }
    }
    if (touched) {
      sessionsTouched.add(s.id);
      modelCounts[mid] = (modelCounts[mid] ?? 0) + 1;
    }
  }
  const throughputTokPerSec = latencySamples > 0 && completionTok > 0 ? completionTok / (latencySumMs / 1e3) : null;
  const avgTokPerMsg = apiTurns > 0 && totalTok > 0 ? totalTok / apiTurns : null;
  const errRate = apiTurns > 0 ? errors / apiTurns : 0;
  const topModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  return {
    msgUser,
    msgAssistant,
    sessionsInRange: sessionsTouched.size,
    promptTok,
    completionTok,
    totalTok,
    apiTurns,
    errors,
    latencySumMs,
    latencySamples,
    workspaceWriteHints,
    throughputTokPerSec,
    avgTokPerMsg,
    errRate,
    topModel,
    modelCounts
  };
}
function useUsageStats(range) {
  const [agg, setAgg] = reactExports.useState(null);
  const [daily, setDaily] = reactExports.useState([]);
  const [hourly, setHourly] = reactExports.useState([]);
  const [lastBuiltAt, setLastBuiltAt] = reactExports.useState(null);
  const [sessionsTotal, setSessionsTotal] = reactExports.useState(0);
  const [modelHint, setModelHint] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const reload = reactExports.useCallback(
    async (rebuild = false) => {
      const api = getDesktop();
      if (!api?.loadChatSessions) return;
      setLoading(true);
      try {
        const { start, end } = rangeToBounds(range);
        if (rebuild && api.rebuildUsageStats) {
          await api.rebuildUsageStats();
        }
        const [sess, cfg] = await Promise.all([api.loadChatSessions(), api.getChatSettings()]);
        const sessions = sess?.sessions ?? [];
        setSessionsTotal(sessions.length);
        setModelHint(cfg?.model ? `${cfg.model}` : "");
        let appAgg = null;
        let nextDaily = [];
        let nextHourly = [];
        let builtAt = null;
        if (api.getUsageSummary) {
          const u = await api.getUsageSummary({ startMs: start, endMs: end });
          if (u.ok && u.summary) {
            appAgg = u.summary;
            nextDaily = u.daily ?? [];
            nextHourly = u.hourly ?? [];
            builtAt = u.lastBuiltAt ?? null;
          }
        }
        if (!appAgg) {
          appAgg = aggregateSessions(sessions, start, end);
          if (api.claudeProjectsUsageSummary) {
            const cu = await api.claudeProjectsUsageSummary({ startMs: start, endMs: end });
            if (cu.ok) {
              appAgg = {
                ...appAgg,
                cliCostUsd: cu.costUsd ?? 0,
                cloudCostUsd: cu.costUsd ?? 0,
                cloudCostFormatted: cu.costUsdFormatted ?? "$0.00",
                localCostUsd: 0,
                localCostFormatted: "$0.00",
                cloudTotalTok: cu.totalTokens ?? appAgg.cloudTotalTok,
                cloudTurns: cu.turns ?? appAgg.cloudTurns
              };
            }
          }
        }
        setDaily(nextDaily);
        setHourly(nextHourly);
        setLastBuiltAt(builtAt);
        setAgg(appAgg);
      } finally {
        setLoading(false);
      }
    },
    [range]
  );
  reactExports.useEffect(() => {
    void reload();
  }, [reload]);
  return { agg, daily, hourly, lastBuiltAt, sessionsTotal, modelHint, loading, reload };
}
function UsageAnalyticsSection({ id = "usage", range, onRangeChange }) {
  const { agg, loading, reload } = useUsageStats(range);
  const totalMsgs = (agg?.msgUser ?? 0) + (agg?.msgAssistant ?? 0);
  const hideMsgKpi = range === "今天";
  const kpis = reactExports.useMemo(
    () => buildUsageKpis(agg, totalMsgs, hideMsgKpi),
    [agg, totalMsgs, hideMsgKpi]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    OverviewSection,
    {
      id,
      title: "用量统计",
      description: USAGE_SECTION_DESC,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(OverviewToolbar, { onRefresh: () => void reload(true), refreshing: loading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          OverviewSegmented,
          {
            value: range,
            options: USAGE_RANGE_PRESETS.map((r) => ({ id: r, label: r })),
            onChange: (v) => onRangeChange(v)
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid grid-cols-2 gap-3 md:grid-cols-3", children: kpis.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(OverviewKpiCard, { ...k }, k.label)) })
      ]
    }
  );
}
function buildUsageKpis(agg, totalMsgs, hideMsgKpi) {
  const a = agg;
  const tp = a?.throughputTokPerSec;
  const avg = a?.avgTokPerMsg;
  const er = a?.errRate ?? 0;
  const erPct = `${(er * 100).toFixed(1)}%`;
  const errClass = er > 0.05 ? "text-destructive" : void 0;
  const cloudCost = a?.cloudCostFormatted ?? "$0.00";
  const cliCost = a?.cliCostUsd ?? 0;
  const sessionCost = a?.sessionCloudCostUsd ?? 0;
  const usageCaption = (a?.apiTurns ?? 0) > 0 && (a?.totalTok ?? 0) === 0 ? "部分模型未回报 usage" : (a?.apiTurns ?? 0) === 0 ? "无带时间戳的请求" : `${a?.apiTurns} 次回合 · ${a?.totalTok ?? 0} token`;
  const items = [
    {
      label: "云端费用",
      value: cloudCost,
      caption: cliCost > 0 || sessionCost > 0 ? `CLI ${cliCost > 0 ? `$${cliCost.toFixed(2)}` : "$0"} + 落库 ${sessionCost > 0 ? `$${sessionCost.toFixed(4)}` : "$0"}` : "基于 ~/.claude/projects 与单价表",
      hint: "Claude Code CLI jsonl 与 usage 合并估算。"
    },
    {
      label: "云端 Token",
      value: (a?.cloudTotalTok ?? 0) > 0 ? formatTokenCount(a?.cloudTotalTok ?? 0) : "—",
      caption: `${a?.cloudTurns ?? 0} 次云端回合`,
      hint: "云端模型 API 调用 token 汇总。",
      soft: (a?.cloudTotalTok ?? 0) === 0
    },
    {
      label: "本地 Token",
      value: (a?.localTotalTok ?? 0) > 0 ? formatTokenCount(a?.localTotalTok ?? 0) : "—",
      caption: `${a?.localTurns ?? 0} 次本地回合 · 无计费`,
      hint: "本机 Ollama 编排，不产生云端费用。",
      soft: (a?.localTotalTok ?? 0) === 0
    },
    ...hideMsgKpi ? [] : [
      {
        label: "消息",
        value: String(totalMsgs),
        caption: `${a?.msgUser ?? 0} 用户 · ${a?.msgAssistant ?? 0} 助手`,
        hint: "时间范围内含 ts 的消息。"
      }
    ],
    {
      label: "吞吐量",
      value: tp != null && Number.isFinite(tp) ? tp.toFixed(1) : "—",
      caption: tp != null ? "输出 token / 秒" : "需 usage + 耗时",
      hint: "completion ÷ 请求耗时。",
      soft: tp == null
    },
    {
      label: "平均 Token",
      value: avg != null ? avg.toFixed(1) : "—",
      caption: usageCaption,
      hint: "总 token ÷ 含 usage 回合。",
      soft: avg == null
    },
    {
      label: "工具调用",
      value: String(a?.workspaceWriteHints ?? 0),
      caption: "workspace-write 块",
      hint: "助手回复中的落盘代码块。"
    },
    {
      label: "错误率",
      value: erPct,
      caption: `${a?.errors ?? 0} / ${a?.apiTurns ?? 0} 回合`,
      hint: "requestError 或失败统计。",
      valueClassName: errClass
    }
  ];
  return items;
}
function OverviewPage() {
  const navigate = useNavigate({
    from: "/overview"
  });
  const {
    range: searchRange
  } = Route.useSearch();
  const [analyticsRange, setAnalyticsRange] = reactExports.useState(searchRange ?? "今天");
  const todayStats = useUsageStats("今天");
  const reloadTodayStats = todayStats.reload;
  const [modelId, setModelId] = reactExports.useState("");
  const [orchMode, setOrchMode] = reactExports.useState("claude-code");
  const [taskEnabled, setTaskEnabled] = reactExports.useState(0);
  const [taskTotal, setTaskTotal] = reactExports.useState(0);
  const loadMeta = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const [sched, settings] = await Promise.all([api.scheduledTasksGet(), api.getChatSettings()]);
    setOrchMode(settings?.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code");
    setModelId(settings?.model ?? "");
    const tasks = sched?.ok && Array.isArray(sched.tasks) ? sched.tasks : [];
    setTaskTotal(tasks.length);
    setTaskEnabled(tasks.filter((t) => t.enabled).length);
  }, []);
  reactExports.useEffect(() => {
    if (!hasDesktop()) return;
    void loadMeta();
    const api = getDesktop();
    if (!api?.onChatSessionsChanged) return;
    return api.onChatSessionsChanged(() => {
      void loadMeta();
      void reloadTodayStats();
    });
  }, [loadMeta, reloadTodayStats]);
  reactExports.useEffect(() => {
    if (searchRange) setAnalyticsRange(searchRange);
  }, [searchRange]);
  reactExports.useEffect(() => {
    if (window.location.hash === "#usage") {
      document.getElementById("usage")?.scrollIntoView({
        behavior: "smooth"
      });
    }
  }, []);
  const handleRangeChange = reactExports.useCallback((next) => {
    setAnalyticsRange(next);
    void navigate({
      search: {
        range: next
      },
      hash: "usage",
      replace: true
    });
  }, [navigate]);
  const modelCaption = orchMode === "local-mcp" ? "本地 MCP 编排" : "Claude Code CLI";
  const todayMsgTotal = (todayStats.agg?.msgUser ?? 0) + (todayStats.agg?.msgAssistant ?? 0);
  const todayCost = todayStats.agg?.cloudCostFormatted ?? "$0.00";
  const cloudTokToday = todayStats.agg?.cloudTotalTok ?? 0;
  const localTokToday = todayStats.agg?.localTotalTok ?? 0;
  const todayCostCaption = [cloudTokToday > 0 ? `云端 ${formatTokenCount(cloudTokToday)}` : null, localTokToday > 0 ? `本地 ${formatTokenCount(localTokToday)}` : null, (todayStats.agg?.cloudTurns ?? 0) > 0 ? `${todayStats.agg?.cloudTurns} 云端轮` : null].filter(Boolean).join(" · ") || "CLI + 会话 usage 估算";
  const todayKpis = reactExports.useMemo(() => buildDesktopTodayKpis({
    msgTotal: todayMsgTotal,
    sessionsInRange: todayStats.agg?.sessionsInRange ?? 0,
    todayCost,
    todayTokenHint: todayCostCaption,
    modelId,
    modelCaption,
    taskEnabled,
    taskTotal
  }), [todayMsgTotal, todayStats.agg?.sessionsInRange, todayStats.agg?.cloudTurns, todayCost, todayCostCaption, modelId, modelCaption, taskEnabled, taskTotal]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "概览", description: PAGE_DESC.overview, actions: /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { side: "left", children: OVERVIEW_INFO_HINT }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(OverviewBridgeBar, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(OverviewTodayKpis, { kpis: todayKpis }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(UsageAnalyticsSection, { id: "usage", range: analyticsRange, onRangeChange: handleRangeChange })
    ] })
  ] });
}
export {
  OverviewPage as component
};
