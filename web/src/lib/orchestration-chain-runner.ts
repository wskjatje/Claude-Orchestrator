/**
 * 任务链执行入口：优先在 Bridge 服务端后台跑链，切换页签 / HMR 不中断。
 */
import { toast } from "sonner";
import { getDesktop } from "@/lib/desktop-api";

export type ChainRunOptions = { skipConfirm?: boolean };

let chainRunning = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeChainExecution(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 由 Provider 轮询 / WebSocket 同步服务端状态 */
export function setChainRunningFromServer(running: boolean) {
  if (chainRunning === running) return;
  chainRunning = running;
  notify();
}

export function isChainExecutionRunning() {
  return chainRunning;
}

export function requestStopChainExecution() {
  const api = getDesktop();
  if (api?.orchestrationStopChainRun) {
    void api.orchestrationStopChainRun();
    return;
  }
}

export async function runOrchestrationChainInBackground(opts?: ChainRunOptions) {
  const api = getDesktop();
  if (!api) {
    toast.error("未连接桌面能力，无法执行任务链。");
    return;
  }

  if (chainRunning) {
    toast.info("任务链已在后台执行中。");
    return;
  }

  const settings = await api.getChatSettings();
  const mode = settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";

  if (
    !opts?.skipConfirm &&
    !confirm(
      mode === "claude-code"
        ? "将从任务链状态依次调用 Agent 执行（可能较久）。是否继续？"
        : "将以本地 MCP 模式依次调用 Agent 执行（可能较久）。是否继续？",
    )
  ) {
    return;
  }

  if (typeof api.orchestrationStartChainRun !== "function") {
    toast.error("当前 Bridge 未提供服务端任务链接口，请重启 npm run web:dev:full。");
    return;
  }

  try {
    const started = await api.orchestrationStartChainRun();
    if (!started.ok) {
      toast.error(started.error || "启动任务链失败");
      return;
    }
    setChainRunningFromServer(true);
    toast.success("任务链已在服务端后台执行，切换页签不会中断。");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    toast.error(`启动任务链失败：${msg || "未知错误"}`);
  }
}
