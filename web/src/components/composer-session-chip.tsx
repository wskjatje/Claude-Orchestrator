import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDesktop } from "@/lib/desktop-api";
import {
  agentStemFromBasename,
  GENERAL_AGENT_DISPLAY_NAME,
  isAutoAgentBasename,
} from "@/lib/agent-basename";
import { agentMatchesDisplayQuery, resolveAgentDisplayName } from "@/lib/agent-display-name";
import { dedupeAgentRowsByStem } from "@/lib/dedupe-agent-rows";
import { dedupeSkillStems } from "@/lib/agent-skill-defaults";
import {
  filterSkillsByQuery,
  skillDisplayNameForStem,
  useClaudeSkillList,
} from "@/hooks/use-claude-skill-list";
import {
  cycleWorkbenchInteractionMode,
  getWorkbenchInteractionMode,
  interactionModeLabel,
  setWorkbenchInteractionMode,
  subscribeWorkbenchInteractionMode,
  type WorkbenchInteractionMode,
} from "@/lib/workbench-interaction-mode";
import { cn } from "@/lib/utils";

const AUTO_AGENT_VALUE = "";
/** 与 cycleWorkbenchInteractionMode 同序（Cursor：Agent → Plan → Ask） */
const MODES: WorkbenchInteractionMode[] = ["agent", "plan", "ask"];

type AgentRow = {
  basename: string;
  stem: string;
  description: string;
  displayName: string;
  name?: string;
  nameZh?: string;
  heading?: string;
  source: "root" | "sanshengliubu";
};

type Props = {
  agentBasename: string;
  onAgentChange: (basename: string) => void;
  selectedSkillStems?: string[];
  onSelectedSkillStemsChange?: (stems: string[]) => void;
  disabled?: boolean;
};

/**
 * 会话控件：交互模式 + 角色 + 本轮 Skill 合一（单入口，能力不丢）。
 */
export function ComposerSessionChip({
  agentBasename,
  onAgentChange,
  selectedSkillStems = [],
  onSelectedSkillStemsChange,
  disabled,
}: Props) {
  const mode = useSyncExternalStore(
    subscribeWorkbenchInteractionMode,
    getWorkbenchInteractionMode,
    getWorkbenchInteractionMode,
  );
  const [open, setOpen] = useState(false);
  const [agentQuery, setAgentQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const isAuto = isAutoAgentBasename(agentBasename);
  const activeStem = isAuto ? "" : agentStemFromBasename(agentBasename);
  const { skills, loading: skillsLoading } = useClaudeSkillList();
  const selectedSkills = useMemo(() => dedupeSkillStems(selectedSkillStems), [selectedSkillStems]);
  const selectedSkillSet = useMemo(() => new Set(selectedSkills), [selectedSkills]);
  const skillUi = Boolean(onSelectedSkillStemsChange);

  const reloadAgents = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAgentsLoading(true);
    setAgents([]);
    const api = getDesktop();
    if (!api?.listClaudeAgentMarkdown) {
      setAgentsLoading(false);
      return;
    }
    try {
      const r = await api.listClaudeAgentMarkdown();
      if (ctrl.signal.aborted) return;
      if (!r.ok || !r.items?.length) {
        setAgentsLoading(false);
        return;
      }
      setAgents(
        dedupeAgentRowsByStem(
          r.items.map((row) => {
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
              basename: row.basename,
              stem: row.stem,
              description: row.description ?? "",
              displayName,
              name: row.name,
              nameZh: row.nameZh,
              heading: row.heading,
              source: row.source,
            };
          }),
        ),
      );
      setAgentsLoading(false);
    } catch {
      if (!ctrl.signal.aborted) setAgentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAgents();
  }, [reloadAgents]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key !== "Tab") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest(".cm-editor")) return;
      if (!t?.closest("[data-workbench-composer]")) return;
      e.preventDefault();
      cycleWorkbenchInteractionMode();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const activeAgent = agents.find((a) => a.stem === activeStem);
  const roleLabel = isAuto
    ? GENERAL_AGENT_DISPLAY_NAME
    : (activeAgent?.displayName ?? activeStem) || GENERAL_AGENT_DISPLAY_NAME;

  const aq = agentQuery.trim().toLowerCase();
  const showAuto =
    !aq ||
    aq.includes("auto") ||
    aq.includes("agent") ||
    aq.includes("自动") ||
    aq.includes("关键词") ||
    aq.includes("通用");

  const filteredAgents = useMemo(() => {
    if (!aq) return agents;
    return agents.filter((a) =>
      agentMatchesDisplayQuery(
        {
          stem: a.stem,
          basename: a.basename,
          name: a.name,
          nameZh: a.nameZh,
          heading: a.heading,
          description: a.description,
          displayName: a.displayName,
        },
        aq,
      ),
    );
  }, [agents, aq]);

  const filteredSkills = useMemo(
    () => filterSkillsByQuery(skills, skillQuery),
    [skills, skillQuery],
  );

  const pickAgent = (basename: string) => {
    onAgentChange(basename);
    setAgentQuery("");
  };

  const toggleSkill = (stem: string) => {
    if (!onSelectedSkillStemsChange) return;
    if (selectedSkillSet.has(stem)) {
      onSelectedSkillStemsChange(selectedSkills.filter((s) => s !== stem));
    } else {
      onSelectedSkillStemsChange([...selectedSkills, stem]);
    }
  };

  const triggerTitle = [
    `${interactionModeLabel(mode)}（Shift+Tab 切换）`,
    `角色：${roleLabel}`,
    selectedSkills.length
      ? `Skill：${selectedSkills.map((s) => skillDisplayNameForStem(s, skills)).join("、")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <DropdownMenu
      open={open}
      modal={false}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) {
          setAgentQuery("");
          setSkillQuery("");
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={triggerTitle}
          aria-label="会话：模式、角色与 Skill"
          className={cn(
            "composer-agent-pill inline-flex max-w-[11rem] items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition",
            "text-foreground/90 hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40",
            "data-[state=open]:bg-secondary/70",
          )}
        >
          <span className="truncate">{interactionModeLabel(mode)}</span>
          {!isAuto ? (
            <span className="truncate font-normal text-muted-foreground">· {roleLabel}</span>
          ) : null}
          {selectedSkills.length ? (
            <span className="shrink-0 rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
              {selectedSkills.length}
            </span>
          ) : null}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-55" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={8}
        className="model-picker-menu w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border/80 px-2 py-2">
          <p className="mb-1.5 px-0.5 text-[11px] font-medium text-muted-foreground">模式</p>
          <div className="inline-flex w-full items-center gap-0.5 rounded-md bg-secondary/40 p-0.5">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                className={cn(
                  "composer-chrome-chip min-w-0 flex-1 justify-center",
                  mode === m && "composer-chrome-chip--active",
                )}
                onClick={() => setWorkbenchInteractionMode(m)}
              >
                {interactionModeLabel(m)}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-border/80 px-2 py-2" onPointerDown={(e) => e.stopPropagation()}>
          <p className="mb-1.5 px-0.5 text-[11px] font-medium text-muted-foreground">角色</p>
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={agentQuery}
              onChange={(e) => setAgentQuery(e.target.value)}
              placeholder="搜索角色"
              className="h-8 w-full rounded-md border-0 bg-secondary/50 pl-8 pr-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:bg-secondary/80"
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="model-picker-list max-h-[min(28vh,10rem)] overflow-y-auto scrollbar-thin">
            {showAuto ? (
              <button
                type="button"
                className={cn(
                  "model-picker-row flex w-full items-start gap-2 px-2 py-1.5 text-left text-[12px] transition",
                  isAuto && "model-picker-row--active",
                )}
                onClick={() => pickAgent(AUTO_AGENT_VALUE)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">Auto</div>
                  <div className="text-[11px] text-muted-foreground">不设角色限制</div>
                </div>
                {isAuto ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                ) : null}
              </button>
            ) : null}
            {filteredAgents.length ? (
              filteredAgents.map((agent) => {
                const active = !isAuto && agent.stem === activeStem;
                return (
                  <button
                    key={`${agent.source}:${agent.stem}`}
                    type="button"
                    className={cn(
                      "model-picker-row flex w-full items-start gap-2 px-2 py-1.5 text-left text-[12px] transition",
                      active && "model-picker-row--active",
                    )}
                    onClick={() => pickAgent(agent.basename)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{agent.displayName}</div>
                      {agent.description ? (
                        <div className="line-clamp-1 text-[11px] text-muted-foreground">
                          {agent.description}
                        </div>
                      ) : null}
                    </div>
                    {active ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                    ) : null}
                  </button>
                );
              })
            ) : agents.length ? (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">无匹配</p>
            ) : agentsLoading ? (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">加载中…</p>
            ) : (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">未扫描到角色</p>
            )}
          </div>
        </div>

        {skillUi ? (
          <div className="border-b border-border/80 px-2 py-2" onPointerDown={(e) => e.stopPropagation()}>
            <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">本轮 Skill</p>
              {selectedSkills.length ? (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => onSelectedSkillStemsChange?.([])}
                >
                  清除
                </button>
              ) : null}
            </div>
            <input
              type="search"
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="搜索 Skill（可选）"
              className="mb-1.5 h-8 w-full rounded-md border-0 bg-secondary/50 px-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:bg-secondary/80"
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="max-h-[min(28vh,10rem)] overflow-y-auto scrollbar-thin">
              {filteredSkills.length ? (
                filteredSkills.map((skill) => {
                  const active = selectedSkillSet.has(skill.stem);
                  return (
                    <button
                      key={`${skill.source}:${skill.stem}`}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition hover:bg-secondary/80",
                        active && "bg-primary/5",
                      )}
                      onClick={() => toggleSkill(skill.stem)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{skill.displayName}</div>
                        {skill.description ? (
                          <div className="line-clamp-1 text-[11px] text-muted-foreground">
                            {skill.description}
                          </div>
                        ) : null}
                      </div>
                      {active ? (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                      ) : null}
                    </button>
                  );
                })
              ) : skillsLoading ? (
                <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">加载中…</p>
              ) : skills.length ? (
                <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">无匹配</p>
              ) : (
                <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">暂无 Skill</p>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1 px-2 py-1.5">
          <Link
            to="/agents"
            className="rounded-md px-2 py-1 text-[12px] text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            管理角色
          </Link>
          <Link
            to="/skills"
            className="rounded-md px-2 py-1 text-[12px] text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            管理 Skill
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
