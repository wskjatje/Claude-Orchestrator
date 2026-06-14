import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  Bot, Search, Plus, FolderOpen, Power, Hash,
  Brain, Wrench, Sparkles as SparkIcon, Play, X, RefreshCw, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { getDesktop, hasDesktop } from "@/lib/desktop-api";
import { agentStemFromBasename } from "@/lib/agent-basename";
import { resolveAgentDisplayName } from "@/lib/agent-display-name";
import { loadChatModelPools, type ModelCatalogPools } from "@/lib/model-catalog";
import {
  buildDefaultAgentMarkdown,
  parseAgentMarkdown,
  serializeAgentMarkdown,
  stemFromBasenameInput,
  type AgentCategory,
  type ParsedAgentMarkdown,
} from "@/lib/agent-markdown";
import { optimizeAgentMarkdownViaWorkflow } from "@/lib/agent-self-learning-optimize";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "智能体 · 本地代码助手" }] }),
  component: AgentsPage,
});

type Agent = {
  id: string;
  /** 若不填则使用 `${id}.md` 调用 readClaudeAgentMarkdown */
  markdownFile?: string;
  /** 本机 ~/.claude/agents 扫描来源（内置示例为 root） */
  diskSource?: "root" | "sanshengliubu";
  name: string;
  description: string;
  model: string;
  enabled: boolean;
  tools: string[];
  category: "项目" | "通用" | "实验";
};

function agentMarkdownBasename(a: Agent): string {
  return a.markdownFile ?? `${a.id}.md`;
}

/** 与对话 `/agent stem`、`global://stem`、本地 MCP 注入文件名一致 */
function routingStemForInvoke(a: Agent): string {
  if (a.markdownFile) return agentStemFromBasename(a.markdownFile);
  if (a.id.startsWith("sl:")) return a.id.slice(3);
  return a.id;
}

const SEED: Agent[] = [
  { id: "pm",     name: "项目经理",       description: "拆解需求、制定里程碑、追踪进度并产出每日闪报。", model: "claude-sonnet-4", enabled: true,  tools: ["read", "edit", "bash"], category: "项目", diskSource: "root" },
  { id: "fe",     name: "前端工程师",     description: "React/TanStack 路由、Tailwind、动效与可访问性。",  model: "claude-sonnet-4", enabled: true,  tools: ["read", "edit", "web"],  category: "项目", diskSource: "root" },
  { id: "be",     name: "后端工程师",     description: "Edge function、Supabase RLS、SQL 迁移。",          model: "claude-sonnet-4", enabled: true,  tools: ["read", "edit", "bash"], category: "项目", diskSource: "root" },
  { id: "qa",     name: "QA / 自测",      description: "运行 vitest、回归冒烟、抓 console / network。",    model: "claude-haiku-4",  enabled: false, tools: ["bash", "read"],         category: "项目", diskSource: "root" },
  { id: "doc",    name: "文档撰写",       description: "把 diff 翻译成 README / CHANGELOG / 中文用户手册。", model: "claude-haiku-4",  enabled: true,  tools: ["read", "edit"],         category: "通用", diskSource: "root" },
  { id: "review", name: "代码评审",       description: "逐 hunk 评审 PR，关注边界、安全与性能。",           model: "claude-sonnet-4", enabled: false, tools: ["read"],                 category: "通用", diskSource: "root" },
  { id: "playw",  name: "Playwright 试飞", description: "可视回归 + 端到端流程录制。",                       model: "claude-sonnet-4", enabled: false, tools: ["bash", "web"],          category: "实验", diskSource: "root" },
];

function diskEntryToAgent(row: {
  basename: string;
  source: "root" | "sanshengliubu";
  stem: string;
  description: string;
  displayName?: string;
  name?: string;
  nameZh?: string;
  heading?: string;
  category?: "项目" | "通用" | "实验";
}): Agent {
  const fallback: Agent["category"] = row.source === "sanshengliubu" ? "实验" : "通用";
  const cat =
    row.category && (["项目", "通用", "实验"] as const).includes(row.category)
      ? row.category
      : fallback;
  const displayName =
    row.displayName?.trim() ||
    resolveAgentDisplayName({
      stem: row.stem,
      basename: row.basename,
      name: row.name,
      nameZh: row.nameZh,
      heading: row.heading,
      description: row.description,
    });
  return {
    id: row.source === "sanshengliubu" ? `sl:${row.stem}` : row.stem,
    markdownFile: row.basename,
    diskSource: row.source,
    name: displayName,
    description:
      row.description.trim() ||
      "（可在 frontmatter 中加 description，或直接在正文中写好首段说明）",
    model: "—",
    enabled: true,
    tools: [],
    category: cat,
  };
}

function AgentsPage() {
  const desktop = useHasDesktop();
  const [items, setItems] = useState<Agent[]>(SEED);
  const [listFromDisk, setListFromDisk] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"全部" | Agent["category"]>("全部");
  const [activeId, setActiveId] = useState<string>(SEED[0]!.id);
  const [editor, setEditor] = useState<{
    mode: "create" | "edit";
    stem: string;
    basename: string;
    meta: ParsedAgentMarkdown;
    dirty: boolean;
    saving: boolean;
    optimizing: boolean;
    error: string | null;
    hint: string | null;
  } | null>(null);
  const [tryRun, setTryRun] = useState<{ open: boolean; prompt: string; output: string; running: boolean }>({
    open: false, prompt: "", output: "", running: false,
  });
  const [orchInvokeHint, setOrchInvokeHint] = useState<string>("");
  const [modelPools, setModelPools] = useState<ModelCatalogPools>({ cloudModels: [], localModels: [] });
  const [editorLoading, setEditorLoading] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter(a => {
      const byCat = cat === "全部" || a.category === cat;
      const byQ =
        qq === "" ||
        a.name.toLowerCase().includes(qq) ||
        a.description.toLowerCase().includes(qq);
      return byCat && byQ;
    });
  }, [items, cat, q]);

  const active: Agent | null = useMemo(() => {
    if (filtered.length === 0 || !activeId) return null;
    return filtered.find((a) => a.id === activeId) ?? null;
  }, [filtered, activeId]);
  const toggle = (id: string) =>
    setItems(arr => arr.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));

  const reloadAgentList = useCallback(async () => {
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
    setActiveId(prev => {
      const ids = new Set(next.map(x => x.id));
      if (prev && ids.has(prev)) return prev;
      return next[0]?.id ?? "";
    });
  }, []);

  const openCreateEditor = useCallback(() => {
    if (!desktop) return;
    const api = getDesktop();
    if (!api?.saveClaudeAgentMarkdown) {
      window.alert("无法新建：请重启 npm run web:dev:full 以加载最新 Bridge。");
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
      hint: null,
    });
  }, [desktop]);

  const loadEditorForAgent = useCallback(async (agent: Agent) => {
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
        hint: null,
      });
    } finally {
      setEditorLoading(false);
    }
  }, []);

  const saveEditor = useCallback(async () => {
    const api = getDesktop();
    if (!api?.saveClaudeAgentMarkdown || !editor) return;
    const stem = stemFromBasenameInput(editor.mode === "create" ? editor.stem : editor.stem);
    if (editor.mode === "create" && !stem) {
      setEditor((e) => (e ? { ...e, error: "请填写文件名（不含 .md）" } : e));
      return;
    }
    const basename =
      editor.mode === "create" ? `${stem}.md` : editor.basename || `${editor.stem}.md`;
    const markdown = serializeAgentMarkdown(
      { ...editor.meta, body: editor.meta.body },
      { heading: stem || editor.stem || "Agent" },
    );
    setEditor((e) => (e ? { ...e, saving: true, error: null, hint: null } : e));
    const r = await api.saveClaudeAgentMarkdown({
      basename,
      content: markdown,
      createOnly: editor.mode === "create",
    });
    if (!r.ok) {
      setEditor((e) => (e ? { ...e, saving: false, error: r.error ?? "保存失败" } : e));
      return;
    }
    setEditor((e) =>
      e
        ? {
            ...e,
            mode: "edit",
            stem: stem || agentStemFromBasename(basename),
            basename,
            dirty: false,
            saving: false,
            hint: "已保存",
          }
        : e,
    );
    const savedStem = stem || agentStemFromBasename(basename);
    await reloadAgentList();
    setActiveId(savedStem);
  }, [editor, reloadAgentList]);

  const runEditorSelfLearning = useCallback(async () => {
    const api = getDesktop();
    if (!api || !editor) return;
    const stem = stemFromBasenameInput(editor.stem);
    const basename =
      editor.basename || (stem ? `${stem}.md` : "");
    if (!basename) {
      setEditor((e) => (e ? { ...e, error: "请先填写文件名" } : e));
      return;
    }
    const currentMarkdown = serializeAgentMarkdown(editor.meta, { heading: stem || editor.stem });
    setEditor((e) => (e ? { ...e, optimizing: true, error: null, hint: null } : e));
    const settings = await api.getChatSettings();
    const r = await optimizeAgentMarkdownViaWorkflow(api, {
      stem: stem || editor.stem,
      basename,
      currentMarkdown,
      sessionModelId: settings.model,
    });
    if (!r.ok || !r.markdown) {
      setEditor((e) =>
        e ? { ...e, optimizing: false, error: r.error ?? "工作流优化失败" } : e,
      );
      return;
    }
    const parsed = parseAgentMarkdown(r.markdown);
    setEditor((e) =>
      e
        ? {
            ...e,
            meta: parsed,
            dirty: true,
            optimizing: false,
            hint: "已生成修订稿，请审阅后点击「保存」写入磁盘",
          }
        : e,
    );
  }, [editor]);

  const openAgentsFolder = useCallback(async () => {
    const api = getDesktop();
    if (!api?.openClaudeUserSubdir) {
      window.alert("当前环境无法打开系统文件夹，请使用「本地代码助手」桌面客户端。");
      return;
    }
    const r = await api.openClaudeUserSubdir("agents");
    if (!r.ok) window.alert(r.error ?? "无法打开文件夹");
  }, []);

  const openTryAgentDrawer = useCallback(() => {
    setTryRun({ open: true, prompt: "", output: "", running: false });
    const api = getDesktop();
    void api?.getChatSettings?.().then((s) => {
      const local = s.orchestrationMode === "local-mcp";
      setOrchInvokeHint(
        local
          ? "编排：本地 MCP — 为该 Agent 注入 ~/.claude/agents 规则后走本机 Ollama（与对话里选同一模型）。"
          : "编排：Claude Code — 单次调用等价于任务链一步（global:// + claude -p）；须已配置 Claude Code CLI。",
      );
    });
  }, []);

  useEffect(() => {
    void reloadAgentList();
  }, [reloadAgentList]);

  useEffect(() => {
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

  const closeEditorDrawer = useCallback(() => {
    setEditor(null);
    setEditorLoading(false);
  }, []);

  useEffect(() => {
    if (!active && editor?.mode !== "create") {
      closeEditorDrawer();
    }
  }, [active, editor?.mode, closeEditorDrawer]);

  const patchEditorMeta = (patch: Partial<ParsedAgentMarkdown>) => {
    setEditor((e) =>
      e ? { ...e, meta: { ...e.meta, ...patch }, dirty: true, error: null } : e,
    );
  };

  const editorDrawerOpen = desktop && (editor !== null || editorLoading);

  const counts = {
    总计: items.length,
    启用: items.filter(a => a.enabled).length,
    项目: items.filter(a => a.category === "项目").length,
    列表显示: filtered.length,
  };

  return (
    <AppShell>
      <PageHeader
        title="智能体"
        description="浏览、编辑与试跑 ~/.claude/agents/ 下的角色规则"
        actions={
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void reloadAgentList()}
              disabled={listLoading || !desktop}
              title={!desktop ? "仅在 Electron 桌面客户端可用" : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", listLoading && "animate-spin")} /> 从本机刷新
            </button>
            <button
              type="button"
              onClick={() => void openAgentsFolder()}
              disabled={!desktop}
              title={!desktop ? "仅在 Electron 桌面客户端可用" : "在访达中打开 ~/.claude/agents"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <FolderOpen className="h-3.5 w-3.5" /> 在 Finder 打开
            </button>
            <button
              type="button"
              onClick={() => openCreateEditor()}
              disabled={!desktop}
              title={!desktop ? "仅在 Electron 桌面客户端可用" : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Plus className="h-3.5 w-3.5" /> 新建智能体
            </button>
            <InfoHint side="left">
              右侧可编辑 frontmatter 与正文；「工作流优化」经 self_learning 链生成修订稿，审阅后保存写入磁盘。
            </InfoHint>
          </div>
        }
      />

      {desktop && (
        <div className="border-b border-border bg-surface-elevated/80 px-4 py-2.5 sm:px-6 lg:px-7">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {listFromDisk ? (
              <>
                列表已与 <code className="rounded bg-code-bg px-1 font-mono text-[11px]">~/.claude/agents</code>{" "}
                同步（含 <code className="rounded bg-code-bg px-1 font-mono text-[11px]">sanshengliubu</code> 子目录中与根目录不重名的
                .md）。刷新后仍沿用当前搜索与筛选；分类可在各文件 frontmatter 写{" "}
                <code className="rounded bg-code-bg px-1 font-mono text-[11px]">category: 项目</code>（或「通用」「实验」）。
              </>
            ) : (
              <>
                浏览器预览下展示内置示例；在 Electron 中点击「从本机刷新」可读取你与 Claude Code 共用的 Agent Markdown。
              </>
            )}
            {listErr ? <span className="mt-1 block text-destructive">{listErr}</span> : null}
          </p>
        </div>
      )}

      <div className="flex h-[calc(100%-65px)] min-h-0 flex-col">
        {/* 列表 */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* 工具条 */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-elevated/60 px-4 py-3 sm:px-6 lg:px-7">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="搜索 Agent 名称或描述…"
                className="h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="inline-flex flex-wrap rounded-lg bg-secondary p-0.5">
              {(["全部", "项目", "通用", "实验"] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                    cat === c ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >{c}</button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
              <span>列表 <b className="text-foreground">{counts.列表显示}</b> / {counts.总计}</span>
              <span>启用 <b className="text-success">{counts.启用}</b></span>
              <span>项目 <b className="text-foreground">{counts.项目}</b></span>
            </div>
          </div>

          {/* 列表 */}
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-4 sm:px-6 lg:px-7">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {filtered.map(a => {
                const isActive = active !== null && a.id === active.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setActiveId(a.id);
                      void loadEditorForAgent(a);
                    }}
                    className={cn(
                      "group flex items-start gap-3 rounded-xl border bg-surface-elevated p-3.5 text-left shadow-xs transition",
                      isActive ? "border-primary/50 ring-2 ring-primary/15" : "border-border hover:border-primary/30",
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      a.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground",
                    )}>
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-foreground">{a.name}</span>
                        {listFromDisk && a.markdownFile ? (
                          <span className="shrink-0 truncate font-mono text-[10px] text-muted-foreground/80 max-w-[7rem]">
                            {routingStemForInvoke(a)}
                          </span>
                        ) : null}
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{a.category}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{a.description}</p>
                      {(a.tools?.length ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {a.tools.map(t => (
                            <span key={t} className="inline-flex items-center gap-1 rounded bg-code-bg px-1.5 py-0.5 font-mono text-[10px] text-foreground/70">
                              <Hash className="h-2.5 w-2.5" />{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      role="switch"
                      aria-checked={a.enabled}
                      onClick={(e) => { e.stopPropagation(); toggle(a.id); }}
                      className={cn(
                        "mt-1 inline-flex h-4 w-7 cursor-pointer items-center rounded-full transition",
                        a.enabled ? "bg-success" : "bg-muted",
                      )}
                    >
                      <span className={cn("inline-block h-3 w-3 transform rounded-full bg-white shadow transition", a.enabled ? "translate-x-3.5" : "translate-x-0.5")} />
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-[12.5px] text-muted-foreground">
                  无匹配的智能体
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editorDrawerOpen ? (
        <AgentEditorDrawer
          editor={editor}
          editorLoading={editorLoading}
          active={active}
          modelPools={modelPools}
          onClose={closeEditorDrawer}
          onStemChange={(stem) =>
            setEditor((ed) => (ed ? { ...ed, stem, dirty: true, error: null } : ed))
          }
          onPatchMeta={patchEditorMeta}
          onSave={() => void saveEditor()}
          onOptimize={() => void runEditorSelfLearning()}
          onToggleActive={active ? () => toggle(active.id) : undefined}
          onTryRun={active ? () => openTryAgentDrawer() : undefined}
        />
      ) : null}

      {/* 单次调用（Claude Code global:// 或本地 MCP 注入） */}
      {tryRun.open && active && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={() => setTryRun(t => ({ ...t, open: false }))} />
          <div className="flex w-full max-w-xl flex-col border-l border-border bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <div className="text-[14px] font-semibold text-foreground">单次调用 · {active.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground">global://{routingStemForInvoke(active)}</div>
                {orchInvokeHint ? (
                  <div className="mt-1 max-w-full text-[11px] leading-snug text-muted-foreground">{orchInvokeHint}</div>
                ) : null}
              </div>
              <button onClick={() => setTryRun(t => ({ ...t, open: false }))} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {!active.markdownFile ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-foreground">
                  当前为界面内置示例列表，无对应磁盘上的 .md。请先点「从本机刷新」加载{" "}
                  <code className="rounded bg-code-bg px-1 font-mono text-[11px]">~/.claude/agents</code>{" "}
                  后再单次调用。
                </p>
              ) : null}
              <div>
                <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">交给该角色的指令</label>
                <textarea
                  value={tryRun.prompt}
                  onChange={e => setTryRun(t => ({ ...t, prompt: e.target.value }))}
                  rows={4}
                  placeholder="例如：根据当前工作区写登录页 PRD 草案（须写盘时请说明路径）"
                  className="w-full resize-none rounded-lg border border-border bg-surface p-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {tryRun.output && (
                <div>
                  <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">输出</label>
                  <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-[12px] leading-relaxed text-foreground">{tryRun.output}</pre>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button
                onClick={() => setTryRun(t => ({ ...t, output: "", prompt: "" }))}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] text-foreground hover:bg-secondary"
              >清空</button>
              <button
                type="button"
                disabled={
                  !tryRun.prompt.trim() ||
                  tryRun.running ||
                  !desktop ||
                  !active.markdownFile
                }
                onClick={() => {
                  void (async () => {
                    const api = getDesktop();
                    if (!api || !active?.markdownFile) return;
                    const prompt = tryRun.prompt.trim();
                    const stem = routingStemForInvoke(active);
                    setTryRun((t) => ({ ...t, running: true, output: "" }));
                    try {
                      const settings = await api.getChatSettings();
                      const local = settings.orchestrationMode === "local-mcp";
                      if (!local) {
                        if (typeof api.claudeCodeRunChainStep !== "function") {
                          setTryRun((t) => ({
                            ...t,
                            running: false,
                            output: "未找到 claudeCodeRunChainStep：请重启到最新桌面端，或在「设置」改用本地 MCP 编排。",
                          }));
                          return;
                        }
                        const r = await api.claudeCodeRunChainStep({
                          step: {
                            agentName: stem,
                            instruction: prompt,
                            taskId: `agents-ui-${Date.now()}`,
                          },
                        });
                        setTryRun((t) => ({
                          ...t,
                          running: false,
                          output: r.ok
                            ? (r.output ?? "").trim() || "（无正文输出）"
                            : `失败：${r.error ?? "未知错误"}`,
                        }));
                        return;
                      }
                      if (typeof api.localOrchestrationPrompt !== "function") {
                        setTryRun((t) => ({
                          ...t,
                          running: false,
                          output: "未找到 localOrchestrationPrompt：请重启桌面端。",
                        }));
                        return;
                      }
                      const modelId =
                        settings.localOllamaModel?.trim() ||
                        settings.model?.trim() ||
                        "llama3";
                      const r = await api.localOrchestrationPrompt({
                        priorMessages: [],
                        userLine: prompt,
                        orchestratorModel: modelId,
                        agentBasenameOverride: `${stem}.md`,
                      });
                      const hint =
                        r.orchestrationHints?.filter(Boolean).join("\n") ?? "";
                      setTryRun((t) => ({
                        ...t,
                        running: false,
                        output: r.ok
                          ? `${r.content ?? ""}${hint ? `\n\n---\n${hint}` : ""}`.trim() ||
                            "（无正文）"
                          : `失败：${r.error ?? "未知错误"}`,
                      }));
                    } catch (e) {
                      setTryRun((t) => ({
                        ...t,
                        running: false,
                        output: `异常：${e instanceof Error ? e.message : String(e)}`,
                      }));
                    }
                  })();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Play className="h-3 w-3" /> {tryRun.running ? "执行中…" : "执行"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

type AgentEditorState = {
  mode: "create" | "edit";
  stem: string;
  basename: string;
  meta: ParsedAgentMarkdown;
  dirty: boolean;
  saving: boolean;
  optimizing: boolean;
  error: string | null;
  hint: string | null;
};

function resolveAgentModelSelectValue(model: string): string {
  const m = model.trim();
  return m || "inherit";
}

function agentModelNotInPools(model: string, pools: ModelCatalogPools): string | null {
  const cur = model.trim();
  if (!cur || cur === "inherit") return null;
  const known = new Set([...pools.cloudModels, ...pools.localModels, "inherit"]);
  return known.has(cur) ? null : cur;
}

function AgentEditorDrawer({
  editor,
  editorLoading,
  active,
  modelPools,
  onClose,
  onStemChange,
  onPatchMeta,
  onSave,
  onOptimize,
  onToggleActive,
  onTryRun,
}: {
  editor: AgentEditorState | null;
  editorLoading: boolean;
  active: Agent | null;
  modelPools: ModelCatalogPools;
  onClose: () => void;
  onStemChange: (stem: string) => void;
  onPatchMeta: (patch: Partial<ParsedAgentMarkdown>) => void;
  onSave: () => void;
  onOptimize: () => void;
  onToggleActive?: () => void;
  onTryRun?: () => void;
}) {
  const modelValue = editor ? resolveAgentModelSelectValue(editor.meta.model) : "inherit";
  const customModel = editor ? agentModelNotInPools(editor.meta.model, modelPools) : null;
  const poolsEmpty = modelPools.cloudModels.length === 0 && modelPools.localModels.length === 0;
  const isCreate = editor?.mode === "create";
  const stemPreview = editor ? stemFromBasenameInput(editor.stem) : "";
  const pathLabel = isCreate
    ? `${stemPreview || "（待填文件名）"}.md`
    : editor?.basename || `${editor?.stem ?? ""}.md`;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={onClose} />
      <div className="flex h-full max-h-screen w-full max-w-2xl flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isCreate || active?.enabled !== false
                  ? "bg-primary-soft text-primary"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {isCreate ? <Plus className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-foreground">
                {isCreate ? "新建智能体" : active?.name ?? editor?.stem ?? "智能体"}
              </div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                ~/.claude/agents/{pathLabel}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          {editorLoading && !editor ? (
            <div className="flex flex-1 items-center justify-center text-[12.5px] text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 加载 Markdown…
            </div>
          ) : editor ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <section className="space-y-3 rounded-xl border border-border bg-surface px-4 py-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">基础信息</div>

                {isCreate ? (
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-foreground/80">
                      文件名 <span className="font-normal text-muted-foreground">（不含 .md）</span>
                    </label>
                    <input
                      type="text"
                      value={editor.stem}
                      onChange={(e) => onStemChange(e.target.value)}
                      placeholder="例如 my-role"
                      spellCheck={false}
                      autoFocus
                      className="h-9 w-full rounded-lg border border-border bg-surface-elevated px-3 font-mono text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block text-[11.5px] font-medium text-foreground/80">描述</label>
                  <textarea
                    value={editor.meta.description}
                    onChange={(e) => onPatchMeta({ description: e.target.value })}
                    rows={2}
                    placeholder="简述该 Agent 的职责与边界"
                    className="w-full resize-none rounded-lg border border-border bg-surface-elevated px-3 py-2 text-[12.5px] leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-foreground/80">分类</label>
                    <select
                      value={editor.meta.category}
                      onChange={(e) => onPatchMeta({ category: e.target.value as AgentCategory })}
                      className="h-9 w-full rounded-lg border border-border bg-surface-elevated px-2 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {(["项目", "通用", "实验"] as const).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[11.5px] font-medium text-foreground/80">
                      <Brain className="h-3 w-3 text-muted-foreground" /> 模型
                    </label>
                    <select
                      value={modelValue}
                      onChange={(e) => onPatchMeta({ model: e.target.value })}
                      className="h-9 w-full rounded-lg border border-border bg-surface-elevated px-2 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="inherit">inherit（跟随父级 / Auto）</option>
                      {modelPools.cloudModels.length > 0 ? (
                        <optgroup label="云端 · 模型与连接">
                          {modelPools.cloudModels.map((m) => (
                            <option key={`cloud:${m}`} value={m}>{m}</option>
                          ))}
                        </optgroup>
                      ) : null}
                      {modelPools.localModels.length > 0 ? (
                        <optgroup label="本地 · 模型与连接">
                          {modelPools.localModels.map((m) => (
                            <option key={`local:${m}`} value={m}>{m}</option>
                          ))}
                        </optgroup>
                      ) : null}
                      {customModel ? (
                        <optgroup label="当前文件">
                          <option value={customModel}>{customModel}</option>
                        </optgroup>
                      ) : null}
                    </select>
                    {poolsEmpty ? (
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        请先在「模型与连接」中添加模型
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11.5px] font-medium text-foreground/80">
                    <Wrench className="h-3 w-3 text-muted-foreground" /> 工具
                    <span className="font-normal text-muted-foreground">（逗号分隔）</span>
                  </label>
                  <input
                    type="text"
                    value={editor.meta.tools.join(", ")}
                    onChange={(e) =>
                      onPatchMeta({
                        tools: e.target.value
                          .split(/[,，\s]+/)
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="read, edit, bash"
                    spellCheck={false}
                    className="h-9 w-full rounded-lg border border-border bg-surface-elevated px-3 font-mono text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </section>

              <section className="flex min-h-[240px] flex-1 flex-col rounded-xl border border-border bg-code-bg/60">
                <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    规则正文
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">Markdown</span>
                </div>
                <textarea
                  value={editor.meta.body}
                  onChange={(e) => onPatchMeta({ body: e.target.value })}
                  spellCheck={false}
                  className="min-h-[280px] flex-1 resize-none bg-transparent p-3 font-mono text-[11px] leading-relaxed text-foreground/90 outline-none"
                />
              </section>
            </div>
          ) : null}
        </div>

        {editor ? (
          <div className="shrink-0 border-t border-border bg-surface-elevated/95 px-5 py-3 backdrop-blur-sm">
            {(editor.error || editor.hint || editor.dirty) && (
              <div className="mb-2 space-y-0.5 text-[11.5px]">
                {editor.error ? <p className="text-destructive">{editor.error}</p> : null}
                {editor.hint ? <p className="text-success">{editor.hint}</p> : null}
                {editor.dirty ? (
                  <p className="text-amber-600 dark:text-amber-400">有未保存的修改</p>
                ) : null}
              </div>
            )}

            {!isCreate && (onOptimize || onTryRun || onToggleActive) ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {onOptimize ? (
                  <button
                    type="button"
                    disabled={editor.optimizing}
                    onClick={onOptimize}
                    title="经 self_learning 生成修订稿，须审阅后保存"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
                  >
                    <SparkIcon className={cn("h-3 w-3", editor.optimizing && "animate-pulse")} />
                    {editor.optimizing ? "优化中…" : "工作流优化"}
                  </button>
                ) : null}
                {onTryRun ? (
                  <button
                    type="button"
                    onClick={onTryRun}
                    disabled={!active?.markdownFile}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" /> 试跑
                  </button>
                ) : null}
                {active && onToggleActive ? (
                  <button
                    type="button"
                    onClick={onToggleActive}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-secondary"
                  >
                    <Power className="h-3 w-3" /> {active.enabled ? "停用" : "启用"}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-[12.5px] font-medium text-foreground hover:bg-secondary"
              >
                取消
              </button>
              <button
                type="button"
                disabled={editor.saving || !getDesktop()?.saveClaudeAgentMarkdown}
                onClick={onSave}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Save className="h-3.5 w-3.5" />
                {editor.saving ? "保存中…" : isCreate ? "创建并保存" : "保存"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
