import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useMcpHealthSummary } from "@/lib/use-mcp-health-summary";

type OrchMode = "claude-code" | "local-mcp";

/**
 * Composer 扩展区：MCP **服务器**健康快照（非本轮工具列表）。
 * 本轮工具轨迹在对话气泡内。
 */
export function ComposerOrchHint({
  orchMode,
  className,
}: {
  orchMode: OrchMode;
  className?: string;
}) {
  const { summary } = useMcpHealthSummary(true);
  const isLocal = orchMode === "local-mcp";

  const mcpWarn = summary.ready && summary.total > 0 && summary.okCount < summary.total;
  const mcpDead = summary.ready && summary.total > 0 && summary.okCount === 0;
  const mcpLabel =
    !summary.ready || summary.total === 0 ? "MCP" : `${summary.okCount}/${summary.total}`;
  const mcpTitle = [
    "MCP 服务器健康（非本轮工具）",
    isLocal ? "编排：本地 MCP" : null,
    !summary.ready || summary.total === 0
      ? "未探测到服务器 · 打开通讯页配置"
      : `就绪 ${summary.okCount}/${summary.total}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("composer-orch-hint inline-flex shrink-0 items-center gap-0.5", className)}>
      {isLocal ? (
        <span className="composer-chrome-chip" title="本地 MCP 编排路径">
          本地
        </span>
      ) : null}
      <Link
        to="/comms"
        className={cn(
          "composer-chrome-chip",
          mcpWarn && "composer-chrome-chip--warn",
          mcpDead && "text-destructive",
        )}
        title={mcpTitle}
      >
        {mcpLabel}
      </Link>
    </div>
  );
}
