import { U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { e as cn } from "./router-CCRumuR1.js";
function PageRoot({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col", children });
}
function PageBanner({ children, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "shrink-0 border-b border-border bg-surface-elevated/80 px-4 py-2.5 text-[12px] leading-relaxed text-muted-foreground sm:px-5 lg:px-6",
        className
      ),
      children
    }
  );
}
function ListDetailLayout({
  list,
  detail,
  children,
  detailWidth = "360px"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_var(--detail-w)]",
      style: { "--detail-w": detailWidth },
      children: children ?? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        list,
        detail
      ] })
    }
  );
}
function ListPane({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "page-list-pane flex h-full min-h-0 min-w-0 flex-col border-r border-border bg-background", children });
}
function ListToolbar({ children, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface-elevated/60 px-4 py-3 sm:px-5 lg:px-6",
        className
      ),
      children
    }
  );
}
function ListScrollArea({ children, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-4 sm:px-5 lg:px-6", className), children });
}
function ListEmpty({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full rounded-xl border border-dashed border-border py-12 text-center text-[12.5px] text-muted-foreground", children });
}
function ListCard({
  active,
  onClick,
  icon: Icon,
  title,
  badge,
  description,
  trailing,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      className: cn(
        "group flex items-start gap-3 rounded-xl border bg-surface-elevated p-3.5 text-left shadow-xs transition",
        active ? "border-primary/50 ring-2 ring-primary/15" : "border-border hover:border-primary/30"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13.5px] font-semibold text-foreground", children: title }),
            badge ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground", children: badge }) : null
          ] }),
          description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground", children: description }) : null,
          children
        ] }),
        trailing ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 shrink-0", children: trailing }) : null
      ]
    }
  );
}
function ToggleSwitch({
  checked,
  onChange,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      role: "switch",
      "aria-checked": checked,
      onClick: (e) => {
        onClick?.(e);
        onChange?.(!checked);
      },
      className: cn(
        "inline-flex h-4 w-7 cursor-pointer items-center rounded-full transition",
        checked ? "bg-success" : "bg-muted"
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: cn(
            "inline-block h-3 w-3 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-3.5" : "translate-x-0.5"
          )
        }
      )
    }
  );
}
function DetailPane({ children, empty }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "page-detail-pane hidden h-full min-h-0 flex-col overflow-hidden bg-card/60 lg:flex", children: children ?? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 items-center justify-center p-6 text-center text-[12.5px] text-muted-foreground", children: empty ?? "请选择左侧条目" }) });
}
function DetailActions({ children, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex shrink-0 flex-col gap-2 pt-2", className), children });
}
function DetailBody({ children, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 scrollbar-thin", className), children });
}
function ListSearch({
  value,
  onChange,
  placeholder,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      value,
      onChange: (e) => onChange(e.target.value),
      placeholder,
      className: cn(
        "h-8 min-w-[200px] flex-1 rounded-lg border border-border bg-surface px-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
        className
      )
    }
  );
}
function ListStats({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground", children });
}
function SettingsLayout({ nav, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "shrink-0 border-b border-border bg-surface-elevated/60 px-4 sm:px-5 lg:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1", children: nav }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-4 sm:px-5 lg:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children }) })
  ] });
}
function SettingsNavItem({
  active,
  onClick,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      className: cn(
        "relative px-3 py-2.5 text-[13px] font-medium transition",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      ),
      children: [
        children,
        active ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" }) : null
      ]
    }
  );
}
function SinglePaneLayout({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto scrollbar-thin", children });
}
function PageContent({
  children,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("page-content", className), children });
}
function PageSection({
  title,
  hint,
  children,
  className,
  id
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id, className: cn("page-section", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-section-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[13.5px] font-semibold tracking-tight text-foreground", children: title }),
      hint
    ] }),
    children
  ] });
}
export {
  DetailPane as D,
  ListDetailLayout as L,
  PageRoot as P,
  SinglePaneLayout as S,
  ToggleSwitch as T,
  PageContent as a,
  PageSection as b,
  SettingsLayout as c,
  SettingsNavItem as d,
  PageBanner as e,
  DetailBody as f,
  DetailActions as g,
  ListPane as h,
  ListToolbar as i,
  ListSearch as j,
  ListStats as k,
  ListScrollArea as l,
  ListCard as m,
  ListEmpty as n
};
