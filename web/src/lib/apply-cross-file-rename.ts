import { getDesktop } from "@/lib/desktop-api";
import type { PeekRef } from "@/lib/codemirror-ide-extensions";

export type RenameLoc = PeekRef & { oldName: string; newName: string };

function lineColToOffset(text: string, line: number, column: number): number {
  const lines = text.split("\n");
  const ln = Math.max(1, Math.min(line, lines.length));
  const row = lines[ln - 1] ?? "";
  const col = Math.max(0, Math.min(column - 1, row.length));
  let off = 0;
  for (let i = 0; i < ln - 1; i++) off += (lines[i]?.length ?? 0) + 1;
  return off + col;
}

/**
 * 按 LS rename locations 批量改写并落盘（同文件多处从后往前改）。
 */
export async function applyCrossFileRename(
  locations: RenameLoc[],
): Promise<{ ok: boolean; written: string[]; error?: string }> {
  const api = getDesktop();
  if (!api?.readWorkspaceTextFile || !api.workspaceApplyWriteFence) {
    return { ok: false, written: [], error: "无法写入工作区" };
  }
  if (!locations.length) return { ok: false, written: [], error: "无重命名位置" };

  const byFile = new Map<string, RenameLoc[]>();
  for (const loc of locations) {
    const p = loc.relPath.replace(/\\/g, "/");
    if (!byFile.has(p)) byFile.set(p, []);
    byFile.get(p)!.push(loc);
  }

  const items: { path: string; content: string }[] = [];
  for (const [relPath, locs] of byFile) {
    const r = await api.readWorkspaceTextFile(relPath);
    if (!r?.ok || typeof r.text !== "string") {
      return { ok: false, written: [], error: `无法读取 ${relPath}` };
    }
    let text = r.text;
    const oldName = locs[0]!.oldName;
    const newName = locs[0]!.newName;
    const sorted = [...locs].sort((a, b) => {
      if (a.line !== b.line) return b.line - a.line;
      return b.column - a.column;
    });
    for (const loc of sorted) {
      const from = lineColToOffset(text, loc.line, loc.column);
      const endCol = loc.endColumn ?? loc.column + oldName.length;
      const to = lineColToOffset(text, loc.endLine ?? loc.line, endCol);
      const slice = text.slice(from, Math.max(to, from));
      // 仅替换期望旧名，避免错位
      const insert =
        slice === oldName || slice.startsWith(oldName)
          ? newName + slice.slice(oldName.length)
          : newName;
      text = text.slice(0, from) + insert + text.slice(Math.max(to, from + oldName.length));
    }
    items.push({ path: relPath, content: text });
  }

  try {
    const res = await api.workspaceApplyWriteFence(items);
    const written = res?.written ?? [];
    if (!res?.ok || !written.length) {
      return { ok: false, written: [], error: res?.error || "写入失败" };
    }
    return { ok: true, written };
  } catch (e) {
    return { ok: false, written: [], error: e instanceof Error ? e.message : String(e) };
  }
}
