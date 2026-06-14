import type { EditorView } from "@codemirror/view";

export type EditorIdeHandlers = {
  relPath: string;
  readOnly?: boolean;
  readFile?: (relPath: string) => Promise<string | null>;
  onOpenFile?: (relPath: string) => void;
  isMenuOpen?: () => boolean;
  onContextMenu?: (payload: { x: number; y: number; pos: number; view?: EditorView }) => void;
};

let current: EditorIdeHandlers = { relPath: "" };

export function setEditorIdeHandlers(next: EditorIdeHandlers) {
  current = next;
}

export function getEditorIdeHandlers(): EditorIdeHandlers {
  return current;
}
