import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { lintGutter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { useTheme } from "@/hooks/use-theme";
import { useWorkbenchProblemsOptional } from "@/contexts/workbench-problems-context";
import { codemirrorExtensionsForPath } from "@/lib/codemirror-lang";
import { cursorThemeForFile } from "@/lib/codemirror-cursor-theme";
import { isMarkdownPath } from "@/lib/editor-file-kind";
import { workspaceLinterExtension } from "@/lib/codemirror-workspace-lint";
import { buildEditorMenuSnapshot } from "@/lib/codemirror-editor-menu";
import { editorIdeExtensions, runPendingGotoWithRetry } from "@/lib/codemirror-ide-extensions";
import { setEditorIdeHandlers } from "@/lib/codemirror-ide-handlers";
import {
  clearPendingGotoRetry,
  clearPendingSymbolGoto,
  pathsMatchAnyPending,
  resetEditorNavigationState,
} from "@/lib/codemirror-pending-goto";
import {
  CodemirrorEditorContextMenu,
  type EditorContextMenuState,
} from "@/components/codemirror-editor-context-menu";
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
  const isDark = resolved === "dark";
  const isMd = isMarkdownPath(relPath);
  const viewRef = useRef<EditorView | null>(null);
  const menuOpenRef = useRef(false);
  const [menuState, setMenuState] = useState<EditorContextMenuState>(null);
  const contentSampleRef = useRef("");
  const pendingRetryCancelRef = useRef<(() => void) | null>(null);
  const readFileRef = useRef(readWorkspaceFile);
  const onOpenFileRef = useRef(onOpenFile);

  readFileRef.current = readWorkspaceFile;
  onOpenFileRef.current = onOpenFile;

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

  const extensions = useMemo(() => {
    const langExts = codemirrorExtensionsForPath(relPath, readOnly, contentSampleRef.current);
    const themeExt = cursorThemeForFile(relPath, isDark);
    return [
      themeExt,
      ...langExts,
      ...editorIdeExtensions,
      lintGutter(),
      workspaceLinterExtension(relPath, getProblems),
      EditorView.editable.of(!readOnly),
      EditorView.lineWrapping,
      keymap.of([...defaultKeymap, indentWithTab]),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: isMd ? "var(--font-size-code, 14px)" : "var(--font-size-code, 13px)",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "inherit",
          lineHeight: isMd ? "1.65" : "1.5",
        },
        ".cm-line": {
          padding: isMd ? "0 2px 0 4px" : "0",
        },
        ".cm-gutters": {
          borderRight: "1px solid color-mix(in oklab, var(--border) 80%, transparent)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "color-mix(in oklab, var(--primary) 10%, transparent)",
        },
        ".cm-activeLine": {
          backgroundColor: "color-mix(in oklab, var(--primary) 6%, transparent)",
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
  }, [relPath, readOnly, isDark, isMd, getProblems]);

  const tryPendingGoto = useCallback(() => {
    const view = viewRef.current;
    if (!view || !pathsMatchAnyPending(relPath)) return;
    pendingRetryCancelRef.current?.();
    pendingRetryCancelRef.current = runPendingGotoWithRetry(view, relPath);
  }, [relPath]);

  const onCreateEditor = useCallback(
    (view: EditorView) => {
      viewRef.current = view;
      if (pathsMatchAnyPending(relPath)) tryPendingGoto();
    },
    [relPath, tryPendingGoto],
  );

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
        "codemirror-workbench min-h-0 flex-1 overflow-hidden",
        isMd && "codemirror-workbench--md",
        className,
      )}
    >
      <CodeMirror
        key={`${relPath}:${isDark ? "d" : "l"}`}
        value={value}
        height="100%"
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
      <CodemirrorEditorContextMenu state={menuState} getView={getView} onClose={closeMenu} />
    </div>
  );
}
