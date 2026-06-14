import { useState, type MouseEvent } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/** 复制文本按钮（悬停显示或常驻，复制后短暂显示勾） */
export function CopyTextButton({
  text,
  label = "复制",
  copiedLabel = "已复制",
  className,
  size = "sm",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: "sm" | "xs";
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyTextToClipboard(text);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const iconClass = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  const padClass = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";

  return (
    <button
      type="button"
      onClick={(e) => void onCopy(e)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/90 font-medium text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground",
        padClass,
        className,
      )}
      title={copied ? copiedLabel : label}
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? (
        <>
          <Check className={iconClass} />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy className={iconClass} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
