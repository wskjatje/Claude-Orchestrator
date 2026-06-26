import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 页面根：占满主栏高度，纵向 flex */
export function PageRoot({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}

/** 顶栏下方说明条 */
export function PageBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-border bg-surface-elevated/70 px-4 py-2.5 text-[12px] leading-relaxed text-muted-foreground/85 sm:px-5 lg:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 左列表 + 右详情（占满 PageRoot 剩余高度） */
export function ListDetailLayout({
  list,
  detail,
  children,
  detailWidth = "360px",
}: {
  list?: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
  detailWidth?: string;
}) {
  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_var(--detail-w)]"
      style={{ "--detail-w": detailWidth } as React.CSSProperties}
    >
      {children ?? (
        <>
          {list}
          {detail}
        </>
      )}
    </div>
  );
}

export function ListPane({ children }: { children: ReactNode }) {
  return (
    <div className="page-list-pane flex h-full min-h-0 min-w-0 flex-col border-r border-border bg-background">
      {children}
    </div>
  );
}

export function ListToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface-elevated/50 px-4 py-3 sm:px-5 lg:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListScrollArea({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-4 sm:px-5 lg:px-6", className)}>
      {children}
    </div>
  );
}

export function ListGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2",
        cols === 2 && "md:grid-cols-2",
        cols === 3 && "md:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

export function ListEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-[12.5px] text-muted-foreground">
      {children}
    </div>
  );
}

export function ListCard({
  active,
  onClick,
  icon: Icon,
  title,
  badge,
  description,
  trailing,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  badge?: string;
  description?: string;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 rounded-xl border bg-surface-elevated p-3.5 text-left shadow-xs transition-all duration-200",
        active
          ? "border-primary/50 ring-2 ring-primary/15 shadow-md"
          : "border-border hover:border-primary/25 hover:shadow-sm hover:-translate-y-0.5",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold text-foreground">{title}</span>
          {badge ? (
            <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
      {trailing ? <div className="mt-1 shrink-0">{trailing}</div> : null}
    </button>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  onClick,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        onClick?.(e);
        onChange?.(!checked);
      }}
      className={cn(
        "inline-flex h-4 w-7 cursor-pointer items-center rounded-full transition",
        checked ? "bg-success" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-white shadow transition",
          checked ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </span>
  );
}

export function DetailPane({ children, empty }: { children?: ReactNode; empty?: ReactNode }) {
  return (
    <aside className="page-detail-pane hidden h-full min-h-0 flex-col overflow-hidden bg-card/50 lg:flex">
      {children ?? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-[12.5px] text-muted-foreground">
          {empty ?? "请选择左侧条目"}
        </div>
      )}
    </aside>
  );
}

export function DetailHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold tracking-tight text-foreground">{title}</div>
        {subtitle ? <div className="truncate font-mono text-[11px] text-muted-foreground">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export function DetailRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12.5px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 text-right text-foreground", valueClass)}>{value}</span>
    </div>
  );
}

export function DetailActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex shrink-0 flex-col gap-2 pt-2", className)}>{children}</div>;
}

export function DetailBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 scrollbar-thin", className)}>
      {children}
    </div>
  );
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-lg bg-secondary p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all duration-150",
            value === opt ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground/80 hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function ListSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-8 min-w-[200px] flex-1 rounded-lg border border-border bg-surface px-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
    />
  );
}

export function ListStats({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
      {children}
    </div>
  );
}

/** 设置页：顶栏页签 + 下方内容 */
export function SettingsLayout({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="shrink-0 border-b border-border bg-surface-elevated/60 px-4 sm:px-5 lg:px-6">
        <div className="flex gap-1">{nav}</div>
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-4 sm:px-5 lg:px-6">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function SettingsNavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
        active ? "text-primary" : "text-muted-foreground/80 hover:text-foreground",
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary shadow-sm shadow-primary/40" />
      ) : null}
    </button>
  );
}

/** 全宽单栏滚动页（帮助、钩子等） */
export function SinglePaneLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</div>;
}

export function PageContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("page-content", className)}>{children}</div>;
}

export function PageSection({
  title,
  hint,
  children,
  className,
  id,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("page-section", className)}>
      <div className="page-section-header">
        <h3 className="text-[13.5px] font-semibold tracking-tight text-foreground">{title}</h3>
        {hint}
      </div>
      {children}
    </section>
  );
}

export function PageNotice({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "warning" | "info";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "page-notice",
        tone === "warning" && "border-warning/30 bg-warning/10 text-warning",
        tone === "info" && "border-primary/25 bg-primary-soft/30 text-foreground",
        tone === "muted" && "border-border bg-secondary/40 text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
