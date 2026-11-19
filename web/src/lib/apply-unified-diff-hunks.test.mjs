import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyUnifiedDiffHunks, splitUnifiedDiffHunks } from "./apply-unified-diff.ts";

describe("applyUnifiedDiffHunks", () => {
  it("splits and applies selected hunks only", () => {
    const base = "a\nb\nc\nd\n";
    const diff = `--- a/f
+++ b/f
@@ -1,2 +1,2 @@
-a
+A
 b
@@ -3,2 +3,2 @@
-c
+C
 d
`;
    const { hunks } = splitUnifiedDiffHunks(diff);
    assert.equal(hunks.length, 2);
    const onlyFirst = applyUnifiedDiffHunks(base, diff, [0]);
    assert.equal(onlyFirst, "A\nb\nc\nd\n");
    const both = applyUnifiedDiffHunks(base, diff, [0, 1]);
    assert.equal(both, "A\nb\nC\nd\n");
  });

  it("applies selected hunks in files larger than 100k", () => {
    const lines = Array.from({ length: 20_000 }, (_, index) => `line-${index}`);
    const base = `${lines.join("\n")}\n`;
    assert.ok(base.length > 100_000);
    const diff = `--- a/large.txt
+++ b/large.txt
@@ -101,1 +101,1 @@
-line-100
+LINE-100
@@ -19001,1 +19001,1 @@
-line-19000
+LINE-19000
`;
    const after = applyUnifiedDiffHunks(base, diff, [1]);
    assert.ok(after);
    assert.match(after, /\nline-100\n/);
    assert.match(after, /\nLINE-19000\n/);
  });
});
