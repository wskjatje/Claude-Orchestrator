/** 请求左侧栏切到指定视图（资源 / 搜索 / 源代码管理 / 大纲） */

export type WorkbenchSideTabId = "files" | "search" | "git" | "outline";

type Listener = (tab: WorkbenchSideTabId) => void;

const listeners = new Set<Listener>();

export function requestWorkbenchSideTab(tab: WorkbenchSideTabId) {
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
