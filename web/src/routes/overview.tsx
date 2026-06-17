import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  formatTokenCount,
  parseUsageRange,
  type UsageRangePreset,
} from "@/lib/usage-range";

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
  const [taskEnabled, setTaskEnabled] = useState(0);
  const [taskTotal, setTaskTotal] = useState(0);

  const loadMeta = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;

    const [sched, settings, sessionsDisk, pools] = await Promise.all([
      api.scheduledTasksGet(),
      api.getChatSettings(),
      api.loadChatSessions?.().catch(() => null) ?? Promise.resolve(null),
      loadChatModelPools(api).catch(() => ({ cloudModels: [] as string[], localModels: [] as string[] })),
    ]);

    const orchMode = settings?.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
    const cached = getChatSessionsCache();
    const activeId = cached?.activeId || sessionsDisk?.activeId || "";
    const sessions =
      cached?.sessions?.length ? cached.sessions : sessionsDisk?.sessions ?? [];
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

    const tasks = sched?.ok && Array.isArray(sched.tasks) ? sched.tasks : [];
    setTaskTotal(tasks.length);
    setTaskEnabled(tasks.filter((t) => t.enabled).length);
  }, []);

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
  const todayCostCaption = [
    cloudTokToday > 0 ? `云端 ${formatTokenCount(cloudTokToday)}` : null,
    localTokToday > 0 ? `本地 ${formatTokenCount(localTokToday)}` : null,
    (todayStats.agg?.cloudTurns ?? 0) > 0 ? `${todayStats.agg?.cloudTurns} 云端轮` : null,
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
      taskEnabled,
      taskTotal,
    ],
  );

  return (
    <AppShell>
      <PageHeader
        title="概览"
        description={PAGE_DESC.overview}
        actions={
          <InfoHint side="left">{OVERVIEW_INFO_HINT}</InfoHint>
        }
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-7">
        <OverviewBridgeBar />
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
