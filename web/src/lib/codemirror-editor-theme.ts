/**
 * 编辑器语法配色
 * - Light：Light（editor #FCFCFC / fg #141414；关键字红、字符串紫等）
 * - Dark：Dark（editor #181818）
 * - Markdown：标记弱化、标题/代码/正文分层
 */
import { tags as t } from "@lezer/highlight";
import { vscodeDarkInit, vscodeLightInit } from "@uiw/codemirror-theme-vscode";

const mono =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * Light token（Light / docs 常用语义色）
 * keywords #B31B3F · functions #DB704B · strings #9E94D5 · types #206595
 * comments #6F6F6F · numbers #B8448B · properties #6049B3 · builtins #6F9BA6
 */
const codeLight = [
  { tag: t.keyword, color: "#b31b3f" },
  { tag: [t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "#b31b3f" },
  { tag: [t.bool, t.null], color: "#206595" },
  { tag: [t.string, t.special(t.string), t.character], color: "#9e94d5" },
  { tag: t.number, color: "#b8448b" },
  { tag: [t.typeName, t.className, t.namespace, t.self], color: "#206595" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: "#db704b" },
  { tag: t.propertyName, color: "#6049b3", fontWeight: "500" as const },
  { tag: [t.variableName, t.definition(t.variableName)], color: "#141414" },
  { tag: t.tagName, color: "#b31b3f" },
  { tag: t.attributeName, color: "#6049b3" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "#6f6f6f", fontStyle: "italic" as const },
  { tag: t.meta, color: "#1f8a65" },
  { tag: t.regexp, color: "#1f8a65" },
  { tag: t.operator, color: "#141414" },
  { tag: t.punctuation, color: "#141414" },
  { tag: t.bracket, color: "#141414" },
  { tag: t.invalid, color: "#be1744" },
];

/** Dark token */
const codeDark = [
  { tag: t.propertyName, color: "#9cdcfe" },
  { tag: [t.string, t.special(t.string), t.character], color: "#ce9178" },
  { tag: t.number, color: "#b5cea8" },
  { tag: [t.keyword, t.bool, t.null], color: "#569cd6" },
  { tag: [t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "#c586c0" },
  { tag: [t.typeName, t.className, t.namespace, t.self], color: "#4ec9b0" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: "#dcdcaa" },
  { tag: [t.variableName, t.definition(t.variableName)], color: "#9cdcfe" },
  { tag: t.tagName, color: "#569cd6" },
  { tag: t.attributeName, color: "#9cdcfe" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "#6a9955", fontStyle: "italic" as const },
  { tag: t.meta, color: "#6a9955" },
  { tag: t.regexp, color: "#d16969" },
  { tag: t.operator, color: "#d4d4d4" },
  { tag: t.punctuation, color: "#d4d4d4" },
  { tag: t.bracket, color: "#d4d4d4" },
  { tag: t.invalid, color: "#f44747" },
];

const mdLight = [
  { tag: t.processingInstruction, color: "#8a8a8a" },
  { tag: t.labelName, color: "#8a8a8a" },
  { tag: t.content, color: "#141414" },
  {
    tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6],
    color: "#206595",
    fontWeight: "600" as const,
  },
  { tag: t.monospace, color: "#db704b" },
  { tag: t.strong, fontWeight: "600" as const },
  { tag: t.emphasis, fontStyle: "italic" as const },
  { tag: t.link, color: "#2778c1", textDecoration: "underline" as const },
  { tag: t.url, color: "#2778c1" },
  { tag: t.quote, color: "#1f8a65", fontStyle: "italic" as const },
  { tag: t.list, color: "#141414" },
  ...codeLight,
];

const mdDark = [
  { tag: t.processingInstruction, color: "#808080" },
  { tag: t.labelName, color: "#808080" },
  { tag: t.content, color: "#d4d4d4" },
  {
    tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6],
    color: "#569cd6",
    fontWeight: "600" as const,
  },
  { tag: t.monospace, color: "#ce9178" },
  { tag: t.strong, fontWeight: "600" as const },
  { tag: t.emphasis, fontStyle: "italic" as const },
  { tag: t.link, color: "#4ec9b0", textDecoration: "underline" as const },
  { tag: t.url, color: "#4ec9b0" },
  { tag: t.quote, color: "#6a9955", fontStyle: "italic" as const },
  { tag: t.list, color: "#d4d4d4" },
  ...codeDark,
];

/** Light：editor #FCFCFC · sideBar/gutter 近 #F3F3F3 · fg #141414 */
export const editorCodeLightTheme = vscodeLightInit({
  settings: {
    background: "#fcfcfc",
    foreground: "#141414",
    caret: "#141414",
    selection: "#14141424",
    selectionMatch: "#14141418",
    gutterBackground: "#fcfcfc",
    gutterForeground: "#14141466",
    gutterBorder: "#14141414",
    lineHighlight: "#1414140a",
    fontFamily: mono,
  },
  styles: codeLight,
});

/** Dark：editor #181818 · sideBar #141414 */
export const editorCodeDarkTheme = vscodeDarkInit({
  settings: {
    background: "#181818",
    foreground: "#d4d4d4",
    caret: "#f0f0f0",
    selection: "#f0f0f01e",
    selectionMatch: "#f0f0f014",
    gutterBackground: "#181818",
    gutterForeground: "#f0f0f066",
    gutterBorder: "#f0f0f013",
    lineHighlight: "#ffffff0a",
    fontFamily: mono,
  },
  styles: codeDark,
});

export const editorMarkdownLightTheme = vscodeLightInit({
  settings: {
    background: "#fcfcfc",
    foreground: "#141414",
    caret: "#141414",
    selection: "#14141424",
    selectionMatch: "#14141418",
    gutterBackground: "#fcfcfc",
    gutterForeground: "#14141466",
    gutterBorder: "#14141414",
    lineHighlight: "#1414140a",
    fontFamily: mono,
  },
  styles: mdLight,
});

export const editorMarkdownDarkTheme = vscodeDarkInit({
  settings: {
    background: "#181818",
    foreground: "#d4d4d4",
    caret: "#f0f0f0",
    selection: "#f0f0f01e",
    selectionMatch: "#f0f0f014",
    gutterBackground: "#181818",
    gutterForeground: "#f0f0f066",
    gutterBorder: "#f0f0f013",
    lineHighlight: "#ffffff0a",
    fontFamily: mono,
  },
  styles: mdDark,
});

export function editorThemeForFile(relPath: string, isDark: boolean) {
  const isMd = /\.(md|mdown|mkd|mdwn|mdtxt|mdtext|markdown|mdx)$/i.test(relPath);
  if (isMd) return isDark ? editorMarkdownDarkTheme : editorMarkdownLightTheme;
  return isDark ? editorCodeDarkTheme : editorCodeLightTheme;
}

/** @deprecated 使用 editorThemeForFile */
export const editorLightTheme = editorCodeLightTheme;
export const editorDarkTheme = editorCodeDarkTheme;
