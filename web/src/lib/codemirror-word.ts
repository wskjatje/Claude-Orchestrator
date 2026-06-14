import type { Text } from "@codemirror/state";

const IDENT_CHAR = /[\p{L}\p{N}_$]/u;

/** 取光标处的标识符（变量名、函数名等） */
export function wordAtPos(
  doc: Text,
  pos: number,
): { from: number; to: number; word: string } | null {
  const clamped = Math.max(0, Math.min(pos, doc.length));
  const line = doc.lineAt(clamped);
  let from = clamped;
  let to = clamped;

  if (from < line.to && IDENT_CHAR.test(doc.sliceString(from, from + 1))) {
    while (from > line.from && IDENT_CHAR.test(doc.sliceString(from - 1, from))) from--;
    while (to < line.to && IDENT_CHAR.test(doc.sliceString(to, to + 1))) to++;
  } else if (from > line.from && IDENT_CHAR.test(doc.sliceString(from - 1, from))) {
    from--;
    while (from > line.from && IDENT_CHAR.test(doc.sliceString(from - 1, from))) from--;
    to = clamped;
    while (to < line.to && IDENT_CHAR.test(doc.sliceString(to, to + 1))) to++;
  } else {
    return null;
  }

  if (from >= to) return null;
  const word = doc.sliceString(from, to);
  if (!/^[\p{L}_$]/u.test(word)) return null;
  return { from, to, word };
}

/** 取光标处的引号字符串（含引号），用于 JSON 路径跳转 */
export function stringLiteralAtPos(
  doc: Text,
  pos: number,
): { from: number; to: number; value: string } | null {
  const clamped = Math.max(0, Math.min(pos, doc.length));
  const line = doc.lineAt(clamped);
  const lineText = doc.sliceString(line.from, line.to);
  const offset = clamped - line.from;

  const re = /(['"])(?:\\.|(?!\1)[^\\])*\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lineText))) {
    const start = line.from + m.index;
    const end = start + m[0].length;
    if (clamped >= start && clamped <= end) {
      const quote = m[1];
      const value = m[0].slice(1, -1);
      return { from: start, to: end, value };
    }
  }
  return null;
}
