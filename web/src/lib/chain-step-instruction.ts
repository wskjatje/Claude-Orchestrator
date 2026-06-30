import {
  buildAgentArtifactPathHint,
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
      `【READ】Read upstream artifacts first (pre-injected): ${upstream.map((p) => `\`${p}\``).join(", ")}.`,
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
    return buildAgentArtifactPathHint(stem);
  }
  const pathHint = buildAgentArtifactPathHint(stem);
  if (IMPLEMENTATION_STEMS.has(stem)) {
    return `${pathHint}\n【CODE WRITE】Code→src/ via \`\`\`workspace-write\`\`\`. Your doc reply is auto-saved.`;
  }
  return `${pathHint} — Produce structured markdown. Your full reply is auto-saved here.`;
}

export const MUST_DO = [
  "【1】Base on pre-injected state. No fake docs.",
  "【2】Your reply IS the artifact. Produce structured Chinese markdown.",
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
