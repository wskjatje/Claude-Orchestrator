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

/** Agent 轨迹允许的工具名（规范名 Explored / Edited / Ran + 细粒度别名） */
const AGENT_TRACE_TOOL_NAME_RE =
  /^(Read|Glob|Grep|Edit|Write|MultiEdit|Bash|WebFetch|WebSearch|Explored|Edited|Ran|Search|Diagnostics)$/i;

/** Host / CLI 工具名 → 轨迹规范名（Explored / Edited / Ran） */
export function agentTraceToolLabel(raw: string): string {
  const n = String(raw || "").trim().replace(/[….]+$/u, "");
  const map: Record<string, string> = {
    read_file: "Explored",
    write_file: "Edited",
    search_replace: "Edited",
    code_search: "Explored",
    run_command: "Ran",
    run_tests: "Ran",
    get_diagnostics: "Explored",
    git_status: "Ran",
    Read: "Explored",
    Glob: "Explored",
    Grep: "Explored",
    WebFetch: "Explored",
    WebSearch: "Explored",
    Search: "Explored",
    Diagnostics: "Explored",
    Edit: "Edited",
    Write: "Edited",
    MultiEdit: "Edited",
    Bash: "Ran",
    Explored: "Explored",
    Edited: "Edited",
    Ran: "Ran",
  };
  if (map[n] || map[n.toLowerCase()]) return map[n] || map[n.toLowerCase()]!;
  // mcp__server__tool_name → tool_name（保留下划线，便于轨迹过滤）
  const mcp = n.match(/^mcp__(?:[^_]+)__(.+)$/i) || n.match(/^mcp__(.+)$/i);
  if (mcp?.[1]) return mcp[1];
  return n;
}

/** 将 streamEvents 工具名规范为 Explored / Edited / Ran（时间线单源） */
export function normalizeStreamEventName(name: string | undefined | null): string {
  const label = agentTraceToolLabel(String(name || ""));
  if (/^Explored$/i.test(label)) return "Explored";
  if (/^Edited$/i.test(label)) return "Edited";
  if (/^Ran$/i.test(label)) return "Ran";
  if (/^(Read|Glob|Grep|Search|Diagnostics|WebFetch|WebSearch)$/i.test(label)) return "Explored";
  if (/^(Edit|Write|MultiEdit)$/i.test(label)) return "Edited";
  if (/^(Bash|Shell|Terminal)$/i.test(label)) return "Ran";
  return label || "Explored";
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

  // DeepSeek 常见 `<｜｜DSML｜｜`（双竖线），旧式单 `|` 一并兼容
  const open = String.raw`[◄◁‹<]\s*[|｜]{0,2}\s*DSML\s*[|｜]{0,2}`;
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
  output?: string;
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
    const output = String(t?.output || "").trim().slice(0, 8000) || undefined;
    out.push({
      type: "tool",
      name,
      arg: arg || undefined,
      path: isEdit && arg ? arg : undefined,
      status: t?.ok === false ? "fail" : "ok",
      ...(output ? { output } : {}),
    });
  }
  return out;
}

/** 正文 ⋯ 工具行 → events（Host 无 stream-events 块时） */
export function trailLinesToStreamEvents(text: string): StreamAgentEvent[] {
  const body = stripForceContinueMarkers(stripStreamEventsBlock(text));
  const out: StreamAgentEvent[] = [];
  const byKey = new Map<string, StreamAgentEvent>();
  for (const line of body.split("\n")) {
    const t = line.trim();
    const m = t.match(/^⋯\s+(\S+)(?:\s*[·•]\s*(.+))?$/);
    if (!m) continue;
    const name = agentTraceToolLabel(m[1] || "");
    // 拒绝「系统强制续写」等非工具伪行
    if (!isAgentTraceToolName(name)) continue;
    const rawArg = String(m[2] || "").trim();
    const fail = /[✗×x]\s*$/u.test(rawArg) || /\s[✗×]\s*$/u.test(t);
    const running = !fail && /[…⋯]\s*$/u.test(rawArg);
    const arg = rawArg
      .replace(/[…⋯]+$/u, "")
      .replace(/\s*[✗×x]\s*$/u, "")
      .trim();
    const key = `${name}\0${arg}`;
    if (!name) continue;
    const isEdit = /^(Edit|Write)$/i.test(name);
    const status: StreamAgentEvent["status"] = fail
      ? "fail"
      : running
        ? "running"
        : "ok";
    const prev = byKey.get(key);
    // 同工具后出现的状态覆盖先到的（running → ok/fail）
    if (
      prev &&
      prev.status === "running" &&
      (status === "ok" || status === "fail")
    ) {
      prev.status = status;
      continue;
    }
    if (prev) continue;
    const ev: StreamAgentEvent = {
      type: "tool",
      name,
      arg: arg || undefined,
      path: isEdit && arg ? arg : undefined,
      status,
    };
    byKey.set(key, ev);
    out.push(ev);
  }
  return out;
}

/** 从 CLI 正文解析 stream-events；若无块则回退 ⋯ 行 */
export function extractStreamEventsFromContent(text: string): StreamAgentEvent[] {
  const fromBlock = parseStreamEventsBlock(text);
  if (fromBlock.length) return fromBlock;
  return trailLinesToStreamEvents(text);
}

/** 合并多路 events：同 name+arg 后到覆盖先到（保留 running→ok/fail 直播） */
export function mergeStreamEvents(
  ...lists: Array<StreamAgentEvent[] | undefined | null>
): StreamAgentEvent[] {
  const out: StreamAgentEvent[] = [];
  const indexByKey = new Map<string, number>();
  let thinkingCount = 0;
  for (const list of lists) {
    if (!list?.length) continue;
    for (const e of list) {
      if (!e || typeof e !== "object") continue;
      if (e.type === "thinking") {
        const key = `thinking:${thinkingCount++}`;
        if (indexByKey.has(key)) continue;
        indexByKey.set(key, out.length);
        out.push({ type: "thinking" });
        continue;
      }
      if (e.type !== "tool") continue;
      const name = normalizeStreamEventName(e.name || "Tool");
      const arg = String(e.path || e.arg || "")
        .trim()
        .replace(/[…⋯]+$/u, "");
      const key = `tool:${name}\0${arg}`;
      const status: StreamAgentEvent["status"] =
        e.status === "fail"
          ? "fail"
          : e.status === "running"
            ? "running"
            : e.status === "ok"
              ? "ok"
              : "ok";
      const next: StreamAgentEvent = {
        type: "tool",
        name,
        arg: arg || undefined,
        path:
          e.path ||
          (/^(Edited|Edit|Write)$/i.test(name) && arg ? arg : undefined),
        status,
        ...(e.output != null ? { output: String(e.output) } : {}),
      };
      const prevIdx = indexByKey.get(key);
      if (prevIdx != null) {
        const prev = out[prevIdx];
        const mergedStatus: StreamAgentEvent["status"] =
          prev.status === "fail" || next.status === "fail"
            ? "fail"
            : prev.status === "ok" || next.status === "ok"
              ? "ok"
              : "running";
        out[prevIdx] = {
          ...prev,
          ...next,
          status: mergedStatus,
          output: next.output ?? prev.output,
          path: next.path || prev.path,
        };
        continue;
      }
      indexByKey.set(key, out.length);
      out.push(next);
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

/** 与 Host `looksLikeUpsell` 对齐：未请求的下一步 / P2 推销 */
export function looksLikeUpsellLine(line: string): boolean {
  return /下一步|后续可|建议继续|还可以做|未完成任务|Remaining|next\s*steps?|P2\s*[:：]|待办\s*P2/i.test(
    String(line || ""),
  );
}

/** 写盘后百科/接入点推销（≠ 用户要的方案正文） */
export function looksLikeWriteCloseChatter(text: string): boolean {
  return /接入点|改动清单|是否需你接入|需要你确认|未验证声明|TODO\s*\(\s*接入点\s*\)|要继续推进|待你确认|【工作区已写入】|已完成\s*\d+\s*处改动/i.test(
    String(text || ""),
  );
}

/**
 * 给用户看的答案/方案（应外露，勿整段塞进 Thought briefly）。
 * 过程可折；最终回复默认展开。
 * 写盘收尾推销不算「用户方案」。
 */
export function looksLikeUserFacingAnswer(text: string): boolean {
  const body = stripStreamEventsBlock(text).trim();
  if (!body || body.length < 48) return false;
  if (agentExecReportScore(body) >= 3) return false;
  if (looksLikeWriteCloseChatter(body)) return false;
  if (
    /优化方案|优先做|建议先|可观测|工程化|遗留|生产可观测|给我.*方案/i.test(
      body,
    )
  ) {
    return true;
  }
  // 带标题或较长编号方案，且不是读盘流水 / 下一步推销
  if (/^#{1,3}\s+\S+/m.test(body) && body.length > 120 && !looksLikeUpsellLine(body)) {
    return true;
  }
  if (
    /\n\s*\d+\.\s+\S+/m.test(body) &&
    body.length > 200 &&
    !/^读盘[：:]/m.test(body) &&
    !/^路径[：:]/m.test(body) &&
    !looksLikeUpsellLine(body)
  ) {
    return true;
  }
  return false;
}

/** Thought 折叠正文上限：过程已在 Explored/Edit/Bash，避免百科式占屏 */
const THOUGHT_FOLD_MAX_LINES = 8;
const THOUGHT_FOLD_MAX_CHARS = 1000;

function capThoughtForFold(body: string): string {
  const t = String(body || "").trim();
  if (!t) return "";
  const lines = t.split("\n").filter((l) => l.trim());
  if (lines.length <= THOUGHT_FOLD_MAX_LINES && t.length <= THOUGHT_FOLD_MAX_CHARS) {
    return t;
  }
  return (
    lines.slice(0, THOUGHT_FOLD_MAX_LINES).join("\n").slice(0, THOUGHT_FOLD_MAX_CHARS) + "\n…"
  );
}

/** 从 Thought 正文去掉已升格为过程行的段落，避免百科式重复 */
function slimThoughtBody(body: string): string {
  let t = stripForceContinueMarkers(stripDsmlToolMarkup(String(body || "")).text);
  // 剥执行元信息（整行或行内脚注）
  t = t.replace(/^\(执行:[^)]+\)\s*$/gm, "");
  t = t.replace(/\s*\(执行:\s*Claude CLI[^)]*\)\s*/gi, " ");
  t = t.replace(/\s*·\s*acceptEdits\b/gi, "");
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

/** 去掉与 Cursor 收尾不符的过程复述：接入待办表、落盘清单、「已完成 N 处改动」、下一步推销。文件行由 Edit 卡展示。 */
export function stripCursorUnlikeWriteNarration(text: string): string {
  const lines = String(text || "").split("\n");
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const t = line.trim();
    if (/^\|/.test(t) && /是否需你接入/.test(line)) {
      while (i < lines.length && /^\|/.test((lines[i] ?? "").trim())) i++;
      i -= 1;
      continue;
    }
    if (/^#{1,6}\s+.*(改动清单|接入点|未验证声明|下一步|后续)/.test(t)) {
      break;
    }
    if (/^已完成\s*\d+\s*处改动。?\s*$/.test(t)) continue;
    if (/^(要继续推进|需要你确认|待你确认|下一步|后续可|建议继续)/.test(t)) {
      break;
    }
    if (looksLikeUpsellLine(t)) continue;
    if (/要不要我|是否现在落盘|等你确认|请确认后|可以开始吗|开始改吗/.test(t)) {
      break;
    }
    kept.push(line);
  }
  return kept
    .join("\n")
    .replace(/\n*【工作区已写入】[\s\S]*$/u, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Cursor 执行反馈收尾：外露 1～3 句自然语言；余下过程进 Thought。
 * 模板：Explored/Edit/Bash（streamEvents）→ Thought briefly → 短收尾。
 */
export function takeCursorExecCloseProse(
  text: string,
  opts?: { maxSentences?: number; maxChars?: number },
): string {
  const maxSentences = opts?.maxSentences ?? 3;
  const maxChars = opts?.maxChars ?? 320;
  const cleaned = stripCursorUnlikeWriteNarration(text)
    .split("\n")
    .filter((l) => {
      const s = l.trim();
      if (!s) return false;
      if (/^⋯\s+\S+/.test(s)) return false;
      if (/^#{1,6}\s+/.test(s)) return false;
      if (looksLikeUpsellLine(s)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) return "";
  const parts = cleaned
    .split(/(?<=[。！？])\s*|(?<=[.!?])\s+|\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !looksLikeUpsellLine(p));
  if (!parts.length) return cleaned.slice(0, maxChars).trim();
  const kept: string[] = [];
  let len = 0;
  for (const p of parts) {
    if (kept.length >= maxSentences) break;
    if (len + p.length > maxChars && kept.length > 0) break;
    kept.push(p);
    len += p.length;
  }
  const joiner = kept.some((k) => /[。！？]$/.test(k)) ? "" : " ";
  return kept.join(joiner).trim();
}

/** 有实写时套 Cursor 执行反馈：长过程进 Thought，外露短收尾。 */
export function applyCursorExecFeedbackTemplate(
  body: string,
  summary: string,
): string {
  const close =
    takeCursorExecCloseProse(body) ||
    summary ||
    "";
  const thoughtRaw = slimThoughtBody(stripCursorUnlikeWriteNarration(body)) || "";
  const thoughtSrc = capThoughtForFold(thoughtRaw);
  const needsFold =
    Boolean(thoughtSrc) &&
    (thoughtRaw.length > close.length + 60 ||
      thoughtRaw.split("\n").filter((l) => l.trim()).length > 4 ||
      looksLikeWriteCloseChatter(body) ||
      looksLikeUpsellLine(body));
  if (needsFold && thoughtSrc && thoughtSrc !== close) {
    return close
      ? `<thinking>\n${thoughtSrc}\n</thinking>\n\n${close}`.trim()
      : `<thinking>\n${thoughtSrc}\n</thinking>`.trim();
  }
  return close || thoughtSrc || summary || "";
}

/** 可选短摘要（写入 agentTurn.summary）。写盘本身不复述，只留测试结果。 */
export function buildShortAgentSummary(
  _writtenPaths?: string[],
  verified?: boolean,
  proseHint?: string,
): string {
  const pass = String(proseHint || "").match(/(\d+)\s+passed/i)?.[1];
  if (verified || pass) return pass ? `测试 ${pass} passed。` : "测试已通过。";
  return "";
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
  let body = stripCursorUnlikeWriteNarration(body0);
  body = body.replace(/^\(执行:[^)]+\)\s*$/gm, "").trim();
  body = body.replace(/\s*\(执行:\s*Claude CLI[^)]*\)\s*/gi, " ").trim();
  body = body.replace(/\s*·\s*acceptEdits\b/gi, "").trim();
  // 剥泄漏工具后的可读正文
  body = slimThoughtBody(body) || body;

  const hasWrites = writtenUnique.length > 0;
  // 有实写时不把百科收尾当「用户方案」
  const userAnswer = !hasWrites && looksLikeUserFacingAnswer(body);
  const looksLikeReport = looksLikeAgentTurnReport(body0) && !userAnswer;
  const summary =
    (opts.summary && !/已完成\s*\d+\s*处改动/.test(opts.summary) ? opts.summary : "") ||
    buildShortAgentSummary(writtenUnique, opts.verified || Boolean(pass), body0) ||
    (pass ? `测试 ${pass} passed。` : "");

  /**
   * Cursor 执行反馈模板：
   * - 有实写 → Explored/Edit/Bash + Thought briefly + 1～3 句收尾（禁下一步推销）
   * - 用户答案/方案（无写盘）→ 外露 Markdown
   * - 执行流水账 → Thought 可折 + 短收尾
   * - 仅有工具轨、正文空 → 不合成伪结论
   */
  if (hasWrites) {
    body = applyCursorExecFeedbackTemplate(body || body0, summary);
  } else if (userAnswer) {
    if (summary && !body.includes(summary)) {
      body = `${body}\n\n${summary}`.trim();
    }
  } else if (looksLikeReport && (toolCount > 0 || summary)) {
    const thought = body;
    const tail = summary || (pass ? `测试 ${pass} passed。` : "");
    if (thought.length > 500) {
      body = thought;
    } else if (thought) {
      body = tail
        ? `<thinking>\n${thought}\n</thinking>\n\n${tail}`.trim()
        : `<thinking>\n${thought}\n</thinking>`.trim();
    } else {
      body = tail;
    }
  } else if (!body.trim()) {
    body = summary || "";
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
