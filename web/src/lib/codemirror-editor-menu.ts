import type { EditorView } from "@codemirror/view";
import { getEditorIdeHandlers } from "@/lib/codemirror-ide-handlers";
import {
  changeAllOccurrences,
  execClipboard,
  findAllReferences,
  goToDefinition,
  renameSymbolAt,
} from "@/lib/codemirror-ide-extensions";
import { analyzeSymbolAt } from "@/lib/codemirror-symbol-nav";
import { stringLiteralAtPos, wordAtPos } from "@/lib/codemirror-word";
import { findFilePathStringAt } from "@/lib/codemirror-import-resolve";

export type EditorMenuSnapshot = {
  pos: number;
  hasWord: boolean;
  canNavigate: boolean;
  hasSelection: boolean;
  isTypeSymbol: boolean;
  readOnly: boolean;
};

export function buildEditorMenuSnapshot(view: EditorView, pos: number): EditorMenuSnapshot {
  const handlers = getEditorIdeHandlers();
  const symbol = analyzeSymbolAt(view.state.doc, pos);
  const hasWord = Boolean(wordAtPos(view.state.doc, pos));
  const strLit = stringLiteralAtPos(view.state.doc, pos);
  const hasPathRef = strLit
    ? Boolean(findFilePathStringAt(view.state.doc.toString(), strLit.from, strLit.to))
    : false;
  const sel = view.state.selection.main;
  return {
    pos,
    hasWord,
    canNavigate: hasWord || hasPathRef,
    hasSelection: sel.from !== sel.to,
    isTypeSymbol: Boolean(symbol && (symbol.kind === "type" || symbol.kind === "interface")),
    readOnly: Boolean(handlers.readOnly),
  };
}

export function runEditorMenuAction(
  view: EditorView,
  snapshot: EditorMenuSnapshot,
  action: string,
) {
  const handlers = getEditorIdeHandlers();
  const { pos } = snapshot;
  switch (action) {
    case "goto-def":
    case "goto-type":
    case "goto-source":
      void goToDefinition(view, pos, handlers);
      break;
    case "goto-refs":
    case "find-refs":
      findAllReferences(view, pos);
      break;
    case "rename":
      renameSymbolAt(view, pos, handlers.readOnly);
      break;
    case "change-all":
      changeAllOccurrences(view, pos, handlers.readOnly);
      break;
    case "cut":
      void execClipboard("cut", view, handlers.readOnly);
      break;
    case "copy":
      void execClipboard("copy", view);
      break;
    case "paste":
      void execClipboard("paste", view, handlers.readOnly);
      break;
  }
}

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform);
}

export function modKeyLabel(label: string) {
  return isMacPlatform() ? label.replace("Ctrl", "⌘").replace("Mod", "⌘") : label.replace("Mod", "Ctrl");
}

export type EditorMenuItemDef = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action?: string;
};

export function editorMenuItems(snapshot: EditorMenuSnapshot): EditorMenuItemDef[] {
  return [
    { id: "goto-def", label: "转到定义", shortcut: "F12", disabled: !snapshot.canNavigate, action: "goto-def" },
    { id: "goto-type", label: "转到类型定义", disabled: !snapshot.isTypeSymbol, action: "goto-type" },
    { id: "goto-source", label: "转到源定义", disabled: !snapshot.canNavigate, action: "goto-source" },
    { id: "goto-impl", label: "转到实现", shortcut: modKeyLabel("ModF12"), disabled: true },
    { id: "goto-refs", label: "转到引用", shortcut: "⇧F12", disabled: !snapshot.hasWord, action: "goto-refs" },
    { id: "sep-1", label: "" },
    { id: "find-refs", label: "查找所有引用", shortcut: modKeyLabel("⇧ModF12"), disabled: !snapshot.hasWord, action: "find-refs" },
    { id: "find-impl", label: "查找所有实现", disabled: true },
    { id: "call-hierarchy", label: "显示调用层次结构", shortcut: modKeyLabel("⇧ModH"), disabled: true },
    { id: "sep-2", label: "" },
    { id: "rename", label: "重命名符号", shortcut: "F2", disabled: !snapshot.hasWord || snapshot.readOnly, action: "rename" },
    { id: "change-all", label: "更改所有匹配项", shortcut: modKeyLabel("ModF2"), disabled: !snapshot.hasWord || snapshot.readOnly, action: "change-all" },
    { id: "format-doc", label: "格式化文档", shortcut: modKeyLabel("⇧ModF"), disabled: true },
    { id: "sep-3", label: "" },
    { id: "cut", label: "剪切", shortcut: modKeyLabel("ModX"), disabled: snapshot.readOnly || !snapshot.hasSelection, action: "cut" },
    { id: "copy", label: "复制", shortcut: modKeyLabel("ModC"), disabled: !snapshot.hasSelection, action: "copy" },
    { id: "paste", label: "粘贴", shortcut: modKeyLabel("ModV"), disabled: snapshot.readOnly, action: "paste" },
    { id: "sep-4", label: "" },
    { id: "cmd-palette", label: "命令面板…", shortcut: modKeyLabel("⇧ModP"), disabled: true },
  ];
}
