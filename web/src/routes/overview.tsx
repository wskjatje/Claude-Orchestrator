import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { GitBranch, ExternalLink, Loader, Plus, RefreshCw, AlertCircle, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { InfoHint } from "@/components/info-hint";
import { OverviewBridgeBar } from "@/components/overview-bridge-bar";
import { OverviewTodayKpis, buildDesktopTodayKpis } from "@/components/overview-today-kpis";
import { UsageAnalyticsSection } from "@/components/usage-analytics-section";
import { useUsageStats } from "@/hooks/use-usage-stats";
import { getDesktop, hasDesktop } from "@/lib/desktop-api";
import { getChatSessionsCache } from "@/lib/chat-sessions-store";
import { formatChatModelOverviewDisplay, loadChatModelPools } from "@/lib/model-catalog";
import { OVERVIEW_INFO_HINT, PAGE_DESC } from "@/lib/ui-copy";
import { formatTokenCount, parseUsageRange, type UsageRangePreset } from "@/lib/usage-range";
import { useGraphifyHealth } from "@/lib/use-graphify-status";
import { cn } from "@/lib/utils";

type OverviewSearch = {
  range?: UsageRangePreset;
};

export const Route = createFileRoute("/overview")({
  validateSearch: (search: Record<string, unknown>): OverviewSearch => ({
    range: parseUsageRange(search.range),
  }),
  head: () => ({ meta: [{ title: "概览 · Claude Orchestrator" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const navigate = useNavigate({ from: "/overview" });
  const { range: searchRange } = Route.useSearch();
  const [analyticsRange, setAnalyticsRange] = useState<UsageRangePreset>(searchRange ?? "今天");

  const todayStats = useUsageStats("今天");
  const reloadTodayStats = todayStats.reload;

  const [modelDisplay, setModelDisplay] = useState({ value: "—", caption: "—" });
  const [modelPricing, setModelPricing] = useState("");
  const [modelUsage, setModelUsage] = useState("");
  const [taskEnabled, setTaskEnabled] = useState(0);
  const [taskTotal, setTaskTotal] = useState(0);
  const { health: graphHealth, buildGraph, openGraphHtml, buildStatusViz, openGraphStatusHtml } = useGraphifyHealth();
  const [nodeStatusCounts, setNodeStatusCounts] = useState<{ completed: number; inProgress: number; pending: number; optimizable: number; total: number } | null>(null);
  const [showStatusDetail, setShowStatusDetail] = useState(false);
  const graphCardRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (graphCardRef.current) {
      gsap.from(graphCardRef.current, {
        opacity: 0,
        y: 12,
        duration: 0.45,
        ease: "power2.out",
      });
    }
  }, { scope: graphCardRef });

  // 获取节点状态统计
  useEffect(() => {
    if (graphHealth.graphHtml) {
      const api = getDesktop();
      if (api?.nodeStatus) {
        api.nodeStatus().then((r) => {
          if (r?.ok && r.counts) setNodeStatusCounts(r.counts);
        }).catch(() => {});
      }
    }
  }, [graphHealth.graphHtml]);

  // 详情面板展开动画
  useGSAP(() => {
    if (showStatusDetail && detailRef.current) {
      gsap.from(detailRef.current, { opacity: 0, height: 0, duration: 0.3, ease: "power2.out" });
    }
  }, { scope: detailRef, dependencies: [showStatusDetail] });

  const loadMeta = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;

    const [sched, settings, sessionsDisk, pools, defaultPricing] = await Promise.all([
      api.scheduledTasksGet(),
      api.getChatSettings(),
      api.loadChatSessions?.().catch(() => null) ?? Promise.resolve(null),
      loadChatModelPools(api).catch(() => ({
        cloudModels: [] as string[],
        localModels: [] as string[],
      })),
      api.getDefaultModelPricing?.().catch(() => undefined) ?? Promise.resolve(undefined),
    ]);

    const orchMode = settings?.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
    const cached = getChatSessionsCache();
    const activeId = cached?.activeId || sessionsDisk?.activeId || "";
    const sessions = cached?.sessions?.length ? cached.sessions : (sessionsDisk?.sessions ?? []);
    const activeSession = sessions.find((s) => s.id === activeId);
    const modelId = activeSession?.modelId?.trim() || settings?.model?.trim() || "";

    setModelDisplay(
      formatChatModelOverviewDisplay({
        modelId,
        cloudModels: pools.cloudModels,
        localModels: pools.localModels,
        orchMode,
      }),
    );

    // 解析模型单价：tokenPricing(用户自定义) > DEFAULT_MODEL_PRICING(内置) > 通用回退
    const mergedPricing = {
      ...(defaultPricing || {}),
      ...(settings?.tokenPricing || {}),
    };
    const CURRENCY_SYMBOLS: Record<string, string> = {
      USD: "$",
      CNY: "¥",
      EUR: "€",
      JPY: "¥",
      GBP: "£",
    };
    const currencySymbol = (c?: string) => CURRENCY_SYMBOLS[c || ""] || c || "$";
    const lookupPricing = (
      m: string,
    ): { inputPer1M: number; outputPer1M: number; currency?: string } | null => {
      if (!m) return null;
      const exact = mergedPricing[m];
      if (exact)
        return {
          inputPer1M: exact.inputPer1M,
          outputPer1M: exact.outputPer1M,
          currency: exact.currency,
        };
      const lower = m.toLowerCase();
      for (const [key, val] of Object.entries(mergedPricing)) {
        if (key.toLowerCase() === lower)
          return {
            inputPer1M: val.inputPer1M,
            outputPer1M: val.outputPer1M,
            currency: val.currency,
          };
      }
      return null;
    };

    // 确定实际使用的模型（Auto 模式从用量统计的 topModel 获取）
    const actualModel =
      modelId && modelId.toLowerCase() !== "auto" ? modelId : todayStats.agg?.topModel || modelId;
    const p = lookupPricing(actualModel);

    // 从 perModel 数据提取模型级费用/Token
    const modelCostMap = todayStats.agg?.perModel || {};
    const isAuto = !modelId || modelId.toLowerCase() === "auto";
    const formatPerModelCost = (usd: number, cur?: string) => {
      if (usd <= 0.0001) return "$0";
      const s = usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2);
      return cur && cur !== "USD" ? `$${s} [${cur}]` : `$${s}`;
    };
    let modelUsageStr = "";
    if (!isAuto && actualModel && modelCostMap[actualModel]) {
      const md = modelCostMap[actualModel];
      const c = md.cloudCostUsd || 0;
      const costStr = c > 0.0001 ? formatPerModelCost(c, md.currency) : "$0.00";
      const tokStr = md.cloudTotalTok > 0 ? formatTokenCount(md.cloudTotalTok) : "0 token";
      modelUsageStr = `今日 ${costStr} · ${tokStr} · ${md.cloudTurns} 回合`;
    } else if (isAuto || Object.keys(modelCostMap).length > 0) {
      const sorted = Object.entries(modelCostMap).sort(
        ([, a], [, b]) => b.cloudCostUsd - a.cloudCostUsd,
      );
      if (sorted.length > 0) {
        modelUsageStr = sorted
          .map(([m, d]) => `${m}: ${formatPerModelCost(d.cloudCostUsd, d.currency)}`)
          .join(" · ");
      }
    }
    setModelUsage(modelUsageStr);

    if (p) {
      const sym = currencySymbol(p.currency);
      const fmt = (n: number) => (Number.isFinite(n) && n > 0 ? `${sym}${n.toFixed(2)}` : "—");
      const curHint = p.currency && p.currency !== "USD" ? ` (${p.currency})` : "";
      setModelPricing(`输入 ${fmt(p.inputPer1M)}/1M · 输出 ${fmt(p.outputPer1M)}/1M${curHint}`);
    } else {
      setModelPricing("—");
    }

    const tasks = sched?.ok && Array.isArray(sched.tasks) ? sched.tasks : [];
    setTaskTotal(tasks.length);
    setTaskEnabled(tasks.filter((t) => t.enabled).length);
  }, [todayStats.agg?.topModel]);

  useEffect(() => {
    if (!hasDesktop()) return;
    void loadMeta();
    const api = getDesktop();
    const reload = () => {
      void loadMeta();
      void reloadTodayStats();
    };
    const offSessions = api?.onChatSessionsChanged?.(reload);
    const offSettings = api?.onChatSettingsChanged?.(reload);
    return () => {
      offSessions?.();
      offSettings?.();
    };
  }, [loadMeta, reloadTodayStats]);

  useEffect(() => {
    if (searchRange) setAnalyticsRange(searchRange);
  }, [searchRange]);

  useEffect(() => {
    if (window.location.hash === "#usage") {
      document.getElementById("usage")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleRangeChange = useCallback(
    (next: UsageRangePreset) => {
      setAnalyticsRange(next);
      void navigate({ search: { range: next }, hash: "usage", replace: true });
    },
    [navigate],
  );

  const modelCaption = modelDisplay.caption;
  const todayMsgTotal = (todayStats.agg?.msgUser ?? 0) + (todayStats.agg?.msgAssistant ?? 0);
  const todayCost = todayStats.agg?.cloudCostFormatted ?? "$0.00";
  const cloudTokToday = todayStats.agg?.cloudTotalTok ?? 0;
  const localTokToday = todayStats.agg?.localTotalTok ?? 0;

  const costWithCur = (usd: number, cur?: string) => {
    if (usd <= 0.0001) return "$0";
    const s = usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2);
    return cur && cur !== "USD" ? `$${s} [${cur}]` : `$${s}`;
  };

  // 构建费用脚注：云端/本地 Token + 各模型费用分解
  const modelCostMap = todayStats.agg?.perModel || {};
  const costBreakdown = Object.entries(modelCostMap)
    .filter(([, d]) => d.cloudCostUsd > 0.0001)
    .sort(([, a], [, b]) => b.cloudCostUsd - a.cloudCostUsd)
    .map(([m, d]) => `${m}: ${costWithCur(d.cloudCostUsd, d.currency)}`);

  const todayCostCaption =
    [
      cloudTokToday > 0 ? `云端 ${formatTokenCount(cloudTokToday)}` : null,
      localTokToday > 0 ? `本地 ${formatTokenCount(localTokToday)}` : null,
      (todayStats.agg?.cloudTurns ?? 0) > 0 ? `${todayStats.agg?.cloudTurns} 云端轮` : null,
      costBreakdown.length > 0 ? costBreakdown.join(" · ") : null,
    ]
      .filter(Boolean)
      .join(" · ") || "CLI + 会话 usage 估算";

  const todayKpis = useMemo(
    () =>
      buildDesktopTodayKpis({
        msgTotal: todayMsgTotal,
        sessionsInRange: todayStats.agg?.sessionsInRange ?? 0,
        todayCost,
        todayTokenHint: todayCostCaption,
        modelId: modelDisplay.value,
        modelCaption,
        modelPricing,
        modelUsage,
        taskEnabled,
        taskTotal,
      }),
    [
      todayMsgTotal,
      todayStats.agg?.sessionsInRange,
      todayStats.agg?.cloudTurns,
      todayCost,
      todayCostCaption,
      modelDisplay.value,
      modelCaption,
      modelPricing,
      modelUsage,
      taskEnabled,
      taskTotal,
    ],
  );

  return (
    <AppShell>
      <PageHeader
        title="概览"
        description={PAGE_DESC.overview}
        actions={<InfoHint side="left">{OVERVIEW_INFO_HINT}</InfoHint>}
      />

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-7">
        <OverviewBridgeBar />

        {/* 知识图谱状态卡片 */}
        <div ref={graphCardRef} className={cn(
          "flex items-center justify-between rounded-xl border px-4 py-3 transition",
          graphHealth.graphHtml
            ? "border-primary/15 bg-primary-soft/10"
            : graphHealth.graphJson
              ? "border-primary/10 bg-primary-soft/5"
              : "border-border/60 bg-muted/20",
        )}>
          <div className="flex items-center gap-3">
            {graphHealth.building ? (
              <Loader className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <GitBranch className={cn(
                "h-5 w-5",
                graphHealth.graphHtml ? "text-primary" : "text-muted-foreground/50",
              )} />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">
                  {graphHealth.building
                    ? "正在构建知识图谱"
                    : graphHealth.graphHtml === null && graphHealth.graphJson === null
                      ? "知识图谱"
                      : graphHealth.graphHtml
                        ? "知识图谱就绪"
                        : graphHealth.graphJson
                          ? "知识图谱（需生成查看器）"
                          : "知识图谱未生成"}
                </span>
                {graphHealth.building ? (
                  <span className="rounded-full border border-primary/20 bg-primary-soft/30 px-2 py-px text-[10px] font-medium text-primary">构建中</span>
                ) : graphHealth.graphHtml ? (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-px text-[10px] font-medium text-emerald-600 dark:text-emerald-400">可用</span>
                ) : graphHealth.graphJson && !graphHealth.graphHtml ? (
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-px text-[10px] font-medium text-amber-600 dark:text-amber-400">需生成页面</span>
                ) : graphHealth.graphJson === null && graphHealth.graphJson === null ? (
                  <span className="h-4 w-10 animate-pulse rounded-full bg-muted" />
                ) : null}
              </div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                {graphHealth.building
                  ? "正在后台提取代码结构并生成交互式图谱页面…"
                  : graphHealth.graphHtml
                    ? "点击右侧按钮在浏览器中查看交互式知识图谱"
                    : graphHealth.graphJson
                      ? "代码图谱已存在，可生成交互式 HTML 查看器页面"
                      : graphHealth.graphJson === null
                        ? "正在检测…"
                        : graphHealth.buildError
                          ? `构建失败：${graphHealth.buildError}`
                          : "尚未生成，点击右侧按钮开始构建（仅代码结构，无需 LLM）"}
              </div>
              {graphHealth.buildError && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {graphHealth.buildError}
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {graphHealth.building ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-[12px] text-muted-foreground">
                <Loader className="h-3.5 w-3.5 animate-spin" />
                构建中…
              </span>
            ) : graphHealth.graphHtml ? (
              <button
                type="button"
                onClick={openGraphHtml}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-soft/40 px-3 py-1.5 text-[12px] font-medium text-primary transition hover:bg-primary-soft/60"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                打开图谱
              </button>
            ) : graphHealth.graphJson ? (
              <button
                type="button"
                onClick={buildGraph}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[12px] font-medium text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                生成查看器
              </button>
            ) : graphHealth.graphJson === false ? (
              <button
                type="button"
                onClick={buildGraph}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-soft/40 px-3 py-1.5 text-[12px] font-medium text-primary transition hover:bg-primary-soft/60"
              >
                <Plus className="h-3.5 w-3.5" />
                生成知识图谱
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground/60">—</span>
            )}
          </div>
        </div>

        {/* 节点状态详情（可展开） */}
        {graphHealth.graphHtml && nodeStatusCounts && (
          <>
            <button
              type="button"
              onClick={() => setShowStatusDetail((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-4 py-2 text-[12px] text-muted-foreground transition hover:bg-muted/20"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                节点状态统计
                <span className="text-[11px] text-muted-foreground/60">（{nodeStatusCounts.total} 个节点）</span>
              </span>
              {showStatusDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showStatusDetail && (
              <div ref={detailRef} className="overflow-hidden rounded-lg border border-border/40 bg-muted/5 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "已完成", color: "bg-emerald-500", count: nodeStatusCounts.completed, hash: "completed" },
                    { label: "进行中", color: "bg-blue-500", count: nodeStatusCounts.inProgress, hash: "in-progress" },
                    { label: "可优化", color: "bg-orange-500", count: nodeStatusCounts.optimizable, hash: "optimizable" },
                    { label: "待处理", color: "bg-gray-400", count: nodeStatusCounts.total - nodeStatusCounts.completed - nodeStatusCounts.inProgress - nodeStatusCounts.optimizable, hash: "pending" },
                  ].map((item) => (
                    <a
                      key={item.hash}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        openGraphStatusHtml();
                        // 延迟后加 hash（浏览器打开后生效）
                        setTimeout(() => {
                          window.open(`graphify-out/graph-status.html#status=${item.hash}`, "_blank");
                        }, 500);
                      }}
                      className="flex flex-col items-center gap-1 rounded-lg border border-border/30 bg-background/50 p-3 transition hover:bg-accent/20"
                    >
                      <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span className="text-lg font-semibold">{item.count}</span>
                      <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    </a>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { buildStatusViz(); openGraphStatusHtml(); }}
                    className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-muted/30"
                  >
                    <ExternalLink className="h-3 w-3" />
                    打开状态图谱
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <OverviewTodayKpis kpis={todayKpis} />
        <UsageAnalyticsSection
          id="usage"
          range={analyticsRange}
          onRangeChange={handleRangeChange}
        />
      </div>
    </AppShell>
  );
}
