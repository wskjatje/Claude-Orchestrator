import type { EditorView } from "@codemirror/view";

export type EditorIdeHandlers = {
  relPath: string;
  readOnly?: boolean;
  readFile?: (relPath: string) => Promise<string | null>;
  onOpenFile?: (relPath: string) => void;
  isMenuOpen?: () => boolean;
  onContextMenu?: (payload: { x: number; y: number; pos: number; view?: EditorView }) => void;
  /** 用选区提问：预填 Composer */
  askAboutSelection?: (prompt: string) => void;
};

let current: EditorIdeHandlers = { relPath: "" };
/** 最近聚焦的 CodeMirror 视图（命令面板等跨树动作） */
let activeView: EditorView | null = null;

export function setEditorIdeHandlers(next: EditorIdeHandlers) {
  current = next;
}

export function getEditorIdeHandlers(): EditorIdeHandlers {
  return current;
}

export function setActiveEditorView(view: EditorView | null) {
  activeView = view;
}

export function getActiveEditorView(): EditorView | null {
  return activeView;
}
