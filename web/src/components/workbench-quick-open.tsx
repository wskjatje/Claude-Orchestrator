import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getDesktop } from "@/lib/desktop-api";
import { flattenPanelTreeFiles, rankFilePaths } from "@/lib/workbench-flat-files";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { SetiFileIcon } from "@/lib/seti/seti-file-icon";

/**
 * Cursor 式「转到文件」：Cmd/Ctrl+P，基于真实 listWorkspacePanelTree，无占位数据。
 * 空查询时优先展示已打开编辑器 tab（最近打开）。
 */
export function WorkbenchQuickOpen({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ws = useWorkbenchWorkspace();
  const [query, setQuery] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const recentPaths = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const t of ws.editorTabs) {
      if (t.kind !== "file") continue;
      const p = t.relPath.replace(/\\/g, "/");
      if (seen.has(p)) continue;
      seen.add(p);
      out.push(p);
    }
    return out;
  }, [ws.editorTabs]);

  const load = useCallback(async () => {
    const api = getDesktop();
    if (!api?.listWorkspacePanelTree) {
      toast.error("工作区文件列表不可用");
      return;
    }
    setLoading(true);
    try {
      const r = await api.listWorkspacePanelTree();
      if (!r?.ok) {
        toast.error(r?.error || "无法读取工作区文件树");
        setPaths([]);
        return;
      }
      setPaths(flattenPanelTreeFiles(r.tree));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "读取文件树失败");
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    void load();
  }, [open, load]);

  const q = query.trim();
  const ranked = rankFilePaths(paths, q, 100);
  const showRecent = !q && recentPaths.length > 0;
  const list = showRecent
    ? [
        ...recentPaths,
        ...ranked.filter((p) => !recentPaths.includes(p)).slice(0, 80),
      ]
    : ranked;

  const pick = async (relPath: string) => {
    onOpenChange(false);
    await ws.openFile(relPath, { pin: true });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="转到文件…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{loading ? "加载文件列表…" : "无匹配文件"}</CommandEmpty>
        {showRecent ? (
          <CommandGroup heading="已打开">
            {recentPaths.map((p) => {
              const base = p.slice(p.lastIndexOf("/") + 1);
              return (
                <CommandItem
                  key={`recent-${p}`}
                  value={`recent ${p}`}
                  onSelect={() => void pick(p)}
                  className="gap-2"
                >
                  <SetiFileIcon fileName={base} className="text-[14px]" />
                  <span className="min-w-0 truncate font-mono text-[12px]">{p}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}
        <CommandGroup heading={loading ? undefined : showRecent ? "工作区" : `${list.length} 个文件`}>
          {(showRecent ? ranked.filter((p) => !recentPaths.includes(p)).slice(0, 80) : list).map(
            (p) => {
              const base = p.slice(p.lastIndexOf("/") + 1);
              return (
                <CommandItem
                  key={p}
                  value={p}
                  onSelect={() => void pick(p)}
                  className="gap-2"
                >
                  <SetiFileIcon fileName={base} className="text-[14px]" />
                  <span className="min-w-0 truncate font-mono text-[12px]">{p}</span>
                </CommandItem>
              );
            },
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
