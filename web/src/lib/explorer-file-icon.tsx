import { cn } from "@/lib/utils";
import { SetiFileIcon } from "@/lib/seti/seti-file-icon";
import { resolveSetiIcon } from "@/lib/seti/resolve-seti-icon";

/** @deprecated 保留导出供调试；图标已切换为 Seti */
export function explorerIconifyId(
  ext?: string,
  fileName?: string,
  isDir?: boolean,
  theme: "light" | "dark" = "light",
): string | null {
  if (isDir) return null;
  const icon = resolveSetiIcon(fileName, { ext, theme });
  return icon.id;
}

export function ExplorerTreeIcon({
  ext,
  fileName,
  isDir,
  className,
}: {
  ext?: string;
  fileName?: string;
  isDir?: boolean;
  expanded?: boolean;
  className?: string;
}) {
  if (isDir) return null;

  return (
    <span className="explorer-tree-icon-wrap inline-flex shrink-0 items-center justify-center">
      <SetiFileIcon
        ext={ext}
        fileName={fileName}
        className={cn("explorer-tree-icon", className)}
      />
    </span>
  );
}
