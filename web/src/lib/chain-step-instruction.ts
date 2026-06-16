/**
 * 任务链（active-chain）与 Multi-Agent 委派（delegation-v1）共用的「每步须可核验落盘」约束。
 * 须与仓库根目录 `multi-agent-runtime.js` 内联的 MUST_DO 文案保持一致（Node 侧无法直接 import 本 TS）。
 */

import {
  buildAgentArtifactPathHint,
  defaultArtifactPathForAgent,
  normalizeAgentStem,
  upstreamArtifactPathsForAgent,
} from "@/lib/agent-artifact-paths";
import { agentRequiresManualConfirmWrite } from "@/lib/write-policy";

const CHAIN_STEP_BOOTSTRAP_READ_PATHS = ["CLAUDE.md", "README.md", "docs/README.md"] as const;

const IMPLEMENTATION_STEMS = new Set([
  "frontend-engineer",
  "backend-engineer",
  "devops-engineer",
]);

/**
 * 链模板 step() 内嵌的读取说明：与 expandUserLineWithWorkspaceFiles / UPSTREAM_ARTIFACTS 对齐。
 */
export function buildChainStepReadBlock(stemRaw: string): string {
  const stem = normalizeAgentStem(stemRaw);
  if (!stem) return "";
  const upstream = upstreamArtifactPathsForAgent(stem);
  const lines: string[] = [];

  if (upstream.length) {
    lines.push(
      `【读取·强制】须优先阅读工作区上游产物（跑链时应用会自动注入已存在文件正文）：${upstream.map((p) => `\`${p}\``).join("、")}。`,
    );
  } else {
    lines.push(
      `【读取·强制】本步无固定上游 md；须阅读对话上文与工作区 ${CHAIN_STEP_BOOTSTRAP_READ_PATHS.map((p) => `\`${p}\``).join(" / ")}（若存在）。`,
    );
  }

  lines.push(
    "【读取·兜底】若上游 md 尚未落盘，须阅读 `docs/chain-steps/` 下前序步骤摘要；仍缺失时用 read / readWorkspaceTextFile / listWorkspaceMarkdownFiles 补读，并在一句话内说明缺失项。",
    "【禁止臆造输入】禁止编造未读过的 PRD/WBS/架构/Backlog 正文；不得假设 Django/Flask 等未在工作区出现的栈。",
  );

  return lines.join("\n");
}

/**
 * 链模板 step() 内嵌的落盘说明：与 buildAgentRoutedInstruction / MUST_DO 对齐，供三省六部与普通流水线共用。
 */
export function buildChainStepWriteBlock(stemRaw: string): string {
  const stem = normalizeAgentStem(stemRaw);
  if (!stem) return "";
  const path = defaultArtifactPathForAgent(stem);
  const pathHint = buildAgentArtifactPathHint(stem);
  const manual = agentRequiresManualConfirmWrite(stem);
  const lines = [pathHint];

  if (manual) {
    lines.push(
      "【落盘·任务链】跑链/Multi-Agent 时须输出合法 ```workspace-write``` JSON（path 默认 `" +
        path +
        "`）；系统据此真正写盘。禁止仅写「已落盘」口述或虚构「【工作区已写入】」。",
      "【落盘·单聊】普通对话（非跑链）仍须先询问用户是否落盘，获明确同意后再写 workspace-write。",
    );
  } else {
    lines.push(
      "【落盘·自动】须输出合法 ```workspace-write``` JSON 写入默认路径；若无合法围栏，系统会将摘要写入 docs/chain-steps/{任务ID}-" +
        stem +
        ".md 或自动写入 `" +
        path +
        "`。",
      "【禁止虚构落盘】禁止自行撰写「【工作区已写入】」等小节，除非正文内确实存在合法 workspace-write 围栏。",
    );
  }

  if (IMPLEMENTATION_STEMS.has(stem)) {
    lines.push(
      "【代码落盘】业务代码须写入 src/ 等源目录（围栏首行写相对路径，或代码首行 `# src/...` 注释）；说明文档仍用默认 md 路径。",
    );
  }

  return lines.join("\n");
}

export const MUST_DO = [
  "【读取·强制】须基于已注入的上游文件或 read/readWorkspaceTextFile 读取后再执行；路径不存在时一句话说明缺失，禁止臆造 PRD/WBS/架构正文。",
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
