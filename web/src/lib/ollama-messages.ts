import type { DesktopApi } from '@/types/desktop'

/** 与主进程用户图片附件对齐（仅需 kind + dataUrl 即可送 Ollama） */
export type UserImageAttachment = {
  kind: 'image'
  name?: string
  mime?: string
  dataUrl: string
}

export type PriorTurn = {
  role: 'user' | 'assistant'
  content: string
  attachments?: UserImageAttachment[]
}

function dataUrlToOllamaBase64(dataUrl: string): string | null {
  const i = dataUrl.indexOf(',')
  if (i === -1 || !dataUrl.startsWith('data:')) return null
  return dataUrl.slice(i + 1)
}

/** Ollama OpenAI 兼容接口：user 消息可带 images（base64，无 data: 前缀） */
function userTurnToApiPayload(m: PriorTurn): { role: string; content: string; images?: string[] } {
  if (m.role !== 'user') return { role: m.role, content: m.content }
  const images: string[] = []
  for (const a of m.attachments ?? []) {
    if (a?.kind === 'image' && typeof a.dataUrl === 'string' && a.dataUrl.startsWith('data:')) {
      const b64 = dataUrlToOllamaBase64(a.dataUrl)
      if (b64) images.push(b64)
    }
  }
  if (images.length) return { role: 'user', content: m.content, images }
  return { role: 'user', content: m.content }
}

/**
 * 与旧版 Electron `renderer.js` 中逻辑对齐的精简版：system + 历史 + 本轮用户。
 * 历史中的用户图片附件会转为 Ollama `images` 字段。
 */
export async function buildChatCompletionMessages(
  desktop: DesktopApi,
  opts: {
    workspaceDir: string | null
    priorHistory: PriorTurn[]
    userLine: string
    userAttachments?: UserImageAttachment[]
  },
): Promise<{ role: string; content: string; images?: string[] }[]> {
  let executionSnapshot = ''
  if (workspaceDirTrimmed(opts.workspaceDir)) {
    try {
      const snap = await desktop.workspaceGetExecutionSnapshot()
      if (snap?.ok && typeof snap.text === 'string' && snap.text.trim()) {
        executionSnapshot =
          '\n【当前项目执行情况快照】\n' +
          '以下为应用从你的「所选工作区」采集的客观事实；若用户要求保存到磁盘，请使用 ```workspace-write``` JSON，path 为相对路径。\n\n' +
          snap.text.trim()
      }
    } catch {
      executionSnapshot = '\n【当前项目执行情况快照】采集失败，可忽略。\n'
    }
  }

  const sysParts = [
    '你是协助软件开发的助手；若经 OpenAI 兼容 API 调用则运行在本机模型，若经桌面端则通常由 Claude Code CLI 执行。',
    '【语言】用户使用中文时，除代码、路径、库名/API/协议名、或用户点名要英文外，通篇用简体中文。',
    '【语言】不要输出整段英文状态播报（例如 [SYSTEM: ...]、STATUS: ...、NEXT_UPDATE...）；任务分解、进度反馈、结论均用中文表达。',
    '若用户要求将修改写入工作区，请在回复中使用 ```workspace-write``` 代码块，内容为 JSON：单文件 {"path":"相对路径","content":"完整正文"}；或多文件数组。',
    opts.workspaceDir
      ? `当前用户工作区路径（仅供参考）: ${opts.workspaceDir}`
      : '当前用户工作区路径（仅供参考）: （未选择）',
    executionSnapshot,
  ]

  const sys = { role: 'system', content: sysParts.join('\n') }
  const core: { role: string; content: string; images?: string[] }[] = []

  for (const m of opts.priorHistory) {
    if (m.role !== 'user' && m.role !== 'assistant') continue
    if (m.role === 'user') {
      core.push(userTurnToApiPayload({ role: 'user', content: m.content, attachments: m.attachments }))
    } else {
      core.push({ role: 'assistant', content: m.content })
    }
  }
  core.push(
    userTurnToApiPayload({
      role: 'user',
      content: opts.userLine,
      attachments: opts.userAttachments,
    }),
  )

  return [sys, ...core]
}

function workspaceDirTrimmed(dir: string | null): dir is string {
  return typeof dir === 'string' && dir.trim().length > 0
}
