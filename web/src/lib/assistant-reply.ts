import { defaultArtifactPathForAgent } from "@/lib/agent-artifact-paths";
import type { DesktopApi } from '@/types/desktop'

/** 是否为 active-chain / 任务链顶层结构（与写文件 JSON 区分） */
function looksLikeActiveChainJson(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false
  const steps = (obj as { steps?: unknown }).steps
  if (!Array.isArray(steps) || steps.length === 0) return false
  const first = steps[0]
  if (!first || typeof first !== 'object') return false
  return (
    'agentName' in (first as object) ||
    'instruction' in (first as object)
  )
}

function normalizeWorkspaceWriteItem(item: unknown): { path: string; content: string } | null {
  if (!item || typeof item !== 'object') return null
  const o = item as Record<string, unknown>
  const rel =
    typeof o.path === 'string'
      ? o.path
      : typeof o.file === 'string'
        ? o.file
        : ''
  const p = rel.trim()
  if (!p) return null
  const content = o.content != null ? String(o.content) : ''
  return { path: p.replace(/\\/g, '/'), content }
}

/**
 * 从气泡全文提取 `{ path, content }[]`（支持 ```workspace-write、```json 包住的数组/单对象，以及裸 JSON）。
 * 用于右键「从本条生成…」在模型只给出写文件结构时也能落盘。
 */
export function parseWorkspaceWriteItemsFromBubble(text: string): { path: string; content: string }[] {
  if (!text || typeof text !== 'string') return []
  const map = new Map<string, string>()

  function absorbParsed(parsed: unknown) {
    if (looksLikeActiveChainJson(parsed)) return
    if (Array.isArray(parsed)) {
      for (const el of parsed) {
        const n = normalizeWorkspaceWriteItem(el)
        if (n) map.set(n.path, n.content)
      }
      return
    }
    const one = normalizeWorkspaceWriteItem(parsed)
    if (one) map.set(one.path, one.content)
  }

  for (const item of parseWorkspaceWriteFences(text)) {
    const n = normalizeWorkspaceWriteItem(item)
    if (n) map.set(n.path, n.content)
  }

  const fenceRe = /```(?:json)\s*([\s\S]*?)```/gi
  let m: RegExpExecArray | null
  while ((m = fenceRe.exec(text)) !== null) {
    const chunk = m[1].trim()
    if (!chunk) continue
    try {
      absorbParsed(JSON.parse(chunk))
    } catch {
      /* ignore */
    }
  }

  const t = text.trim()
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      absorbParsed(JSON.parse(t))
    } catch {
      /* ignore */
    }
  }

  return Array.from(map.entries()).map(([path, content]) => ({ path, content }))
}

/** `content` 内常见 Markdown 代码块含 ```；非贪婪正则会在第一个 ``` 处截断导致 JSON.parse 失败，故用括号+字符串状态机找整条 JSON。 */
function findTopLevelJsonEnd(s: string, start: number): number {
  let i = start
  while (i < s.length && /\s/.test(s[i])) i++
  const c0 = s[i]
  if (c0 !== '{' && c0 !== '[') return -1

  let depth = 0
  let inStr = false
  let esc = false

  for (; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) {
        esc = false
        continue
      }
      if (c === '\\') {
        esc = true
        continue
      }
      if (c === '"') {
        inStr = false
        continue
      }
      continue
    }
    if (c === '"') {
      inStr = true
      continue
    }
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return -1
}

const WORKSPACE_WRITE_FENCE_OPEN = /(?:```|''')\s*`?\s*workspace-write\s*`?\s*\n?/gi

/**
 * 每个 workspace-write 围栏：整段起止下标（含围栏），供剥离气泡；JSON 正文起止供解析。
 */
function findWorkspaceWriteBlocks(text: string): { outerStart: number; outerEnd: number; json: string }[] {
  const blocks: { outerStart: number; outerEnd: number; json: string }[] = []
  const openRe = new RegExp(WORKSPACE_WRITE_FENCE_OPEN.source, 'gi')
  let searchFrom = 0
  let m: RegExpExecArray | null
  while (true) {
    openRe.lastIndex = searchFrom
    m = openRe.exec(text)
    if (!m) break
    const outerStart = m.index
    const bodyStart = m.index + m[0].length
    const relJson = text.slice(bodyStart).search(/[{\[]/)
    if (relJson === -1) {
      searchFrom = m.index + 1
      continue
    }
    const absJsonStart = bodyStart + relJson
    const jsonEnd = findTopLevelJsonEnd(text, absJsonStart)
    if (jsonEnd === -1) {
      searchFrom = m.index + 1
      continue
    }
    let outerEnd = jsonEnd
    while (outerEnd < text.length && /\s/.test(text[outerEnd])) outerEnd++
    const tail = text.slice(outerEnd)
    const closeFence = tail.match(/^(?:```|''')/)
    if (closeFence) outerEnd += closeFence[0].length

    const json = text.slice(absJsonStart, jsonEnd).trim()
    blocks.push({ outerStart, outerEnd, json })
    searchFrom = outerEnd
  }
  return blocks
}

export function parseWorkspaceWriteFences(text: string): unknown[] {
  if (!text || typeof text !== 'string') return []
  const blocks = findWorkspaceWriteBlocks(text)
  const out: unknown[] = []
  for (const { json: chunk } of blocks) {
    try {
      const parsed = JSON.parse(chunk)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') out.push(item)
        }
      } else if (parsed && typeof parsed === 'object') {
        out.push(parsed)
      }
    } catch {
      /* invalid JSON */
    }
  }
  return out
}

/** 去掉 workspace-write 整块（含围栏），避免聊天记录刷屏 */
export function stripWorkspaceWriteFencesForHistory(text: string): string {
  const blocks = findWorkspaceWriteBlocks(text)
  if (!blocks.length) return text
  let out = text
  for (let i = blocks.length - 1; i >= 0; i--) {
    const { outerStart, outerEnd } = blocks[i]
    out = out.slice(0, outerStart) + out.slice(outerEnd)
  }
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

export async function ingestAssistantWorkspaceWrites(
  desktop: DesktopApi,
  assistantText: string,
  onToast?: (msg: string) => void,
): Promise<{ n: number; paths: string[] }> {
  const fenceBlocks = findWorkspaceWriteBlocks(assistantText)
  const items = parseWorkspaceWriteFences(assistantText)
  if (fenceBlocks.length > 0 && items.length === 0) {
    onToast?.(
      '识别到 workspace-write 围栏，但内部 JSON 解析失败（常见于正文含未转义的引号、或非合法 JSON）。PRD 若在 content 里含 Markdown 代码块，仍须是**合法 JSON 字符串**（换行用 \\n）。可缩短正文或拆成多个文件再写。',
    )
  }
  if (!items.length) return { n: 0, paths: [] }
  try {
    const res = await desktop.workspaceApplyWriteFence(items)
    if (res?.written?.length) {
      return { n: res.written.length, paths: res.written }
    }
    if (res && res.ok === false && res.error) {
      onToast?.(`未能写入工作区：${res.error}`)
    } else if (res?.errors?.length) {
      onToast?.(`部分路径未写入：${res.errors.slice(0, 2).join('; ')}`)
    }
  } catch (e) {
    onToast?.(`工作区写入异常：${String(e)}`)
  }
  return { n: 0, paths: [] }
}

/**
 * 已成功写入磁盘后，将助手回复折叠为简短说明，禁止把转义后的巨型 JSON 留在聊天历史。
 */
export function collapseWorkspaceWriteForHistory(
  fullText: string,
  writtenPaths: string[],
): string {
  if (!writtenPaths.length) return fullText
  let stripped = fullText.replace(/\n*【工作区已写入】[\s\S]*$/u, '').trim()
  stripped = stripped.replace(/\n*【未落盘】[\s\S]*$/u, '').trim()
  stripped = stripWorkspaceWriteFencesForHistory(stripped)
  const list = writtenPaths.map((p) => `- \`${p}\``).join('\n')
  const summary = `【工作区已写入】共 ${writtenPaths.length} 个文件：\n${list}`
  if (stripped.length > 0) {
    return `${stripped}\n\n${summary}`
  }
  return summary
}

/**
 * 执行写盘；若写成功则返回应用折叠后的正文（须写入会话历史），否则返回原文。
 */
/** 正文里像「已落盘」但没有任何可解析的 workspace-write 围栏（多为模型套模板虚构）。 */
function looksLikeFakeWorkspaceWriteClaim(text: string): boolean {
  const t = String(text || '')
  if (!t.trim()) return false
  if (findWorkspaceWriteBlocks(t).length > 0) return false
  if (/【工作区已写入】/.test(t)) return true
  if (/###\s*产物写盘/i.test(t)) return true
  if (/工作区已写入\s*共\s*\d+\s*个文件/i.test(t)) return true
  if (/已写入\s+[`'"]?(?:docs\/|\w)/i.test(t)) return true
  return false
}

export async function ingestWorkspaceWritesAndCollapseDisplay(
  desktop: DesktopApi,
  assistantText: string,
  onToast?: (msg: string) => void,
  meta?: { agentStem?: string; autoWriteProject?: boolean; defaultConfirmWritePath?: string },
): Promise<string> {

  // 单聊模式：所有 Agent 仅响应显式 workspace-write fence
  // 自动写默认路径和嗅探"已写入"的兜底不再执行
  // 任务链执行不受影响，走 ingestChainStepWorkspaceWrites
  const ing = await ingestAssistantWorkspaceWrites(desktop, assistantText, onToast)
  if (ing.n > 0 && ing.paths.length > 0) {
    return collapseWorkspaceWriteForHistory(assistantText, ing.paths)
  }
  if (looksLikeFakeWorkspaceWriteClaim(assistantText)) {
    onToast?.('检测到回复中含「已写入」等表述，但本轮无合法 workspace-write 围栏，未执行写盘。')
  }
  return assistantText
}

/** 任务链/WBS 每步：先解析 workspace-write；若无则客户端直接写 chain artifact，不再 RPC 到服务端 */
export async function ingestChainStepWorkspaceWrites(
  desktop: DesktopApi,
  assistantText: string,
  meta: { agentName: string; taskId?: string },
  onToast?: (msg: string) => void,
): Promise<{ displayText: string; writtenPaths: string[] }> {
  // Step 1: 解析 workspace-write fence
  const ing = await ingestAssistantWorkspaceWrites(desktop, assistantText, onToast)
  let written = ing.paths
  if (ing.n > 0 && written.length > 0) {
    return {
      displayText: collapseWorkspaceWriteForHistory(assistantText, written),
      writtenPaths: written,
    }
  }

  // Step 2: 无 fence → 系统自动落盘到该 Agent 的预设产物路径，不再需要模型操心写格式
  const body = assistantText.trim()
  if (body && meta.taskId) {
    const chainPath = defaultArtifactPathForAgent(meta.agentName)
    try {
      const res = await desktop.workspaceApplyWriteFence([
        { path: chainPath, content: body },
      ])
      if (res?.written?.length) {
        written = res.written
        onToast?.(`任务链步骤摘要已写入：${written.join('，')}`)
        return {
          displayText: collapseWorkspaceWriteForHistory(assistantText, written),
          writtenPaths: written,
        }
      }
    } catch (e) {
      onToast?.(`任务链步骤落盘异常：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Step 3: 处理假写入声明
  if (looksLikeFakeWorkspaceWriteClaim(assistantText)) {
    onToast?.(
      '检测到回复中含「工作区已写入」表述，但本轮无合法 workspace-write 围栏，未写盘。',
    )
  }
  return { displayText: assistantText, writtenPaths: written }
}

/**
 * 去掉助手气泡里「整段贴出」的大 JSON / 工具调用复述（常见于带 tools 的 Ollama 编排），避免聊天记录刷屏。
 * 已落盘的内容由 {@link ingestWorkspaceWritesAndCollapseDisplay} 另行折叠；此处仅处理未触发写盘解析的冗余块。
 */
export function stripLargeAssistantArtifacts(text: string, maxInnerLen = 2000): string {
  if (!text || typeof text !== 'string') return text
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi
  const removals: { start: number; end: number }[] = []
  let m: RegExpExecArray | null
  while ((m = fenceRe.exec(text)) !== null) {
    const inner = m[1].trim()
    if (inner.length < maxInnerLen) continue
    if (
      /workspace-write|workspace_write|"tool_calls"|"arguments"\s*:\s*\{|"name"\s*:\s*"workspace/i.test(
        inner,
      )
    ) {
      removals.push({ start: m.index, end: m.index + m[0].length })
    }
  }
  let out = text
  for (let i = removals.length - 1; i >= 0; i--) {
    const { start, end } = removals[i]!
    out = out.slice(0, start) + '\n（已省略大段工具/JSON 原文，请以工作区文件与下方要点为准。）\n' + out.slice(end)
  }
  const collapsed = out.replace(/\n{3,}/g, '\n\n').trim()
  /** 避免误删后只剩「---」等：若删完几乎无有效字符，则保留原文 */
  const meaningful = collapsed.replace(/[\s\-·=`]/gu, '').replace(/（已省略[^）]*）/g, '')
  if (meaningful.length < 12 && text.trim().length > meaningful.length + 30) {
    return text.trim()
  }
  return collapsed
}
