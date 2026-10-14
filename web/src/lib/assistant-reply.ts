import type { DesktopApi } from "@/types/desktop";

/** 是否为 active-chain / 任务链顶层结构（与写文件 JSON 区分） */
function looksLikeActiveChainJson(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const steps = (obj as { steps?: unknown }).steps;
  if (!Array.isArray(steps) || steps.length === 0) return false;
  const first = steps[0];
  if (!first || typeof first !== "object") return false;
  return "agentName" in (first as object) || "instruction" in (first as object);
}

function normalizeWorkspaceWriteItem(item: unknown): { path: string; content: string } | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const rel =
    typeof o.path === "string"
      ? o.path
      : typeof o.file === "string"
        ? o.file
        : typeof o.filePath === "string"
          ? o.filePath
          : "";
  const p = rel.trim();
  if (!p) return null;
  const content = o.content != null ? String(o.content) : "";
  return { path: p.replace(/\\/g, "/"), content };
}

/**
 * 从气泡全文提取 `{ path, content }[]`（支持 ```workspace-write、```json 包住的数组/单对象，以及裸 JSON）。
 * 用于右键「从本条生成…」在模型只给出写文件结构时也能落盘。
 */
export function parseWorkspaceWriteItemsFromBubble(
  text: string,
): { path: string; content: string }[] {
  if (!text || typeof text !== "string") return [];
  const map = new Map<string, string>();

  function absorbParsed(parsed: unknown) {
    if (looksLikeActiveChainJson(parsed)) return;
    if (Array.isArray(parsed)) {
      for (const el of parsed) {
        const n = normalizeWorkspaceWriteItem(el);
        if (n) map.set(n.path, n.content);
      }
      return;
    }
    const one = normalizeWorkspaceWriteItem(parsed);
    if (one) map.set(one.path, one.content);
  }

  for (const item of parseWorkspaceWriteFences(text)) {
    const n = normalizeWorkspaceWriteItem(item);
    if (n) map.set(n.path, n.content);
  }

  const fenceRe = /```(?:json)\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    const chunk = m[1].trim();
    if (!chunk) continue;
    try {
      absorbParsed(JSON.parse(chunk));
    } catch {
      /* ignore */
    }
  }

  const t = text.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      absorbParsed(JSON.parse(t));
    } catch {
      /* ignore */
    }
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
 * 每个 workspace-write 围栏：整段起止下标（含围栏），供剥离气泡；JSON 正文起止供解析。
 */
function findWorkspaceWriteBlocks(
  text: string,
): { outerStart: number; outerEnd: number; json: string }[] {
  const blocks: { outerStart: number; outerEnd: number; json: string }[] = [];
  const openRe = new RegExp(WORKSPACE_WRITE_FENCE_OPEN.source, "gi");
  let searchFrom = 0;
  let m: RegExpExecArray | null;
  while (true) {
    openRe.lastIndex = searchFrom;
    m = openRe.exec(text);
    if (!m) break;
    const outerStart = m.index;
    const bodyStart = m.index + m[0].length;
    const relJson = text.slice(bodyStart).search(/\{|\[/);
    if (relJson === -1) {
      searchFrom = m.index + 1;
      continue;
    }
    const absJsonStart = bodyStart + relJson;
    const jsonEnd = findTopLevelJsonEnd(text, absJsonStart);
    if (jsonEnd === -1) {
      searchFrom = m.index + 1;
      continue;
    }
    let outerEnd = jsonEnd;
    while (outerEnd < text.length && /\s/.test(text[outerEnd])) outerEnd++;
    const tail = text.slice(outerEnd);
    const closeFence = tail.match(/^(?:```|''')/);
    if (closeFence) outerEnd += closeFence[0].length;

    const json = text.slice(absJsonStart, jsonEnd).trim();
    blocks.push({ outerStart, outerEnd, json });
    searchFrom = outerEnd;
  }
  return blocks;
}

export function parseWorkspaceWriteFences(text: string): unknown[] {
  if (!text || typeof text !== "string") return [];
  const blocks = findWorkspaceWriteBlocks(text);
  const out: unknown[] = [];
  for (const { json: chunk } of blocks) {
    try {
      const parsed = JSON.parse(chunk);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") out.push(item);
        }
      } else if (parsed && typeof parsed === "object") {
        out.push(parsed);
      }
    } catch {
      /* invalid JSON */
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
 * 去掉气泡中所有可解析的写盘载荷（workspace-write / ```json path+content），
 * 供只读回合使用，避免 UI 再渲染成文件卡片。
 */
export function stripAllWorkspaceWritePayloads(text: string): string {
  if (!text) return text;
  let out = stripWorkspaceWriteFencesForHistory(text);
  // 再剥 ```json 中可解析为写盘项的块（下标相对当前 out）
  const fenceRe = /```(?:json)\s*([\s\S]*?)```/gi;
  const removals: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(out)) !== null) {
    const chunk = (m[1] || "").trim();
    if (!chunk) continue;
    try {
      const items = parseWorkspaceWriteItemsFromBubble(
        "```json\n" + chunk + "\n```",
      );
      if (items.length) {
        removals.push({ start: m.index, end: m.index + m[0].length });
      }
    } catch {
      /* ignore */
    }
  }
  for (let i = removals.length - 1; i >= 0; i--) {
    const { start, end } = removals[i]!;
    out = out.slice(0, start) + out.slice(end);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * 单聊回复后处理（Cursor 对齐）：
 * - 仅当显式 allowApply:true 时自动落盘（调用方必须传回合策略）
 * - 未传 allowApply 时默认不写，避免 Ask/问答误落盘
 */
export async function ingestWorkspaceWritesAndCollapseDisplay(
  desktop: DesktopApi,
  assistantText: string,
  onToast?: (msg: string) => void,
  meta?: { agentStem?: string; allowApply?: boolean },
): Promise<string> {
  const allowApply = meta?.allowApply === true;
  if (!allowApply) return assistantText;
  const items = parseWorkspaceWriteItemsFromBubble(assistantText);
  if (!items.length) return assistantText;
  if (!desktop.workspaceApplyWriteFence) return assistantText;
  try {
    const res = await desktop.workspaceApplyWriteFence(items);
    const written = res?.written ?? [];
    if (written.length) {
      onToast?.(
        `已写入 ${written.length} 个文件 · 可在侧栏「改动」查看 Git Diff`,
      );
      return collapseWorkspaceWriteForHistory(assistantText, written);
    }
  } catch {
    /* keep bubble */
  }
  return assistantText;
}

/**
 * 任务链/WBS 每步：Agent 模式自动写盘；Plan 保留待审。
 */
export async function ingestChainStepWorkspaceWrites(
  desktop: DesktopApi,
  assistantText: string,
  _meta: { agentName: string; taskId?: string },
  onToast?: (msg: string) => void,
): Promise<{ displayText: string; writtenPaths: string[] }> {
  const { shouldAutoApplyWorkspaceWrites } = await import("@/lib/workbench-interaction-mode");
  if (!shouldAutoApplyWorkspaceWrites()) {
    return { displayText: assistantText, writtenPaths: [] };
  }
  const items = parseWorkspaceWriteItemsFromBubble(assistantText);
  if (!items.length || !desktop.workspaceApplyWriteFence) {
    return { displayText: assistantText, writtenPaths: [] };
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
  } catch {
    /* keep */
  }
  return { displayText: assistantText, writtenPaths: [] };
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
  // 去掉推销「下一步/P2」行（保留 ⋯ 工具轨迹与 stream-events）
  out = out
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (/^⋯\s+\S+/.test(t)) return true;
      if (t === "__STREAM_EVENTS_HOLD__") return true;
      return !/下一步|后续可|建议继续|还可以做|P2\s*[:：]|next\s*steps?/i.test(line);
    })
    .join("\n");
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
