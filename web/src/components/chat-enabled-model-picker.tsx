import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildChatEnabledModelEntries,
  chatEnabledPoolHint,
  displayModelName,
  filterModelPickerEntries,
  shortModelPickerLabel,
  tierLabel,
  type ModelPickerEntry,
} from "@/lib/model-picker-entries";
import { cn } from "@/lib/utils";

export type ModelPickerLeadingOption = {
  value: string;
  label: string;
  hint?: string;
  isSelected: (value: string) => boolean;
  matchesQuery?: (query: string) => boolean;
};

type Props = {
  cloudModels: string[];
  localModels: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  leadingOptions?: ModelPickerLeadingOption[];
  extraModels?: string[];
  variant?: "composer" | "form";
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  placeholder?: string;
  ariaLabel?: string;
};

function ModelPickerRows({
  leadingOptions,
  entries,
  query,
  selectedValue,
  onSelect,
}: {
  leadingOptions: ModelPickerLeadingOption[];
  entries: ModelPickerEntry[];
  query: string;
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const showLeading = !q
    ? leadingOptions
    : leadingOptions.filter((opt) => opt.matchesQuery?.(q) ?? opt.label.toLowerCase().includes(q));

  return (
    <>
      {showLeading.map((opt) => {
        const active = opt.isSelected(selectedValue);
        return (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "model-picker-row flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition",
              active && "model-picker-row--active",
            )}
            onClick={() => onSelect(opt.value)}
          >
            <span className="min-w-0 flex-1 truncate font-medium">{opt.label}</span>
            {opt.hint ? (
              <span className="shrink-0 text-[10.5px] text-muted-foreground">{opt.hint}</span>
            ) : null}
            {active ? <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} /> : null}
          </button>
        );
      })}

      {entries.length ? (
        entries.map((entry) => {
          const active = entry.model === selectedValue.trim();
          return (
            <button
              key={`${entry.mode}:${entry.model}`}
              type="button"
              className={cn(
                "model-picker-row flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition",
                active && "model-picker-row--active",
              )}
              onClick={() => onSelect(entry.model)}
            >
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="truncate font-medium">{displayModelName(entry.model)}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{tierLabel(entry.tier)}</span>
              </span>
              {active ? <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} /> : null}
            </button>
          );
        })
      ) : q ? (
        <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">无匹配模型</p>
      ) : leadingOptions.length === 0 ? (
        <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">暂无可用模型</p>
      ) : null}
    </>
  );
}

export function ChatEnabledModelPicker({
  cloudModels,
  localModels,
  value,
  onChange,
  disabled,
  leadingOptions = [],
  extraModels = [],
  variant = "form",
  side = "bottom",
  align = "start",
  placeholder = "选择模型",
  ariaLabel = "选择模型",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const entries = useMemo(() => {
    const all = buildChatEnabledModelEntries(cloudModels, localModels, extraModels);
    return filterModelPickerEntries(all, query);
  }, [cloudModels, extraModels, localModels, query]);

  const selectedValue = value.trim();
  const displayLabel = useMemo(() => {
    const leading = leadingOptions.find((opt) => opt.isSelected(selectedValue || value));
    if (leading) return leading.label;
    if (selectedValue) return shortModelPickerLabel(selectedValue);
    return placeholder;
  }, [leadingOptions, placeholder, selectedValue, value]);

  const title = useMemo(() => {
    const leading = leadingOptions.find((opt) => opt.isSelected(selectedValue || value));
    if (leading?.hint) return `${leading.label}（${leading.hint}）`;
    return selectedValue || placeholder;
  }, [leadingOptions, placeholder, selectedValue, value]);

  const pick = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
  };

  const triggerClass =
    variant === "composer"
      ? cn(
          "composer-model-pill inline-flex max-w-[5.5rem] items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition",
          "text-foreground/90 hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40",
          "data-[state=open]:bg-secondary/70",
        )
      : cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-elevated px-3 text-[12px] outline-none transition",
          "hover:bg-secondary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-40 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20",
        );

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
        <button type="button" disabled={disabled} title={title} aria-label={ariaLabel} className={triggerClass}>
          <span className={cn("min-w-0 truncate text-left", variant === "form" && "font-mono")}>
            {displayLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-55" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
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
          <ModelPickerRows
            leadingOptions={leadingOptions}
            entries={entries}
            query={query}
            selectedValue={selectedValue}
            onSelect={pick}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildAutoLeadingOption(
  cloudModels: string[],
  localModels: string[],
  isAuto: (value: string) => boolean,
): ModelPickerLeadingOption {
  return {
    value: "auto",
    label: "Auto",
    hint: chatEnabledPoolHint(cloudModels, localModels),
    isSelected: isAuto,
    matchesQuery: (q) => "auto".includes(q),
  };
}

export function buildInheritLeadingOption(isInherit: (value: string) => boolean): ModelPickerLeadingOption {
  return {
    value: "inherit",
    label: "inherit",
    hint: "跟随聊天",
    isSelected: isInherit,
    matchesQuery: (q) => "inherit".includes(q) || "跟随".includes(q) || "聊天".includes(q),
  };
}

export function AgentModelPicker({
  cloudModels,
  localModels,
  value,
  onChange,
  disabled,
  customModel,
  emptyHint,
}: {
  cloudModels: string[];
  localModels: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  customModel?: string | null;
  emptyHint?: ReactNode;
}) {
  const resolved = value.trim() || "inherit";
  const leadingOptions = useMemo(
    () => [
      buildInheritLeadingOption((v) => {
        const m = v.trim();
        return !m || m === "inherit";
      }),
    ],
    [],
  );

  return (
    <div>
      <ChatEnabledModelPicker
        variant="form"
        cloudModels={cloudModels}
        localModels={localModels}
        extraModels={customModel ? [customModel] : []}
        value={resolved}
        onChange={onChange}
        disabled={disabled}
        leadingOptions={leadingOptions}
        placeholder="inherit"
        ariaLabel="选择 Agent 模型"
      />
      {emptyHint}
    </div>
  );
}
