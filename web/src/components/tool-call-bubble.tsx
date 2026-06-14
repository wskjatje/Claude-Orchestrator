import { FileText, Pencil, Terminal, Globe, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, { icon: typeof FileText; color: string; tone: string }> = {
  Read: { icon: FileText, color: "text-tool-read", tone: "bg-tool-read/10 border-tool-read/30" },
  Glob: { icon: FileText, color: "text-tool-read", tone: "bg-tool-read/10 border-tool-read/30" },
  Grep: { icon: FileText, color: "text-tool-read", tone: "bg-tool-read/10 border-tool-read/30" },
  Edit: { icon: Pencil, color: "text-tool-edit", tone: "bg-tool-edit/10 border-tool-edit/30" },
  Write: { icon: Pencil, color: "text-tool-edit", tone: "bg-tool-edit/10 border-tool-edit/30" },
  MultiEdit: { icon: Pencil, color: "text-tool-edit", tone: "bg-tool-edit/10 border-tool-edit/30" },
  Bash: { icon: Terminal, color: "text-tool-bash", tone: "bg-tool-bash/10 border-tool-bash/30" },
  WebFetch: { icon: Globe, color: "text-tool-web", tone: "bg-tool-web/10 border-tool-web/30" },
  WebSearch: { icon: Globe, color: "text-tool-web", tone: "bg-tool-web/10 border-tool-web/30" },
};

export function ToolCallBubble({ name, arg, status }: { name: string; arg?: string; status?: "running" | "ok" | "fail" }) {
  const meta = ICONS[name] ?? { icon: Wrench, color: "text-muted-foreground", tone: "bg-secondary border-border" };
  const Icon = meta.icon;
  return (
    <div className={cn("inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1 font-mono text-[11.5px]", meta.tone)}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
      <span className={cn("font-semibold", meta.color)}>{name}</span>
      {arg && <span className="truncate text-foreground/70">({arg})</span>}
      {status === "running" && <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />}
      {status === "ok" && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-success" />}
      {status === "fail" && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-destructive" />}
    </div>
  );
}
