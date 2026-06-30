import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDesktop } from "@/lib/desktop-api";
import { agentStemFromBasename, GENERAL_AGENT_DISPLAY_NAME, isAutoAgentBasename } from "@/lib/agent-basename";
import {
  agentMatchesDisplayQuery,
  resolveAgentDisplayName,
} from "@/lib/agent-display-name";
import { dedupeAgentRowsByStem } from "@/lib/dedupe-agent-rows";
import { cn } from "@/lib/utils";

const AUTO_AGENT_VALUE = "";

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
  disabled?: boolean;
};

export function ChatAgentSelector({ agentBasename, onAgentChange, disabled }: Props) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const isAuto = isAutoAgentBasename(agentBasename);
  const activeStem = isAuto ? "" : agentStemFromBasename(agentBasename);

  const reload = useCallback(async () => {
    const api = getDesktop();
    if (!api?.listClaudeAgentMarkdown) return;
    const r = await api.listClaudeAgentMarkdown();
    if (!r.ok || !r.items?.length) return;
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
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeAgent = agents.find((a) => a.stem === activeStem);
  const subtitle = isAuto
    ? GENERAL_AGENT_DISPLAY_NAME
    : (activeAgent?.displayName ?? activeStem);
  const buttonLabel = isAuto ? GENERAL_AGENT_DISPLAY_NAME : ((activeAgent?.displayName ?? activeStem) || GENERAL_AGENT_DISPLAY_NAME);

  const q = query.trim().toLowerCase();
  const showAuto = !q || q.includes("auto") || q.includes("agent") || q.includes("自动") || q.includes("关键词") || q.includes("通用");

  const filteredAgents = useMemo(() => {
    if (!q) return agents;
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
        q,
      ),
    );
  }, [agents, q]);

  const pickAgent = (basename: string) => {
    onAgentChange(basename);
    setQuery("");
    setOpen(false);
  };

  return (
    <DropdownMenu
      open={open}
      modal={false}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={`Agent · ${subtitle}`}
          aria-label="选择 Agent"
          className={cn(
            "composer-agent-pill inline-flex max-w-[9rem] items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition",
            "text-foreground/90 hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40",
            "data-[state=open]:bg-secondary/70",
          )}
        >
          <span className="truncate">{buttonLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-55" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={8}
        className="model-picker-menu w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className="border-b border-border/80 px-2 py-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索 Agent"
              className="h-8 w-full rounded-md border-0 bg-secondary/50 pl-8 pr-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:bg-secondary/80"
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <div className="model-picker-list max-h-[min(50vh,18rem)] overflow-y-auto py-1 scrollbar-thin">
          {showAuto ? (
            <button
              type="button"
              className={cn(
                "model-picker-row flex w-full items-start gap-2 px-3 py-2 text-left text-[12px] transition",
                isAuto && "model-picker-row--active",
              )}
              onClick={() => pickAgent(AUTO_AGENT_VALUE)}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{GENERAL_AGENT_DISPLAY_NAME}</div>
                <div className="text-[10.5px] text-muted-foreground">
                  通用模式 · 不设角色限制
                </div>
              </div>
              {isAuto ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} /> : null}
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
                    "model-picker-row flex w-full items-start gap-2 px-3 py-2 text-left text-[12px] transition",
                    active && "model-picker-row--active",
                  )}
                  onClick={() => pickAgent(agent.basename)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{agent.displayName}</div>
                    {agent.description ? (
                      <div className="line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">
                        {agent.description}
                      </div>
                    ) : (
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {agent.stem}
                      </div>
                    )}
                  </div>
                  {active ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                  ) : null}
                </button>
              );
            })
          ) : agents.length ? (
            <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">无匹配 Agent</p>
          ) : (
            <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">未扫描到 Agent 文件</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
