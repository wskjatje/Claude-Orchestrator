/** 工作区打开/保存文件时触发 lint，无需让 ProblemsProvider 包住整棵三栏树 */

export type WorkbenchLintMode = "open" | "full";

type LintHandler = (relPaths: string[], mode: WorkbenchLintMode) => Promise<void>;

let lintHandler: LintHandler | null = null;

export function registerWorkbenchLintHandler(handler: LintHandler | null) {
  lintHandler = handler;
}

/** open = 仅 TS（打开文件）；full = TS + ESLint（保存 / 手动刷新） */
export function requestWorkbenchLint(relPaths: string[], mode: WorkbenchLintMode = "full") {
  const unique = [...new Set(relPaths.filter(Boolean))];
  if (!unique.length || !lintHandler) return;
  void lintHandler(unique, mode);
}
