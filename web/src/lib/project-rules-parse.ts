export type RuleMeta = {
  alwaysApply?: boolean;
  globs?: string[];
};

/** CLI / 本产品约定文件，勿再塞进「项目规则」以免双重注入 */
export const EXCLUDE_FROM_PROMPT = new Set(["AGENTS.md", "CLAUDE.md"]);

/** 极简 glob → RegExp（支持 *, **, ?） */
export function globToRegExp(glob: string): RegExp {
  const g = glob.replace(/\\/g, "/").replace(/^\/+/, "");
  let out = "^";
  for (let i = 0; i < g.length; i++) {
    const c = g[i]!;
    if (c === "*" && g[i + 1] === "*") {
      if (g[i + 2] === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else {
        out += ".*";
        i += 1;
      }
    } else if (c === "*") {
      out += "[^/]*";
    } else if (c === "?") {
      out += "[^/]";
    } else if (".+^$()[]{}|".includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  out += "$";
  return new RegExp(out, "i");
}

export function pathMatchesGlobs(relPath: string, globs: string[]): boolean {
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  const base = norm.split("/").pop() || norm;
  for (const raw of globs) {
    const g = String(raw || "").trim();
    if (!g) continue;
    const re = globToRegExp(g);
    if (re.test(norm) || re.test(base)) return true;
  }
  return false;
}

/** 解析 `.mdc` frontmatter（只取 alwaysApply / globs） */
export function parseRuleFrontmatter(raw: string): { meta: RuleMeta; body: string } {
  const text = String(raw || "");
  if (!text.startsWith("---")) return { meta: {}, body: text };
  const nl = text.indexOf("\n");
  if (nl < 0) return { meta: {}, body: text };
  const end = text.indexOf("\n---", nl);
  if (end < 0) return { meta: {}, body: text };
  const yaml = text.slice(nl + 1, end);
  let body = text.slice(end + 4);
  if (body.startsWith("\n")) body = body.slice(1);

  const meta: RuleMeta = {};
  const always = yaml.match(/^\s*alwaysApply:\s*(true|false)\s*$/im);
  if (always) meta.alwaysApply = always[1]!.toLowerCase() === "true";

  const globsInline = yaml.match(/^\s*globs:\s*\[([^\]]*)\]\s*$/im);
  if (globsInline) {
    meta.globs = globsInline[1]!
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  } else {
    const block = yaml.match(/^\s*globs:\s*\n((?:\s+-\s+.+\n?)+)/im);
    if (block) {
      meta.globs = block[1]!
        .split("\n")
        .map((line) => line.replace(/^\s*-\s*/, "").trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      const single = yaml.match(/^\s*globs:\s*(.+)\s*$/im);
      if (single && !single[1]!.startsWith("[") && single[1]!.trim() !== "") {
        meta.globs = [single[1]!.trim().replace(/^['"]|['"]$/g, "")];
      }
    }
  }
  return { meta, body };
}

/**
 * 是否应自动注入该规则正文。
 * - alwaysApply: true → 注入
 * - 有 globs 且匹配 activeRelPath → 注入
 * - 无 frontmatter 的根规则文件 → 注入
 * - 仅 description / alwaysApply:false 且无匹配 globs → 不注入
 */
export function shouldAutoInjectRule(
  relPath: string,
  meta: RuleMeta,
  activeRelPath: string | null,
  hasFrontmatter: boolean,
): boolean {
  if (EXCLUDE_FROM_PROMPT.has(relPath.replace(/\\/g, "/"))) return false;
  if (meta.alwaysApply === true) return true;
  if (meta.globs?.length) {
    if (!activeRelPath) return false;
    return pathMatchesGlobs(activeRelPath, meta.globs);
  }
  if (meta.alwaysApply === false) return false;
  if (!hasFrontmatter) return true;
  return false;
}
