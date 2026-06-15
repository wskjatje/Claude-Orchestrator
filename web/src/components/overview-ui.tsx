import { InfoHint } from "@/components/info-hint";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

/** 概览页统一区块容器 */
export function OverviewSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 rounded-2xl border border-border bg-surface-elevated shadow-xs",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** 概览页内嵌子面板（无额外外框阴影） */
export function OverviewPanel({
  title,
  description,
  trailing,
  children,
  className,
}: {
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-surface/50", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
        <div>
          <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {trailing}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function OverviewKpiCard({
  label,
  value,
  caption,
  hint,
  icon: Icon,
  iconClassName,
  valueClassName,
  soft,
}: {
  label: string;
  value: string;
  caption?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  valueClassName?: string;
  soft?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 p-4",
        soft ? "bg-primary-soft/15" : "bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <span className="truncate">{label}</span>
          {hint && <InfoHint>{hint}</InfoHint>}
        </div>
        {Icon && <Icon className={cn("h-4 w-4 shrink-0 opacity-60", iconClassName)} />}
      </div>
      <div className={cn("mt-1.5 text-2xl font-semibold tracking-tight text-foreground", valueClassName)}>
        {value}
      </div>
      {caption && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{caption}</p>}
    </div>
  );
}

export function OverviewStatLine({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <p className={cn("text-[11px] text-muted-foreground", className)}>
      {items.filter(Boolean).join(" · ")}
    </p>
  );
}

/** 分段选择器（时间范围、Token/成本等） */
export function OverviewSegmented({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg bg-secondary/80 p-0.5",
        size === "sm" && "rounded-md",
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "font-medium transition",
            size === "sm" ? "rounded-md px-2.5 py-1 text-[11px]" : "rounded-md px-3 py-1.5 text-xs",
            value === opt.id
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function OverviewToolbar({
  children,
  meta,
  onRefresh,
  refreshing,
}: {
  children: React.ReactNode;
  meta?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
        {meta}
        {onRefresh && (
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            {refreshing ? "刷新中" : "刷新"}
          </button>
        )}
      </div>
    </div>
  );
}

export function OverviewEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[5rem] items-center justify-center rounded-lg border border-dashed border-border/80 bg-secondary/20 px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
