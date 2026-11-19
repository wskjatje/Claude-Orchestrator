/**
 * Agent 写盘补丁：写前/写后真相源（对齐 Cursor Diff 卡）。
 * 过大文件可省略 before/after 正文，Undo 仍靠本会话 checkpoint。
 */

export type AgentFilePatch = {
  path: string;
  before?: string;
  after?: string;
  /** 写前完整快照，仅用于前端内存 Undo；合并进展示记录前会剥离。 */
  checkpointBefore?: string;
  beforeTruncated?: boolean;
  afterTruncated?: boolean;
  isNewFile?: boolean;
};

// Preview excerpts include omission markers in addition to the server's 120k body cap.
const PATCH_CHAR_CAP = 128_000;

export function normAgentPatchPath(p: string): string {
  return String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

export function capAgentPatchText(s: string | undefined | null): string | undefined {
  if (s == null) return undefined;
  const t = String(s);
  if (t.length <= PATCH_CHAR_CAP) return t;
  return undefined;
}

export function mergeAgentFilePatches(
  ...lists: Array<AgentFilePatch[] | undefined | null>
): AgentFilePatch[] {
  const byPath = new Map<string, AgentFilePatch>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const path = normAgentPatchPath(raw?.path || "");
      if (!path) continue;
      const prev = byPath.get(path);
      byPath.set(path, {
        path,
        before:
          raw.before !== undefined
            ? capAgentPatchText(raw.before)
            : prev?.before,
        after:
          raw.after !== undefined ? capAgentPatchText(raw.after) : prev?.after,
        isNewFile:
          typeof raw.isNewFile === "boolean"
            ? raw.isNewFile
            : prev?.isNewFile,
        beforeTruncated:
          typeof raw.beforeTruncated === "boolean"
            ? raw.beforeTruncated
            : prev?.beforeTruncated,
        afterTruncated:
          typeof raw.afterTruncated === "boolean"
            ? raw.afterTruncated
            : prev?.afterTruncated,
      });
    }
  }
  return [...byPath.values()];
}

/** 从写盘 API patches 归一化 */
export function normalizeWritePatches(
  patches: unknown,
): AgentFilePatch[] {
  if (!Array.isArray(patches)) return [];
  return patches.flatMap((p) => {
      const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
      const path = normAgentPatchPath(String(o.path || ""));
      if (!path) return [];
      return [{
        path,
        before: typeof o.before === "string" ? o.before : undefined,
        after: typeof o.after === "string" ? o.after : undefined,
        checkpointBefore:
          typeof o.checkpointBefore === "string" ? o.checkpointBefore : undefined,
        beforeTruncated:
          typeof o.beforeTruncated === "boolean" ? o.beforeTruncated : undefined,
        afterTruncated:
          typeof o.afterTruncated === "boolean" ? o.afterTruncated : undefined,
        isNewFile: typeof o.isNewFile === "boolean" ? o.isNewFile : undefined,
      }];
    });
}
