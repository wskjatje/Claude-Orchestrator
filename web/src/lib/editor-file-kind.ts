import { languageFromPath } from "@/lib/code-language";
import { isBinaryPath } from "@/lib/is-binary-file";

/** 常见 Markdown 扩展名（含 mdx） */
const MARKDOWN_EXT = /\.(md|mdown|mkd|mdwn|mdtxt|mdtext|markdown|mdx)$/i;

/** 内联 Preview 默认排除的路径段 */
const PREVIEW_EXCLUDED_SEGMENTS = [".cursor", ".claude", ".codex"] as const;

/** 排除目录下的允许预览子路径 */
const PREVIEW_ALLOW_SUFFIXES = ["/.cursor/skills/"] as const;

/** 光栅图：打开即预览（非文本源码切换） */
const IMAGE_PREVIEW_EXT = /\.(png|jpe?g|gif|webp|bmp|ico|avif|icns|heic|heif)$/i;

const PDF_EXT = /\.pdf$/i;

/**
 * 打开策略
 * - text：CodeMirror 可编辑文本
 * - markdown / svg：文本 + 内联 Preview 切换
 * - image：媒体预览（可折叠 hex）
 * - pdf：PDF 内嵌预览（可折叠 hex）
 * - hex：仅十六进制（字体/音视频/压缩包等）
 */
export type FileOpenKind = "text" | "markdown" | "svg" | "image" | "pdf" | "hex";

export function isMarkdownPath(relPath: string): boolean {
  return MARKDOWN_EXT.test(relPath);
}

export function isHtmlPath(relPath: string): boolean {
  return /\.html?$/i.test(relPath);
}

export function isSvgPath(relPath: string): boolean {
  return /\.svg$/i.test(relPath);
}

export function isPdfPath(relPath: string): boolean {
  return PDF_EXT.test(relPath);
}

export function isImagePreviewPath(relPath: string): boolean {
  return IMAGE_PREVIEW_EXT.test(relPath) || isSvgPath(relPath);
}

/**
 * `.cursor` / `.claude` / `.codex` 下默认关闭内联 Markdown Preview，
 * 但 `.cursor/skills/` 等 allow-list 例外。
 */
export function isMarkdownPreviewExcludedPath(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/");
  const lower = `/${norm.toLowerCase()}`;
  for (const allow of PREVIEW_ALLOW_SUFFIXES) {
    if (lower.includes(allow)) return false;
  }
  const parts = norm.split("/").filter(Boolean);
  return PREVIEW_EXCLUDED_SEGMENTS.some((seg) => parts.includes(seg));
}

/** 是否显示 Preview | Markdown（或 Preview | SVG）切换 */
export function canInlineFilePreview(relPath: string): boolean {
  if (isSvgPath(relPath)) return true;
  if (!isMarkdownPath(relPath)) return false;
  return !isMarkdownPreviewExcludedPath(relPath);
}

export type InlinePreviewKind = "markdown" | "svg" | null;

export function inlinePreviewKind(relPath: string): InlinePreviewKind {
  if (!canInlineFilePreview(relPath)) return null;
  if (isSvgPath(relPath)) return "svg";
  if (isMarkdownPath(relPath)) return "markdown";
  return null;
}

/** 按扩展名判定打开方式（内容嗅探另见 isBinaryFileResult） */
export function fileOpenKind(relPath: string): FileOpenKind {
  if (isSvgPath(relPath)) return "svg";
  if (isMarkdownPath(relPath)) return "markdown";
  if (isPdfPath(relPath)) return "pdf";
  if (IMAGE_PREVIEW_EXT.test(relPath)) return "image";
  if (isBinaryPath(relPath)) return "hex";
  return "text";
}

/** 工具栏源码侧标签：Markdown / SVG / Source */
export function inlinePreviewSourceLabel(relPath: string): string {
  const kind = inlinePreviewKind(relPath);
  if (kind === "svg") return "SVG";
  if (kind === "markdown") return "Markdown";
  return "Source";
}

export function editorLanguageLabel(relPath: string): string {
  const lang = languageFromPath(relPath);
  const labels: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    json: "JSON",
    markdown: "Markdown",
    markup: "HTML",
    css: "CSS",
    yaml: "YAML",
    python: "Python",
    bash: "Shell",
    sql: "SQL",
    plain: "Plain Text",
  };
  return labels[lang] ?? lang;
}
