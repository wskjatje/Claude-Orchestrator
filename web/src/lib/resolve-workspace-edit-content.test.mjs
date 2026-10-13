import { describe, it } from "node:test";
import assert from "node:assert/strict";

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
      if (hl.startsWith("---") || hl.startsWith("+++") || hl.startsWith("\\") || !hl) {
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
      } else return null;
      i++;
    }
  }
  while (baseIdx < baseLines.length) {
    out.push(baseLines[baseIdx]);
    baseIdx++;
  }
  return out.join("\n");
}

async function resolveWorkspaceEditContent(opts) {
  const { path, content, source, diffBody, readFile } = opts;
  let previous = "";
  if (readFile) {
    const prev = await readFile(path);
    if (prev?.ok && typeof prev.text === "string") previous = prev.text;
  }
  if (source === "diff" || (diffBody != null && content === diffBody)) {
    const body = diffBody || content;
    const applied = applyUnifiedDiff(previous, body);
    if (applied == null) return { ok: false, error: "mismatch" };
    return { ok: true, text: applied, previous };
  }
  return { ok: true, text: content, previous };
}

describe("resolveWorkspaceEditContent", () => {
  it("writes fence content as-is", async () => {
    const r = await resolveWorkspaceEditContent({
      path: "a.md",
      content: "hello",
      source: "fence",
      readFile: async () => ({ ok: true, text: "old" }),
    });
    assert.equal(r.ok, true);
    assert.equal(r.text, "hello");
    assert.equal(r.previous, "old");
  });

  it("applies unified diff against disk", async () => {
    const r = await resolveWorkspaceEditContent({
      path: "a.md",
      content: "@@ -1,2 +1,2 @@\n a\n-b\n+B\n",
      source: "diff",
      diffBody: "@@ -1,2 +1,2 @@\n a\n-b\n+B\n",
      readFile: async () => ({ ok: true, text: "a\nb" }),
    });
    assert.equal(r.ok, true);
    assert.equal(r.text, "a\nB");
  });

  it("fails when diff mismatches disk", async () => {
    const r = await resolveWorkspaceEditContent({
      path: "a.md",
      content: "@@ -1,2 +1,2 @@\n x\n-y\n+Y\n",
      source: "diff",
      diffBody: "@@ -1,2 +1,2 @@\n x\n-y\n+Y\n",
      readFile: async () => ({ ok: true, text: "a\nb" }),
    });
    assert.equal(r.ok, false);
  });
});
