import { useMemo } from "react";
import { useUsageStats } from "@/hooks/use-usage-stats";
import { USAGE_RANGE_PRESETS, formatTokenCount, type UsageRangePreset } from "@/lib/usage-range";
import type { UsageStatsSummary } from "@/types/desktop";
import {
  OverviewKpiCard,
  OverviewSection,
  OverviewSegmented,
  OverviewToolbar,
} from "@/components/overview-ui";
import { USAGE_SECTION_DESC } from "@/lib/ui-copy";

type UsageAnalyticsSectionProps = {
  id?: string;
  range: UsageRangePreset;
  onRangeChange: (range: UsageRangePreset) => void;
};

export function UsageAnalyticsSection({ id = "usage", range, onRangeChange }: UsageAnalyticsSectionProps) {
  const { agg, loading, reload } = useUsageStats(range);

  const totalMsgs = (agg?.msgUser ?? 0) + (agg?.msgAssistant ?? 0);
  const hideMsgKpi = range === "今天";

  const kpis = useMemo(
    () => buildUsageKpis(agg, totalMsgs, hideMsgKpi),
    [agg, totalMsgs, hideMsgKpi],
  );

  return (
    <OverviewSection
      id={id}
      title="用量统计"
      description={USAGE_SECTION_DESC}
    >
      <OverviewToolbar onRefresh={() => void reload(true)} refreshing={loading}>
        <OverviewSegmented
          value={range}
          options={USAGE_RANGE_PRESETS.map((r) => ({ id: r, label: r }))}
          onChange={(v) => onRangeChange(v as UsageRangePreset)}
        />
      </OverviewToolbar>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        {kpis.map((k) => (
          <OverviewKpiCard key={k.label} {...k} />
        ))}
      </div>
    </OverviewSection>
  );
}

function buildUsageKpis(
  agg: UsageStatsSummary | null,
  totalMsgs: number,
  hideMsgKpi: boolean,
) {
  const a = agg;
  const tp = a?.throughputTokPerSec;
  const avg = a?.avgTokPerMsg;
  const er = a?.errRate ?? 0;
  const erPct = `${(er * 100).toFixed(1)}%`;
  const errClass = er > 0.05 ? "text-destructive" : undefined;
  const cloudCost = a?.cloudCostFormatted ?? "$0.00";
  const cliCost = a?.cliCostUsd ?? 0;
  const sessionCost = a?.sessionCloudCostUsd ?? 0;

  const usageCaption =
    (a?.apiTurns ?? 0) > 0 && (a?.totalTok ?? 0) === 0
      ? "部分模型未回报 usage"
      : (a?.apiTurns ?? 0) === 0
        ? "无带时间戳的请求"
        : `${a?.apiTurns} 次回合 · ${a?.totalTok ?? 0} token`;

  const items = [
    {
      label: "云端费用",
      value: cloudCost,
      caption:
        cliCost > 0 || sessionCost > 0
          ? `CLI ${cliCost > 0 ? `$${cliCost.toFixed(2)}` : "$0"} + 落库 ${sessionCost > 0 ? `$${sessionCost.toFixed(4)}` : "$0"}`
          : "基于 ~/.claude/projects 与单价表",
      hint: "Claude Code CLI jsonl 与 usage 合并估算。",
    },
    {
      label: "云端 Token",
      value: (a?.cloudTotalTok ?? 0) > 0 ? formatTokenCount(a?.cloudTotalTok ?? 0) : "—",
      caption: `${a?.cloudTurns ?? 0} 次云端回合`,
      hint: "云端模型 API 调用 token 汇总。",
      soft: (a?.cloudTotalTok ?? 0) === 0,
    },
    {
      label: "本地 Token",
      value: (a?.localTotalTok ?? 0) > 0 ? formatTokenCount(a?.localTotalTok ?? 0) : "—",
      caption: `${a?.localTurns ?? 0} 次本地回合 · 无计费`,
      hint: "本机 Ollama 编排，不产生云端费用。",
      soft: (a?.localTotalTok ?? 0) === 0,
    },
    ...(hideMsgKpi
      ? []
      : [
          {
            label: "消息",
            value: String(totalMsgs),
            caption: `${a?.msgUser ?? 0} 用户 · ${a?.msgAssistant ?? 0} 助手`,
            hint: "时间范围内含 ts 的消息。",
          },
        ]),
    {
      label: "吞吐量",
      value: tp != null && Number.isFinite(tp) ? tp.toFixed(1) : "—",
      caption: tp != null ? "输出 token / 秒" : "需 usage + 耗时",
      hint: "completion ÷ 请求耗时。",
      soft: tp == null,
    },
    {
      label: "平均 Token",
      value: avg != null ? avg.toFixed(1) : "—",
      caption: usageCaption,
      hint: "总 token ÷ 含 usage 回合。",
      soft: avg == null,
    },
    {
      label: "工具调用",
      value: String(a?.workspaceWriteHints ?? 0),
      caption: "workspace-write 块",
      hint: "助手回复中的落盘代码块。",
    },
    {
      label: "错误率",
      value: erPct,
      caption: `${a?.errors ?? 0} / ${a?.apiTurns ?? 0} 回合`,
      hint: "requestError 或失败统计。",
      valueClassName: errClass,
    },
  ];

  return items;
}
