import { MousePointer2, X } from "lucide-react";
import { formatDomChipLabel, type PendingDomElement } from "@/lib/dom-element-meta";
import { cn } from "@/lib/utils";

/** DOM 元素 chip：与终端选区 pill 同风格 */
export function ComposerDomAttachments({
  elements,
  onRemove,
  className,
}: {
  elements: PendingDomElement[];
  onRemove: (id: string) => void;
  className?: string;
}) {
  if (!elements.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 px-3 pt-2.5 pb-1", className)}>
      {elements.map((el) => {
        const chipLabel = formatDomChipLabel(el);
        return (
          <span
            key={el.id}
            className="group/chip dom-context-chip inline-flex max-w-full items-center gap-1 rounded-[5px] px-1.5 py-0.5 font-mono text-[12px] leading-none"
            title={el.label}
          >
            <MousePointer2 className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
            <span className="truncate">{chipLabel}</span>
            <button
              type="button"
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-current/70 opacity-0 transition hover:bg-black/10 hover:text-current group-hover/chip:opacity-100 dark:hover:bg-white/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(el.id);
              }}
              title="移除 DOM 元素"
              aria-label={`移除 ${chipLabel}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
