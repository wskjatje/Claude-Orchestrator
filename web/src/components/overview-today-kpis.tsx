import {
  Activity,
  MessageSquare,
  Sparkles,
  Clock,
  BarChart3,
} from "lucide-react";
import { TODAY_KPIS_DESC } from "@/lib/ui-copy";
import { hasDesktop } from "@/lib/desktop-api";
import {
  OverviewKpiCard,
  OverviewSection,
  OverviewStatLine,
} from "@/components/overview-ui";

export type TodayKpiItem = {
  label: string;
  value: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
};

type OverviewTodayKpisProps = {
  kpis: TodayKpiItem[];
};

export function OverviewTodayKpis({ kpis }: OverviewTodayKpisProps) {
  return (
    <OverviewSection
      title="运行概况"
      description={TODAY_KPIS_DESC}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <OverviewKpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            caption={k.caption}
            icon={k.icon}
            iconClassName={k.tint}
          />
        ))}
      </div>
      <OverviewStatLine
        items={["消息与会话来自今日统计", "云端费用为 API 用量估算"]}
        className="mt-3"
      />
    </OverviewSection>
  );
}

export function offlineTodayKpis(): TodayKpiItem[] {
  return [
    { label: "今日费用", value: "$0.00", caption: "未连接本机", icon: Activity, tint: "text-info" },
    { label: "活跃会话", value: "—", caption: "连接后同步", icon: MessageSquare, tint: "text-primary" },
    { label: "技能就绪", value: "—", caption: "本机 Skill 目录", icon: Sparkles, tint: "text-warning" },
    { label: "定时任务", value: "—", caption: "连接后查看", icon: Clock, tint: "text-success" },
  ];
}

export const todayKpiIcons = {
  messages: Activity,
  cost: BarChart3,
  model: Sparkles,
  tasks: Clock,
} as const;

export function buildDesktopTodayKpis(input: {
  msgTotal: number;
  sessionsInRange: number;
  todayCost: string;
  todayTokenHint: string;
  modelId: string;
  modelCaption: string;
  taskEnabled: number;
  taskTotal: number;
}): TodayKpiItem[] {
  if (!hasDesktop()) return offlineTodayKpis();
  return [
    {
      label: "聊天消息",
      value: String(input.msgTotal),
      caption: `${input.sessionsInRange} 个会话（今日）`,
      icon: todayKpiIcons.messages,
      tint: "text-info",
    },
    {
      label: "今日费用",
      value: input.todayCost,
      caption: input.todayTokenHint || "云端 API 估算",
      icon: todayKpiIcons.cost,
      tint: "text-primary",
    },
    {
      label: "当前模型",
      value: input.modelId
        ? input.modelId.slice(0, 18) + (input.modelId.length > 18 ? "…" : "")
        : "—",
      caption: input.modelCaption,
      icon: todayKpiIcons.model,
      tint: "text-warning",
    },
    {
      label: "定时任务",
      value: `${input.taskEnabled}/${input.taskTotal}`,
      caption: `${input.taskEnabled} 个启用`,
      icon: todayKpiIcons.tasks,
      tint: "text-success",
    },
  ];
}
