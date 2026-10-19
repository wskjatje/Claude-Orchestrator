import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import {
  resolveSetiFolderIcon,
  resolveSetiIcon,
  resolveSetiShellIcon,
} from "@/lib/seti/resolve-seti-icon";

type SetiFileIconProps = {
  fileName?: string;
  ext?: string;
  className?: string;
  /** 强制主题；默认跟随应用 */
  theme?: "light" | "dark";
  title?: string;
};

/** Seti 文件图标（字体字形 + 主题色） */
export function SetiFileIcon({ fileName, ext, className, theme, title }: SetiFileIconProps) {
  const { resolved } = useTheme();
  const mode = theme ?? resolved;
  const icon = resolveSetiIcon(fileName, { ext, theme: mode });

  return (
    <span
      className={cn("seti-file-icon", className)}
      style={{ color: icon.color }}
      title={title}
      aria-hidden
    >
      {icon.ch}
    </span>
  );
}

/**
 * 目录图标：色来自 theme JSON folder 条目；矢量形对齐 Cursor/VS Code 文件夹外观
 *（VS Code seti 主题本身不含 folder 字形，故不依赖字体缺字）。
 */
export function SetiFolderIcon({
  expanded = false,
  className,
  theme,
}: {
  expanded?: boolean;
  className?: string;
  theme?: "light" | "dark";
}) {
  const { resolved } = useTheme();
  const mode = theme ?? resolved;
  const icon = resolveSetiFolderIcon(expanded, mode);

  return (
    <span
      className={cn("seti-file-icon explorer-tree-folder-icon", className)}
      style={{ color: icon.color }}
      aria-hidden
    >
      <svg
        viewBox="0 0 16 16"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        className="block"
      >
        {expanded ? (
          <path d="M1.5 3.5h4.2l1.3 1.2H14.5v7.3a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V3.5zm0 0V2.8A1.3 1.3 0 0 1 2.8 1.5h2.4l1 1H1.5z" />
        ) : (
          <path d="M1.5 4.2V3a1.2 1.2 0 0 1 1.2-1.2h3.1L7 3h6.3A1.2 1.2 0 0 1 14.5 4.2v7.6a1.2 1.2 0 0 1-1.2 1.2H2.7a1.2 1.2 0 0 1-1.2-1.2V4.2z" />
        )}
      </svg>
    </span>
  );
}

/** 终端面板 / 会话用的 Seti shell 图标 */
export function SetiShellIcon({ className, theme }: { className?: string; theme?: "light" | "dark" }) {
  const { resolved } = useTheme();
  const mode = theme ?? resolved;
  const icon = resolveSetiShellIcon(mode);

  return (
    <span className={cn("seti-file-icon", className)} style={{ color: icon.color }} aria-hidden>
      {icon.ch}
    </span>
  );
}
