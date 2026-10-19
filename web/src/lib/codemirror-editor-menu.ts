import type { EditorView } from "@codemirror/view";
import { getEditorIdeHandlers } from "@/lib/codemirror-ide-handlers";
import {
  changeAllOccurrences,
  execClipboard,
  findAllImplementations,
  findAllReferences,
  formatDocumentAt,
  goToDefinition,
  goToImplementation,
  renameSymbolAt,
  showCallHierarchyAt,
} from "@/lib/codemirror-ide-extensions";
import { requestWorkbenchCommandPalette } from "@/lib/workbench-side-tab";
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
  /** 当前文件是否可用 TS Language Service（实现/格式化） */
  tsLike: boolean;
  /** TS/JS 或 Python/Go/Rust（真 Call Hierarchy） */
  callHierarchyLike: boolean;
};

function isTsLikePath(relPath: string) {
  return /\.(tsx?|jsx?|mjs|cjs)$/i.test(relPath || "");
}

function isCallHierarchyLikePath(relPath: string) {
  return /\.(tsx?|jsx?|mjs|cjs|py|go|rs)$/i.test(relPath || "");
}

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
    tsLike: isTsLikePath(handlers.relPath),
    callHierarchyLike: isCallHierarchyLikePath(handlers.relPath),
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
    case "goto-impl":
      void goToImplementation(view, pos);
      break;
    case "goto-refs":
    case "find-refs":
      void findAllReferences(view, pos);
      break;
    case "find-impl":
      void findAllImplementations(view, pos);
      break;
    case "call-hierarchy":
      void showCallHierarchyAt(view, pos);
      break;
    case "rename":
      void renameSymbolAt(view, pos, handlers.readOnly);
      break;
    case "change-all":
      changeAllOccurrences(view, pos, handlers.readOnly);
      break;
    case "format-doc":
      void formatDocumentAt(view, handlers.readOnly);
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
    case "ask-selection": {
      const sel = view.state.selection.main;
      if (sel.from === sel.to) break;
      const text = view.state.doc.sliceString(sel.from, sel.to).trim();
      if (!text) break;
      const rel = handlers.relPath || "selection";
      const prompt = `关于 \`${rel}\` 选区，请解释并回答：\n\n\`\`\`\n${text.slice(0, 8000)}\n\`\`\``;
      if (handlers.askAboutSelection) handlers.askAboutSelection(prompt);
      else {
        void import("sonner").then(({ toast }) =>
          toast.message("请在主工作台打开聊天后再用选区提问"),
        );
      }
      break;
    }
    case "cmd-palette":
      requestWorkbenchCommandPalette();
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

/**
 * 只列出已接线动作；未实现能力不出现（禁止永久 disabled 占位）。
 * 转到实现 / 格式化：仅 TS/JS 文件显示（Language Service）。
 */
export function editorMenuItems(snapshot: EditorMenuSnapshot): EditorMenuItemDef[] {
  const items: EditorMenuItemDef[] = [
    { id: "goto-def", label: "转到定义", shortcut: "F12", disabled: !snapshot.canNavigate, action: "goto-def" },
    { id: "goto-type", label: "转到类型定义", disabled: !snapshot.isTypeSymbol, action: "goto-type" },
    { id: "goto-source", label: "转到源定义", disabled: !snapshot.canNavigate, action: "goto-source" },
  ];
  if (snapshot.tsLike) {
    items.push({
      id: "goto-impl",
      label: "转到实现",
      shortcut: modKeyLabel("ModF12"),
      disabled: !snapshot.canNavigate,
      action: "goto-impl",
    });
  }
  items.push(
    { id: "goto-refs", label: "转到引用", shortcut: "⇧F12", disabled: !snapshot.hasWord, action: "goto-refs" },
    { id: "sep-1", label: "" },
    {
      id: "find-refs",
      label: "查找所有引用",
      shortcut: modKeyLabel("⇧ModF12"),
      disabled: !snapshot.hasWord,
      action: "find-refs",
    },
  );
  if (snapshot.tsLike) {
    items.push({
      id: "find-impl",
      label: "查找所有实现",
      disabled: !snapshot.hasWord,
      action: "find-impl",
    });
  }
  if (snapshot.callHierarchyLike) {
    items.push({
      id: "call-hierarchy",
      label: "显示调用层次结构",
      shortcut: "⇧⌥H",
      disabled: !snapshot.hasWord,
      action: "call-hierarchy",
    });
  }
  items.push(
    { id: "sep-2", label: "" },
    {
      id: "rename",
      label: "重命名符号",
      shortcut: "F2",
      disabled: !snapshot.hasWord || snapshot.readOnly,
      action: "rename",
    },
    {
      id: "change-all",
      label: "更改所有匹配项",
      shortcut: modKeyLabel("ModF2"),
      disabled: !snapshot.hasWord || snapshot.readOnly,
      action: "change-all",
    },
  );
  if (snapshot.tsLike) {
    items.push({
      id: "format-doc",
      label: "格式化文档",
      shortcut: isMacPlatform() ? "⇧⌥F" : "Shift+Alt+F",
      disabled: snapshot.readOnly,
      action: "format-doc",
    });
  }
  items.push(
    { id: "sep-3", label: "" },
    {
      id: "cut",
      label: "剪切",
      shortcut: modKeyLabel("ModX"),
      disabled: snapshot.readOnly || !snapshot.hasSelection,
      action: "cut",
    },
    { id: "copy", label: "复制", shortcut: modKeyLabel("ModC"), disabled: !snapshot.hasSelection, action: "copy" },
    {
      id: "paste",
      label: "粘贴",
      shortcut: modKeyLabel("ModV"),
      disabled: snapshot.readOnly,
      action: "paste",
    },
    { id: "sep-4", label: "" },
    {
      id: "ask-selection",
      label: "用选区提问",
      disabled: !snapshot.hasSelection,
      action: "ask-selection",
    },
    { id: "sep-5", label: "" },
    {
      id: "cmd-palette",
      label: "命令面板…",
      shortcut: modKeyLabel("⇧ModP"),
      action: "cmd-palette",
    },
  );
  return items;
}
