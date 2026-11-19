export type AgentExecutionRoutePolicy = {
  allowTools?: boolean;
  forceDirectChat?: boolean;
};

export function shouldUseUnifiedAgentLoop(
  policy: AgentExecutionRoutePolicy | null | undefined,
): boolean;
