import {
  buildAgentArtifactPathHint,
  defaultArtifactPathForAgent,
  normalizeAgentStem,
  upstreamArtifactPathsForAgent,
} from "@/lib/agent-artifact-paths";

const IMPLEMENTATION_STEMS = new Set([
  "frontend-engineer",
  "backend-engineer",
  "devops-engineer",
]);

export function buildChainStepReadBlock(stemRaw: string): string {
  const stem = normalizeAgentStem(stemRaw);
  if (!stem) return "";
  if (stem === "__general__") {
    return "【READ】Pre-injected workspace state. Read files as needed.";
  }
  const upstream = upstreamArtifactPathsForAgent(stem);
  const lines: string[] = [];

  if (upstream.length) {
    lines.push(
      `【READ】Read upstream artifacts first (pre-injected if exist): ${upstream.map((p) => `\`${p}\``).join(", ")}.`,
    );
    lines.push(
      "【WARN】If a file path doesn't exist, do NOT read/fake it. Work with what's available or ask.",
    );
  } else {
    lines.push("【READ】No fixed upstream md. Pre-injected workspace state available.");
  }

  return lines.join("\n");
}

export function buildChainStepWriteBlock(stemRaw: string): string {
  const stem = normalizeAgentStem(stemRaw);
  if (!stem) return "";
  if (stem === "__general__") {
    return (
      "【WRITE】须输出合法 ```workspace-write``` JSON：{\"path\":\"...\",\"content\":\"...\"}（也接受 contents）。" +
      "path 必须写明；无围栏则本步失败，系统不会猜路径或写默认 docs/chain-steps。"
    );
  }
  const suggested = defaultArtifactPathForAgent(stem);
  const pathHint = buildAgentArtifactPathHint(stem);
  const lines = [
    pathHint,
    `【WRITE】须输出合法 \`\`\`workspace-write\`\`\` JSON：{"path":"${suggested}","content":"..."}（也接受 contents；path 可改但必须显式）。` +
      "无围栏则本步失败；系统不会猜路径、不会写默认 docs/chain-steps。",
    "【NO FAKE WRITE】无有效围栏勿声称已写入。",
  ];
  if (IMPLEMENTATION_STEMS.has(stem)) {
    lines.push(
      "【CODE WRITE】业务代码 path 指向 src/（或仓库约定目录）；文档用建议 md 路径。",
    );
  }
  return lines.join("\n");
}

export const MUST_DO = [
  "【1】基于已注入工作区状态作答；禁止伪造不存在文件。",
  "【2】变更须经 ```workspace-write``` JSON 显式 path+content|contents；无围栏不落盘。",
  "【3】收尾 1～3 句；禁止下一步推销。",
].join("\n");

function buildWrappedInstruction(label: string, agent: string, taskId: string, instruction: string): string {
  const a = String(agent || "").trim() || "unknown-agent";
  const t = String(taskId || "").trim() || "—";
  const base = String(instruction || "").trim();
  return `【${label}】${a} · ${t}\n${base}\n\n${MUST_DO}`.trim();
}

export function buildTaskChainExecutableInstruction(
  agent: string,
  taskId: string,
  instruction: string,
): string {
  return buildWrappedInstruction("TASK", agent, taskId, instruction);
}

export function buildDelegationExecutableInstruction(
  agent: string,
  taskId: string,
  instruction: string,
): string {
  return buildWrappedInstruction("DELEGATE SUBTASK", agent, taskId, instruction);
}
