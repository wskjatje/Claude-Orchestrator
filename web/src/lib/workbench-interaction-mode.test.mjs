import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// 轻量冒烟：与 workbench-interaction-mode.ts 语义对齐
function cliPermissionModeForInteraction(m) {
  if (m === "agent") return "acceptEdits";
  return "plan";
}
function cliPermissionModeForTurn({ interactionMode, allowWrites }) {
  if (allowWrites === false) return "plan";
  return cliPermissionModeForInteraction(interactionMode);
}
function shouldAutoApplyWorkspaceWrites(m) {
  return m === "agent";
}

describe("Workbench interaction mode", () => {
  it("Agent → acceptEdits + auto apply", () => {
    assert.equal(cliPermissionModeForInteraction("agent"), "acceptEdits");
    assert.equal(shouldAutoApplyWorkspaceWrites("agent"), true);
  });

  it("Ask/Plan → plan permission + no auto apply", () => {
    assert.equal(cliPermissionModeForInteraction("ask"), "plan");
    assert.equal(cliPermissionModeForInteraction("plan"), "plan");
    assert.equal(shouldAutoApplyWorkspaceWrites("ask"), false);
    assert.equal(shouldAutoApplyWorkspaceWrites("plan"), false);
  });

  it("Agent + readonly turn → plan (not acceptEdits)", () => {
    assert.equal(
      cliPermissionModeForTurn({ interactionMode: "agent", allowWrites: false }),
      "plan",
    );
    assert.equal(
      cliPermissionModeForTurn({ interactionMode: "agent", allowWrites: true }),
      "acceptEdits",
    );
  });
});
