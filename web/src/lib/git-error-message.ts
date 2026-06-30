/** 从 git stderr/stdout 中提取用户可读的首条错误（跳过 To https:// 等进度行） */
export function formatGitErrorMessage(error?: string, fallback = "操作失败") {
  if (!error?.trim()) return fallback
  const lines = error
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  const skip = /^(To |From |remote:|Already up to date\.|\*\s+\[new branch\])/i

  const rejected = lines.some((l) => /rejected|fetch first|non-fast-forward/i.test(l))
  if (rejected) {
    return "推送被拒绝，请检查网络、权限或个人仓库地址。"
  }

  const isNetworkError = lines.some(
    (l) =>
      /Couldn't connect|Failed to connect|Connection timed out|ECONNREFUSED|ENETUNREACH|Could not resolve host/i.test(l),
  )
  if (isNetworkError) {
    return "网络无法连接 GitHub，请检查：① 是否可正常访问 github.com；② 代理（HTTP_PROXY/HTTPS_PROXY）是否正确配置；③ 可在下方「仓库配置」中切换 GitHub 镜像地址。"
  }

  const errLine = lines.find((l) => /^error:/i.test(l))
  if (errLine) return errLine.replace(/^error:\s*/i, "")

  const fatalLine = lines.find((l) => /^fatal:/i.test(l))
  if (fatalLine) return fatalLine.replace(/^fatal:\s*/i, "")

  const hintLine = lines.find((l) => /^hint:/i.test(l))
  if (hintLine) return hintLine.replace(/^hint:\s*/i, "")

  const useful = lines.find((l) => !skip.test(l) && !/^hint:/i.test(l))
  return useful || fallback
}
