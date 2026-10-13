/**
 * Accept 流程回归：resolve → collapse → reject 指纹（无 DOM / Electron）
 */
import { describe, it, beforeEach, afterEach } from "node:test";
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
    while (baseIdx < oldStart - 1 && baseIdx < baseLines.length) {
      out.push(baseLines[baseIdx++]);
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
        if (baseLines[baseIdx] !== undefined && baseLines[baseIdx] !== text) return null;
        baseIdx++;
      } else if (tag === "+") out.push(text);
      else return null;
      i++;
    }
  }
  while (baseIdx < baseLines.length) out.push(baseLines[baseIdx++]);
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
    const applied = applyUnifiedDiff(previous, diffBody || content);
    if (applied == null) return { ok: false, error: "mismatch" };
    return { ok: true, text: applied, previous };
  }
  return { ok: true, text: content, previous };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collapseAccepted(fullText, writtenPath) {
  const target = writtenPath.replace(/\\/g, "/");
  let out = fullText.replace(/```workspace-write\s*\n[\s\S]*?```/gi, (block) =>
    block.includes(`"path": "${target}"`) || block.includes(`"path":"${target}"`) ? "" : block,
  );
  out = out.replace(/```diff\s*\n([\s\S]*?)```/gi, (block, body) => {
    const hit =
      body.includes(target) ||
      new RegExp(`(?:---|\\+\\+\\+)\\s+(?:[ab]/)?${escapeRegExp(target)}\\b`).test(body);
    return hit ? "" : block;
  });
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  const summary = `【工作区已写入】共 1 个文件：\n- \`${target}\``;
  return out ? `${out}\n\n${summary}` : summary;
}

function fingerprint(path, content) {
  const p = String(path || "").replace(/\\/g, "/").trim();
  const c = String(content || "");
  return `${p}::${c.length}::${c.slice(0, 96)}`;
}

describe("Accept workspace-write flow", () => {
  /** @type {Map<string, string>} */
  let disk;
  /** @type {Set<string>} */
  let rejected;

  beforeEach(() => {
    disk = new Map([["docs/a.md", "hello\nworld"]]);
    rejected = new Set();
  });

  afterEach(() => {
    disk.clear();
    rejected.clear();
  });

  it("Accept fence：写盘 + 折叠历史", async () => {
    const fenceContent = "hello\nWORLD";
    const bubble =
      "说明\n```workspace-write\n" +
      JSON.stringify({ path: "docs/a.md", content: fenceContent }, null, 2) +
      "\n```";
    const resolved = await resolveWorkspaceEditContent({
      path: "docs/a.md",
      content: fenceContent,
      source: "fence",
      readFile: async (p) => ({ ok: true, text: disk.get(p) }),
    });
    assert.equal(resolved.ok, true);
    disk.set("docs/a.md", resolved.text);
    assert.equal(disk.get("docs/a.md"), fenceContent);
    const next = collapseAccepted(bubble, "docs/a.md");
    assert.equal(next.includes("```workspace-write"), false);
    assert.ok(next.includes("【工作区已写入】"));
    assert.ok(next.includes("docs/a.md"));
  });

  it("Accept diff：相对磁盘合成 + 去掉 diff 围栏", async () => {
    const diffBody = "--- a/docs/a.md\n+++ b/docs/a.md\n@@ -1,2 +1,2 @@\n hello\n-world\n+WORLD\n";
    const bubble = `说明\n\`\`\`diff\n${diffBody}\`\`\``;
    const resolved = await resolveWorkspaceEditContent({
      path: "docs/a.md",
      content: diffBody,
      source: "diff",
      diffBody,
      readFile: async (p) => ({ ok: true, text: disk.get(p) }),
    });
    assert.equal(resolved.ok, true);
    assert.equal(resolved.text, "hello\nWORLD");
    disk.set("docs/a.md", resolved.text);
    const next = collapseAccepted(bubble, "docs/a.md");
    assert.equal(next.includes("```diff"), false);
    assert.ok(next.includes("【工作区已写入】"));
  });

  it("Reject → 恢复：指纹可清", () => {
    const body = "content-v1";
    rejected.add(fingerprint("docs/a.md", body));
    assert.equal(rejected.has(fingerprint("docs/a.md", body)), true);
    rejected.delete(fingerprint("docs/a.md", body));
    assert.equal(rejected.has(fingerprint("docs/a.md", body)), false);
  });

  it("diff 与磁盘不匹配时拒绝写入", async () => {
    const diffBody = "@@ -1,2 +1,2 @@\n nope\n-x\n+y\n";
    const resolved = await resolveWorkspaceEditContent({
      path: "docs/a.md",
      content: diffBody,
      source: "diff",
      diffBody,
      readFile: async (p) => ({ ok: true, text: disk.get(p) }),
    });
    assert.equal(resolved.ok, false);
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
  path = path || "…";
  return { path, summaryOnly: true, source: "diff" };
}

describe("open ```diff progressive", () => {
  it("unclosed diff → hint", () => {
    const hint = parseOpenDiffHint("思考\n```diff\n--- a/docs/a.md\n+++ b/docs/a.md\n@@ -1 +1 @@\n-a\n+b");
    assert.equal(hint?.path, "docs/a.md");
    assert.equal(hint?.summaryOnly, true);
  });

  it("closed diff → no hint", () => {
    const hint = parseOpenDiffHint("```diff\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n```");
    assert.equal(hint, null);
  });
});
