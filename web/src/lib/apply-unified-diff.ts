export type DiffHunk = {
  index: number;
  header: string;
  /** 含 @@ 行在内的完整 hunk 文本 */
  body: string;
};

/** 拆出 unified diff 的各个 @@ hunk（保留文件头） */
export function splitUnifiedDiffHunks(diffBody: string): { preamble: string; hunks: DiffHunk[] } {
  const diff = String(diffBody ?? "").replace(/\r\n/g, "\n");
  const lines = diff.split("\n");
  const preamble: string[] = [];
  const hunks: DiffHunk[] = [];
  let i = 0;
  while (i < lines.length && !lines[i]!.startsWith("@@")) {
    preamble.push(lines[i]!);
    i++;
  }
  let idx = 0;
  while (i < lines.length) {
    if (!lines[i]!.startsWith("@@")) {
      i++;
      continue;
    }
    const header = lines[i]!;
    const bodyLines = [header];
    i++;
    while (i < lines.length && !lines[i]!.startsWith("@@")) {
      bodyLines.push(lines[i]!);
      i++;
    }
    hunks.push({ index: idx++, header, body: bodyLines.join("\n") });
  }
  return { preamble: preamble.join("\n"), hunks };
}

/** 仅应用选中的 hunk 索引（其余视为不改） */
export function applyUnifiedDiffHunks(
  baseText: string,
  diffBody: string,
  selectedIndexes: number[],
): string | null {
  const { preamble, hunks } = splitUnifiedDiffHunks(diffBody);
  if (!hunks.length) return applyUnifiedDiff(baseText, diffBody);
  const set = new Set(selectedIndexes);
  const kept = hunks.filter((h) => set.has(h.index));
  if (!kept.length) return baseText;
  const rebuilt = [preamble, ...kept.map((h) => h.body)].filter(Boolean).join("\n");
  return applyUnifiedDiff(baseText, rebuilt);
}

/**
 * 将标准 unified diff（单文件）应用到基线文本。
 * 支持 ---/+++/@@ 块；失败返回 null。
 */
export function applyUnifiedDiff(baseText: string, diffBody: string): string | null {
  const base = String(baseText ?? "").replace(/\r\n/g, "\n");
  const diff = String(diffBody ?? "").replace(/\r\n/g, "\n");
  if (!diff.trim()) return null;

  const baseLines = base.length ? base.split("\n") : [];
  const out: string[] = [];
  let baseIdx = 0; // 0-based index into baseLines

  const lines = diff.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("diff ") || line.startsWith("index ")) {
      i++;
      continue;
    }
    const hunk = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s@@/);
    if (!hunk) {
      i++;
      continue;
    }
    const oldStart = Math.max(1, Number(hunk[1]));
    // Copy unchanged prefix up to oldStart
    const copyUntil = oldStart - 1;
    while (baseIdx < copyUntil && baseIdx < baseLines.length) {
      out.push(baseLines[baseIdx]!);
      baseIdx++;
    }

    i++;
    while (i < lines.length) {
      const hl = lines[i]!;
      if (hl.startsWith("@@")) break;
      if (hl.startsWith("---") || hl.startsWith("+++")) {
        i++;
        continue;
      }
      if (hl.startsWith("\\")) {
        // "\ No newline at end of file"
        i++;
        continue;
      }
      const tag = hl[0];
      const text = hl.slice(1);
      if (tag === " " || tag === undefined) {
        const expected = baseLines[baseIdx];
        if (expected !== undefined && expected !== text && tag === " ") {
          // context mismatch — still consume if close enough? fail safe
          return null;
        }
        if (tag === " ") {
          out.push(text);
          baseIdx++;
        }
      } else if (tag === "-") {
        if (baseLines[baseIdx] !== undefined && baseLines[baseIdx] !== text) {
          return null;
        }
        baseIdx++;
      } else if (tag === "+") {
        out.push(text);
      } else {
        // unknown line in hunk
        return null;
      }
      i++;
    }
  }

  while (baseIdx < baseLines.length) {
    out.push(baseLines[baseIdx]!);
    baseIdx++;
  }
  return out.join("\n");
}

/** 从 preview 行粗重建内容（无基线时的 fallback：仅拼接 add/ctx） */
export function contentFromDiffPreviewLines(
  lines: { kind: "add" | "del" | "ctx"; text: string }[],
): string {
  return lines
    .filter((l) => l.kind === "add" || l.kind === "ctx")
    .map((l) => l.text)
    .join("\n");
}
