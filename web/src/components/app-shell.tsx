import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle, Settings, BookOpen, Menu, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/app-logo";
import { SidebarFooter } from "@/components/sidebar-footer";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { APP_NAME } from "@/lib/ui-copy";
import { useBridge } from "@/hooks/use-bridge";
import { useDesktopReady } from "@/hooks/use-desktop-ready";
import { useOrchestrationExecution } from "@/hooks/use-orchestration-execution";
import { hasDesktop, isWebBridge } from "@/lib/desktop-api";
import { BRIDGE_OFFLINE_BANNER, BRIDGE_OFFLINE_LEGACY } from "@/lib/ui-copy";
import { ErrorBoundary } from "@/components/error-boundary";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

/** 默认侧栏只保留编码主路径；编排/运维入口在设置 → 高级 */
const groups: NavGroup[] = [
  {
    label: "",
    items: [
      { to: "/", label: "聊天", icon: MessageCircle },
      { to: "/settings", label: "应用设置", icon: Settings },
      { to: "/help", label: "帮助", icon: BookOpen },
    ],
  },
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

          <nav
            className={cn(
              "flex-1 overflow-y-auto scrollbar-thin pb-4",
              workbench ? "px-1 pt-0.5 md:px-1.5" : "px-2.5 pt-2.5 sm:px-3",
            )}
            aria-label="主导航"
          >
            {groups.map((group, gi) => (
              <div key={gi} className={cn("mb-3", workbench && "mb-2")}>
                {group.label && !workbench ? (
                  <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                    {group.label}
                  </div>
                ) : null}
                <ul className={cn(workbench ? "space-y-0.5" : "space-y-1")}>
                  {group.items.map((item) => {
                    const active = isActive(item.to);
                    const Icon = item.icon;
                    const link = (
                      <Link
                        to={item.to}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "app-nav-link",
                          workbench && "app-nav-link--rail",
                          active && "app-nav-link--active",
                        )}
                      >
                        <Icon className="app-nav-link__icon" aria-hidden />
                        <span className={cn(workbench && "sr-only md:sr-only")}>{item.label}</span>
                      </Link>
                    );
                    return (
                      <li key={item.to}>
                        {workbench ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8}>
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

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
