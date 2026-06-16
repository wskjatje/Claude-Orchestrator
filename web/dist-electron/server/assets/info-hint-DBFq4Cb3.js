import { U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { ar as Tooltip, as as TooltipTrigger, e as cn, at as TooltipContent } from "./router-CCRumuR1.js";
import { c as createLucideIcon } from "./app-shell-DfKeMRG5.js";
const __iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 16v-4", key: "1dtifu" }],
  ["path", { d: "M12 8h.01", key: "e9boi3" }]
];
const Info = createLucideIcon("info", __iconNode);
function InfoHint({
  children,
  className,
  side = "top"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-label": "说明",
        className: cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition hover:bg-secondary hover:text-foreground",
          className
        ),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "h-3.5 w-3.5" })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side, className: "max-w-xs bg-foreground text-background text-[11.5px] leading-relaxed", children })
  ] });
}
export {
  InfoHint as I,
  Info as a
};
