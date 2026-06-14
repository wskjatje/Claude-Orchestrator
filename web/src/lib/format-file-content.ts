import { languageFromPath } from "@/lib/code-language";

/** 打开文件时规范化展示内容（不改变语义，仅改善可读性） */
export function normalizeFileContentForEditor(relPath: string, raw: string): string {
  const lang = languageFromPath(relPath);
  if (lang === "json") return prettifyJson(raw);
  return raw;
}

function prettifyJson(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  // 已是多行缩进格式则保持原样
  if (raw.includes("\n") && /^\s*[\[{]/.test(raw)) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    return `${JSON.stringify(parsed, null, 2)}\n`;
  } catch {
    return raw;
  }
}
