import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Activity,
  MessageSquare,
  Sparkles,
  Clock,
  RefreshCw,
  Stethoscope,
  BarChart3,
  ScrollText,
  ArrowRight,
} from "lucide-react";
import { InfoHint } from "@/components/info-hint";
import { cn } from "@/lib/utils";
import { useBridge } from "@/hooks/use-bridge";
import { getDesktop, hasDesktop, isWebBridge } from "@/lib/desktop-api";
import { filterSessionsForWorkspaceTabs } from "@/lib/chat-session-workspace";
import { loadUiPrefsFromProjectDb, saveUiPrefsToProjectDb } from "@/lib/ui-prefs";
import { pingWebBridgeHealth } from "@/lib/install-desktop-bridge";
import type { ChatHistoryMsg } from "@/types/desktop";
import { toast } from "sonner";

export const Route = createFileRoute("/overview")({
  head: () => ({ meta: [{ title: "概览 · 本地代码助手" }] }),
  component: OverviewPage,
});

const OVERVIEW_LOG_POLL_MS = 30_000;
const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:18789";

function sessionMsgCount(history: ChatHistoryMsg[]): number {
  return history?.length ?? 0;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function OverviewPage() {
  const bridge = useBridge();
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
  const [bridgeToken, setBridgeToken] = useState("");
  const [tokenHint, setTokenHint] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [localSecret, setLocalSecret] = useState("");
  const [defaultSessionTag, setDefaultSessionTag] = useState("claude:main");
  const [bridgeOpen, setBridgeOpen] = useState(false);

  const [modelId, setModelId] = useState("");
  const [orchMode, setOrchMode] = useState<"claude-code" | "local-mcp">("claude-code");
  const [scopedSessionCount, setScopedSessionCount] = useState(0);
  const [scopedMsgTotal, setScopedMsgTotal] = useState(0);
  const [todayCost, setTodayCost] = useState("$0.00");
  const [todayTokenHint, setTodayTokenHint] = useState("");
  const [taskEnabled, setTaskEnabled] = useState(0);
  const [taskTotal, setTaskTotal] = useState(0);
  const [logAppHint, setLogAppHint] = useState("");
  const [logEventsHint, setLogEventsHint] = useState("");
  const [logsRefreshing, setLogsRefreshing] = useState(false);
  const [lastLogRefreshAt, setLastLogRefreshAt] = useState<string | null>(null);
  const [doctorRunning, setDoctorRunning] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [doctorOutput, setDoctorOutput] = useState("");

  const loadLogSnapshot = useCallback(async () => {
    const api = getDesktop();
    if (!api?.logsOverviewSnapshot) {
      setLogAppHint("");
      setLogEventsHint("");
      return;
    }
    setLogsRefreshing(true);
    try {
      const r = await api.logsOverviewSnapshot();
      if (r.ok) {
        setLogAppHint(r.appHighlight?.trim() || "（暂无 app.log）");
        setLogEventsHint(r.eventsHighlight?.trim() || "（暂无 events）");
        setLastLogRefreshAt(new Date().toLocaleString(undefined, { hour12: false }));
      }
    } finally {
      setLogsRefreshing(false);
    }
  }, []);

  const loadDesktop = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;

    const prefs = await loadUiPrefsFromProjectDb();
    setBridgeUrl(prefs.bridgeUrl || DEFAULT_BRIDGE_URL);
    setLocalSecret(prefs.localSecret || "");
    setDefaultSessionTag(prefs.defaultSessionTag || "claude:main");

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [ws, sess, sched, settings, claudeToday] = await Promise.all([
      api.getWorkspace(),
      api.loadChatSessions(),
      api.scheduledTasksGet(),
      api.getChatSettings(),
      api.claudeProjectsUsageSummary?.({
        workspacePath: null,
        startMs: dayStart.getTime(),
        endMs: Date.now(),
      }) ?? Promise.resolve({ ok: false }),
    ]);

    setOrchMode(settings?.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code");
    setModelId(settings?.model ?? "");

    if (claudeToday?.ok) {
      setTodayCost(claudeToday.costUsdFormatted ?? "$0.00");
      const tt = claudeToday.totalTokens ?? 0;
      setTodayTokenHint(
        tt > 0
          ? `${formatTokenCount(tt)} token · ${claudeToday.turns ?? 0} 轮`
          : "今日暂无 CLI usage",
      );
    } else {
      setTodayCost("$0.00");
      setTodayTokenHint("");
    }

    const scoped = filterSessionsForWorkspaceTabs(sess?.sessions ?? [], ws);
    setScopedSessionCount(scoped.length);
    setScopedMsgTotal(scoped.reduce((n, s) => n + sessionMsgCount(s.history ?? []), 0));

    const tasks = sched?.ok && Array.isArray(sched.tasks) ? sched.tasks : [];
    setTaskTotal(tasks.length);
    setTaskEnabled(tasks.filter((t) => t.enabled).length);

    await loadLogSnapshot();
  }, [loadLogSnapshot]);

  useEffect(() => {
    if (!hasDesktop()) return;
    void loadDesktop();
    const api = getDesktop();
    if (!api?.onChatSessionsChanged) return;
    return api.onChatSessionsChanged(() => void loadDesktop());
  }, [loadDesktop]);

  useEffect(() => {
    if (!hasDesktop()) return;
    const t = window.setInterval(() => void loadLogSnapshot(), OVERVIEW_LOG_POLL_MS);
    return () => window.clearInterval(t);
  }, [loadLogSnapshot]);

  const loadGatewayToken = useCallback(async () => {
    const api = getDesktop();
    if (!api?.getOpenclawGatewayToken) {
      setTokenHint("Web Bridge 模式下 OpenClaw 令牌不可用。");
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

  const buildBridgeUrlWithToken = useCallback((rawUrl: string, rawToken: string) => {
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

  const persistOverviewPrefs = useCallback(
    async (patch?: { bridgeUrl?: string; localSecret?: string; defaultSessionTag?: string }) => {
      await saveUiPrefsToProjectDb({
        bridgeUrl: patch?.bridgeUrl ?? bridgeUrl,
        localSecret: patch?.localSecret ?? localSecret,
        defaultSessionTag: patch?.defaultSessionTag ?? defaultSessionTag,
      });
    },
    [bridgeUrl, localSecret, defaultSessionTag],
  );

  const connectBridge = useCallback(async () => {
    await persistOverviewPrefs();
    if (isWebBridge()) {
      const ok = await pingWebBridgeHealth();
      toast[ok ? "success" : "error"](
        ok ? "Bridge 在线" : "Bridge 离线，请确认 npm run web:dev:full 正在运行",
        { id: "overview-bridge" },
      );
      return;
    }
    const latest = await loadGatewayToken();
    const finalToken = (latest || bridgeToken).trim();
    bridge.setUrl(buildBridgeUrlWithToken(bridgeUrl, finalToken));
    toast.success("已保存桥接地址", { id: "overview-bridge" });
  }, [bridge, bridgeToken, bridgeUrl, buildBridgeUrlWithToken, loadGatewayToken, persistOverviewPrefs]);

  const runDoctor = useCallback(async () => {
    const api = getDesktop();
    if (!api?.claudeCodeDoctor) {
      toast.error("claude doctor 不可用，请重启 npm run web:dev:full");
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

  useEffect(() => {
    if (!hasDesktop()) return;
    void loadGatewayToken();
  }, [loadGatewayToken]);

  useEffect(() => {
    if (!hasDesktop()) return;
    const onFocus = () => {
      void loadLogSnapshot();
      void loadGatewayToken();
      void loadDesktop();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadLogSnapshot();
        void loadGatewayToken();
        void loadDesktop();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadGatewayToken, loadLogSnapshot, loadDesktop]);

  const status = bridge.online ? "在线" : bridge.connecting ? "连接中" : "离线";
  const statusColor = bridge.online ? "bg-success" : bridge.connecting ? "bg-warning" : "bg-muted-foreground/40";
  const statusText = bridge.online ? "text-success" : bridge.connecting ? "text-warning" : "text-muted-foreground";
  const modelCaption = orchMode === "local-mcp" ? "本地 MCP 编排" : "Claude Code CLI";

  const kpis = hasDesktop()
    ? [
        {
          label: "聊天消息",
          value: String(scopedMsgTotal),
          caption: `${scopedSessionCount} 个会话 · 当前工作区`,
          icon: Activity,
          tint: "text-info",
        },
        {
          label: "今日费用",
          value: todayCost,
          caption: todayTokenHint || "jsonl 估算",
          icon: BarChart3,
          tint: "text-primary",
        },
        {
          label: "当前模型",
          value: modelId ? modelId.slice(0, 18) + (modelId.length > 18 ? "…" : "") : "—",
          caption: modelCaption,
          icon: Sparkles,
          tint: "text-warning",
        },
        {
          label: "定时任务",
          value: `${taskEnabled}/${taskTotal}`,
          caption: `${taskEnabled} 个启用`,
          icon: Clock,
          tint: "text-success",
        },
      ]
    : [
        { label: "今日费用", value: "$0.00", caption: "Bridge 离线", icon: Activity, tint: "text-info" },
        { label: "活跃会话", value: "—", caption: "连接 Bridge 后同步", icon: MessageSquare, tint: "text-primary" },
        { label: "技能就绪", value: "—", caption: "本机 ~/.claude/skills", icon: Sparkles, tint: "text-warning" },
        { label: "定时任务", value: "—", caption: "Bridge 内查看", icon: Clock, tint: "text-success" },
      ];

  return (
    <AppShell>
      <PageHeader
        title="概览"
        description="桥接健康、今日用量与日志快照"
        actions={
          <InfoHint side="left">
            修改工作区 → 工作目录；模型与编排 → 应用设置；MCP → MCP 服务器。
          </InfoHint>
        }
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-7">
        {/* 桥接 */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xs">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {bridge.online && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                )}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", statusColor)} />
              </span>
              <span className={cn("text-[13px] font-semibold", statusText)}>桥接服务 {status}</span>
            </div>
            <div className="hidden h-4 w-px bg-border md:block" />
            <code className="max-w-[12rem] truncate font-mono text-[12px] text-muted-foreground sm:max-w-xs">
              {bridgeUrl}
            </code>
            <span className="hidden text-[11.5px] text-muted-foreground lg:inline">
              {bridge.version ?? "未知"} · 心跳 {isWebBridge() ? "4" : "10"} 秒
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void connectBridge()}
                className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-glow"
              >
                {bridge.online ? "重新连接" : "连接"}
              </button>
              <button
                type="button"
                disabled={!hasDesktop() || doctorRunning}
                onClick={() => void runDoctor()}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
              >
                <Stethoscope className={cn("h-3.5 w-3.5", doctorRunning && "animate-pulse")} />
                claude doctor
              </button>
              <button
                type="button"
                onClick={() => setBridgeOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
              >
                高级 {bridgeOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>
          {doctorOpen && (
            <div className="border-t border-border bg-surface/40 px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-foreground">claude doctor 输出</span>
                <button
                  type="button"
                  onClick={() => setDoctorOpen(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  收起
                </button>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-secondary/30 p-3 font-mono text-[11px] text-foreground/85">
                {doctorOutput || "（无输出）"}
              </pre>
            </div>
          )}
          {bridgeOpen && (
            <div className="grid grid-cols-1 gap-3 border-t border-border bg-surface/40 px-5 py-4 md:grid-cols-2 lg:grid-cols-4">
              <Field label="WebSocket 地址">
                <input
                  type="text"
                  value={bridgeUrl}
                  onChange={(e) => setBridgeUrl(e.target.value)}
                  onBlur={() => void persistOverviewPrefs({ bridgeUrl })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </Field>
              <Field label="桥接令牌">
                <SecretInput
                  show={showToken}
                  onToggle={() => setShowToken(!showToken)}
                  value={bridgeToken}
                  onChange={setBridgeToken}
                  placeholder={isWebBridge() ? "Web Bridge 模式下可选" : "自动读取 ~/.openclaw/openclaw.json"}
                />
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-muted-foreground">
                    {tokenHint || "优先自动读取本机 gateway.auth.token。"}
                  </span>
                  {!isWebBridge() && (
                    <button
                      type="button"
                      onClick={() => void loadGatewayToken()}
                      className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary"
                    >
                      自动获取
                    </button>
                  )}
                </div>
              </Field>
              <Field label="本机密码（不上传）">
                <SecretInput
                  show={showSecret}
                  onToggle={() => setShowSecret(!showSecret)}
                  value={localSecret}
                  onChange={setLocalSecret}
                  onBlur={() => void persistOverviewPrefs({ localSecret })}
                  placeholder="系统或共享密码"
                />
              </Field>
              <Field label="默认会话标签">
                <input
                  type="text"
                  value={defaultSessionTag}
                  onChange={(e) => setDefaultSessionTag(e.target.value)}
                  onBlur={() => void persistOverviewPrefs({ defaultSessionTag })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </Field>
            </div>
          )}
        </section>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-xs sm:p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11.5px]">
                    {k.label}
                  </div>
                  <Icon className={cn("h-4 w-4 opacity-70", k.tint)} />
                </div>
                <div className="mt-1 text-[22px] font-bold tracking-tight text-foreground sm:text-[26px]">
                  {k.value}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground sm:text-[11.5px]">
                  {k.caption}
                </div>
              </div>
            );
          })}
        </div>

        {/* 日志快照 */}
        <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-xs sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              日志快照
            </div>
            <div className="flex items-center gap-2">
              {lastLogRefreshAt ? (
                <span className="font-mono text-[10.5px] text-muted-foreground">{lastLogRefreshAt}</span>
              ) : null}
              <button
                type="button"
                disabled={!hasDesktop() || logsRefreshing}
                onClick={() => void loadLogSnapshot()}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium hover:bg-secondary disabled:opacity-40"
              >
                <RefreshCw className={cn("h-3 w-3", logsRefreshing && "animate-spin")} />
                刷新
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <LogSnapshotRow
              label="工作台"
              text={logAppHint || (hasDesktop() ? "（暂无）" : "Bridge 离线")}
              to="/logs"
              search={{ tab: "workbench" }}
            />
            <LogSnapshotRow
              label="Claude 事件"
              text={logEventsHint || (hasDesktop() ? "（暂无）" : "Bridge 离线")}
              to="/logs"
              search={{ tab: "claude" }}
            />
            <LogSnapshotRow label="智能体日报" text="按 Agent × 日期查看执行摘要" to="/reports" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function LogSnapshotRow({
  label,
  text,
  to,
  search,
}: {
  label: string;
  text: string;
  to: string;
  search?: { tab?: string; stem?: string };
}) {
  return (
    <Link
      to={to}
      search={search}
      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface/60 px-3 py-2.5 transition hover:border-primary/30 hover:bg-secondary/40"
    >
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 line-clamp-2 font-mono text-[11px] text-foreground/85">{text}</div>
      </div>
      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SecretInput({
  show,
  onToggle,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  show: boolean;
  onToggle: () => void;
  value?: string;
  onChange?: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-surface px-3 pr-9 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:text-foreground"
      >
        {show ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
