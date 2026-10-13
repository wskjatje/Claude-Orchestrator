import { describe, it } from "node:test";
import assert from "node:assert/strict";

function applyInlineEditResponse(input, response) {
  const items = [];
  const fenceRe = /```workspace-write\s*\n([\s\S]*?)```/gi;
  let m;
  while ((m = fenceRe.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const it of arr) {
        if (it?.path && it?.content != null) items.push(it);
      }
    } catch {
      /* skip */
    }
  }
  const hit = items.find((it) => it.path === input.relPath) || items[0];
  if (hit?.content != null) return { ok: true, nextFullText: hit.content };

  const codeM = response.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
  if (codeM?.[1] != null) {
    const replacement = codeM[1].replace(/\n$/, "");
    const next =
      input.fullText.slice(0, input.selectionFrom) +
      replacement +
      input.fullText.slice(input.selectionTo);
    return { ok: true, nextFullText: next };
  }
  return { ok: false, error: "parse" };
}

describe("applyInlineEditResponse", () => {
  it("uses workspace-write full file", () => {
    const full = "a\nb\nc";
    const r = applyInlineEditResponse(
      { relPath: "f.ts", fullText: full, selectionFrom: 2, selectionTo: 3 },
      '```workspace-write\n{"path":"f.ts","content":"a\\nB\\nc"}\n```',
    );
    assert.equal(r.ok, true);
    assert.equal(r.nextFullText, "a\nB\nc");
  });

  it("replaces selection from code fence", () => {
    const full = "hello world";
    const r = applyInlineEditResponse(
      {
        relPath: "f.ts",
        fullText: full,
        selectionFrom: 6,
        selectionTo: 11,
      },
      "```\nWORLD\n```",
    );
    assert.equal(r.ok, true);
    assert.equal(r.nextFullText, "hello WORLD");
  });
});
