import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * 与 parse-chat-file-edits.ts 中 open-fence / diff 关键路径对齐的轻量冒烟
 *（避免 node 直接加载 TS）。
 */

function parseOpenWorkspaceWriteHint(text) {
  const openRe = /(?:```|''')\s*`?\s*workspace-write\s*`?\s*\n?/gi;
  let lastOpen = -1;
  let m;
  while ((m = openRe.exec(text)) !== null) lastOpen = m.index;
  if (lastOpen < 0) return null;
  const tail = text.slice(lastOpen);
  const ticks = tail.match(/```|'''/g) || [];
  if (ticks.length >= 2) return null;
  const pathM = tail.match(/"path"\s*:\s*"([^"]+)"/);
  const path = pathM?.[1]?.replace(/\\/g, "/") || "…";
  return { path, summaryOnly: true, status: "pending" };
}

function stripDiffForPath(fullText, target) {
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return fullText.replace(/```diff\s*\n([\s\S]*?)```/gi, (block, body) => {
    const hit =
      body.includes(target) ||
      new RegExp(`(?:---|\\+\\+\\+)\\s+(?:[ab]/)?${escapeRegExp(target)}\\b`).test(body);
    return hit ? "" : block;
  });
}

describe("parseOpenWorkspaceWriteHint", () => {
  it("shows hint for unclosed fence", () => {
    const hint = parseOpenWorkspaceWriteHint(
      '思考…\n```workspace-write\n{"path":"docs/a.md","content":"x',
    );
    assert.equal(hint?.path, "docs/a.md");
    assert.equal(hint?.summaryOnly, true);
  });

  it("ignores closed fence", () => {
    const hint = parseOpenWorkspaceWriteHint(
      '```workspace-write\n{"path":"docs/a.md","content":"x"}\n```',
    );
    assert.equal(hint, null);
  });
});

describe("stripDiffForPath", () => {
  it("removes matching diff fence", () => {
    const text =
      "说明\n```diff\n--- a/docs/a.md\n+++ b/docs/a.md\n@@ -1 +1 @@\n-a\n+b\n```\n尾";
    const next = stripDiffForPath(text, "docs/a.md");
    assert.equal(next.includes("```diff"), false);
    assert.equal(next.includes("说明"), true);
  });
});

function parseOpenDiffHint(text) {
  const openRe = /```diff\s*\n?/gi;
  let lastOpen = -1;
  let m;
  while ((m = openRe.exec(text)) !== null) lastOpen = m.index;
  if (lastOpen < 0) return null;
  const tail = text.slice(lastOpen);
  const ticks = tail.match(/```/g) || [];
  if (ticks.length >= 2) return null;
  let path = "";
  const plus = tail.match(/^\+\+\+\s+(?:b\/)?(.+?)\s*$/m);
  if (plus?.[1]) path = plus[1].trim().replace(/^b\//, "");
  return { path: path || "…", summaryOnly: true };
}

describe("parseOpenDiffHint", () => {
  it("shows hint for unclosed diff", () => {
    const hint = parseOpenDiffHint("```diff\n+++ b/src/a.ts\n@@ -1 +1 @@\n-a");
    assert.equal(hint?.path, "src/a.ts");
    assert.equal(hint?.summaryOnly, true);
  });

  it("ignores closed diff", () => {
    assert.equal(parseOpenDiffHint("```diff\n+++ b/x\n-a\n+b\n```"), null);
  });
});
