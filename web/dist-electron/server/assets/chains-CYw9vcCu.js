import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { c as createLucideIcon, A as AppShell, P as PageHeader, S as Search, W as Workflow, a as Sparkles } from "./app-shell-DfKeMRG5.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { e as cn, g as getDesktop, x as Link, a9 as Route, b as useHasDesktop, aa as useOrchestrationExecution, ab as CHAIN_TEMPLATE_DEFAULTS, t as toast, ac as syncOfficialGenericChains, ad as CHAIN_TEMPLATES, P as PAGE_DESC, ae as CHAINS_INFO_HINT, w as BRIDGE_OFFLINE_BANNER, af as CHAIN_TEMPLATE_CATEGORY_LABEL, ag as resolveChainStepSkills, ah as applyChainTemplate, B as BRIDGE_OFFLINE_TOAST, ai as skillsUnionFromSteps, aj as CHAIN_TEMPLATE_VAR_LABELS, ak as suggestedSkillStemsForAgent } from "./router-CCRumuR1.js";
import { P as Popover, a as PopoverAnchor, b as PopoverContent } from "./popover-Bdhu7TZA.js";
import { a as agentDisplayNameForStem, f as filterAgentsByQuery, r as resolveAgentStemFromInput, u as useClaudeAgentList } from "./use-claude-agent-list-BLoLp5zy.js";
import { X } from "./x-CgW_RKjX.js";
import { C as ChevronDown } from "./chevron-down-oOVv_n18.js";
import { C as Check } from "./check-CBqelC41.js";
import { E as ExternalLink } from "./external-link-BWfpy5Z8.js";
import { u as useClaudeSkillList, s as skillDisplayNameForStem } from "./use-claude-skill-list-g7LjvOE7.js";
import { P as Plus } from "./plus-CUtIIuQz.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
import { P as Power } from "./power-DJyGZDzR.js";
import { P as Play } from "./play-Dke1oMkU.js";
import { S as Save } from "./save-s2gnsGqd.js";
import { T as Trash2 } from "./trash-2-BpzVwa3Q.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./Combination-C5HQNJJD.js";
import "./agent-display-name-DbLOtgcU.js";
const __iconNode$1 = [
  [
    "path",
    {
      d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
      key: "zw3jo"
    }
  ],
  [
    "path",
    {
      d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
      key: "1wduqc"
    }
  ],
  [
    "path",
    {
      d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
      key: "kqbvx6"
    }
  ]
];
const Layers = createLucideIcon("layers", __iconNode$1);
const __iconNode = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }]
];
const Square = createLucideIcon("square", __iconNode);
function chainCategoryLabel(category) {
  if (category === "single") return "单 Agent";
  if (category === "pipeline") return "流水线";
  return "自定义";
}
function chainCardStatus(chain, opts) {
  const total = chain.stepCount;
  const idx = chain.currentIndex ?? 0;
  const progress = total ? `${Math.min(idx, total)}/${total} 步` : "0 步";
  if (opts.running && opts.activeChainId === chain.id) {
    return { label: `● 执行中（${idx + 1}/${total || "?"})`, tone: "success", progress };
  }
  if (!chain.enabled) {
    return { label: "○ 已停用", tone: "muted", progress };
  }
  if (total > 0 && (chain.status === "completed" || idx >= total)) {
    return { label: "● 已完成", tone: "primary", progress };
  }
  if (idx > 0) {
    return { label: `● 已暂停（${idx}/${total}）`, tone: "warning", progress };
  }
  return { label: "● 待执行", tone: "success", progress };
}
function AgentStemCombobox({
  value,
  agents,
  onChange,
  disabled,
  placeholder = "选择或搜索 Agent",
  className
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  const inputRef = reactExports.useRef(null);
  const skipCommitRef = reactExports.useRef(false);
  const matched = reactExports.useMemo(
    () => agents.find((a) => a.stem === value.trim()),
    [agents, value]
  );
  reactExports.useEffect(() => {
    if (open) return;
    setQuery(agentDisplayNameForStem(value, agents));
  }, [value, agents, open]);
  const filtered = reactExports.useMemo(() => filterAgentsByQuery(agents, query), [agents, query]);
  const commitInput = (text) => {
    onChange(resolveAgentStemFromInput(text, agents));
  };
  const pickAgent = (agent) => {
    onChange(agent.stem);
    setQuery(agent.displayName);
    setOpen(false);
    inputRef.current?.blur();
  };
  const clearAgent = () => {
    skipCommitRef.current = true;
    onChange("");
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };
  const hasValue = Boolean(value.trim());
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Popover,
    {
      open,
      modal: false,
      onOpenChange: (next) => {
        if (disabled) return;
        setOpen(next);
        if (next) {
          setQuery(matched?.displayName ?? value);
        } else if (!skipCommitRef.current) {
          commitInput(query);
        }
        skipCommitRef.current = false;
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverAnchor, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("relative", className), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ref: inputRef,
              value: query,
              disabled,
              placeholder,
              onChange: (e) => {
                setQuery(e.target.value);
                setOpen(true);
              },
              onFocus: () => {
                if (disabled) return;
                setOpen(true);
                setQuery(matched?.displayName ?? value);
              },
              onKeyDown: (e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  return;
                }
                if (e.key === "Enter" && filtered[0]) {
                  e.preventDefault();
                  pickAgent(filtered[0]);
                }
              },
              className: cn(
                "h-8 w-full rounded-md border border-border bg-background py-0 pl-2 text-[12px] outline-none focus:border-primary disabled:opacity-50",
                hasValue ? "pr-12" : "pr-7"
              )
            }
          ),
          hasValue && !disabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              title: "清除已选",
              "aria-label": "清除已选 Agent",
              className: "absolute right-6 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/70 transition hover:bg-secondary hover:text-foreground",
              onMouseDown: (e) => e.preventDefault(),
              onClick: clearAgent,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" })
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PopoverContent,
          {
            align: "start",
            side: "bottom",
            sideOffset: 4,
            collisionPadding: 8,
            className: "w-[var(--radix-popover-trigger-width)] overflow-hidden p-0",
            onOpenAutoFocus: (e) => e.preventDefault(),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[min(16rem,40vh)] overflow-y-auto py-1 scrollbar-thin", children: filtered.length ? filtered.map((agent) => {
              const active = agent.stem === value.trim();
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: cn(
                    "flex w-full items-start gap-2 px-2.5 py-2 text-left text-[12px] transition hover:bg-secondary/80",
                    active && "bg-primary/5"
                  ),
                  onMouseDown: (e) => e.preventDefault(),
                  onClick: () => pickAgent(agent),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-medium", children: agent.displayName }),
                      agent.description ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "line-clamp-2 text-[10.5px] leading-snug text-muted-foreground", children: agent.description }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-mono text-[10px] text-muted-foreground", children: agent.stem })
                    ] }),
                    active ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary", strokeWidth: 2.25 }) : null
                  ]
                },
                `${agent.source}:${agent.stem}`
              );
            }) : agents.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-3 text-center text-[12px] text-muted-foreground", children: "没有找到匹配的 Agent" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-3 text-center text-[12px] text-muted-foreground", children: "本机还没有 Agent 文件，也可手动输入 Agent 英文名" }) })
          }
        )
      ]
    }
  );
}
const MCP_LABELS = {
  filesystem: "文件系统",
  fetch: "网页抓取",
  memory: "记忆",
  sanshengliubu: "三省六部",
  "ollama-local": "Ollama 本地"
};
function mcpDisplayLabel(name) {
  const key = name.trim();
  return MCP_LABELS[key] ?? key;
}
function useClaudeMcpList() {
  const [mcps, setMcps] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const reload = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.readClaudeConfigJson) {
      setMcps([]);
      return;
    }
    setLoading(true);
    const r = await api.readClaudeConfigJson("mcp.json");
    setLoading(false);
    if (!r.ok || r.missing || !r.data) {
      setMcps([]);
      return;
    }
    const ms = r.data.mcpServers;
    if (!ms || typeof ms !== "object") {
      setMcps([]);
      return;
    }
    setMcps(
      Object.entries(ms).map(([name, cfg]) => {
        const c = cfg && typeof cfg === "object" ? cfg : {};
        return {
          name,
          enabled: c.disabled !== true,
          label: mcpDisplayLabel(name)
        };
      })
    );
  }, []);
  reactExports.useEffect(() => {
    void reload();
  }, [reload]);
  return { mcps, loading, reload };
}
function filterMcpsByQuery(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((m) => m.name.toLowerCase().includes(q) || m.label.toLowerCase().includes(q));
}
function chipLabel(name, mcps) {
  const row = mcps.find((m) => m.name === name);
  const label = row?.label ?? name;
  if (label.length <= 14) return label;
  return `${label.slice(0, 13)}…`;
}
function McpNameMultiSelect({
  value,
  mcps,
  onChange,
  disabled,
  placeholder = "关联 MCP（可选）",
  className
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  const inputRef = reactExports.useRef(null);
  const selectedSet = reactExports.useMemo(() => new Set(value), [value]);
  const filtered = reactExports.useMemo(() => filterMcpsByQuery(mcps, query), [mcps, query]);
  const showPlaceholder = value.length === 0 && !query;
  const addName = (name) => {
    const n = name.trim();
    if (!n || selectedSet.has(n)) return;
    onChange([...value, n]);
    setQuery("");
  };
  const removeName = (name) => {
    onChange(value.filter((s) => s !== name));
  };
  const toggleMcp = (row) => {
    if (selectedSet.has(row.name)) {
      removeName(row.name);
    } else {
      addName(row.name);
    }
  };
  const commitInput = (text) => {
    const q = text.trim().toLowerCase();
    if (!q) return;
    const exact = mcps.find((m) => m.name.toLowerCase() === q);
    if (exact) {
      addName(exact.name);
      return;
    }
    const partial = mcps.find((m) => m.name.toLowerCase().includes(q) || m.label.toLowerCase().includes(q));
    if (partial) addName(partial.name);
  };
  const focusInput = () => {
    if (disabled) return;
    inputRef.current?.focus();
    setOpen(true);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("space-y-1", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Popover,
      {
        open,
        modal: false,
        onOpenChange: (next) => {
          if (disabled) return;
          setOpen(next);
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverAnchor, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              role: "combobox",
              "aria-expanded": open,
              onClick: focusInput,
              className: cn(
                "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[12px]",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-text"
              ),
              children: [
                value.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    className: "inline-flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]",
                    children: [
                      chipLabel(name, mcps),
                      !disabled && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          className: "rounded p-0.5 hover:bg-muted",
                          onClick: (e) => {
                            e.stopPropagation();
                            removeName(name);
                          },
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" })
                        }
                      )
                    ]
                  },
                  name
                )),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ref: inputRef,
                    disabled,
                    value: query,
                    onChange: (e) => {
                      setQuery(e.target.value);
                      setOpen(true);
                    },
                    onKeyDown: (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitInput(query);
                      }
                      if (e.key === "Backspace" && !query && value.length) {
                        removeName(value[value.length - 1]);
                      }
                    },
                    onFocus: () => setOpen(true),
                    placeholder: showPlaceholder ? placeholder : "",
                    className: "min-w-[8rem] flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            PopoverContent,
            {
              className: "w-[var(--radix-popover-trigger-width)] p-1",
              align: "start",
              onOpenAutoFocus: (e) => e.preventDefault(),
              children: filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 py-3 text-center text-[11px] text-muted-foreground", children: mcps.length === 0 ? "尚未配置 MCP，请先到 MCP 服务器页添加" : "无匹配项" }) : filtered.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  disabled: !row.enabled,
                  className: cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-secondary",
                    !row.enabled && "opacity-40"
                  ),
                  onClick: () => toggleMcp(row),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Check,
                      {
                        className: cn("h-3.5 w-3.5 shrink-0", selectedSet.has(row.name) ? "opacity-100" : "opacity-0")
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1 truncate", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: row.label }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 font-mono text-[10px] text-muted-foreground", children: row.name })
                    ] }),
                    !row.enabled && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "已禁用" })
                  ]
                },
                row.name
              ))
            }
          )
        ]
      }
    ),
    !disabled && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Link,
      {
        to: "/comms",
        className: "inline-flex items-center gap-1 text-[11px] text-primary hover:underline",
        onClick: () => setOpen(false),
        children: [
          "管理 MCP 服务器",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3 w-3" })
        ]
      }
    )
  ] });
}
const CATEGORY_FILTERS = ["全部", "单 Agent", "流水线", "自定义"];
function chainCategoryIcon(category) {
  if (category === "pipeline") return Layers;
  return Sparkles;
}
function emptyStep() {
  return {
    agentName: "",
    taskId: "",
    instruction: "",
    skills: [],
    mcps: []
  };
}
function validSteps(steps, agents = []) {
  return steps.map((s) => {
    const agentName = s.agentName.trim();
    return {
      agentName,
      taskId: s.taskId.trim(),
      instruction: s.instruction.trim(),
      skills: resolveChainStepSkills(agentName, agents),
      mcps: s.mcps.map((x) => x.trim()).filter(Boolean)
    };
  }).filter((s) => s.agentName && s.instruction);
}
function normalizeSteps(steps, agents = []) {
  if (!Array.isArray(steps)) return [];
  return steps.map((s) => {
    const agentName = String(s.agentName ?? "").trim();
    return {
      agentName,
      taskId: String(s.taskId ?? "").trim(),
      instruction: String(s.instruction ?? "").trim(),
      skills: resolveChainStepSkills(agentName, agents),
      mcps: Array.isArray(s.mcps) ? s.mcps.map((x) => String(x ?? "").trim()).filter(Boolean) : []
    };
  });
}
function filterCategory(chain, cat) {
  if (cat === "全部") return true;
  if (cat === "单 Agent") return chain.category === "single";
  if (cat === "流水线") return chain.category === "pipeline";
  return chain.category === "custom";
}
function filterTemplateCategory(template, cat) {
  if (cat === "全部") return true;
  if (cat === "单 Agent") return template.category === "single";
  if (cat === "流水线") return template.category === "pipeline";
  return false;
}
function matchesQuery(text, qq) {
  return text.toLowerCase().includes(qq);
}
function stepsFromTemplate(template, vars, agents = []) {
  const partial = {};
  for (const key of template.vars) partial[key] = vars[key];
  return applyChainTemplate(template, partial).map((s) => ({
    agentName: s.agentName,
    taskId: s.taskId,
    instruction: s.instruction,
    skills: resolveChainStepSkills(s.agentName, agents),
    mcps: s.mcps ?? []
  }));
}
function isWbsWorkspaceChain(chain) {
  return chain.name.startsWith("WBS ·") || /WBS\s*来源：/i.test(chain.description ?? "");
}
function sortSavedChainsForDisplay(chains, activeId) {
  return [...chains].sort((a, b) => {
    if (activeId) {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
    }
    const aWbs = isWbsWorkspaceChain(a);
    const bWbs = isWbsWorkspaceChain(b);
    if (aWbs !== bWbs) return aWbs ? -1 : 1;
    const at = a.updatedAt ?? a.createdAt ?? "";
    const bt = b.updatedAt ?? b.createdAt ?? "";
    return bt.localeCompare(at);
  });
}
function ChainsPage() {
  const {
    q: urlQ
  } = Route.useSearch();
  const hasDesktopApi = useHasDesktop();
  const {
    agents: agentList
  } = useClaudeAgentList();
  const {
    skills: skillList
  } = useClaudeSkillList();
  const {
    mcps: mcpList
  } = useClaudeMcpList();
  const {
    chainRunning,
    runOrchestrationChain,
    stopChainExecution,
    syncExecutionState
  } = useOrchestrationExecution();
  const [items, setItems] = reactExports.useState([]);
  const [activeChainId, setActiveChainId] = reactExports.useState(null);
  const [listLoading, setListLoading] = reactExports.useState(false);
  const [listErr, setListErr] = reactExports.useState(null);
  const [q, setQ] = reactExports.useState("");
  const [cat, setCat] = reactExports.useState("全部");
  const wbsAutoCatRef = reactExports.useRef(false);
  const [addOpen, setAddOpen] = reactExports.useState(false);
  const [addName, setAddName] = reactExports.useState("");
  const [addDesc, setAddDesc] = reactExports.useState("");
  const [addSteps, setAddSteps] = reactExports.useState([emptyStep()]);
  const [addSubmitting, setAddSubmitting] = reactExports.useState(false);
  const [detailId, setDetailId] = reactExports.useState(null);
  const [detail, setDetail] = reactExports.useState(null);
  const [detailSteps, setDetailSteps] = reactExports.useState([]);
  const [detailDirty, setDetailDirty] = reactExports.useState(false);
  const [detailSaving, setDetailSaving] = reactExports.useState(false);
  const [presetDetailId, setPresetDetailId] = reactExports.useState(null);
  const [presetDetailVars, setPresetDetailVars] = reactExports.useState({
    ...CHAIN_TEMPLATE_DEFAULTS
  });
  const [presetDetailSteps, setPresetDetailSteps] = reactExports.useState([emptyStep()]);
  const [presetStepsDirty, setPresetStepsDirty] = reactExports.useState(false);
  const [presetCreateName, setPresetCreateName] = reactExports.useState("");
  const [presetCreating, setPresetCreating] = reactExports.useState(false);
  const reloadList = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.orchestrationListChains) {
      setItems([]);
      setActiveChainId(null);
      setListErr(null);
      return;
    }
    setListLoading(true);
    setListErr(null);
    const r = await api.orchestrationListChains();
    setListLoading(false);
    if (!r.ok) {
      setListErr(r.error ?? "无法读取任务链列表");
      return;
    }
    setItems(r.items ?? []);
    setActiveChainId(r.activeChainId ?? null);
  }, []);
  const loadDetail = reactExports.useCallback(async (id) => {
    const api = getDesktop();
    if (!api?.orchestrationGetChain) return;
    const r = await api.orchestrationGetChain(id);
    if (!r.ok || !r.chain) {
      toast.error(r.error ?? "无法加载任务链");
      return;
    }
    setDetail(r.chain);
    setDetailSteps(normalizeSteps(r.chain.state?.steps, agentList));
    setDetailDirty(false);
  }, [agentList]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    void syncOfficialGenericChains().then(() => reloadList());
    void syncExecutionState();
  }, [hasDesktopApi, reloadList, syncExecutionState]);
  reactExports.useEffect(() => {
    if (urlQ.trim()) setQ(urlQ.trim());
  }, [urlQ]);
  reactExports.useEffect(() => {
    if (wbsAutoCatRef.current || !hasDesktopApi || items.length === 0) return;
    if (q.trim()) return;
    const hasWbs = items.some(isWbsWorkspaceChain);
    if (hasWbs) {
      wbsAutoCatRef.current = true;
      setCat("自定义");
    }
  }, [hasDesktopApi, items, q]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    const off = api?.onOrchestrationChainStatus?.(() => {
      void reloadList();
      void syncExecutionState();
      if (detailId) void loadDetail(detailId);
    });
    return () => off?.();
  }, [hasDesktopApi, reloadList, syncExecutionState, detailId, loadDetail]);
  reactExports.useEffect(() => {
    if (!detailId) {
      setDetail(null);
      setDetailSteps([]);
      setDetailDirty(false);
      return;
    }
    void loadDetail(detailId);
  }, [detailId, loadDetail]);
  const filteredSaved = reactExports.useMemo(() => {
    const qq = q.trim().toLowerCase();
    const filtered = items.filter((c) => {
      if (!filterCategory(c, cat)) return false;
      if (!qq) return true;
      return matchesQuery(c.name, qq) || matchesQuery(c.description, qq) || matchesQuery(c.id, qq);
    });
    return sortSavedChainsForDisplay(filtered, activeChainId);
  }, [items, cat, q, activeChainId]);
  const wbsWorkspaceChains = reactExports.useMemo(() => filteredSaved.filter(isWbsWorkspaceChain), [filteredSaved]);
  const syncedOfficialTemplateIds = reactExports.useMemo(() => new Set(items.filter((c) => c.official || c.id.startsWith("official-")).map((c) => c.templateId).filter(Boolean)), [items]);
  const filteredPresets = reactExports.useMemo(() => {
    if (cat === "自定义") return [];
    const qq = q.trim().toLowerCase();
    return CHAIN_TEMPLATES.filter((t) => {
      if (syncedOfficialTemplateIds.has(t.id)) return false;
      if (!filterTemplateCategory(t, cat)) return false;
      if (!qq) return true;
      return matchesQuery(t.name, qq) || matchesQuery(t.description, qq) || t.agents.some((a) => matchesQuery(a, qq));
    });
  }, [cat, q, syncedOfficialTemplateIds]);
  const visibleChainCount = reactExports.useMemo(() => {
    const presetCount = CHAIN_TEMPLATES.filter((t) => !syncedOfficialTemplateIds.has(t.id)).length;
    return items.length + presetCount;
  }, [items.length, syncedOfficialTemplateIds]);
  const unifiedList = reactExports.useMemo(() => {
    const presets = filteredPresets.map((t) => ({
      kind: "preset",
      key: `preset:${t.id}`,
      template: t
    }));
    const saved = filteredSaved.map((c) => ({
      kind: "saved",
      key: `saved:${c.id}`,
      chain: c
    }));
    return [...saved, ...presets];
  }, [filteredPresets, filteredSaved]);
  const selectedPreset = reactExports.useMemo(() => CHAIN_TEMPLATES.find((t) => t.id === presetDetailId) ?? null, [presetDetailId]);
  reactExports.useEffect(() => {
    if (!selectedPreset || presetStepsDirty) return;
    setPresetDetailSteps(stepsFromTemplate(selectedPreset, presetDetailVars, agentList));
  }, [selectedPreset, presetDetailVars, presetStepsDirty, agentList]);
  const enabledCount = items.filter((c) => c.enabled).length;
  const runningCount = chainRunning && activeChainId ? 1 : 0;
  const toggleEnabled = async (chain, e) => {
    e?.stopPropagation();
    const api = getDesktop();
    if (!api?.orchestrationToggleChainEnabled) {
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    const r = await api.orchestrationToggleChainEnabled({
      id: chain.id,
      enabled: !chain.enabled
    });
    if (!r.ok) {
      toast.error(r.error ?? "切换失败");
      return;
    }
    await reloadList();
    if (detail?.id === chain.id && r.chain) {
      setDetail(r.chain);
    }
  };
  const openAddModal = () => {
    setAddName("");
    setAddDesc("");
    setAddSteps([emptyStep()]);
    setAddOpen(true);
  };
  const submitAdd = async () => {
    const api = getDesktop();
    if (!api?.orchestrationCreateChain) {
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    const name = addName.trim();
    if (!name) {
      toast.warning("请填写任务链名称");
      return;
    }
    const steps = validSteps(addSteps, agentList);
    if (!steps.length) {
      toast.warning("至少添加一步：选好 Agent，并填写本步要做什么");
      return;
    }
    setAddSubmitting(true);
    const r = await api.orchestrationCreateChain({
      name,
      description: addDesc.trim(),
      category: "custom",
      templateId: null,
      state: {
        status: "idle",
        currentIndex: 0,
        steps
      }
    });
    setAddSubmitting(false);
    if (!r.ok || !r.chain) {
      toast.error(r.error ?? "创建失败");
      return;
    }
    toast.success(`已添加任务链「${name}」`);
    setAddOpen(false);
    setAddName("");
    setAddDesc("");
    setAddSteps([emptyStep()]);
    await reloadList();
    setDetailId(r.chain.id);
  };
  const activatePreset = async (template, name, steps) => {
    const api = getDesktop();
    if (!api?.orchestrationCreateChain) {
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    const chainName = name.trim() || template.name;
    const valid = validSteps(steps, agentList);
    if (!valid.length) {
      toast.warning("至少添加一步：选好 Agent，并填写本步要做什么");
      return;
    }
    setPresetCreating(true);
    const r = await api.orchestrationCreateChain({
      name: chainName,
      description: template.description,
      category: template.category,
      templateId: template.id,
      state: {
        status: "idle",
        currentIndex: 0,
        steps: valid
      }
    });
    setPresetCreating(false);
    if (!r.ok || !r.chain) {
      toast.error(r.error ?? "添加失败");
      return;
    }
    toast.success(`已添加任务链「${chainName}」`);
    setPresetDetailId(null);
    setPresetStepsDirty(false);
    await reloadList();
    setDetailId(r.chain.id);
  };
  const openPresetDetail = (template) => {
    const vars = {
      ...CHAIN_TEMPLATE_DEFAULTS
    };
    setPresetDetailId(template.id);
    setPresetDetailVars(vars);
    setPresetCreateName(template.name);
    setPresetStepsDirty(false);
    setPresetDetailSteps(stepsFromTemplate(template, vars, agentList));
  };
  const regeneratePresetSteps = () => {
    if (!selectedPreset) return;
    setPresetDetailSteps(stepsFromTemplate(selectedPreset, presetDetailVars, agentList));
    setPresetStepsDirty(false);
    toast.info("已按模板信息重新生成步骤");
  };
  const saveDetail = async () => {
    if (!detail) return;
    const api = getDesktop();
    if (!api?.orchestrationUpdateChain) return;
    const steps = validSteps(detailSteps, agentList);
    if (!steps.length) {
      toast.warning("至少保留一步，并填好 Agent 与本步任务");
      return;
    }
    setDetailSaving(true);
    const r = await api.orchestrationUpdateChain({
      id: detail.id,
      name: detail.name,
      description: detail.description,
      state: {
        status: "idle",
        currentIndex: 0,
        steps
      }
    });
    setDetailSaving(false);
    if (!r.ok) {
      toast.error(r.error ?? "保存失败");
      return;
    }
    toast.success("已保存");
    setDetailDirty(false);
    if (r.chain) setDetail(r.chain);
    await reloadList();
  };
  const runDetail = async () => {
    if (!detail) return;
    const api = getDesktop();
    if (!api?.orchestrationActivateChain || !api.orchestrationStartChainRun) {
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    if (!detail.enabled) {
      toast.warning("请先启用该任务链");
      return;
    }
    if (detailDirty) {
      toast.warning("请先保存修改");
      return;
    }
    if (chainRunning && activeChainId !== detail.id) {
      toast.warning("另有任务链正在执行，请先停止");
      return;
    }
    const act = await api.orchestrationActivateChain(detail.id);
    if (!act.ok) {
      toast.error(act.error ?? "无法激活任务链");
      return;
    }
    await runOrchestrationChain();
    setActiveChainId(detail.id);
    await reloadList();
  };
  const deleteDetail = async () => {
    if (!detail) return;
    if (chainRunning && activeChainId === detail.id) {
      toast.warning("请先停止执行");
      return;
    }
    const api = getDesktop();
    if (!api?.orchestrationDeleteChain) return;
    if (!window.confirm(`确定删除任务链「${detail.name}」？`)) return;
    const r = await api.orchestrationDeleteChain(detail.id);
    if (!r.ok) {
      toast.error(r.error ?? "删除失败");
      return;
    }
    toast.success("已删除");
    setDetailId(null);
    await reloadList();
  };
  const resetDetailProgress = async () => {
    if (!detail) return;
    const api = getDesktop();
    if (!api?.orchestrationUpdateChain) return;
    const steps = normalizeSteps(detail.state?.steps, agentList);
    const r = await api.orchestrationUpdateChain({
      id: detail.id,
      state: {
        status: "idle",
        currentIndex: 0,
        steps
      }
    });
    if (r.ok) {
      toast.info("已重置进度");
      if (r.chain) setDetail(r.chain);
      await reloadList();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "任务链", description: PAGE_DESC.chains, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: openAddModal, disabled: !hasDesktopApi, className: "btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
        " 添加任务链"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void reloadList(), disabled: listLoading || !hasDesktopApi, className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium hover:bg-secondary disabled:opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", listLoading && "animate-spin") }),
        " 刷新"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { side: "left", children: CHAINS_INFO_HINT })
    ] }) }),
    !hasDesktopApi && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-warning/30 bg-warning/10 px-4 py-2 text-[12px] text-warning", children: BRIDGE_OFFLINE_BANNER }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-5 sm:px-6 lg:px-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 grid grid-cols-2 gap-3 md:grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "任务链", value: visibleChainCount }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "已启用", value: enabledCount, valueClass: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "执行中", value: runningCount, valueClass: runningCount ? "text-success" : void 0 })
      ] }),
      listErr ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-[12px] text-destructive", children: listErr }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-[220px] max-w-md flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "搜索任务链…", className: "h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5", children: CATEGORY_FILTERS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setCat(c), className: cn("rounded-md px-2.5 py-1 text-[11.5px] font-medium transition", cat === c ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"), children: c }, c)) })
      ] }),
      wbsWorkspaceChains.length > 0 && !q.trim() ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 rounded-lg border border-sky-400/35 bg-sky-500/8 px-3 py-2 text-[12px] leading-relaxed text-sky-950 dark:text-sky-100", children: [
        "已找到 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: wbsWorkspaceChains.length }),
        " 条工作区 WBS 任务链（如",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: wbsWorkspaceChains[0]?.name }),
        "），已排在列表最前。若仍看不到，请选分类",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "自定义" }),
        " 或搜索 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "WBS" }),
        "。"
      ] }) : null,
      unifiedList.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border py-16 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Workflow, { className: "mx-auto mb-3 h-10 w-10 text-muted-foreground/40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] font-medium text-foreground", children: "无匹配的任务链" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] text-muted-foreground", children: "调整筛选条件，或添加自定义任务链" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: openAddModal, disabled: !hasDesktopApi, className: "btn-gradient-primary mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-semibold disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
          " 添加任务链"
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3", children: unifiedList.map((entry) => {
        if (entry.kind === "preset") {
          const t = entry.template;
          const PresetIcon = chainCategoryIcon(t.category);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => openPresetDetail(t), className: "group rounded-xl border border-dashed border-border bg-surface-elevated/80 p-4 text-left shadow-xs transition hover:border-primary/40 hover:bg-surface-elevated", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft/80 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PresetIcon, { className: "h-4 w-4" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12.5px] font-semibold text-foreground", children: t.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground", children: CHAIN_TEMPLATE_CATEGORY_LABEL[t.category] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary", children: "官方" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground", children: t.description })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                t.steps.length,
                " 步"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-primary", children: "● 官方 · 点击配置" })
            ] })
          ] }, entry.key);
        }
        const c = entry.chain;
        const SavedIcon = chainCategoryIcon(c.category);
        const isOfficial = Boolean(c.official || c.id.startsWith("official-"));
        const st = chainCardStatus(c, {
          running: chainRunning,
          activeChainId
        });
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setDetailId(c.id), className: cn("group rounded-xl border bg-surface-elevated p-4 text-left shadow-xs transition hover:border-primary/30", c.enabled ? "border-border" : "border-border opacity-75", activeChainId === c.id && "border-primary/45 ring-1 ring-primary/20", activeChainId === c.id && chainRunning && "border-success/40"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", c.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SavedIcon, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12.5px] font-semibold text-foreground", children: c.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground", children: chainCategoryLabel(c.category) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("rounded px-1.5 py-0.5 text-[10px]", isOfficial ? "bg-primary/10 text-primary" : "bg-success/10 text-success"), children: isOfficial ? "官方" : "我的" }),
                activeChainId === c.id ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary", children: "当前链" }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground", children: c.description || `${c.stepCount} 步 · ${st.progress}` })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "button", onClick: (e) => void toggleEnabled(c, e), className: cn("cursor-pointer rounded-md p-1.5 transition", c.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary"), title: c.enabled ? "停用" : "启用", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3.5 w-3.5" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: st.progress }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("font-medium", st.tone === "success" && "text-success", st.tone === "primary" && "text-primary", st.tone === "warning" && "text-warning", st.tone === "muted" && "text-muted-foreground"), children: st.label })
          ] })
        ] }, entry.key);
      }) })
    ] }),
    addOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(ChainAddDrawer, { name: addName, description: addDesc, steps: addSteps, agents: agentList, skills: skillList, mcps: mcpList, submitting: addSubmitting, onNameChange: setAddName, onDescChange: setAddDesc, onStepsChange: setAddSteps, onClose: () => setAddOpen(false), onSubmit: () => void submitAdd() }),
    selectedPreset && /* @__PURE__ */ jsxRuntimeExports.jsx(PresetChainDrawer, { template: selectedPreset, agents: agentList, skills: skillList, mcps: mcpList, createName: presetCreateName, vars: presetDetailVars, steps: presetDetailSteps, stepsDirty: presetStepsDirty, creating: presetCreating, disabled: !hasDesktopApi, onCreateNameChange: setPresetCreateName, onVarsChange: (v) => {
      setPresetDetailVars(v);
    }, onStepsChange: (s) => {
      setPresetDetailSteps(s);
      setPresetStepsDirty(true);
    }, onRegenerateSteps: regeneratePresetSteps, onClose: () => {
      setPresetDetailId(null);
      setPresetStepsDirty(false);
    }, onActivate: () => void activatePreset(selectedPreset, presetCreateName, presetDetailSteps) }),
    detail && /* @__PURE__ */ jsxRuntimeExports.jsx(ChainDetailDrawer, { chain: detail, steps: detailSteps, agents: agentList, skills: skillList, mcps: mcpList, dirty: detailDirty, saving: detailSaving, running: chainRunning && activeChainId === detail.id, activeChainId, onClose: () => setDetailId(null), onStepsChange: (s) => {
      setDetailSteps(s);
      setDetailDirty(true);
    }, onSave: () => void saveDetail(), onRun: () => void runDetail(), onStop: () => stopChainExecution(), onResetProgress: () => void resetDetailProgress(), onDelete: () => void deleteDetail(), onToggleEnabled: () => void toggleEnabled(detail) })
  ] });
}
function StatCard({
  label,
  value,
  valueClass
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-surface-elevated p-4 shadow-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] font-medium uppercase tracking-wider text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("mt-1 text-[22px] font-bold tracking-tight text-foreground", valueClass), children: value })
  ] });
}
function PresetChainDrawer({
  template,
  agents,
  skills,
  mcps,
  createName,
  vars,
  steps,
  stepsDirty,
  creating,
  disabled,
  onCreateNameChange,
  onVarsChange,
  onStepsChange,
  onRegenerateSteps,
  onClose,
  onActivate
}) {
  const DrawerIcon = chainCategoryIcon(template.category);
  const unionSkills = reactExports.useMemo(() => skillsUnionFromSteps(steps, agents), [steps, agents]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerIcon, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[13px] font-semibold", children: template.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
              CHAIN_TEMPLATE_CATEGORY_LABEL[template.category],
              " · 官方"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded p-1.5 text-muted-foreground hover:bg-secondary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12.5px] leading-relaxed text-foreground/80", children: template.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "会用到的 Agent" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 flex flex-wrap gap-1", children: template.agents.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary", children: agentDisplayNameForStem(a, agents) }, a)) })
        ] }),
        unionSkills.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "关联 Skill（来自各步 Agent 配置）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 flex flex-wrap gap-1", children: unionSkills.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { title: s, className: "rounded bg-secondary px-1.5 py-0.5 text-[10px] text-foreground/80", children: skillDisplayNameForStem(s, skills) }, s)) })
        ] }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] text-muted-foreground", children: "保存到我的任务链（名称）*" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: createName, onChange: (e) => onCreateNameChange(e.target.value), className: "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12px] outline-none focus:border-primary" })
        ] }),
        template.vars.length > 0 ? template.vars.map((key) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] text-muted-foreground", children: CHAIN_TEMPLATE_VAR_LABELS[key] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: vars[key], onChange: (e) => onVarsChange({
            ...vars,
            [key]: e.target.value
          }), className: "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12px] outline-none focus:border-primary" })
        ] }, key)) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] font-medium", children: "步骤 *" }),
            stepsDirty ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onRegenerateSteps, className: "text-[11px] text-primary hover:underline", children: "重新套用模板" }) : null
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-[11px] text-muted-foreground", children: "可先填上方项目信息自动生成步骤，也可直接改 Agent 和每步任务说明。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChainStepsEditor, { steps, agents, skills, mcps, onStepsChange })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 border-t border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-secondary", children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: disabled || creating, onClick: onActivate, className: "btn-gradient-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
          " ",
          creating ? "添加中…" : "添加到我的任务链"
        ] })
      ] })
    ] })
  ] });
}
function ChainStepsEditor({
  steps,
  agents,
  skills,
  mcps,
  onStepsChange,
  disabled = false,
  currentIndex = 0,
  running = false,
  showProgress = false
}) {
  const availableSkillStems = reactExports.useMemo(() => new Set(skills.map((s) => s.stem)), [skills]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    steps.map((step, i) => {
      const agentRow = agents.find((a) => a.stem === step.agentName);
      const stepSkills = step.agentName ? suggestedSkillStemsForAgent(step.agentName, availableSkillStems, agentRow?.skills) : [];
      const isDone = showProgress && i < currentIndex;
      const isCurrent = showProgress && i === currentIndex && currentIndex < steps.length;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("rounded-lg border p-3 space-y-2", showProgress && running && isCurrent ? "border-success/40 bg-success/5" : isDone ? "border-primary/20 opacity-90" : "border-border"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[11px] text-muted-foreground", children: [
            "步骤 ",
            i + 1,
            showProgress ? isDone ? " · 已完成" : isCurrent ? running ? " · 执行中" : " · 下一待执行" : "" : null
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: disabled || steps.length <= 1, className: "text-muted-foreground hover:text-destructive disabled:opacity-40", onClick: () => onStepsChange(steps.filter((_, j) => j !== i)), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(AgentStemCombobox, { value: step.agentName, agents, disabled, placeholder: "选择或搜索 Agent *", onChange: (stem) => onStepsChange(steps.map((x, j) => {
            if (j !== i) return x;
            const agentRow2 = agents.find((a) => a.stem === stem);
            const nextSkills = suggestedSkillStemsForAgent(stem, availableSkillStems, agentRow2?.skills);
            return {
              ...x,
              agentName: stem,
              skills: nextSkills
            };
          })) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: step.taskId, disabled, onChange: (e) => onStepsChange(steps.map((x, j) => j === i ? {
            ...x,
            taskId: e.target.value
          } : x)), placeholder: "任务编号（可选，如 第1步）", className: "h-8 rounded-md border border-border bg-background px-2 font-mono text-[12px] outline-none focus:border-primary disabled:opacity-50" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 text-[11px] font-medium text-foreground/80", children: "关联 Skill" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-border bg-secondary/30 px-2 py-1.5", children: stepSkills.length ? stepSkills.map((stem) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { title: stem, className: "inline-flex max-w-[9.5rem] shrink-0 items-center rounded bg-secondary/80 px-1.5 py-0.5 text-[10.5px] text-foreground/90", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: skillDisplayNameForStem(stem, skills) }) }, stem)) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] text-muted-foreground", children: step.agentName ? "该 Agent 未配置 Skill" : "请先选择 Agent" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[10.5px] text-muted-foreground", children: [
            "由所选 Agent 的 ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-[10px]", children: "skills:" }),
            " 自动带入，不可修改"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(McpNameMultiSelect, { value: step.mcps, mcps, disabled, placeholder: "关联 MCP（可选）", onChange: (names) => onStepsChange(steps.map((x, j) => j === i ? {
          ...x,
          mcps: names
        } : x)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: step.instruction, disabled, onChange: (e) => onStepsChange(steps.map((x, j) => j === i ? {
          ...x,
          instruction: e.target.value
        } : x)), rows: 3, placeholder: "本步要做什么（必填，尽量写清楚）", className: "w-full resize-y rounded-md border border-border bg-background p-2 text-[12px] outline-none focus:border-primary disabled:opacity-50" })
      ] }, i);
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled, onClick: () => onStepsChange([...steps, emptyStep()]), className: "inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-[12px] text-muted-foreground hover:border-primary/40 disabled:opacity-40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
      " 添加步骤"
    ] })
  ] });
}
function ChainAddDrawer({
  name,
  description,
  steps,
  agents,
  skills,
  mcps,
  submitting,
  onNameChange,
  onDescChange,
  onStepsChange,
  onClose,
  onSubmit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[13px] font-semibold", children: "添加任务链" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: "自定义步骤 · 空白链" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded p-1.5 text-muted-foreground hover:bg-secondary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] text-muted-foreground", children: "名称 *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "给这条任务链起个名字，例如：会员登录交付", className: "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12px] outline-none focus:border-primary" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] text-muted-foreground", children: "描述" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: description, onChange: (e) => onDescChange(e.target.value), rows: 2, placeholder: "简单说明这条链是干什么的（可不填）", className: "w-full rounded-lg border border-border bg-surface px-3 py-2 text-[12px] outline-none focus:border-primary" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 text-[12px] font-medium", children: "步骤 *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-[11px] text-muted-foreground", children: "每一步：① Agent（Skill 自动带入）；② MCP（可选）；③ 任务说明。多步时点「添加步骤」。官方请回列表点虚线卡片。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChainStepsEditor, { steps, agents, skills, mcps, onStepsChange })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 border-t border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-secondary", children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: submitting, onClick: onSubmit, className: "btn-gradient-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
          " ",
          submitting ? "创建中…" : "创建"
        ] })
      ] })
    ] })
  ] });
}
function ChainDetailDrawer({
  chain,
  steps,
  agents,
  skills,
  mcps,
  dirty,
  saving,
  running,
  activeChainId,
  onClose,
  onStepsChange,
  onSave,
  onRun,
  onStop,
  onResetProgress,
  onDelete,
  onToggleEnabled
}) {
  const st = chainCardStatus(chain, {
    running,
    activeChainId
  });
  const idx = chain.currentIndex ?? 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Workflow, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[13px] font-semibold", children: chain.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
              chainCategoryLabel(chain.category),
              " · ",
              st.progress
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded p-1.5 text-muted-foreground hover:bg-secondary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto p-5", children: [
        chain.description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12.5px] leading-relaxed text-foreground/80", children: chain.description }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "执行状态" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("mt-0.5 text-[13px] font-semibold", st.tone === "success" && "text-success", st.tone === "primary" && "text-primary", st.tone === "warning" && "text-warning"), children: st.label.replace(/^●\s*/, "") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "进度" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[13px] font-semibold tabular-nums", children: st.progress })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] font-medium", children: "步骤" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChainStepsEditor, { steps, agents, skills, mcps, onStepsChange, disabled: running, currentIndex: idx, running, showProgress: true })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 border-t border-border px-5 py-3", children: [
        running ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onStop, className: "btn-row border-destructive/40 text-destructive", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { className: "h-3 w-3" }),
          " 停止"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !chain.enabled || dirty, onClick: onRun, className: "btn-gradient-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "h-3.5 w-3.5" }),
          " 后台执行"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: saving || !dirty, onClick: onSave, className: "btn-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
          " ",
          saving ? "保存中" : "保存"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: running, onClick: onResetProgress, className: "btn-row text-[12px]", children: "重置进度" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onToggleEnabled, className: "btn-row text-[12px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3 w-3" }),
          " ",
          chain.enabled ? "停用" : "启用"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: running, onClick: onDelete, className: "btn-row text-destructive text-[12px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" }),
          " 删除"
        ] })
      ] })
    ] })
  ] });
}
export {
  ChainsPage as component
};
