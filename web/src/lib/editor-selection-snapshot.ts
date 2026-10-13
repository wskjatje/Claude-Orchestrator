/** 当前编辑器选区快照，供 @selection 展开（由 CodeMirror 更新） */

export type EditorSelectionSnapshot = {
  relPath: string;
  text: string;
  fromLine: number;
  toLine: number;
  updatedAt: number;
};

let snap: EditorSelectionSnapshot | null = null;

export function setEditorSelectionSnapshot(next: EditorSelectionSnapshot | null) {
  snap = next;
}

export function getEditorSelectionSnapshot(): EditorSelectionSnapshot | null {
  return snap;
}
