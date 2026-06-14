import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  filterSkillsByQuery,
  resolveSkillStemFromInput,
  skillDisplayNameForStem,
  type ClaudeSkillRow,
} from "@/hooks/use-claude-skill-list";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  skills: ClaudeSkillRow[];
  onChange: (stems: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function chipLabel(stem: string, skills: ClaudeSkillRow[]): string {
  const name = skillDisplayNameForStem(stem, skills);
  if (name.length <= 16) return name;
  return `${name.slice(0, 15)}…`;
}

export function SkillStemMultiSelect({
  value,
  skills,
  onChange,
  disabled,
  placeholder = "关联 Skill",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const skipCommitRef = useRef(false);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => filterSkillsByQuery(skills, query), [skills, query]);
  const showPlaceholder = value.length === 0 && !query;

  const addSkill = (stem: string) => {
    const s = stem.trim();
    if (!s || selectedSet.has(s)) return;
    onChange([...value, s]);
    setQuery("");
  };

  const removeSkill = (stem: string) => {
    onChange(value.filter((s) => s !== stem));
  };

  const toggleSkill = (skill: ClaudeSkillRow) => {
    if (selectedSet.has(skill.stem)) {
      removeSkill(skill.stem);
    } else {
      addSkill(skill.stem);
    }
  };

  const commitInput = (text: string) => {
    const stem = resolveSkillStemFromInput(text, skills);
    if (!stem) return;
    addSkill(stem);
  };

  const focusInput = () => {
    if (disabled) return;
    inputRef.current?.focus();
    setOpen(true);
  };

  return (
    <Popover
      open={open}
      modal={false}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (next) {
          setQuery("");
        } else if (!skipCommitRef.current && query.trim()) {
          commitInput(query);
        }
        skipCommitRef.current = false;
      }}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            "relative flex min-h-8 w-full cursor-text flex-wrap items-center gap-1 rounded-md border border-border bg-background py-1 pl-1.5 pr-7 transition-colors focus-within:border-primary",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
          onClick={focusInput}
        >
          {value.map((stem) => {
            const full = skillDisplayNameForStem(stem, skills);
            return (
              <span
                key={stem}
                title={full}
                className="inline-flex max-w-[9.5rem] shrink-0 items-center gap-0.5 rounded bg-secondary/80 px-1 py-0.5 text-[10.5px] text-foreground/90"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{chipLabel(stem, skills)}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    onClick={() => removeSkill(stem)}
                    aria-label={`移除 Skill ${full}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                ) : null}
              </span>
            );
          })}
          <input
            ref={inputRef}
            value={query}
            disabled={disabled}
            placeholder={showPlaceholder ? placeholder : ""}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (disabled) return;
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                return;
              }
              if (e.key === "Backspace" && !query && value.length) {
                e.preventDefault();
                removeSkill(value[value.length - 1]!);
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const pick = filtered.find((s) => !selectedSet.has(s.stem)) ?? filtered[0];
                if (pick) {
                  toggleSkill(pick);
                } else if (query.trim()) {
                  commitInput(query);
                }
              }
            }}
            className="min-w-[5rem] flex-1 border-0 bg-transparent py-0.5 text-[12px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
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
            filtered.map((skill) => {
              const active = selectedSet.has(skill.stem);
              return (
                <button
                  key={`${skill.source}:${skill.stem}`}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 px-2.5 py-2 text-left text-[12px] transition hover:bg-secondary/80",
                    active && "bg-primary/5",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleSkill(skill)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{skill.displayName}</span>
                      {skill.source === "project" ? (
                        <span className="shrink-0 rounded bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground">
                          项目
                        </span>
                      ) : null}
                    </div>
                    {skill.description ? (
                      <div className="line-clamp-1 text-[10.5px] leading-snug text-muted-foreground">
                        {skill.description}
                      </div>
                    ) : (
                      <div className="truncate font-mono text-[10px] text-muted-foreground">{skill.stem}</div>
                    )}
                  </div>
                  {active ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} /> : null}
                </button>
              );
            })
          ) : skills.length ? (
            <p className="px-3 py-3 text-center text-[12px] text-muted-foreground">没有找到匹配的 Skill</p>
          ) : (
            <p className="px-3 py-3 text-center text-[12px] text-muted-foreground">
              暂无 Skill，可在 ~/.claude/skills 或工作区 .claude/skills 添加 .md 文件
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
