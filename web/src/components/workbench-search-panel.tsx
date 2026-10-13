import { useCallback, useMemo, useState } from "react";
import {
  CaseSensitive,
  FileSearch,
  Loader2,
  Regex,
  Replace,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { WORKBENCH_SIDEPANEL_OFFLINE } from "@/lib/ui-copy";
import { SetiFileIcon } from "@/lib/seti/seti-file-icon";

type Hit = { relPath: string; line: number; text: string };

/** 左侧栏「搜索」：工作区 ripgrep + 替换，Search */
export function WorkbenchSearchPanel() {
  const hasDesktop = useHasDesktop();
  const ws = useWorkbenchWorkspace();
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [includeGlob, setIncludeGlob] = useState("");
  const [excludeGlob, setExcludeGlob] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchOpts = useMemo(
    () => ({
      caseSensitive,
      regex: useRegex,
      includeGlob: includeGlob.trim() || undefined,
      excludeGlob: excludeGlob.trim() || undefined,
    }),
    [caseSensitive, useRegex, includeGlob, excludeGlob],
  );

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    const api = getDesktop();
    if (!api?.workspaceRipgrep) {
      toast.error("搜索不可用");
      return;
    }
    setSearching(true);
    setSearched(true);
    try {
      const boostPaths = ws.editorTabs
        .filter((t) => t.kind === "file")
        .map((t) => t.relPath)
        .slice(0, 12);
      const res = await api.workspaceRipgrep({
        query: q,
        maxResults: 100,
        boostPaths,
        ...searchOpts,
      });
      if (!res.ok) {
        toast.error(res.error || "搜索失败");
        setHits([]);
        return;
      }
      setHits(res.hits ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "搜索失败");
      setHits([]);
    } finally {
      setSearching(false);
    }
  }, [query, searchOpts, ws.editorTabs]);

  const runReplaceAll = useCallback(async () => {
    const q = query.trim();
    if (!q || !hits.length) return;
    const api = getDesktop();
    const readFn = api?.readWorkspaceTextFile;
    const writeFence = api?.workspaceApplyWriteFence;
    if (!readFn || !writeFence) {
      toast.error("替换不可用");
      return;
    }
    setReplacing(true);
    try {
      let pattern: RegExp;
      try {
        pattern = useRegex
          ? new RegExp(q, caseSensitive ? "g" : "gi")
          : new RegExp(escapeRegExp(q), caseSensitive ? "g" : "gi");
      } catch {
        toast.error("正则无效");
        return;
      }
      const files = [...new Set(hits.map((h) => h.relPath))];
      const items: { path: string; content: string }[] = [];
      let changedFiles = 0;
      for (const rel of files) {
        const r = await readFn(rel);
        if (!r?.ok || typeof r.text !== "string") continue;
        const next = r.text.replace(pattern, replaceText);
        if (next === r.text) continue;
        items.push({ path: rel, content: next });
        changedFiles += 1;
      }
      if (!items.length) {
        toast.message("无文件需要替换");
        return;
      }
      const applied = await writeFence(items);
      if (!applied?.ok) {
        toast.error(applied?.error || "写入失败");
        return;
      }
      toast.success(`已替换 ${changedFiles} 个文件`);
      void ws.refreshFiles();
      await runSearch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "替换失败");
    } finally {
      setReplacing(false);
    }
  }, [
    query,
    hits,
    useRegex,
    caseSensitive,
    replaceText,
    runSearch,
    ws,
  ]);

  if (!hasDesktop) {
    return (
      <p className="p-3 text-[13px] leading-relaxed text-muted-foreground">
        {WORKBENCH_SIDEPANEL_OFFLINE}
      </p>
    );
  }

  const grouped = groupHits(hits);

  return (
    <div className="sc-panel flex h-full min-h-0 flex-col">
      <div className="sc-panel-title-row">
        <span className="sc-panel-title">搜索</span>
        <button
          type="button"
          className={cn(
            "workbench-icon-btn workbench-icon-btn--sm",
            showReplace && "workbench-icon-btn--active",
          )}
          title={showReplace ? "隐藏替换" : "显示替换"}
          aria-label={showReplace ? "隐藏替换" : "显示替换"}
          aria-pressed={showReplace}
          onClick={() => setShowReplace((v) => !v)}
        >
          <Replace className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex shrink-0 flex-col gap-1 border-b border-[var(--explorer-border)] px-2 py-1.5">
        <div className="flex items-center gap-1">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
            placeholder="在文件中搜索"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            aria-label="搜索内容"
          />
          <ToggleIcon
            pressed={caseSensitive}
            title="区分大小写"
            onClick={() => setCaseSensitive((v) => !v)}
          >
            <CaseSensitive className="h-3.5 w-3.5" />
          </ToggleIcon>
          <ToggleIcon
            pressed={useRegex}
            title="使用正则"
            onClick={() => setUseRegex((v) => !v)}
          >
            <Regex className="h-3.5 w-3.5" />
          </ToggleIcon>
          <button
            type="button"
            className="workbench-icon-btn workbench-icon-btn--sm"
            title="搜索"
            aria-label="搜索"
            disabled={searching || !query.trim()}
            onClick={() => void runSearch()}
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSearch className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {showReplace ? (
          <div className="flex items-center gap-1 pl-5">
            <Replace className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runReplaceAll();
              }}
              placeholder="替换为"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              aria-label="替换内容"
            />
            <button
              type="button"
              className="shrink-0 rounded px-1.5 py-0.5 text-[12px] font-medium text-primary hover:bg-primary/10 disabled:opacity-40"
              disabled={replacing || !hits.length || !query.trim()}
              onClick={() => void runReplaceAll()}
            >
              {replacing ? "…" : "全部替换"}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-1 pl-5">
          <input
            type="text"
            value={includeGlob}
            onChange={(e) => setIncludeGlob(e.target.value)}
            placeholder="包含 · 如 **/*.ts"
            className="min-w-0 flex-1 rounded border border-[var(--explorer-border)] bg-transparent px-1.5 py-0.5 text-[12px] outline-none placeholder:text-muted-foreground"
            aria-label="包含路径"
          />
          <input
            type="text"
            value={excludeGlob}
            onChange={(e) => setExcludeGlob(e.target.value)}
            placeholder="排除 · 如 **/test/**"
            className="min-w-0 flex-1 rounded border border-[var(--explorer-border)] bg-transparent px-1.5 py-0.5 text-[12px] outline-none placeholder:text-muted-foreground"
            aria-label="排除路径"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {searching ? (
          <p className="px-3 py-2 text-[13px] text-muted-foreground">搜索中…</p>
        ) : null}
        {!searching && searched && hits.length === 0 ? (
          <p className="px-3 py-2 text-[13px] text-muted-foreground">无匹配结果</p>
        ) : null}
        {!searching && !searched ? (
          <p className="px-3 py-2 text-[13px] text-muted-foreground">输入关键词后按 Enter</p>
        ) : null}
        <ul className="py-0.5">
          {grouped.map((g) => (
            <li key={g.relPath} className="mb-1">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-[13px] font-medium text-foreground hover:bg-[var(--explorer-row-hover)]"
                onClick={() => void ws.openFile(g.relPath)}
                title={g.relPath}
              >
                <SetiFileIcon fileName={g.relPath.split("/").pop()} className="text-[14px]" />
                <span className="truncate">{g.relPath}</span>
                <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                  {g.hits.length}
                </span>
              </button>
              <ul>
                {g.hits.slice(0, 12).map((h, i) => (
                  <li key={`${h.line}-${i}`}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full gap-2 px-2 py-0.5 pl-7 text-left font-mono text-[12px] text-muted-foreground",
                        "hover:bg-[var(--explorer-row-hover)] hover:text-foreground",
                      )}
                      onClick={() => void ws.openFile(g.relPath, { line: h.line })}
                      title={`${h.relPath}:${h.line}`}
                    >
                      <span className="w-8 shrink-0 tabular-nums text-muted-foreground">{h.line}</span>
                      <span className="min-w-0 truncate">{h.text.trim()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ToggleIcon({
  pressed,
  title,
  onClick,
  children,
}: {
  pressed: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "workbench-icon-btn workbench-icon-btn--sm",
        pressed && "workbench-icon-btn--active",
      )}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function groupHits(hits: Hit[]): { relPath: string; hits: Hit[] }[] {
  const map = new Map<string, Hit[]>();
  for (const h of hits) {
    const list = map.get(h.relPath) ?? [];
    list.push(h);
    map.set(h.relPath, list);
  }
  return [...map.entries()].map(([relPath, list]) => ({ relPath, hits: list }));
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
