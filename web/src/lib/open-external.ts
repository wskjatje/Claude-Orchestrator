import { getDesktop } from '@/lib/desktop-api'

/** 在 Electron 中用系统浏览器打开；否则退回 window.open */
export async function openExternalUrl(url: string): Promise<void> {
  const d = getDesktop()
  if (d?.openExternal) {
    await d.openExternal(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
