import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { EditorView } from "@codemirror/view";
import { cn } from "@/lib/utils";
import {
  editorMenuItems,
  runEditorMenuAction,
  type EditorMenuSnapshot,
} from "@/lib/codemirror-editor-menu";

export type EditorContextMenuState = {
  x: number;
  y: number;
  snapshot: EditorMenuSnapshot;
} | null;

type Props = {
  state: EditorContextMenuState;
  getView: () => EditorView | null;
  onClose: () => void;
};

/** 编辑器右键菜单（无全局 capture 监听，避免卡死） */
export function CodemirrorEditorContextMenu({ state, getView, onClose }: Props) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  const onPick = useCallback(
    (action: string, snapshot: EditorMenuSnapshot) => {
      onClose();
      requestAnimationFrame(() => {
        const view = getView();
        if (!view) return;
        runEditorMenuAction(view, snapshot, action);
      });
    },
    [getView, onClose],
  );

  if (!state) return null;

  const { x, y, snapshot } = state;
  const items = editorMenuItems(snapshot);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const menuW = 280;
  const menuH = 480;
  const left = Math.min(x, vw - menuW - 8);
  const top = Math.min(y, vh - menuH - 8);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[199]"
        aria-hidden
        onMouseDown={(e) => {
          e.preventDefault();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="cm-editor-context-menu fixed z-[200] min-w-[17.5rem] overflow-hidden rounded-md border border-border/80 bg-popover py-1 text-popover-foreground shadow-lg"
        style={{ left, top }}
        role="menu"
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item) => {
          if (item.id.startsWith("sep-")) {
            return <div key={item.id} className="my-1 h-px bg-border/70" role="separator" />;
          }
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-1.5 text-left text-[13px] outline-none",
                item.disabled
                  ? "cursor-default text-muted-foreground/45"
                  : "cursor-default hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              )}
              onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (item.disabled || !item.action) return;
                  onPick(item.action, snapshot);
                }}
            >
              <span className="flex-1">{item.label}</span>
              {item.shortcut ? (
                <span className="text-[11px] tracking-wide text-muted-foreground">{item.shortcut}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>,
    document.body,
  );
}
