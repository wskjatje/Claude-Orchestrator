/** 将助手 Markdown 拆成块：思考、工具、终端、正文（工具行）。 */

export type AssistantBlock =
  | { kind: "thought"; title: string; body: string }
  | { kind: "tool"; name: string; arg?: string; status?: "running" | "ok" | "fail" }
  | { kind: "terminal"; title: string; body: string }
  | { kind: "markdown"; body: string };

const TOOL_NAMES =
  "Read|Glob|Grep|Edit|Write|MultiEdit|Bash|WebFetch|WebSearch|Explored|Search|Diagnostics|code_search|read_file|write_file|search_replace|run_command|run_tests|get_diagnostics|git_status";

/** `⋯ Read · path` / `Read path` / `Edit src/a.ts` */
const TOOL_LINE = new RegExp(
  `^(?:⋯\\s+)?(${TOOL_NAMES})(?:\\s*[·•]\\s*|\\s+)(.+?)(?:\\s*[✓×✔✖…]*)?$`,
  "i",
);
const TOOL_LINE_BARE = new RegExp(`^(?:⋯\\s+)?(${TOOL_NAMES})\\s*$`, "i");

const THOUGHT_HEAD =
  /^(?:#{1,3}\s*)?(?:Thought(?:\s+for\s+[\d.]+s)?|Thinking(?:\s+for\s+[\d.]+s)?|Reasoning|思考(?:\s+[\d.]+秒)?|思考中)\s*$/i;

const THOUGHT_INLINE = /^>\s*(?:\*\*)?(?:Thought|Thinking|思考)(?:\*\*)?\s*$/i;

function normalizeToolName(rawName: string): string {
  const n = String(rawName || "").trim();
  const map: Record<string, string> = {
    Explored: "Explored",
    Search: "Search",
    code_search: "Search",
    read_file: "Read",
    write_file: "Write",
    search_replace: "Edit",
    run_command: "Bash",
    run_tests: "Bash",
    get_diagnostics: "Diagnostics",
    git_status: "Bash",
  };
  if (map[n]) return map[n];
  const lower = n.toLowerCase();
  if (map[lower]) return map[lower];
  return n;
}

/** 单行工具活动 */
function tryToolLine(line: string): AssistantBlock | null {
  const t = line.trim();
  if (!t) return null;
  // Host 双发的状态回声：⋯ Read ✓ —— 跳过
  if (/^⋯\s+\S+\s*[✓✗✔✖]\s*$/.test(t)) return null;
  const m = t.match(TOOL_LINE) || t.match(TOOL_LINE_BARE);
  if (!m) return null;
  const name = normalizeToolName(m[1]!);
  let arg = m[2]?.trim().replace(/^[`'"]|[`'"]$/g, "").replace(/[…]+$/, "") || "";
  if (/^[✓✗✔✖]+$/.test(arg)) arg = "";
  const status: "ok" | "fail" = /[✗✖]/.test(t) ? "fail" : "ok";
  return arg
    ? { kind: "tool", name, arg, status }
    : { kind: "tool", name, status };
}

function isToolLine(line: string): boolean {
  return tryToolLine(line) != null;
}

function tryTerminalBlock(lines: string[], start: number): { block: AssistantBlock; next: number } | null {
  const head = lines[start]?.trim() ?? "";
  if (!/^【终端/.test(head) && !/^```(?:bash|sh|shell|zsh|terminal)/i.test(head)) return null;

  if (/^【终端/.test(head)) {
    const bodyLines = [head];
    let i = start + 1;
    while (
      i < lines.length &&
      lines[i]?.trim() &&
      !isToolLine(lines[i]!) &&
      !THOUGHT_HEAD.test(lines[i]!.trim())
    ) {
      bodyLines.push(lines[i]!);
      i++;
    }
    return {
      block: {
        kind: "terminal",
        title: head.replace(/^【|】$/g, "").slice(0, 48) || "终端",
        body: bodyLines.join("\n"),
      },
      next: i,
    };
  }

  const fenceEnd = lines.findIndex((l, idx) => idx > start && /^```\s*$/.test(l.trim()));
  if (fenceEnd === -1) return null;
  const body = lines.slice(start + 1, fenceEnd).join("\n");
  return {
    block: { kind: "terminal", title: "终端", body },
    next: fenceEnd + 1,
  };
}

export function parseAssistantContent(content: string): AssistantBlock[] {
  if (!content?.trim()) return [{ kind: "markdown", body: content }];

  const xmlThinking = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (xmlThinking) {
    const thoughtBody = xmlThinking[1]?.trim() ?? "";
    const rest = content.replace(/<thinking>[\s\S]*?<\/thinking>/i, "").trim();
    const restBlocks = rest ? parseAssistantContent(rest) : [];
    return [{ kind: "thought", title: "Thought", body: thoughtBody }, ...restBlocks];
  }

  const lines = content.split("\n");
  const blocks: AssistantBlock[] = [];
  let buf: string[] = [];
  let i = 0;

  const flushMarkdown = () => {
    const body = buf.join("\n").trim();
    buf = [];
    if (body) blocks.push({ kind: "markdown", body });
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (THOUGHT_HEAD.test(trimmed) || THOUGHT_INLINE.test(trimmed)) {
      flushMarkdown();
      const title =
        trimmed.replace(/^#{1,3}\s*/, "").replace(/^>\s*/, "").replace(/\*\*/g, "") || "Thought";
      const thoughtLines: string[] = [];
      i++;
      while (i < lines.length) {
        const tl = lines[i]?.trim() ?? "";
        if (isToolLine(tl) || THOUGHT_HEAD.test(tl) || THOUGHT_INLINE.test(tl) || /^【终端/.test(tl))
          break;
        if (tl === "---" || tl === "***") {
          i++;
          break;
        }
        const raw = lines[i] ?? "";
        thoughtLines.push(/^>\s?/.test(raw) ? raw.replace(/^>\s?/, "") : raw);
        i++;
      }
      blocks.push({ kind: "thought", title, body: thoughtLines.join("\n").trim() });
      continue;
    }

    const tool = tryToolLine(trimmed);
    if (tool) {
      flushMarkdown();
      blocks.push(tool);
      i++;
      continue;
    }

    const term = tryTerminalBlock(lines, i);
    if (term) {
      flushMarkdown();
      blocks.push(term.block);
      i = term.next;
      continue;
    }

    buf.push(line);
    i++;
  }

  flushMarkdown();
  return blocks.length ? blocks : [{ kind: "markdown", body: content }];
}
