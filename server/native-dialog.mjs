import { spawnSync } from 'node:child_process'

/**
 * 本机目录选择（Web Bridge 无 Electron dialog 时使用）。
 * @returns {string | null} 绝对路径；用户取消或平台不支持时 null
 */
export function pickFolderNative(title = '选择 Claude 工作区目录') {
  if (process.platform === 'darwin') {
    const script = `POSIX path of (choose folder with prompt "${title.replace(/"/g, '\\"')}")`
    const r = spawnSync('osascript', ['-e', script], { encoding: 'utf8' })
    if (r.status === 0 && r.stdout?.trim()) {
      return r.stdout.trim()
    }
    return null
  }
  if (process.platform === 'linux') {
    const r = spawnSync(
      'zenity',
      ['--file-selection', '--directory', `--title=${title}`],
      { encoding: 'utf8' },
    )
    if (r.status === 0 && r.stdout?.trim()) {
      return r.stdout.trim()
    }
    return null
  }
  if (process.platform === 'win32') {
    try {
      const ps = `
Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = '${title.replace(/'/g, "''")}'
if ($dlg.ShowDialog() -eq 'OK') { Write-Output $dlg.SelectedPath }
`
      const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
      if (r.status === 0 && r.stdout?.trim()) {
        return r.stdout.trim()
      }
    } catch {
      /* ignore */
    }
    return null
  }
  return null
}
