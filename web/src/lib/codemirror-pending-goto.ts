/** 跨文件跳转：打开目标文件后定位到符号 */
export type PendingSymbolGoto = {
  relPath: string;
  word: string;
  from?: number;
};

/** Problems 面板：打开文件后定位到行列 */
export type PendingLineGoto = {
  relPath: string;
  line: number;
  column: number;
};

let pending: PendingSymbolGoto | null = null;
let pendingLine: PendingLineGoto | null = null;
let retryCancel: (() => void) | null = null;

export function resetEditorNavigationState() {
  retryCancel?.();
  retryCancel = null;
  pending = null;
  pendingLine = null;
}

export function setPendingSymbolGoto(relPath: string, word: string, from?: number) {
  pending = { relPath, word, from };
  pendingLine = null;
}

export function setPendingLineGoto(relPath: string, line: number, column = 1) {
  pendingLine = { relPath, line, column: Math.max(1, column) };
  pending = null;
}

function normalize(p: string) {
  return p.replace(/\\/g, "/").replace(/^\.\/+/, "");
}

export function pathsMatchPending(relPath: string): boolean {
  if (!pending) return false;
  const a = normalize(pending.relPath);
  const b = normalize(relPath);
  return a === b || a.endsWith("/" + b) || b.endsWith("/" + a);
}

export function pathsMatchPendingLine(relPath: string): boolean {
  if (!pendingLine) return false;
  const a = normalize(pendingLine.relPath);
  const b = normalize(relPath);
  return a === b || a.endsWith("/" + b) || b.endsWith("/" + a);
}

export function pathsMatchAnyPending(relPath: string): boolean {
  return pathsMatchPending(relPath) || pathsMatchPendingLine(relPath);
}

export function peekPendingSymbolGoto(): PendingSymbolGoto | null {
  return pending;
}

export function consumePendingSymbolGoto(): PendingSymbolGoto | null {
  const hit = pending;
  pending = null;
  return hit;
}

export function clearPendingSymbolGoto() {
  pending = null;
}

export function peekPendingLineGoto(): PendingLineGoto | null {
  return pendingLine;
}

export function consumePendingLineGoto(): PendingLineGoto | null {
  const hit = pendingLine;
  pendingLine = null;
  return hit;
}

export function clearPendingLineGoto() {
  pendingLine = null;
}

export function registerPendingGotoRetry(cancel: () => void) {
  retryCancel?.();
  retryCancel = cancel;
}

export function clearPendingGotoRetry() {
  retryCancel?.();
  retryCancel = null;
}
