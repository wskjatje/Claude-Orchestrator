/**
 * RPC/页面传输中断时保留已经直播到界面的执行证据。
 * 这里只重建展示消息，不推断任务成功，也不把失败伪装成成功。
 */
export function buildInterruptedAssistantMessage(messages, errorText) {
  const list = Array.isArray(messages) ? messages : []
  let live = null
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.role === 'assistant') {
      live = list[i]
      break
    }
  }

  const liveContent =
    live?.content && live.content !== '__WAITING__' ? String(live.content).trim() : ''
  const agentTurn = live?.agentTurn && typeof live.agentTurn === 'object'
    ? live.agentTurn
    : undefined
  const hasExecutionEvidence = Boolean(
    liveContent ||
      agentTurn?.streamEvents?.length ||
      agentTurn?.writtenPaths?.length ||
      agentTurn?.filePatches?.length ||
      agentTurn?.todos?.length,
  )

  if (!hasExecutionEvidence) {
    return {
      content: String(errorText || '').trim(),
      requestError: true,
    }
  }

  return {
    content: liveContent,
    requestError: true,
    requestErrorDetail: String(errorText || '').trim(),
    ...(agentTurn ? { agentTurn } : {}),
    ...(live?.localChannel ? { localChannel: live.localChannel } : {}),
  }
}
