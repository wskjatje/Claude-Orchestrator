/**
 * Agent 工具回合的执行通道判定。
 *
 * 路由只依赖回合策略已经解析出的能力，不依赖模式名、模型名或是否选中具名 Agent。
 * 任何允许工具且不是强制直聊的回合都进入 Host 闭环。
 *
 * @param {{ allowTools?: boolean, forceDirectChat?: boolean } | null | undefined} policy
 */
export function shouldUseUnifiedAgentLoop(policy) {
  return Boolean(policy?.allowTools) && policy?.forceDirectChat !== true
}
