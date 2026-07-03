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
    return buildAgentArtifactPathHint(stem);
  }
  const pathHint = buildAgentArtifactPathHint(stem);
  const codeHint = "【WRITE】Use `workspace-write` fences or code blocks with file paths to write. System auto-saves your reply.";
  if (IMPLEMENTATION_STEMS.has(stem)) {
    return `${pathHint}\n${codeHint}`;
  }
  return `${pathHint}\n${codeHint}`;
}

export const MUST_DO = [
  "【1】Base on pre-injected state. No fake docs. Never read/fake non-existent files.",
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
