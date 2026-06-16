import { U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { e as cn } from "./router-CCRumuR1.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
function OverviewSection({
  id,
  title,
  description,
  action,
  children,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      id,
      className: cn(
        "scroll-mt-20 rounded-2xl border border-border bg-surface-elevated shadow-xs",
        className
      ),
      children: [
        (title || description || action) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            title && /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold tracking-tight text-foreground", children: title }),
            description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs leading-relaxed text-muted-foreground", children: description })
          ] }),
          action
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-5", children })
      ]
    }
  );
}
function OverviewKpiCard({
  label,
  value,
  caption,
  hint,
  icon: Icon,
  iconClassName,
  valueClassName,
  soft
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "rounded-xl border border-border/70 p-4",
        soft ? "bg-primary-soft/15" : "bg-surface"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: label }),
            hint && /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { children: hint })
          ] }),
          Icon && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: cn("h-4 w-4 shrink-0 opacity-60", iconClassName) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("mt-1.5 text-2xl font-semibold tracking-tight text-foreground", valueClassName), children: value }),
        caption && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground", children: caption })
      ]
    }
  );
}
function OverviewStatLine({
  items,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("text-[11px] text-muted-foreground", className), children: items.filter(Boolean).join(" · ") });
}
function OverviewSegmented({
  value,
  options,
  onChange,
  size = "md"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "inline-flex rounded-lg bg-secondary/80 p-0.5",
        size === "sm" && "rounded-md"
      ),
      children: options.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onChange(opt.id),
          className: cn(
            "font-medium transition",
            size === "sm" ? "rounded-md px-2.5 py-1 text-[11px]" : "rounded-md px-3 py-1.5 text-xs",
            value === opt.id ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          ),
          children: opt.label
        },
        opt.id
      ))
    }
  );
}
function OverviewToolbar({
  children,
  meta,
  onRefresh,
  refreshing
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-2", children }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3 sm:ml-auto", children: [
      meta,
      onRefresh && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: refreshing,
          onClick: onRefresh,
          className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-50",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", refreshing && "animate-spin") }),
            refreshing ? "刷新中" : "刷新"
          ]
        }
      )
    ] })
  ] });
}
export {
  OverviewSection as O,
  OverviewKpiCard as a,
  OverviewStatLine as b,
  OverviewToolbar as c,
  OverviewSegmented as d
};
