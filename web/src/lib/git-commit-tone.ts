export type GitCommitTone = "primary" | "info" | "success" | "warning" | "muted";

/** 按 conventional commit 前缀分配语义色，便于侧栏提交图谱区分 */
export function gitCommitToneFromSubject(subject: string): GitCommitTone {
  const m = subject.match(/^(\w+)(?:\([^)]*\))?!?:/);
  const type = m?.[1]?.toLowerCase();
  switch (type) {
    case "feat":
    case "feature":
      return "primary";
    case "fix":
      return "warning";
    case "docs":
      return "info";
    case "refactor":
    case "perf":
      return "success";
    case "chore":
    case "style":
    case "test":
    case "ci":
    case "build":
      return "muted";
    default:
      return "info";
  }
}
