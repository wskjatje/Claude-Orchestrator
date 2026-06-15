import { useCallback, useEffect, useState } from "react";
import { getDesktop } from "@/lib/desktop-api";
import { aggregateSessions } from "@/lib/usage-aggregate";
import { rangeToBounds } from "@/lib/usage-range";
import type { UsageStatsSummary } from "@/types/desktop";

export type UsageBucket = UsageStatsSummary & {
  date?: string;
  hourStartMs?: number;
  label?: string;
};

export type UsageStatsResult = {
  agg: UsageStatsSummary | null;
  daily: UsageBucket[];
  hourly: UsageBucket[];
  lastBuiltAt: number | null;
  sessionsTotal: number;
  modelHint: string;
  loading: boolean;
  reload: (rebuild?: boolean) => Promise<void>;
};

export function useUsageStats(range: string): UsageStatsResult {
  const [agg, setAgg] = useState<UsageStatsResult["agg"]>(null);
  const [daily, setDaily] = useState<UsageBucket[]>([]);
  const [hourly, setHourly] = useState<UsageBucket[]>([]);
  const [lastBuiltAt, setLastBuiltAt] = useState<number | null>(null);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [modelHint, setModelHint] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = useCallback(
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

        let appAgg: UsageStatsSummary | null = null;
        let nextDaily: UsageBucket[] = [];
        let nextHourly: UsageBucket[] = [];
        let builtAt: number | null = null;

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
                cloudTurns: cu.turns ?? appAgg.cloudTurns,
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
    [range],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { agg, daily, hourly, lastBuiltAt, sessionsTotal, modelHint, loading, reload };
}
