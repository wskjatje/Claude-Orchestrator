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
    return "远程仓库有新提交，请先在「个人仓库」点「拉取」，合并成功后再推送。"
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
