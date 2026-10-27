/** 占用明细托盘：对齐 Cursor「点环看明细」。
 * 分项只用已有/实测字段；规则·MCP 仅在本轮有注入或 mcp__ 工具输出时展示。
 */
import { CONTEXT_USAGE_CHIP_MIN_PERCENT } from "../../../shared/context-budget.mjs";
import type { ContextUsageSnapshot } from "@/lib/context-usage";
import { cn } from "@/lib/utils";

export type ComposerContextUsageBreakdownProps = {
  usage: ContextUsageSnapshot;
  canStepLocalWindow?: boolean;
  onStepLocalWindow?: () => void;
};

function pctLabel(percent: number): string {
  return percent < CONTEXT_USAGE_CHIP_MIN_PERCENT
    ? `<${CONTEXT_USAGE_CHIP_MIN_PERCENT}`
    : String(percent);
}

function Row({
  label,
  value,
  share,
}: {
  label: string;
  value: string;
  share?: number;
}) {
  const w = typeof share === "number" ? Math.min(100, Math.max(0, share)) : null;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between gap-2 text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{value}</span>
      </div>
      {w != null ? (
        <div className="composer-context-usage-meter composer-context-usage-meter--row">
          <div className="composer-context-usage-meter__fill" style={{ width: `${w}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function ComposerContextUsageBreakdown({
  usage,
  canStepLocalWindow = false,
  onStepLocalWindow,
}: ComposerContextUsageBreakdownProps) {
  const fill = Math.min(100, Math.max(0, usage.percent));
  const approx =
    usage.source === "estimate" || usage.windowSource === "fallback";
  const kind = usage.windowKind === "local" ? "本窗" : "云窗";
  const remain = Math.max(0, usage.windowTokens - usage.tokens);
  const denom = Math.max(1, usage.windowTokens);
  const promptShare =
    usage.lastPromptTokens != null
      ? Math.min(100, Math.round((usage.lastPromptTokens / denom) * 100))
      : null;
  const completionShare =
    usage.lastCompletionTokens != null
      ? Math.min(100, Math.round((usage.lastCompletionTokens / denom) * 100))
      : null;
  const estimateShare = Math.min(
    100,
    Math.round((usage.estimatedTokens / denom) * 100),
  );
  const rulesTok = usage.parts?.rulesEstTokens;
  const mcpTok = usage.parts?.mcpEstTokens;
  const mcpCalls = usage.parts?.mcpCallCount;
  const rulesShare =
    typeof rulesTok === "number"
      ? Math.min(100, Math.round((rulesTok / denom) * 100))
      : null;
  const mcpShare =
    typeof mcpTok === "number"
      ? Math.min(100, Math.round((mcpTok / denom) * 100))
      : null;

  return (
    <div
      className="space-y-2.5 text-[12px] leading-relaxed"
      data-testid="composer-context-usage-breakdown"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-foreground">
          {kind}
          {approx ? "约 " : " "}
          {pctLabel(usage.percent)}%
        </p>
        <p className="tabular-nums text-muted-foreground">
          窗 {Math.round(usage.windowTokens / 1024)}k
        </p>
      </div>

      <div
        className="composer-context-usage-meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fill}
        aria-label={`上下文占用 ${pctLabel(usage.percent)}%`}
      >
        <div
          className={cn(
            "composer-context-usage-meter__fill",
            usage.suggestSummarize && "composer-context-usage-meter__fill--warn",
          )}
          style={{ width: `${fill}%` }}
        />
      </div>

      <div className="space-y-1.5" data-testid="composer-context-usage-buckets">
        {/* 有接口用量时不以「字符粗估」抢首位（实测云回合粗估≪接口，易误解） */}
        {usage.source === "estimate" ? (
          <Row
            label="字符粗估"
            value={usage.estimatedTokens.toLocaleString()}
            share={estimateShare}
          />
        ) : null}
        {typeof rulesTok === "number" && rulesTok > 0 ? (
          <Row
            label="规则·注入"
            value={rulesTok.toLocaleString()}
            share={rulesShare ?? undefined}
          />
        ) : null}
        {typeof mcpCalls === "number" && mcpCalls > 0 ? (
          <Row label="MCP·调用" value={String(mcpCalls)} />
        ) : null}
        {typeof mcpTok === "number" && mcpTok > 0 ? (
          <Row
            label="MCP·工具输出"
            value={mcpTok.toLocaleString()}
            share={mcpShare ?? undefined}
          />
        ) : null}
        {usage.lastPromptTokens != null ? (
          <Row
            label="最近输入"
            value={usage.lastPromptTokens.toLocaleString()}
            share={promptShare ?? undefined}
          />
        ) : null}
        {usage.lastCompletionTokens != null ? (
          <Row
            label="最近输出"
            value={usage.lastCompletionTokens.toLocaleString()}
            share={completionShare ?? undefined}
          />
        ) : null}
        <Row label="计入占用" value={usage.tokens.toLocaleString()} />
        <Row label="窗口上限" value={usage.windowTokens.toLocaleString()} />
        <Row label="剩余约" value={remain.toLocaleString()} />
        <Row
          label="计量"
          value={`${usage.source === "usage" ? "接口用量" : "字符粗估"}${
            usage.windowSource === "fallback" ? " · 估算窗口" : ""
          }`}
        />
        {/* 接口计量时仅作对照，无占比条，避免与计入占用打架 */}
        {usage.source === "usage" && usage.estimatedTokens > 0 ? (
          <Row
            label="正文粗估·对照"
            value={usage.estimatedTokens.toLocaleString()}
          />
        ) : null}
        <Row label="建议压缩" value={`≥${usage.compactAtPercent}%`} />
      </div>

      {usage.suggestSummarize ? (
        <p className="text-amber-700 dark:text-amber-300">建议 /summarize</p>
      ) : null}

      {canStepLocalWindow && onStepLocalWindow ? (
        <button
          type="button"
          className="rounded-md px-2 py-1 text-[12px] text-foreground hover:bg-secondary"
          data-testid="composer-context-window-step"
          onClick={onStepLocalWindow}
        >
          下一档本窗覆盖
        </button>
      ) : null}
    </div>
  );
}
