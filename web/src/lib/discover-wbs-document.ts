import { parseActiveChainFromBubbleText } from "@/lib/parse-active-chain";

export const WBS_FILENAME_RE = /(^|\/)wbs[^/]*\.md$/i;

export type WorkspaceMarkdownFile = {
  relPath?: string;
  mtimeMs?: number;
};

export type ReadWorkspaceTextResult = {
  ok?: boolean;
  text?: string | null;
};

const DEFAULT_WBS_CANDIDATE_PATHS = [
  "docs/wbs.md",
  "docs/wbs_hie_egs.md",
  "docs/wbs_v1.2.md",
  "docs/wbs_v1.md",
  "docs/project-status.md",
];

function normalizeRelPath(raw: string): string {
  return String(raw ?? "").replace(/\\/g, "/").trim();
}

function isParseableWbsText(text: string): boolean {
  const parsed = parseActiveChainFromBubbleText(text);
  return parsed.ok && (parsed.state.steps?.length ?? 0) > 0;
}

/**
 * 按文件名优先读取 WBS；若无 wbs*.md，再扫描 docs/ 下 Markdown 内容是否可解析为任务链。
 */
export async function discoverWbsDocument(
  listMarkdownFiles: () => Promise<WorkspaceMarkdownFile[]>,
  readTextFile: (relPath: string) => Promise<ReadWorkspaceTextResult>,
  opts?: {
    preferredPath?: string;
    extraCandidatePaths?: string[];
    wbsFilenameOnly?: boolean;
  },
): Promise<{ path: string; text: string; source: "filename" | "content-scan" } | null> {
  const preferred = normalizeRelPath(opts?.preferredPath ?? "");
  let discoveredWbsPaths: string[] = [];
  let docsMarkdownPaths: string[] = [];

  try {
    const files = await listMarkdownFiles();
    const sorted = [...files].sort(
      (a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0),
    );
    for (const f of sorted) {
      const rel = normalizeRelPath(String(f.relPath ?? ""));
      if (!rel.endsWith(".md")) continue;
      if (WBS_FILENAME_RE.test(rel)) discoveredWbsPaths.push(rel);
      if (/(^|\/)docs\//i.test(rel)) docsMarkdownPaths.push(rel);
    }
  } catch {
    /* 兼容旧主进程 */
  }

  const filenameCandidates = [
    preferred,
    ...discoveredWbsPaths,
    ...DEFAULT_WBS_CANDIDATE_PATHS,
    ...(opts?.extraCandidatePaths ?? []).map(normalizeRelPath),
  ]
    .filter(Boolean)
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .filter((x) => (opts?.wbsFilenameOnly ? WBS_FILENAME_RE.test(x) : true));

  for (const p of filenameCandidates) {
    const r = await readTextFile(p);
    if (r?.ok && typeof r.text === "string" && r.text.trim()) {
      return { path: p, text: r.text, source: "filename" };
    }
  }

  const contentScanPaths = [...docsMarkdownPaths]
    .filter((p) => !filenameCandidates.includes(p))
    .filter((p, i, arr) => arr.indexOf(p) === i);

  for (const p of contentScanPaths) {
    const r = await readTextFile(p);
    if (!r?.ok || typeof r.text !== "string" || !r.text.trim()) continue;
    if (!isParseableWbsText(r.text)) continue;
    return { path: p, text: r.text, source: "content-scan" };
  }

  return null;
}
