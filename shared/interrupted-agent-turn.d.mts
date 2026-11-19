import type { StreamAgentEvent } from '../web/src/lib/stream-agent-events'

export type InterruptedAgentTurn = {
  writtenPaths?: string[]
  filePatches?: Array<{ path: string; before?: string; after?: string; isNewFile?: boolean }>
  todos?: Array<{
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'completed'
  }>
  backend?: 'cli' | 'host' | 'local'
  streamEvents?: StreamAgentEvent[]
  [key: string]: unknown
}

export function buildInterruptedAssistantMessage(
  messages: Array<{
    role?: string
    content?: string
    agentTurn?: InterruptedAgentTurn
    localChannel?: 'direct' | 'orch'
  }>,
  errorText: string,
): {
  content: string
  requestError: true
  requestErrorDetail?: string
  agentTurn?: InterruptedAgentTurn
  localChannel?: 'direct' | 'orch'
}
