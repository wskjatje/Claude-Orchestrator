import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { InfoHint } from "@/components/info-hint";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDesktop, hasDesktop } from "@/lib/desktop-api";
import type { ChatHistoryMsg } from "@/types/desktop";

export const Route = createFileRoute("/usage")({
  head: () => ({ meta: [{ title: "使用与用量 · 本地代码助手" }] }),
  component: UsagePage,
});

function rangeToBounds(range: string): { start: number; end: number } {
  const end = Date.now();
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "今天") return { start: d.getTime(), end };
  if (range === "7天") return { start: end - 7 * 24 * 60 * 60 * 1000, end };
  if (range === "30天") return { start: end - 30 * 24 * 60 * 60 * 1000, end };
  return { start: 0, end };
}

function inTimeRange(ts: number | undefined, start: number, end: number): boolean {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return false;
  return ts >= start && ts <= end;
}

/** 统计选定时间窗口内、落在磁盘会话里的消息（依赖每条消息的 ts） */
function aggregateSessions(
  sessions: { id: string; title: string; modelId: string; history: ChatHistoryMsg[] }[],
  start: number,
  end: number,
) {
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
  const sessionsTouched = new Set<string>();
  const modelCounts: Record<string, number> = {};

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
        if (
          typeof m.content === "string" &&
          /```(?:workspace-write)\b/i.test(m.content)
        ) {
          workspaceWriteHints++;
        }
      }
    }
    if (touched) {
      sessionsTouched.add(s.id);
      modelCounts[mid] = (modelCounts[mid] ?? 0) + 1;
    }
  }

  const throughputTokPerSec =
    latencySamples > 0 && completionTok > 0
      ? completionTok / (latencySumMs / 1000)
      : null;

  const avgTokPerMsg =
    apiTurns > 0 && totalTok > 0 ? totalTok / apiTurns : null;

  const errRate = apiTurns > 0 ? errors / apiTurns : 0;

  const topModel =
    Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return {
    msgUser,
    msgAssistant,
    sessionsInRange: sessionsTouched.size,
    promptTok,
    completionTok,
    totalTok,
    apiTurns,
    errors,
    throughputTokPerSec,
    avgTokPerMsg,
    errRate,
    workspaceWriteHints,
    topModel,
    modelCounts,
  };
}

function UsagePage() {
  const [range, setRange] = useState("今天");
  const [metric, setMetric] = useState<"Token" | "成本">("Token");
  const [tab, setTab] = useState<"全部" | "最近查看">("全部");

  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [modelHint, setModelHint] = useState("");
  const [agg, setAgg] = useState<
    (ReturnType<typeof aggregateSessions> & { claudeCostUsd?: number }) | null
  >(null);

  const loadStats = useCallback(async () => {
    const api = getDesktop();
    if (!api?.loadChatSessions) return;
    const [sess, cfg] = await Promise.all([api.loadChatSessions(), api.getChatSettings()]);
    const sessions = sess?.sessions ?? [];
    setSessionsTotal(sessions.length);
    setModelHint(cfg?.model ? `${cfg.model}` : "");
    const { start, end } = rangeToBounds(range);
    const appAgg = aggregateSessions(sessions, start, end);
    let claudeCost = 0;
    if (api.claudeProjectsUsageSummary) {
      const cu = await api.claudeProjectsUsageSummary({ startMs: start, endMs: end });
      if (cu.ok) claudeCost = cu.costUsd ?? 0;
    }
    setAgg({ ...appAgg, claudeCostUsd: claudeCost });
  }, [range]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const totalMsgs = (agg?.msgUser ?? 0) + (agg?.msgAssistant ?? 0);

  const kpis: Array<{ label: string; value: string; caption?: string; hint?: string; soft?: boolean }> = useMemo(() => {
    const a = agg;
    const tp = a?.throughputTokPerSec;
    const avg = a?.avgTokPerMsg;
    const usageCaption =
      (a?.apiTurns ?? 0) > 0 && (a?.totalTok ?? 0) === 0
        ? "已有请求记录但 token 为 0（部分量化模型未回报 usage）"
        : (a?.apiTurns ?? 0) === 0
          ? "时间范围内无带时间戳的 Ollama 请求；或模型未返回 usage"
          : hasDesktop()
            ? `窗口内 ${a?.apiTurns} 次 API 回合 · 共 ${a?.totalTok ?? 0} token`
            : "打开 Electron 查看";
    return [
      {
        label: "消息",
        value: String(totalMsgs),
        caption: `${a?.msgUser ?? 0} 用户 · ${a?.msgAssistant ?? 0} 助手`,
        hint: "仅统计时间范围内且消息含 ts 的记录（新会话写入时间戳）。",
      },
      {
        label: "吞吐量",
        value: tp != null && Number.isFinite(tp) ? tp.toFixed(1) : "—",
        caption: tp != null ? "输出 token / 秒（按 completion 与耗时估算）" : "需助手消息含 usage 与 latencyMs",
        hint: "completion_tokens 之和 ÷ 请求耗时之和。",
        soft: tp == null,
      },
      {
        label: "工具调用",
        value: String(a?.workspaceWriteHints ?? 0),
        caption: `${a?.workspaceWriteHints ?? 0} 次 workspace-write 块`,
        hint: "检测助手回复中的 ```workspace-write 代码块（写入工作区）。",
      },
      {
        label: "平均 TOKEN / 消息",
        value: avg != null ? avg.toFixed(1) : "—",
        caption: usageCaption,
        hint: "总 token ÷ 含 usage 的助手回合数。",
        soft: avg == null,
      },
    ];
  }, [agg, totalMsgs]);

  const kpis2: Array<{ label: string; value: string; caption?: string; hint?: string; valueClass?: string }> = useMemo(() => {
    const a = agg;
    const er = a?.errRate ?? 0;
    const erPct = `${(er * 100).toFixed(2)}%`;
    const errClass = er > 0.05 ? "text-destructive" : "text-success";
    const hotBody =
      a?.topModel && Object.keys(a.modelCounts ?? {}).length
        ? `${a.topModel}（按会话活动次数近似）`
        : modelHint || (hasDesktop() ? "（时间范围内无模型活动）" : "Electron 内同步");
    return [
      {
        label: "缓存命中率",
        value: "—",
        caption: "本地 Ollama 通常无 Prompt Cache 统计",
        hint: "若上游扩展支持，可后续接入。",
      },
      {
        label: "错误率",
        value: erPct,
        caption: `${a?.errors ?? 0} 次失败 / ${a?.apiTurns ?? 0} 次 API 回合`,
        hint: "助手气泡标记 requestError 或含 usage 的失败统计。",
        valueClass: errClass,
      },
      {
        label: "平均成本 / 消息",
        value:
          metric === "成本" && (a?.claudeCostUsd ?? 0) > 0
            ? `$${(((a?.claudeCostUsd ?? 0) / Math.max(1, a?.apiTurns ?? 1))).toFixed(4)}`
            : metric === "成本" && (a?.totalTok ?? 0) > 0
              ? "$0.0000"
              : "$0.0000",
        caption:
          metric === "成本" && (a?.claudeCostUsd ?? 0) > 0
            ? `CLI transcript 估算合计 ${(a?.claudeCostUsd ?? 0).toFixed(4)} USD`
            : "本地 SQLite + ~/.claude/projects 合并估算",
        hint: "基于内置模型单价表；可在设置中扩展 tokenPricing。",
      },
      {
        label: "会话",
        value: String(a?.sessionsInRange ?? 0),
        caption: `全部存储 ${sessionsTotal} · 默认模型 ${modelHint ? modelHint.slice(0, 24) : "—"}`,
        hint: "时间范围内至少有一条消息的会话数。",
      },
      {
        label: "错误",
        value: String(a?.errors ?? 0),
        caption: "Ollama/API 失败写入助手气泡",
        hint: "与「错误率」分子一致。",
      },
    ];
  }, [agg, modelHint, sessionsTotal]);

  const sideStats = useMemo(() => {
    const a = agg;
    const mc = a?.modelCounts ?? {};
    const lines = Object.entries(mc)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 6)
      .map(([k, v]) => `${k} · ${v}`)
      .join("\n");
    return [
      { label: "热门模型", body: lines || (modelHint || (hasDesktop() ? "（设置中未选模型）" : "Electron 内同步")) },
      { label: "热门提供商", body: "本地 Ollama（单提供商）" },
      { label: "热门工具", body: (a?.workspaceWriteHints ?? 0) > 0 ? `workspace-write × ${a?.workspaceWriteHints}` : "无落盘块" },
      { label: "热门代理", body: "无（未接网关统计）" },
      { label: "热门渠道", body: "无" },
      { label: "错误高峰日", body: (a?.errors ?? 0) > 0 ? "见错误率" : "无错误数据" },
      { label: "错误高峰时段", body: (a?.errors ?? 0) > 0 ? "见会话时间戳" : "无错误数据" },
    ];
  }, [agg, modelHint]);

  return (
    <AppShell>
      <PageHeader
        title="使用与用量"
        actions={<InfoHint side="left">对话与定时任务均走本机 Ollama，不产生云端计费；此处汇总本地统计。</InfoHint>}
      />

      <div className="space-y-4 px-4 py-5 sm:px-6 lg:px-7">
        {/* 筛选 */}
        <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-foreground">筛选</h2>
            <div className="flex items-center gap-2">
              <Pill>{totalMsgs} 消息</Pill>
              <Pill>本地 · 无云端计费</Pill>
              <Pill>{agg?.sessionsInRange ?? 0} 会话（窗口）</Pill>
              <button className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium text-foreground transition hover:bg-secondary">固定</button>
              <button className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium text-foreground transition hover:bg-secondary">导出 ▾</button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["今天", "7天", "30天"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition",
                  range === r ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
            <input type="date" defaultValue="2026-04-22" className="h-8 rounded-lg border border-border bg-surface px-2 text-[12px] outline-none focus:border-primary" />
            <span className="text-[12px] text-muted-foreground">至</span>
            <input type="date" defaultValue="2026-04-22" className="h-8 rounded-lg border border-border bg-surface px-2 text-[12px] outline-none focus:border-primary" />
            <select className="h-8 rounded-lg border border-border bg-surface px-2 text-[12px] outline-none focus:border-primary">
              <option>本地</option>
              <option>UTC</option>
            </select>
            <div className="ml-1 inline-flex rounded-lg bg-secondary p-0.5">
              {(["Token", "成本"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn("rounded-md px-3 py-1 text-[11.5px] font-medium transition", metric === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void loadStats()}
              className="ml-auto rounded-lg bg-destructive/90 px-3 py-1.5 text-[12px] font-semibold text-destructive-foreground transition hover:opacity-90"
            >
              刷新
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="text"
              placeholder="筛选会话（例如 key:agent:main:cron* model:gpt-4o has:errors minTokens:2000）"
              className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground">筛选（客户端）</span>
            <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">本地共 {sessionsTotal} 个会话</span>
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">提示：使用筛选器或点击条形图来细化日期。</p>
        </section>

        {/* 使用概览 */}
        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-xs">
          <h2 className="mb-3 text-[14px] font-semibold tracking-tight text-foreground">使用概览</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {kpis.map((k) => (
                  <KpiCard key={k.label} {...k} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {kpis2.map((k) => (
                  <KpiCard key={k.label} {...k} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {sideStats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-surface p-3">
                  <div className="text-[11.5px] font-medium text-muted-foreground">{s.label}</div>
                  <div className="mt-1 whitespace-pre-line text-[12.5px] text-foreground/80">{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 按时间查看活动 */}
        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-xs">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-foreground">按时间查看活动</h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">估算需要会话时间戳。</p>
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">
              窗口内约 {agg?.totalTok ?? 0} token
            </span>
          </div>
          <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 text-[12.5px] text-muted-foreground">
            暂无时间线数据。
          </div>
        </section>

        {/* 每日使用情况 */}
        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-xs">
          <h2 className="text-[14px] font-semibold tracking-tight text-foreground">每日使用情况</h2>
          <div className="mt-3 flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 text-[12.5px] text-muted-foreground">
            无数据
          </div>
          <div className="mt-4">
            <div className="text-[12px] font-medium text-muted-foreground">按类型划分的 TOKEN</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-0 bg-primary" />
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-muted-foreground">
              <Legend color="bg-destructive" label={`输出 ${agg?.completionTok ?? 0}`} />
              <Legend color="bg-success" label={`输入 ${agg?.promptTok ?? 0}`} />
              <Legend color="bg-warning" label="缓存写入 0" />
              <Legend color="bg-info" label="缓存读取 0" />
            </div>
            <div className="mt-2 text-[11.5px] text-muted-foreground">总计: {agg?.totalTok ?? 0}</div>
          </div>
        </section>

        {/* 会话 */}
        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold tracking-tight text-foreground">会话</h2>
            <span className="text-[11.5px] text-muted-foreground">共 {sessionsTotal} 个</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[12.5px] text-muted-foreground">
              窗口 {agg?.apiTurns ?? 0} 次 API 回合 · {agg?.errors ?? 0} 错误
            </span>
            <div className="inline-flex rounded-lg bg-secondary p-0.5">
              {(["全部", "最近查看"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn("rounded-md px-3 py-1 text-[11.5px] font-medium transition", tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-muted-foreground">排序</span>
              <select className="h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] outline-none focus:border-primary">
                <option>最近</option>
                <option>Token</option>
                <option>成本</option>
              </select>
              <button className="rounded-md border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground"><ArrowDown className="h-3 w-3" /></button>
            </div>
          </div>
          <div className="mt-4 flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 text-[12.5px] text-muted-foreground">
            {sessionsTotal === 0
              ? "暂无持久化会话，去首页开始对话。"
              : `共 ${sessionsTotal} 个会话 · 当前窗口 ${totalMsgs} 条消息（需消息含时间戳）`}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11.5px] font-medium text-muted-foreground">{children}</span>;
}

function KpiCard({ label, value, caption, hint, soft, valueClass }: { label: string; value: string; caption?: string; hint?: string; soft?: boolean; valueClass?: string }) {
  return (
    <div className={cn("rounded-xl border border-border p-4", soft ? "bg-gradient-to-br from-primary-soft/40 to-surface" : "bg-surface")}>
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
        {label}
        {hint && <InfoHint>{hint}</InfoHint>}
      </div>
      <div className={cn("mt-1 text-[24px] font-bold tracking-tight text-foreground", valueClass)}>{value}</div>
      {caption && <div className="mt-1 text-[11px] text-muted-foreground">{caption}</div>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}
