import { applyUnifiedDiff } from "@/lib/apply-unified-diff";

/** 卡片 / 侧栏共用：把 fence 正文或 unified diff 解析成最终落盘内容 */
export async function resolveWorkspaceEditContent(opts: {
  path: string;
  /** fence 全文；diff 时可为 diffBody 占位 */
  content: string;
  source?: "fence" | "cli" | "summary" | "diff";
  diffBody?: string;
  readFile?: (
    relPath: string,
  ) => Promise<{ ok?: boolean; text?: string | null } | null | undefined>;
}): Promise<{ ok: true; text: string; previous: string } | { ok: false; error: string }> {
  const { path, content, source, diffBody, readFile } = opts;
  let previous = "";
  if (readFile) {
    try {
      const prev = await readFile(path);
      if (prev?.ok && typeof prev.text === "string") previous = prev.text;
    } catch {
      previous = "";
    }
  }

  if (source === "diff" || (diffBody != null && diffBody.length > 0 && content === diffBody)) {
    const body = diffBody || content;
    const applied = applyUnifiedDiff(previous, body);
    if (applied == null) {
      return { ok: false, error: "无法应用此 diff（与磁盘基线不匹配）" };
    }
    return { ok: true, text: applied, previous };
  }

  return { ok: true, text: content, previous };
}
