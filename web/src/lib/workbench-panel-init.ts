import { installDebugConsoleCapture } from "@/lib/workbench-debug-log";
import { appendOutput } from "@/lib/workbench-output-log";
import { initKnownPorts } from "@/lib/workbench-ports-registry";

let initialized = false;

type PanelFocusListener = () => void;
const problemsFocusListeners = new Set<PanelFocusListener>();
const bottomPanelFocusListeners = new Set<(tab: string) => void>();

/** 订阅「聚焦问题面板」事件（底部面板挂载时注册） */
export function subscribeProblemsPanelFocus(fn: PanelFocusListener) {
  problemsFocusListeners.add(fn);
  return () => {
    problemsFocusListeners.delete(fn);
  };
}

/** 从状态栏等入口打开底部「问题」页签 */
export function focusProblemsPanel() {
  for (const fn of problemsFocusListeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

/** 订阅底部面板页签聚焦（layout 工具栏 / 浏览器调试） */
export function subscribeBottomPanelFocus(fn: (tab: string) => void) {
  bottomPanelFocusListeners.add(fn);
  return () => {
    bottomPanelFocusListeners.delete(fn);
  };
}

/** 打开底部面板并聚焦指定页签（output ≈ 控制台） */
export function focusBottomPanel(tab: "problems" | "output" | "debug" | "terminal" | "ports" = "output") {
  for (const fn of bottomPanelFocusListeners) {
    try {
      fn(tab);
    } catch {
      /* ignore */
    }
  }
}

/** 初始化底部面板（输出 / 调试 / 端口） */
export function initWorkbenchBottomPanels() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  initKnownPorts();
  installDebugConsoleCapture();
  appendOutput("workbench", "Claude Orchestrator 已就绪");
}
