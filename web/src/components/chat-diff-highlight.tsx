import type { ReactNode } from "react";

const TS_KEYWORDS =
  /\b(import|export|from|as|const|let|var|function|return|if|else|type|interface|extends|new|async|await|default|case|switch|while|for|of|in|class|public|private|protected|readonly|void|null|undefined|true|false)\b/g;
const TS_TYPES = /\b([A-Z][A-Za-z0-9_]*)\b/g;
const STRINGS = /(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
const COMMENTS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
const NUMBERS = /\b(\d+(?:\.\d+)?)\b/g;

function wrapClass(text: string, cls: string): ReactNode {
  return <span className={cls}>{text}</span>;
}

function highlightWithRules(text: string, rules: { re: RegExp; cls: string }[]): ReactNode[] {
  type Part = { start: number; end: number; cls: string };
  const parts: Part[] = [];
  for (const { re, cls } of rules) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      parts.push({ start: m.index, end: m.index + m[0].length, cls });
    }
  }
  parts.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Part[] = [];
  for (const p of parts) {
    if (merged.some((x) => p.start < x.end && p.end > x.start)) continue;
    merged.push(p);
  }
  merged.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let i = 0;
  for (const p of merged) {
    if (p.start > i) out.push(text.slice(i, p.start));
    out.push(wrapClass(text.slice(p.start, p.end), p.cls));
    i = p.end;
  }
  if (i < text.length) out.push(text.slice(i));
  return out.length ? out : [text];
}

/** 轻量语法着色（diff 行内高亮） */
export function highlightDiffLine(text: string, language: string): ReactNode {
  const lang = language.toLowerCase();
  if (lang === "markdown") {
    return highlightWithRules(text, [
      { re: /^#{1,6}\s.+$/g, cls: "chat-diff-tok-heading" },
      { re: STRINGS, cls: "chat-diff-tok-string" },
      { re: COMMENTS, cls: "chat-diff-tok-comment" },
    ]);
  }
  if (lang === "css" || lang === "scss") {
    return highlightWithRules(text, [
      { re: COMMENTS, cls: "chat-diff-tok-comment" },
      { re: STRINGS, cls: "chat-diff-tok-string" },
      { re: /#[\w-]+|\.\w[\w-]*/g, cls: "chat-diff-tok-type" },
      { re: /[a-z-]+(?=\s*:)/gi, cls: "chat-diff-tok-keyword" },
    ]);
  }
  return highlightWithRules(text, [
    { re: COMMENTS, cls: "chat-diff-tok-comment" },
    { re: STRINGS, cls: "chat-diff-tok-string" },
    { re: TS_KEYWORDS, cls: "chat-diff-tok-keyword" },
    { re: TS_TYPES, cls: "chat-diff-tok-type" },
    { re: NUMBERS, cls: "chat-diff-tok-number" },
  ]);
}
