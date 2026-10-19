/**
 * xterm 需真实字体名（canvas 不解析 CSS var）。
 * 栈必须与 styles.css `--font-mono` 保持字节级一致（parity 闸门会比对）。
 */
export const WORKBENCH_MONO_FONT =
  '"JetBrains Mono", "SF Mono", ui-monospace, "Cascadia Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/** 与 styles.css `--font-size-code` 同值；仅 SSR / 无 document 时使用 */
export const WORKBENCH_CODE_FONT_SIZE_PX = 14;

export const WORKBENCH_TERMINAL_LINE_HEIGHT = 1.55;

/** 运行时读取 CSS token；document 存在但缺 token 时抛错（禁静默兜底） */
export function readWorkbenchCodeFontSizePx(): number {
  if (typeof document === "undefined") return WORKBENCH_CODE_FONT_SIZE_PX;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-size-code").trim();
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("缺少 CSS token --font-size-code");
  }
  return n;
}
