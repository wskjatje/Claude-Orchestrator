import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const opts: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "浅色" },
  { value: "system", icon: Monitor, label: "跟随系统" },
  { value: "dark", icon: Moon, label: "深色" },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = o.value === mode;
        return (
          <button
            key={o.value}
            onClick={() => setMode(o.value)}
            title={o.label}
            aria-label={o.label}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition",
              active ? "bg-primary-soft text-primary shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3 w-3" />
          </button>
        );
      })}
    </div>
  );
}