import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { c as createLucideIcon, A as AppShell, P as PageHeader, a as Sparkles, S as Search, B as Bot } from "./app-shell-DfKeMRG5.js";
import { al as dedupeSkillStems, e as cn, a5 as MSG_API_NOT_READY, am as resolveAgentSkillBundleFromMeta, an as getSkillDefinition, b as useHasDesktop, q as hasDesktop, t as toast, P as PAGE_DESC, L as LOCAL_ONLY_HINT, ao as AGENTS_EDITOR_HINT, ap as AGENTS_DISK_SYNC_HINT, aq as AGENTS_DEMO_HINT, g as getDesktop } from "./router-CCRumuR1.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { b as buildClaudeCodePrompt, a as agentStemFromBasename, W as Wrench } from "./claude-prompt-DPcApFU5.js";
import { r as resolveAgentDisplayName } from "./agent-display-name-DbLOtgcU.js";
import { l as loadChatModelPools } from "./model-catalog-BUhoFevp.js";
import { P as Popover, a as PopoverAnchor, b as PopoverContent } from "./popover-Bdhu7TZA.js";
import { f as filterSkillsByQuery, s as skillDisplayNameForStem, r as resolveSkillStemFromInput, u as useClaudeSkillList } from "./use-claude-skill-list-g7LjvOE7.js";
import { X } from "./x-CgW_RKjX.js";
import { C as ChevronDown } from "./chevron-down-oOVv_n18.js";
import { C as Check } from "./check-CBqelC41.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
import { F as FolderOpen } from "./folder-open-uOwKTjyl.js";
import { P as Plus } from "./plus-CUtIIuQz.js";
import { H as Hash } from "./hash-Cg15RQ4o.js";
import { P as Play } from "./play-Dke1oMkU.js";
import { P as Power } from "./power-DJyGZDzR.js";
import { S as Save } from "./save-s2gnsGqd.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./Combination-C5HQNJJD.js";
const __iconNode = [
  ["path", { d: "M12 18V5", key: "adv99a" }],
  ["path", { d: "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4", key: "1e3is1" }],
  ["path", { d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5", key: "1gqd8o" }],
  ["path", { d: "M17.997 5.125a4 4 0 0 1 2.526 5.77", key: "iwvgf7" }],
  ["path", { d: "M18 18a4 4 0 0 0 2-7.464", key: "efp6ie" }],
  ["path", { d: "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517", key: "1gq6am" }],
  ["path", { d: "M6 18a4 4 0 0 1-2-7.464", key: "k1g0md" }],
  ["path", { d: "M6.003 5.125a4 4 0 0 0-2.526 5.77", key: "q97ue3" }]
];
const Brain = createLucideIcon("brain", __iconNode);
const AGENT_TOOL_CATALOG = [
  { id: "read", label: "读取" },
  { id: "edit", label: "编辑" },
  { id: "write", label: "写入" },
  { id: "bash", label: "终端" },
  { id: "web", label: "网页" },
  { id: "grep", label: "文本搜索" },
  { id: "glob", label: "文件匹配" },
  { id: "WebFetch", label: "网页抓取" },
  { id: "WebSearch", label: "网页搜索" },
  { id: "readWorkspaceTextFile", label: "读取工作区文件" },
  { id: "listWorkspaceMarkdownFiles", label: "列举 Markdown" },
  { id: "workspace-write", label: "工作区写入" }
];
const LABEL_TO_ID = /* @__PURE__ */ new Map();
for (const { id, label } of AGENT_TOOL_CATALOG) {
  LABEL_TO_ID.set(label, id);
  LABEL_TO_ID.set(id, id);
  LABEL_TO_ID.set(id.toLowerCase(), id);
}
function normalizeAgentToolId(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  return LABEL_TO_ID.get(t) ?? LABEL_TO_ID.get(t.toLowerCase()) ?? t;
}
function normalizeAgentToolIds(tools) {
  return [...new Set(tools.map(normalizeAgentToolId).filter(Boolean))];
}
function getAgentToolLabel(toolId) {
  const id = normalizeAgentToolId(toolId);
  return AGENT_TOOL_CATALOG.find((x) => x.id === id)?.label ?? toolId;
}
function formatAgentToolsForDisplay(tools) {
  return normalizeAgentToolIds(tools).map(getAgentToolLabel).join(", ");
}
function parseAgentToolsFromInput(input) {
  return normalizeAgentToolIds(
    input.split(/[,，、\s]+/).map((t) => t.trim()).filter(Boolean)
  );
}
const DEFAULT_AGENT_TOOL_IDS = ["read", "edit"];
function defaultAgentToolLabels() {
  return formatAgentToolsForDisplay([...DEFAULT_AGENT_TOOL_IDS]);
}
const CATEGORIES = ["项目", "通用", "实验"];
function extractFrontmatterField(fm, field) {
  const re = new RegExp(`^${field}:\\s*(.+)$`, "m");
  const m = fm.match(re);
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "").slice(0, 500);
}
function parseFrontmatterListField(fm, field) {
  const rawLine = extractFrontmatterField(fm, field);
  if (!rawLine) return [];
  const raw = rawLine.trim();
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
      }
    } catch {
    }
  }
  return raw.split(/[,，\s]+/).map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}
function parseAgentMarkdown(content) {
  const trimmed = content.trimStart();
  let fm = "";
  let body = trimmed;
  if (trimmed.startsWith("---")) {
    const closeIdx = trimmed.indexOf("\n---", 3);
    if (closeIdx !== -1) {
      fm = trimmed.slice(3, closeIdx);
      body = trimmed.slice(closeIdx + 4).replace(/^\s+/, "");
    }
  }
  const catRaw = extractFrontmatterField(fm, "category");
  const category = CATEGORIES.includes(catRaw) ? catRaw : "通用";
  const toolsRaw = extractFrontmatterField(fm, "tools");
  const tools = toolsRaw ? normalizeAgentToolIds(
    toolsRaw.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean)
  ) : [];
  const skills = parseFrontmatterListField(fm, "skills");
  return {
    description: extractFrontmatterField(fm, "description"),
    category,
    model: extractFrontmatterField(fm, "model") || "inherit",
    tools,
    skills,
    body
  };
}
function serializeAgentMarkdown(meta, opts) {
  const heading = opts?.heading?.trim() || "Agent";
  const toolsLine = meta.tools.length ? meta.tools.join(", ") : "read, edit";
  const fmLines = [
    "---",
    `description: ${meta.description.trim() || "简述该 Agent 的职责。"}`,
    `category: ${meta.category}`,
    `model: ${meta.model.trim() || "inherit"}`,
    `tools: ${toolsLine}`
  ];
  if (meta.skills.length) {
    fmLines.push(`skills: ${meta.skills.join(", ")}`);
  }
  fmLines.push("---", "");
  const fm = fmLines.join("\n");
  const body = meta.body.trim() ? meta.body.trim() : `# ${heading}

## 职责

- （待填）
`;
  return `${fm}${body}
`;
}
function buildDefaultAgentMarkdown(stem) {
  const name = stem.trim() || "new-agent";
  return serializeAgentMarkdown(
    {
      description: "简述该 Agent 的职责。",
      category: "通用",
      model: "inherit",
      tools: ["read", "edit"],
      skills: [],
      body: `# ${name}

## 职责

- （待填）

## 工作方式

- （待填）
`
    },
    { heading: name }
  );
}
function stemFromBasenameInput(raw) {
  return raw.trim().replace(/\.md$/i, "").replace(/[/\\]/g, "");
}
function resolveClaudeModelForSelfLearning(sessionModelId, settingsModel) {
  const s = sessionModelId.trim();
  if (/^(sonnet|opus|haiku)$/i.test(s)) return s.toLowerCase();
  if (/^claude-/i.test(s)) return s;
  const g = settingsModel.trim();
  if (g && /^(sonnet|opus|haiku)$/i.test(g)) return g.toLowerCase();
  return "sonnet";
}
async function optimizeAgentMarkdownViaWorkflow(api, opts) {
  if (typeof api.claudeCodePrompt !== "function") {
    return { ok: false, error: "当前环境未暴露 Claude Code 接口。" };
  }
  const settings = await api.getChatSettings();
  const model = resolveClaudeModelForSelfLearning(
    opts.sessionModelId ?? settings.model ?? "",
    settings.model ?? ""
  );
  const skillRead = await api.readClaudeSkillMarkdown("self_learning.md");
  let skillBody = "";
  if (skillRead?.ok && typeof skillRead.content === "string") {
    skillBody = skillRead.content.replace(/^---[\s\S]*?---\s*/, "").trim();
  }
  if (!skillBody) {
    skillBody = "回顾目标与结果、对比预期与实际、提炼可迁移经验、写入 ~/.claude/memory/经验库.txt，并给出可执行的规则改进。";
  }
  const userLine = [
    "【工作流自我学习 · Agent 规则优化】",
    `目标：优化 ~/.claude/agents/${opts.basename}（stem: ${opts.stem}）`,
    "",
    "请严格参照下方 self_learning 方法论，审阅当前 Agent Markdown 并输出**一份完整可直接保存的修订版**（含 YAML frontmatter）。",
    "优化重点：职责边界清晰、可执行步骤、工具与权限约束、与任务链/其它 Agent 的协作说明。",
    "禁止只输出 diff 或建议列表；必须输出完整 .md 正文。",
    "",
    "=== 当前 Agent Markdown ===",
    opts.currentMarkdown.trim(),
    "",
    "=== self_learning Skill 正文 ===",
    skillBody
  ].join("\n");
  try {
    const workspaceDir = await api.getWorkspace();
    const prompt = await buildClaudeCodePrompt(api, {
      workspaceDir,
      priorHistory: [],
      userLine,
      skipDefaultRoleBlock: true,
      orchestration: {
        orchestratorModel: model,
        localOllamaModel: settings.localOllamaModel,
        ollamaBase: settings.ollamaBase
      }
    });
    const res = await api.claudeCodePrompt({ prompt, model });
    if (!res.ok) {
      return { ok: false, error: res.error || "优化请求失败" };
    }
    const text = String(res.content ?? "").trim();
    if (!text) return { ok: false, error: "模型未返回修订内容" };
    const fenced = text.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
    const markdown = (fenced?.[1] ?? text).trim();
    if (!markdown.includes("---") || !markdown.includes("description:")) {
      return {
        ok: false,
        error: "返回内容不像完整 Agent Markdown（缺少 frontmatter），请重试或手动编辑。"
      };
    }
    return { ok: true, markdown };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
function chipLabel(stem, skills) {
  const name = skillDisplayNameForStem(stem, skills);
  if (name.length <= 16) return name;
  return `${name.slice(0, 15)}…`;
}
function SkillStemMultiSelect({
  value,
  skills,
  onChange,
  disabled,
  placeholder = "关联 Skill",
  className
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  const inputRef = reactExports.useRef(null);
  const skipCommitRef = reactExports.useRef(false);
  const selectedSet = reactExports.useMemo(() => new Set(value), [value]);
  const displayValue = reactExports.useMemo(() => dedupeSkillStems(value), [value]);
  const filtered = reactExports.useMemo(() => filterSkillsByQuery(skills, query), [skills, query]);
  const showPlaceholder = displayValue.length === 0 && !query;
  const addSkill = (stem) => {
    const s = stem.trim();
    if (!s || selectedSet.has(s)) return;
    onChange([...value, s]);
    setQuery("");
  };
  const removeSkill = (stem) => {
    onChange(value.filter((s) => s !== stem));
  };
  const toggleSkill = (skill) => {
    if (selectedSet.has(skill.stem)) {
      removeSkill(skill.stem);
    } else {
      addSkill(skill.stem);
    }
  };
  const commitInput = (text) => {
    const stem = resolveSkillStemFromInput(text, skills);
    if (!stem) return;
    addSkill(stem);
  };
  const focusInput = () => {
    if (disabled) return;
    inputRef.current?.focus();
    setOpen(true);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Popover,
    {
      open,
      modal: false,
      onOpenChange: (next) => {
        if (disabled) return;
        setOpen(next);
        if (next) {
          setQuery("");
        } else if (!skipCommitRef.current && query.trim()) {
          commitInput(query);
        }
        skipCommitRef.current = false;
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverAnchor, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "relative flex min-h-8 w-full cursor-text flex-wrap items-center gap-1 rounded-md border border-border bg-background py-1 pl-1.5 pr-7 transition-colors focus-within:border-primary",
              disabled && "cursor-not-allowed opacity-50",
              className
            ),
            onClick: focusInput,
            children: [
              displayValue.map((stem) => {
                const full = skillDisplayNameForStem(stem, skills);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    title: full,
                    className: "inline-flex max-w-[9.5rem] shrink-0 items-center gap-0.5 rounded bg-secondary/80 px-1 py-0.5 text-[10.5px] text-foreground/90",
                    onClick: (e) => e.stopPropagation(),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: chipLabel(stem, skills) }),
                      !disabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          className: "shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground",
                          onClick: () => removeSkill(stem),
                          "aria-label": `移除 Skill ${full}`,
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-2.5 w-2.5" })
                        }
                      ) : null
                    ]
                  },
                  stem
                );
              }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ref: inputRef,
                  value: query,
                  disabled,
                  placeholder: showPlaceholder ? placeholder : "",
                  onChange: (e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                  },
                  onFocus: () => {
                    if (disabled) return;
                    setOpen(true);
                  },
                  onKeyDown: (e) => {
                    if (e.key === "Escape") {
                      setOpen(false);
                      return;
                    }
                    if (e.key === "Backspace" && !query && displayValue.length) {
                      e.preventDefault();
                      removeSkill(displayValue[displayValue.length - 1]);
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const pick = filtered.find((s) => !selectedSet.has(s.stem)) ?? filtered[0];
                      if (pick) {
                        toggleSkill(pick);
                      } else if (query.trim()) {
                        commitInput(query);
                      }
                    }
                  },
                  className: "min-w-[5rem] flex-1 border-0 bg-transparent py-0.5 text-[12px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PopoverContent,
          {
            align: "start",
            side: "bottom",
            sideOffset: 4,
            collisionPadding: 8,
            className: "w-[var(--radix-popover-trigger-width)] overflow-hidden p-0",
            onOpenAutoFocus: (e) => e.preventDefault(),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[min(16rem,40vh)] overflow-y-auto py-1 scrollbar-thin", children: filtered.length ? filtered.map((skill) => {
              const active = selectedSet.has(skill.stem);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: cn(
                    "flex w-full items-start gap-2 px-2.5 py-2 text-left text-[12px] transition hover:bg-secondary/80",
                    active && "bg-primary/5"
                  ),
                  onMouseDown: (e) => e.preventDefault(),
                  onClick: () => toggleSkill(skill),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate font-medium", children: skill.displayName }),
                        skill.source === "project" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground", children: "项目" }) : null
                      ] }),
                      skill.description ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "line-clamp-1 text-[10.5px] leading-snug text-muted-foreground", children: skill.description }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-mono text-[10px] text-muted-foreground", children: skill.stem })
                    ] }),
                    active ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary", strokeWidth: 2.25 }) : null
                  ]
                },
                `${skill.source}:${skill.stem}`
              );
            }) : skills.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-3 text-center text-[12px] text-muted-foreground", children: "没有找到匹配的 Skill" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-3 text-center text-[12px] text-muted-foreground", children: "暂无 Skill，可在 ~/.claude/skills 或工作区 .claude/skills 添加 .md 文件" }) })
          }
        )
      ]
    }
  );
}
function serializeSkillMarkdown(meta) {
  const stem = meta.stem.trim();
  const name = meta.name?.trim() || stem;
  const category = meta.category?.trim() || "工程";
  const desc = meta.description.trim() || `${meta.name?.trim() || stem}：步骤与验收基线`;
  const fm = [
    "---",
    `name: ${name}`,
    `description: ${desc}`,
    `category: ${category}`,
    "---",
    ""
  ].join("\n");
  const agentNote = meta.agentStem ? `

## 关联 Agent

\`${meta.agentStem}\`
` : "";
  const body = meta.body?.trim() || `# ${name}

## 职责

- ${desc}${agentNote}

## 步骤

- （可在此补充操作步骤与验收标准）
`;
  return `${fm}${body}
`;
}
function mapGithubSyncToResult(stem, r) {
  const agentRow = r.agentResults?.find((x) => x.agentStem === stem);
  const needed = new Set(agentRow?.skillStems ?? []);
  const downloaded = (r.downloaded ?? []).filter((x) => needed.has(x.stem)).map((x) => x.stem);
  const templated = (r.templated ?? []).filter((x) => needed.has(x.stem)).map((x) => x.stem);
  const skipped = (r.skipped ?? []).filter((x) => needed.has(x.stem)).map((x) => x.stem);
  return {
    ok: r.ok && agentRow?.ok !== false,
    agentStem: stem,
    createdSkills: [...downloaded, ...templated],
    downloadedSkills: downloaded,
    templatedSkills: templated,
    skippedSkills: skipped,
    skillStems: agentRow?.skillStems ?? [],
    tools: agentRow?.tools ?? [],
    agentUpdated: agentRow?.ok !== false,
    error: r.error || agentRow?.error,
    summary: r.summary
  };
}
async function syncAgentSkillsLocalFallback(api, agentStem, agentBasename) {
  const stem = agentStem.trim();
  const basename = agentBasename.trim();
  if (!api.saveClaudeSkillMarkdown || !api.saveClaudeAgentMarkdown) {
    return {
      ok: false,
      agentStem: stem,
      createdSkills: [],
      skippedSkills: [],
      skillStems: [],
      tools: [],
      agentUpdated: false,
      error: MSG_API_NOT_READY
    };
  }
  const read = await api.readClaudeAgentMarkdown(basename);
  const parsed = parseAgentMarkdown(
    read.ok && read.content?.trim() ? read.content : serializeAgentMarkdown({
      description: "",
      category: "通用",
      model: "inherit",
      tools: ["read", "edit"],
      skills: [],
      body: ""
    })
  );
  const bundle = resolveAgentSkillBundleFromMeta(stem, parsed);
  const listed = await api.listClaudeSkillMarkdown();
  const existing = new Set((listed.items ?? []).map((i) => i.stem));
  const createdSkills = [];
  const skippedSkills = [];
  for (const skillStem of bundle.skillStems) {
    if (existing.has(skillStem)) {
      skippedSkills.push(skillStem);
      continue;
    }
    const def = getSkillDefinition(skillStem, stem);
    const content = serializeSkillMarkdown(def);
    const r = await api.saveClaudeSkillMarkdown({
      basename: `${skillStem}.md`,
      content,
      createOnly: true
    });
    if (r.ok) {
      createdSkills.push(skillStem);
      existing.add(skillStem);
    }
  }
  const nextMeta = {
    ...parsed,
    skills: bundle.skillStems,
    tools: bundle.tools
  };
  const markdown = serializeAgentMarkdown(nextMeta, { heading: stem });
  const save = await api.saveClaudeAgentMarkdown({
    basename,
    content: markdown,
    createOnly: false
  });
  if (!save.ok) {
    return {
      ok: false,
      agentStem: stem,
      createdSkills,
      skippedSkills,
      skillStems: bundle.skillStems,
      tools: bundle.tools,
      agentUpdated: false,
      error: save.error || "更新 Agent 失败"
    };
  }
  return {
    ok: true,
    agentStem: stem,
    createdSkills,
    skippedSkills,
    skillStems: bundle.skillStems,
    tools: bundle.tools,
    agentUpdated: true
  };
}
async function syncAgentSkillsAndTools(api, agentStem, agentBasename, opts) {
  const stem = agentStem.trim();
  const basename = agentBasename.trim();
  if (!stem || !basename) {
    return {
      ok: false,
      agentStem: stem,
      createdSkills: [],
      skippedSkills: [],
      skillStems: [],
      tools: [],
      agentUpdated: false,
      error: "缺少 Agent stem 或文件名"
    };
  }
  if (api.syncAgentSkillsFromGithub) {
    const r = await api.syncAgentSkillsFromGithub({
      agentStem: stem,
      agentBasename: basename,
      overwrite: opts?.overwrite ?? true
    });
    return mapGithubSyncToResult(stem, r);
  }
  return syncAgentSkillsLocalFallback(api, stem, basename);
}
async function syncAllKnownAgentSkillsAndTools(api, agents, opts) {
  if (api.syncAgentSkillsFromGithub) {
    const r = await api.syncAgentSkillsFromGithub({
      allAgents: true,
      onlyMissing: opts?.onlyMissing === true,
      overwrite: opts?.overwrite ?? true
    });
    return agents.map((a) => mapGithubSyncToResult(a.stem, r));
  }
  const results = [];
  for (const a of agents) {
    results.push(await syncAgentSkillsAndTools(api, a.stem, a.basename, opts));
  }
  return results;
}
function agentMarkdownBasename(a) {
  return a.markdownFile ?? `${a.id}.md`;
}
function routingStemForInvoke(a) {
  if (a.markdownFile) return agentStemFromBasename(a.markdownFile);
  if (a.id.startsWith("sl:")) return a.id.slice(3);
  return a.id;
}
const SEED = [{
  id: "pm",
  name: "项目经理",
  description: "拆解需求、制定里程碑、追踪进度并产出每日闪报。",
  model: "claude-sonnet-4",
  enabled: true,
  tools: ["read", "edit", "bash"],
  category: "项目",
  diskSource: "root"
}, {
  id: "fe",
  name: "前端工程师",
  description: "React/TanStack 路由、Tailwind、动效与可访问性。",
  model: "claude-sonnet-4",
  enabled: true,
  tools: ["read", "edit", "web"],
  category: "项目",
  diskSource: "root"
}, {
  id: "be",
  name: "后端工程师",
  description: "Edge function、Supabase RLS、SQL 迁移。",
  model: "claude-sonnet-4",
  enabled: true,
  tools: ["read", "edit", "bash"],
  category: "项目",
  diskSource: "root"
}, {
  id: "qa",
  name: "QA / 自测",
  description: "运行 vitest、回归冒烟、抓 console / network。",
  model: "claude-haiku-4",
  enabled: false,
  tools: ["bash", "read"],
  category: "项目",
  diskSource: "root"
}, {
  id: "doc",
  name: "文档撰写",
  description: "把 diff 翻译成 README / CHANGELOG / 中文用户手册。",
  model: "claude-haiku-4",
  enabled: true,
  tools: ["read", "edit"],
  category: "通用",
  diskSource: "root"
}, {
  id: "review",
  name: "代码评审",
  description: "逐 hunk 评审 PR，关注边界、安全与性能。",
  model: "claude-sonnet-4",
  enabled: false,
  tools: ["read"],
  category: "通用",
  diskSource: "root"
}, {
  id: "playw",
  name: "Playwright 试飞",
  description: "可视回归 + 端到端流程录制。",
  model: "claude-sonnet-4",
  enabled: false,
  tools: ["bash", "web"],
  category: "实验",
  diskSource: "root"
}];
function diskEntryToAgent(row) {
  const fallback = row.source === "sanshengliubu" ? "实验" : "通用";
  const cat = row.category && ["项目", "通用", "实验"].includes(row.category) ? row.category : fallback;
  const displayName = row.displayName?.trim() || resolveAgentDisplayName({
    stem: row.stem,
    basename: row.basename,
    name: row.name,
    nameZh: row.nameZh,
    heading: row.heading,
    description: row.description
  });
  return {
    id: row.source === "sanshengliubu" ? `sl:${row.stem}` : row.stem,
    markdownFile: row.basename,
    diskSource: row.source,
    name: displayName,
    description: row.description.trim() || "（可在 frontmatter 中加 description，或直接在正文中写好首段说明）",
    model: "—",
    enabled: true,
    tools: [],
    category: cat
  };
}
function AgentsPage() {
  const desktop = useHasDesktop();
  const [items, setItems] = reactExports.useState(SEED);
  const [listFromDisk, setListFromDisk] = reactExports.useState(false);
  const [listErr, setListErr] = reactExports.useState(null);
  const [listLoading, setListLoading] = reactExports.useState(false);
  const [q, setQ] = reactExports.useState("");
  const [cat, setCat] = reactExports.useState("全部");
  const [activeId, setActiveId] = reactExports.useState(SEED[0].id);
  const [editor, setEditor] = reactExports.useState(null);
  const [tryRun, setTryRun] = reactExports.useState({
    open: false,
    prompt: "",
    output: "",
    running: false
  });
  const [orchInvokeHint, setOrchInvokeHint] = reactExports.useState("");
  const [modelPools, setModelPools] = reactExports.useState({
    cloudModels: [],
    localModels: []
  });
  const [editorLoading, setEditorLoading] = reactExports.useState(false);
  const [skillsSyncing, setSkillsSyncing] = reactExports.useState(false);
  const autoSyncRanRef = reactExports.useRef(false);
  const {
    skills: skillList,
    reload: reloadSkillList
  } = useClaudeSkillList();
  const filtered = reactExports.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((a) => {
      const byCat = cat === "全部" || a.category === cat;
      const byQ = qq === "" || a.name.toLowerCase().includes(qq) || a.description.toLowerCase().includes(qq);
      return byCat && byQ;
    });
  }, [items, cat, q]);
  const active = reactExports.useMemo(() => {
    if (filtered.length === 0 || !activeId) return null;
    return filtered.find((a) => a.id === activeId) ?? null;
  }, [filtered, activeId]);
  const toggle = (id) => setItems((arr) => arr.map((a) => a.id === id ? {
    ...a,
    enabled: !a.enabled
  } : a));
  const reloadAgentList = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api || !hasDesktop()) {
      setListFromDisk(false);
      setItems(SEED);
      setListErr(null);
      return;
    }
    setListLoading(true);
    setListErr(null);
    const r = await api.listClaudeAgentMarkdown();
    setListLoading(false);
    if (!r.ok || !r.items) {
      setListErr(r.error ?? "无法枚举 Agent 目录");
      setListFromDisk(false);
      return;
    }
    setListFromDisk(true);
    const next = r.items.map(diskEntryToAgent);
    setItems(next);
    setActiveId((prev) => {
      const ids = new Set(next.map((x) => x.id));
      if (prev && ids.has(prev)) return prev;
      return next[0]?.id ?? "";
    });
  }, []);
  const openCreateEditor = reactExports.useCallback(() => {
    if (!desktop) return;
    const api = getDesktop();
    if (!api?.saveClaudeAgentMarkdown) {
      window.alert(`无法新建：${MSG_API_NOT_READY}`);
      return;
    }
    setActiveId("");
    setEditor({
      mode: "create",
      stem: "",
      basename: "",
      meta: parseAgentMarkdown(buildDefaultAgentMarkdown("")),
      dirty: false,
      saving: false,
      optimizing: false,
      error: null,
      hint: null
    });
  }, [desktop]);
  const loadEditorForAgent = reactExports.useCallback(async (agent) => {
    const api = getDesktop();
    if (!api || !hasDesktop()) {
      setEditor(null);
      setEditorLoading(false);
      return;
    }
    setEditorLoading(true);
    try {
      const bn = agentMarkdownBasename(agent);
      const r = await api.readClaudeAgentMarkdown(bn);
      const content = r.ok && r.content ? r.content : buildDefaultAgentMarkdown(routingStemForInvoke(agent));
      const parsed = parseAgentMarkdown(content);
      setEditor({
        mode: "edit",
        stem: routingStemForInvoke(agent),
        basename: bn,
        meta: parsed,
        dirty: false,
        saving: false,
        optimizing: false,
        error: r.ok ? null : r.error ?? "无法读取，已加载空白模板",
        hint: null
      });
    } finally {
      setEditorLoading(false);
    }
  }, []);
  const saveEditor = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.saveClaudeAgentMarkdown || !editor) return;
    const stem = stemFromBasenameInput(editor.mode === "create" ? editor.stem : editor.stem);
    if (editor.mode === "create" && !stem) {
      setEditor((e) => e ? {
        ...e,
        error: "请填写文件名（不含 .md）"
      } : e);
      return;
    }
    const basename = editor.mode === "create" ? `${stem}.md` : editor.basename || `${editor.stem}.md`;
    const markdown = serializeAgentMarkdown({
      ...editor.meta,
      body: editor.meta.body
    }, {
      heading: stem || editor.stem || "Agent"
    });
    setEditor((e) => e ? {
      ...e,
      saving: true,
      error: null,
      hint: null
    } : e);
    const r = await api.saveClaudeAgentMarkdown({
      basename,
      content: markdown,
      createOnly: editor.mode === "create"
    });
    if (!r.ok) {
      setEditor((e) => e ? {
        ...e,
        saving: false,
        error: r.error ?? "保存失败"
      } : e);
      return;
    }
    setEditor((e) => e ? {
      ...e,
      mode: "edit",
      stem: stem || agentStemFromBasename(basename),
      basename,
      dirty: false,
      saving: false,
      hint: "已保存"
    } : e);
    const savedStem = stem || agentStemFromBasename(basename);
    const wasCreate = editor.mode === "create";
    const hadSkills = editor.meta.skills.length > 0;
    await reloadAgentList();
    setActiveId(savedStem);
    if (api.syncAgentSkillsFromGithub || api.saveClaudeSkillMarkdown) {
      void syncAgentSkillsAndTools(api, savedStem, basename).then(async (r2) => {
        if (r2.ok) {
          await reloadSkillList();
          if (wasCreate || !hadSkills) {
            const read = await api.readClaudeAgentMarkdown(basename);
            const parsed = parseAgentMarkdown(read.ok && read.content ? read.content : "");
            setEditor((e) => e && e.basename === basename ? {
              ...e,
              meta: parsed,
              hint: `已保存并关联 ${r2.skillStems.length} 个 Skill`
            } : e);
          }
        }
      });
    }
  }, [editor, reloadAgentList, reloadSkillList]);
  const runEditorSelfLearning = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api || !editor) return;
    const stem = stemFromBasenameInput(editor.stem);
    const basename = editor.basename || (stem ? `${stem}.md` : "");
    if (!basename) {
      setEditor((e) => e ? {
        ...e,
        error: "请先填写文件名"
      } : e);
      return;
    }
    const currentMarkdown = serializeAgentMarkdown(editor.meta, {
      heading: stem || editor.stem
    });
    setEditor((e) => e ? {
      ...e,
      optimizing: true,
      error: null,
      hint: null
    } : e);
    const settings = await api.getChatSettings();
    const r = await optimizeAgentMarkdownViaWorkflow(api, {
      stem: stem || editor.stem,
      basename,
      currentMarkdown,
      sessionModelId: settings.model
    });
    if (!r.ok || !r.markdown) {
      setEditor((e) => e ? {
        ...e,
        optimizing: false,
        error: r.error ?? "工作流优化失败"
      } : e);
      return;
    }
    const parsed = parseAgentMarkdown(r.markdown);
    setEditor((e) => e ? {
      ...e,
      meta: parsed,
      dirty: true,
      optimizing: false,
      hint: "已生成修订稿，请审阅后点击「保存」写入磁盘"
    } : e);
  }, [editor]);
  const syncEditorSkillsAndTools = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api || !editor || editor.mode === "create") return;
    const stem = stemFromBasenameInput(editor.stem);
    const basename = editor.basename || (stem ? `${stem}.md` : "");
    if (!stem || !basename) {
      setEditor((e) => e ? {
        ...e,
        error: "请先保存 Agent 文件名"
      } : e);
      return;
    }
    setSkillsSyncing(true);
    const r = await syncAgentSkillsAndTools(api, stem, basename);
    setSkillsSyncing(false);
    if (!r.ok) {
      setEditor((e) => e ? {
        ...e,
        error: r.error ?? "同步失败"
      } : e);
      toast.error(r.error ?? "同步 Skill 与工具失败");
      return;
    }
    const read = await api.readClaudeAgentMarkdown(basename);
    const parsed = parseAgentMarkdown(read.ok && read.content ? read.content : "");
    setEditor((e) => e ? {
      ...e,
      meta: parsed,
      dirty: false,
      error: null,
      hint: `已同步 ${r.skillStems.length} 个 Skill、tool ${formatAgentToolsForDisplay(r.tools)}${r.createdSkills.length ? `（新建 ${r.createdSkills.length} 个 Skill 于 ~/.claude/skills/）` : ""}`
    } : e);
    await reloadSkillList();
    toast.success(r.downloadedSkills?.length ? `已从 GitHub 下载 ${r.downloadedSkills.length} 个 Skill 并写入 Agent 关联` : r.createdSkills.length ? `已创建 ${r.createdSkills.length} 个 Skill 并写入 Agent 关联` : "Skill 已存在，已更新 Agent 关联与工具");
  }, [editor, reloadSkillList]);
  const syncAllAgentsSkillsAndTools = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.saveClaudeSkillMarkdown) {
      toast.error(MSG_API_NOT_READY);
      return;
    }
    const rows = items.filter((a) => a.markdownFile).map((a) => ({
      stem: routingStemForInvoke(a),
      basename: agentMarkdownBasename(a)
    }));
    if (!rows.length) {
      toast.info("没有可同步的智能体");
      return;
    }
    setSkillsSyncing(true);
    const results = await syncAllKnownAgentSkillsAndTools(api, rows);
    setSkillsSyncing(false);
    await reloadAgentList();
    await reloadSkillList();
    const created = results.reduce((n, r) => n + r.createdSkills.length, 0);
    const failed = results.filter((r) => !r.ok).length;
    if (failed) {
      toast.warning(`完成 ${results.length - failed}/${results.length}；GitHub/模板 Skill ${created} 个`);
    } else {
      const downloaded = results.reduce((n, r) => n + (r.downloadedSkills?.length ?? 0), 0);
      toast.success(downloaded ? `已同步 ${results.length} 个智能体：从 GitHub 下载 ${downloaded} 个 Skill（~/.claude/skills/）` : `已同步 ${results.length} 个智能体，新建 Skill ${created} 个（位于 ~/.claude/skills/）`);
    }
    if (editor?.mode === "edit" && active) {
      await loadEditorForAgent(active);
    }
  }, [items, editor, active, reloadAgentList, reloadSkillList, loadEditorForAgent]);
  const openAgentsFolder = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.openClaudeUserSubdir) {
      window.alert("当前环境无法打开系统文件夹，请使用「Claude Orchestrator」桌面客户端。");
      return;
    }
    const r = await api.openClaudeUserSubdir("agents");
    if (!r.ok) window.alert(r.error ?? "无法打开文件夹");
  }, []);
  const openTryAgentDrawer = reactExports.useCallback(() => {
    setTryRun({
      open: true,
      prompt: "",
      output: "",
      running: false
    });
    const api = getDesktop();
    void api?.getChatSettings?.().then((s) => {
      const local = s.orchestrationMode === "local-mcp";
      setOrchInvokeHint(local ? "编排：本地 MCP — 为该 Agent 注入 ~/.claude/agents 规则后走本机 Ollama（与对话里选同一模型）。" : "编排：Claude Code — 单次调用等价于任务链一步（global:// + claude -p）；须已配置 Claude Code CLI。");
    });
  }, []);
  reactExports.useEffect(() => {
    void reloadAgentList();
  }, [reloadAgentList]);
  reactExports.useEffect(() => {
    const api = getDesktop();
    if (!api || !desktop || !listFromDisk || listLoading || autoSyncRanRef.current) return;
    autoSyncRanRef.current = true;
    const rows = items.filter((a) => a.markdownFile).map((a) => ({
      stem: routingStemForInvoke(a),
      basename: agentMarkdownBasename(a)
    }));
    if (!rows.length) return;
    void syncAllKnownAgentSkillsAndTools(api, rows, {
      onlyMissing: true,
      overwrite: false
    }).then(() => {
      void reloadSkillList();
    });
  }, [desktop, listFromDisk, listLoading, items, reloadSkillList]);
  reactExports.useEffect(() => {
    const api = getDesktop();
    if (!api || !desktop) return;
    const syncPools = () => {
      void loadChatModelPools(api).then(setModelPools);
    };
    syncPools();
    window.addEventListener("focus", syncPools);
    const offSettings = api.onChatSettingsChanged?.(() => syncPools());
    return () => {
      window.removeEventListener("focus", syncPools);
      offSettings?.();
    };
  }, [desktop]);
  const closeEditorDrawer = reactExports.useCallback(() => {
    setEditor(null);
    setEditorLoading(false);
  }, []);
  reactExports.useEffect(() => {
    if (!active && editor?.mode !== "create") {
      closeEditorDrawer();
    }
  }, [active, editor?.mode, closeEditorDrawer]);
  const patchEditorMeta = (patch) => {
    setEditor((e) => e ? {
      ...e,
      meta: {
        ...e.meta,
        ...patch
      },
      dirty: true,
      error: null
    } : e);
  };
  const editorDrawerOpen = desktop && (editor !== null || editorLoading);
  const counts = {
    总计: items.length,
    启用: items.filter((a) => a.enabled).length,
    项目: items.filter((a) => a.category === "项目").length,
    列表显示: filtered.length
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "智能体", description: PAGE_DESC.agents, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex max-w-full flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void syncAllAgentsSkillsAndTools(), disabled: skillsSyncing || !desktop || listLoading, title: "按当前 Agent 列表全量同步 Skill 与 tools 关联", className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: cn("h-3.5 w-3.5", skillsSyncing && "animate-pulse") }),
        " 同步 Skill 与工具"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void reloadAgentList(), disabled: listLoading || !desktop, title: !desktop ? LOCAL_ONLY_HINT : void 0, className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", listLoading && "animate-spin") }),
        " 从本机刷新"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void openAgentsFolder(), disabled: !desktop, title: !desktop ? LOCAL_ONLY_HINT : "在访达中打开 ~/.claude/agents", className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "h-3.5 w-3.5" }),
        " 在 Finder 打开"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => openCreateEditor(), disabled: !desktop, title: !desktop ? LOCAL_ONLY_HINT : void 0, className: "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50", style: {
        backgroundImage: "var(--gradient-primary)"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
        " 新建智能体"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { side: "left", children: AGENTS_EDITOR_HINT })
    ] }) }),
    desktop && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border bg-surface-elevated/80 px-4 py-2.5 sm:px-6 lg:px-7", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[12px] leading-relaxed text-muted-foreground", children: [
      listFromDisk ? /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: AGENTS_DISK_SYNC_HINT }) : /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: AGENTS_DEMO_HINT }),
      listErr ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-destructive", children: listErr }) : null
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-[calc(100%-65px)] min-h-0 flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-border bg-surface-elevated/60 px-4 py-3 sm:px-6 lg:px-7", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[220px] max-w-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "搜索 Agent 名称或描述…", className: "h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex flex-wrap rounded-lg bg-secondary p-0.5", children: ["全部", "项目", "通用", "实验"].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setCat(c), className: cn("rounded-md px-2.5 py-1 text-[11.5px] font-medium transition", cat === c ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"), children: c }, c)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "列表 ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: counts.列表显示 }),
            " / ",
            counts.总计
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "启用 ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-success", children: counts.启用 })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "项目 ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: counts.项目 })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-4 sm:px-6 lg:px-7", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-2", children: [
        filtered.map((a) => {
          const isActive = active !== null && a.id === active.id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            setActiveId(a.id);
            void loadEditorForAgent(a);
          }, className: cn("group flex items-start gap-3 rounded-xl border bg-surface-elevated p-3.5 text-left shadow-xs transition", isActive ? "border-primary/50 ring-2 ring-primary/15" : "border-border hover:border-primary/30"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", a.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13.5px] font-semibold text-foreground", children: a.name }),
                listFromDisk && a.markdownFile ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 truncate font-mono text-[10px] text-muted-foreground/80 max-w-[7rem]", children: routingStemForInvoke(a) }) : null,
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground", children: a.category })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground", children: a.description }),
              (a.tools?.length ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap items-center gap-1.5", children: a.tools.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded bg-code-bg px-1.5 py-0.5 font-mono text-[10px] text-foreground/70", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Hash, { className: "h-2.5 w-2.5" }),
                getAgentToolLabel(t)
              ] }, t)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "switch", "aria-checked": a.enabled, onClick: (e) => {
              e.stopPropagation();
              toggle(a.id);
            }, className: cn("mt-1 inline-flex h-4 w-7 cursor-pointer items-center rounded-full transition", a.enabled ? "bg-success" : "bg-muted"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("inline-block h-3 w-3 transform rounded-full bg-white shadow transition", a.enabled ? "translate-x-3.5" : "translate-x-0.5") }) })
          ] }, a.id);
        }),
        filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full rounded-xl border border-dashed border-border py-12 text-center text-[12.5px] text-muted-foreground", children: "无匹配的智能体" })
      ] }) })
    ] }) }),
    editorDrawerOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(AgentEditorDrawer, { editor, editorLoading, active, modelPools, skills: skillList, onClose: closeEditorDrawer, onStemChange: (stem) => setEditor((ed) => ed ? {
      ...ed,
      stem,
      dirty: true,
      error: null
    } : ed), onPatchMeta: patchEditorMeta, onSave: () => void saveEditor(), onOptimize: () => void runEditorSelfLearning(), onSyncSkillsTools: () => void syncEditorSkillsAndTools(), skillsSyncing, onToggleActive: active ? () => toggle(active.id) : void 0, onTryRun: active ? () => openTryAgentDrawer() : void 0 }) : null,
    tryRun.open && active && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: () => setTryRun((t) => ({
        ...t,
        open: false
      })) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full max-w-xl flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[14px] font-semibold text-foreground", children: [
              "单次调用 · ",
              active.name
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-mono text-[11px] text-muted-foreground", children: [
              "global://",
              routingStemForInvoke(active)
            ] }),
            orchInvokeHint ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 max-w-full text-[11px] leading-snug text-muted-foreground", children: orchInvokeHint }) : null
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTryRun((t) => ({
            ...t,
            open: false
          })), className: "rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-3 overflow-y-auto p-5", children: [
          !active.markdownFile ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-foreground", children: [
            "当前为界面内置示例列表，无对应磁盘上的 .md。请先点「从本机刷新」加载",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-code-bg px-1 font-mono text-[11px]", children: "~/.claude/agents" }),
            " ",
            "后再单次调用。"
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11.5px] font-medium text-muted-foreground", children: "交给该角色的指令" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: tryRun.prompt, onChange: (e) => setTryRun((t) => ({
              ...t,
              prompt: e.target.value
            })), rows: 4, placeholder: "例如：根据当前工作区写登录页 PRD 草案（须写盘时请说明路径）", className: "w-full resize-none rounded-lg border border-border bg-surface p-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" })
          ] }),
          tryRun.output && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11.5px] font-medium text-muted-foreground", children: "输出" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "max-h-72 overflow-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-[12px] leading-relaxed text-foreground", children: tryRun.output })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-2 border-t border-border px-5 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTryRun((t) => ({
            ...t,
            output: "",
            prompt: ""
          })), className: "rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] text-foreground hover:bg-secondary", children: "清空" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !tryRun.prompt.trim() || tryRun.running || !desktop || !active.markdownFile, onClick: () => {
            void (async () => {
              const api = getDesktop();
              if (!api || !active?.markdownFile) return;
              const prompt = tryRun.prompt.trim();
              const stem = routingStemForInvoke(active);
              setTryRun((t) => ({
                ...t,
                running: true,
                output: ""
              }));
              try {
                const settings = await api.getChatSettings();
                const local = settings.orchestrationMode === "local-mcp";
                if (!local) {
                  if (typeof api.claudeCodeRunChainStep !== "function") {
                    setTryRun((t) => ({
                      ...t,
                      running: false,
                      output: "未找到 claudeCodeRunChainStep：请重启到最新桌面端，或在「设置」改用本地 MCP 编排。"
                    }));
                    return;
                  }
                  const r2 = await api.claudeCodeRunChainStep({
                    step: {
                      agentName: stem,
                      instruction: prompt,
                      taskId: `agents-ui-${Date.now()}`
                    }
                  });
                  setTryRun((t) => ({
                    ...t,
                    running: false,
                    output: r2.ok ? (r2.output ?? "").trim() || "（无正文输出）" : `失败：${r2.error ?? "未知错误"}`
                  }));
                  return;
                }
                if (typeof api.localOrchestrationPrompt !== "function") {
                  setTryRun((t) => ({
                    ...t,
                    running: false,
                    output: "未找到 localOrchestrationPrompt：请重启桌面端。"
                  }));
                  return;
                }
                const modelId = settings.localOllamaModel?.trim() || settings.model?.trim() || "llama3";
                const r = await api.localOrchestrationPrompt({
                  priorMessages: [],
                  userLine: prompt,
                  orchestratorModel: modelId,
                  agentBasenameOverride: `${stem}.md`
                });
                const hint = r.orchestrationHints?.filter(Boolean).join("\n") ?? "";
                setTryRun((t) => ({
                  ...t,
                  running: false,
                  output: r.ok ? `${r.content ?? ""}${hint ? `

---
${hint}` : ""}`.trim() || "（无正文）" : `失败：${r.error ?? "未知错误"}`
                }));
              } catch (e) {
                setTryRun((t) => ({
                  ...t,
                  running: false,
                  output: `异常：${e instanceof Error ? e.message : String(e)}`
                }));
              }
            })();
          }, className: "inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50", style: {
            backgroundImage: "var(--gradient-primary)"
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "h-3 w-3" }),
            " ",
            tryRun.running ? "执行中…" : "执行"
          ] })
        ] })
      ] })
    ] })
  ] });
}
function resolveAgentModelSelectValue(model) {
  const m = model.trim();
  return m || "inherit";
}
function agentModelNotInPools(model, pools) {
  const cur = model.trim();
  if (!cur || cur === "inherit") return null;
  const known = /* @__PURE__ */ new Set([...pools.cloudModels, ...pools.localModels, "inherit"]);
  return known.has(cur) ? null : cur;
}
function AgentEditorDrawer({
  editor,
  editorLoading,
  active,
  modelPools,
  skills,
  onClose,
  onStemChange,
  onPatchMeta,
  onSave,
  onOptimize,
  onSyncSkillsTools,
  skillsSyncing = false,
  onToggleActive,
  onTryRun
}) {
  const modelValue = editor ? resolveAgentModelSelectValue(editor.meta.model) : "inherit";
  const customModel = editor ? agentModelNotInPools(editor.meta.model, modelPools) : null;
  const poolsEmpty = modelPools.cloudModels.length === 0 && modelPools.localModels.length === 0;
  const isCreate = editor?.mode === "create";
  const stemPreview = editor ? stemFromBasenameInput(editor.stem) : "";
  const pathLabel = isCreate ? `${stemPreview || "（待填文件名）"}.md` : editor?.basename || `${editor?.stem ?? ""}.md`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full max-h-screen w-full max-w-2xl flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center justify-between border-b border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", isCreate || active?.enabled !== false ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"), children: isCreate ? /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[14px] font-semibold text-foreground", children: isCreate ? "新建智能体" : active?.name ?? editor?.stem ?? "智能体" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "truncate font-mono text-[11px] text-muted-foreground", children: [
              "~/.claude/agents/",
              pathLabel
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-y-auto p-5", children: editorLoading && !editor ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 items-center justify-center text-[12.5px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "mr-2 h-4 w-4 animate-spin" }),
        " 加载 Markdown…"
      ] }) : editor ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3 rounded-xl border border-border bg-surface px-4 py-3.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", children: "基础信息" }),
          isCreate ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mb-1 block text-[11.5px] font-medium text-foreground/80", children: [
              "文件名 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-normal text-muted-foreground", children: "（不含 .md）" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: editor.stem, onChange: (e) => onStemChange(e.target.value), placeholder: "例如 my-role", spellCheck: false, autoFocus: true, className: "h-9 w-full rounded-lg border border-border bg-surface-elevated px-3 font-mono text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" })
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11.5px] font-medium text-foreground/80", children: "描述" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: editor.meta.description, onChange: (e) => onPatchMeta({
              description: e.target.value
            }), rows: 2, placeholder: "简述该 Agent 的职责与边界", className: "w-full resize-none rounded-lg border border-border bg-surface-elevated px-3 py-2 text-[12.5px] leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11.5px] font-medium text-foreground/80", children: "分类" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: editor.meta.category, onChange: (e) => onPatchMeta({
                category: e.target.value
              }), className: "h-9 w-full rounded-lg border border-border bg-surface-elevated px-2 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20", children: ["项目", "通用", "实验"].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mb-1 flex items-center gap-1 text-[11.5px] font-medium text-foreground/80", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "h-3 w-3 text-muted-foreground" }),
                " 模型"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: modelValue, onChange: (e) => onPatchMeta({
                model: e.target.value
              }), className: "h-9 w-full rounded-lg border border-border bg-surface-elevated px-2 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "inherit", children: "inherit（跟随聊天所选模型）" }),
                modelPools.cloudModels.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("optgroup", { label: "云端 · 模型与连接", children: modelPools.cloudModels.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, children: m }, `cloud:${m}`)) }) : null,
                modelPools.localModels.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("optgroup", { label: "本地 · 模型与连接", children: modelPools.localModels.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, children: m }, `local:${m}`)) }) : null,
                customModel ? /* @__PURE__ */ jsxRuntimeExports.jsx("optgroup", { label: "当前文件", children: /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: customModel, children: customModel }) }) : null
              ] }),
              poolsEmpty ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[10.5px] text-muted-foreground", children: "请先在「模型与连接」中添加模型" }) : null
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mb-1 flex items-center gap-1 text-[11.5px] font-medium text-foreground/80", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3 w-3 text-muted-foreground" }),
              " 关联 Skill"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SkillStemMultiSelect, { value: editor.meta.skills, skills, placeholder: "选择 Skill（写入 frontmatter skills）", onChange: (stems) => onPatchMeta({
              skills: stems
            }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[10.5px] text-muted-foreground", children: [
              "保存为 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-[10px]", children: "skills:" }),
              "；创建任务链时选择该 Agent 会默认带入。"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mb-1 flex items-center gap-1 text-[11.5px] font-medium text-foreground/80", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "h-3 w-3 text-muted-foreground" }),
              " tool",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-normal text-muted-foreground", children: "（逗号分隔）" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: formatAgentToolsForDisplay(editor.meta.tools), onChange: (e) => onPatchMeta({
              tools: parseAgentToolsFromInput(e.target.value)
            }), placeholder: defaultAgentToolLabels(), spellCheck: false, className: "h-9 w-full rounded-lg border border-border bg-surface-elevated px-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[10.5px] text-muted-foreground", children: [
              "保存为 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-[10px]", children: "tools:" }),
              "（磁盘仍为英文 id，如 read / edit）。"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex min-h-[240px] flex-1 flex-col rounded-xl border border-border bg-code-bg/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center justify-between border-b border-border px-3 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", children: "规则正文" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10.5px] text-muted-foreground", children: "Markdown" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: editor.meta.body, onChange: (e) => onPatchMeta({
            body: e.target.value
          }), spellCheck: false, className: "min-h-[280px] flex-1 resize-none bg-transparent p-3 font-mono text-[11px] leading-relaxed text-foreground/90 outline-none" })
        ] })
      ] }) : null }),
      editor ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 border-t border-border bg-surface-elevated/95 px-5 py-3 backdrop-blur-sm", children: [
        (editor.error || editor.hint || editor.dirty) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 space-y-0.5 text-[11.5px]", children: [
          editor.error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-destructive", children: editor.error }) : null,
          editor.hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-success", children: editor.hint }) : null,
          editor.dirty ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-amber-600 dark:text-amber-400", children: "有未保存的修改" }) : null
        ] }),
        !isCreate && (onOptimize || onTryRun || onToggleActive || onSyncSkillsTools) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap gap-1.5", children: [
          onSyncSkillsTools ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: skillsSyncing || !(stemPreview || editor.stem), onClick: onSyncSkillsTools, title: "按本 Agent 的 frontmatter 或 stem 同步 Skill 文件并写回关联（不依赖固定预设表）", className: "inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: cn("h-3 w-3", skillsSyncing && "animate-pulse") }),
            skillsSyncing ? "同步中…" : "同步 Skill 与工具"
          ] }) : null,
          onOptimize ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: editor.optimizing, onClick: onOptimize, title: "经 self_learning 生成修订稿，须审阅后保存", className: "inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: cn("h-3 w-3", editor.optimizing && "animate-pulse") }),
            editor.optimizing ? "优化中…" : "工作流优化"
          ] }) : null,
          onTryRun ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onTryRun, disabled: !active?.markdownFile, className: "inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "h-3 w-3" }),
            " 试跑"
          ] }) : null,
          active && onToggleActive ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onToggleActive, className: "inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-secondary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3 w-3" }),
            " ",
            active.enabled ? "停用" : "启用"
          ] }) : null
        ] }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded-lg border border-border px-4 py-2 text-[12.5px] font-medium text-foreground hover:bg-secondary", children: "取消" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: editor.saving || !getDesktop()?.saveClaudeAgentMarkdown, onClick: onSave, className: "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50", style: {
            backgroundImage: "var(--gradient-primary)"
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
            editor.saving ? "保存中…" : isCreate ? "创建并保存" : "保存"
          ] })
        ] })
      ] }) : null
    ] })
  ] });
}
export {
  AgentsPage as component
};
