import { File, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PendingFileEntry = {
  id: string;
  name: string;
  /** 文件路径或空（浏览器拖入时仅 name） */
  path?: string;
};

export function ComposerFileAttachments({
  files,
  onRemove,
  className,
}: {
  files: PendingFileEntry[];
  onRemove: (id: string) => void;
  className?: string;
}) {
  if (!files.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {files.map((f) => (
        <span
          key={f.id}
          className="group/chip inline-flex max-w-[220px] items-center gap-1 rounded-[5px] border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[12px] leading-none text-foreground/80"
          title={f.path || f.name}
        >
          <File className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
          <span className="truncate">{f.name}</span>
          <button
            type="button"
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground/60 opacity-0 transition hover:bg-black/10 hover:text-destructive group-hover/chip:opacity-100 dark:hover:bg-white/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(f.id);
            }}
            title={`移除 ${f.name}`}
            aria-label={`移除 ${f.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
