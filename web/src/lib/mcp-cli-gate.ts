/**
 * 返回已启用且健康的 MCP 服务器列表，供 Host 或本地编排显式连接。
 * 任一执行通道连接失败时仍禁止无工具证据的兜底回答。
 *
 * 排除产品自动补全的 sanshengliubu，避免人人被闸死 Host。
 * 健康检查为 error 的服务器不算「可用 MCP」，不列入闸门名单。
 */
export const BUNDLED_PRODUCT_MCP_NAMES = new Set(["sanshengliubu"]);

export type McpHealthServerRow = {
  status?: string;
  error?: string | null;
};

export function enabledMcpNamesRequiringCliChannel(
  mcpServers: Record<string, unknown> | null | undefined,
  healthServers?: Record<string, McpHealthServerRow> | null,
): string[] {
  if (!mcpServers || typeof mcpServers !== "object") return [];
  return Object.entries(mcpServers)
    .filter(([name, cfg]) => {
      if (BUNDLED_PRODUCT_MCP_NAMES.has(name)) return false;
      const c = cfg && typeof cfg === "object" ? (cfg as Record<string, unknown>) : {};
      if (c.disabled === true) return false;
      const health = healthServers?.[name];
      if (health && String(health.status || "").toLowerCase() === "error") return false;
      return true;
    })
    .map(([name]) => name);
}

export function mcpCliGateFailureMessage(
  cliOrLocalError: string | null,
  mcpNames: string[],
): string {
  const names = mcpNames.slice(0, 8).join("、") || "（已启用）";
  const detail = String(cliOrLocalError || "").trim();
  return [
    "【MCP】已启用需 MCP 通道的服务器（",
    names,
    "），执行通道连接失败后禁止无 MCP 工具证据继续回答。",
    detail ? ` 原因：${detail}` : "",
    " 请修复本机编排或 MCP 服务器后重试；健康检查异常的服务器请先停用。",
  ].join("");
}
