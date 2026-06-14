import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { ensureVscodeIcons } from "@/lib/explorer-iconify-setup";

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

/** vscode-icons — 与 Cursor Material Icon Theme 文件名规则对齐 */
export function explorerIconifyId(ext?: string, fileName?: string, isDir?: boolean, expanded?: boolean): string {
  if (isDir) {
    return expanded ? "vscode-icons:folder-opened" : "vscode-icons:folder";
  }

  const base = baseName(fileName);
  const e = inferExt(ext, fileName);

  if (base === ".gitignore" || base === ".gitattributes" || base === ".gitmodules") {
    return "vscode-icons:file-type-git";
  }
  if (base === "license" || base.startsWith("license.")) return "vscode-icons:file-type-license";
  if (base === "makefile" || base === "gnumakefile") return "vscode-icons:file-type-makefile";
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "vscode-icons:file-type-docker";
  if (base === "package.json" || base === "package-lock.json") return "vscode-icons:file-type-npm";
  if (base === "bunfig.toml") return "vscode-icons:file-type-bun";
  if (base === "bun.lockb" || base === "bun.lock") return "vscode-icons:file-type-bun";
  if (base === "tsconfig.json" || base.endsWith(".tsconfig.json")) return "vscode-icons:file-type-tsconfig";
  if (base.startsWith(".env")) return "vscode-icons:file-type-dotenv";
  if (base === ".npmrc") return "vscode-icons:file-type-npm";
  if (base === ".prettierrc" || base === ".prettierignore" || base.startsWith(".prettierrc.")) {
    return "vscode-icons:file-type-prettier";
  }
  if (base === ".eslintrc" || base.startsWith(".eslintrc.") || base === "eslint.config.js" || base === "eslint.config.mjs") {
    return "vscode-icons:file-type-eslint";
  }
  if (base.endsWith(".config.js") || base.endsWith(".config.ts") || base.endsWith(".config.mjs")) {
    return "vscode-icons:file-type-config";
  }
  if (base === "feed.xml" || base.endsWith(".rss")) return "vscode-icons:file-type-rss";
  if (base === "vite.config.ts" || base === "vite.config.js" || base === "vite.config.mts") {
    return "vscode-icons:file-type-vite";
  }
  if (base.startsWith(".") && !e) return "vscode-icons:file-type-text";

  if (e === "json" || e === "jsonc") return "vscode-icons:file-type-json";
  if (e === "md" || e === "mdx") return "vscode-icons:file-type-markdown";
  if (e === "html" || e === "htm") return "vscode-icons:file-type-html";
  if (e === "css") return "vscode-icons:file-type-css";
  if (e === "scss" || e === "sass") return "vscode-icons:file-type-sass";
  if (e === "less") return "vscode-icons:file-type-less";
  if (e === "tsx") return "vscode-icons:file-type-reactts";
  if (e === "ts") return "vscode-icons:file-type-typescript";
  if (e === "jsx") return "vscode-icons:file-type-reactjs";
  if (e === "js" || e === "mjs" || e === "cjs") return "vscode-icons:file-type-js";
  if (e === "yaml" || e === "yml") return "vscode-icons:file-type-yaml";
  if (e === "toml") return "vscode-icons:file-type-toml";
  if (e === "sh" || e === "bash" || e === "zsh") return "vscode-icons:file-type-shell";
  if (e === "ps1" || e === "psm1") return "vscode-icons:file-type-powershell";
  if (e === "xml") return "vscode-icons:file-type-xml";
  if (e === "sql") return "vscode-icons:file-type-sql";
  if (e === "png" || e === "jpg" || e === "jpeg" || e === "gif" || e === "webp") return "vscode-icons:file-type-image";
  if (e === "svg") return "vscode-icons:file-type-svg";
  if (e === "pdf") return "vscode-icons:file-type-pdf";
  if (e === "zip" || e === "gz" || e === "tar") return "vscode-icons:file-type-zip";
  if (e === "lock") return "vscode-icons:file-type-lock";
  return "vscode-icons:default-file";
}

export function ExplorerTreeIcon({
  ext,
  fileName,
  isDir,
  expanded,
  className,
}: {
  ext?: string;
  fileName?: string;
  isDir?: boolean;
  expanded?: boolean;
  className?: string;
}) {
  ensureVscodeIcons();
  const icon = explorerIconifyId(ext, fileName, isDir, expanded);
  return (
    <span className="explorer-tree-icon-wrap inline-flex shrink-0 items-center justify-center">
      <Icon icon={icon} className={cn("explorer-tree-icon", className)} width={16} height={16} aria-hidden />
    </span>
  );
}
