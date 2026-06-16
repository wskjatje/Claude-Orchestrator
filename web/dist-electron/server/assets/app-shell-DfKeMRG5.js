import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { aF as useTheme, e as cn, b7 as APP_NAME, q as hasDesktop, i as isWebBridge, u as useDesktopReady, b8 as BRIDGE_ELECTRON_VERSION, y as loadUiPrefsFromProjectDb, z as saveUiPrefsToProjectDb, A as pingWebBridgeHealth, b9 as BRIDGE_CONNECTED_VERSION, ba as BRIDGE_OFFLINE_VERSION, bb as useLocation, aa as useOrchestrationExecution, w as BRIDGE_OFFLINE_BANNER, bc as BRIDGE_OFFLINE_LEGACY, x as Link } from "./router-CCRumuR1.js";
const mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);
const toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
const hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};
const Icon = reactExports.forwardRef(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => reactExports.createElement(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size,
      height: size,
      stroke: color,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => reactExports.createElement(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);
const createLucideIcon = (iconName, iconNode) => {
  const Component = reactExports.forwardRef(
    ({ className, ...props }, ref) => reactExports.createElement(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};
const __iconNode$h = [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
];
const BookOpen = createLucideIcon("book-open", __iconNode$h);
const __iconNode$g = [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
];
const Bot = createLucideIcon("bot", __iconNode$g);
const __iconNode$f = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 6v6l4 2", key: "mmk7yg" }]
];
const Clock = createLucideIcon("clock", __iconNode$f);
const __iconNode$e = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
];
const FileText = createLucideIcon("file-text", __iconNode$e);
const __iconNode$d = [
  [
    "path",
    {
      d: "M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",
      key: "hod4my"
    }
  ],
  [
    "path",
    {
      d: "M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",
      key: "w4yl2u"
    }
  ],
  ["path", { d: "M3 5a2 2 0 0 0 2 2h3", key: "f2jnh7" }],
  ["path", { d: "M3 3v13a2 2 0 0 0 2 2h3", key: "k8epm1" }]
];
const FolderTree = createLucideIcon("folder-tree", __iconNode$d);
const __iconNode$c = [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
];
const LayoutDashboard = createLucideIcon("layout-dashboard", __iconNode$c);
const __iconNode$b = [
  ["path", { d: "M4 5h16", key: "1tepv9" }],
  ["path", { d: "M4 12h16", key: "1lakjw" }],
  ["path", { d: "M4 19h16", key: "1djgab" }]
];
const Menu = createLucideIcon("menu", __iconNode$b);
const __iconNode$a = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",
      key: "1sd12s"
    }
  ]
];
const MessageCircle = createLucideIcon("message-circle", __iconNode$a);
const __iconNode$9 = [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
];
const Monitor = createLucideIcon("monitor", __iconNode$9);
const __iconNode$8 = [
  [
    "path",
    {
      d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
      key: "kfwtm"
    }
  ]
];
const Moon = createLucideIcon("moon", __iconNode$8);
const __iconNode$7 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }],
  ["path", { d: "m16 15-3-3 3-3", key: "14y99z" }]
];
const PanelLeftClose = createLucideIcon("panel-left-close", __iconNode$7);
const __iconNode$6 = [
  ["path", { d: "M15 12h-5", key: "r7krc0" }],
  ["path", { d: "M15 8h-5", key: "1khuty" }],
  ["path", { d: "M19 17V5a2 2 0 0 0-2-2H4", key: "zz82l3" }],
  [
    "path",
    {
      d: "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",
      key: "1ph1d7"
    }
  ]
];
const ScrollText = createLucideIcon("scroll-text", __iconNode$6);
const __iconNode$5 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode$5);
const __iconNode$4 = [
  ["rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2", key: "ngkwjq" }],
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2", key: "iecqi9" }],
  ["line", { x1: "6", x2: "6.01", y1: "6", y2: "6", key: "16zg32" }],
  ["line", { x1: "6", x2: "6.01", y1: "18", y2: "18", key: "nzw8ys" }]
];
const Server = createLucideIcon("server", __iconNode$4);
const __iconNode$3 = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      key: "1i5ecw"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Settings = createLucideIcon("settings", __iconNode$3);
const __iconNode$2 = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
      key: "1s2grr"
    }
  ],
  ["path", { d: "M20 2v4", key: "1rf3ol" }],
  ["path", { d: "M22 4h-4", key: "gwowj6" }],
  ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }]
];
const Sparkles = createLucideIcon("sparkles", __iconNode$2);
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "4", key: "4exip2" }],
  ["path", { d: "M12 2v2", key: "tus03m" }],
  ["path", { d: "M12 20v2", key: "1lh1kg" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "149t6j" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "ptbguv" }],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "1m8zz5" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "1shlcs" }]
];
const Sun = createLucideIcon("sun", __iconNode$1);
const __iconNode = [
  ["rect", { width: "8", height: "8", x: "3", y: "3", rx: "2", key: "by2w9f" }],
  ["path", { d: "M7 11v4a2 2 0 0 0 2 2h4", key: "xkn7yn" }],
  ["rect", { width: "8", height: "8", x: "13", y: "13", rx: "2", key: "1cgmvn" }]
];
const Workflow = createLucideIcon("workflow", __iconNode);
const opts = [
  { value: "light", icon: Sun, label: "浅色" },
  { value: "system", icon: Monitor, label: "跟随系统" },
  { value: "dark", icon: Moon, label: "深色" }
];
function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5", children: opts.map((o) => {
    const Icon2 = o.icon;
    const active = o.value === mode;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => setMode(o.value),
        title: o.label,
        "aria-label": o.label,
        className: cn(
          "flex h-6 w-6 items-center justify-center rounded-full transition",
          active ? "bg-primary-soft text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
        ),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "h-3 w-3" })
      },
      o.value
    );
  }) });
}
const MARK_SRC = "/logo-mark.png";
function LogoMark({ className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "img",
    {
      src: MARK_SRC,
      alt: "",
      "aria-hidden": true,
      className: cn("shrink-0 object-contain", className),
      draggable: false
    }
  );
}
function AppLogo({ className, variant = "full" }) {
  if (variant === "mark") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoMark, { className: cn("h-8 w-8", className) });
  }
  if (variant === "sidebar") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex min-w-0 items-center gap-2.5", className), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LogoMark, { className: "h-9 w-9 shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1 leading-tight", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[13px] font-semibold tracking-tight text-foreground", translate: "no", children: "Claude" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[11px] font-medium text-muted-foreground", translate: "no", children: "Orchestrator" })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex min-w-0 items-center gap-2", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(LogoMark, { className: "h-8 w-8 shrink-0" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] font-semibold tracking-tight text-foreground", translate: "no", children: APP_NAME })
  ] });
}
function sidebarConnectionLabel(opts2) {
  if (!opts2.mounted) return "正在连接…";
  if (!opts2.online) {
    return hasDesktop() ? "桌面服务未就绪" : "本机服务未连接";
  }
  if (hasDesktop()) return "桌面版 · 已连接";
  if (isWebBridge()) return "本机服务已连接";
  return "CLI 桥接 · 已连接";
}
function SidebarFooter({
  mounted,
  online,
  workbench,
  chainStatusBadge,
  showChainBadge
}) {
  const statusLabel = sidebarConnectionLabel({ mounted, online });
  const connected = mounted && online;
  if (workbench) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden border-t border-sidebar-border/80 px-1 py-2 md:block", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", title: online ? "本机服务已连接" : "本机服务未连接", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "relative flex h-2 w-2", children: [
      online && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60 opacity-60" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: cn(
            "relative inline-flex h-2 w-2 rounded-full",
            online ? "bg-emerald-500" : "bg-muted-foreground/40"
          )
        }
      )
    ] }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 border-t border-sidebar-border/80 bg-sidebar-accent/15 px-3 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
    showChainBadge ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: cn(
          "inline-flex max-w-[58%] shrink-0 items-center rounded-md border px-2 py-1 text-[10.5px] font-medium leading-snug",
          chainStatusBadge.tone === "active" && "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          chainStatusBadge.tone === "idle" && "border-sky-400/40 bg-sky-500/10 text-sky-900 dark:text-sky-300",
          chainStatusBadge.tone === "paused" && "border-amber-400/45 bg-amber-500/12 text-amber-900 dark:text-amber-300"
        ),
        title: "切换页签不会中断任务链；可在聊天页停止",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: chainStatusBadge.label })
      }
    ) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn(
          "flex min-w-0 items-center gap-1.5 text-[10.5px] leading-none text-muted-foreground",
          showChainBadge ? "ml-auto shrink-0" : "w-full"
        ),
        translate: "no",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                connected ? "bg-emerald-500" : mounted ? "animate-pulse bg-amber-500" : "bg-muted-foreground/50"
              ),
              "aria-hidden": true
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate whitespace-nowrap", children: statusLabel })
        ]
      }
    )
  ] }) });
}
class BridgeClient {
  ws = null;
  status = "offline";
  listeners = /* @__PURE__ */ new Set();
  statusListeners = /* @__PURE__ */ new Set();
  version;
  url = "ws://127.0.0.1:18789";
  retry = 0;
  retryTimer = null;
  destroyed = false;
  setUrl(url) {
    this.url = url;
    this.disconnect();
    this.connect();
  }
  connect() {
    if (typeof window === "undefined") return;
    if (this.destroyed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.setStatus("offline");
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.retry = 0;
      this.setStatus("online");
    };
    this.ws.onclose = () => {
      this.ws = null;
      this.setStatus("offline");
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
    };
    this.ws.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data);
        if (e.type === "hello") this.version = e.payload.version;
        this.listeners.forEach((l) => l(e));
      } catch {
      }
    };
  }
  send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }
  disconnect() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.ws?.close();
    this.ws = null;
  }
  destroy() {
    this.destroyed = true;
    this.disconnect();
    this.listeners.clear();
    this.statusListeners.clear();
  }
  on(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  onStatus(cb) {
    cb(this.status, this.version);
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }
  getStatus() {
    return this.status;
  }
  getVersion() {
    return this.version;
  }
  setStatus(s) {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s, this.version));
  }
  scheduleReconnect() {
    if (this.destroyed) return;
    if (this.retryTimer) return;
    const delay = Math.min(3e4, 2e3 * 2 ** Math.min(this.retry, 4));
    this.retry++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }
}
let singleton = null;
function getBridge() {
  if (!singleton) singleton = new BridgeClient();
  return singleton;
}
function useBridge() {
  const desktopReady = useDesktopReady();
  const [status, setStatus] = reactExports.useState("offline");
  const [version, setVersion] = reactExports.useState();
  reactExports.useEffect(() => {
    if (typeof window === "undefined" || !desktopReady) return;
    if (isWebBridge()) {
      let cancelled = false;
      const poll = async () => {
        const ok = await pingWebBridgeHealth();
        if (cancelled) return;
        setStatus(ok ? "online" : "offline");
        setVersion(ok ? BRIDGE_CONNECTED_VERSION : BRIDGE_OFFLINE_VERSION);
      };
      void poll();
      const id = window.setInterval(poll, 4e3);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }
    if (hasDesktop()) {
      setStatus("online");
      setVersion(BRIDGE_ELECTRON_VERSION);
      return;
    }
    const b = getBridge();
    void (async () => {
      const prefs = await loadUiPrefsFromProjectDb();
      if (prefs.bridgeUrl) b.setUrl(prefs.bridgeUrl);
      else b.connect();
    })();
    const off = b.onStatus((s, v) => {
      setStatus(s);
      setVersion(v);
    });
    return () => {
      off();
    };
  }, [desktopReady]);
  return {
    status,
    online: status === "online",
    connecting: status === "connecting",
    version,
    setUrl(url) {
      void saveUiPrefsToProjectDb({ bridgeUrl: url });
      getBridge().setUrl(url);
    },
    send(payload) {
      return getBridge().send(payload);
    }
  };
}
const groups = [
  {
    label: "工作区",
    items: [
      { to: "/", label: "聊天", icon: MessageCircle },
      { to: "/workspaces", label: "工作目录", icon: FolderTree }
    ]
  },
  {
    label: "运行",
    items: [
      { to: "/overview", label: "概览", icon: LayoutDashboard },
      { to: "/scheduled", label: "定时任务", icon: Clock },
      { to: "/logs", label: "日志", icon: ScrollText },
      { to: "/reports", label: "智能体执行日报", icon: FileText }
    ]
  },
  {
    label: "编排",
    items: [
      { to: "/agents", label: "Agent", icon: Bot },
      { to: "/skills", label: "Skill", icon: Sparkles },
      { to: "/chains", label: "任务链", icon: Workflow }
    ]
  },
  {
    label: "集成",
    items: [{ to: "/comms", label: "MCP 服务器", icon: Server }]
  },
  {
    label: "系统",
    items: [
      { to: "/settings", label: "应用设置", icon: Settings },
      { to: "/help", label: "帮助与链接", icon: BookOpen }
    ]
  }
];
function AppShell({
  children,
  variant = "default"
}) {
  const location = useLocation();
  const bridge = useBridge();
  const mounted = useDesktopReady();
  const { chainStatusBadge, chainRunning, syncExecutionState } = useOrchestrationExecution();
  const [mobileNavOpen, setMobileNavOpen] = reactExports.useState(false);
  const workbench = variant === "workbench";
  const fillHeight = variant === "workbench" || variant === "fill";
  const isActive = (to) => to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  reactExports.useEffect(() => {
    setMobileNavOpen(false);
    void syncExecutionState();
  }, [location.pathname, location.search, syncExecutionState]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass relative z-50 flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-elevated/80 px-2 backdrop-blur-md sm:px-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            className: "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition hover:bg-secondary hover:text-foreground md:hidden",
            "aria-expanded": mobileNavOpen,
            "aria-controls": "app-sidebar-nav",
            onClick: () => setMobileNavOpen((v) => !v),
            children: [
              mobileNavOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeftClose, { className: "h-4 w-4", "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { className: "h-4 w-4", "aria-hidden": true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: mobileNavOpen ? "关闭导航" : "打开导航" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AppLogo, { variant: "mark", className: "shrink-0 sm:hidden" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AppLogo, { variant: "mark", className: "hidden shrink-0 sm:block md:hidden" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden truncate text-[11.5px] font-semibold tracking-tight text-foreground/90 md:inline sm:text-[12px]", translate: "no", children: APP_NAME })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1.5 sm:gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            className: "group hidden min-h-9 items-center gap-2 rounded-md border border-border bg-surface/70 px-2 text-[11.5px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground sm:inline-flex lg:min-w-[220px]",
            title: "全局搜索 (⌘K)",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-3 w-3 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden truncate lg:inline", children: "搜索会话、技能、命令…" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "ml-auto hidden rounded border border-border bg-background px-1 font-mono text-[10px] text-muted-foreground xl:inline", children: "⌘K" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface/70 text-muted-foreground transition hover:border-primary/40 hover:text-foreground sm:hidden",
            title: "搜索",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-3.5 w-3.5" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {})
      ] })
    ] }),
    mounted && !bridge.online && (isWebBridge() || !hasDesktop()) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { translate: "no", className: "flex h-7 shrink-0 items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 text-[11.5px] text-warning", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-warning" }),
      isWebBridge() ? /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: BRIDGE_OFFLINE_BANNER }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        BRIDGE_OFFLINE_LEGACY,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/overview", className: "ml-1 underline hover:no-underline", children: "查看连接状态" })
      ] })
    ] }),
    mobileNavOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-label": "关闭导航菜单",
        className: "fixed inset-0 top-9 z-[35] bg-black/40 backdrop-blur-[1px] md:hidden",
        onClick: () => setMobileNavOpen(false)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex min-h-0 flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "aside",
        {
          id: "app-sidebar-nav",
          className: cn(
            "flex shrink-0 flex-col border-r border-border bg-sidebar",
            "fixed bottom-0 left-0 top-9 z-40 w-[min(17rem,88vw)] max-w-[280px] shadow-xl transition-transform duration-200 ease-out",
            "md:relative md:top-0 md:z-0 md:h-auto md:max-w-none md:translate-x-0 md:shadow-none md:transition-none",
            workbench ? "md:w-12" : "md:w-60",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          ),
          children: [
            !workbench ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-sidebar-border/70 px-3 py-2.5 sm:px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AppLogo, { variant: "sidebar" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden h-2 shrink-0 md:block", "aria-hidden": true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "nav",
              {
                className: cn(
                  "flex-1 overflow-y-auto scrollbar-thin pb-4",
                  workbench ? "px-1 md:px-1.5" : "px-3"
                ),
                children: groups.map((group, gi) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("mb-3", workbench && "mb-2"), children: [
                  group.label && !workbench ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70", children: group.label }) : null,
                  /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-0.5", children: group.items.map((item) => {
                    const active = isActive(item.to);
                    const Icon2 = item.icon;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Link,
                      {
                        to: item.to,
                        onClick: () => setMobileNavOpen(false),
                        title: item.label,
                        className: cn(
                          "group flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150",
                          workbench ? "justify-center px-0 py-2 md:px-0 md:py-2" : "gap-2.5 px-2.5 py-1.5",
                          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                        ),
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Icon2,
                            {
                              className: cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                workbench && "h-[18px] w-[18px]",
                                active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground/70"
                              )
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(workbench && "sr-only md:sr-only"), children: item.label })
                        ]
                      }
                    ) }, item.to);
                  }) })
                ] }, gi))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              SidebarFooter,
              {
                mounted,
                online: bridge.online,
                workbench,
                chainStatusBadge,
                showChainBadge: (chainRunning || chainStatusBadge.tone === "paused" || chainStatusBadge.tone === "idle") && !workbench
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "main-canvas flex min-w-0 flex-1 flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: cn(
            "min-h-0 flex-1",
            fillHeight ? "flex h-full flex-col overflow-hidden" : "overflow-y-auto scrollbar-thin"
          ),
          children
        }
      ) })
    ] })
  ] });
}
function PageHeader({
  title,
  description,
  actions
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 border-b border-border bg-surface-elevated px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-4 lg:px-7", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-[16px] font-semibold tracking-tight text-foreground sm:text-[17px]", children: title }),
      description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[12px] leading-snug text-muted-foreground sm:text-[12.5px]", children: description })
    ] }),
    actions && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex shrink-0 flex-wrap items-center gap-2 [&>*]:max-w-full", children: actions })
  ] });
}
export {
  AppShell as A,
  Bot as B,
  Clock as C,
  FolderTree as F,
  MessageCircle as M,
  PageHeader as P,
  Search as S,
  Workflow as W,
  Sparkles as a,
  Settings as b,
  createLucideIcon as c,
  FileText as d,
  Server as e,
  BookOpen as f,
  PanelLeftClose as g,
  useBridge as u
};
