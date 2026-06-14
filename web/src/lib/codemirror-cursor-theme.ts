/**
 * Cursor / VS Code 语法配色
 * - 代码文件：标准 token
 * - Markdown：分层展示（标记弱化、标题/代码/正文分层）
 */
import { tags as t } from "@lezer/highlight";
import { vscodeDarkInit, vscodeLightInit } from "@uiw/codemirror-theme-vscode";

const mono =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/** 代码文件 token */
const codeLight = [
  { tag: t.propertyName, color: "#0451a5", fontWeight: "500" as const },
  { tag: [t.string, t.special(t.string)], color: "#a31515" },
  { tag: t.number, color: "#098658" },
  { tag: [t.bool, t.null, t.keyword], color: "#0000ff" },
  { tag: [t.typeName, t.className], color: "#267f99" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#795e26" },
  { tag: t.tagName, color: "#800000" },
  { tag: t.attributeName, color: "#e50000" },
  { tag: t.comment, color: "#008000", fontStyle: "italic" as const },
];

const codeDark = [
  { tag: t.propertyName, color: "#9cdcfe" },
  { tag: [t.string, t.special(t.string)], color: "#ce9178" },
  { tag: t.number, color: "#b5cea8" },
  { tag: [t.keyword, t.bool, t.null], color: "#569cd6" },
  { tag: [t.typeName, t.className], color: "#4ec9b0" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#dcdcaa" },
  { tag: [t.variableName, t.definition(t.variableName)], color: "#9cdcfe" },
  { tag: t.tagName, color: "#569cd6" },
  { tag: [t.controlKeyword, t.moduleKeyword], color: "#c586c0" },
  { tag: t.attributeName, color: "#9cdcfe" },
  { tag: t.comment, color: "#6a9955", fontStyle: "italic" as const },
];

/**
 * Markdown 源码（对齐 Cursor 图二）
 * - processingInstruction：# - ` ** 等标记 → 弱化灰，不抢正文
 * - heading：标题文字 → 蓝/深红
 * - monospace：行内代码 → 橙褐
 * - strong/emphasis：仅字重/斜体，不改色
 */
const mdLight = [
  { tag: t.processingInstruction, color: "#a0a1a7" },
  { tag: t.labelName, color: "#a0a1a7" },
  { tag: t.content, color: "#383a42" },
  { tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: "#2b6b8f", fontWeight: "600" as const },
  { tag: t.monospace, color: "#795e26" },
  { tag: t.strong, fontWeight: "600" as const },
  { tag: t.emphasis, fontStyle: "italic" as const },
  { tag: t.link, color: "#0451a5", textDecoration: "underline" as const },
  { tag: t.url, color: "#0451a5" },
  { tag: t.quote, color: "#008000", fontStyle: "italic" as const },
  { tag: t.comment, color: "#008000", fontStyle: "italic" as const },
  { tag: t.list, color: "#383a42" },
  ...codeLight,
];

const mdDark = [
  { tag: t.processingInstruction, color: "#808080" },
  { tag: t.labelName, color: "#808080" },
  { tag: t.content, color: "#d4d4d4" },
  { tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: "#569cd6", fontWeight: "600" as const },
  { tag: t.monospace, color: "#ce9178" },
  { tag: t.strong, fontWeight: "600" as const },
  { tag: t.emphasis, fontStyle: "italic" as const },
  { tag: t.link, color: "#4ec9b0", textDecoration: "underline" as const },
  { tag: t.url, color: "#4ec9b0" },
  { tag: t.quote, color: "#6a9955", fontStyle: "italic" as const },
  { tag: t.comment, color: "#6a9955", fontStyle: "italic" as const },
  { tag: t.list, color: "#d4d4d4" },
  ...codeDark,
];

export const cursorCodeLightTheme = vscodeLightInit({
  settings: {
    background: "var(--code-bg, #ffffff)",
    foreground: "#383a42",
    gutterBackground: "color-mix(in oklab, var(--code-bg, #fff) 92%, var(--surface-elevated, #f4f4f5) 8%)",
    gutterForeground: "#237893",
    lineHighlight: "color-mix(in oklab, var(--primary, #e11d48) 5%, transparent)",
    fontFamily: mono,
  },
  styles: codeLight,
});

export const cursorCodeDarkTheme = vscodeDarkInit({
  settings: {
    background: "var(--code-bg, #1e1e1e)",
    foreground: "#d4d4d4",
    gutterBackground: "color-mix(in oklab, var(--code-bg, #1e1e1e) 88%, var(--surface-elevated, #2a2a2a) 12%)",
    gutterForeground: "#838383",
    lineHighlight: "color-mix(in oklab, var(--primary, #e11d48) 7%, transparent)",
    fontFamily: mono,
  },
  styles: codeDark,
});

export const cursorMarkdownLightTheme = vscodeLightInit({
  settings: {
    background: "var(--code-bg, #ffffff)",
    foreground: "#383a42",
    gutterBackground: "color-mix(in oklab, var(--code-bg, #fff) 92%, var(--surface-elevated, #f4f4f5) 8%)",
    gutterForeground: "#a0a1a7",
    lineHighlight: "color-mix(in oklab, var(--primary, #e11d48) 4%, transparent)",
    fontFamily: mono,
  },
  styles: mdLight,
});

export const cursorMarkdownDarkTheme = vscodeDarkInit({
  settings: {
    background: "var(--code-bg, #1e1e1e)",
    foreground: "#d4d4d4",
    gutterBackground: "color-mix(in oklab, var(--code-bg, #1e1e1e) 88%, var(--surface-elevated, #2a2a2a) 12%)",
    gutterForeground: "#6e6e6e",
    lineHighlight: "#ffffff0a",
    fontFamily: mono,
  },
  styles: mdDark,
});

export function cursorThemeForFile(relPath: string, isDark: boolean) {
  const isMd = /\.(md|mdx|markdown)$/i.test(relPath);
  if (isMd) return isDark ? cursorMarkdownDarkTheme : cursorMarkdownLightTheme;
  return isDark ? cursorCodeDarkTheme : cursorCodeLightTheme;
}

/** @deprecated 使用 cursorThemeForFile */
export const cursorLightTheme = cursorCodeLightTheme;
export const cursorDarkTheme = cursorCodeDarkTheme;
