/** 请求左侧栏切到指定视图（资源 / 搜索 / 源代码管理 / 大纲） */

export type WorkbenchSideTabId = "files" | "search" | "git" | "outline";

type Listener = (tab: WorkbenchSideTabId) => void;

const listeners = new Set<Listener>();
const stateListeners = new Set<() => void>();
let currentTab: WorkbenchSideTabId = "files";

function emitState() {
  stateListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

export function getWorkbenchSideTab(): WorkbenchSideTabId {
  return currentTab;
}

export function subscribeWorkbenchSideTabState(fn: () => void) {
  stateListeners.add(fn);
  return () => {
    stateListeners.delete(fn);
  };
}

export function requestWorkbenchSideTab(tab: WorkbenchSideTabId) {
  if (currentTab !== tab) {
    currentTab = tab;
    emitState();
  }
  listeners.forEach((fn) => {
    try {
      fn(tab);
    } catch {
      /* */
    }
  });
}

export function subscribeWorkbenchSideTab(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function requestOpenGitScmPanel() {
  requestWorkbenchSideTab("git");
}

export function requestOpenSearchPanel() {
  requestWorkbenchSideTab("search");
}

export function requestOpenOutlinePanel() {
  requestWorkbenchSideTab("outline");
}

/** Cmd/Ctrl+P 转到文件：由 WorkbenchMainLayout 内订阅（需 WorkspaceProvider） */
type QuickOpenListener = () => void;
const quickOpenListeners = new Set<QuickOpenListener>();

export function requestWorkbenchQuickOpen() {
  quickOpenListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

export function subscribeWorkbenchQuickOpen(fn: QuickOpenListener) {
  quickOpenListeners.add(fn);
  return () => {
    quickOpenListeners.delete(fn);
  };
}

/** Cmd/Ctrl+Shift+P 命令面板 */
type CommandPaletteListener = () => void;
const commandPaletteListeners = new Set<CommandPaletteListener>();

export function requestWorkbenchCommandPalette() {
  commandPaletteListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

export function subscribeWorkbenchCommandPalette(fn: CommandPaletteListener) {
  commandPaletteListeners.add(fn);
  return () => {
    commandPaletteListeners.delete(fn);
  };
}

/** 将文本预填进 Composer（Problems / SCM @ 等） */
type PrefillComposerListener = (text: string) => void;
const prefillComposerListeners = new Set<PrefillComposerListener>();

export function requestPrefillComposer(text: string) {
  const t = text.trim();
  if (!t) return;
  prefillComposerListeners.forEach((fn) => {
    try {
      fn(t);
    } catch {
      /* */
    }
  });
}

export function subscribePrefillComposer(fn: PrefillComposerListener) {
  prefillComposerListeners.add(fn);
  return () => {
    prefillComposerListeners.delete(fn);
  };
}

/** 切换或确保打开左侧栏 / 聊天 / 终端（命令面板用） */
type LayoutToggle = "left" | "chat" | "terminal";
type LayoutToggleListener = (which: LayoutToggle, opts?: { ensure?: boolean }) => void;
const layoutToggleListeners = new Set<LayoutToggleListener>();

export function requestWorkbenchLayoutToggle(which: LayoutToggle, opts?: { ensure?: boolean }) {
  layoutToggleListeners.forEach((fn) => {
    try {
      fn(which, opts);
    } catch {
      /* */
    }
  });
}

export function subscribeWorkbenchLayoutToggle(fn: LayoutToggleListener) {
  layoutToggleListeners.add(fn);
  return () => {
    layoutToggleListeners.delete(fn);
  };
}

/** Ask / Plan / Agent 模式切换 */
type InteractionModeListener = (mode: "ask" | "plan" | "agent") => void;
const interactionModeListeners = new Set<InteractionModeListener>();

export function requestWorkbenchInteractionMode(mode: "ask" | "plan" | "agent") {
  interactionModeListeners.forEach((fn) => {
    try {
      fn(mode);
    } catch {
      /* */
    }
  });
}

export function subscribeWorkbenchInteractionModeRequest(fn: InteractionModeListener) {
  interactionModeListeners.add(fn);
  return () => {
    interactionModeListeners.delete(fn);
  };
}
