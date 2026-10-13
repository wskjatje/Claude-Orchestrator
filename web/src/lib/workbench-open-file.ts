/** 全局请求打开工作区文件（供 toast / 非 React 调用） */

type Handler = (relPath: string) => void | Promise<void>;

let handler: Handler | null = null;

export function registerWorkbenchOpenFileHandler(fn: Handler | null) {
  handler = fn;
}

export function requestOpenWorkbenchFile(relPath: string) {
  const p = String(relPath || "").replace(/\\/g, "/");
  if (!p || !handler) return;
  void handler(p);
}
