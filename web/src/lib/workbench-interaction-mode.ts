/**
 * 工作台交互模式：
 * - Agent：直接改盘（CLI acceptEdits + 自动落盘），Diff 可审
 * - Ask：只读
 * - Plan：先方案/围栏，Accept 后再落盘
 */

export type WorkbenchInteractionMode = "ask" | "plan" | "agent";

const KEY = "claude-orchestrator:workbench-interaction-mode:v3";
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
    const v2 = localStorage.getItem("claude-orchestrator:workbench-interaction-mode:v2");
    const n2 = normalizeMode(v2);
    if (n2) {
      localStorage.setItem(KEY, n2);
      return n2;
    }
    const v1 = localStorage.getItem("claude-orchestrator:workbench-interaction-mode:v1");
    const n1 = normalizeMode(v1);
    if (n1) {
      localStorage.setItem(KEY, n1 === "plan" ? "agent" : n1);
      return n1 === "plan" ? "agent" : n1;
    }
  } catch {
    /* ignore */
  }
  return "agent";
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

/** Shift+Tab 循环模式 */
export function cycleWorkbenchInteractionMode(): WorkbenchInteractionMode {
  const order: WorkbenchInteractionMode[] = ["agent", "ask", "plan"];
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

/** 是否在回复后自动把 workspace-write / diff 写入磁盘 */
export function shouldAutoApplyWorkspaceWrites(
  m: WorkbenchInteractionMode = mode,
): boolean {
  return m === "agent";
}

/** 注入到 Claude prompt 的模式约束 */
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
      "【交互模式·Agent】直接完成任务并改工作区，用户发任务即授权执行。",
      "MUST：检索/Read → Edit/Write 落盘 → 跑测；禁止只贴方案/diff。",
      "MUST_NOT：征求确认；探索禁用 grep（写后可核对）；勿长篇「现状发现」。",
      "默认自行决定（如 memory:// + migrations）；可选一句「未改：…」。",
      "收尾：1–3 句自然语言（做了什么 + 测试结果）；勿用「改动/路径/测试/未改」四行模板。",
    ].join("\n");
  }
  return [
    "【交互模式·Plan】先调研并给出可执行方案，不要直接落盘。",
    "MUST：说明步骤、影响文件、风险；改动用 ```workspace-write``` 或 ```diff``` 提出。",
    "MUST_NOT：Edit/Write 静默改盘；勿宣称已写入——用户 Accept 后才落盘。",
  ].join("\n");
}
