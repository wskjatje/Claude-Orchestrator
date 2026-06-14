import type { ITheme } from "@xterm/xterm";

/** 将 CSS 变量（含 oklch）解析为 xterm 可用的 rgb/rgba 字符串 */
export function readCssVarAsColor(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("div");
  probe.style.display = "none";
  probe.style.backgroundColor = `var(${varName})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (!resolved || resolved === "rgba(0, 0, 0, 0)" || resolved === "transparent") return fallback;
  return resolved;
}

export function buildXtermTheme(_resolved: "light" | "dark"): ITheme {
  const background = readCssVarAsColor("--terminal-bg", "#f8f6f3");
  const foreground = readCssVarAsColor("--terminal-fg", "#3f3f46");
  const cursor = readCssVarAsColor("--terminal-cursor", "#52525b");
  const selectionBackground = readCssVarAsColor("--terminal-selection-bg", "#e4e4e7");
  const selectionForeground = readCssVarAsColor("--terminal-selection-fg", foreground);
  const black = readCssVarAsColor("--terminal-ansi-black", "#52525b");
  const red = readCssVarAsColor("--terminal-ansi-red", "#dc2626");
  const green = readCssVarAsColor("--terminal-ansi-green", "#16a34a");
  const yellow = readCssVarAsColor("--terminal-ansi-yellow", "#ca8a04");
  const blue = readCssVarAsColor("--terminal-ansi-blue", "#2563eb");
  const magenta = readCssVarAsColor("--terminal-ansi-magenta", "#9333ea");
  const cyan = readCssVarAsColor("--terminal-ansi-cyan", "#0891b2");
  const white = readCssVarAsColor("--terminal-ansi-white", foreground);
  const brightBlack = readCssVarAsColor("--terminal-ansi-bright-black", "#71717a");
  const brightRed = readCssVarAsColor("--terminal-ansi-bright-red", "#ef4444");
  const brightGreen = readCssVarAsColor("--terminal-ansi-bright-green", "#22c55e");
  const brightYellow = readCssVarAsColor("--terminal-ansi-bright-yellow", "#eab308");
  const brightBlue = readCssVarAsColor("--terminal-ansi-bright-blue", "#3b82f6");
  const brightMagenta = readCssVarAsColor("--terminal-ansi-bright-magenta", "#a855f7");
  const brightCyan = readCssVarAsColor("--terminal-ansi-bright-cyan", "#06b6d4");
  const brightWhite = readCssVarAsColor("--terminal-ansi-bright-white", foreground);

  return {
    background,
    foreground,
    cursor,
    cursorAccent: background,
    selectionBackground,
    selectionForeground,
    black,
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
    brightBlack,
    brightRed,
    brightGreen,
    brightYellow,
    brightBlue,
    brightMagenta,
    brightCyan,
    brightWhite,
  };
}
