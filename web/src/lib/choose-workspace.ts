import { toast } from 'sonner'
import type { DesktopApi } from '@/types/desktop'

/** 工作区切换类提示共用同一 id，新提示替换旧提示，避免堆叠 */
const WORKSPACE_TOAST_ID = 'workbench-workspace-toast'

function workspaceToastSuccess(title: string, description: string) {
  toast.success(title, { id: WORKSPACE_TOAST_ID, description, duration: 4000 })
}

function workspaceToastError(title: string, description?: string, duration = 6000) {
  toast.error(title, { id: WORKSPACE_TOAST_ID, description, duration })
}

/**
 * 选择工作区并在 UI 给出反馈（macOS 会弹出本机目录选择框；取消时不打扰）。
 */
export async function chooseWorkspaceWithFeedback(
  api: DesktopApi,
): Promise<string | null> {
  try {
    const p = await api.chooseWorkspace()
    if (p && typeof p === 'string') {
      workspaceToastSuccess('已设为当前工作区', p)
      return p
    }
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/Bridge|ECONNREFUSED|500|fetch/i.test(msg)) {
      workspaceToastError(
        'Web Bridge 未连接',
        '请先运行 npm run web:dev:full 或 npm run bridge，然后刷新页面。',
        8000,
      )
      return null
    }
    const manual = window.prompt(
      `无法打开目录选择器（${msg}）。请粘贴工作区绝对路径：`,
      '',
    )
    if (!manual?.trim()) return null
    try {
      const p = await api.chooseWorkspace(manual.trim())
      if (p && typeof p === 'string') {
        workspaceToastSuccess('已设为当前工作区', p)
        return p
      }
      workspaceToastError('路径无效或不存在', manual.trim())
    } catch (e2) {
      workspaceToastError(e2 instanceof Error ? e2.message : String(e2))
    }
    return null
  }
}

/** 从历史记录或已知路径打开工作区（写入 SQLite 打开历史） */
export async function openWorkspacePathWithFeedback(
  api: DesktopApi,
  targetPath: string,
): Promise<string | null> {
  const trimmed = targetPath.trim()
  if (!trimmed) return null
  try {
    const p = await api.chooseWorkspace(trimmed)
    if (p && typeof p === 'string') {
      workspaceToastSuccess('已打开工作区', p)
      return p
    }
    return null
  } catch (e) {
    workspaceToastError(e instanceof Error ? e.message : String(e))
    return null
  }
}
