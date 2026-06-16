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

/**
 * 本机文件选择（引用附件 / 图片）。
 * @returns {{ canceled: boolean, filePaths: string[] }}
 */
export function pickReferenceFilesNative(opts = {}) {
  const title = String(opts.title || '选择引用文件').replace(/"/g, '\\"')
  const multiple = opts.multiple === true
  const onlyImages = opts.onlyImages === true

  if (process.platform === 'darwin') {
    const typeClause = onlyImages
      ? ' of type {"public.image", "PNG", "JPEG", "GIF", "WebP", "TIFF", "BMP"}'
      : ''
    const script = multiple
      ? `(POSIX path of (choose file with prompt "${title}"${typeClause} with multiple selections allowed))`
      : `(POSIX path of (choose file with prompt "${title}"${typeClause}))`
    const r = spawnSync('osascript', ['-e', script], { encoding: 'utf8' })
    if (r.status !== 0 || !r.stdout?.trim()) {
      return { canceled: true, filePaths: [] }
    }
    const paths = r.stdout
      .trim()
      .split(', ')
      .map((p) => p.trim())
      .filter(Boolean)
    return { canceled: false, filePaths: paths }
  }

  if (process.platform === 'linux') {
    const args = ['--file-selection', `--title=${title}`]
    if (multiple) args.push('--multiple')
    if (onlyImages) args.push('--file-filter=Images | *.png *.jpg *.jpeg *.gif *.webp')
    const r = spawnSync('zenity', args, { encoding: 'utf8' })
    if (r.status !== 0 || !r.stdout?.trim()) {
      return { canceled: true, filePaths: [] }
    }
    return {
      canceled: false,
      filePaths: r.stdout
        .trim()
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean),
    }
  }

  return { canceled: true, filePaths: [] }
}
