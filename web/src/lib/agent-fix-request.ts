/**
 * 终端「用 Agent 修」：仅失败输出可触发；Chat 页注册后自动切 Agent 并发送。
 */

type AgentFixHandler = (snippet: string) => void;

let handler: AgentFixHandler | null = null;

/** 终端选区像失败/报错输出（对齐 Cursor「Fix with Agent」） */
export function looksLikeTerminalFailure(text: string): boolean {
  const t = String(text || "").trim();
  if (!t || t.length < 8) return false;
  return (
    /\b(Error|ERROR|Failed|FAILED|Exception|Traceback|panic:|FATAL|exit code|Exit code|npm ERR!|ELIFECYCLE|AssertionError|TypeError|ReferenceError|SyntaxError)\b/.test(
      t,
    ) ||
    /(?:^|\n)\s*at\s+\S+/m.test(t) ||
    /command not found|No such file|Permission denied|EACCES|ENOENT|EPERM/i.test(t) ||
    /失败|报错|异常|堆栈|崩溃/.test(t)
  );
}

export function setAgentFixHandler(next: AgentFixHandler | null) {
  handler = next;
}

export function requestAgentFix(snippet: string) {
  const s = String(snippet || "").trim();
  if (!s) return;
  if (!looksLikeTerminalFailure(s)) {
    void import("sonner").then(({ toast }) => {
      toast.message("请选中含失败/报错的终端输出后再用 Agent 修");
    });
    return;
  }
  if (!handler) {
    void import("sonner").then(({ toast }) => {
      toast.error("用 Agent 修不可用：请在主聊天页操作");
    });
    return;
  }
  handler(s.slice(0, 6000));
}
