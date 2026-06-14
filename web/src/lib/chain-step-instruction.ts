/**
 * 任务链（active-chain）与 Multi-Agent 委派（delegation-v1）共用的「每步须可核验落盘」约束。
 * 须与仓库根目录 `multi-agent-runtime.js` 内联的 MUST_DO 文案保持一致（Node 侧无法直接 import 本 TS）。
 */

export const MUST_DO = [
  "【执行约束】本步须在工作区留下可核验产物；写盘请用 workspace-write 或 ```workspace-write``` JSON。",
  "【无围栏兜底】若未输出合法围栏，系统仍会将本步摘要写入 docs/chain-steps/{任务ID}-{Agent}.md，后续步骤可读取该路径。",
  "【禁止虚构落盘】禁止自行撰写「### 产物写盘」「【工作区已写入】共 N 个文件」等小节，除非正文内**确实存在**且**合法**的 ```workspace-write``` 围栏 JSON（系统会据此真正写盘）；仅有 Markdown 列表或口述「已写入」不算落盘，且会误导后续步骤。",
  "【实现类 Agent】backend-engineer / frontend-engineer 等须为每个涉及路径输出完整代码块（围栏首行可写路径，或代码首行 `# src/...` 注释），或输出合法 ```workspace-write``` JSON；仅列路径不写代码会导致磁盘未修改。",
  "【可见回复】用简体中文短要点（建议 ≤5 条）：结论、涉及文件路径、验收是否满足、下一步交接对象；禁止英文 Implementation Plan/Execution 类长篇计划；禁止整段复述工具 JSON。",
].join("\n");

export function buildTaskChainExecutableInstruction(
  agent: string,
  taskId: string,
  instruction: string,
): string {
  const a = String(agent || "").trim() || "unknown-agent";
  const t = String(taskId || "").trim() || "—";
  const base = String(instruction || "").trim();
  return `【任务】${a} · ${t}\n${base}\n\n${MUST_DO}`.trim();
}

export function buildDelegationExecutableInstruction(
  agent: string,
  taskId: string,
  instruction: string,
): string {
  const a = String(agent || "").trim() || "unknown-agent";
  const t = String(taskId || "").trim() || "—";
  const base = String(instruction || "").trim();
  return `【委派子任务】${a} · ${t}\n${base}\n\n${MUST_DO}`.trim();
}
