/**
 * 解析 Seti 文件图标（与 theme-seti 一致）。
 * 查找顺序：fileNames → 最长 fileExtensions → languageIds → theme.file → _default。
 * 禁止二次硬编码假图标色；缺定义时抛错。
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
  folder?: string;
  folderExpanded?: string;
};

const root = theme as {
  file: string;
  folder?: string;
  folderExpanded?: string;
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

/** 单段扩展名（兼容旧调用）；复合后缀见 matchFileExtension */
function inferExt(fileName: string): string {
  const matched = matchFileExtension(fileName, root.fileExtensions);
  if (matched) return matched;
  const base = baseName(fileName).toLowerCase();
  if (!base.includes(".")) return "";
  if (base.startsWith(".")) {
    const parts = base.slice(1).split(".");
    if (parts.length === 1) return parts[0] ?? "";
    return parts[parts.length - 1] ?? "";
  }
  return base.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * 最长后缀匹配（spec.ts、css.map、.eslintrc.js 等）。
 * 返回命中的 fileExtensions key，未命中返回 ""。
 */
export function matchFileExtension(
  fileName: string,
  fileExtensions: Record<string, string>,
): string {
  const base = baseName(fileName).toLowerCase();
  if (!base) return "";
  const candidates: string[] = [];
  if (base.startsWith(".")) {
    candidates.push(base.slice(1));
  }
  const parts = base.split(".");
  if (parts.length >= 2) {
    for (let i = 1; i < parts.length; i++) {
      candidates.push(parts.slice(i).join("."));
    }
  }
  candidates.sort((a, b) => b.length - a.length);
  for (const c of candidates) {
    if (c && fileExtensions[c]) return c;
  }
  return "";
}

function pickId(
  maps: ThemeMaps,
  fallback: ThemeMaps,
  base: string,
  extKey: string,
  lang: string | undefined,
): string {
  const fromName = maps.fileNames[base] || fallback.fileNames[base];
  if (fromName) return fromName;
  if (extKey) {
    const fromExt = maps.fileExtensions[extKey] || fallback.fileExtensions[extKey];
    if (fromExt) return fromExt;
  }
  if (lang) {
    const fromLang = maps.languageIds[lang] || fallback.languageIds[lang];
    if (fromLang) return fromLang;
  }
  return maps.file || fallback.file || "_default";
}

function resolveDef(id: string, light: boolean): SetiIconResolved {
  const defs = root.iconDefinitions;
  const prefer = light && !id.endsWith("_light") ? `${id}_light` : id;
  const entry = defs[prefer] || defs[id] || defs._default || defs._default_light;
  if (!entry?.ch || !entry.color) {
    throw new Error(`Seti iconDefinitions 缺少可用条目: ${id}`);
  }
  return { ch: entry.ch, color: entry.color, id: prefer in defs ? prefer : id };
}

function themeMaps(light: boolean): { maps: ThemeMaps; fallback: ThemeMaps } {
  const maps: ThemeMaps = light
    ? {
        file: root.light.file,
        fileExtensions: root.light.fileExtensions,
        fileNames: root.light.fileNames,
        languageIds: root.light.languageIds,
        folder: root.light.folder ?? root.folder,
        folderExpanded: root.light.folderExpanded ?? root.folderExpanded,
      }
    : {
        file: root.file,
        fileExtensions: root.fileExtensions,
        fileNames: root.fileNames,
        languageIds: root.languageIds,
        folder: root.folder,
        folderExpanded: root.folderExpanded,
      };
  const fallback: ThemeMaps = {
    file: root.file,
    fileExtensions: root.fileExtensions,
    fileNames: root.fileNames,
    languageIds: root.languageIds,
    folder: root.folder,
    folderExpanded: root.folderExpanded,
  };
  return { maps, fallback };
}

/** 目录图标（theme JSON 的 folder / folderExpanded） */
export function resolveSetiFolderIcon(
  expanded: boolean,
  theme: "light" | "dark" = "dark",
): SetiIconResolved {
  const light = theme === "light";
  const { maps, fallback } = themeMaps(light);
  const id =
    (expanded
      ? maps.folderExpanded || fallback.folderExpanded
      : maps.folder || fallback.folder) || "_folder";
  return resolveDef(id, light);
}

/** 按文件名解析 Seti 图标（与资源管理器一致） */
export function resolveSetiIcon(
  fileName?: string,
  opts?: { ext?: string; theme?: "light" | "dark" },
): SetiIconResolved {
  const light = (opts?.theme ?? "dark") === "light";
  const base = baseName(fileName).toLowerCase();
  const { maps, fallback } = themeMaps(light);

  let extKey = "";
  if (opts?.ext) {
    const e = opts.ext.toLowerCase().replace(/^\./, "");
    if (maps.fileExtensions[e] || fallback.fileExtensions[e]) extKey = e;
  }
  if (!extKey) {
    extKey = matchFileExtension(fileName ?? "", maps.fileExtensions);
    if (!extKey) extKey = matchFileExtension(fileName ?? "", fallback.fileExtensions);
  }
  if (!extKey && opts?.ext) {
    extKey = opts.ext.toLowerCase().replace(/^\./, "");
  }
  if (!extKey) {
    extKey = inferExt(fileName ?? "");
  }

  // VS Code：.env、.env.*、.env.local 等均走 config（fileExtensions.env）
  if (base === ".env" || base.startsWith(".env.") || base.startsWith(".env_")) {
    extKey = "env";
  }

  let lang = EXT_TO_LANG[extKey.split(".").pop() ?? extKey];
  if (base === ".gitignore" || base === ".gitattributes" || base === ".gitmodules") {
    lang = "ignore";
  }
  if (base === "dockerfile" || base.startsWith("dockerfile.")) {
    lang = "dockerfile";
  }
  if (base === "makefile" || base === "gnumakefile") {
    lang = "makefile";
  }

  const id = pickId(maps, fallback, base, extKey, lang);
  return resolveDef(id, light);
}

/** 终端 / shell 用的 Seti 图标 */
export function resolveSetiShellIcon(theme: "light" | "dark" = "dark"): SetiIconResolved {
  return resolveSetiIcon("terminal.sh", { theme });
}
