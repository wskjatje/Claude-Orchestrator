/** 由路径或扩展名推断语言 id */
export function languageFromPath(relPath: string): string {
  const base = relPath.split("/").pop() ?? relPath;
  const lower = base.toLowerCase();
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";

  const nameMap: Record<string, string> = {
    ".gitignore": "plain",
    ".npmrc": "plain",
    ".nvmrc": "plain",
    ".editorconfig": "plain",
    ".env": "plain",
    ".env.example": "plain",
    ".prettierrc": "json",
    ".eslintrc": "json",
    ".babelrc": "json",
    ".stylelintrc": "json",
    dockerfile: "docker",
  };
  if (nameMap[lower]) return nameMap[lower];

  const map: Record<string, string> = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    jsonc: "json",
    lock: "json",
    md: "markdown",
    mdx: "markdown",
    html: "markup",
    htm: "markup",
    xml: "markup",
    svg: "markup",
    vue: "markup",
    css: "css",
    scss: "css",
    less: "css",
    py: "python",
    pyw: "python",
    go: "go",
    rs: "rust",
    rb: "ruby",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    yml: "yaml",
    yaml: "yaml",
    sql: "sql",
    toml: "toml",
    ini: "plain",
    conf: "plain",
    cfg: "plain",
    txt: "plain",
    log: "plain",
    prisma: "plain",
  };

  if (lower === "dockerfile") return "docker";
  if (lower === "makefile") return "bash";
  if (lower === "cmakelists.txt") return "plain";
  if (lower.endsWith(".config.js") || lower.endsWith(".config.mjs") || lower.endsWith(".config.cjs")) {
    return "javascript";
  }
  if (lower.endsWith(".config.ts") || lower.endsWith(".config.tsx")) {
    return "typescript";
  }
  if (lower === "package.json" || lower.endsWith(".json")) return "json";

  return map[ext] ?? "plain";
}

/** 无扩展名或未知扩展名时，根据内容片段推断语言 */
export function inferLanguageFromContent(text: string, relPath: string): string {
  const fromPath = languageFromPath(relPath);
  if (fromPath !== "plain") return fromPath;

  const sample = text.trim().slice(0, 8192);
  if (!sample) return "plain";

  if (sample.startsWith("#!")) return "bash";
  if ((sample.startsWith("{") || sample.startsWith("[")) && looksLikeJson(sample)) return "json";
  if (sample.startsWith("<") && /<[a-z!?]/i.test(sample)) return "markup";
  if (/^---\s*$/m.test(sample.slice(0, 200))) return "yaml";

  return "plain";
}

function looksLikeJson(sample: string): boolean {
  try {
    JSON.parse(sample);
    return true;
  } catch {
    return false;
  }
}
