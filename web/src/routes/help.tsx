import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { OverviewSection } from "@/components/overview-ui";
import {
  ExternalLink,
  BookOpen,
  Github,
  MessageSquare,
  Bot,
  Sparkles,
  Workflow,
  Server,
  Keyboard,
  Info,
  type LucideIcon,
} from "lucide-react";
import { HELP_SECTION_DESC, PAGE_DESC } from "@/lib/ui-copy";
import { openExternalUrl } from "@/lib/open-external";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "帮助与链接 · Claude Orchestrator" }] }),
  component: HelpPage,
});

type CardItem = {
  label: string;
  desc: string;
  href?: string;
  keys?: string;
  value?: string;
  onClick?: () => void;
};

type CardGroup = {
  title: string;
  icon: LucideIcon;
  items: CardItem[];
};

const externalLinkGroups: CardGroup[] = [
  {
    title: "官方文档",
    icon: BookOpen,
    items: [
      { label: "Claude Code 文档", href: "https://docs.claude.com", desc: "官方手册与 API" },
      { label: "Anthropic 控制台", href: "https://console.anthropic.com", desc: "API Key 与用量" },
      { label: "MCP 协议规范", href: "https://modelcontextprotocol.io", desc: "工具协议与示例" },
    ],
  },
  {
    title: "本机运行时",
    icon: Server,
    items: [
      { label: "Ollama", href: "https://ollama.com", desc: "本机模型守护进程" },
      { label: "Ollama GitHub", href: "https://github.com/ollama/ollama", desc: "源码与模型库" },
      {
        label: "Claude CLI（npm）",
        href: "https://www.npmjs.com/package/@anthropic-ai/claude-code",
        desc: "claude / doctor 命令",
      },
    ],
  },
  {
    title: "社区",
    icon: MessageSquare,
    items: [
      { label: "Claude Code 社区", href: "https://github.com/anthropics/claude-code", desc: "官方仓库与讨论" },
      {
        label: "awesome-claude-code",
        href: "https://github.com/hesreallyhim/awesome-claude-code",
        desc: "技能与智能体合集",
      },
      { label: "Anthropic Discord", href: "https://www.anthropic.com/discord", desc: "官方社区" },
    ],
  },
];

const shortcutGroups: CardGroup[] = [
  {
    title: "对话与导航",
    icon: MessageSquare,
    items: [
      { label: "命令面板", keys: "⌘K", desc: "搜索会话、技能与命令" },
      { label: "新建对话", keys: "⌘N", desc: "开启空白会话" },
      { label: "折叠侧栏", keys: "⌘B", desc: "扩大主工作区" },
    ],
  },
  {
    title: "输入与技能",
    icon: Sparkles,
    items: [
      { label: "发送", keys: "⌘⏎", desc: "提交当前输入" },
      { label: "切换技能", keys: "⌘⇧P", desc: "在支持场景下切换 Skill" },
      { label: "清空对话", keys: "⌘⇧K", desc: "清除当前会话消息" },
    ],
  },
  {
    title: "界面与设置",
    icon: Keyboard,
    items: [
      { label: "应用设置", keys: "⌘,", desc: "打开设置页" },
      { label: "深/浅色", keys: "⌘D", desc: "切换主题模式" },
      { label: "Windows 提示", desc: "将 ⌘ 换为 Ctrl 使用相同快捷键" },
    ],
  },
];

const aboutGroups: CardGroup[] = [
  {
    title: "产品定位",
    icon: Info,
    items: [
      {
        label: "Claude Orchestrator",
        desc: "本机优先：连接 Claude Code 执行对话与工具调用",
      },
      {
        label: "编排能力",
        desc: "统一管理会话、Agent、Skill、任务链与 MCP 工具",
      },
      {
        label: "数据边界",
        desc: "敏感配置与日志保存在本机，不会随 Git 推送",
      },
    ],
  },
  {
    title: "版本与运行时",
    icon: Server,
    items: [
      { label: "应用版本", value: "0.4.2", desc: "当前工作台版本" },
      { label: "Claude CLI", value: "≥ 1.0", desc: "建议保持 claude 命令为最新版" },
      { label: "本机服务", value: "已启用", desc: "对话、终端与文件读写依赖本机连接" },
    ],
  },
  {
    title: "反馈与支持",
    icon: Github,
    items: [
      {
        label: "Anthropic 支持",
        href: "https://support.anthropic.com",
        desc: "Claude 与 API 相关问题",
      },
      {
        label: "Claude Code",
        href: "https://docs.claude.com/en/docs/claude-code",
        desc: "CLI 使用说明与故障排查",
      },
      {
        label: "编排说明",
        desc: "见本页「编排与集成」区块",
      },
    ],
  },
];

const guideGroups: CardGroup[] = [
  {
    title: "Agent",
    icon: Bot,
    items: [
      { label: "定义位置", desc: "~/.claude/agents/<stem>.md，Agent 页可编辑" },
      { label: "聊天入口", desc: "/agent <stem> 或底部 Agent 选择器" },
      { label: "执行方式", desc: "云端 Claude Code CLI；本地 Ollama 编排" },
    ],
  },
  {
    title: "Skill · 任务链",
    icon: Workflow,
    items: [
      { label: "Skill 文件", desc: "~/.claude/skills/<stem>.md，Skill 页可搜索" },
      { label: "关联方式", desc: "Agent 勾选后自动带入；任务链每步可指定" },
      { label: "任务链", desc: "多步流水线，WBS 可保存并在页内搜索" },
    ],
  },
  {
    title: "MCP",
    icon: Server,
    items: [
      { label: "配置位置", desc: "~/.claude 或项目 .mcp.json" },
      { label: "管理能力", desc: "MCP 页添加预设、健康检查与启用" },
      { label: "任务链", desc: "可为单步限定可用 MCP 工具集" },
    ],
  },
];

function HelpPage() {
  return (
    <AppShell>
      <PageHeader title="帮助与链接" description={PAGE_DESC.help} />

      <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-7">
        <OverviewSection title="编排与集成" description={HELP_SECTION_DESC.guide}>
          <CardGroupGrid groups={guideGroups} />
        </OverviewSection>

        <OverviewSection title="外部资源" description={HELP_SECTION_DESC.external}>
          <CardGroupGrid groups={externalLinkGroups} />
        </OverviewSection>

        <OverviewSection title="键盘快捷键" description={HELP_SECTION_DESC.shortcuts}>
          <CardGroupGrid groups={shortcutGroups} />
        </OverviewSection>

        <OverviewSection title="关于本应用" description={HELP_SECTION_DESC.about}>
          <CardGroupGrid groups={aboutGroups} />
        </OverviewSection>
      </div>
    </AppShell>
  );
}

function CardGroupGrid({ groups }: { groups: CardGroup[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {groups.map((group) => (
        <CardGroupPanel key={group.title} {...group} />
      ))}
    </div>
  );
}

function CardGroupPanel({ title, icon: Icon, items }: CardGroup) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border/70 bg-surface/40">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      </div>
      <ul className="flex-1 divide-y divide-border/60">
        {items.map((item) => (
          <li key={`${title}:${item.label}`}>
            <CardGroupRow {...item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardGroupRow({ label, desc, href, keys, value, onClick }: CardItem) {
  const trailing = keys ? (
    <kbd className="shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      {keys}
    </kbd>
  ) : value ? (
    <span className="shrink-0 font-mono text-[11px] text-foreground">{value}</span>
  ) : href ? (
    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
  ) : null;

  const content = (
    <>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground group-hover:text-primary">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {trailing}
    </>
  );

  if (href || onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          if (onClick) onClick();
          else if (href) void openExternalUrl(href);
        }}
        className="group flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-secondary/40"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">{content}</div>
  );
}
