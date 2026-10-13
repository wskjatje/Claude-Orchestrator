import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { lintGutter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { useTheme } from "@/hooks/use-theme";
import { useWorkbenchProblemsOptional } from "@/contexts/workbench-problems-context";
import { codemirrorExtensionsForPath } from "@/lib/codemirror-lang";
import { editorThemeForFile } from "@/lib/codemirror-editor-theme";
import { isMarkdownPath } from "@/lib/editor-file-kind";
import { workspaceLinterExtension } from "@/lib/codemirror-workspace-lint";
import { buildEditorMenuSnapshot } from "@/lib/codemirror-editor-menu";
import { editorIdeExtensions, runPendingGotoWithRetry } from "@/lib/codemirror-ide-extensions";
import { ghostTextExtension } from "@/lib/codemirror-ghost-text";
import { setEditorIdeHandlers } from "@/lib/codemirror-ide-handlers";
import {
  clearPendingGotoRetry,
  clearPendingSymbolGoto,
  pathsMatchAnyPending,
  resetEditorNavigationState,
} from "@/lib/codemirror-pending-goto";
import { createScmGutterController } from "@/lib/codemirror-scm-gutter";
import { createAgentHighlightController } from "@/lib/codemirror-agent-highlight";
import {
  CodemirrorEditorContextMenu,
  type EditorContextMenuState,
} from "@/components/codemirror-editor-context-menu";
import { CodemirrorInlineEditDialog } from "@/components/codemirror-inline-edit";
import { setEditorSelectionSnapshot } from "@/lib/editor-selection-snapshot";
import { setActiveEditorRelPath } from "@/lib/active-editor-path";
import { getUiPrefsCache, getUiPrefsEpoch, subscribeUiPrefs } from "@/lib/ui-prefs";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  relPath: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  onOpenFile?: (relPath: string) => void;
  readWorkspaceFile?: (relPath: string) => Promise<string | null>;
};

export function CodemirrorWorkbench({
  value,
  relPath,
  readOnly,
  onChange,
  className,
  onOpenFile,
  readWorkspaceFile,
}: Props) {
  const { resolved } = useTheme();
  const problemsCtx = useWorkbenchProblemsOptional();
  const prefsEpoch = useSyncExternalStore(subscribeUiPrefs, getUiPrefsEpoch, getUiPrefsEpoch);
  const isDark = resolved === "dark";
  const isMd = isMarkdownPath(relPath);
  const viewRef = useRef<EditorView | null>(null);
  const menuOpenRef = useRef(false);
  const [menuState, setMenuState] = useState<EditorContextMenuState>(null);
  const [inlineEditOpen, setInlineEditOpen] = useState(false);
  const contentSampleRef = useRef("");
  const pendingRetryCancelRef = useRef<(() => void) | null>(null);
  const readFileRef = useRef(readWorkspaceFile);
  const onOpenFileRef = useRef(onOpenFile);
  const scmCtrlRef = useRef<ReturnType<typeof createScmGutterController> | null>(null);
  const agentCtrlRef = useRef<ReturnType<typeof createAgentHighlightController> | null>(null);

  readFileRef.current = readWorkspaceFile;
  onOpenFileRef.current = onOpenFile;

  const scmCtrl = useMemo(() => createScmGutterController(relPath), [relPath]);
  const agentCtrl = useMemo(() => createAgentHighlightController(relPath), [relPath]);
  scmCtrlRef.current = scmCtrl;
  agentCtrlRef.current = agentCtrl;

  const getProblems = useCallback(
    () => problemsCtx?.problemsForFile(relPath) ?? [],
    [problemsCtx, relPath],
  );

  const closeMenu = useCallback(() => {
    menuOpenRef.current = false;
    setMenuState(null);
  }, []);

  const getView = useCallback(() => viewRef.current, []);

  const openMenuAt = useCallback((x: number, y: number, pos: number) => {
    const view = viewRef.current;
    if (!view) return;
    menuOpenRef.current = true;
    try {
      view.dispatch({ selection: { anchor: pos, head: pos } });
      const snapshot = buildEditorMenuSnapshot(view, pos);
      setMenuState({ x, y, snapshot });
    } catch {
      menuOpenRef.current = false;
      setMenuState(null);
    }
  }, []);

  useEffect(() => {
    resetEditorNavigationState();
    setEditorIdeHandlers({
      relPath,
      readOnly,
      readFile: (path) => readFileRef.current?.(path) ?? Promise.resolve(null),
      onOpenFile: (path) => onOpenFileRef.current?.(path),
      isMenuOpen: () => menuOpenRef.current,
      onContextMenu: ({ x, y, pos }) => {
        if (menuOpenRef.current) {
          closeMenu();
          return;
        }
        requestAnimationFrame(() => openMenuAt(x, y, pos));
      },
    });
    return () => {
      closeMenu();
      resetEditorNavigationState();
    };
  }, [relPath, readOnly, closeMenu, openMenuAt]);

  useEffect(() => {
    closeMenu();
    contentSampleRef.current = value.slice(0, 4096);
  }, [relPath, closeMenu]);

  useEffect(() => {
    setActiveEditorRelPath(relPath);
  }, [relPath]);

  const themeExt = useMemo(
    () => editorThemeForFile(relPath, isDark),
    [relPath, isDark],
  );

  const extensions = useMemo(() => {
    const langExts = codemirrorExtensionsForPath(relPath, readOnly, contentSampleRef.current);
    return [
      ...langExts,
      ...editorIdeExtensions,
      lintGutter(),
      ...scmCtrl.extension,
      ...agentCtrl.extension,
      workspaceLinterExtension(relPath, getProblems),
      EditorView.editable.of(!readOnly),
      EditorView.lineWrapping,
      keymap.of([
        {
          key: "Mod-k",
          run: () => {
            if (readOnly) return false;
            setInlineEditOpen(true);
            return true;
          },
        },
        ...defaultKeymap,
        indentWithTab,
      ]),
      // Tab 接受幽灵文本优先于缩进（accept 失败时回落 indentWithTab）
      ...(!readOnly &&
      getUiPrefsCache().ghostTextEnabled !== false &&
      getUiPrefsCache().completionMode !== "lsp"
        ? [ghostTextExtension(relPath)]
        : []),
      EditorView.updateListener.of((update) => {
        if (!update.selectionSet && !update.docChanged) return;
        const sel = update.state.selection.main;
        if (sel.empty) {
          setEditorSelectionSnapshot(null);
          return;
        }
        const text = update.state.doc.sliceString(sel.from, sel.to);
        const fromLine = update.state.doc.lineAt(sel.from).number;
        const toLine = update.state.doc.lineAt(sel.to).number;
        setEditorSelectionSnapshot({
          relPath,
          text,
          fromLine,
          toLine,
          updatedAt: Date.now(),
        });
      }),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "var(--font-size-code, 14px)",
          backgroundColor: "var(--code-bg)",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "inherit",
          lineHeight: isMd ? "1.65" : "1.5",
          backgroundColor: "var(--code-bg)",
        },
        ".cm-content": {
          backgroundColor: "var(--code-bg)",
          color: "var(--foreground)",
        },
        ".cm-line": {
          padding: isMd ? "0 2px 0 4px" : "0",
        },
        ".cm-gutters": {
          borderRight: "1px solid var(--border)",
          backgroundColor: "var(--code-bg)",
          color: "color-mix(in oklab, var(--foreground) 40%, transparent)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "color-mix(in oklab, var(--foreground) 4%, transparent)",
        },
        ".cm-activeLine": {
          backgroundColor: "color-mix(in oklab, var(--foreground) 4%, transparent)",
        },
        ".cm-ide-reference": {
          backgroundColor: "color-mix(in oklab, var(--primary) 22%, transparent)",
          borderRadius: "2px",
        },
        ".cm-lintRange-error": {
          backgroundImage:
            "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"6\" height=\"3\"><path d=\"m0 3 l2 -2 l1 0 l2 2 l1 0\" stroke=\"%23f14c4c\" fill=\"none\" stroke-width=\"1.2\"/></svg>')",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "left bottom",
        },
        ".cm-lintRange-warning": {
          backgroundImage:
            "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"6\" height=\"3\"><path d=\"m0 3 l2 -2 l1 0 l2 2 l1 0\" stroke=\"%23cca700\" fill=\"none\" stroke-width=\"1.2\"/></svg>')",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "left bottom",
        },
      }),
    ];
    // prefsEpoch：幽灵/补全偏好变更时重建扩展
  }, [relPath, readOnly, isDark, isMd, getProblems, prefsEpoch, scmCtrl, agentCtrl]);

  const tryPendingGoto = useCallback(() => {
    const view = viewRef.current;
    if (!view || !pathsMatchAnyPending(relPath)) return;
    pendingRetryCancelRef.current?.();
    pendingRetryCancelRef.current = runPendingGotoWithRetry(view, relPath);
  }, [relPath]);

  const onCreateEditor = useCallback(
    (view: EditorView) => {
      viewRef.current = view;
      scmCtrlRef.current?.attach(view);
      agentCtrlRef.current?.attach(view);
      if (pathsMatchAnyPending(relPath)) tryPendingGoto();
    },
    [relPath, tryPendingGoto],
  );

  useEffect(() => {
    return () => {
      scmCtrl.dispose();
      agentCtrl.dispose();
    };
  }, [scmCtrl, agentCtrl]);

  useEffect(() => {
    if (!pathsMatchAnyPending(relPath)) return;
    tryPendingGoto();
  }, [relPath, value, tryPendingGoto]);

  useEffect(() => {
    return () => {
      pendingRetryCancelRef.current?.();
      pendingRetryCancelRef.current = null;
      viewRef.current = null;
      closeMenu();
    };
  }, [relPath, closeMenu]);

  return (
    <div
      className={cn(
        "codemirror-workbench relative min-h-0 flex-1 overflow-hidden",
        isMd && "codemirror-workbench--md",
        className,
      )}
    >
      <CodeMirror
        key={`${relPath}:${isDark ? "d" : "l"}`}
        value={value}
        height="100%"
        theme={themeExt}
        extensions={extensions}
        editable={!readOnly}
        onCreateEditor={onCreateEditor}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          highlightSelectionMatches: true,
          searchKeymap: true,
        }}
        onChange={(v) => onChange?.(v)}
        className="h-full [&_.cm-editor]:h-full [&_.cm-editor]:outline-none"
      />
      <CodemirrorInlineEditDialog
        open={inlineEditOpen}
        view={viewRef.current}
        relPath={relPath}
        onClose={() => setInlineEditOpen(false)}
        onApplied={(next) => onChange?.(next)}
      />
      <CodemirrorEditorContextMenu state={menuState} getView={getView} onClose={closeMenu} />
    </div>
  );
}
