import { useMemo } from "react";
import { cn } from "@/lib/utils";

/** SVG 预览：棋盘底 + 浅色托盘居中，打开 SVG 的观感 */
export function WorkbenchSvgPreview({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const src = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return null;
    try {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
    } catch {
      return null;
    }
  }, [content]);

  return (
    <div
      className={cn(
        "workbench-media-preview workbench-media-checker flex min-h-0 flex-1 items-center justify-center overflow-auto scrollbar-thin p-6",
        className,
      )}
    >
      {src ? (
        <div className="workbench-media-plate max-h-full max-w-full p-4">
          <img src={src} alt="SVG preview" className="max-h-[min(70vh,720px)] max-w-full object-contain" />
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">（空 SVG）</p>
      )}
    </div>
  );
}
