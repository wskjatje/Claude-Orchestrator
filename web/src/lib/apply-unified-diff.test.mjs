import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * 与 apply-unified-diff.ts 对齐的冒烟实现（不经打包直接跑 node:test）。
 * 空行不视为 hunk 失败。
 */
function applyUnifiedDiff(baseText, diffBody) {
  const base = String(baseText ?? "").replace(/\r\n/g, "\n");
  const diff = String(diffBody ?? "").replace(/\r\n/g, "\n");
  if (!diff.trim()) return null;
  const baseLines = base.length ? base.split("\n") : [];
  const out = [];
  let baseIdx = 0;
  const lines = diff.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("diff ") ||
      line.startsWith("index ")
    ) {
      i++;
      continue;
    }
    const hunk = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s@@/);
    if (!hunk) {
      i++;
      continue;
    }
    const oldStart = Math.max(1, Number(hunk[1]));
    const copyUntil = oldStart - 1;
    while (baseIdx < copyUntil && baseIdx < baseLines.length) {
      out.push(baseLines[baseIdx]);
      baseIdx++;
    }
    i++;
    while (i < lines.length) {
      const hl = lines[i];
      if (hl.startsWith("@@")) break;
      if (hl.startsWith("---") || hl.startsWith("+++") || hl.startsWith("\\")) {
        i++;
        continue;
      }
      if (!hl) {
        i++;
        continue;
      }
      const tag = hl[0];
      const text = hl.slice(1);
      if (tag === " ") {
        if (baseLines[baseIdx] !== undefined && baseLines[baseIdx] !== text) return null;
        out.push(text);
        baseIdx++;
      } else if (tag === "-") {
        baseIdx++;
      } else if (tag === "+") {
        out.push(text);
      } else {
        return null;
      }
      i++;
    }
  }
  while (baseIdx < baseLines.length) {
    out.push(baseLines[baseIdx]);
    baseIdx++;
  }
  return out.join("\n");
}

describe("applyUnifiedDiff", () => {
  it("replaces a middle line", () => {
    const base = "a\nb\nc\n";
    const diff = `--- a/f\n+++ b/f\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n`;
    const next = applyUnifiedDiff(base, diff);
    assert.equal(next, "a\nB\nc\n");
  });

  it("appends a line", () => {
    const base = "a\nb";
    const diff = `@@ -1,2 +1,3 @@\n a\n b\n+c\n`;
    assert.equal(applyUnifiedDiff(base, diff), "a\nb\nc");
  });

  it("rejects context mismatch", () => {
    const base = "x\ny";
    const diff = `@@ -1,2 +1,2 @@\n a\n-b\n+B\n`;
    assert.equal(applyUnifiedDiff(base, diff), null);
  });
});
