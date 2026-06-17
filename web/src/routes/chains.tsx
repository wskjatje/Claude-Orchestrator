import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  Workflow,
  Play,
  Square,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Search,
  Power,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import { InfoHint } from "@/components/info-hint";
import { RequiredMark } from "@/components/required-mark";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { useOrchestrationExecution } from "@/hooks/use-orchestration-execution";
import type { SavedChainDetail, SavedChainSummary } from "@/types/desktop";
import { chainCardStatus, chainCategoryLabel } from "@/lib/chain-card-status";
import {
  applyChainTemplate,
  CHAIN_TEMPLATE_CATEGORY_LABEL,
  CHAIN_TEMPLATE_DEFAULTS,
  CHAIN_TEMPLATE_VAR_LABELS,
  CHAIN_TEMPLATES,
  type ChainTemplate,
  type ChainTemplateVarKey,
} from "@/lib/chain-templates";
import { syncOfficialGenericChains } from "@/lib/sync-official-chains";
import { toast } from "sonner";
import { BRIDGE_OFFLINE_BANNER, BRIDGE_OFFLINE_TOAST, CHAINS_INFO_HINT, MSG_API_NOT_READY, PAGE_DESC } from "@/lib/ui-copy";
import { AgentStemCombobox } from "@/components/agent-stem-combobox";
import { McpNameMultiSelect } from "@/components/mcp-name-multi-select";
import { useClaudeAgentList, agentDisplayNameForStem, type ClaudeAgentRow } from "@/hooks/use-claude-agent-list";
import { useClaudeSkillList, type ClaudeSkillRow, skillDisplayNameForStem } from "@/hooks/use-claude-skill-list";
import { useClaudeMcpList, type ClaudeMcpRow } from "@/hooks/use-claude-mcp-list";
import { suggestedSkillStemsForAgent, resolveChainStepSkills, skillsUnionFromSteps } from "@/lib/agent-skill-defaults";

export const Route = createFileRoute("/chains")({
  head: () => ({ meta: [{ title: "任务链 · Claude Orchestrator" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: ChainsPage,
});

type ChainStep = {
  agentName: string;
  taskId: string;
  instruction: string;
  skills: string[];
  mcps: string[];
};

type CategoryFilter = "全部" | "单 Agent" | "流水线" | "自定义";

const CATEGORY_FILTERS: CategoryFilter[] = ["全部", "单 Agent", "流水线", "自定义"];

function chainCategoryIcon(category: SavedChainSummary["category"] | ChainTemplate["category"]) {
  if (category === "pipeline") return Layers;
  return Sparkles;
}

/** 统一列表项：预设（内置模板）+ 我的（已保存实例） */
type ChainListEntry =
  | { kind: "preset"; key: string; template: ChainTemplate }
  | { kind: "saved"; key: string; chain: SavedChainSummary };

function emptyStep(): ChainStep {
  return { agentName: "", taskId: "", instruction: "", skills: [], mcps: [] };
}

function validSteps(steps: ChainStep[], agents: ClaudeAgentRow[] = []): ChainStep[] {
  return steps
    .map((s) => {
      const agentName = s.agentName.trim();
      return {
        agentName,
        taskId: s.taskId.trim(),
        instruction: s.instruction.trim(),
        skills: resolveChainStepSkills(agentName, agents),
        mcps: s.mcps.map((x) => x.trim()).filter(Boolean),
      };
    })
    .filter((s) => s.agentName && s.instruction);
}

function normalizeSteps(
  steps: SavedChainDetail["state"]["steps"] | undefined,
  agents: ClaudeAgentRow[] = [],
): ChainStep[] {
  if (!Array.isArray(steps)) return [];
  return steps.map((s) => {
    const agentName = String(s.agentName ?? "").trim();
    return {
      agentName,
      taskId: String(s.taskId ?? "").trim(),
      instruction: String(s.instruction ?? "").trim(),
      skills: resolveChainStepSkills(agentName, agents),
      mcps: Array.isArray(s.mcps)
        ? s.mcps.map((x) => String(x ?? "").trim()).filter(Boolean)
        : [],
    };
  });
}

function filterCategory(chain: SavedChainSummary, cat: CategoryFilter): boolean {
  if (cat === "全部") return true;
  if (cat === "单 Agent") return chain.category === "single";
  if (cat === "流水线") return chain.category === "pipeline";
  return chain.category === "custom";
}

function filterTemplateCategory(template: ChainTemplate, cat: CategoryFilter): boolean {
  if (cat === "全部") return true;
  if (cat === "单 Agent") return template.category === "single";
  if (cat === "流水线") return template.category === "pipeline";
  return false;
}

function matchesQuery(text: string, qq: string): boolean {
  return text.toLowerCase().includes(qq);
}

function stepsFromTemplate(
  template: ChainTemplate,
  vars: Record<ChainTemplateVarKey, string>,
  agents: ClaudeAgentRow[] = [],
): ChainStep[] {
  const partial: Partial<Record<ChainTemplateVarKey, string>> = {};
  for (const key of template.vars) partial[key] = vars[key];
  return applyChainTemplate(template, partial).map((s) => ({
    agentName: s.agentName,
    taskId: s.taskId,
    instruction: s.instruction,
    skills: resolveChainStepSkills(s.agentName, agents),
    mcps: s.mcps ?? [],
  }));
}

function isWbsWorkspaceChain(chain: SavedChainSummary): boolean {
  return chain.name.startsWith("WBS ·") || /WBS\s*来源：/i.test(chain.description ?? "");
}

function sortSavedChainsForDisplay(
  chains: SavedChainSummary[],
  activeId: string | null,
): SavedChainSummary[] {
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
  const { q: urlQ } = Route.useSearch();
  const hasDesktopApi = useHasDesktop();
  const { agents: agentList } = useClaudeAgentList();
  const { skills: skillList } = useClaudeSkillList();
  const { mcps: mcpList } = useClaudeMcpList();
  const { chainRunning, runOrchestrationChain, stopChainExecution, syncExecutionState } =
    useOrchestrationExecution();

  const [items, setItems] = useState<SavedChainSummary[]>([]);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryFilter>("全部");

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addSteps, setAddSteps] = useState<ChainStep[]>([emptyStep()]);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SavedChainDetail | null>(null);
  const [detailSteps, setDetailSteps] = useState<ChainStep[]>([]);
  const [detailDirty, setDetailDirty] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);

  const [presetDetailId, setPresetDetailId] = useState<string | null>(null);
  const [presetDetailVars, setPresetDetailVars] = useState({ ...CHAIN_TEMPLATE_DEFAULTS });
  const [presetDetailSteps, setPresetDetailSteps] = useState<ChainStep[]>([emptyStep()]);
  const [presetStepsDirty, setPresetStepsDirty] = useState(false);
  const [presetCreateName, setPresetCreateName] = useState("");
  const [presetCreating, setPresetCreating] = useState(false);

  const reloadList = useCallback(async () => {
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

  const loadDetail = useCallback(async (id: string) => {
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

  useEffect(() => {
    if (!hasDesktopApi) return;
    void syncOfficialGenericChains().then(() => reloadList());
    void syncExecutionState();
  }, [hasDesktopApi, reloadList, syncExecutionState]);

  useEffect(() => {
    if (urlQ.trim()) setQ(urlQ.trim());
  }, [urlQ]);

  useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    const off = api?.onOrchestrationChainStatus?.(() => {
      void reloadList();
      void syncExecutionState();
      if (detailId) void loadDetail(detailId);
    });
    return () => off?.();
  }, [hasDesktopApi, reloadList, syncExecutionState, detailId, loadDetail]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      setDetailSteps([]);
      setDetailDirty(false);
      return;
    }
    void loadDetail(detailId);
  }, [detailId, loadDetail]);

  const filteredSaved = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const filtered = items.filter((c) => {
      if (!filterCategory(c, cat)) return false;
      if (!qq) return true;
      return (
        matchesQuery(c.name, qq) ||
        matchesQuery(c.description, qq) ||
        matchesQuery(c.id, qq)
      );
    });
    return sortSavedChainsForDisplay(filtered, activeChainId);
  }, [items, cat, q, activeChainId]);

  const syncedOfficialTemplateIds = useMemo(
    () =>
      new Set(
        items
          .filter((c) => c.official || c.id.startsWith("official-"))
          .map((c) => c.templateId)
          .filter(Boolean) as string[],
      ),
    [items],
  );

  const filteredPresets = useMemo(() => {
    if (cat === "自定义") return [];
    const qq = q.trim().toLowerCase();
    return CHAIN_TEMPLATES.filter((t) => {
      if (syncedOfficialTemplateIds.has(t.id)) return false;
      if (!filterTemplateCategory(t, cat)) return false;
      if (!qq) return true;
      return (
        matchesQuery(t.name, qq) ||
        matchesQuery(t.description, qq) ||
        t.agents.some((a) => matchesQuery(a, qq))
      );
    });
  }, [cat, q, syncedOfficialTemplateIds]);

  const visibleChainCount = useMemo(() => {
    const presetCount = CHAIN_TEMPLATES.filter((t) => !syncedOfficialTemplateIds.has(t.id)).length;
    return items.length + presetCount;
  }, [items.length, syncedOfficialTemplateIds]);

  const unifiedList = useMemo((): ChainListEntry[] => {
    const presets: ChainListEntry[] = filteredPresets.map((t) => ({
      kind: "preset",
      key: `preset:${t.id}`,
      template: t,
    }));
    const saved: ChainListEntry[] = filteredSaved.map((c) => ({
      kind: "saved",
      key: `saved:${c.id}`,
      chain: c,
    }));
    return [...saved, ...presets];
  }, [filteredPresets, filteredSaved]);

  const selectedPreset = useMemo(
    () => CHAIN_TEMPLATES.find((t) => t.id === presetDetailId) ?? null,
    [presetDetailId],
  );

  useEffect(() => {
    if (!selectedPreset || presetStepsDirty) return;
    setPresetDetailSteps(stepsFromTemplate(selectedPreset, presetDetailVars, agentList));
  }, [selectedPreset, presetDetailVars, presetStepsDirty, agentList]);

  const enabledCount = items.filter((c) => c.enabled).length;
  const runningCount = chainRunning && activeChainId ? 1 : 0;

  const toggleEnabled = async (chain: SavedChainSummary, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const api = getDesktop();
    if (!api?.orchestrationToggleChainEnabled) {
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    const r = await api.orchestrationToggleChainEnabled({ id: chain.id, enabled: !chain.enabled });
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
      state: { status: "idle", currentIndex: 0, steps },
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

  const activatePreset = async (template: ChainTemplate, name: string, steps: ChainStep[]) => {
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
      state: { status: "idle", currentIndex: 0, steps: valid },
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

  const openPresetDetail = (template: ChainTemplate) => {
    const vars = { ...CHAIN_TEMPLATE_DEFAULTS };
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
      state: { status: "idle", currentIndex: 0, steps },
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
      state: { status: "idle", currentIndex: 0, steps },
    });
    if (r.ok) {
      toast.info("已重置进度");
      if (r.chain) setDetail(r.chain);
      await reloadList();
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="任务链"
        description={PAGE_DESC.chains}
        actions={
          <>
            <button
              type="button"
              onClick={openAddModal}
              disabled={!hasDesktopApi}
              className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> 添加任务链
            </button>
            <button
              type="button"
              onClick={() => void reloadList()}
              disabled={listLoading || !hasDesktopApi}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", listLoading && "animate-spin")} /> 刷新
            </button>
            <InfoHint side="left">{CHAINS_INFO_HINT}</InfoHint>
          </>
        }
      />

      {!hasDesktopApi && (
        <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-[12px] text-warning">
          {BRIDGE_OFFLINE_BANNER}
        </div>
      )}

      <div className="px-4 py-5 sm:px-6 lg:px-7">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="任务链" value={visibleChainCount} />
          <StatCard label="已启用" value={enabledCount} valueClass="text-success" />
          <StatCard label="执行中" value={runningCount} valueClass={runningCount ? "text-success" : undefined} />
        </div>

        {listErr ? <p className="mb-3 text-[12px] text-destructive">{listErr}</p> : null}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索任务链…"
              className="h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                  cat === c ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {unifiedList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <Workflow className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-[13px] font-medium text-foreground">无匹配的任务链</p>
            <p className="mt-1 text-[12px] text-muted-foreground">调整筛选条件，或添加自定义任务链</p>
            <button
              type="button"
              onClick={openAddModal}
              disabled={!hasDesktopApi}
              className="btn-gradient-primary mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-semibold disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> 添加任务链
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {unifiedList.map((entry) => {
              if (entry.kind === "preset") {
                const t = entry.template;
                const PresetIcon = chainCategoryIcon(t.category);
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => openPresetDetail(t)}
                    className="group rounded-xl border border-dashed border-border bg-surface-elevated/80 p-4 text-left shadow-xs transition hover:border-primary/40 hover:bg-surface-elevated"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft/80 text-primary">
                        <PresetIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[12.5px] font-semibold text-foreground">{t.name}</span>
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {CHAIN_TEMPLATE_CATEGORY_LABEL[t.category]}
                          </span>
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">官方</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{t.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]">
                      <span className="text-muted-foreground">{t.steps.length} 步</span>
                      <span className="font-medium text-primary">● 官方 · 点击配置</span>
                    </div>
                  </button>
                );
              }

              const c = entry.chain;
              const SavedIcon = chainCategoryIcon(c.category);
              const isOfficial = Boolean(c.official || c.id.startsWith("official-"));
              const st = chainCardStatus(c, { running: chainRunning, activeChainId });
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setDetailId(c.id)}
                  className={cn(
                    "group rounded-xl border bg-surface-elevated p-4 text-left shadow-xs transition hover:border-primary/30",
                    c.enabled ? "border-border" : "border-border opacity-75",
                    activeChainId === c.id && "border-primary/45 ring-1 ring-primary/20",
                    activeChainId === c.id && chainRunning && "border-success/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        c.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      <SavedIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[12.5px] font-semibold text-foreground">{c.name}</span>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {chainCategoryLabel(c.category)}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            isOfficial ? "bg-primary/10 text-primary" : "bg-success/10 text-success",
                          )}
                        >
                          {isOfficial ? "官方" : "我的"}
                        </span>
                        {activeChainId === c.id ? (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            当前链
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                        {c.description || `${c.stepCount} 步 · ${st.progress}`}
                      </p>
                    </div>
                    <span
                      role="button"
                      onClick={(e) => void toggleEnabled(c, e)}
                      className={cn(
                        "cursor-pointer rounded-md p-1.5 transition",
                        c.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary",
                      )}
                      title={c.enabled ? "停用" : "启用"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]">
                    <span className="text-muted-foreground">{st.progress}</span>
                    <span
                      className={cn(
                        "font-medium",
                        st.tone === "success" && "text-success",
                        st.tone === "primary" && "text-primary",
                        st.tone === "warning" && "text-warning",
                        st.tone === "muted" && "text-muted-foreground",
                      )}
                    >
                      {st.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {addOpen && (
        <ChainAddDrawer
          name={addName}
          description={addDesc}
          steps={addSteps}
          agents={agentList}
          skills={skillList}
          mcps={mcpList}
          submitting={addSubmitting}
          onNameChange={setAddName}
          onDescChange={setAddDesc}
          onStepsChange={setAddSteps}
          onClose={() => setAddOpen(false)}
          onSubmit={() => void submitAdd()}
        />
      )}

      {selectedPreset && (
        <PresetChainDrawer
          template={selectedPreset}
          agents={agentList}
          skills={skillList}
          mcps={mcpList}
          createName={presetCreateName}
          vars={presetDetailVars}
          steps={presetDetailSteps}
          stepsDirty={presetStepsDirty}
          creating={presetCreating}
          disabled={!hasDesktopApi}
          onCreateNameChange={setPresetCreateName}
          onVarsChange={(v) => {
            setPresetDetailVars(v);
          }}
          onStepsChange={(s) => {
            setPresetDetailSteps(s);
            setPresetStepsDirty(true);
          }}
          onRegenerateSteps={regeneratePresetSteps}
          onClose={() => {
            setPresetDetailId(null);
            setPresetStepsDirty(false);
          }}
          onActivate={() => void activatePreset(selectedPreset, presetCreateName, presetDetailSteps)}
        />
      )}

      {detail && (
        <ChainDetailDrawer
          chain={detail}
          steps={detailSteps}
          agents={agentList}
          skills={skillList}
          mcps={mcpList}
          dirty={detailDirty}
          saving={detailSaving}
          running={chainRunning && activeChainId === detail.id}
          activeChainId={activeChainId}
          onClose={() => setDetailId(null)}
          onStepsChange={(s) => {
            setDetailSteps(s);
            setDetailDirty(true);
          }}
          onSave={() => void saveDetail()}
          onRun={() => void runDetail()}
          onStop={() => stopChainExecution()}
          onResetProgress={() => void resetDetailProgress()}
          onDelete={() => void deleteDetail()}
          onToggleEnabled={() => void toggleEnabled(detail)}
        />
      )}
    </AppShell>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: number | string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 shadow-xs">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-[22px] font-bold tracking-tight text-foreground", valueClass)}>{value}</div>
    </div>
  );
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
  onActivate,
}: {
  template: ChainTemplate;
  agents: ClaudeAgentRow[];
  skills: ClaudeSkillRow[];
  mcps: ClaudeMcpRow[];
  createName: string;
  vars: Record<ChainTemplateVarKey, string>;
  steps: ChainStep[];
  stepsDirty: boolean;
  creating: boolean;
  disabled?: boolean;
  onCreateNameChange: (v: string) => void;
  onVarsChange: (v: Record<ChainTemplateVarKey, string>) => void;
  onStepsChange: (s: ChainStep[]) => void;
  onRegenerateSteps: () => void;
  onClose: () => void;
  onActivate: () => void;
}) {
  const DrawerIcon = chainCategoryIcon(template.category);
  const unionSkills = useMemo(() => skillsUnionFromSteps(steps, agents), [steps, agents]);
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={onClose} />
      <div className="flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <DrawerIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{template.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {CHAIN_TEMPLATE_CATEGORY_LABEL[template.category]} · 官方
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-[12.5px] leading-relaxed text-foreground/80">{template.description}</p>

          <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">会用到的 Agent</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {template.agents.map((a) => (
                <span key={a} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  {agentDisplayNameForStem(a, agents)}
                </span>
              ))}
            </div>
          </div>

          {unionSkills.length > 0 ? (
            <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
              <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                关联 Skill（来自各步 Agent 配置）
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {unionSkills.map((s) => (
                  <span
                    key={s}
                    title={s}
                    className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-foreground/80"
                  >
                    {skillDisplayNameForStem(s, skills)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              保存到我的任务链（名称） <RequiredMark />
            </label>
            <input
              value={createName}
              onChange={(e) => onCreateNameChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12px] outline-none focus:border-primary"
            />
          </div>

          {template.vars.length > 0
            ? template.vars.map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    {CHAIN_TEMPLATE_VAR_LABELS[key]}
                  </label>
                  <input
                    value={vars[key]}
                    onChange={(e) => onVarsChange({ ...vars, [key]: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12px] outline-none focus:border-primary"
                  />
                </div>
              ))
            : null}

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[12px] font-medium">
                步骤 <RequiredMark />
              </div>
              {stepsDirty ? (
                <button
                  type="button"
                  onClick={onRegenerateSteps}
                  className="text-[11px] text-primary hover:underline"
                >
                  重新套用模板
                </button>
              ) : null}
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">
              可先填上方项目信息自动生成步骤，也可直接改 Agent 和每步任务说明。
            </p>
            <ChainStepsEditor steps={steps} agents={agents} skills={skills} mcps={mcps} onStepsChange={onStepsChange} />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-secondary">
            取消
          </button>
          <button
            type="button"
            disabled={disabled || creating}
            onClick={onActivate}
            className="btn-gradient-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> {creating ? "添加中…" : "添加到我的任务链"}
          </button>
        </div>
      </div>
    </div>
  );
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
  showProgress = false,
}: {
  steps: ChainStep[];
  agents: ClaudeAgentRow[];
  skills: ClaudeSkillRow[];
  mcps: ClaudeMcpRow[];
  onStepsChange: (s: ChainStep[]) => void;
  disabled?: boolean;
  currentIndex?: number;
  running?: boolean;
  showProgress?: boolean;
}) {
  const availableSkillStems = useMemo(() => new Set(skills.map((s) => s.stem)), [skills]);

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const agentRow = agents.find((a) => a.stem === step.agentName);
        const stepSkills = step.agentName
          ? suggestedSkillStemsForAgent(step.agentName, availableSkillStems, agentRow?.skills)
          : [];
        const isDone = showProgress && i < currentIndex;
        const isCurrent = showProgress && i === currentIndex && currentIndex < steps.length;
        return (
          <div
            key={i}
            className={cn(
              "rounded-lg border p-3 space-y-2",
              showProgress && running && isCurrent
                ? "border-success/40 bg-success/5"
                : isDone
                  ? "border-primary/20 opacity-90"
                  : "border-border",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">
                步骤 {i + 1}
                {showProgress
                  ? isDone
                    ? " · 已完成"
                    : isCurrent
                      ? running
                        ? " · 执行中"
                        : " · 下一待执行"
                      : ""
                  : null}
              </span>
              <button
                type="button"
                disabled={disabled || steps.length <= 1}
                className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                onClick={() => onStepsChange(steps.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">
                  Agent <RequiredMark />
                </div>
                <AgentStemCombobox
                  value={step.agentName}
                  agents={agents}
                  disabled={disabled}
                  placeholder="选择或搜索 Agent"
                  onChange={(stem) =>
                    onStepsChange(
                      steps.map((x, j) => {
                        if (j !== i) return x;
                        const agentRow = agents.find((a) => a.stem === stem);
                        const nextSkills = suggestedSkillStemsForAgent(
                          stem,
                          availableSkillStems,
                          agentRow?.skills,
                        );
                        return { ...x, agentName: stem, skills: nextSkills };
                      }),
                    )
                  }
                />
              </div>
              <input
                value={step.taskId}
                disabled={disabled}
                onChange={(e) =>
                  onStepsChange(steps.map((x, j) => (j === i ? { ...x, taskId: e.target.value } : x)))
                }
                placeholder="任务编号（可选，如 第1步）"
                className="h-8 rounded-md border border-border bg-background px-2 font-mono text-[12px] outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium text-foreground/80">关联 Skill</div>
              <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-border bg-secondary/30 px-2 py-1.5">
                {stepSkills.length ? (
                  stepSkills.map((stem) => (
                    <span
                      key={stem}
                      title={stem}
                      className="inline-flex max-w-[9.5rem] shrink-0 items-center rounded bg-secondary/80 px-1.5 py-0.5 text-[10.5px] text-foreground/90"
                    >
                      <span className="truncate">{skillDisplayNameForStem(stem, skills)}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-muted-foreground">
                    {step.agentName ? "该 Agent 未配置 Skill" : "请先选择 Agent"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                由所选 Agent 的 <code className="font-mono text-[10px]">skills:</code> 自动带入，不可修改
              </p>
            </div>
            <McpNameMultiSelect
              value={step.mcps}
              mcps={mcps}
              disabled={disabled}
              placeholder="关联 MCP（可选）"
              onChange={(names) =>
                onStepsChange(steps.map((x, j) => (j === i ? { ...x, mcps: names } : x)))
              }
            />
            <textarea
              value={step.instruction}
              disabled={disabled}
              onChange={(e) =>
                onStepsChange(steps.map((x, j) => (j === i ? { ...x, instruction: e.target.value } : x)))
              }
              rows={3}
              placeholder="本步要做什么（必填，尽量写清楚）"
              className="w-full resize-y rounded-md border border-border bg-background p-2 text-[12px] outline-none focus:border-primary disabled:opacity-50"
            />
          </div>
        );
      })}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onStepsChange([...steps, emptyStep()])}
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-[12px] text-muted-foreground hover:border-primary/40 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" /> 添加步骤
      </button>
    </div>
  );
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
  onSubmit,
}: {
  name: string;
  description: string;
  steps: ChainStep[];
  agents: ClaudeAgentRow[];
  skills: ClaudeSkillRow[];
  mcps: ClaudeMcpRow[];
  submitting: boolean;
  onNameChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onStepsChange: (s: ChainStep[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={onClose} />
      <div className="flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">添加任务链</div>
              <div className="text-[11px] text-muted-foreground">自定义步骤 · 空白链</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              名称 <RequiredMark />
            </label>
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="给这条任务链起个名字，例如：会员登录交付"
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">描述</label>
            <textarea
              value={description}
              onChange={(e) => onDescChange(e.target.value)}
              rows={2}
              placeholder="简单说明这条链是干什么的（可不填）"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[12px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="mb-2 text-[12px] font-medium">
              步骤 <RequiredMark />
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">
              每一步：① Agent（Skill 自动带入）；② MCP（可选）；③ 任务说明。多步时点「添加步骤」。官方请回列表点虚线卡片。
            </p>
            <ChainStepsEditor steps={steps} agents={agents} skills={skills} mcps={mcps} onStepsChange={onStepsChange} />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-secondary">
            取消
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="btn-gradient-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> {submitting ? "创建中…" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
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
  onToggleEnabled,
}: {
  chain: SavedChainDetail;
  steps: ChainStep[];
  agents: ClaudeAgentRow[];
  skills: ClaudeSkillRow[];
  mcps: ClaudeMcpRow[];
  dirty: boolean;
  saving: boolean;
  running: boolean;
  activeChainId: string | null;
  onClose: () => void;
  onStepsChange: (s: ChainStep[]) => void;
  onSave: () => void;
  onRun: () => void;
  onStop: () => void;
  onResetProgress: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
}) {
  const st = chainCardStatus(chain, { running, activeChainId });
  const idx = chain.currentIndex ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={onClose} />
      <div className="flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Workflow className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{chain.name}</div>
              <div className="text-[11px] text-muted-foreground">{chainCategoryLabel(chain.category)} · {st.progress}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {chain.description ? (
            <p className="text-[12.5px] leading-relaxed text-foreground/80">{chain.description}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
              <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">执行状态</div>
              <div className={cn("mt-0.5 text-[13px] font-semibold", st.tone === "success" && "text-success", st.tone === "primary" && "text-primary", st.tone === "warning" && "text-warning")}>
                {st.label.replace(/^●\s*/, "")}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
              <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">进度</div>
              <div className="mt-0.5 text-[13px] font-semibold tabular-nums">{st.progress}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[12px] font-medium">步骤</div>
            <ChainStepsEditor
              steps={steps}
              agents={agents}
              skills={skills}
              mcps={mcps}
              onStepsChange={onStepsChange}
              disabled={running}
              currentIndex={idx}
              running={running}
              showProgress
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          {running ? (
            <button type="button" onClick={onStop} className="btn-row border-destructive/40 text-destructive">
              <Square className="h-3 w-3" /> 停止
            </button>
          ) : (
            <button
              type="button"
              disabled={!chain.enabled || dirty}
              onClick={onRun}
              className="btn-gradient-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" /> 后台执行
            </button>
          )}
          <button type="button" disabled={saving || !dirty} onClick={onSave} className="btn-row">
            <Save className="h-3.5 w-3.5" /> {saving ? "保存中" : "保存"}
          </button>
          <button type="button" disabled={running} onClick={onResetProgress} className="btn-row text-[12px]">
            重置进度
          </button>
          <button type="button" onClick={onToggleEnabled} className="btn-row text-[12px]">
            <Power className="h-3 w-3" /> {chain.enabled ? "停用" : "启用"}
          </button>
          <button type="button" disabled={running} onClick={onDelete} className="btn-row text-destructive text-[12px]">
            <Trash2 className="h-3 w-3" /> 删除
          </button>
        </div>
      </div>
    </div>
  );
}
