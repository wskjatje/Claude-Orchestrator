import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** 与 parse-chat-file-edits.ts 中 LCS 预览对齐的冒烟实现 */
function lineOpsLcs(oldL, newL) {
  const n = oldL.length;
  const m = newL.length;
  const MAX_CELLS = 48_000;
  if (n * m > MAX_CELLS) {
    // prefix-suffix fallback omitted in test — keep small fixtures
    throw new Error("fixture too large");
  }
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    const row = dp[i];
    const prev = dp[i - 1];
    const a = oldL[i - 1];
    for (let j = 1; j <= m; j++) {
      row[j] = a === newL[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
    }
  }
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldL[i - 1] === newL[j - 1]) {
      ops.push({ kind: "eq", text: oldL[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ kind: "add", text: newL[j - 1] });
      j--;
    } else {
      ops.push({ kind: "del", text: oldL[i - 1] });
      i--;
    }
  }
  ops.reverse();
  return ops;
}

function opsToPreviewLines(ops, maxLines = 36, ctxPad = 2) {
  let added = 0;
  let removed = 0;
  const changeIdx = [];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i].kind === "add") {
      added++;
      changeIdx.push(i);
    } else if (ops[i].kind === "del") {
      removed++;
      changeIdx.push(i);
    }
  }
  if (!changeIdx.length) return { previewLines: [], added: 0, removed: 0 };
  const keep = new Set();
  for (const idx of changeIdx) {
    for (let k = Math.max(0, idx - ctxPad); k <= Math.min(ops.length - 1, idx + ctxPad); k++) {
      keep.add(k);
    }
  }
  const previewLines = [];
  let lastKept = -2;
  for (let i = 0; i < ops.length; i++) {
    if (!keep.has(i)) continue;
    if (lastKept >= 0 && i - lastKept > 1) previewLines.push({ kind: "ctx", text: "…" });
    const op = ops[i];
    if (op.kind === "eq") previewLines.push({ kind: "ctx", text: op.text });
    else if (op.kind === "del") previewLines.push({ kind: "del", text: op.text });
    else previewLines.push({ kind: "add", text: op.text });
    lastKept = i;
    if (previewLines.length >= maxLines) break;
  }
  return { previewLines, added, removed };
}

function buildLineDiffPreview(before, after, maxLines = 36) {
  const oldL = String(before ?? "").replace(/\r\n/g, "\n").split("\n");
  const newL = String(after ?? "").replace(/\r\n/g, "\n").split("\n");
  if (!String(before ?? "").length) {
    return {
      previewLines: newL.slice(0, maxLines).map((text) => ({ kind: "add", text })),
      added: newL.length,
      removed: 0,
    };
  }
  if (String(before) === String(after)) return { previewLines: [], added: 0, removed: 0 };
  return opsToPreviewLines(lineOpsLcs(oldL, newL), maxLines);
}

describe("buildLineDiffPreview LCS", () => {
  it("detects two separated edits (not one big middle blob)", () => {
    const mid = Array.from({ length: 12 }, (_, i) => `m${i}`);
    const before = ["a", "b", ...mid, "f", "g"].join("\n");
    const after = ["a", "B", ...mid, "F", "g"].join("\n");
    const { previewLines, added, removed } = buildLineDiffPreview(before, after);
    assert.equal(added, 2);
    assert.equal(removed, 2);
    const dels = previewLines.filter((l) => l.kind === "del").map((l) => l.text);
    const adds = previewLines.filter((l) => l.kind === "add").map((l) => l.text);
    assert.deepEqual(dels, ["b", "f"]);
    assert.deepEqual(adds, ["B", "F"]);
    // 两段变更之间应压缩，而非把整段 mid 全列出
    assert.ok(previewLines.some((l) => l.text === "…"));
    assert.ok(previewLines.length < before.split("\n").length);
  });

  it("identical texts → empty", () => {
    const r = buildLineDiffPreview("x\ny", "x\ny");
    assert.equal(r.added, 0);
    assert.equal(r.removed, 0);
    assert.equal(r.previewLines.length, 0);
  });
});
