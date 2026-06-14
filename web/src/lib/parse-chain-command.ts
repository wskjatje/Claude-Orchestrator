export type ParsedChainCommand =
  | { matched: false }
  | { matched: true; action: "list" }
  | { matched: true; action: "run"; query: string };

/** 解析 /chain、/任务链 指令（在对话中调用任务链） */
export function parseChainCommand(raw: string): ParsedChainCommand {
  const s = raw.trim();
  if (!s.startsWith("/")) return { matched: false };

  const m = s.match(/^\/(?:chain|任务链)(?:\s+(.*))?$/is);
  if (!m) return { matched: false };

  const rest = (m[1] ?? "").trim();
  if (!rest || /^list$/i.test(rest) || rest === "列表") {
    return { matched: true, action: "list" };
  }

  const runMatch = rest.match(/^(?:run|执行|跑)\s+(.+)$/is);
  if (runMatch) {
    return { matched: true, action: "run", query: runMatch[1].trim() };
  }

  return { matched: true, action: "run", query: rest };
}
