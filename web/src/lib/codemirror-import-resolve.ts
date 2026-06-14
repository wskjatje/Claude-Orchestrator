const EXT_CANDIDATES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function namedImportIncludes(clause: string, word: string): boolean {
  return clause
    .split(",")
    .map((p) => p.trim())
    .some((part) => {
      if (!part) return false;
      const asMatch = part.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
      if (asMatch) return asMatch[2] === word;
      return part.split(/\s+/)[0] === word;
    });
}

/** 扫描全文件 import，找到 symbol 对应的模块 specifier */
export function findImportModuleForSymbol(text: string, word: string): string | null {
  let last: string | null = null;

  const defaultRe = new RegExp(
    `import\\s+(?:type\\s+)?${escape(word)}\\s+from\\s+['"]([^'"]+)['"]`,
    "g",
  );
  let m: RegExpExecArray | null;
  while ((m = defaultRe.exec(text))) last = m[1];

  const nsRe = new RegExp(`import\\s+\\*\\s+as\\s+${escape(word)}\\s+from\\s+['"]([^'"]+)['"]`, "g");
  while ((m = nsRe.exec(text))) last = m[1];

  const namedBlockRe = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = namedBlockRe.exec(text))) {
    if (namedImportIncludes(m[1], word)) last = m[2];
  }

  const mixedRe = new RegExp(
    `import\\s+(?:type\\s+)?${escape(word)}\\s*,\\s*\\{[^}]*\\}\\s+from\\s+['"]([^'"]+)['"]`,
    "g",
  );
  while ((m = mixedRe.exec(text))) last = m[1];

  return last;
}

function joinRelative(fromRelPath: string, specifier: string): string {
  const dirParts = fromRelPath.includes("/") ? fromRelPath.split("/").slice(0, -1) : [];
  const merged = [...dirParts, ...specifier.split("/")];
  const stack: string[] = [];
  for (const part of merged) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function srcPrefixFromRelPath(fromRelPath: string): string | null {
  const norm = normalizePath(fromRelPath);
  const idx = norm.indexOf("/src/");
  if (idx >= 0) return norm.slice(0, idx + 5);
  if (norm.startsWith("src/")) return "src/";
  return null;
}

/** 生成可能的工作区相对路径（含扩展名候选） */
export function buildImportPathCandidates(spec: string, fromRelPath: string): string[] {
  const out: string[] = [];
  const push = (base: string) => {
    for (const ext of EXT_CANDIDATES) {
      const p = normalizePath(base + ext);
      if (p && !p.endsWith("/") && !out.includes(p)) out.push(p);
    }
  };

  if (spec.startsWith(".")) {
    push(joinRelative(fromRelPath, spec));
    return out;
  }

  if (spec.startsWith("@/")) {
    const tail = spec.slice(2);
    const srcPrefix = srcPrefixFromRelPath(fromRelPath);
    if (srcPrefix) push(`${srcPrefix}${tail}`);
    push(`web/src/${tail}`);
    push(`src/${tail}`);
    return out;
  }

  return out;
}

/** 尝试读取 import 目标，返回首个存在的路径 */
export async function resolveImportTarget(
  spec: string,
  fromRelPath: string,
  readFile?: (relPath: string) => Promise<string | null>,
): Promise<{ relPath: string; text: string } | null> {
  const candidates = buildImportPathCandidates(spec, fromRelPath);
  if (!readFile) {
    const first = candidates[0];
    return first ? { relPath: first, text: "" } : null;
  }
  for (const relPath of candidates) {
    const text = await readFile(relPath);
    if (text !== null) return { relPath, text };
  }
  return null;
}

/** JSON / 配置文件中引用的相对路径字符串 */
export function findFilePathStringAt(docText: string, from: number, to: number): string | null {
  const raw = docText.slice(from, to);
  if (!/^['"][^'"]+['"]$/.test(raw)) return null;
  const inner = raw.slice(1, -1);
  if (!inner || inner.includes("://")) return null;
  if (/^[\w.-]+$/.test(inner) && !inner.includes("/") && !inner.startsWith(".")) return null;
  return inner;
}

export function resolveFilePathString(pathStr: string, fromRelPath: string): string[] {
  if (pathStr.startsWith(".")) {
    return buildImportPathCandidates(pathStr, fromRelPath);
  }
  return [normalizePath(pathStr)];
}

export function pathsEquivalent(a: string, b: string): boolean {
  const na = normalizePath(a);
  const nb = normalizePath(b);
  if (na === nb) return true;
  if (na.endsWith("/" + nb) || nb.endsWith("/" + na)) return true;
  return false;
}
