/**
 * Agent 模式：检测「征求确认 / 选择题」而未执行落盘。
 * 用于同一工具环内强制续写（不是换假后端）。
 */

import { parseStreamEventsBlock } from "@/lib/stream-agent-events";

const CONFIRM_RE =
  /要我现在落盘|要我现在改|是否现在|要不要我|可以开始吗|开始改吗|确认后我再|等你确认|请确认|请选择|选哪一种|memory\s*还是\s*Redis|用内存还是|是否一并|要不要一并|要我.*吗[？?]|现在落盘吗|写盘吗[？?]|是否执行|是否继续|OK\s*吗|可以吗[？?]\s*$/im;

const CHOICE_MENU_RE =
  /(?:^|\n)\s*(?:[-*]|\d+[.)]、?)\s*.{0,40}(?:还是|或者|\/|\bor\b).{0,40}(?:\n|$)/im;

/** 正文在征求确认或让用户做实现选择题 */
export function looksLikeAgentAskingConfirmation(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return false;
  if (CONFIRM_RE.test(t)) return true;
  if (/是否|还是|要不要/.test(t) && CHOICE_MENU_RE.test(t)) return true;
  if (/落盘方案|实施方案/.test(t) && /[？?]\s*$/m.test(t)) return true;
  return false;
}

/** 是否已有 Edit/Write 工具证据或直写路径 */
export function hasAgentWriteEvidence(
  text: string,
  writtenPaths?: string[],
): boolean {
  if (writtenPaths?.length) return true;
  const t = String(text || "");
  if (/【工作区已写入】/.test(t)) return true;
  const events = parseStreamEventsBlock(t);
  return events.some(
    (e) =>
      e.type === "tool" &&
      /^(Edit|Write|MultiEdit)$/i.test(String(e.name || "")),
  );
}

/** 强制续写指令（注入下一轮 user） */
export function agentForceContinueInstruction(): string {
  return [
    "【系统·强制执行】用户已处于 Agent 模式且已下达任务，禁止再询问「要不要落盘 / memory 还是 Redis / 是否 flask db init」。",
    "立刻用 Edit/Write 完成改动并跑测试。",
    "默认：限频用 memory://；一并 flask db init + migrate；生产 Redis 列入「未改：…」。",
    "不要输出方案菜单；不要等待确认。",
  ].join("");
}
