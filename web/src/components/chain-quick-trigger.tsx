import { useState, useCallback } from "react";
import { Loader2, Play, Sparkles, Workflow, ListTodo } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** 一条可快速触发的任务链选项 */
export type QuickChainOption = {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  /** 分组标签 */
  group: string;
  icon?: string;
};

type Props = {
  disabled: boolean;
  chains: QuickChainOption[];
  onTriggerChain: (chainId: string) => Promise<void>;
};

function groupIcon(group: string) {
  switch (group) {
    case "pipeline":
      return <Workflow className="h-3.5 w-3.5 text-sky-500" />;
    case "single":
      return <Play className="h-3.5 w-3.5 text-emerald-500" />;
    case "self-learning":
      return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function groupLabel(group: string): string {
  switch (group) {
    case "pipeline":
      return "多 Agent 流水线";
    case "single":
      return "单 Agent 任务";
    case "self-learning":
      return "自学复盘";
    default:
      return group;
  }
}

/** 快速触发任务链的下拉选择器（置于输入框底栏） */
export function ChainQuickTrigger({ disabled, chains, onTriggerChain }: Props) {
  const [open, setOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleClick = useCallback(
    async (chainId: string) => {
      setRunningId(chainId);
      setOpen(false);
      try {
        await onTriggerChain(chainId);
      } finally {
        setRunningId(null);
      }
    },
    [onTriggerChain],
  );

  // 按 group 分组
  const groups = chains.reduce<Record<string, QuickChainOption[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground disabled:opacity-40"
          title="添加任务链"
        >
          {runningId ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">任务链</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={6}
        className="w-[280px] border-border/80 p-1.5 shadow-lg"
      >
        <div className="max-h-[min(360px,50vh)] overflow-y-auto overscroll-contain scrollbar-thin">
          {Object.entries(groups).map(([group, items]) => (
            <section key={group} className="mb-1 last:mb-0">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {groupLabel(group)}
              </div>
              {items.map((chain) => (
                <button
                  key={chain.id}
                  type="button"
                  disabled={runningId === chain.id}
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition hover:bg-secondary/60 disabled:opacity-50"
                  onClick={() => handleClick(chain.id)}
                >
                  <span className="mt-0.5 shrink-0">{groupIcon(group)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium leading-snug text-foreground">
                      {chain.name}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-tight text-muted-foreground">
                      {chain.description}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground/60">
                      {chain.stepCount} 步
                    </span>
                  </span>
                  {runningId === chain.id ? (
                    <Loader2 className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                  ) : (
                    <Play className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
                  )}
                </button>
              ))}
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
