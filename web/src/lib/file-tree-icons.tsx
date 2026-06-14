import type { LucideIcon } from "lucide-react";
import {
  FileCode2,
  FileJson2,
  FileText,
  FileType,
  Globe,
  Settings2,
} from "lucide-react";

export function fileIconFor(ext?: string, fileName?: string): LucideIcon {
  const e = (ext ?? "").toLowerCase();
  const name = (fileName ?? "").toLowerCase();

  if (e === "json" || e === "jsonc") return FileJson2;
  if (e === "html" || e === "htm") return Globe;
  if (e === "md" || e === "mdx") return FileText;
  if (e === "ts" || e === "tsx" || e === "js" || e === "jsx" || e === "mjs" || e === "cjs") return FileCode2;
  if (name === "package.json" || name.endsWith(".config.js") || name.endsWith(".config.ts")) return Settings2;
  return FileType;
}

export function fileIconClass(ext?: string, fileName?: string): string {
  const e = (ext ?? "").toLowerCase();
  const name = (fileName ?? "").toLowerCase();

  if (e === "json" || e === "jsonc") return "text-amber-600/90 dark:text-amber-400/90";
  if (e === "html" || e === "htm") return "text-orange-500/90";
  if (e === "ts" || e === "tsx") return "text-sky-600/90 dark:text-sky-400/90";
  if (e === "js" || e === "jsx" || e === "mjs" || e === "cjs") return "text-yellow-600/90 dark:text-yellow-400/90";
  if (e === "md" || e === "mdx") return "text-blue-500/80";
  if (name.endsWith(".config.js") || name.endsWith(".config.ts")) return "text-violet-500/90";
  return "text-muted-foreground/85";
}
