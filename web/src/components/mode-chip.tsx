import { useState } from "react";
import { Eye, Hammer, Zap, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Mode = "plan" | "build" | "auto";

const OPTS: { v: Mode; label: string; desc: string; icon: typeof Eye; color: string }[] = [
  { v: "plan", label: "规划", desc: "只读分析，不修改文件", icon: Eye, color: "text-tool-read" },
  { v: "build", label: "构建", desc: "允许编辑与命令执行", icon: Hammer, color: "text-tool-edit" },
  { v: "auto", label: "自动批准", desc: "自动批准所有工具调用", icon: Zap, color: "text-tool-bash" },
];

export function ModeChip({ value, onChange }: { value: Mode; onChange: (v: Mode) => void }) {
  const [open, setOpen] = useState(false);
  const cur = OPTS.find((o) => o.v === value)!;
  const Icon = cur.icon;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium text-foreground transition hover:bg-secondary"
      >
        <Icon className={cn("h-3 w-3", cur.color)} />
        {cur.label}
        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {OPTS.map((o) => {
            const I = o.icon;
            const sel = o.v === value;
            return (
              <button
                key={o.v}
                onClick={() => {
                  onChange(o.v);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition",
                  sel ? "bg-primary-soft/50" : "hover:bg-secondary",
                )}
              >
                <I className={cn("mt-0.5 h-3.5 w-3.5", o.color)} />
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold text-foreground">{o.label}</div>
                  <div className="text-[11px] text-muted-foreground">{o.desc}</div>
                </div>
                {sel && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
