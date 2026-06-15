import { installDebugConsoleCapture } from "@/lib/workbench-debug-log";
import { appendOutput } from "@/lib/workbench-output-log";
import { initKnownPorts } from "@/lib/workbench-ports-registry";

let initialized = false;

/** 初始化底部面板（输出 / 调试 / 端口） */
export function initWorkbenchBottomPanels() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  initKnownPorts();
  installDebugConsoleCapture();
  appendOutput("workbench", "Claude Orchestrator 已就绪");
}
