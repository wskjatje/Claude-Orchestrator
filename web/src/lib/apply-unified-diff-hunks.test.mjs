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
});
