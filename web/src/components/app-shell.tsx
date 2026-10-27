import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Bot,
  CircleHelp,
  Clock,
  FileText,
  Files,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  ListTree,
  Menu,
  MessageCircle,
  PanelLeftClose,
  Plug,
  ScrollText,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/app-logo";
import { SidebarFooter } from "@/components/sidebar-footer";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_NAME, SETTINGS_ADVANCED_LINKS, SETTINGS_EXPERIMENTAL_LINKS } from "@/lib/ui-copy";
import { useBridge } from "@/hooks/use-bridge";
import { useDesktopReady } from "@/hooks/use-desktop-ready";
import { useOrchestrationExecution } from "@/hooks/use-orchestration-execution";
import { hasDesktop, isWebBridge } from "@/lib/desktop-api";
import { BRIDGE_OFFLINE_BANNER, BRIDGE_OFFLINE_LEGACY } from "@/lib/ui-copy";
import { ErrorBoundary } from "@/components/error-boundary";
import { EMPTY_CHAT_SEARCH } from "@/lib/chat-route-search";
import {
  getWorkbenchSideTab,
  requestWorkbenchSideTab,
  subscribeWorkbenchSideTabState,
  type WorkbenchSideTabId,
} from "@/lib/workbench-side-tab";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  search?: { q: string };
};
type NavGroup = { label: string; items: NavItem[] };

const OPS_NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/workspaces": FolderOpen,
  "/overview": LayoutDashboard,
  "/agents": Bot,
  "/skills": Sparkles,
  "/chains": Link2,
  "/comms": Plug,
  "/logs": ScrollText,
  "/scheduled": Clock,
  "/reports": FileText,
};

function opsNavItems(
  links: ReadonlyArray<{ to: string; label: string }>,
): NavItem[] {
  return links.map((item) => ({
    to: item.to,
    label: item.label,
    icon: OPS_NAV_ICONS[item.to] ?? FolderOpen,
    ...(item.to === "/chains" ? { search: { q: "" } } : {}),
  }));
}

/** 非工作台：产品页导航。编排入口跟在「聊天」后，不再嵌进设置页签。 */
const groups: NavGroup[] = [
  {
    label: "",
    items: [{ to: "/", label: "聊天", icon: MessageCircle }],
  },
  {
    label: "编排与运维",
    items: opsNavItems(SETTINGS_ADVANCED_LINKS),
  },
  {
    label: "",
    items: [
      { to: "/settings", label: "应用设置", icon: Settings },
      { to: "/help", label: "帮助", icon: BookOpen },
    ],
  },
];

const EXPERIMENTAL_NAV = opsNavItems(SETTINGS_EXPERIMENTAL_LINKS);
const WORKBENCH_OPS_NAV = [
  ...opsNavItems(SETTINGS_ADVANCED_LINKS),
  ...EXPERIMENTAL_NAV,
];

/** Cursor 活动栏：资源 / 搜索 / SCM / 大纲（不再用聊天气泡冒充工作台入口） */
const WORKBENCH_ACTIVITY: {
  id: WorkbenchSideTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "files", label: "资源管理器", icon: Files },
  { id: "search", label: "搜索", icon: Search },
  { id: "git", label: "源代码管理", icon: GitBranch },
  { id: "outline", label: "大纲（当前文件）", icon: ListTree },
];

const WORKBENCH_FOOTER_NAV: NavItem[] = [
  { to: "/settings", label: "应用设置", icon: Settings },
  { to: "/help", label: "帮助", icon: CircleHelp },
];

export function AppShell({
  children,
  variant = "default",
  headerToolbar,
}: {
  children: React.ReactNode;
  /** default：内容区可滚动；fill：占满主栏高度（列表/详情页）；workbench：聊天工作台 */
  variant?: "default" | "fill" | "workbench";
  /** 工作台顶栏右侧：布局开关（与主导航分离） */
  headerToolbar?: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const bridge = useBridge();
  const mounted = useDesktopReady();
  const { chainStatusBadge, chainRunning, syncExecutionState } = useOrchestrationExecution();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [opsMenuOpen, setOpsMenuOpen] = useState(false);
  const [experimentalOpen, setExperimentalOpen] = useState(false);
  const workbench = variant === "workbench";
  const fillHeight = variant === "workbench" || variant === "fill";
  const sideTab = useSyncExternalStore(
    subscribeWorkbenchSideTabState,
    getWorkbenchSideTab,
    getWorkbenchSideTab,
  );
  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  useEffect(() => {
    setMobileNavOpen(false);
    void syncExecutionState();
  }, [location.pathname, location.search, syncExecutionState]);

  const openSideTab = (id: WorkbenchSideTabId) => {
    setMobileNavOpen(false);
    if (location.pathname !== "/") {
      void navigate({ to: "/", search: EMPTY_CHAT_SEARCH });
    }
    requestWorkbenchSideTab(id);
  };

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
          <AppLogo variant="mark" className="shrink-0 sm:hidden" />
          <AppLogo variant="mark" className="hidden shrink-0 sm:block md:hidden" />
          <span
            className="hidden truncate text-[11.5px] font-semibold tracking-tight text-foreground/90 md:inline sm:text-[12px]"
            translate="no"
          >
            {APP_NAME}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {headerToolbar}
          <ThemeToggle />
        </div>
      </div>

      {/* 桥接离线提示（客户端 mount 后再渲染，避免 SSR 与 window.desktop 状态不一致） */}
      {mounted && !bridge.online && (
        <div
          translate="no"
          className="flex h-7 shrink-0 items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 text-[11.5px] text-warning"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          {isWebBridge() || hasDesktop() ? (
            <>{BRIDGE_OFFLINE_BANNER}</>
          ) : (
            <>
              {BRIDGE_OFFLINE_LEGACY}
              <Link to="/settings" className="ml-1 underline hover:no-underline">
                查看连接状态
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
            "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
            "fixed bottom-0 left-0 top-9 z-40 w-[min(17rem,88vw)] max-w-[300px] shadow-xl transition-transform duration-200 ease-out",
            "md:relative md:top-0 md:z-0 md:h-auto md:max-w-none md:translate-x-0 md:shadow-none md:transition-none",
            workbench ? "md:w-12" : "md:w-64",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          )}
        >
          {!workbench ? (
            <div className="border-b border-sidebar-border/80 px-3 py-3 sm:px-4">
              <AppLogo variant="sidebar" />
            </div>
          ) : (
            <div className="hidden h-2 shrink-0 md:block" aria-hidden />
          )}

          {workbench ? (
            <>
              <nav
                className="flex flex-1 flex-col overflow-y-auto px-1 pb-2 pt-0.5 scrollbar-thin md:px-1.5"
                aria-label="活动栏"
              >
                <ul className="space-y-0.5">
                  {WORKBENCH_ACTIVITY.map((item) => {
                    const active = sideTab === item.id && location.pathname === "/";
                    const Icon = item.icon;
                    const btn = (
                      <button
                        type="button"
                        onClick={() => openSideTab(item.id)}
                        className={cn(
                          "app-nav-link app-nav-link--rail",
                          active && "app-nav-link--active",
                        )}
                        aria-label={item.label}
                        aria-pressed={active}
                      >
                        <Icon className="app-nav-link__icon" aria-hidden />
                        <span className="sr-only md:sr-only">{item.label}</span>
                      </button>
                    );
                    return (
                      <li key={item.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
                <ul className="mt-auto space-y-0.5 border-t border-sidebar-border/60 pt-2">
                  <li>
                    <DropdownMenu open={opsMenuOpen} onOpenChange={setOpsMenuOpen}>
                      <Tooltip open={opsMenuOpen ? false : undefined}>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "app-nav-link app-nav-link--rail",
                                WORKBENCH_OPS_NAV.some((n) => isActive(n.to)) &&
                                  "app-nav-link--active",
                              )}
                              aria-label="编排与运维"
                            >
                              <LayoutGrid className="app-nav-link__icon" aria-hidden />
                              <span className="sr-only">编排与运维</span>
                            </button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          编排与运维
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent side="right" align="end" sideOffset={8} className="min-w-44">
                        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                          编排与运维
                        </DropdownMenuLabel>
                        {opsNavItems(SETTINGS_ADVANCED_LINKS).map((item) => {
                          const Icon = item.icon;
                          return (
                            <DropdownMenuItem key={item.to} asChild>
                              <Link
                                to={item.to}
                                {...(item.search ? { search: item.search } : {})}
                                onClick={() => setMobileNavOpen(false)}
                                className="flex cursor-pointer items-center gap-2"
                              >
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                          实验
                        </DropdownMenuLabel>
                        {EXPERIMENTAL_NAV.map((item) => {
                          const Icon = item.icon;
                          return (
                            <DropdownMenuItem key={item.to} asChild>
                              <Link
                                to={item.to}
                                onClick={() => setMobileNavOpen(false)}
                                className="flex cursor-pointer items-center gap-2"
                              >
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                  {WORKBENCH_FOOTER_NAV.map((item) => {
                    const active = isActive(item.to);
                    const Icon = item.icon;
                    const link = (
                      <Link
                        to={item.to}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "app-nav-link app-nav-link--rail",
                          active && "app-nav-link--active",
                        )}
                      >
                        <Icon className="app-nav-link__icon" aria-hidden />
                        <span className="sr-only md:sr-only">{item.label}</span>
                      </Link>
                    );
                    return (
                      <li key={item.to}>
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </>
          ) : (
            <nav
              className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2.5 scrollbar-thin sm:px-3"
              aria-label="主导航"
            >
              {groups.map((group, gi) => (
                <div key={gi} className="mb-3">
                  {group.label ? (
                    <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                      {group.label}
                    </div>
                  ) : null}
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const active = isActive(item.to);
                      const Icon = item.icon;
                      return (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            {...(item.search ? { search: item.search } : {})}
                            onClick={() => setMobileNavOpen(false)}
                            className={cn("app-nav-link", active && "app-nav-link--active")}
                          >
                            <Icon className="app-nav-link__icon" aria-hidden />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {EXPERIMENTAL_NAV.length > 0 ? (
                <div className="mb-3">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer list-none items-center px-2 pb-1.5 pt-1 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40"
                    aria-expanded={experimentalOpen}
                    onClick={() => setExperimentalOpen((v) => !v)}
                  >
                    <span className="inline-flex items-center gap-1">
                      实验
                      {!experimentalOpen ? (
                        <span className="font-normal normal-case tracking-normal text-sidebar-foreground/30">
                          · 展开
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {experimentalOpen ? (
                    <ul className="mt-1 space-y-1">
                      {EXPERIMENTAL_NAV.map((item) => {
                        const active = isActive(item.to);
                        const Icon = item.icon;
                        return (
                          <li key={item.to}>
                            <Link
                              to={item.to}
                              onClick={() => setMobileNavOpen(false)}
                              className={cn(
                                "app-nav-link text-muted-foreground",
                                active && "app-nav-link--active",
                              )}
                            >
                              <Icon className="app-nav-link__icon" aria-hidden />
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </nav>
          )}

          <SidebarFooter
            mounted={mounted}
            online={bridge.online}
            workbench={workbench}
            chainStatusBadge={chainStatusBadge}
            showChainBadge={
              (chainRunning ||
                chainStatusBadge.tone === "paused" ||
                chainStatusBadge.tone === "idle") &&
              !workbench
            }
          />
        </aside>

        {/* Main */}
        <main className="main-canvas flex min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "min-h-0 flex-1",
              fillHeight
                ? "flex h-full flex-col overflow-hidden"
                : "overflow-y-auto scrollbar-thin",
            )}
          >
            <ErrorBoundary>{children}</ErrorBoundary>
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
    <div className="relative flex flex-col gap-3 border-b border-border bg-surface-elevated px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-4 lg:px-7">
      {/* 底部渐变装饰线 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent opacity-60"
        aria-hidden
      />
      <div className="min-w-0">
        <h1 className="text-[16px] font-semibold tracking-tight text-foreground sm:text-[17px]">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground/80 sm:text-[12.5px]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:max-w-full">{actions}</div>
      )}
    </div>
  );
}
