import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/ui-copy";

const MARK_SRC = "/logo-mark.png";

type AppLogoProps = {
  className?: string;
  /** full：图标 + 名称；sidebar：侧栏品牌区；mark：仅图标 */
  variant?: "full" | "sidebar" | "mark";
};

function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={MARK_SRC}
      alt=""
      aria-hidden
      className={cn("shrink-0 object-contain", className)}
      draggable={false}
    />
  );
}

/** 项目 logo：与 Electron 应用 icon 同一套 mark（透明底） */
export function AppLogo({ className, variant = "full" }: AppLogoProps) {
  if (variant === "mark") {
    return <LogoMark className={cn("h-8 w-8", className)} />;
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
        <LogoMark className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-semibold tracking-tight text-foreground" translate="no">
            Claude
          </div>
          <div className="truncate text-[11px] font-medium text-muted-foreground" translate="no">
            Orchestrator
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="truncate text-[13px] font-semibold tracking-tight text-foreground" translate="no">
        {APP_NAME}
      </span>
    </div>
  );
}
