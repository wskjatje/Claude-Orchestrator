import { languageFromPath } from "@/lib/code-language";

export function isMarkdownPath(relPath: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(relPath);
}

export function isHtmlPath(relPath: string): boolean {
  return /\.html?$/i.test(relPath);
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
