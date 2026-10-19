import { useEffect, useMemo, useState } from "react";
import { ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { kindLabel, listFileOutline, type SymbolKind } from "@/lib/codemirror-symbol-nav";
import { getDesktop } from "@/lib/desktop-api";
import { fetchExternalLspDocumentSymbols } from "@/lib/workspace-tsservice-client";
import { isFileTab } from "@/types/workbench-editor";

function isTsLikePath(relPath: string) {
  return /\.(tsx?|jsx?|mjs|cjs)$/i.test(relPath);
}

function isExternalLspPath(relPath: string) {
  return /\.(py|go|rs)$/i.test(relPath);
}

function navKind(kind: string): SymbolKind {
  const k = kind.toLowerCase();
  if (k.includes("function") || k.includes("method")) return "function";
  if (k.includes("class") || k.includes("struct")) return "class";
  if (k.includes("interface")) return "interface";
  if (k.includes("enum")) return "enum";
  if (k.includes("typealias") || k === "typealias" || k.includes("type")) return "type";
  if (k.includes("property") || k.includes("variable") || k.includes("const") || k.includes("field"))
    return "variable";
  return "unknown";
}

type OutlineSource = "语言服务" | "LSP" | "当前文件";

/** 左侧栏 Outline：TS NavigationTree / 外部 LSP DocumentSymbol / 当前文件正则 */
export function WorkbenchOutlinePanel() {
  const ws = useWorkbenchWorkspace();
  const [filter, setFilter] = useState("");
  const active = ws.activeEditorTab;
  const fileTab = active && isFileTab(active) ? active : null;

  const tsLike = Boolean(fileTab && isTsLikePath(fileTab.relPath));
  const extLspLike = Boolean(fileTab && isExternalLspPath(fileTab.relPath));
  const [lsSymbols, setLsSymbols] = useState<ReturnType<typeof listFileOutline> | null>(null);
  const [source, setSource] = useState<OutlineSource>("当前文件");

  const outlinePath = fileTab?.relPath ?? "";
  const outlineContent = fileTab?.content ?? "";
  const outlineBusy = Boolean(fileTab?.binary || fileTab?.loading);

  useEffect(() => {
    if (!outlinePath || outlineBusy) {
      setLsSymbols(null);
      setSource("当前文件");
      return;
    }

    let cancelled = false;

    if (tsLike) {
      const api = getDesktop();
      if (!api?.workspaceTsNavigationTree) {
        setLsSymbols(null);
        setSource("当前文件");
        return;
      }
      void api
        .workspaceTsNavigationTree({
          relPath: outlinePath,
          content: outlineContent,
        })
        .then((res) => {
          if (cancelled) return;
          if (!res?.ok || !res.symbols?.length) {
            setLsSymbols(null);
            setSource("当前文件");
            return;
          }
          setSource("语言服务");
          setLsSymbols(
            res.symbols.map((s) => ({
              name: s.name,
              kind: navKind(s.kind),
              line: s.line,
              preview: s.name,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) {
            setLsSymbols(null);
            setSource("当前文件");
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (extLspLike) {
      void fetchExternalLspDocumentSymbols({
        relPath: outlinePath,
        content: outlineContent,
      }).then((symbols) => {
        if (cancelled) return;
        if (!symbols?.length) {
          setLsSymbols(null);
          setSource("当前文件");
          return;
        }
        setSource("LSP");
        setLsSymbols(
          symbols.map((s) => ({
            name: s.name,
            kind: navKind(s.kind),
            line: s.line,
            preview: s.name,
            depth: typeof s.depth === "number" ? s.depth : 0,
          })),
        );
      });
      return () => {
        cancelled = true;
      };
    }

    setLsSymbols(null);
    setSource("当前文件");
    return () => {
      cancelled = true;
    };
  }, [outlineBusy, outlineContent, outlinePath, tsLike, extLspLike]);

  const symbols = useMemo(() => {
    if (!fileTab || fileTab.binary || fileTab.loading) return [];
    if (lsSymbols?.length) return lsSymbols;
    return listFileOutline(fileTab.content || "");
  }, [fileTab, lsSymbols]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return symbols;
    return symbols.filter(
      (s) => s.name.toLowerCase().includes(q) || kindLabel(s.kind).includes(q),
    );
  }, [symbols, filter]);

  const displaySource: OutlineSource =
    lsSymbols?.length ? source : "当前文件";

  if (!fileTab) {
    return (
      <div className="flex h-full flex-col">
        <OutlineHeader />
        <p className="px-3 py-4 text-[13px] text-muted-foreground">打开文件以查看大纲</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <OutlineHeader
        subtitle={fileTab.relPath.split("/").pop() || fileTab.relPath}
        source={displaySource}
      />
      <div className="shrink-0 border-b border-[var(--explorer-border)] px-2 py-1.5">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="筛选符号"
          className="h-7 w-full rounded-md border border-[var(--explorer-border)] bg-transparent px-2 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin py-1">
        {fileTab.loading ? (
          <p className="px-3 py-2 text-[13px] text-muted-foreground">读取中…</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-2 text-[13px] text-muted-foreground">
            {symbols.length === 0 ? "未识别到符号" : "无匹配"}
          </p>
        ) : (
          <ul className="px-0.5">
            {filtered.map((s) => (
              <li key={`${s.line}-${s.name}-${s.kind}`}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-1.5 px-2 py-0.5 text-left text-[13px] hover:bg-[var(--explorer-row-hover)]",
                    s.kind === "property" && !s.depth && "pl-5 text-muted-foreground",
                  )}
                  style={
                    s.depth && s.depth > 0
                      ? { paddingLeft: `${8 + Math.min(s.depth, 6) * 12}px` }
                      : undefined
                  }
                  title={`${s.preview}\n行 ${s.line}`}
                  onClick={() => {
                    void ws.openFile(fileTab.relPath, { line: s.line, pin: true });
                  }}
                >
                  <span className="w-14 shrink-0 truncate font-mono text-[11px] text-muted-foreground">
                    {kindLabel(s.kind)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{s.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {s.line}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OutlineHeader({ subtitle, source }: { subtitle?: string; source?: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--explorer-border)] px-2.5 py-1.5">
      <ListTree className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-foreground">
          大纲（{source || "当前文件"}）
        </div>
        {subtitle ? (
          <div className="truncate font-mono text-[11px] text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
