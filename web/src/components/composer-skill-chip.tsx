import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  filterSkillsByQuery,
  skillDisplayNameForStem,
  useClaudeSkillList,
} from "@/hooks/use-claude-skill-list";
import { dedupeSkillStems } from "@/lib/agent-skill-defaults";
import { CONTENT_LOADING } from "@/lib/ui-copy";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (stems: string[]) => void;
  disabled?: boolean;
};

/**
 * P1：Composer 可选 Skill。未选中时不改发送路径；选中后由外层注入 SKILL 正文。
 */
export function ComposerSkillChip({ value, onChange, disabled }: Props) {
  const { skills, loading } = useClaudeSkillList();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => dedupeSkillStems(value), [value]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => filterSkillsByQuery(skills, query), [skills, query]);

  const label =
    selected.length === 0
      ? "Skill"
      : selected.length === 1
        ? skillDisplayNameForStem(selected[0]!, skills)
        : `Skill · ${selected.length}`;

  const toggle = (stem: string) => {
    if (selectedSet.has(stem)) {
      onChange(selected.filter((s) => s !== stem));
    } else {
      onChange([...selected, stem]);
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={
            selected.length
              ? `本轮注入：${selected.map((s) => skillDisplayNameForStem(s, skills)).join("、")}`
              : "可选：为本轮附加 Skill（未选不影响发送）"
          }
          className={cn(
            "composer-chrome-chip inline-flex max-w-[9rem] items-center gap-0.5",
            selected.length && "composer-chrome-chip--active",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <span className="truncate">{label}</span>
          {selected.length ? (
            <span
              role="button"
              tabIndex={-1}
              className="shrink-0 rounded p-0.5 hover:bg-background/80"
              aria-label="清除选用 Skill"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
              }}
            >
              <X className="h-2.5 w-2.5" />
            </span>
          ) : (
            <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-70" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="border-b border-border/60 p-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 Skill"
            className="w-full rounded-md border border-border/70 bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-[min(14rem,40vh)] overflow-y-auto py-1 scrollbar-thin">
          {filtered.length ? (
            filtered.map((skill) => {
              const active = selectedSet.has(skill.stem);
              return (
                <button
                  key={`${skill.source}:${skill.stem}`}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-[12px] transition hover:bg-secondary/80",
                    active && "bg-primary/5",
                  )}
                  onClick={() => toggle(skill.stem)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{skill.displayName}</div>
                    {skill.description ? (
                      <div className="line-clamp-1 text-[12px] text-muted-foreground">
                        {skill.description}
                      </div>
                    ) : (
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {skill.stem}
                      </div>
                    )}
                  </div>
                  {active ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                  ) : null}
                </button>
              );
            })
          ) : loading ? (
            <p className="px-3 py-3 text-center text-[12px] text-muted-foreground">加载中…</p>
          ) : skills.length ? (
            <p className="px-3 py-3 text-center text-[12px] text-muted-foreground">无匹配</p>
          ) : (
            <p className="px-3 py-3 text-center text-[12px] text-muted-foreground">暂无 Skill</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
