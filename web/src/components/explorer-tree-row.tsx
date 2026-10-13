import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExplorerTreeIcon } from "@/lib/explorer-file-icon";
import {
  EXPLORER_TREE_BASE_PADDING_PX,
  EXPLORER_TREE_INDENT_PX,
  explorerGitLabelClass,
  explorerGitStatusClass,
  gitStatusTone,
  isHiddenExplorerName,
} from "@/lib/explorer-tree-theme";
import type { WorkspacePanelTreeNode } from "@/types/desktop";

export function ExplorerTreeRow({
  node,
  depth,
  pathKey,
  selectedRelPath,
  expandedDirs,
  onToggleDir,
  gitStatusByPath,
  gitHasDecoration,
  recentWrittenPaths,
  onOpenFile,
  onPinFile,
}: {
  node: WorkspacePanelTreeNode;
  depth: number;
  pathKey: string;
  selectedRelPath: string | null;
  expandedDirs: Set<string>;
  onToggleDir: (key: string) => void;
  gitStatusByPath: Map<string, string>;
  gitHasDecoration: Set<string>;
  recentWrittenPaths?: Set<string>;
  onOpenFile: (relPath: string) => void;
  /** 双击固定标签（非预览） */
  onPinFile?: (relPath: string) => void;
}) {
  const isDir = node.type === "dir";
  const key = pathKey ? `${pathKey}/${node.name}` : node.name;
  const expanded = isDir && expandedDirs.has(key);
  const selected = !isDir && selectedRelPath === key;
  const statusLetter = gitStatusByPath.get(key);
  const gitTone = gitStatusTone(statusLetter);
  const showFolderDot = isDir && gitHasDecoration.has(key) && !statusLetter;
  const recentWritten =
    !isDir &&
    Boolean(
      recentWrittenPaths?.has(key) ||
        [...(recentWrittenPaths || [])].some(
          (p) => p === key || p.endsWith("/" + key) || key.endsWith("/" + p),
        ),
    );
  const hiddenName = isHiddenExplorerName(node.name);
  const gitLabelClass = statusLetter ? explorerGitLabelClass(gitTone) : "explorer-git-label-neutral";

  return (
    <li className="explorer-tree-node">
      <button
        type="button"
        onClick={() => {
          if (isDir) onToggleDir(key);
          else onOpenFile(key);
        }}
        onDoubleClick={() => {
          if (!isDir) (onPinFile || onOpenFile)(key);
        }}
        className={cn(
          "explorer-tree-row group/row flex w-full items-center gap-0 pr-0 text-left",
          selected && "explorer-tree-row-active",
          recentWritten && "explorer-tree-row-recent-write",
        )}
        style={{ paddingLeft: `${EXPLORER_TREE_BASE_PADDING_PX + depth * EXPLORER_TREE_INDENT_PX}px` }}
        title={recentWritten ? `${key} · 刚写入` : key}
      >
        {depth > 0 ? (
          <span className="explorer-tree-guides" aria-hidden>
            {Array.from({ length: depth }, (_, i) => (
              <span
                key={i}
                className="explorer-tree-guide"
                style={{ left: `${EXPLORER_TREE_BASE_PADDING_PX + i * EXPLORER_TREE_INDENT_PX + EXPLORER_TREE_INDENT_PX / 2}px` }}
              />
            ))}
          </span>
        ) : null}

        {isDir ? (
          <span
            className="explorer-tree-twistie flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDir(key);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--explorer-twistie)]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--explorer-twistie)]" />
            )}
          </span>
        ) : (
          <>
            <span className="explorer-tree-twistie" aria-hidden />
            <ExplorerTreeIcon ext={node.ext} fileName={node.name} isDir={false} />
          </>
        )}

        <span
          className={cn(
            "explorer-tree-label",
            hiddenName && !selected && !statusLetter && "explorer-tree-label-dimmed",
            gitLabelClass,
          )}
        >
          {node.name}
        </span>

        <span className="explorer-tree-meta">
          {statusLetter ? (
            <span
              className={cn("explorer-tree-status", explorerGitStatusClass(gitTone))}
              title={`Git: ${statusLetter}`}
            >
              {statusLetter}
            </span>
          ) : null}
          {showFolderDot ? (
            <span className="explorer-tree-modified" title="子项有未提交变更" aria-label="子项有未提交变更" />
          ) : null}
        </span>
      </button>

      {isDir && expanded && node.children?.length ? (
        <ul>
          {node.children.map((c, i) => (
            <ExplorerTreeRow
              key={`${key}/${c.name}-${i}`}
              node={c}
              depth={depth + 1}
              pathKey={key}
              selectedRelPath={selectedRelPath}
              expandedDirs={expandedDirs}
              onToggleDir={onToggleDir}
              gitStatusByPath={gitStatusByPath}
              gitHasDecoration={gitHasDecoration}
              recentWrittenPaths={recentWrittenPaths}
              onOpenFile={onOpenFile}
              onPinFile={onPinFile}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
