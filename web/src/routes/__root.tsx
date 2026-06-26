import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { EMPTY_CHAT_SEARCH } from "@/lib/chat-route-search";

import "../styles.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { DesktopHydrationProvider } from "@/hooks/use-desktop-ready";
import { OrchestrationExecutionProvider } from "@/hooks/use-orchestration-execution";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SchedulerNotifications } from "@/components/scheduler-notifications";
import { ChatStateProvider } from "@/contexts/chat-state-context";
import { GlobalChatPanel } from "@/components/global-chat-panel";

const themeBootstrap = `
(function(){try{var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;r.classList.toggle('dark',dark);r.style.colorScheme=dark?'dark':'light';}catch(e){}})();
`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">页面不存在</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          你访问的页面不存在，或已被移动。
        </p>
        <div className="mt-6">
          <Link
            to="/"
            search={EMPTY_CHAT_SEARCH}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Claude Orchestrator" },
      { name: "description", content: "桌面编排、任务链与 Claude Code" },
      { name: "author", content: "Claude Orchestrator" },
      { property: "og:title", content: "Claude Orchestrator" },
      { property: "og:description", content: "桌面编排、任务链与 Claude Code" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Claude Orchestrator" },
      { name: "twitter:description", content: "桌面编排、任务链与 Claude Code" },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.png",
        type: "image/png",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <DesktopHydrationProvider>
        <OrchestrationExecutionProvider>
          <ChatStateProvider>
          <TooltipProvider delayDuration={150}>
            <>
              <Outlet />
              <GlobalChatPanel />
              <SchedulerNotifications />
              <Toaster position="bottom-center" duration={2200} richColors={false} closeButton visibleToasts={1} />
            </>
          </TooltipProvider>
          </ChatStateProvider>
        </OrchestrationExecutionProvider>
      </DesktopHydrationProvider>
    </ThemeProvider>
  );
}
