/** gitDecoration 语义色 */
export type ExplorerGitTone = "modified" | "untracked" | "added" | "deleted" | "renamed" | "neutral";

export function gitStatusTone(letter: string | undefined): ExplorerGitTone {
  switch (letter) {
    case "M":
      return "modified";
    case "U":
      return "untracked";
    case "A":
    case "C":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    default:
      return "neutral";
  }
}

export function explorerGitLabelClass(tone: ExplorerGitTone): string {
  if (tone === "neutral") return "explorer-git-label-neutral";
  return `explorer-git-label-${tone}`;
}

export function explorerGitStatusClass(tone: ExplorerGitTone): string {
  if (tone === "neutral") return "explorer-tree-status-neutral";
  return `explorer-tree-status-${tone}`;
}

export function isHiddenExplorerName(name: string): boolean {
  return name.startsWith(".");
}

/** 每级缩进像素 — 与 VS Code workbench.tree.indent 默认 8 一致 */
export const EXPLORER_TREE_INDENT_PX = 8;
export const EXPLORER_TREE_BASE_PADDING_PX = 4;
