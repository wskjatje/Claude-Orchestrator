import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { resolveSetiIcon, resolveSetiShellIcon } from "@/lib/seti/resolve-seti-icon";

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
