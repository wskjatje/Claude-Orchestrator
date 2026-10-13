import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  globToRegExp,
  parseRuleFrontmatter,
  pathMatchesGlobs,
  shouldAutoInjectRule,
} from "./project-rules-parse.ts";

describe("project-rules-parse", () => {
  it("parses alwaysApply frontmatter", () => {
    const { meta, body } = parseRuleFrontmatter(`---
description: demo
alwaysApply: true
---

hello`);
    assert.equal(meta.alwaysApply, true);
    assert.equal(body.trim(), "hello");
  });

  it("parses globs and matches paths", () => {
    const { meta } = parseRuleFrontmatter(`---
globs: ["**/*.ts", "web/**"]
alwaysApply: false
---
x`);
    assert.equal(meta.alwaysApply, false);
    assert.deepEqual(meta.globs, ["**/*.ts", "web/**"]);
    assert.equal(pathMatchesGlobs("web/src/a.ts", meta.globs), true);
    assert.equal(pathMatchesGlobs("readme.md", meta.globs), false);
  });

  it("shouldAutoInjectRule follows project rule injection rules", () => {
    assert.equal(globToRegExp("**/*.tsx").test("web/src/a.tsx"), true);
    assert.equal(shouldAutoInjectRule("AGENTS.md", {}, null, false), false);
    assert.equal(shouldAutoInjectRule("RULES.md", {}, null, false), true);
    assert.equal(shouldAutoInjectRule("x.mdc", { alwaysApply: true }, null, true), true);
    assert.equal(shouldAutoInjectRule("x.mdc", { globs: ["**/*.ts"] }, "a.js", true), false);
    assert.equal(shouldAutoInjectRule("x.mdc", { globs: ["**/*.ts"] }, "a.ts", true), true);
    assert.equal(shouldAutoInjectRule("x.mdc", {}, null, true), false);
    assert.equal(
      shouldAutoInjectRule(
        ".claudecode/user-preferences.mdc",
        { alwaysApply: true },
        null,
        true,
      ),
      true,
    );
  });
});

describe("user-preferences path", () => {
  it("recognizes canonical preference file", async () => {
    const { isUserPreferencesPath, USER_PREFERENCES_REL } = await import("./user-preferences.ts");
    assert.equal(isUserPreferencesPath(USER_PREFERENCES_REL), true);
    assert.equal(isUserPreferencesPath(".cursor/rules/user-preferences.mdc"), true);
    assert.equal(isUserPreferencesPath("RULES.md"), false);
  });
});
