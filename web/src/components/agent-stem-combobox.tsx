import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  agentDisplayNameForStem,
  filterAgentsByQuery,
  resolveAgentStemFromInput,
  type ClaudeAgentRow,
} from "@/hooks/use-claude-agent-list";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  agents: ClaudeAgentRow[];
  onChange: (stem: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function AgentStemCombobox({
  value,
  agents,
  onChange,
  disabled,
  placeholder = "选择或搜索 Agent",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const skipCommitRef = useRef(false);

  const matched = useMemo(
    () => agents.find((a) => a.stem === value.trim()),
    [agents, value],
  );

  useEffect(() => {
    if (open) return;
    setQuery(agentDisplayNameForStem(value, agents));
  }, [value, agents, open]);

  const filtered = useMemo(() => filterAgentsByQuery(agents, query), [agents, query]);

  const commitInput = (text: string) => {
    onChange(resolveAgentStemFromInput(text, agents));
  };

  const pickAgent = (agent: ClaudeAgentRow) => {
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

  return (
    <Popover
      open={open}
      modal={false}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (next) {
          setQuery(matched?.displayName ?? value);
        } else if (!skipCommitRef.current) {
          commitInput(query);
        }
        skipCommitRef.current = false;
      }}
    >
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <input
            ref={inputRef}
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (disabled) return;
              setOpen(true);
              setQuery(matched?.displayName ?? value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                return;
              }
              if (e.key === "Enter" && filtered[0]) {
                e.preventDefault();
                pickAgent(filtered[0]);
              }
            }}
            className={cn(
              "h-8 w-full rounded-md border border-border bg-background py-0 pl-2 text-[12px] outline-none focus:border-primary disabled:opacity-50",
              hasValue ? "pr-12" : "pr-7",
            )}
          />
          {hasValue && !disabled ? (
            <button
              type="button"
              title="清除已选"
              aria-label="清除已选 Agent"
              className="absolute right-6 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/70 transition hover:bg-secondary hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearAgent}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={8}
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-[min(16rem,40vh)] overflow-y-auto py-1 scrollbar-thin">
          {filtered.length ? (
            filtered.map((agent) => {
              const active = agent.stem === value.trim();
              return (
                <button
                  key={`${agent.source}:${agent.stem}`}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 px-2.5 py-2 text-left text-[12px] transition hover:bg-secondary/80",
                    active && "bg-primary/5",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickAgent(agent)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{agent.displayName}</div>
                    {agent.description ? (
                      <div className="line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">
                        {agent.description}
                      </div>
                    ) : (
                      <div className="truncate font-mono text-[10px] text-muted-foreground">{agent.stem}</div>
                    )}
                  </div>
                  {active ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} /> : null}
                </button>
              );
            })
          ) : agents.length ? (
            <p className="px-3 py-3 text-center text-[12px] text-muted-foreground">没有找到匹配的 Agent</p>
          ) : (
            <p className="px-3 py-3 text-center text-[12px] text-muted-foreground">
              本机还没有 Agent 文件，也可手动输入 Agent 英文名
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
