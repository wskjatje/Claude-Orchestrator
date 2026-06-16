import { cn } from "@/lib/utils";
import { sidebarConnectionLabel } from "@/lib/sidebar-connection-label";

type ChainBadge = {
  label: string;
  tone: "neutral" | "idle" | "active" | "paused" | "done";
};

export function SidebarFooter({
  mounted,
  online,
  workbench,
  chainStatusBadge,
  showChainBadge,
}: {
  mounted: boolean;
  online: boolean;
  workbench: boolean;
  chainStatusBadge: ChainBadge;
  showChainBadge: boolean;
}) {
  const statusLabel = sidebarConnectionLabel({ mounted, online });
  const connected = mounted && online;

  if (workbench) {
    return (
      <div className="hidden border-t border-sidebar-border/80 px-1 py-2 md:block">
        <div className="flex justify-center" title={online ? "本机服务已连接" : "本机服务未连接"}>
          <span className="relative flex h-2 w-2">
            {online && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60 opacity-60" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                online ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
            />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-sidebar-border/80 bg-sidebar-accent/15 px-3 py-2.5">
      <div className="flex items-center gap-2">
        {showChainBadge ? (
          <div
            className={cn(
              "inline-flex max-w-[58%] shrink-0 items-center rounded-md border px-2 py-1 text-[10.5px] font-medium leading-snug",
              chainStatusBadge.tone === "active" &&
                "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              chainStatusBadge.tone === "idle" &&
                "border-sky-400/40 bg-sky-500/10 text-sky-900 dark:text-sky-300",
              chainStatusBadge.tone === "paused" &&
                "border-amber-400/45 bg-amber-500/12 text-amber-900 dark:text-amber-300",
            )}
            title="切换页签不会中断任务链；可在聊天页停止"
          >
            <span className="truncate">{chainStatusBadge.label}</span>
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-[10.5px] leading-none text-muted-foreground",
            showChainBadge ? "ml-auto shrink-0" : "w-full",
          )}
          translate="no"
        >
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              connected ? "bg-emerald-500" : mounted ? "animate-pulse bg-amber-500" : "bg-muted-foreground/50",
            )}
            aria-hidden
          />
          <span className="truncate whitespace-nowrap">{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}
