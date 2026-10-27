import type { DesktopApi } from "@/types/desktop";
import type { AgentFilePatch } from "@/lib/agent-file-patch";
import { normalizeWritePatches } from "@/lib/agent-file-patch";
import { stashWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";

/** 是否为 active-chain / 任务链顶层结构（与写文件 JSON 区分） */
function looksLikeActiveChainJson(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const steps = (obj as { steps?: unknown }).steps;
  if (!Array.isArray(steps) || steps.length === 0) return false;
  const first = steps[0];
  if (!first || typeof first !== "object") return false;
  return "agentName" in (first as object) || "instruction" in (first as object);
}

/**
 * Cursor 写盘契约：须显式 `path` + `content`|`contents`。
 * 禁止用 file/filePath 别名猜字段；禁止缺 path 时发明路径。
 */
function normalizeWorkspaceWriteItem(item: unknown): { path: string; content: string } | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (typeof o.path !== "string") return null;
  const p = o.path.trim();
  if (!p || p.includes("..")) return null;
  const contentRaw = o.content != null ? o.content : o.contents != null ? o.contents : null;
  if (contentRaw == null) return null;
  return { path: p.replace(/\\/g, "/"), content: String(contentRaw) };
}

/**
 * 从气泡提取可落盘项：仅 ```workspace-write``` JSON（显式 path + content|contents）。
 * 与 server ingest 同契约；禁止 ```json / 裸 JSON / 代码块猜路径。
 */
export function parseWorkspaceWriteItemsFromBubble(
  text: string,
): { path: string; content: string }[] {
  if (!text || typeof text !== "string") return [];
  const map = new Map<string, string>();

  for (const item of parseWorkspaceWriteFences(text)) {
    if (looksLikeActiveChainJson(item)) continue;
    const n = normalizeWorkspaceWriteItem(item);
    if (n) map.set(n.path, n.content);
  }

  return Array.from(map.entries()).map(([path, content]) => ({ path, content }));
}

/** `content` 内常见 Markdown 代码块含 ```；非贪婪正则会在第一个 ``` 处截断导致 JSON.parse 失败，故用括号+字符串状态机找整条 JSON。 */
function findTopLevelJsonEnd(s: string, start: number): number {
  let i = start;
  while (i < s.length && /\s/.test(s[i])) i++;
  const c0 = s[i];
  if (c0 !== "{" && c0 !== "[") return -1;

  let depth = 0;
  let inStr = false;
  let esc = false;

  for (; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') {
        inStr = false;
        continue;
      }
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

const WORKSPACE_WRITE_FENCE_OPEN = /(?:```|''')\s*`?\s*workspace-write\s*`?\s*\n?/gi;

/**
 * 在已打开的 ``` 围栏内找闭合 ```（支持 content 内嵌套 ```lang … ```）。
 * 若模型未闭合又开下一个 ```workspace-write，则在该处结束当前块（不消耗开标签）。
 * @returns {{ index: number; consumeClose: boolean } | null}
 */
function findBalancedTripleFenceClose(
  text: string,
  bodyStart: number,
): { index: number; consumeClose: boolean } | null {
  let depth = 1;
  let pos = bodyStart;
  while (pos < text.length) {
    const idx = text.indexOf("```", pos);
    if (idx === -1) return null;
    const after = text.slice(idx + 3);
    const openLang = after.match(/^([a-zA-Z0-9_+-]*)\r?\n/);
    const lang = openLang ? openLang[1] : "";
    if (lang && /^workspace-write$/i.test(lang)) {
      // 同层又开了 workspace-write → 上一块缺少闭合围栏
      if (depth === 1) return { index: idx, consumeClose: false };
      depth -= 1;
      if (depth === 0) return { index: idx, consumeClose: false };
      pos = idx + 3;
      continue;
    }
    if (lang) {
      depth += 1;
      pos = idx + 3;
      continue;
    }
    depth -= 1;
    if (depth === 0) return { index: idx, consumeClose: true };
    pos = idx + 3;
  }
  return null;
}

/**
 * JSON.parse 失败时，仅把字符串字面量内的裸换行转义后再解析。
 * 这是合法 JSON 修复，不是路径/字段兜底；解析仍失败则丢弃该块。
 */
function parseJsonAllowingRawNewlines(chunk: string): unknown | null {
  try {
    return JSON.parse(chunk);
  } catch {
    /* */
  }
  let out = "";
  let inStr = false;
  let esc = false;
  for (const c of chunk) {
    if (!inStr) {
      if (c === '"') inStr = true;
      out += c;
      continue;
    }
    if (esc) {
      out += c;
      esc = false;
      continue;
    }
    if (c === "\\") {
      out += c;
      esc = true;
      continue;
    }
    if (c === '"') {
      inStr = false;
      out += c;
      continue;
    }
    if (c === "\n") {
      out += "\\n";
      continue;
    }
    if (c === "\r") continue;
    out += c;
  }
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

/**
 * 每个 workspace-write 围栏：整段起止下标（含围栏）+ JSON 文本。
 * Cursor 契约：仅接受 JSON `{"path","content"|"contents"}`（与 server/workspace-write.cjs 同序：先 JSON 状态机，再认闭合围栏，避免 content 内 ``` 误截断）。
 * YAML `path:/content:`、裸 Markdown、缺 path → 不产出可写项（硬失败，不猜路径、不硬编码 docs/*.md）；仍记起止以便剥离。
 */
function findWorkspaceWriteBlocks(
  text: string,
): { outerStart: number; outerEnd: number; json?: string }[] {
  const blocks: { outerStart: number; outerEnd: number; json?: string }[] = [];
  const openRe = new RegExp(WORKSPACE_WRITE_FENCE_OPEN.source, "gi");
  let searchFrom = 0;
  let m: RegExpExecArray | null;

  const stripOnlyEnd = (bodyStart: number, fallbackFrom: number): number => {
    const closed = findBalancedTripleFenceClose(text, bodyStart);
    if (!closed) return text.length;
    return closed.consumeClose ? closed.index + 3 : closed.index;
  };

  while (true) {
    openRe.lastIndex = searchFrom;
    m = openRe.exec(text);
    if (!m) break;
    const outerStart = m.index;
    const bodyStart = m.index + m[0].length;
    const peek = text.slice(bodyStart, bodyStart + 96);

    // 禁止 YAML 伪结构：跳过可写解析，仅剥离围栏
    if (/^\s*(?:path|file|filePath)\s*:/i.test(peek) && !/^\s*[{\[]/.test(peek)) {
      const outerEnd = stripOnlyEnd(bodyStart, m.index + m[0].length);
      blocks.push({ outerStart, outerEnd });
      searchFrom = Math.max(outerEnd, m.index + m[0].length);
      continue;
    }

    const relJson = text.slice(bodyStart).search(/[{\[]/);
    if (relJson === -1 || !/^\s*[{\[]/.test(text.slice(bodyStart))) {
      const outerEnd = stripOnlyEnd(bodyStart, m.index + m[0].length);
      blocks.push({ outerStart, outerEnd });
      searchFrom = Math.max(outerEnd, m.index + m[0].length);
      continue;
    }

    const absJsonStart = bodyStart + relJson;
    const jsonEnd = findTopLevelJsonEnd(text, absJsonStart);
    if (jsonEnd === -1) {
      const outerEnd = stripOnlyEnd(bodyStart, m.index + m[0].length);
      blocks.push({ outerStart, outerEnd });
      searchFrom = Math.max(outerEnd, m.index + m[0].length);
      continue;
    }

    let outerEnd = jsonEnd;
    while (outerEnd < text.length && /\s/.test(text[outerEnd]!)) outerEnd++;
    const closeFence = text.slice(outerEnd).match(/^(?:```|''')/);
    if (closeFence) outerEnd += closeFence[0].length;
    blocks.push({
      outerStart,
      outerEnd,
      json: text.slice(absJsonStart, jsonEnd).trim(),
    });
    searchFrom = outerEnd;
  }
  return blocks;
}

export function parseWorkspaceWriteFences(text: string): unknown[] {
  if (!text || typeof text !== "string") return [];
  const blocks = findWorkspaceWriteBlocks(text);
  const out: unknown[] = [];
  for (const block of blocks) {
    const chunk = block.json;
    if (!chunk) continue;
    const parsed = parseJsonAllowingRawNewlines(chunk);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === "object") out.push(item);
      }
    } else if (parsed && typeof parsed === "object") {
      out.push(parsed);
    }
  }
  return out;
}

/** 去掉 workspace-write 整块（含围栏），避免聊天记录刷屏 */
export function stripWorkspaceWriteFencesForHistory(text: string): string {
  const blocks = findWorkspaceWriteBlocks(text);
  if (!blocks.length) return text;
  let out = text;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const { outerStart, outerEnd } = blocks[i];
    out = out.slice(0, outerStart) + out.slice(outerEnd);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function normWorkspaceRelPath(p: string): string {
  return String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

/**
 * 用户 Accept 单个 path 后：从助手正文移除对应 workspace-write 围栏，并合并「【工作区已写入】」摘要。
 * 同围栏内其它 path 保留为待审。
 */
export function collapseAcceptedWorkspaceWriteForHistory(
  fullText: string,
  writtenPath: string,
): string {
  const target = normWorkspaceRelPath(writtenPath);
  if (!fullText || !target) return fullText;

  const blocks = findWorkspaceWriteBlocks(fullText);
  let out = fullText;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const { outerStart, outerEnd, json } = blocks[i]!;
    if (!json) continue;
    let items: unknown[] = [];
    try {
      const parsed = JSON.parse(json) as unknown;
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      continue;
    }
    const remaining: unknown[] = [];
    let removed = false;
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const p = normWorkspaceRelPath(String((it as { path?: string }).path || ""));
      if (p && p === target) {
        removed = true;
        continue;
      }
      remaining.push(it);
    }
    if (!removed) continue;
    if (remaining.length === 0) {
      out = out.slice(0, outerStart) + out.slice(outerEnd);
    } else {
      const payload = remaining.length === 1 ? remaining[0] : remaining;
      const fence = "```workspace-write\n" + JSON.stringify(payload, null, 2) + "\n```";
      out = out.slice(0, outerStart) + fence + out.slice(outerEnd);
    }
  }

  // 同步去掉命中该路径的 ```diff``` 块（侧栏 Accept / 全部接受共用）
  out = out.replace(/```diff\s*\n([\s\S]*?)```/gi, (block, body: string) => {
    const hit =
      body.includes(`/${target}`) ||
      body.includes(`a/${target}`) ||
      body.includes(`b/${target}`) ||
      body.includes(target) ||
      new RegExp(`(?:---|\\+\\+\\+)\\s+(?:[ab]/)?${escapeRegExp(target)}\\b`).test(body);
    return hit ? "" : block;
  });

  out = out.replace(/\n{3,}/g, "\n\n").trim();

  const existing = new Set<string>();
  const summaryRe = /【工作区已写入】[^\n]*\n((?:- `[^`\n]+`\n?)+)/g;
  let sm: RegExpExecArray | null;
  while ((sm = summaryRe.exec(out)) !== null) {
    for (const raw of sm[1].match(/- `([^`\n]+)`/g) ?? []) {
      const p = normWorkspaceRelPath(raw.replace(/^- `|`$/g, ""));
      if (p) existing.add(p);
    }
  }
  existing.add(target);
  out = out
    .replace(/\n*【工作区已写入】[^\n]*\n(?:- `[^`\n]+`\n?)+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const list = [...existing].map((p) => `- \`${p}\``).join("\n");
  const summary = `【工作区已写入】共 ${existing.size} 个文件：\n${list}`;
  return out ? `${out}\n\n${summary}` : summary;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 去掉长代码块，保留短片段（默认 ≤8 行）；防止整文件刷屏 */
export function stripRedundantCodeBlocks(text: string, maxLines = 8): string {
  if (!text) return text;
  let out = text;
  const re = /```[\w.+-]*\s*\n([\s\S]*?)```/gi;
  const removals: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1] || "";
    const lineCount = inner.split("\n").length;
    // workspace-write 由专用剥离处理；此处去掉整文件/大段源码围栏
    if (lineCount > maxLines || inner.length > 1200) {
      removals.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  for (let i = removals.length - 1; i >= 0; i--) {
    const { start, end } = removals[i]!;
    out = out.slice(0, start) + out.slice(end);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * 已成功写入磁盘后，将助手回复折叠为简短说明，禁止把转义后的巨型 JSON 留在聊天历史。
 * 同时移除冗余代码块（文件内容已在 workspace-write fence 中写入），避免全量代码块刷屏。
 */
export function collapseWorkspaceWriteForHistory(fullText: string, writtenPaths: string[]): string {
  if (!writtenPaths.length) return fullText;
  let stripped = fullText.replace(/\n*【工作区已写入】[\s\S]*$/u, "").trim();
  stripped = stripped.replace(/\n*【未落盘】[\s\S]*$/u, "").trim();
  stripped = stripWorkspaceWriteFencesForHistory(stripped);
  stripped = stripRedundantCodeBlocks(stripped);
  const list = writtenPaths.map((p) => `- \`${p}\``).join("\n");
  const summary = `【工作区已写入】共 ${writtenPaths.length} 个文件：\n${list}`;
  if (stripped.length > 0) {
    return `${stripped}\n\n${summary}`;
  }
  return summary;
}

/**
 * 去掉气泡中所有可解析的写盘载荷（仅 ```workspace-write``` JSON），
 * 供只读回合使用，避免 UI 再渲染成文件卡片。
 */
export function stripAllWorkspaceWritePayloads(text: string): string {
  if (!text) return text;
  return stripWorkspaceWriteFencesForHistory(text).replace(/\n{3,}/g, "\n\n").trim();
}

export type IngestWorkspaceWriteResult = {
  text: string;
  parsed: number;
  written: string[];
  failed: string[];
  patches?: AgentFilePatch[];
  error?: string;
};

/**
 * 单聊回复后处理（Cursor 对齐）：
 * - 仅当显式 allowApply:true 时自动落盘（调用方必须传回合策略）
 * - 未传 allowApply 时默认不写，避免 Ask/问答误落盘
 * - 失败不吞掉：返回 error，由调用方硬失败（禁止静默当成功）
 */
export async function ingestWorkspaceWritesAndCollapseDisplay(
  desktop: DesktopApi,
  assistantText: string,
  onToast?: (msg: string) => void,
  meta?: { agentStem?: string; allowApply?: boolean },
): Promise<string> {
  const r = await ingestWorkspaceWritesDetailed(desktop, assistantText, onToast, meta);
  return r.text;
}

/** 带解析/落盘明细的 ingest（写盘硬闭环用） */
export async function ingestWorkspaceWritesDetailed(
  desktop: DesktopApi,
  assistantText: string,
  onToast?: (msg: string) => void,
  meta?: { agentStem?: string; allowApply?: boolean },
): Promise<IngestWorkspaceWriteResult> {
  const allowApply = meta?.allowApply === true;
  if (!allowApply) {
    return { text: assistantText, parsed: 0, written: [], failed: [] };
  }
  const items = parseWorkspaceWriteItemsFromBubble(assistantText);
  if (!items.length) {
    return { text: assistantText, parsed: 0, written: [], failed: [] };
  }
  if (!desktop.workspaceApplyWriteFence) {
    return {
      text: assistantText,
      parsed: items.length,
      written: [],
      failed: items.map((i) => i.path),
      error: "当前无法写入工作区（workspaceApplyWriteFence 不可用）",
    };
  }
  try {
    const res = await desktop.workspaceApplyWriteFence(items);
    const written = res?.written ?? [];
    const patches = normalizeWritePatches(
      (res as { patches?: unknown })?.patches,
    );
    for (const p of patches) {
      if (p.before !== undefined) stashWorkspaceWriteCheckpoint(p.path, p.before);
    }
    const failedFromApi = Array.isArray(res?.errors)
      ? res.errors.map((e) => String(e)).filter(Boolean)
      : [];
    const writtenSet = new Set(written.map((p) => p.replace(/\\/g, "/")));
    const failedPaths = items
      .map((i) => i.path.replace(/\\/g, "/"))
      .filter((p) => !writtenSet.has(p));
    if (written.length) {
      // 成功不 toast（对齐 Cursor：以 Diff 卡为准）；失败由 error 字段上报
      void onToast;
      return {
        text: collapseWorkspaceWriteForHistory(assistantText, written),
        parsed: items.length,
        written,
        failed: failedPaths.length ? failedPaths : failedFromApi,
        patches:
          patches.length > 0
            ? patches
            : items
                .filter((i) => writtenSet.has(i.path.replace(/\\/g, "/")))
                .map((i) => ({
                  path: i.path.replace(/\\/g, "/"),
                  after: i.content,
                  isNewFile: true,
                })),
        error:
          failedPaths.length || res?.error
            ? String(res?.error || `部分文件未写入：${failedPaths.slice(0, 5).join(", ")}`)
            : undefined,
      };
    }
    return {
      text: assistantText,
      parsed: items.length,
      written: [],
      failed: items.map((i) => i.path),
      error: String(res?.error || failedFromApi[0] || "写盘请求完成但未写入任何路径"),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      text: assistantText,
      parsed: items.length,
      written: [],
      failed: items.map((i) => i.path),
      error: msg,
    };
  }
}

/**
 * 任务链/WBS 每步：仅当回合策略允许自动落盘时写盘（对齐 Cursor）。
 * 优先 meta.allowAutoApply / displayLine→resolveTurnPolicy；禁止「仅 Agent 底栏就当可写」。
 * 仅合法 ```workspace-write``` JSON；无围栏不猜路径。
 */
export async function ingestChainStepWorkspaceWrites(
  desktop: DesktopApi,
  assistantText: string,
  meta: {
    agentName: string;
    taskId?: string;
    /** 用户/任务原文，用于言语行为闸门 */
    displayLine?: string;
    /** 显式覆盖：true=可自动落盘；false=禁止 */
    allowAutoApply?: boolean;
  },
  onToast?: (msg: string) => void,
): Promise<{ displayText: string; writtenPaths: string[]; error?: string }> {
  const {
    shouldAutoApplyWorkspaceWritesForTurn,
    getWorkbenchInteractionMode,
  } = await import("@/lib/workbench-interaction-mode");
  const { resolveTurnPolicy } = await import("@/lib/turn-policy");
  let allowAutoApply = meta.allowAutoApply;
  if (typeof allowAutoApply !== "boolean") {
    const interactionMode = getWorkbenchInteractionMode();
    const line = String(meta.displayLine || "").trim();
    if (line) {
      allowAutoApply = resolveTurnPolicy({
        displayLine: line,
        interactionMode,
        isGeneralTurn: true,
      }).autoApplyWrites;
    } else {
      // 无言语行为上下文：禁止仅凭 Agent 底栏自动落盘
      allowAutoApply = false;
    }
  }
  if (
    !shouldAutoApplyWorkspaceWritesForTurn({
      allowAutoApply,
    })
  ) {
    return { displayText: assistantText, writtenPaths: [] };
  }
  const items = parseWorkspaceWriteItemsFromBubble(assistantText);
  if (!items.length) {
    return {
      displayText: assistantText,
      writtenPaths: [],
      error:
        "未找到合法 ```workspace-write``` JSON（须显式 path+content|contents）；已禁止猜路径兜底",
    };
  }
  if (!desktop.workspaceApplyWriteFence) {
    return {
      displayText: assistantText,
      writtenPaths: [],
      error: "当前无法写入工作区",
    };
  }
  try {
    const res = await desktop.workspaceApplyWriteFence(items);
    const written = res?.written ?? [];
    if (written.length) {
      onToast?.(
        `已写入 ${written.length} 个文件 · 可在侧栏「改动」查看 Git Diff`,
      );
      return {
        displayText: collapseWorkspaceWriteForHistory(assistantText, written),
        writtenPaths: written,
      };
    }
    return {
      displayText: assistantText,
      writtenPaths: [],
      error: String(res?.error || "写盘请求完成但未写入任何路径"),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { displayText: assistantText, writtenPaths: [], error: msg };
  }
}

/** 用户在卡片上接受时：写入指定 path/content（或从气泡全文解析后按 path 过滤） */
export async function applyPendingWorkspaceWrite(
  desktop: DesktopApi,
  item: { path: string; content: string },
  onToast?: (msg: string) => void,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const path = String(item.path || "")
    .trim()
    .replace(/\\/g, "/");
  const content = item.content != null ? String(item.content) : "";
  if (!path) return { ok: false, error: "路径无效" };
  if (!desktop.workspaceApplyWriteFence) {
    return { ok: false, error: "当前无法写入工作区" };
  }
  try {
    const res = await desktop.workspaceApplyWriteFence([{ path, content }]);
    if (res?.written?.length) {
      return { ok: true, path: res.written[0] };
    }
    const err =
      res?.error ||
      (res?.errors?.length ? res.errors.slice(0, 2).join("; ") : "") ||
      "未写入任何路径";
    return { ok: false, error: err };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * 去掉助手气泡里整文件代码块 / 大 JSON / 工具复述，避免刷屏。
 * 短命令示例（≤8 行且 <1200 字）保留。
 */
export function stripLargeAssistantArtifacts(text: string, maxInnerLen = 1200): string {
  if (!text || typeof text !== "string") return text;
  // 保护工具轨迹与 stream-events，勿被后续清理误伤
  const BEGIN = "<<<stream-events>>>";
  const END = "<<<end-stream-events>>>";
  let eventsHold = "";
  let out = text;
  if (out.includes(BEGIN) && out.includes(END)) {
    const start = out.indexOf(BEGIN);
    const end = out.indexOf(END, start + BEGIN.length);
    if (start >= 0 && end >= 0) {
      eventsHold = out.slice(start, end + END.length);
      out = `${out.slice(0, start)}\n__STREAM_EVENTS_HOLD__\n${out.slice(end + END.length)}`;
    }
  }
  out = stripRedundantCodeBlocks(out, 8);
  const fenceRe = /```[\w.+-]*\s*\n([\s\S]*?)```/gi;
  const removals: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(out)) !== null) {
    const inner = m[1].trim();
    if (inner.length < maxInnerLen) continue;
    removals.push({ start: m.index, end: m.index + m[0].length });
  }
  for (let i = removals.length - 1; i >= 0; i--) {
    const { start, end } = removals[i]!;
    out = out.slice(0, start) + out.slice(end);
  }
  // 去掉推销「下一步/P2」与征求确认行（保留 ⋯ 工具轨迹与 stream-events）
  const strippedLines: string[] = [];
  for (const line of out.split("\n")) {
    const t = line.trim();
    if (/^⋯\s+\S+/.test(t) || t === "__STREAM_EVENTS_HOLD__") {
      strippedLines.push(line);
      continue;
    }
    if (/^#{1,6}\s+.*(接入点|改动清单|未验证声明|下一步|后续)/.test(t)) break;
    if (/^(要继续推进|需要你确认|待你确认|下一步|后续可|建议继续)/.test(t)) break;
    if (/下一步|后续可|建议继续|还可以做|P2\s*[:：]|next\s*steps?/i.test(line)) continue;
    strippedLines.push(line);
  }
  out = strippedLines.join("\n");
  if (eventsHold) {
    out = out.replace("__STREAM_EVENTS_HOLD__", eventsHold);
  }
  const collapsed = out.replace(/\n{3,}/g, "\n\n").trim();
  const meaningful = collapsed.replace(/[\s\-·=`]/gu, "");
  if (meaningful.length < 8 && text.trim().length > meaningful.length + 30) {
    return stripRedundantCodeBlocks(text, 8);
  }
  return collapsed;
}
