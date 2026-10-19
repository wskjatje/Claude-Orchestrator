/**
 * Plan → Build：方案文档旁「按方案执行」。
 * 由 Chat 页注册处理器；Edit 卡点击后复用现有 write 意图 + Agent 工具环。
 */

type PlanBuildHandler = (path: string) => void;

let handler: PlanBuildHandler | null = null;

export function setPlanBuildHandler(next: PlanBuildHandler | null) {
  handler = next;
}

export function requestPlanBuild(path: string) {
  const p = String(path || "").trim().replace(/\\/g, "/");
  if (!p) return;
  if (!handler) {
    void import("sonner").then(({ toast }) => {
      toast.error("Build 不可用：请在主聊天页操作");
    });
    return;
  }
  handler(p);
}

/** 是否像方案/计划 Markdown（对齐 Cursor Plan 产物旁 Build） */
export function isPlanDocumentPath(path: string): boolean {
  const p = String(path || "").trim().replace(/\\/g, "/");
  if (!/\.md$/i.test(p)) return false;
  const base = p.split("/").pop() || p;
  // docs/ 下方案类文件名，或中文摘要名（suggestPlanDocumentRelPath）
  if (/(?:^|\/)docs\//i.test(p)) {
    if (/(?:plan|方案|优化|实施|wbs|prd|architecture|里程碑|milestone|改进)/i.test(base)) {
      return true;
    }
    if (/[\u4e00-\u9fff]/.test(base) && base.replace(/\.md$/i, "").length >= 2) {
      return true;
    }
  }
  return /(?:optimization-plan|实施计划|优化方案)/i.test(base);
}
