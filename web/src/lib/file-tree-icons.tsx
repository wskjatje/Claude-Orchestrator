import type { ComponentType } from "react";
import { SetiFileIcon } from "@/lib/seti/seti-file-icon";

type FileIconProps = { className?: string };

/**
 * 编辑器标签 / 路径栏文件图标（Seti）。
 * 保留 `fileIconFor` 签名：返回可接收 className 的组件。
 */
export function fileIconFor(ext?: string, fileName?: string): ComponentType<FileIconProps> {
  function Icon({ className }: FileIconProps) {
    return <SetiFileIcon ext={ext} fileName={fileName} className={className} />;
  }
  Icon.displayName = `SetiFileIcon(${fileName || ext || "file"})`;
  return Icon;
}

/** Seti 自带颜色，不再叠加 lucide 色类 */
export function fileIconClass(_ext?: string, _fileName?: string): string {
  return "seti-file-icon--inline";
}
