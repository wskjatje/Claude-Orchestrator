import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { filterMcpsByQuery, type ClaudeMcpRow } from "@/hooks/use-claude-mcp-list";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  mcps: ClaudeMcpRow[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function chipLabel(name: string, mcps: ClaudeMcpRow[]): string {
  const row = mcps.find((m) => m.name === name);
  const label = row?.label ?? name;
  if (label.length <= 14) return label;
  return `${label.slice(0, 13)}…`;
}

export function McpNameMultiSelect({
  value,
  mcps,
  onChange,
  disabled,
  placeholder = "关联 MCP（可选）",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => filterMcpsByQuery(mcps, query), [mcps, query]);
  const showPlaceholder = value.length === 0 && !query;

  const addName = (name: string) => {
    const n = name.trim();
    if (!n || selectedSet.has(n)) return;
    onChange([...value, n]);
    setQuery("");
  };

  const removeName = (name: string) => {
    onChange(value.filter((s) => s !== name));
  };

  const toggleMcp = (row: ClaudeMcpRow) => {
    if (selectedSet.has(row.name)) {
      removeName(row.name);
    } else {
      addName(row.name);
    }
  };

  const commitInput = (text: string) => {
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

  return (
    <div className={cn("space-y-1", className)}>
      <Popover
        open={open}
        modal={false}
        onOpenChange={(next) => {
          if (disabled) return;
          setOpen(next);
        }}
      >
        <PopoverAnchor asChild>
          <div
            role="combobox"
            aria-expanded={open}
            onClick={focusInput}
            className={cn(
              "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[12px]",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-text",
            )}
          >
            {value.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]"
              >
                {chipLabel(name, mcps)}
                {!disabled && (
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeName(name);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            <input
              ref={inputRef}
              disabled={disabled}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitInput(query);
                }
                if (e.key === "Backspace" && !query && value.length) {
                  removeName(value[value.length - 1]);
                }
              }}
              onFocus={() => setOpen(true)}
              placeholder={showPlaceholder ? placeholder : ""}
              className="min-w-[8rem] flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-1"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {mcps.length === 0 ? "尚未配置 MCP，请先到 MCP 服务器页添加" : "无匹配项"}
            </div>
          ) : (
            filtered.map((row) => (
              <button
                key={row.name}
                type="button"
                disabled={!row.enabled}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-secondary",
                  !row.enabled && "opacity-40",
                )}
                onClick={() => toggleMcp(row)}
              >
                <Check
                  className={cn("h-3.5 w-3.5 shrink-0", selectedSet.has(row.name) ? "opacity-100" : "opacity-0")}
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{row.label}</span>
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">{row.name}</span>
                </span>
                {!row.enabled && <span className="text-[10px] text-muted-foreground">已禁用</span>}
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
      {!disabled && (
        <Link
          to="/comms"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          onClick={() => setOpen(false)}
        >
          管理 MCP 服务器
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
