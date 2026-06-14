import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { PageContent, PageRoot, SinglePaneLayout } from "@/components/page-layout";
import { ExternalLink, BookOpen, Github, MessageSquare, Keyboard, Info, Zap } from "lucide-react";
import { openExternalUrl } from "@/lib/open-external";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "帮助与链接 · 本地代码助手" }] }),
  component: HelpPage,
});

type Link = { label: string; href: string; desc: string };

const groups: { title: string; icon: typeof BookOpen; accent: string; links: Link[] }[] = [
  {
    title: "官方文档",
    icon: BookOpen,
    accent: "text-primary",
    links: [
      { label: "Claude Code 文档",        href: "https://docs.claude.com",                     desc: "Anthropic Claude Code 官方手册与 API 参考" },
      { label: "Anthropic 控制台",        href: "https://console.anthropic.com",               desc: "管理 API Key、模型与用量" },
      { label: "MCP 协议规范",            href: "https://modelcontextprotocol.io",             desc: "模型上下文协议（Model Context Protocol）规范与示例" },
    ],
  },
  {
    title: "本机运行时",
    icon: Zap,
    accent: "text-warning",
    links: [
      { label: "Ollama 官网",             href: "https://ollama.com",                          desc: "本机模型守护进程" },
      { label: "Ollama GitHub",           href: "https://github.com/ollama/ollama",            desc: "源码、模型库、Issue" },
      { label: "Claude CLI（npm）",       href: "https://www.npmjs.com/package/@anthropic-ai/claude-code", desc: "claude / claude doctor 命令源" },
    ],
  },
  {
    title: "社区与资源",
    icon: MessageSquare,
    accent: "text-info",
    links: [
      { label: "claudecodeui (GitHub)",   href: "https://github.com/siteboon/claudecodeui",    desc: "10k+ 星的 Claude Code 前端参考实现" },
      { label: "Claude Code 精选合集",    href: "https://github.com/hesreallyhim/awesome-claude-code", desc: "技能 / 智能体 / 钩子精选合集" },
      { label: "Anthropic 社区（Discord）", href: "https://www.anthropic.com/discord",         desc: "官方社区，技术答疑" },
    ],
  },
];

const shortcuts: { keys: string; label: string }[] = [
  { keys: "⌘K",      label: "全局命令面板" },
  { keys: "⌘N",      label: "新建对话" },
  { keys: "⌘⇧P",    label: "切换技能" },
  { keys: "⌘B",      label: "折叠侧栏" },
  { keys: "⌘⏎",     label: "发送消息" },
  { keys: "⌘⇧K",    label: "清空当前对话" },
  { keys: "⌘,",      label: "打开应用设置" },
  { keys: "⌘D",      label: "切换深 / 浅色" },
];

function HelpPage() {
  return (
    <AppShell>
      <PageRoot>
        <PageHeader title="帮助与链接" description="文档、社区资源与常用快捷键" />
        <SinglePaneLayout>
          <PageContent className="space-y-4">
        <div className="page-grid-2">
          {groups.map((g) => {
            const Icon = g.icon;
            return (
              <section key={g.title} className="page-section">
                <header className="page-section-header">
                  <Icon className={`h-4 w-4 ${g.accent}`} />
                  <h2 className="text-[13px] font-semibold text-foreground">{g.title}</h2>
                </header>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.links.map((l) => (
                    <button
                      key={l.href}
                      type="button"
                      onClick={() => void openExternalUrl(l.href)}
                      className="group rounded-lg border border-border bg-surface p-2.5 text-left transition hover:border-primary/40 hover:bg-primary-soft/40"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-foreground group-hover:text-primary">{l.label}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{l.desc}</p>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="page-section">
          <header className="page-section-header">
            <Keyboard className="h-4 w-4 text-primary" />
            <h2 className="text-[13px] font-semibold text-foreground">键盘快捷键</h2>
          </header>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {shortcuts.map((s) => (
              <div key={s.keys} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-foreground">{s.label}</span>
                <kbd className="shrink-0 rounded border border-border bg-secondary px-1 py-0.5 font-mono text-[10px] text-foreground">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        <section className="page-section bg-gradient-to-br from-primary-soft/40 to-surface-elevated">
          <header className="page-section-header">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="text-[13px] font-semibold text-foreground">关于本地代码助手</h2>
          </header>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
            <div className="space-y-1.5 text-[12.5px] text-foreground/80">
              <p>本应用是一个 <b>本机优先</b> 的 Claude Code 工作台 — 通过 WebSocket Bridge 与本地 CLI 守护进程通信。</p>
              <p>所有 prompt、工具调用与文件读写均发生在你的机器上，Workbench 仅做 UI 渲染与会话历史持久化。</p>
            </div>
            <div className="space-y-1 rounded-xl border border-border bg-surface/80 p-3 font-mono text-[11.5px]">
              <Row k="版本"     v="0.4.2 (preview)" />
              <Row k="构建"     v="2026.04.22" />
              <Row k="CLI 兼容" v="@anthropic-ai/claude-code ≥ 1.0" />
              <Row k="桥接地址" v="ws://127.0.0.1:18789" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void openExternalUrl("https://github.com/siteboon/claudecodeui")}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-secondary"
          >
            <Github className="h-3.5 w-3.5" /> 在 GitHub 上反馈
          </button>
        </section>
          </PageContent>
        </SinglePaneLayout>
      </PageRoot>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}
