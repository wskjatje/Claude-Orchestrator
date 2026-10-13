/** xterm 需真实字体名（canvas 不解析 CSS var），与 styles.css --font-mono 保持一致 */
export const WORKBENCH_MONO_FONT =
  '"JetBrains Mono", "SF Mono", ui-monospace, "Cascadia Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/** 与 --font-size-code（14）对齐；xterm 只能吃数字 */
export const WORKBENCH_TERMINAL_FONT_SIZE = 14;
export const WORKBENCH_TERMINAL_LINE_HEIGHT = 1.55;

/** 运行时读取 CSS token（偏好变更后可重挂载终端） */
export function readWorkbenchCodeFontSizePx(fallback = WORKBENCH_TERMINAL_FONT_SIZE): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-size-code").trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
