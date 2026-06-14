/** TanStack Router 要求 `/` 路由 search 字段完整声明 */
export type ChatRouteSearch = {
  session: string | undefined
  new: boolean | undefined
  /** 恢复 ~/.claude/projects/*.jsonl 中的 Claude CLI 会话 ID */
  claudeResume: string | undefined
}

export const EMPTY_CHAT_SEARCH: ChatRouteSearch = {
  session: undefined,
  new: undefined,
  claudeResume: undefined,
}

export function chatRouteSearch(opts?: {
  session?: string
  new?: boolean
  claudeResume?: string
}): ChatRouteSearch {
  return {
    session: opts?.session,
    new: opts?.new,
    claudeResume: opts?.claudeResume,
  }
}
