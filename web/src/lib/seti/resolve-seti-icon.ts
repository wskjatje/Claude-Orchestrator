/**
 * 解析 Seti 文件图标（与 theme-seti 一致）。
 * 查找顺序：fileNames → fileExtensions → languageIds → default file。
 */
import theme from "./vs-seti-icons.json";

export type SetiIconResolved = {
  /** 字体字符 */
  ch: string;
  /** Seti 主题色 */
  color: string;
  /** iconDefinitions 键，调试用 */
  id: string;
};

type ThemeMaps = {
  file: string;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  languageIds: Record<string, string>;
};

const root = theme as {
  file: string;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  languageIds: Record<string, string>;
  light: ThemeMaps;
  iconDefinitions: Record<string, { ch: string; color: string }>;
};

/** 扩展名 → VS Code languageId（Seti 对常见语言走 languageIds） */
const EXT_TO_LANG: Record<string, string> = {
  py: "python",
  pyw: "python",
  pyi: "python",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascriptreact",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "typescriptreact",
  md: "markdown",
  mdx: "markdown",
  json: "json",
  jsonc: "jsonc",
  jsonl: "jsonl",
  html: "html",
  htm: "html",
  css: "css",
  less: "less",
  scss: "scss",
  sass: "sass",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  fish: "shellscript",
  ps1: "powershell",
  psm1: "powershell",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  rb: "ruby",
  php: "php",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  swift: "swift",
  sql: "sql",
  xml: "xml",
  yml: "yaml",
  yaml: "yaml",
  vue: "vue",
  svelte: "svelte",
  lua: "lua",
  r: "r",
  dart: "dart",
  ex: "elixir",
  exs: "elixir",
  hs: "haskell",
  clj: "clojure",
  groovy: "groovy",
  gradle: "gradle",
  tf: "terraform",
  dockerfile: "dockerfile",
  gitignore: "ignore",
  gitattributes: "ignore",
};

function baseName(fileName?: string): string {
  const n = (fileName ?? "").trim();
  if (!n) return "";
  return n.split("/").pop() ?? n;
}

function inferExt(fileName: string): string {
  const base = baseName(fileName).toLowerCase();
  if (!base.includes(".")) return "";
  if (base.startsWith(".")) {
    // .env / .gitignore / .eslintrc.js
    const parts = base.slice(1).split(".");
    if (parts.length === 1) return parts[0] ?? "";
    return parts[parts.length - 1] ?? "";
  }
  return base.split(".").pop()?.toLowerCase() ?? "";
}

function pickId(
  maps: ThemeMaps,
  fallback: ThemeMaps,
  base: string,
  ext: string,
  lang: string | undefined,
): string {
  return (
    maps.fileNames[base] ||
    fallback.fileNames[base] ||
    (ext && (maps.fileExtensions[ext] || fallback.fileExtensions[ext])) ||
    (lang && (maps.languageIds[lang] || fallback.languageIds[lang])) ||
    maps.file ||
    fallback.file ||
    "_default"
  );
}

function resolveDef(id: string, light: boolean): SetiIconResolved {
  const defs = root.iconDefinitions;
  const prefer = light && !id.endsWith("_light") ? `${id}_light` : id;
  const entry = defs[prefer] || defs[id] || defs._default || defs._default_light;
  if (!entry) {
    return { ch: "\uE023", color: light ? "#bfc2c1" : "#d4d7d6", id: "_default" };
  }
  return { ch: entry.ch, color: entry.color, id: prefer in defs ? prefer : id };
}

/** 按文件名解析 Seti 图标（与资源管理器一致） */
export function resolveSetiIcon(
  fileName?: string,
  opts?: { ext?: string; theme?: "light" | "dark" },
): SetiIconResolved {
  const light = (opts?.theme ?? "dark") === "light";
  const base = baseName(fileName).toLowerCase();
  let ext = (opts?.ext ?? inferExt(fileName ?? "")).toLowerCase();

  // VS Code：.env、.env.*、.env.local 等均走 config（fileExtensions.env）
  if (base === ".env" || base.startsWith(".env.") || base.startsWith(".env_")) {
    ext = "env";
  }

  let lang = EXT_TO_LANG[ext];
  if (base === ".gitignore" || base === ".gitattributes" || base === ".gitmodules") {
    lang = "ignore";
  }
  if (base === "dockerfile" || base.startsWith("dockerfile.")) {
    lang = "dockerfile";
  }
  if (base === "makefile" || base === "gnumakefile") {
    lang = "makefile";
  }

  const maps: ThemeMaps = light
    ? {
        file: root.light.file,
        fileExtensions: root.light.fileExtensions,
        fileNames: root.light.fileNames,
        languageIds: root.light.languageIds,
      }
    : {
        file: root.file,
        fileExtensions: root.fileExtensions,
        fileNames: root.fileNames,
        languageIds: root.languageIds,
      };

  const fallback: ThemeMaps = {
    file: root.file,
    fileExtensions: root.fileExtensions,
    fileNames: root.fileNames,
    languageIds: root.languageIds,
  };

  const id = pickId(maps, fallback, base, ext, lang);
  return resolveDef(id, light);
}

/** 终端 / shell 用的 Seti 图标 */
export function resolveSetiShellIcon(theme: "light" | "dark" = "dark"): SetiIconResolved {
  return resolveSetiIcon("terminal.sh", { theme });
}
