import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { ensureVscodeIcons } from "@/lib/explorer-iconify-setup";

type IconPair = { dark: string; light?: string };

function baseName(fileName?: string): string {
  const n = (fileName ?? "").trim();
  if (!n) return "";
  return n.split("/").pop()?.toLowerCase() ?? n.toLowerCase();
}

function inferExt(ext?: string, fileName?: string): string {
  const e = (ext ?? "").toLowerCase();
  if (e) return e;
  const base = baseName(fileName);
  if (!base.includes(".")) return "";
  if (base.startsWith(".")) {
    const parts = base.split(".").filter(Boolean);
    return parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  }
  return base.split(".").pop()?.toLowerCase() ?? "";
}

function vscodeIcon(id: string): string {
  return `vscode-icons:${id}`;
}

function pickPair(pair: IconPair, theme: "light" | "dark"): string {
  if (theme === "light" && pair.light) return vscodeIcon(pair.light);
  return vscodeIcon(pair.dark);
}

/** 扩展名 → 图标（同类文件统一；浅色主题优先 light 变体） */
const EXT_ICON: Record<string, IconPair> = {
  md: { dark: "file-type-markdown", light: "file-type-light-mdx" },
  mdx: { dark: "file-type-markdown", light: "file-type-light-mdx" },
  json: { dark: "file-type-json-official", light: "file-type-light-json" },
  jsonc: { dark: "file-type-json-official", light: "file-type-light-json" },
  js: { dark: "file-type-js", light: "file-type-light-js" },
  mjs: { dark: "file-type-js", light: "file-type-light-js" },
  cjs: { dark: "file-type-js", light: "file-type-light-js" },
  ts: { dark: "file-type-typescript-official" },
  tsx: { dark: "file-type-reactts" },
  jsx: { dark: "file-type-reactjs" },
  html: { dark: "file-type-html" },
  htm: { dark: "file-type-html" },
  css: { dark: "file-type-css2" },
  scss: { dark: "file-type-sass" },
  sass: { dark: "file-type-sass" },
  less: { dark: "file-type-less" },
  py: { dark: "file-type-python" },
  yaml: { dark: "file-type-yaml-official", light: "file-type-light-yaml-official" },
  yml: { dark: "file-type-yaml-official", light: "file-type-light-yaml-official" },
  toml: { dark: "file-type-toml", light: "file-type-light-toml" },
  sh: { dark: "file-type-shell" },
  bash: { dark: "file-type-shell" },
  zsh: { dark: "file-type-shell" },
  ps1: { dark: "file-type-powershell" },
  psm1: { dark: "file-type-powershell" },
  xml: { dark: "file-type-xml" },
  sql: { dark: "file-type-sql" },
  woff: { dark: "file-type-font", light: "file-type-light-font" },
  woff2: { dark: "file-type-font", light: "file-type-light-font" },
  ttf: { dark: "file-type-font", light: "file-type-light-font" },
  otf: { dark: "file-type-font", light: "file-type-light-font" },
  png: { dark: "file-type-image" },
  jpg: { dark: "file-type-image" },
  jpeg: { dark: "file-type-image" },
  gif: { dark: "file-type-image" },
  webp: { dark: "file-type-image" },
  svg: { dark: "file-type-svg" },
  pdf: { dark: "file-type-pdf" },
  zip: { dark: "file-type-zip" },
  gz: { dark: "file-type-zip" },
  tar: { dark: "file-type-zip" },
  lock: { dark: "file-type-lock" },
};

const NAMED_FILE_ICON: Record<string, IconPair> = {
  "readme.md": { dark: "file-type-readthedocs", light: "file-type-light-readthedocs" },
  "changelog.md": { dark: "file-type-log" },
  "license": { dark: "file-type-license" },
  ".gitignore": { dark: "file-type-git" },
  ".gitattributes": { dark: "file-type-git" },
  ".gitmodules": { dark: "file-type-git" },
  "package.json": { dark: "file-type-npm" },
  "package-lock.json": { dark: "file-type-npm" },
  makefile: { dark: "file-type-makefile" },
  gnumakefile: { dark: "file-type-makefile" },
  "bunfig.toml": { dark: "file-type-bun" },
  "bun.lockb": { dark: "file-type-bun" },
  "bun.lock": { dark: "file-type-bun" },
  "tsconfig.json": { dark: "file-type-tsconfig" },
  ".npmrc": { dark: "file-type-npm" },
  "feed.xml": { dark: "file-type-rss" },
};

function namedFileIcon(base: string, theme: "light" | "dark"): string | null {
  if (NAMED_FILE_ICON[base]) return pickPair(NAMED_FILE_ICON[base], theme);
  if (base.startsWith("license.")) return pickPair(NAMED_FILE_ICON.license, theme);
  if (base.startsWith("dockerfile")) return vscodeIcon("file-type-docker");
  if (base.startsWith(".env")) return vscodeIcon("file-type-dotenv");
  if (base === ".prettierrc" || base === ".prettierignore" || base.startsWith(".prettierrc.")) {
    return pickPair({ dark: "file-type-prettier", light: "file-type-light-prettier" }, theme);
  }
  if (base === ".eslintrc" || base.startsWith(".eslintrc.") || base === "eslint.config.js" || base === "eslint.config.mjs") {
    return vscodeIcon("file-type-eslint");
  }
  if (base.endsWith(".config.js") || base.endsWith(".config.ts") || base.endsWith(".config.mjs")) {
    return pickPair({ dark: "file-type-config", light: "file-type-light-config" }, theme);
  }
  if (base === "vite.config.ts" || base === "vite.config.js" || base === "vite.config.mts") {
    return pickPair({ dark: "file-type-vite", light: "file-type-light-vite" }, theme);
  }
  if (base.endsWith(".tsconfig.json")) return vscodeIcon("file-type-tsconfig");
  if (base.endsWith(".rss")) return vscodeIcon("file-type-rss");
  return null;
}

/** 文件图标 id；目录返回 null（不展示文件夹图标） */
export function explorerIconifyId(
  ext?: string,
  fileName?: string,
  isDir?: boolean,
  theme: "light" | "dark" = "light",
): string | null {
  if (isDir) return null;

  const base = baseName(fileName);
  const e = inferExt(ext, fileName);

  const named = namedFileIcon(base, theme);
  if (named) return named;

  if (base.startsWith(".") && !e) return vscodeIcon("file-type-text");

  const byExt = EXT_ICON[e];
  if (byExt) return pickPair(byExt, theme);

  return vscodeIcon("default-file");
}

export function ExplorerTreeIcon({
  ext,
  fileName,
  isDir,
  className,
}: {
  ext?: string;
  fileName?: string;
  isDir?: boolean;
  expanded?: boolean;
  className?: string;
}) {
  const { resolved } = useTheme();
  if (isDir) return null;

  ensureVscodeIcons();
  const icon = explorerIconifyId(ext, fileName, false, resolved);
  if (!icon) return null;

  return (
    <span className="explorer-tree-icon-wrap inline-flex shrink-0 items-center justify-center">
      <Icon
        icon={icon}
        className={cn("explorer-tree-icon", className)}
        width="100%"
        height="100%"
        aria-hidden
      />
    </span>
  );
}
