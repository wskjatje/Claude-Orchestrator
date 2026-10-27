export const MCP_TOOL_CATALOG_REL: string;
export const MCP_DESCRIBE_TOOL_NAME: string;
export function mcpToolCatalogRelPath(serverId: string, toolName: string): string;
export function skeletonMcpParameters(schema: unknown): Record<string, unknown>;
export function mcpSchemaNeedsDescribe(schema: unknown): boolean;
export function writeMcpToolCatalog(
  workspaceRoot: string,
  entries: Array<{
    serverId: string;
    originalToolName: string;
    prefixed: string;
    description?: string;
    inputSchema?: unknown;
  }>,
  opts?: {
    inRequestCallNames?: Iterable<string>;
    requestCap?: number;
  },
): { ok: boolean; indexRel: string; count: number; byCallRel: string };
export function shortMcpToolDescription(
  serverId: string,
  originalToolName: string,
  catalogRel: string,
  maxLen?: number,
  opts?: { requireDescribe?: boolean },
): string;
export function buildMcpDescribeOllamaTool(): {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};
export function readMcpToolCatalogByCallName(
  workspaceRoot: string,
  callName: string,
): { ok: boolean; text: string };
