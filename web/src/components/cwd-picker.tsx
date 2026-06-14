import { useState } from "react";
import { FolderTree, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const RECENT_CWDS = [
  "~/projects/openclaw",
  "~/projects/lovable-app",
  "~/work/dashboard",
];

export function CwdPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-foreground transition hover:bg-secondary"
      >
        <FolderTree className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono">{value}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            最近工作目录
          </div>
          {RECENT_CWDS.map((cwd) => {
            const sel = cwd === value;
            return (
              <button
                key={cwd}
                onClick={() => {
                  onChange(cwd);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left font-mono text-[12px] transition",
                  sel ? "bg-primary-soft text-primary" : "text-foreground hover:bg-secondary",
                )}
              >
                {cwd}
                {sel && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
          <div className="mt-1 border-t border-border px-3 pt-2 pb-1">
            <button className="text-[12px] text-primary hover:underline">+ 选择其他文件夹…</button>
          </div>
        </div>
      )}
    </div>
  );
}
