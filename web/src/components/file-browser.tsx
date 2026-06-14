import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  File,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  RefreshCw,
  Search,
} from "lucide-react";
import { ExplorerTreeIcon } from "@/lib/explorer-file-icon";
import { EXPLORER_TREE_BASE_PADDING_PX, EXPLORER_TREE_INDENT_PX, isHiddenExplorerName } from "@/lib/explorer-tree-theme";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type FileTreeItem = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  ext?: string;
  children?: FileTreeItem[];
  expanded?: boolean;
};

interface FileBrowserProps {
  workspaceRoot?: string | null;
  tree?: FileTreeItem[];
  onFileClick?: (path: string, name: string, type: 'file' | 'dir') => void;
  onRefresh?: () => void;
  onCreateFile?: (parentPath: string, name: string) => void;
  onCreateFolder?: (parentPath: string, name: string) => void;
  onDelete?: (path: string, type: 'file' | 'dir') => void;
  onRename?: (oldPath: string, newName: string) => void;
  className?: string;
}

export function FileBrowser({
  workspaceRoot,
  tree = [],
  onFileClick,
  onRefresh,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  className,
}: FileBrowserProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleFileClick = useCallback((item: FileTreeItem) => {
    if (item.type === 'dir') {
      toggleExpanded(item.path);
    }
    onFileClick?.(item.path, item.name, item.type);
  }, [toggleExpanded, onFileClick]);

  const startRename = useCallback((item: FileTreeItem) => {
    setEditingPath(item.path);
    setEditingName(item.name);
  }, []);

  const confirmRename = useCallback((oldPath: string, newName: string) => {
    if (newName && newName.trim()) {
      onRename?.(oldPath, newName.trim());
    }
    setEditingPath(null);
    setEditingName('');
  }, [onRename]);

  const renderTreeItem = (item: FileTreeItem, level: number = 0) => {
    const isExpanded = expandedPaths.has(item.path);
    const isEditing = editingPath === item.path;

    return (
      <div key={item.path} className="select-none">
        <div
          className="explorer-tree-row group flex cursor-pointer items-center gap-0 pr-2"
          style={{ paddingLeft: `${EXPLORER_TREE_BASE_PADDING_PX + level * EXPLORER_TREE_INDENT_PX}px` }}
          onClick={() => handleFileClick(item)}
        >
          {item.type === "dir" ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.path);
              }}
              className="explorer-tree-twistie flex items-center justify-center"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[var(--explorer-twistie)]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--explorer-twistie)]" />
              )}
            </button>
          ) : (
            <span className="explorer-tree-twistie" aria-hidden />
          )}

          {item.type === "dir" ? (
            <ExplorerTreeIcon fileName={item.name} isDir expanded={isExpanded} />
          ) : (
            <ExplorerTreeIcon
              ext={item.ext ?? (item.name.includes(".") ? item.name.split(".").pop() : undefined)}
              fileName={item.name}
            />
          )}

          {isEditing ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => confirmRename(item.path, editingName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename(item.path, editingName);
                if (e.key === 'Escape') {
                  setEditingPath(null);
                  setEditingName('');
                }
              }}
              className="h-6 py-0 px-1 text-sm"
              autoFocus
            />
          ) : (
            <span
              className={cn(
                "explorer-tree-label",
                isHiddenExplorerName(item.name) && "explorer-tree-label-dimmed",
              )}
            >
              {item.name}
            </span>
          )}
          
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startRename(item)}>
                  <Edit className="h-4 w-4 mr-2" />
                  重命名
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(item.path, item.type)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {item.type === 'dir' && isExpanded && item.children?.map(child =>
          renderTreeItem(child, level + 1)
        )}
      </div>
    );
  };

  if (!workspaceRoot) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center text-center p-4", className)}>
        <Folder className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">没有选择工作区</h3>
        <p className="text-sm text-muted-foreground">请选择一个工作区文件夹</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center gap-2 p-2 border-b">
        <h3 className="font-semibold text-sm flex-1">文件浏览器</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreateFile?.(workspaceRoot, 'new-file.txt')}>
              <File className="h-4 w-4 mr-2" />
              新建文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateFolder?.(workspaceRoot, 'new-folder')}>
              <Folder className="h-4 w-4 mr-2" />
              新建文件夹
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索文件..."
            className="h-8 pl-7 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1 bg-sidebar">
        <div className="py-0.5">
          {tree.map((item) => renderTreeItem(item))}
        </div>
      </ScrollArea>
    </div>
  );
}
