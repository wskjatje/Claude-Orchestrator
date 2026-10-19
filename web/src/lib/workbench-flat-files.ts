import type { WorkspacePanelTreeNode } from "@/types/desktop";

/** 将 panel tree 展平为相对路径（文件）；上限由调用方切片 */
export function flattenPanelTreeFiles(
  nodes: WorkspacePanelTreeNode[] | undefined,
  prefix = "",
  out: string[] = [],
): string[] {
  if (!nodes?.length) return out;
  for (const n of nodes) {
    const rel = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "file") {
      out.push(rel.replace(/\\/g, "/"));
    } else if (n.children?.length) {
      flattenPanelTreeFiles(n.children, rel, out);
    }
  }
  return out;
}

/** 简易路径模糊分：basename 命中优先，再 path 子串 */
export function rankFilePaths(paths: string[], query: string, limit = 80): string[] {
  const q = query.trim().toLowerCase().replace(/\\/g, "/");
  if (!q) return paths.slice(0, limit);
  const scored: { path: string; score: number }[] = [];
  for (const p of paths) {
    const lower = p.toLowerCase();
    const base = lower.slice(lower.lastIndexOf("/") + 1);
    let score = -1;
    if (base === q) score = 1000;
    else if (base.startsWith(q)) score = 800 - (base.length - q.length);
    else if (base.includes(q)) score = 500 - base.indexOf(q);
    else if (lower.includes(q)) score = 200 - lower.indexOf(q);
    else {
      // 连续字符子序列（Cursor 式）
      let bi = 0;
      for (let i = 0; i < base.length && bi < q.length; i++) {
        if (base[i] === q[bi]) bi++;
      }
      if (bi === q.length) score = 100 - (base.length - q.length);
    }
    if (score >= 0) scored.push({ path: p, score });
  }
  scored.sort((a, b) => b.score - a.score || a.path.length - b.path.length);
  return scored.slice(0, limit).map((s) => s.path);
}
