import { DESKTOP_HYDRATING } from "@/lib/ui-copy";
import { useDesktopGate } from "@/hooks/use-desktop-ready";
import { cn } from "@/lib/utils";

/**
 * 桌面桥接门控条：hydrating / offline 分开展示（对齐 Cursor「连接中」≠「已断开」）。
 * 就绪时不渲染。
 */
export function DesktopGateBanner({
  offlineCopy,
  className,
}: {
  offlineCopy: string;
  className?: string;
}) {
  const { phase } = useDesktopGate();
  if (phase === "ready") return null;
  const text = phase === "hydrating" ? DESKTOP_HYDRATING : offlineCopy;
  const offline = phase === "offline";
  return (
    <div
      className={cn(
        "border-b px-4 py-2 text-[12px] sm:px-6",
        offline
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-border bg-secondary/40 text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}
