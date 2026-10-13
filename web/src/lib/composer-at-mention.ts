import type { DesktopApi, WorkspacePanelTreeNode } from "@/types/desktop";

const FILE_EXT =
  /\.(?:md|txt|json|yaml|yml|ts|tsx|js|jsx|css|html|py|go|rs|cpp|c|h|java|vue|svelte|mjs|cjs)$/i;

const SPECIAL_MENTIONS = ["selection", "git", "codebase", "folder:"];

function walkTree(
  nodes: WorkspacePanelTreeNode[] | undefined,
  out: string[],
  folders: string[],
  prefix = "",
) {
  if (!nodes?.length) return;
  for (const n of nodes) {
    const rel = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "file") {
      if (FILE_EXT.test(rel)) out.push(rel.replace(/\\/g, "/"));
    } else {
      const dir = rel.replace(/\\/g, "/");
      folders.push(dir + "/");
      if (n.children?.length) walkTree(n.children, out, folders, rel);
    }
  }
}

/** 拉取工作区相对路径供 @ 补全（上限 400）；priorityPaths 置顶；含文件夹与特殊符号 */
export async function loadComposerMentionPaths(
  api: DesktopApi | null | undefined,
  priorityPaths: string[] = [],
): Promise<string[]> {
  const priority = uniqKeep(
    priorityPaths.map((p) => p.replace(/\\/g, "/").replace(/^\.\//, "")).filter(Boolean),
  );
  let treePaths: string[] = [];
  let folderPaths: string[] = [];
  if (api?.listWorkspacePanelTree) {
    try {
      const r = await api.listWorkspacePanelTree();
      if (r?.ok && r.tree) {
        const out: string[] = [];
        const folders: string[] = [];
        walkTree(r.tree, out, folders);
        treePaths = out;
        folderPaths = folders.slice(0, 80);
      }
    } catch {
      /* ignore */
    }
  }
  const special = ["selection", "git", "codebase", "problems"];
  const seen = new Set([...special, ...priority]);
  const rest = [...folderPaths, ...treePaths].filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
  return [...special, ...priority, ...rest].slice(0, 400);
}

function uniqKeep(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of list) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

export function matchAtMentionQuery(paths: string[], query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase().replace(/\\/g, "/");
  // @codebase:关键词 → 直接给出可插入项
  if (q.startsWith("codebase")) {
    const rest = q.slice("codebase".length).replace(/^:/, "");
    return [rest ? `codebase:${rest}` : "codebase"];
  }
  if (!q) return paths.slice(0, limit);
  const scored = paths
    .map((p) => {
      const low = p.toLowerCase();
      const base = low.split("/").filter(Boolean).pop() || low;
      let score = 0;
      if (base.startsWith(q)) score = 3;
      else if (low.startsWith(q)) score = 2.5;
      else if (low.includes(q)) score = 2;
      else if (base.includes(q)) score = 1;
      else return null;
      return { p, score };
    })
    .filter(Boolean) as { p: string; score: number }[];
  scored.sort((a, b) => b.score - a.score || a.p.localeCompare(b.p));
  return scored.slice(0, limit).map((x) => x.p);
}

/** 下拉展示文案（特殊符号可读） */
export function formatAtMentionLabel(path: string): string {
  if (path === "selection") return "@selection · 当前选区";
  if (path === "git") return "@git · 工作区 Diff";
  if (path === "problems") return "@problems · 当前诊断";
  if (path === "codebase") return "@codebase: · 全库检索";
  if (path.startsWith("codebase:")) return `@${path} · ripgrep`;
  if (path.endsWith("/")) return `@${path} · 文件夹`;
  return `@${path}`;
}

/** 检测光标前是否处于 @query 片段 */
export function detectAtMentionAtCursor(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const m = before.match(/@([a-zA-Z0-9_.\-/:]*)$/);
  if (!m) return null;
  return { start: cursor - m[0].length, query: m[1] || "" };
}

/**
 * 发送前展开 @selection / @git / @codebase / @folder/ / @path
 *（真实读盘；失败则保留原文并附错误说明）
 */
export async function expandAtMentionsInUserLine(
  text: string,
  api: DesktopApi | null | undefined,
  opts?: {
    selectionText?: string | null;
    selectionPath?: string | null;
    selectionRange?: string | null;
    /** 当前 Problems 快照（@problems） */
    problems?: { relPath: string; line: number; column: number; severity: string; message: string; rule?: string | null }[];
    preferPaths?: string[];
    /** @codebase 仅注入这些文件（空=全部） */
    codebaseOnlyPaths?: string[];
  },
): Promise<string> {
  if (!text.includes("@")) return text;
  let out = text;

  if (/@selection\b/i.test(out)) {
    const sel = opts?.selectionText?.trim();
    if (sel) {
      const loc =
        opts?.selectionPath && opts?.selectionRange
          ? `${opts.selectionPath}:${opts.selectionRange}`
          : opts?.selectionPath || "selection";
      out = out.replace(
        /@selection\b/gi,
        `\n【@selection · ${loc}】\n\`\`\`\n${sel.slice(0, 8000)}\n\`\`\`\n`,
      );
    } else {
      out = out.replace(/@selection\b/gi, "（@selection：当前无编辑器选区）");
    }
  }

  if (/@git\b/i.test(out) && api?.workspaceGetGitDiff) {
    try {
      const st = await api.workspaceGetGitDiff();
      const body = [st.statusLine, st.diff].filter(Boolean).join("\n\n").slice(0, 8000);
      out = out.replace(
        /@git\b/gi,
        st.ok && body ? `\n【@git】\n\`\`\`\n${body}\n\`\`\`\n` : "（@git：工作区干净或无法读取）",
      );
    } catch {
      out = out.replace(/@git\b/gi, "（@git：读取失败）");
    }
  }

  if (/@problems\b/i.test(out)) {
    const { formatProblemsForPrompt } = await import("@/lib/format-problems-for-prompt");
    const block = formatProblemsForPrompt((opts?.problems || []) as never, {
      preferPaths: opts?.preferPaths,
      maxLines: 24,
    });
    out = out.replace(
      /@problems\b/gi,
      block || "（@problems：当前无诊断；可先打开相关文件触发 Lint）",
    );
  }

  // @codebase:query → ripgrep；纯 @codebase → 路径索引回落
  const codebaseQueryRe = /@codebase(?::([^\s@]+))?/gi;
  const codebaseHits = [...out.matchAll(codebaseQueryRe)];
  const onlyPaths = new Set(
    (opts?.codebaseOnlyPaths || []).map((p) => p.replace(/\\/g, "/")).filter(Boolean),
  );
  for (const m of codebaseHits) {
    const full = m[0]!;
    const q = (m[1] || "").trim();
    if (q) {
      try {
        const decoded = decodeURIComponent(q);
        // @codebase：图谱 + 语义索引 + ripgrep 文本融合
        let graphMd = "";
        let boostPaths: string[] = [...onlyPaths];
        if (api?.workspaceGraphifyQuery) {
          const g = await api.workspaceGraphifyQuery({ query: decoded, budget: 1800 });
          if (g?.ok && g.markdown?.trim()) {
            graphMd = g.markdown.trim().slice(0, 3500);
            boostPaths = [...new Set([...(g.files || []), ...boostPaths])];
          } else {
            graphMd = `（结构索引失败：${g?.error || "未知错误"}）`;
          }
        } else {
          graphMd = "（结构索引不可用：workspaceGraphifyQuery 未暴露）";
        }
        let semanticMd = "";
        if (api?.workspaceCodeIndexSearch) {
          try {
            const s = await api.workspaceCodeIndexSearch({
              query: decoded,
              maxResults: 16,
              boostPaths,
            });
            if (s?.ok && s.hits?.length) {
              let semHits = s.hits;
              if (onlyPaths.size) {
                semHits = semHits.filter((h) =>
                  onlyPaths.has(h.relPath.replace(/\\/g, "/")),
                );
              }
              const lines = semHits.slice(0, 12).map((h) => {
                const snip = (h.snippet || h.text || "").replace(/\s+/g, " ").slice(0, 160);
                return `- \`${h.relPath}:${h.line}\`${h.score != null ? ` (${h.score})` : ""} ${snip}`;
              });
              if (lines.length) {
                semanticMd =
                  `### 语义（code-index${s.hybrid ? "·hybrid" : "·BM25"}）\n` +
                  lines.join("\n");
                boostPaths = [
                  ...new Set([
                    ...boostPaths,
                    ...semHits.map((h) => h.relPath.replace(/\\/g, "/")),
                  ]),
                ];
              }
            }
          } catch {
            /* ignore semantic */
          }
        }
        let hits: CodebaseHit[] = [];
        if (api?.workspaceRipgrep) {
          const r = await api.workspaceRipgrep({
            query: decoded,
            maxResults: 40,
            boostPaths,
          });
          hits = r?.hits || [];
          if (onlyPaths.size) {
            hits = hits.filter((h) => onlyPaths.has(h.relPath.replace(/\\/g, "/")));
          }
        }
        const grouped = formatCodebaseGroupedMarkdown(hits).slice(0, 4500);
        const parts = [
          graphMd ? `### 结构（graphify）\n${graphMd}` : "",
          semanticMd,
          grouped ? `### 文本（ripgrep）\n${grouped}` : "",
        ].filter(Boolean);
        const block = parts.length
          ? `\n【@codebase:${q}】\n${parts.join("\n\n")}\n`
          : `\n（@codebase:${q}：无匹配）\n`;
        out = out.split(full).join(block);
      } catch {
        out = out.split(full).join(`（@codebase:${q}：检索失败）`);
      }
    } else if (api?.listWorkspacePanelTree) {
      try {
        const r = await api.listWorkspacePanelTree();
        const files: string[] = [];
        const folders: string[] = [];
        if (r?.ok && r.tree) walkTree(r.tree, files, folders);
        const list = [...folders.slice(0, 40), ...files.slice(0, 120)].join("\n");
        out = out
          .split(full)
          .join(list ? `\n【@codebase 路径索引】\n\`\`\`\n${list}\n\`\`\`\n` : "（@codebase：空）");
      } catch {
        out = out.split(full).join("（@codebase：读取失败）");
      }
    }
  }

  // @rule:path → 按需注入 description 型规则
  const ruleRe = /@rule:([^\s@]+)/gi;
  const ruleHits = [...out.matchAll(ruleRe)].map((m) => m[1]).filter(Boolean) as string[];
  if (ruleHits.length) {
    const { loadNamedProjectRule } = await import("@/lib/project-rules");
    for (const rel of uniqKeep(ruleHits)) {
      const block = await loadNamedProjectRule(api, rel);
      out = out.split(`@rule:${rel}`).join(block || `（@rule:${rel}：未找到）`);
    }
  }

  // @folder/path/ → 列出该目录下文件名
  const folderRe = /@([a-zA-Z0-9_.\-/]+\/)/g;
  const folderHits = [...out.matchAll(folderRe)].map((m) => m[1]).filter(Boolean);
  for (const folder of uniqKeep(folderHits)) {
    if (!api?.listWorkspacePanelTree) break;
    try {
      const r = await api.listWorkspacePanelTree();
      const files: string[] = [];
      const folders: string[] = [];
      if (r?.ok && r.tree) walkTree(r.tree, files, folders);
      const prefix = folder.replace(/\\/g, "/");
      const kids = files.filter((f) => f.startsWith(prefix)).slice(0, 80);
      const block = kids.length
        ? `\n【@${prefix}】\n${kids.map((k) => `- ${k}`).join("\n")}\n`
        : `\n（@${prefix}：无匹配文件）\n`;
      out = out.split(`@${folder}`).join(block);
    } catch {
      /* keep */
    }
  }

  // @path/to/file → 嵌入文件正文（小文件）
  if (api?.readWorkspaceTextFile) {
    const pathRe = /@((?:[\w.-]+\/)+[\w.-]+\.[\w]+)/g;
    const paths = uniqKeep([...out.matchAll(pathRe)].map((m) => m[1]!));
    for (const rel of paths.slice(0, 6)) {
      try {
        const r = await api.readWorkspaceTextFile(rel);
        if (!r?.ok || typeof r.text !== "string") continue;
        const body = r.text.length > 12_000 ? r.text.slice(0, 12_000) + "\n…" : r.text;
        out = out.split(`@${rel}`).join(`\n【@${rel}】\n\`\`\`\n${body}\n\`\`\`\n`);
      } catch {
        /* keep */
      }
    }
  }

  return out;
}

export type CodebaseHit = { relPath: string; line: number; text: string };

/** 按文件折叠 ripgrep 命中 */
export function groupCodebaseHits(
  hits: CodebaseHit[],
): { relPath: string; lines: { line: number; text: string }[] }[] {
  const map = new Map<string, { line: number; text: string }[]>();
  for (const h of hits) {
    const p = h.relPath.replace(/\\/g, "/");
    if (!map.has(p)) map.set(p, []);
    const arr = map.get(p)!;
    if (arr.length < 5) arr.push({ line: h.line, text: h.text });
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([relPath, lines]) => ({ relPath, lines }));
}

export function formatCodebaseGroupedMarkdown(hits: CodebaseHit[]): string {
  const groups = groupCodebaseHits(hits).slice(0, 12);
  if (!groups.length) return "";
  return groups
    .map((g) => {
      const body = g.lines.map((l) => `${l.line}: ${l.text}`).join("\n");
      return `### ${g.relPath}\n\`\`\`\n${body}\n\`\`\``;
    })
    .join("\n");
}

// silence unused in case SPECIAL_MENTIONS used for docs
void SPECIAL_MENTIONS;
