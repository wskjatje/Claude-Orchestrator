/**
 * 具名 Agent 是否允许写项目（历史 API）。
 * 真正是否落盘以 `resolveTurnPolicy` / 交互模式为准：Ask 与只读意图一律禁止。
 */
export function agentAutoWritesToProject(_agentName: string): boolean {
  return true;
}
