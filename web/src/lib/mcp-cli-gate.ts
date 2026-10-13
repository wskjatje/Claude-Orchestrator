/**
 * P1-B：用户启用了需 MCP 通道的服务器时，CLI/本地编排失败不得静默 Host 回落
 *（Host 无 MCP；禁止无工具证据的兜底回答）。
 *
 * 排除产品自动补全的 sanshengliubu，避免人人被闸死 Host。
 */
export const BUNDLED_PRODUCT_MCP_NAMES = new Set(["sanshengliubu"]);

export function enabledMcpNamesRequiringCliChannel(
  mcpServers: Record<string, unknown> | null | undefined,
): string[] {
  if (!mcpServers || typeof mcpServers !== "object") return [];
  return Object.entries(mcpServers)
    .filter(([name, cfg]) => {
      if (BUNDLED_PRODUCT_MCP_NAMES.has(name)) return false;
      const c = cfg && typeof cfg === "object" ? (cfg as Record<string, unknown>) : {};
      return c.disabled !== true;
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
    "），CLI/本地编排失败后禁止静默 Host 回落（Host 无 MCP，禁止无证据兜底）。",
    detail ? ` 原因：${detail}` : "",
    " 请修复 Claude CLI 或本地 MCP 编排后重试；或在设置→高级→MCP 中禁用相关服务器后再用 Host。",
  ].join("");
}
