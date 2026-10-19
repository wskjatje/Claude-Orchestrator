import type { ITheme } from "@xterm/xterm";

/**
 * 将 CSS 变量（含 oklch）解析为 xterm 可用的 rgb/rgba。
 * 禁止与主题无关的静默色兜底；变量缺失或解析失败时抛错。
 */
export function readCssVarAsColor(varName: string): string {
  if (typeof document === "undefined") {
    throw new Error(`readCssVarAsColor(${varName}) 需要 document`);
  }
  const probe = document.createElement("div");
  probe.style.display = "none";
  probe.style.backgroundColor = `var(${varName})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (!resolved || resolved === "rgba(0, 0, 0, 0)" || resolved === "transparent") {
    throw new Error(`CSS 变量 ${varName} 未解析到有效颜色`);
  }
  return resolved;
}

export function buildXtermTheme(_resolved: "light" | "dark"): ITheme {
  const background = readCssVarAsColor("--terminal-bg");
  const foreground = readCssVarAsColor("--terminal-fg");
  const cursor = readCssVarAsColor("--terminal-cursor");
  const selectionBackground = readCssVarAsColor("--terminal-selection-bg");
  const selectionForeground = readCssVarAsColor("--terminal-selection-fg");
  const black = readCssVarAsColor("--terminal-ansi-black");
  const red = readCssVarAsColor("--terminal-ansi-red");
  const green = readCssVarAsColor("--terminal-ansi-green");
  const yellow = readCssVarAsColor("--terminal-ansi-yellow");
  const blue = readCssVarAsColor("--terminal-ansi-blue");
  const magenta = readCssVarAsColor("--terminal-ansi-magenta");
  const cyan = readCssVarAsColor("--terminal-ansi-cyan");
  const white = readCssVarAsColor("--terminal-ansi-white");
  const brightBlack = readCssVarAsColor("--terminal-ansi-bright-black");
  const brightRed = readCssVarAsColor("--terminal-ansi-bright-red");
  const brightGreen = readCssVarAsColor("--terminal-ansi-bright-green");
  const brightYellow = readCssVarAsColor("--terminal-ansi-bright-yellow");
  const brightBlue = readCssVarAsColor("--terminal-ansi-bright-blue");
  const brightMagenta = readCssVarAsColor("--terminal-ansi-bright-magenta");
  const brightCyan = readCssVarAsColor("--terminal-ansi-bright-cyan");
  const brightWhite = readCssVarAsColor("--terminal-ansi-bright-white");

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
