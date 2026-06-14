/**
 * 从聊天气泡全文提取 active-chain.json 结构（支持 ```json 代码块或裸对象）。
 */

export type ChainStep = {
  agentName: string;
  taskId?: string;
  instruction: string;
};

export type ActiveChainState = {
  status: string;
  currentIndex: number;
  steps: ChainStep[];
};

export type ActiveChainParseSource = "json" | "markdown";

function wbsOrder(taskId?: string): number | null {
  const t = String(taskId ?? "").trim();
  const m = t.match(/^WBS-(\d{1,4})$/i);
  if (!m) return null;
  return Number(m[1]);
}

function maybeSortWbsSteps(steps: ChainStep[]): ChainStep[] {
  if (!steps.length) return steps;
  const orders = steps.map((s) => wbsOrder(s.taskId));
  if (orders.some((n) => n == null)) return steps;
  const uniq = new Set(orders as number[]);
  if (uniq.size !== steps.length) return steps;
  return [...steps].sort((a, b) => (wbsOrder(a.taskId) ?? 0) - (wbsOrder(b.taskId) ?? 0));
}

import { inferAgentStemFromText } from "@/lib/infer-agent-from-text";

function inferAgentName(text: string): string {
  return inferAgentStemFromText(text);
}

function validateSteps(raw: unknown): string | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    return "steps 须为非空数组";
  }
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (!s || typeof s !== "object") {
      return `第 ${i + 1} 步格式无效`;
    }
    const o = s as Record<string, unknown>;
    const agentName = String(o.agentName ?? "").trim();
    const instruction = String(o.instruction ?? "").trim();
    if (!agentName || !instruction) {
      return `第 ${i + 1} 步缺少 agentName 或 instruction`;
    }
  }
  return null;
}

function normalizeState(obj: Record<string, unknown>): ActiveChainState {
  const stepsRaw = obj.steps as unknown[];
  const steps: ChainStep[] = stepsRaw.map((s) => {
    const st = s as Record<string, unknown>;
    const taskId = st.taskId != null ? String(st.taskId).trim() : "";
    return {
      agentName: String(st.agentName ?? "").trim(),
      ...(taskId ? { taskId } : {}),
      instruction: String(st.instruction ?? "").trim(),
    };
  });
  return {
    status: typeof obj.status === "string" ? obj.status : "idle",
    currentIndex: 0,
    steps,
  };
}

/** 尝试 JSON.parse 单候选串 */
function tryParseOne(candidate: string): ActiveChainState | null {
  const t = candidate.trim();
  if (!t.startsWith("{")) return null;
  try {
    const obj = JSON.parse(t) as Record<string, unknown>;
    if (validateSteps(obj.steps)) return null;
    return normalizeState(obj);
  } catch {
    return null;
  }
}

function parseMarkdownBacklog(text: string): ActiveChainState | null {
  const lines = text.split(/\r?\n/);
  const steps: ChainStep[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    const taskMatch =
      line.match(/^\s*(?:[-*]|\d+\.)?\s*\*\*?\s*任务\s*\[([^\]]+)\]\s*[：:]\s*(.+?)\s*\*{0,2}\s*$/i) ||
      line.match(/^\s*(?:[-*]|\d+\.)?\s*任务\s*\[([^\]]+)\]\s*[：:]\s*(.+)\s*$/i) ||
      line.match(/^\s*(?:[-*]|\d+\.)?\s*\[([A-Za-z]{2,}-\d+)\]\s*(.+)\s*$/);

    if (!taskMatch) {
      i += 1;
      continue;
    }

    const taskId = String(taskMatch[1] ?? "").trim();
    const title = String(taskMatch[2] ?? "").trim();
    const details: string[] = [];

    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      const nextTrim = next.trim();
      if (!nextTrim) {
        i += 1;
        continue;
      }
      if (
        /^\s*(?:[-*]|\d+\.)?\s*\*{0,2}\s*任务\s*\[([^\]]+)\]/i.test(nextTrim) ||
        /^\s*(?:[-*]|\d+\.)?\s*\[([A-Za-z]{2,}-\d+)\]/.test(nextTrim)
      ) {
        break;
      }
      if (/^#{2,6}\s+/.test(nextTrim)) {
        i += 1;
        continue;
      }
      details.push(nextTrim.replace(/^\s*[-*]\s*/, ""));
      i += 1;
    }

    const desc = details.length ? `\n${details.join("\n")}` : "";
    const instruction = `请执行任务 ${taskId || "未编号"}：${title}${desc}`.trim();
    const agentName = inferAgentName(`${title}\n${details.join("\n")}`);
    steps.push({
      ...(taskId ? { taskId } : {}),
      agentName,
      instruction,
    });
  }

  if (!steps.length) return null;
  return { status: "idle", currentIndex: 0, steps: maybeSortWbsSteps(steps) };
}

function findHeaderColumnIndex(headerNorm: string[], patterns: RegExp[]): number {
  for (const re of patterns) {
    const i = headerNorm.findIndex((h) => re.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

function splitMdRow(line: string): string[] {
  const t = line.trim();
  if (!t.includes("|")) return [];
  const raw = t.replace(/^\|/, "").replace(/\|$/, "");
  return raw.split("|").map((s) => s.trim());
}

/** 表格「执行 Agent」列常见中文称谓 → ~/.claude/agents/<stem>.md（静态映射，非运行时 Matcher） */
const CHINESE_AGENT_STEM: Record<string, string> = {
  项目经理: "project-manager",
  产品经理: "product-manager",
  软件架构师: "software-architect",
  架构师: "software-architect",
  前端工程师: "frontend-engineer",
  前端: "frontend-engineer",
  后端工程师: "backend-engineer",
  后端: "backend-engineer",
  测试工程师: "qa-engineer",
  测试: "qa-engineer",
  代码评审: "code-reviewer",
  评审: "code-reviewer",
  运维工程师: "devops-engineer",
  运维: "devops-engineer",
};

function normalizeAgentStem(raw: string | undefined | null): string {
  const rawTrim = String(raw ?? "").replace(/[`*]/g, "").trim();
  if (!rawTrim) return "";
  const zh = CHINESE_AGENT_STEM[rawTrim];
  if (zh) return zh;
  const t = rawTrim.toLowerCase();
  if (t === "project-manager" || t === "project manager") return "project-manager";
  if (t === "product-manager" || t === "product manager") return "product-manager";
  if (t === "software-architect" || t === "software architect") return "software-architect";
  if (t === "frontend-engineer" || t === "frontend engineer") return "frontend-engineer";
  if (t === "backend-engineer" || t === "backend engineer") return "backend-engineer";
  if (t === "qa-engineer" || t === "qa engineer") return "qa-engineer";
  if (t === "code-reviewer" || t === "code reviewer") return "code-reviewer";
  if (t === "devops-engineer" || t === "devops engineer") return "devops-engineer";
  if (/^[a-z0-9][a-z0-9-]*$/.test(t)) return t;
  return "";
}

function parseWbsMarkdownTable(text: string): ActiveChainState | null {
  const lines = text.split(/\r?\n/);
  const tableRows = lines.filter((l) => l.includes("|"));
  if (tableRows.length < 3) return null;

  let header: string[] | null = null;
  let headerIdx = -1;
  for (let i = 0; i < tableRows.length; i++) {
    const cols = splitMdRow(tableRows[i]);
    if (!cols.length) continue;
    const join = cols.join(" ").toLowerCase();
    if (
      /工作摘要|任务编号|task\s*summary|执行\s*agent|执行人|角色|交付标准|agent/.test(
        join,
      )
    ) {
      header = cols;
      headerIdx = i;
      break;
    }
  }
  if (!header || headerIdx < 0) return null;

  const colKey = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const headerNorm = header.map(colKey);
  const idCol = findHeaderColumnIndex(headerNorm, [/任务编号/, /编号/, /taskid/, /^id$/]);
  const summaryCol = findHeaderColumnIndex(headerNorm, [
    /工作摘要与执行说明/,
    /工作摘要/,
    /执行说明/,
    /tasksummary/,
    /摘要/,
    /summary/,
    /任务说明/,
    /工作包/,
  ]);
  const agentCol = findHeaderColumnIndex(headerNorm, [
    /执行agent/,
    /执行人/,
    /负责人/,
    /角色/,
    /^agent$/,
    /指派/,
  ]);
  const depCol = findHeaderColumnIndex(headerNorm, [/依赖任务/, /依赖/, /前置/, /depend/]);
  const dodCol = findHeaderColumnIndex(headerNorm, [
    /交付标准/,
    /dod/,
    /验收/,
    /完成定义/,
  ]);

  const steps: ChainStep[] = [];
  for (let i = headerIdx + 1; i < tableRows.length; i++) {
    const cols = splitMdRow(tableRows[i]);
    if (!cols.length) continue;
    if (cols.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) continue;
    const lineJoin = cols.join(" ").trim();
    if (!lineJoin) continue;
    const taskId =
      idCol >= 0 && cols[idCol] != null && String(cols[idCol]).trim() !== ""
        ? String(cols[idCol]).replace(/[`*]/g, "").trim()
        : `WBS-${steps.length + 1}`;
    const summary = String(summaryCol >= 0 ? cols[summaryCol] ?? "" : cols[0] ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/[`*]/g, "")
      .trim();
    if (!summary) continue;
    const agentRaw = agentCol >= 0 ? cols[agentCol] ?? "" : "";
    const agent = normalizeAgentStem(agentRaw) || inferAgentName(`${summary}\n${agentRaw}`);
    const dep =
      depCol >= 0 ? String(cols[depCol] ?? "").replace(/[`*]/g, "").trim() : "";
    const dod =
      dodCol >= 0 ? String(cols[dodCol] ?? "").replace(/[`*]/g, "").trim() : "";
    const details = [dep ? `依赖：${dep}` : "", dod ? `DoD：${dod}` : ""].filter(Boolean).join("\n");
    const instruction = `请执行任务 ${taskId}：${summary}${details ? `\n${details}` : ""}`;
    steps.push({ taskId, agentName: agent, instruction });
  }

  if (!steps.length) return null;
  return { status: "idle", currentIndex: 0, steps: maybeSortWbsSteps(steps) };
}

/**
 * 宽松兜底：仅要文本里出现 WBS-xx 行，就尝试抽取为步骤。
 * 兼容非标准表格（缺表头、列顺序混乱、纯文本行）。
 */
function parseWbsLooseRows(text: string): ActiveChainState | null {
  const lines = text.split(/\r?\n/);
  const steps: ChainStep[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const idm = line.match(/\b(WBS[-_ ]?\d{1,3})\b/i);
    if (!idm) continue;
    const taskId = idm[1].toUpperCase().replace(/[_ ]+/g, "-");
    if (seen.has(taskId)) continue;
    seen.add(taskId);

    const cols = splitMdRow(line);
    const summaryCandidate =
      cols.length >= 2
        ? (cols[1] || cols[0] || "").replace(/[`*]/g, "").replace(/<br\s*\/?>/gi, " ").trim()
        : line.replace(/[`*]/g, "");
    const summary = summaryCandidate
      .replace(/\bWBS[-_ ]?\d{1,3}\b/gi, "")
      .replace(/[|]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!summary) continue;

    const agentText = cols.join(" ");
    const agent = normalizeAgentStem(agentText) || inferAgentName(`${summary}\n${agentText}`);
    const instruction = `请执行任务 ${taskId}：${summary}`;
    steps.push({ taskId, agentName: agent, instruction });
  }

  if (!steps.length) return null;
  return { status: "idle", currentIndex: 0, steps: maybeSortWbsSteps(steps) };
}

/** 从 project-status / 任务分配类 Markdown 中解析 `/agent stem` 委派行 */
function parseAgentDelegationMarkdown(text: string): ActiveChainState | null {
  let body = text?.trim() ?? "";
  if (!body) return null;

  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let fm: RegExpExecArray | null;
  while ((fm = fenceRe.exec(body)) !== null) {
    try {
      const obj = JSON.parse(fm[1].trim()) as Record<string, unknown>;
      if (typeof obj.content === "string" && obj.content.trim()) {
        body = obj.content.trim();
        break;
      }
      if (Array.isArray(obj)) {
        const block = obj.find(
          (x) => x && typeof x === "object" && typeof (x as { content?: string }).content === "string",
        ) as { content?: string } | undefined;
        if (block?.content?.trim()) {
          body = block.content.trim();
          break;
        }
      }
    } catch {
      /* 非 JSON 代码块 */
    }
  }

  const lines = body.split(/\r?\n/);
  const steps: ChainStep[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const agentMatch = line.match(/\/agent\s+([a-z0-9][a-z0-9-]*)/i);
    if (!agentMatch) continue;

    const rawStem = agentMatch[1].trim();
    const agentName = normalizeAgentStem(rawStem) || rawStem.toLowerCase();
    if (!agentName) continue;

    const titleFromBold = line.match(/(?:^\d+\.\s*)?\*\*([^*]+)\*\*/);
    const titleFromColon = line.match(
      /(?:^\d+\.\s*)?(?:\*\*)?([^*:：]+?)(?:\*\*)?\s*[：:]\s*/,
    );
    const title = (titleFromBold?.[1] || titleFromColon?.[1] || "")
      .replace(/^\d+\.\s*/, "")
      .trim();
    const taskId = `WBS-${steps.length + 1}`;
    const detail = line
      .replace(/^\d+\.\s*/, "")
      .replace(/\*\*/g, "")
      .trim();
    const instruction = title
      ? `请执行任务 ${taskId}：${title}${detail && detail !== title ? `\n${detail}` : ""}`
      : `请执行任务 ${taskId}：${detail}`;
    steps.push({ taskId, agentName, instruction });
  }

  if (!steps.length) return null;
  return { status: "idle", currentIndex: 0, steps: maybeSortWbsSteps(steps) };
}

/**
 * 从助手/用户气泡文本解析任务链。模型可在 ```json 中输出完整 { status, steps }。
 */
/** 跑链前 UI 预览：依表顺序，无动态分支 */
/** 供 UI 只读展示（不写入 JSON，不触发运行时改链） */
export function buildChainBoardRows(
  steps: ChainStep[],
  currentIndex: number,
): { taskId: string; agentName: string; done: boolean; current: boolean }[] {
  return steps.map((s, i) => ({
    taskId: (s.taskId || `步骤${i + 1}`).trim(),
    agentName: s.agentName.trim(),
    done: i < currentIndex,
    current: i === currentIndex,
  }));
}

export function formatChainStepsPreview(steps: ChainStep[], maxLines = 6): string {
  if (!steps.length) return "（无步骤）";
  const lines = steps.slice(0, maxLines).map(
    (s, i) => `${i + 1}. ${(s.taskId || "—").trim()} · ${s.agentName}`,
  );
  if (steps.length > maxLines) {
    lines.push(`…共 ${steps.length} 步（active-chain 将按 currentIndex 顺序执行）`);
  }
  return lines.join("\n");
}

export function parseActiveChainFromBubbleText(
  raw: string,
): { ok: true; state: ActiveChainState; source: ActiveChainParseSource } | { ok: false; error: string } {
  const text = raw?.trim() ?? "";
  if (!text) {
    return { ok: false, error: "气泡内容为空" };
  }

  const candidates: string[] = [];

  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    candidates.push(m[1].trim());
  }

  if (text.startsWith("{")) {
    candidates.unshift(text);
  }

  const stepsIdx = text.indexOf('"steps"');
  if (stepsIdx >= 0) {
    const start = text.lastIndexOf("{", stepsIdx);
    if (start >= 0) {
      candidates.push(text.slice(start));
    }
  }

  const seen = new Set<string>();
  for (const c of candidates) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    const parsed = tryParseOne(c);
    if (parsed) {
      return { ok: true, state: parsed, source: "json" };
    }
  }

  const mdParsed = parseMarkdownBacklog(text);
  if (mdParsed) {
    return { ok: true, state: mdParsed, source: "markdown" };
  }
  const wbsParsed = parseWbsMarkdownTable(text);
  if (wbsParsed) {
    return { ok: true, state: wbsParsed, source: "markdown" };
  }
  const wbsLoose = parseWbsLooseRows(text);
  if (wbsLoose) {
    return { ok: true, state: wbsLoose, source: "markdown" };
  }
  const delegationParsed = parseAgentDelegationMarkdown(text);
  if (delegationParsed) {
    return { ok: true, state: delegationParsed, source: "markdown" };
  }

  return {
    ok: false,
    error:
      "未能解析出有效 JSON：须包含 steps 数组，且每步含 agentName、instruction。亦未识别出任务清单（如“任务 [ENG-01]: …”）。可将完整对象放在 ```json 代码块中。",
  };
}
