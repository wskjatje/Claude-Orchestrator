import { useMemo } from "react";
import { Binary } from "lucide-react";
import {
  base64ToBytes,
  dataUrlFromBase64,
  formatFileSize,
  formatHexDump,
  imageMimeForPath,
} from "@/lib/binary-preview";
import { cn } from "@/lib/utils";

type Props = {
  relPath: string;
  size?: number;
  previewBytes?: number;
  base64?: string | null;
  truncated?: boolean;
  className?: string;
};

export function BinaryFileViewer({ relPath, size, previewBytes, base64, truncated, className }: Props) {
  const sizeLabel = formatFileSize(size);
  const previewLabel = formatFileSize(previewBytes);
  const imageMime = imageMimeForPath(relPath);

  const { hexText, imageUrl } = useMemo(() => {
    if (!base64) return { hexText: "（无法读取文件内容）", imageUrl: null as string | null };
    const bytes = base64ToBytes(base64);
    const url =
      imageMime && bytes.length > 0 && bytes.length <= 5 * 1024 * 1024
        ? dataUrlFromBase64(base64, imageMime)
        : null;
    return { hexText: formatHexDump(bytes), imageUrl: url };
  }, [base64, imageMime]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-surface-elevated/50 px-3 py-1.5">
        <Binary className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">二进制查看</span>
        {sizeLabel ? (
          <span className="font-mono text-[10.5px] text-muted-foreground/80">{sizeLabel}</span>
        ) : null}
        {truncated ? (
          <span className="text-[10.5px] text-amber-600 dark:text-amber-400">
            仅预览前 {previewLabel ?? "256 KB"}
          </span>
        ) : null}
      </div>

      {imageUrl ? (
        <div className="flex shrink-0 items-center justify-center border-b border-border/50 bg-muted/20 p-4">
          <img
            src={imageUrl}
            alt={relPath}
            className="max-h-[min(40vh,320px)] max-w-full object-contain"
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-3">
        <pre className="font-mono text-[11px] leading-[1.45] text-foreground/90 whitespace-pre">
          {hexText}
        </pre>
      </div>
    </div>
  );
}
