import { isAutoAgentBasename, agentStemFromBasename } from "@/lib/agent-basename";
import { inferAgentStemFromText } from "@/lib/infer-agent-from-text";
import { parseAgentCommand } from "@/lib/parse-agent-command";

export type AgentRouteSource = "slash" | "selected" | "inferred";

export type ResolvedAgentRoute = {
  stem: string;
  body: string;
  source: AgentRouteSource;
};

/** 解析本轮 Agent：斜杠指令 > 底栏已选 Agent > 感觉词推断 */
export function resolveAgentForTurn(
  displayLine: string,
  selectedBasename: string | null | undefined,
): ResolvedAgentRoute {
  const slash = parseAgentCommand(displayLine);
  if (slash.matched) {
    return {
      stem: slash.stem,
      body: slash.body || displayLine,
      source: "slash",
    };
  }
  if (!isAutoAgentBasename(selectedBasename)) {
    return {
      stem: agentStemFromBasename(selectedBasename),
      body: displayLine,
      source: "selected",
    };
  }
  return {
    stem: inferAgentStemFromText(displayLine),
    body: displayLine,
    source: "inferred",
  };
}
