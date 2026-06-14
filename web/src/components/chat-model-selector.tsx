import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AUTO_MODEL_ID } from "@/lib/model-catalog";
import { cn } from "@/lib/utils";

type OrchMode = "claude-code" | "local-mcp";

export type ModelPick = {
  mode: OrchMode;
  model: string;
};

type ModelEntry = {
  mode: OrchMode;
  model: string;
  tier: string;
};

type Props = {
  orchMode: OrchMode;
  cloudModels: string[];
  localModels: string[];
  modelValue: string;
  onModelPick: (pick: ModelPick) => void;
  modelFallback: string;
  disabled?: boolean;
};

function tierLabel(tier: string): string {
  if (tier === "Fast") return "快速";
  if (tier === "High") return "高质";
  if (tier === "Local") return "本地";
  if (tier === "Cloud") return "云端";
  return tier;
}

function tierForCloud(model: string): string {
  const id = model.trim().toLowerCase();
  if (id === "sonnet" || id === "haiku") return "Fast";
  if (id === "opus") return "High";
  if (id.includes("opus")) return "High";
  if (id.includes("haiku")) return "Fast";
  if (id.includes("sonnet")) return "Fast";
  if (id.includes("flash")) return "Fast";
  if (id.includes("pro")) return "High";
  return "Cloud";
}

function buildModelEntries(cloudModels: string[], localModels: string[]): ModelEntry[] {
  const cloud = cloudModels.filter(Boolean).map((model) => ({
    mode: "claude-code" as const,
    model,
    tier: tierForCloud(model),
  }));
  const local = localModels.filter(Boolean).map((model) => ({
    mode: "local-mcp" as const,
    model,
    tier: "Local",
  }));
  return [...cloud, ...local];
}

function isAutoModel(model: string): boolean {
  const m = model.trim().toLowerCase();
  return !m || m === AUTO_MODEL_ID;
}

function shortModelLabel(model: string, mode: OrchMode): string {
  if (isAutoModel(model)) return "Auto";
  const m = model.trim();
  if (mode === "local-mcp" && !m) return "Local";
  const tail = m.includes("/") ? m.split("/").pop()! : m;
  if (tail.length <= 22) return tail;
  return `${tail.slice(0, 20)}…`;
}

function displayModelName(model: string): string {
  const m = model.trim();
  if (/^(sonnet|opus|haiku)$/i.test(m)) return m.charAt(0).toUpperCase() + m.slice(1);
  return m;
}

export function ChatModelSelector({
  orchMode,
  cloudModels,
  localModels,
  modelValue,
  onModelPick,
  modelFallback,
  disabled,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedModel = modelValue || modelFallback || "";
  const isAutoSelected = isAutoModel(selectedModel);
  const displayLabel = shortModelLabel(selectedModel, orchMode);

  const entries = useMemo(
    () => buildModelEntries(cloudModels, localModels),
    [cloudModels, localModels],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.model.toLowerCase().includes(q) ||
        e.tier.toLowerCase().includes(q) ||
        (e.mode === "claude-code" && "cloud".includes(q)) ||
        (e.mode === "local-mcp" && "local".includes(q)) ||
        "auto".includes(q),
    );
  }, [entries, query]);

  const autoAvailable = cloudModels.length > 0 || localModels.length > 0;
  const autoPick: ModelPick = { mode: "claude-code", model: AUTO_MODEL_ID };

  const pickModel = (pick: ModelPick) => {
    onModelPick(pick);
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
          title={isAutoSelected ? "Auto（云模型优先，无云则用本地）" : selectedModel || "选择模型"}
          aria-label="选择模型"
          className={cn(
            "composer-model-pill inline-flex max-w-[5.5rem] items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition",
            "text-foreground/90 hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40",
            "data-[state=open]:bg-secondary/70",
          )}
        >
          <span className="min-w-0 truncate">{isAutoSelected ? "Auto" : displayLabel}</span>
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
              placeholder="搜索模型"
              className="h-8 w-full rounded-md border-0 bg-secondary/50 pl-8 pr-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:bg-secondary/80"
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <div className="model-picker-list max-h-[min(50vh,18rem)] overflow-y-auto py-1 scrollbar-thin">
          {!query.trim() && autoAvailable ? (
            <button
              type="button"
              className={cn(
                "model-picker-row flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition",
                isAutoSelected && "model-picker-row--active",
              )}
              onClick={() => pickModel(autoPick)}
            >
              <span className="min-w-0 flex-1 truncate font-medium">Auto</span>
              <span className="text-[10.5px] text-muted-foreground">云优先</span>
              {isAutoSelected ? (
                <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
              ) : null}
            </button>
          ) : null}

          {filtered.length ? (
            filtered.map((entry) => {
              const active =
                !isAutoSelected && orchMode === entry.mode && entry.model === selectedModel;
              return (
                <button
                  key={`${entry.mode}:${entry.model}`}
                  type="button"
                  className={cn(
                    "model-picker-row flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition",
                    active && "model-picker-row--active",
                  )}
                  onClick={() => pickModel({ mode: entry.mode, model: entry.model })}
                >
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="truncate font-medium">{displayModelName(entry.model)}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{tierLabel(entry.tier)}</span>
                  </span>
                  {active ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">无匹配模型</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
