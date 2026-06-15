import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { InfoHint } from "@/components/info-hint";
import { OverviewBridgeBar } from "@/components/overview-bridge-bar";
import { OverviewTodayKpis, buildDesktopTodayKpis } from "@/components/overview-today-kpis";
import { UsageAnalyticsSection } from "@/components/usage-analytics-section";
import { useUsageStats } from "@/hooks/use-usage-stats";
import { getDesktop, hasDesktop } from "@/lib/desktop-api";
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

  const [modelId, setModelId] = useState("");
  const [orchMode, setOrchMode] = useState<"claude-code" | "local-mcp">("claude-code");
  const [taskEnabled, setTaskEnabled] = useState(0);
  const [taskTotal, setTaskTotal] = useState(0);

  const loadMeta = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;

    const [sched, settings] = await Promise.all([
      api.scheduledTasksGet(),
      api.getChatSettings(),
    ]);

    setOrchMode(settings?.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code");
    setModelId(settings?.model ?? "");

    const tasks = sched?.ok && Array.isArray(sched.tasks) ? sched.tasks : [];
    setTaskTotal(tasks.length);
    setTaskEnabled(tasks.filter((t) => t.enabled).length);
  }, []);

  useEffect(() => {
    if (!hasDesktop()) return;
    void loadMeta();
    const api = getDesktop();
    if (!api?.onChatSessionsChanged) return;
    return api.onChatSessionsChanged(() => {
      void loadMeta();
      void reloadTodayStats();
    });
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

  const modelCaption = orchMode === "local-mcp" ? "本地 MCP 编排" : "Claude Code CLI";
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
        modelId,
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
      modelId,
      modelCaption,
      taskEnabled,
      taskTotal,
    ],
  );

  return (
    <AppShell>
      <PageHeader
        title="概览"
        description="桥接状态、运行概况与用量统计"
        actions={
          <InfoHint side="left">
            修改工作区 → 工作目录；模型与编排 → 应用设置；MCP → MCP 服务器。
          </InfoHint>
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
