import { useEffect, useMemo, useState } from "react";
import { Binary, ChevronDown, FileText } from "lucide-react";
import {
  base64ToBytes,
  dataUrlFromBase64,
  formatFileSize,
  formatHexDump,
  imageMimeForPath,
  isPdfPath,
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

/** 二进制 / 图片 / PDF：媒体预览为主，十六进制默认折叠 */
export function BinaryFileViewer({ relPath, size, previewBytes, base64, truncated, className }: Props) {
  const sizeLabel = formatFileSize(size);
  const previewLabel = formatFileSize(previewBytes);
  const imageMime = imageMimeForPath(relPath);
  const pdf = isPdfPath(relPath);
  const [showHex, setShowHex] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const { hexText, imageUrl } = useMemo(() => {
    if (!base64) return { hexText: "（无法读取文件内容）", imageUrl: null as string | null };
    const bytes = base64ToBytes(base64);
    const url =
      imageMime && !pdf && bytes.length > 0 && bytes.length <= 8 * 1024 * 1024
        ? dataUrlFromBase64(base64, imageMime)
        : null;
    return { hexText: formatHexDump(bytes), imageUrl: url };
  }, [base64, imageMime, pdf]);

  useEffect(() => {
    setImgFailed(false);
  }, [relPath, base64]);

  useEffect(() => {
    if (!pdf || !base64) {
      setPdfUrl(null);
      return;
    }
    let revoked = false;
    let objectUrl: string | null = null;
    try {
      const bytes = base64ToBytes(base64);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const blob = new Blob([copy], { type: "application/pdf" });
      objectUrl = URL.createObjectURL(blob);
      if (!revoked) setPdfUrl(objectUrl);
    } catch {
      setPdfUrl(null);
    }
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdf, base64]);

  const showImage = Boolean(imageUrl) && !imgFailed;
  const showPdf = Boolean(pdfUrl);
  const hasMedia = showImage || showPdf;
  const kindLabel = showPdf ? "PDF 预览" : showImage ? "图片预览" : "二进制查看";

  return (
    <div
      className={cn(
        "workbench-media-preview flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--code-bg)]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-surface-elevated/50 px-3 py-1.5">
        {showPdf ? (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Binary className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="text-[11px] text-muted-foreground">{kindLabel}</span>
        {sizeLabel ? (
          <span className="font-mono text-[11px] text-muted-foreground/80">{sizeLabel}</span>
        ) : null}
        {truncated ? (
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            仅预览前 {previewLabel ?? "256 KB"}
          </span>
        ) : null}
      </div>

      {showImage ? (
        <div className="workbench-media-checker flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
          <div className="workbench-media-plate max-h-full max-w-full p-3">
            <img
              src={imageUrl!}
              alt={relPath}
              className="max-h-[min(70vh,720px)] max-w-full object-contain"
              onError={() => setImgFailed(true)}
            />
          </div>
        </div>
      ) : null}

      {showPdf ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--code-bg)]">
          <iframe
            title={`${relPath} PDF`}
            src={pdfUrl!}
            className="min-h-0 w-full flex-1 border-0 bg-white"
          />
        </div>
      ) : null}

      {pdf && !showPdf && base64 ? (
        <p className="px-3 py-2 text-[12px] text-muted-foreground">无法嵌入 PDF，可展开下方十六进制或用系统打开。</p>
      ) : null}

      <div className={cn("shrink-0 border-t border-border/50", hasMedia ? "" : "min-h-0 flex-1 flex flex-col")}>
        {hasMedia ? (
          <button
            type="button"
            className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            onClick={() => setShowHex((v) => !v)}
          >
            <ChevronDown className={cn("h-3 w-3 transition", showHex && "rotate-180")} />
            {showHex ? "隐藏十六进制" : "显示十六进制"}
          </button>
        ) : null}
        {(!hasMedia || showHex) && (
          <div className={cn("overflow-auto scrollbar-thin p-3", hasMedia ? "max-h-[28vh]" : "min-h-0 flex-1")}>
            <pre className="font-mono text-[11px] leading-[1.45] text-foreground/90 whitespace-pre">
              {hexText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
