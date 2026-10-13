import type { DesktopApi } from "@/types/desktop";
import { getActiveEditorRelPath } from "@/lib/active-editor-path";
import {
  EXCLUDE_FROM_PROMPT,
  parseRuleFrontmatter,
  shouldAutoInjectRule,
  type RuleMeta,
} from "@/lib/project-rules-parse";
import {
  isUserPreferencesPath,
  USER_PREFERENCES_REL,
} from "@/lib/user-preferences";

export {
  globToRegExp,
  parseRuleFrontmatter,
  pathMatchesGlobs,
  shouldAutoInjectRule,
} from "@/lib/project-rules-parse";

const MAX_CHARS = 12_000;

type RuleFileMeta = { relPath: string; mtimeMs: number; size: number };

let cachedFingerprint = "";
let cachedSnippet = "";
let listenersBound = false;

function fingerprint(files: RuleFileMeta[], activeRel: string | null): string {
  return `${activeRel || ""}::${files
    .map((f) => `${f.relPath}:${Math.round(f.mtimeMs)}:${f.size}`)
    .join("|")}`;
}

/** 丢弃缓存，下次发消息会重新读盘 */
export function invalidateProjectRulesCache() {
  cachedFingerprint = "";
  cachedSnippet = "";
}

function ensureRulesInvalidationHooks(api: DesktopApi) {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  api.onWorkspaceChanged?.(() => invalidateProjectRulesCache());
  api.onWorkspaceRulesChanged?.(() => invalidateProjectRulesCache());
}

/**
 * 读取工作区项目规则（根候选 + .cursor/rules）并拼进 prompt。
 * 带指纹缓存；规则文件变更（热更新事件 / 换工作区）后自动失效。
 */
export async function loadProjectRulesSnippet(
  api: DesktopApi | null | undefined,
  opts?: { activeRelPath?: string | null },
): Promise<string> {
  if (!api?.readWorkspaceTextFile) return "";
  ensureRulesInvalidationHooks(api);

  const activeRel =
    opts?.activeRelPath !== undefined ? opts.activeRelPath : getActiveEditorRelPath();

  // 首次发送时若无偏好文件则落盘模板，保证「懂我」L0 可注入
  try {
    const { ensureUserPreferencesFile } = await import("@/lib/user-preferences");
    const ensured = await ensureUserPreferencesFile(api);
    if (ensured.created) invalidateProjectRulesCache();
  } catch {
    /* 无工作区写权限时跳过 */
  }

  let files: RuleFileMeta[] = [];
  if (api.listWorkspaceProjectRules) {
    try {
      const listed = await api.listWorkspaceProjectRules();
      if (listed?.ok && Array.isArray(listed.files)) files = listed.files;
    } catch {
      files = [];
    }
  }

  if (!files.length) {
    const fallback = [
      USER_PREFERENCES_REL,
      ".claudecode/RULES.md",
      ".claudecode/rules.md",
      "RULES.md",
      ".cursorrules",
    ];
    for (const rel of fallback) {
      try {
        const st = api.fileStat ? await api.fileStat(rel) : null;
        if (st?.ok && st.exists) {
          files.push({
            relPath: rel,
            mtimeMs: 0,
            size: st.size ?? 0,
          });
        }
      } catch {
        /* next */
      }
    }
  }

  // 偏好文件若已存在于列表中则置顶；不存在时仍依赖 ensure（设置页会创建）
  files.sort((a, b) => {
    const ap = isUserPreferencesPath(a.relPath) ? 0 : 1;
    const bp = isUserPreferencesPath(b.relPath) ? 0 : 1;
    return ap - bp || a.relPath.localeCompare(b.relPath);
  });

  files = files.filter((f) => !EXCLUDE_FROM_PROMPT.has(f.relPath.replace(/\\/g, "/")));

  if (!files.length) {
    cachedFingerprint = "";
    cachedSnippet = "";
    return "";
  }

  const fp = fingerprint(files, activeRel);
  if (fp && fp === cachedFingerprint && cachedSnippet) return cachedSnippet;

  type Chunk = { relPath: string; body: string; priority: number };
  const chunks: Chunk[] = [];

  for (const f of files) {
    try {
      const r = await api.readWorkspaceTextFile(f.relPath);
      if (!r?.ok || typeof r.text !== "string") continue;
      const raw = r.text;
      if (!raw.trim()) continue;
      const hasFrontmatter = raw.trimStart().startsWith("---");
      const { meta, body } = hasFrontmatter
        ? parseRuleFrontmatter(raw)
        : { meta: {} as RuleMeta, body: raw };
      const cleaned = body.trim();
      if (!cleaned) continue;
      if (!shouldAutoInjectRule(f.relPath, meta, activeRel, hasFrontmatter)) continue;
      // 用户偏好最高优先（-1），其余 alwaysApply=0 / globs=1 / 其他=2
      const priority = isUserPreferencesPath(f.relPath)
        ? -1
        : meta.alwaysApply
          ? 0
          : meta.globs?.length
            ? 1
            : 2;
      chunks.push({ relPath: f.relPath, body: cleaned, priority });
    } catch {
      /* next */
    }
  }

  chunks.sort((a, b) => a.priority - b.priority || a.relPath.localeCompare(b.relPath));

  if (!chunks.length) {
    cachedFingerprint = fp;
    cachedSnippet = "";
    return "";
  }

  // 分桶：偏好 25% + alwaysApply 40% + globs 25% + 其余 10%
  const budgets = [
    Math.floor(MAX_CHARS * 0.25),
    Math.floor(MAX_CHARS * 0.4),
    Math.floor(MAX_CHARS * 0.25),
    Math.floor(MAX_CHARS * 0.1),
  ];
  const used = [0, 0, 0, 0];
  const parts: string[] = [];
  let total = 0;
  for (const c of chunks) {
    const bucket = Math.min(3, Math.max(0, c.priority + 1));
    const heading = isUserPreferencesPath(c.relPath)
      ? `### 用户偏好（${c.relPath}）`
      : `### ${c.relPath}`;
    const block = `${heading}\n${c.body}`;
    if (used[bucket]! + block.length > budgets[bucket]! && parts.length) continue;
    if (total + block.length > MAX_CHARS && parts.length) break;
    parts.push(block);
    used[bucket]! += block.length + 2;
    total += block.length + 2;
  }

  let text = parts.join("\n\n");
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + "\n…";
  const hasPrefs = chunks.some((c) => isUserPreferencesPath(c.relPath));
  const snippet = hasPrefs
    ? `【用户偏好与项目规则】须遵守：\n${text}`
    : `【项目规则】须遵守：\n${text}`;
  cachedFingerprint = fp;
  cachedSnippet = snippet;
  return snippet;
}

/** 按需注入 description 型规则（@rule:path） */
export async function loadNamedProjectRule(
  api: DesktopApi | null | undefined,
  relPath: string,
): Promise<string> {
  if (!api?.readWorkspaceTextFile || !relPath) return "";
  try {
    const r = await api.readWorkspaceTextFile(relPath);
    if (!r?.ok || typeof r.text !== "string") return "";
    const raw = r.text;
    const hasFrontmatter = raw.trimStart().startsWith("---");
    const { body } = hasFrontmatter ? parseRuleFrontmatter(raw) : { body: raw };
    const cleaned = body.trim();
    if (!cleaned) return "";
    return `\n【@rule ${relPath}】\n${cleaned.slice(0, 8000)}\n`;
  } catch {
    return "";
  }
}
