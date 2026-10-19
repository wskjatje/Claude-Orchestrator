/**
 * 工作台交互模式：
 * - Agent：直接改盘（CLI acceptEdits + 自动落盘），Diff 可审
 * - Ask：只读
 * - Plan：先方案/围栏，Accept 后再落盘
 */

export type WorkbenchInteractionMode = "ask" | "plan" | "agent";

const KEY = "claude-orchestrator:workbench-interaction-mode:v4";
const listeners = new Set<() => void>();

let mode: WorkbenchInteractionMode = load();

function normalizeMode(raw: string | null | undefined): WorkbenchInteractionMode | null {
  if (raw === "ask" || raw === "agent" || raw === "plan") return raw;
  // 旧 Manual / propose → Plan
  if (raw === "propose" || raw === "manual") return "plan";
  return null;
}

function load(): WorkbenchInteractionMode {
  try {
    const raw = localStorage.getItem(KEY);
    const n = normalizeMode(raw);
    if (n) return n;
    // v3→v4：保留用户已选模式；未选过则默认 ask（对齐 Cursor）
    const v3 = localStorage.getItem("claude-orchestrator:workbench-interaction-mode:v3");
    const n3 = normalizeMode(v3);
    if (n3) {
      localStorage.setItem(KEY, n3);
      return n3;
    }
    const v2 = localStorage.getItem("claude-orchestrator:workbench-interaction-mode:v2");
    const n2 = normalizeMode(v2);
    if (n2) {
      localStorage.setItem(KEY, n2);
      return n2;
    }
    const v1 = localStorage.getItem("claude-orchestrator:workbench-interaction-mode:v1");
    const n1 = normalizeMode(v1);
    if (n1) {
      const migrated = n1 === "plan" ? "agent" : n1;
      localStorage.setItem(KEY, migrated);
      return migrated;
    }
  } catch {
    /* ignore */
  }
  // 对齐 Cursor：默认 Ask（只读），避免「问项目做什么」就被自动改仓库
  return "ask";
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function getWorkbenchInteractionMode(): WorkbenchInteractionMode {
  return mode;
}

export function setWorkbenchInteractionMode(next: WorkbenchInteractionMode) {
  if (next === mode) return;
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  emit();
  void persistInteractionModeToWorkspace(next);
}

/** Shift+Tab 循环模式（对齐 Cursor：Agent → Plan → Ask，一键到 Plan） */
export function cycleWorkbenchInteractionMode(): WorkbenchInteractionMode {
  const order: WorkbenchInteractionMode[] = ["agent", "plan", "ask"];
  const i = order.indexOf(mode);
  const next = order[(i + 1) % order.length]!;
  setWorkbenchInteractionMode(next);
  return next;
}

async function persistInteractionModeToWorkspace(m: WorkbenchInteractionMode) {
  try {
    const { getDesktop } = await import("@/lib/desktop-api");
    const api = getDesktop();
    if (!api?.workspaceApplyWriteFence) return;
    await api.workspaceApplyWriteFence([
      {
        path: ".claudecode/interaction-mode.json",
        content: JSON.stringify({ mode: m, updatedAt: Date.now() }, null, 2) + "\n",
      },
    ]);
  } catch {
    /* ignore */
  }
}

export function subscribeWorkbenchInteractionMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function interactionModeLabel(m: WorkbenchInteractionMode): string {
  if (m === "ask") return "Ask";
  if (m === "agent") return "Agent";
  return "Plan";
}

/** 传给 Claude Code CLI 的 --permission-mode */
export function cliPermissionModeForInteraction(
  m: WorkbenchInteractionMode = mode,
): "plan" | "acceptEdits" {
  if (m === "agent") return "acceptEdits";
  return "plan";
}

/** 结合回合策略：只读/禁止写盘时一律 plan，避免 Agent 底栏 + 问答仍 acceptEdits */
export function cliPermissionModeForTurn(opts: {
  interactionMode?: WorkbenchInteractionMode;
  allowWrites?: boolean;
  autoApplyWrites?: boolean;
}): "plan" | "acceptEdits" {
  if (opts.allowWrites === false) return "plan";
  if (opts.autoApplyWrites === false) return "plan";
  return cliPermissionModeForInteraction(opts.interactionMode ?? mode);
}

/** 是否在回复后自动把 workspace-write / diff 写入磁盘（仅看交互模式；回合意图另由 turn-policy 再闸） */
export function shouldAutoApplyWorkspaceWrites(
  m: WorkbenchInteractionMode = mode,
): boolean {
  return m === "agent";
}

/**
 * Cursor 对齐：仅 Agent + 本轮允许自动落盘时才写。
 * 缺省 allowAutoApply 时回落为「仅 Agent 模式」（兼容链/学习等未传回合策略的调用）。
 */
export function shouldAutoApplyWorkspaceWritesForTurn(opts: {
  interactionMode?: WorkbenchInteractionMode;
  allowAutoApply?: boolean;
}): boolean {
  const m = opts.interactionMode ?? mode;
  if (m !== "agent") return false;
  if (opts.allowAutoApply === false) return false;
  if (opts.allowAutoApply === true) return true;
  return true;
}

/**
 * 注入到 Claude/plain prompt 的模式约束（仅作无 turn-policy.systemConstraint 时的兜底）。
 * 有 systemConstraint 时调用方应跳过本块，避免与回合策略双源冲突。
 */
export function interactionModePromptBlock(m: WorkbenchInteractionMode): string {
  if (m === "ask") {
    return [
      "【交互模式·Ask】只读问答。",
      "MUST_NOT：不得调用 Edit/Write/Bash 改文件；不得输出 ```workspace-write``` / ```diff``` 要求落盘；不得宣称已写入。",
      "用文字说明思路与示例代码即可。",
    ].join("\n");
  }
  if (m === "agent") {
    return [
      "【交互模式·Agent】用户明确要求改文件/修代码时：检索/Read → Edit/Write 落盘 → 跑测。",
      "MUST：变更任务才写盘；纯问答/解释只用自然语言，禁止 Edit/Write/workspace-write。",
      "MUST_NOT：征求确认；探索禁用 grep（写后可核对）；勿长篇「现状发现」。",
      "收尾：1–3 句自然语言；勿用「改动/路径/测试/未改」四行模板。",
    ].join("\n");
  }
  return [
    "【交互模式·Plan】对齐 Cursor Plan：先调研并写出可执行方案文档。",
    "MUST：用 ```workspace-write 写入方案 Markdown（JSON path+content，path 自拟如 docs/<主题>-plan.md）；说明步骤、影响文件、风险。",
    "MUST_NOT：静默改业务源码；勿宣称已写入——用户 Accept 后才落盘；勿用 path:/content: YAML 伪结构。",
  ].join("\n");
}
