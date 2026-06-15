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
  type LucideIcon,
} from "lucide-react";
import { openExternalUrl } from "@/lib/open-external";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "帮助与链接 · Claude Orchestrator" }] }),
  component: HelpPage,
});

type ExternalLinkItem = { label: string; href: string; desc: string };

const externalLinkGroups: {
  title: string;
  icon: LucideIcon;
  links: ExternalLinkItem[];
}[] = [
  {
    title: "官方文档",
    icon: BookOpen,
    links: [
      { label: "Claude Code 文档", href: "https://docs.claude.com", desc: "官方手册与 API" },
      { label: "Anthropic 控制台", href: "https://console.anthropic.com", desc: "API Key 与用量" },
      { label: "MCP 协议规范", href: "https://modelcontextprotocol.io", desc: "工具协议与示例" },
    ],
  },
  {
    title: "本机运行时",
    icon: Server,
    links: [
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
    links: [
      { label: "claudecodeui", href: "https://github.com/siteboon/claudecodeui", desc: "前端参考实现" },
      {
        label: "awesome-claude-code",
        href: "https://github.com/hesreallyhim/awesome-claude-code",
        desc: "技能与智能体合集",
      },
      { label: "Anthropic Discord", href: "https://www.anthropic.com/discord", desc: "官方社区" },
    ],
  },
];

const guides: {
  title: string;
  icon: LucideIcon;
  where: string;
  bullets: string[];
}[] = [
  {
    title: "Agent",
    icon: Bot,
    where: "侧栏 Agent · 聊天 /agent",
    bullets: [
      "角色定义在 ~/.claude/agents/<stem>.md，Agent 页可编辑并关联 Skill。",
      "聊天输入 /agent <stem> 需求，或短别名如 /pm；底部也可选 Agent。",
      "云端走 Claude Code CLI，本地由 Ollama 编排并注入 Agent 正文。",
    ],
  },
  {
    title: "Skill",
    icon: Sparkles,
    where: "侧栏 Skill · Agent · 任务链",
    bullets: [
      "技能文件在 ~/.claude/skills/<stem>.md，Skill 页可搜索预览。",
      "Agent 勾选技能后自动带入；任务链每步可单独指定。",
      "⌘⇧P 可在支持场景下切换技能。",
    ],
  },
  {
    title: "任务链",
    icon: Workflow,
    where: "侧栏 任务链 · WBS",
    bullets: [
      "多步流水线：每步配 Agent、任务 ID、指令，可选 Skill / MCP。",
      "「后台执行」按序运行；WBS 可保存为链并在页内搜索找回。",
    ],
  },
  {
    title: "MCP",
    icon: Server,
    where: "侧栏 MCP 服务器",
    bullets: [
      "为模型提供文件、抓取、记忆等工具；配置在 ~/.claude。",
      "添加预设、健康检查后启用；任务链可限定单步可用 MCP。",
    ],
  },
];

const shortcuts: { keys: string; label: string }[] = [
  { keys: "⌘K", label: "命令面板" },
  { keys: "⌘N", label: "新建对话" },
  { keys: "⌘⇧P", label: "切换技能" },
  { keys: "⌘B", label: "折叠侧栏" },
  { keys: "⌘⏎", label: "发送" },
  { keys: "⌘⇧K", label: "清空对话" },
  { keys: "⌘,", label: "应用设置" },
  { keys: "⌘D", label: "深/浅色" },
];

function HelpPage() {
  return (
    <AppShell>
      <PageHeader title="帮助与链接" description="编排上手、快捷键与外部文档" />

      <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-7">
        <OverviewSection
          title="编排与集成"
          description="Agent、Skill、任务链、MCP 的常用入口与操作方式"
          className="flex-1"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {guides.map((g) => (
              <GuideCard key={g.title} {...g} />
            ))}
          </div>
        </OverviewSection>

        <div className="grid gap-5 lg:grid-cols-5">
          <OverviewSection
            title="键盘快捷键"
            description="macOS；Windows 将 ⌘ 换为 Ctrl"
            className="lg:col-span-3"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4">
              {shortcuts.map((s) => (
                <ShortcutChip key={s.keys} keys={s.keys} label={s.label} />
              ))}
            </div>
          </OverviewSection>

          <OverviewSection title="关于本应用" className="lg:col-span-2">
            <p className="text-sm leading-relaxed text-foreground/85">
              本机优先的 Claude Orchestrator：Bridge 连接本地 CLI，prompt 与工具调用在本地执行，UI 负责会话与编排。
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <MetaItem label="版本" value="0.4.2" />
              <MetaItem label="CLI" value="≥ 1.0" />
              <MetaItem label="Bridge" value=":18789" />
              <MetaItem label="构建" value="2026.04" />
            </dl>
            <button
              type="button"
              onClick={() => void openExternalUrl("https://github.com/siteboon/claudecodeui")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub 反馈
            </button>
          </OverviewSection>
        </div>

        <OverviewSection title="外部资源" description="官方文档、运行时与社区链接">
          <div className="grid gap-4 lg:grid-cols-3">
            {externalLinkGroups.map((group) => (
              <ExternalLinkGroup key={group.title} {...group} />
            ))}
          </div>
        </OverviewSection>
      </div>
    </AppShell>
  );
}

function GuideCard({
  title,
  icon: Icon,
  where,
  bullets,
}: {
  title: string;
  icon: LucideIcon;
  where: string;
  bullets: string[];
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border/70 bg-surface/50 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-foreground/70" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{where}</p>
        </div>
      </div>
      <ul className="mt-3 flex-1 space-y-1.5 text-[12px] leading-relaxed text-foreground/80">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function ShortcutChip({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface/50 px-3 py-2">
      <span className="truncate text-xs text-foreground">{label}</span>
      <kbd className="shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        {keys}
      </kbd>
    </div>
  );
}

function ExternalLinkGroup({
  title,
  icon: Icon,
  links,
}: {
  title: string;
  icon: LucideIcon;
  links: ExternalLinkItem[];
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border/70 bg-surface/40">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      </div>
      <ul className="flex-1 divide-y divide-border/60">
        {links.map((link) => (
          <li key={link.href}>
            <ExternalLinkRow {...link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExternalLinkRow({ label, href, desc }: ExternalLinkItem) {
  return (
    <button
      type="button"
      onClick={() => void openExternalUrl(href)}
      className="group flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-secondary/40"
    >
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground group-hover:text-primary">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
    </button>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-foreground">{value}</dd>
    </div>
  );
}
