import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  MessageCircle,
  FolderTree,
  LayoutDashboard,
  Clock,
  ScrollText,
  FileText,
  Activity,
  Bot,
  Sparkles,
  Workflow,
  Server,
  Settings,
  BookOpen,
  Menu,
  PanelLeftClose,
  Terminal,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBridge } from "@/hooks/use-bridge";
import { useDesktopReady } from "@/hooks/use-desktop-ready";
import { useOrchestrationExecution } from "@/hooks/use-orchestration-execution";
import { hasDesktop, isWebBridge } from "@/lib/desktop-api";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "工作区",
    items: [
      { to: "/", label: "聊天", icon: MessageCircle },
      { to: "/workspaces", label: "工作目录", icon: FolderTree },
    ],
  },
  {
    label: "运行",
    items: [
      { to: "/overview", label: "概览", icon: LayoutDashboard },
      { to: "/scheduled", label: "定时任务", icon: Clock },
      { to: "/logs", label: "日志", icon: ScrollText },
      { to: "/usage", label: "使用与用量", icon: Activity },
      { to: "/reports", label: "智能体执行日报", icon: FileText },
    ],
  },
  {
    label: "编排",
    items: [
      { to: "/agents", label: "Agent", icon: Bot },
      { to: "/skills", label: "技能", icon: Sparkles },
      { to: "/chains", label: "任务链", icon: Workflow },
    ],
  },
  {
    label: "集成",
    items: [{ to: "/comms", label: "MCP 服务器", icon: Server }],
  },
  {
    label: "系统",
    items: [
      { to: "/settings", label: "应用设置", icon: Settings },
      { to: "/help", label: "帮助与链接", icon: BookOpen },
    ],
  },
];

export function AppShell({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  /** default：内容区可滚动；fill：占满主栏高度（列表/详情页）；workbench：聊天工作台 */
  variant?: "default" | "fill" | "workbench";
}) {
  const location = useLocation();
  const bridge = useBridge();
  const mounted = useDesktopReady();
  const { chainStatusBadge, chainRunning, syncExecutionState } = useOrchestrationExecution();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const workbench = variant === "workbench";
  const fillHeight = variant === "workbench" || variant === "fill";
  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  useEffect(() => {
    setMobileNavOpen(false);
    void syncExecutionState();
  }, [location.pathname, location.search, syncExecutionState]);

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-background text-foreground">
      {/* 顶栏：Electron 已由系统绘制窗口按钮，此处不再绘制装饰性红绿灯 */}
      <div className="glass relative z-50 flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-elevated/80 px-2 backdrop-blur-md sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition hover:bg-secondary hover:text-foreground md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="app-sidebar-nav"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? (
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            ) : (
              <Menu className="h-4 w-4" aria-hidden />
            )}
            <span className="sr-only">{mobileNavOpen ? "关闭导航" : "打开导航"}</span>
          </button>
          <span className="truncate text-[11.5px] font-semibold tracking-tight text-foreground/90 sm:text-[12px]">
            Claude Workbench
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="group hidden min-h-9 items-center gap-2 rounded-md border border-border bg-surface/70 px-2 text-[11.5px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground sm:inline-flex lg:min-w-[220px]"
            title="全局搜索 (⌘K)"
          >
            <Search className="h-3 w-3 shrink-0" />
            <span className="hidden truncate lg:inline">搜索会话、技能、命令…</span>
            <kbd className="ml-auto hidden rounded border border-border bg-background px-1 font-mono text-[10px] text-muted-foreground xl:inline">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            className="group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface/70 text-muted-foreground transition hover:border-primary/40 hover:text-foreground sm:hidden"
            title="搜索"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* 桥接离线提示（客户端 mount 后再渲染，避免 SSR 与 window.desktop 状态不一致） */}
      {mounted && !bridge.online && (isWebBridge() || !hasDesktop()) && (
        <div translate="no" className="flex h-7 shrink-0 items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 text-[11.5px] text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          {isWebBridge() ? (
            <>Web Bridge 离线 — 请在终端运行 npm run web:dev:full 后刷新</>
          ) : (
            <>
              <span translate="no">桥接服务</span> 离线 — 当前仅显示缓存数据。请配置本机桥接服务以启用真实 Claude CLI 接入
              <Link to="/overview" className="ml-1 underline hover:no-underline">
                前往配置
              </Link>
            </>
          )}
        </div>
      )}

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="关闭导航菜单"
          className="fixed inset-0 top-9 z-[35] bg-black/40 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar：窄屏为抽屉，md 及以上固定侧栏 */}
        <aside
          id="app-sidebar-nav"
          className={cn(
            "flex shrink-0 flex-col border-r border-border bg-sidebar",
            "fixed bottom-0 left-0 top-9 z-40 w-[min(17rem,88vw)] max-w-[280px] shadow-xl transition-transform duration-200 ease-out",
            "md:relative md:top-0 md:z-0 md:h-auto md:max-w-none md:translate-x-0 md:shadow-none md:transition-none",
            workbench ? "md:w-12" : "md:w-60",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          )}
        >
          {!workbench ? (
            <div className="flex items-center gap-2.5 px-4 py-4 sm:px-5 sm:py-5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Terminal className="h-4 w-4" />
              </div>
              <div className="flex flex-col leading-tight" translate="no">
                <span className="text-[15px] font-semibold tracking-tight">Claude Workbench</span>
                <span className="text-[11px] text-muted-foreground">
                  {!mounted
                    ? "浏览器预览 · CLI 桥接"
                    : hasDesktop()
                      ? "本机桌面 · Ollama / Claude Code"
                      : "浏览器预览 · CLI 桥接"}
                </span>
              </div>
            </div>
          ) : (
            <div className="hidden h-2 shrink-0 md:block" aria-hidden />
          )}

          <nav
            className={cn(
              "flex-1 overflow-y-auto scrollbar-thin pb-4",
              workbench ? "px-1 md:px-1.5" : "px-3",
            )}
          >
            {groups.map((group, gi) => (
              <div key={gi} className={cn("mb-3", workbench && "mb-2")}>
                {group.label && !workbench ? (
                  <div className="px-2 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                    {group.label}
                  </div>
                ) : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.to);
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setMobileNavOpen(false)}
                          title={item.label}
                          className={cn(
                            "group flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150",
                            workbench
                              ? "justify-center px-0 py-2 md:px-0 md:py-2"
                              : "gap-2.5 px-2.5 py-1.5",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              workbench && "h-[18px] w-[18px]",
                              active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground/70",
                            )}
                          />
                          <span className={cn(workbench && "sr-only md:sr-only")}>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div
            className={cn(
              "border-t border-border text-[11px] text-muted-foreground",
              workbench ? "hidden px-1 py-2 md:block" : "px-4 py-3",
            )}
          >
            {(chainRunning || chainStatusBadge.tone === "paused") && !workbench && (
              <div
                className={cn(
                  "mb-2 inline-flex max-w-full items-center rounded-md border px-2 py-1 text-[10.5px] font-medium leading-snug",
                  chainStatusBadge.tone === "active" &&
                    "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  chainStatusBadge.tone === "paused" &&
                    "border-amber-400/45 bg-amber-500/12 text-amber-800 dark:text-amber-300",
                )}
                title="切换页签不会中断任务链；可在聊天页停止"
              >
                {chainStatusBadge.label}
              </div>
            )}
            {workbench ? (
              <div className="flex justify-center" title={bridge.online ? "桥接已连接" : "桥接离线"}>
                <span className="relative flex h-2 w-2">
                  {bridge.online && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full",
                      bridge.online ? "bg-success" : "bg-muted-foreground/40",
                    )}
                  />
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    {bridge.online && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    )}
                    <span
                      className={cn(
                        "relative inline-flex h-1.5 w-1.5 rounded-full",
                        bridge.online ? "bg-success" : "bg-muted-foreground/40",
                      )}
                    />
                  </span>
                  {!mounted
                    ? "检查连接中…"
                    : hasDesktop()
                      ? bridge.online
                        ? `Claude Code · ${bridge.version ?? "桌面"}`
                        : "桌面 API 不可用"
                      : bridge.online
                        ? `CLI 桥接 · ${bridge.version ?? "v1.x"}`
                        : "桥接服务未连接"}
                </div>
                <button
                  type="button"
                  className="mt-1 inline-block text-left text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    const url = hasDesktop() ? "https://code.claude.com/docs" : "https://code.claude.com/docs";
                    void window.desktop?.openExternal(url);
                  }}
                >
                  Claude Code 文档 ↗
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="main-canvas flex min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "min-h-0 flex-1",
              fillHeight ? "flex h-full flex-col overflow-hidden" : "overflow-y-auto scrollbar-thin",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface-elevated px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-4 lg:px-7">
      <div className="min-w-0">
        <h1 className="text-[16px] font-semibold tracking-tight text-foreground sm:text-[17px]">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground sm:text-[12.5px]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:max-w-full">{actions}</div>
      )}
    </div>
  );
}
