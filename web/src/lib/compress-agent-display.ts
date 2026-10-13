/**
 * Agent 轨迹提取与短摘要（非破坏性）。
 * 成功回合不得用本模块重写全过程；过程以 streamEvents / ⋯ 行为准。
 */

import {
  formatStreamEventsBlock,
  parseStreamEventsBlock,
  stripStreamEventsBlock,
  type StreamAgentEvent,
} from "@/lib/stream-agent-events";

/** Agent 轨迹允许的工具名（拒绝「系统强制续写」等伪工具行） */
const AGENT_TRACE_TOOL_NAME_RE =
  /^(Read|Glob|Grep|Edit|Write|MultiEdit|Bash|WebFetch|WebSearch|Explored|Search|Diagnostics)$/i;

/** Host / CLI 工具名 → 轨迹展示名 */
export function agentTraceToolLabel(raw: string): string {
  const n = String(raw || "").trim().replace(/[….]+$/u, "");
  const map: Record<string, string> = {
    read_file: "Read",
    write_file: "Write",
    search_replace: "Edit",
    code_search: "Search",
    run_command: "Bash",
    run_tests: "Bash",
    get_diagnostics: "Diagnostics",
    git_status: "Bash",
    Explored: "Explored",
    Search: "Search",
    MultiEdit: "Edit",
  };
  if (map[n] || map[n.toLowerCase()]) return map[n] || map[n.toLowerCase()]!;
  // mcp__server__tool_name → tool_name（保留下划线，便于轨迹过滤）
  const mcp = n.match(/^mcp__(?:[^_]+)__(.+)$/i) || n.match(/^mcp__(.+)$/i);
  if (mcp?.[1]) return mcp[1];
  return n;
}

export function isAgentTraceToolName(name: string): boolean {
  const raw = String(name || "").trim();
  if (!raw || /强制续写|^系统/.test(raw)) return false;
  const label = agentTraceToolLabel(raw);
  if (AGENT_TRACE_TOOL_NAME_RE.test(label)) return true;
  // MCP / 其它英文工具标识（已从 tool_call 抽出）
  if (/^mcp__/i.test(raw)) return true;
  return /^[A-Za-z][\w.-]{0,64}$/.test(label);
}

/** 是否为本轮 MCP 工具调用（CLI `mcp__…` 或轨迹名） */
export function isMcpToolName(name: string | undefined | null): boolean {
  return /^mcp__/i.test(String(name || "").trim());
}

/** 从 streamEvents / toolTrace 判定本轮是否实际调用过 MCP 工具 */
export function eventsHaveMcpTool(
  events?: Array<{ type?: string; name?: string } | null> | null,
  toolTrace?: Array<{ tool?: string; name?: string } | null> | null,
): boolean {
  if (events?.some((e) => e && (e.type === "tool" || !e.type) && isMcpToolName(e.name))) {
    return true;
  }
  if (toolTrace?.some((t) => t && isMcpToolName(t.tool || t.name))) {
    return true;
  }
  return false;
}

function shortenToolPathArg(raw: string): string {
  const s = String(raw || "").replace(/\\/g, "/").trim();
  if (!s) return s;
  const hit = s.match(
    /(?:^|\/)((?:src|tests?|docs|web|server|lib|app|components|routes|\.github)\/[\w./-]+)$/i,
  );
  if (hit?.[1]) return hit[1];
  if (/^\/|^[A-Za-z]:\//.test(s)) {
    const parts = s.split("/").filter(Boolean);
    return parts.slice(-2).join("/") || s;
  }
  return s.replace(/^\.\//, "");
}

function argFromToolPayload(name: string, payload: string): string {
  const body = String(payload || "").trim();
  if (!body) return "";
  try {
    const o = JSON.parse(body) as Record<string, unknown>;
    const raw =
      o.command ||
      o.path ||
      o.file_path ||
      o.filePath ||
      o.query ||
      o.pattern ||
      o.description ||
      "";
    let arg = String(raw || "").trim();
    if (/^(Read|Write|Edit|Glob)$/i.test(name) || /path|file/i.test(Object.keys(o).join(","))) {
      arg = shortenToolPathArg(arg);
    }
    return arg.replace(/\s+/g, " ").slice(0, 160);
  } catch {
    return body.replace(/\s+/g, " ").slice(0, 160);
  }
}

function normalizeExtractedToolName(nameRaw: string): string {
  const raw = String(nameRaw || "").trim();
  if (/^read(_file)?$/i.test(raw)) return "Read";
  if (/^(bash|run_command|run_tests)$/i.test(raw)) return "Bash";
  if (/^write(_file)?$/i.test(raw)) return "Write";
  if (/^(edit|search_replace|multiedit)$/i.test(raw)) return "Edit";
  if (/^glob$/i.test(raw)) return "Glob";
  if (/^grep$/i.test(raw)) return "Grep";
  if (/^(web_fetch|webfetch)$/i.test(raw)) return "WebFetch";
  if (/^(web_search|websearch)$/i.test(raw)) return "WebSearch";
  return agentTraceToolLabel(raw);
}

/**
 * 剥 `<tool_call>…</tool_call>`（模型泄漏的工具调用），并抽出 Bash/Read 等。
 */
export function stripXmlToolCallMarkup(text: string): {
  text: string;
  tools: Array<{ name: string; arg?: string }>;
} {
  const tools: Array<{ name: string; arg?: string }> = [];
  let t = String(text || "");

  t = t.replace(/<tool_call>\s*([\s\S]*?)<\/tool_call>/gi, (_m, inner: string) => {
    const block = String(inner || "").trim();
    if (!block) return "";
    const nl = block.indexOf("\n");
    const nameRaw = (nl >= 0 ? block.slice(0, nl) : block).trim();
    const payload = nl >= 0 ? block.slice(nl + 1).trim() : "";
    if (!nameRaw || !isAgentTraceToolName(nameRaw)) return "";
    const name = normalizeExtractedToolName(nameRaw);
    const arg = argFromToolPayload(name, payload);
    tools.push({ name, arg: arg || undefined });
    return "";
  });

  // 未闭合残留
  t = t.replace(/<\/?tool_call>/gi, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return { text: t, tools };
}

/**
 * 剥 DeepSeek DSML + `<tool_call>` 等泄漏的工具标记，并抽出轨迹工具。
 */
export function stripDsmlToolMarkup(text: string): {
  text: string;
  tools: Array<{ name: string; arg?: string }>;
} {
  const xml = stripXmlToolCallMarkup(text);
  const tools = [...xml.tools];
  let t = xml.text;

  const open = String.raw`[◄◁‹<]\s*[|｜]?\s*DSML\s*[|｜]`;
  const close = String.raw`[►▷›>|｜]`;

  const invokeRe = new RegExp(
    `${open}\\s*invoke\\s+name="([^"]+)"\\s*${close}([\\s\\S]*?)${open}\\s*invoke\\s*${close}`,
    "gi",
  );
  const paramRe = new RegExp(
    `${open}\\s*parameter\\s+name="(command|path|file_path|query|pattern)"[^►▷›>|｜\\n]*${close}([\\s\\S]*?)${open}\\s*parameter\\s*${close}`,
    "gi",
  );
  const tokenRe = new RegExp(`${open}[^\\n►▷›>|｜]*${close}`, "gi");

  t = t.replace(invokeRe, (_m, name: string, body: string) => {
    const n = agentTraceToolLabel(String(name || ""));
    let arg = "";
    let pm: RegExpExecArray | null;
    paramRe.lastIndex = 0;
    while ((pm = paramRe.exec(String(body || ""))) !== null) {
      const v = String(pm[2] || "").trim();
      if (v) {
        arg = v;
        break;
      }
    }
    if (!arg) {
      arg = String(body || "")
        .replace(tokenRe, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
    } else {
      arg = arg.replace(/\s+/g, " ").slice(0, 160);
    }
    if (/^(Read|Write|Edit)$/i.test(n)) arg = shortenToolPathArg(arg);
    if (n && isAgentTraceToolName(n)) {
      tools.push({ name: n, arg: arg || undefined });
    }
    return "";
  });

  t = t.replace(tokenRe, "");
  t = t.replace(/^[^\n]*DSML[^\n]*$/gim, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return { text: t, tools };
}

/** 去掉内部续写标记（勿当工具行展示） */
export function stripForceContinueMarkers(text: string): string {
  return String(text || "")
    .replace(/^⋯\s*系统强制续写[^\n]*$/gim, "")
    .replace(/^系统强制续写[….\s]*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type HostToolTraceItem = {
  tool?: string;
  detail?: string;
  path?: string;
  args?: Record<string, unknown>;
  ok?: boolean;
};

function detailFromArgs(args?: Record<string, unknown>): string {
  if (!args || typeof args !== "object") return "";
  const raw =
    args.path || args.file_path || args.query || args.command || args.pattern || "";
  return String(raw || "").trim().slice(0, 120);
}

/** Host toolTrace → StreamAgentEvent[] */
export function toolTraceToStreamEvents(
  trace?: HostToolTraceItem[] | null,
): StreamAgentEvent[] {
  if (!Array.isArray(trace) || !trace.length) return [];
  const out: StreamAgentEvent[] = [];
  const seen = new Set<string>();
  for (const t of trace) {
    const rawTool = String(t?.tool || "").trim();
    // 保留 mcp__ 前缀，便于本轮 MCP 判定与轨迹折叠
    const name = /^mcp__/i.test(rawTool) ? rawTool : agentTraceToolLabel(rawTool);
    if (!name) continue;
    const arg = String(t?.detail || t?.path || detailFromArgs(t?.args) || "")
      .trim()
      .replace(/[…]+$/, "");
    const key = `${name}\0${arg}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const isEdit = /^(Edit|Write)$/i.test(name);
    out.push({
      type: "tool",
      name,
      arg: arg || undefined,
      path: isEdit && arg ? arg : undefined,
      status: t?.ok === false ? "fail" : "ok",
    });
  }
  return out;
}

/** 正文 ⋯ 工具行 → events（Host 无 stream-events 块时） */
export function trailLinesToStreamEvents(text: string): StreamAgentEvent[] {
  const body = stripForceContinueMarkers(stripStreamEventsBlock(text));
  const out: StreamAgentEvent[] = [];
  const seen = new Set<string>();
  for (const line of body.split("\n")) {
    const t = line.trim();
    const m = t.match(/^⋯\s+(\S+)(?:\s*[·•]\s*(.+))?$/);
    if (!m) continue;
    const name = agentTraceToolLabel(m[1] || "");
    // 拒绝「系统强制续写」等非工具伪行
    if (!isAgentTraceToolName(name)) continue;
    const arg = String(m[2] || "")
      .trim()
      .replace(/[…]+$/u, "");
    const key = `${name}\0${arg}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const isEdit = /^(Edit|Write)$/i.test(name);
    out.push({
      type: "tool",
      name,
      arg: arg || undefined,
      path: isEdit && arg ? arg : undefined,
      status: "ok",
    });
  }
  return out;
}

/** 从 CLI 正文解析 stream-events；若无块则回退 ⋯ 行 */
export function extractStreamEventsFromContent(text: string): StreamAgentEvent[] {
  const fromBlock = parseStreamEventsBlock(text);
  if (fromBlock.length) return fromBlock;
  return trailLinesToStreamEvents(text);
}

/** 合并多路 events，按 name+arg 去重，保持顺序 */
export function mergeStreamEvents(
  ...lists: Array<StreamAgentEvent[] | undefined | null>
): StreamAgentEvent[] {
  const out: StreamAgentEvent[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    if (!list?.length) continue;
    for (const e of list) {
      if (!e || typeof e !== "object") continue;
      if (e.type === "thinking") {
        const key = `thinking:${out.filter((x) => x.type === "thinking").length}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type: "thinking" });
        continue;
      }
      if (e.type !== "tool") continue;
      const name = agentTraceToolLabel(e.name || "Tool");
      const arg = String(e.path || e.arg || "")
        .trim()
        .replace(/[…]+$/, "");
      const key = `tool:${name}\0${arg}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        type: "tool",
        name,
        arg: arg || undefined,
        path: e.path || (/^(Edit|Write)$/i.test(name) && arg ? arg : undefined),
        status: e.status === "fail" ? "fail" : e.status === "running" ? "ok" : e.status || "ok",
      });
    }
  }
  return out;
}

/** 是否像工作区相对路径（拒绝 git 报错 / 句子） */
export function isPlausibleWorkspaceRelPath(raw: string): boolean {
  const p = String(raw || "")
    .trim()
    .replace(/[…]+$/, "")
    .replace(/^[`'"]|[`'"]$/g, "")
    .replace(/\s*[（(]新增[）)]\s*$/u, "")
    .replace(/\\/g, "/");
  if (!p || p.includes("..")) return false;
  if (/^(file|path|Edit|Write|Read|Bash|\.git)$/i.test(p)) return false;
  if (
    /^(fatal|error|warning|command failed|git status|git diff)\b/i.test(p) ||
    /不可用|not a git repository|Command failed/i.test(p) ||
    /^[（(]/.test(p) ||
    /^\)+$/.test(p) ||
    /\s/.test(p)
  ) {
    return false;
  }
  // 要有扩展名的文件路径（dir/file.ext 或 file.ext）
  if (!/\.\w{1,8}$/.test(p)) return false;
  if (/(^|\/)\.git$/i.test(p) || /:\s*\.git$/i.test(p)) return false;
  return true;
}

/** 规范化并收集路径 */
function pushPath(paths: string[], raw: string) {
  const p = String(raw || "")
    .trim()
    .replace(/[…]+$/, "")
    .replace(/^[`'"]|[`'"]$/g, "")
    .replace(/\s*[（(]新增[）)]\s*$/u, "")
    .replace(/\\/g, "/");
  if (!isPlausibleWorkspaceRelPath(p)) return;
  paths.push(p);
}

/** 读盘行 → Explored 用路径 */
export function extractReadPathsFromAgentContent(text: string): string[] {
  const paths: string[] = [];
  const body = stripStreamEventsBlock(text);
  for (const line of body.split("\n")) {
    const t = line.trim();
    const isReadLine =
      /^(读盘|阅读|已读|Explored|Read)[：:\s]/i.test(t) ||
      /^⋯\s+Read\b/i.test(t) ||
      (/读盘|Explored/i.test(t) && /`[^`]+`/.test(t));
    if (!isReadLine) continue;
    for (const bit of t.matchAll(/`([^`]+)`/g)) pushPath(paths, bit[1] || "");
    const m = t.match(/^⋯\s+Read\s*[·•]\s*(.+)$/i);
    if (m?.[1]) pushPath(paths, m[1]);
  }
  return [...new Set(paths)].slice(0, 40);
}

/** 从正文 / stream-events 抽出 Edit/Write 路径 */
export function extractWrittenPathsFromAgentContent(text: string): string[] {
  const paths: string[] = [];
  for (const e of parseStreamEventsBlock(text)) {
    if (e.type !== "tool") continue;
    const name = agentTraceToolLabel(e.name || "");
    if (!/^(Edit|Write)$/i.test(name)) continue;
    pushPath(paths, String(e.path || e.arg || ""));
  }
  const body = stripStreamEventsBlock(text);
  for (const line of body.split("\n")) {
    const t = line.trim();
    const m = t.match(/^⋯\s+(?:Edit|Write)\s*[·•]\s*(.+)$/i);
    if (m?.[1]) pushPath(paths, m[1]);
    if (/^路径[：:]/.test(t)) {
      for (const bit of t.matchAll(/`([^`]+)`/g)) pushPath(paths, bit[1] || "");
      for (const bit of t
        .replace(/^路径[：:]\s*/, "")
        .split(/[,，]/)
        .map((s) => s.trim())) {
        if (bit && !bit.includes(" ")) pushPath(paths, bit);
      }
    }
  }
  return [...new Set(paths)].slice(0, 40);
}

/** 执行流水账特征分（读盘/落地/路径等） */
function agentExecReportScore(body: string): number {
  let s = 0;
  if (/^读盘[：:]/m.test(body)) s += 2;
  if (/^落地\b/m.test(body)) s += 2;
  if (/^路径[：:]/m.test(body)) s += 2;
  if (/^验证[：:]/m.test(body)) s += 1;
  if (/\(执行:\s*Claude CLI/i.test(body)) s += 2;
  if (/acceptEdits/i.test(body)) s += 1;
  if (/P2\s*已落地/i.test(body)) s += 1;
  return s;
}

/** CLI/Agent 执行报告（过程轨可折；非用户方案正文） */
export function looksLikeAgentTurnReport(text: string): boolean {
  const body = stripStreamEventsBlock(text);
  if (!body.trim()) return false;
  if (looksLikeUserFacingAnswer(body)) return false;
  if (agentExecReportScore(body) >= 2) return true;
  return (
    /^路径[：:]/m.test(body) ||
    /^读盘[：:]/m.test(body) ||
    /^落地\b/m.test(body) ||
    /^验证[：:]/m.test(body) ||
    /^结论[：:]/m.test(body) ||
    /\(执行:\s*Claude CLI/i.test(body) ||
    /acceptEdits/i.test(body)
  );
}

/**
 * 给用户看的答案/方案（应外露，勿整段塞进 Thought briefly）。
 * 过程可折；最终回复默认展开。
 */
export function looksLikeUserFacingAnswer(text: string): boolean {
  const body = stripStreamEventsBlock(text).trim();
  if (!body || body.length < 48) return false;
  if (agentExecReportScore(body) >= 3) return false;
  if (
    /优化方案|优先做|建议先|下一步|可观测|工程化|遗留|生产可观测|给我.*方案/i.test(
      body,
    )
  ) {
    return true;
  }
  // 带标题或较长编号方案，且不是读盘流水
  if (/^#{1,3}\s+\S+/m.test(body) && body.length > 120) return true;
  if (
    /\n\s*\d+\.\s+\S+/m.test(body) &&
    body.length > 200 &&
    !/^读盘[：:]/m.test(body) &&
    !/^路径[：:]/m.test(body)
  ) {
    return true;
  }
  return false;
}

/** 从 Thought 正文去掉已升格为过程行的段落，避免百科式重复 */
function slimThoughtBody(body: string): string {
  let t = stripForceContinueMarkers(stripDsmlToolMarkup(String(body || "")).text);
  // 剥执行元信息
  t = t.replace(/^\(执行:[^)]+\)\s*$/gm, "").trim();
  // 剥读盘行（已进 Explored）
  t = t.replace(/^读盘[：:][^\n]*\n?/gm, "");
  // 剥验证代码块（已进终端卡）
  t = t.replace(/^验证[：:]?\s*\n```[\s\S]*?```\s*/gm, "");
  t = t.replace(/^验证[：:][^\n]*\n?/gm, "");
  // 剥「要不要我直接开始」类征求确认（强制续写后不应再问）
  t = t.replace(/^要不要我[^\n]*\??\s*$/gm, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

/** 可选短摘要（写入 agentTurn.summary，不替换过程正文） */
export function buildShortAgentSummary(
  writtenPaths?: string[],
  verified?: boolean,
  proseHint?: string,
): string {
  const paths = (writtenPaths || []).filter(Boolean);
  const pass = String(proseHint || "").match(/(\d+)\s+passed/i)?.[1];
  const parts: string[] = [];
  if (paths.length) parts.push(`已完成 ${paths.length} 处改动。`);
  if (verified || pass) {
    parts.push(pass ? `测试 ${pass} passed。` : "测试已通过。");
  }
  return parts.join(" ").trim();
}

/**
 * Explored / Edit / Bash → Thought briefly → 短收尾。
 * CLI 中文报告无 toolTrace 时从读盘/验证合成轨迹；Thought 去掉已升格段落。
 */
export function shapeAgentTurnDisplay(opts: {
  content: string;
  streamEvents?: StreamAgentEvent[];
  writtenPaths?: string[];
  verified?: boolean;
  summary?: string;
}): { content: string; streamEvents: StreamAgentEvent[] } {
  const dsml = stripDsmlToolMarkup(stripStreamEventsBlock(opts.content));
  const body0 = stripForceContinueMarkers(dsml.text);
  const readPaths = extractReadPathsFromAgentContent(body0);
  const written = [
    ...(opts.writtenPaths || []).filter(Boolean),
    ...extractWrittenPathsFromAgentContent(body0),
  ].map((p) => p.replace(/\\/g, "/"));
  const writtenUnique = [...new Set(written)].filter((p) =>
    isPlausibleWorkspaceRelPath(p),
  );

  let events = mergeStreamEvents(
    opts.streamEvents,
    extractStreamEventsFromContent(opts.content),
    dsml.tools.map(
      (t) =>
        ({
          type: "tool",
          name: t.name,
          arg: t.arg,
          path: /^(Edit|Write)$/i.test(t.name) && t.arg ? t.arg : undefined,
          status: "ok",
        }) satisfies StreamAgentEvent,
    ),
  );
  // 再滤一遍伪工具
  events = events.filter(
    (e) => e.type !== "tool" || isAgentTraceToolName(e.name || ""),
  );

  if (readPaths.length) {
    events = mergeStreamEvents(
      events,
      readPaths.map(
        (p) =>
          ({
            type: "tool",
            name: "Read",
            arg: p,
            path: p,
            status: "ok",
          }) satisfies StreamAgentEvent,
      ),
    );
  }

  if (writtenUnique.length) {
    events = mergeStreamEvents(
      events,
      writtenUnique.map(
        (p) =>
          ({
            type: "tool",
            name: "Edit",
            arg: p,
            path: p,
            status: "ok",
          }) satisfies StreamAgentEvent,
      ),
    );
  }

  const pass = body0.match(/(\d+)\s+passed/i)?.[1];
  // 仅在有明确结果时合成终端卡；禁止空 pytest + DONE
  if (pass) {
    events = mergeStreamEvents(events, [
      {
        type: "tool",
        name: "Bash",
        arg: `pytest · ${pass} passed`,
        status: "ok",
      },
    ]);
  }

  const toolCount = events.filter((e) => e.type === "tool").length;
  let body = body0.trim();
  body = body.replace(/^\(执行:[^)]+\)\s*$/gm, "").trim();
  // 剥泄漏工具后的可读正文
  body = slimThoughtBody(body) || body;

  const userAnswer = looksLikeUserFacingAnswer(body);
  const looksLikeReport = looksLikeAgentTurnReport(body0) && !userAnswer;
  const summary =
    opts.summary ||
    buildShortAgentSummary(writtenUnique, opts.verified || Boolean(pass), body0) ||
    (writtenUnique.length ? `已完成 ${writtenUnique.length} 处改动。` : "") ||
    (pass ? `测试 ${pass} passed。` : "");

  /**
   * 气泡整形：
   * - 用户答案/方案 → 外露 Markdown（不进 Thought）
   * - 执行流水账 → Thought 可折 + 有证据的短收尾（写盘数/测试）
   * - 仅有工具轨、正文空 → 不合成伪结论
   */
  if (userAnswer) {
    // 答案外露；若有写盘摘要可附一行，不替换正文
    if (summary && writtenUnique.length && !body.includes(summary)) {
      body = `${body}\n\n${summary}`.trim();
    }
  } else if (looksLikeReport && (toolCount > 0 || summary || writtenUnique.length)) {
    const thought = body;
    const tail =
      summary ||
      (pass ? `测试 ${pass} passed。` : "") ||
      (writtenUnique.length ? `已完成 ${writtenUnique.length} 处改动。` : "");
    // 过长且无写盘：仍当答案外露（避免方案被误判成报告）
    if (thought.length > 500 && !writtenUnique.length) {
      body = thought;
    } else if (thought) {
      body = tail
        ? `<thinking>\n${thought}\n</thinking>\n\n${tail}`.trim()
        : `<thinking>\n${thought}\n</thinking>`.trim();
    } else {
      body = tail;
    }
  } else if (!body.trim()) {
    body =
      summary ||
      (opts.writtenPaths?.length ? `已完成 ${opts.writtenPaths.length} 处改动。` : "") ||
      "";
  }

  const content = `${body}${formatStreamEventsBlock(events)}`.trim();
  return { content, streamEvents: events };
}

/**
 * @deprecated 勿再用于成功回合整段替换。保留导出以免旧引用炸裂；等价于提取 events。
 */
export function compressAgentDisplayContent(text: string): string {
  return String(text || "").trim();
}
