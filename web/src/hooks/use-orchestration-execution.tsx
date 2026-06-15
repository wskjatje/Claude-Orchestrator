import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "@tanstack/react-router";
import { getDesktop } from "@/lib/desktop-api";
import { useDesktopReady } from "@/hooks/use-desktop-ready";
import { syncOfficialGenericChains } from "@/lib/sync-official-chains";
import {
  buildChainWorkflowBadge,
  type ChainWorkflowBadge,
} from "@/lib/chain-workflow-badge";
import {
  requestStopChainExecution,
  runOrchestrationChainInBackground,
  setChainRunningFromServer,
  type ChainRunOptions,
} from "@/lib/orchestration-chain-runner";

export type ChainStatusBadge = ChainWorkflowBadge;

type Ctx = {
  chainRunning: boolean;
  chainStatusBadge: ChainStatusBadge;
  sessionRevision: number;
  runOrchestrationChain: (opts?: ChainRunOptions) => Promise<void>;
  stopChainExecution: () => void;
  refreshChainStatusBadge: (opts?: { running?: boolean }) => Promise<void>;
  /** 从 Bridge 服务端拉取执行中/暂停状态（切换页签后应立即调用） */
  syncExecutionState: () => Promise<boolean>;
};

const OrchestrationContext = createContext<Ctx | null>(null);

/** SSR / HMR 模块热重载间隙：避免 Provider 未挂载时整页崩溃 */
const ORCHESTRATION_FALLBACK: Ctx = {
  chainRunning: false,
  chainStatusBadge: { label: "工作流：—", tone: "neutral" },
  sessionRevision: 0,
  runOrchestrationChain: async () => {},
  stopChainExecution: () => {},
  refreshChainStatusBadge: async () => {},
  syncExecutionState: async () => false,
};

export function OrchestrationExecutionProvider({ children }: { children: ReactNode }) {
  const desktopReady = useDesktopReady();
  const location = useLocation();
  const [chainRunning, setChainRunning] = useState(false);
  const chainRunningRef = useRef(false);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [chainStatusBadge, setChainStatusBadge] = useState<ChainStatusBadge>({
    label: "工作流：检查中",
    tone: "neutral",
  });

  const applyRunning = useCallback((running: boolean) => {
    chainRunningRef.current = running;
    setChainRunning(running);
    setChainRunningFromServer(running);
  }, []);

  const refreshChainStatusBadge = useCallback(async (opts?: { running?: boolean }) => {
    const api = getDesktop();
    if (!api?.orchestrationLoadChain) {
      setChainStatusBadge({ label: "工作流：不可用", tone: "neutral" });
      return;
    }
    const running = opts?.running ?? chainRunningRef.current;
    try {
      const loaded = await api.orchestrationLoadChain();
      const st = loaded.ok ? loaded.state : null;
      const total = Array.isArray(st?.steps) ? st.steps.length : 0;
      const idx = st?.currentIndex ?? 0;

      let lastError: string | null = null;
      if (api.orchestrationGetChainRunStatus) {
        try {
          const runSt = await api.orchestrationGetChainRunStatus();
          lastError = runSt?.lastError ?? null;
        } catch {
          /* ignore */
        }
      }

      setChainStatusBadge(
        buildChainWorkflowBadge({
          total,
          currentIndex: idx,
          running,
          lastError,
          loaded: loaded.ok && total > 0,
        }),
      );
    } catch {
      setChainStatusBadge({ label: "工作流：状态读取失败", tone: "neutral" });
    }
  }, []);

  const syncExecutionState = useCallback(async (): Promise<boolean> => {
    const api = getDesktop();
    if (!api?.orchestrationGetChainRunStatus) {
      await refreshChainStatusBadge({ running: false });
      return false;
    }
    try {
      const st = await api.orchestrationGetChainRunStatus();
      const running = Boolean(st?.ok && st.running);
      applyRunning(running);
      await refreshChainStatusBadge({ running });
      return running;
    } catch {
      await refreshChainStatusBadge({ running: chainRunningRef.current });
      return chainRunningRef.current;
    }
  }, [applyRunning, refreshChainStatusBadge]);

  /** 挂载 / 路由切换 / 页签可见：立即从服务端同步，不依赖模块级缓存 */
  useEffect(() => {
    if (!desktopReady) return;
    void syncOfficialGenericChains();
    void syncExecutionState();
  }, [desktopReady, location.pathname, syncExecutionState]);

  useEffect(() => {
    if (!desktopReady) return;
    const api = getDesktop();
    if (!api?.orchestrationGetChainRunStatus) return;

    const onWake = () => {
      if (document.hidden) return;
      void syncExecutionState();
    };

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    const off = api.onOrchestrationChainStatus?.(() => {
      void syncExecutionState();
    });

    const intervalMs = chainRunning ? 800 : 2200;
    const timer = window.setInterval(() => {
      void syncExecutionState();
    }, intervalMs);

    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      off?.();
      window.clearInterval(timer);
    };
  }, [desktopReady, chainRunning, syncExecutionState]);

  useEffect(() => {
    if (!desktopReady) return;
    const api = getDesktop();
    if (!api?.onChatSessionsChanged) return;
    const off = api.onChatSessionsChanged(() => {
      setSessionRevision((v) => v + 1);
    });
    return () => {
      off?.();
    };
  }, [desktopReady]);

  const runOrchestrationChain = useCallback(
    async (opts?: ChainRunOptions) => {
      await runOrchestrationChainInBackground(opts);
      applyRunning(true);
      await refreshChainStatusBadge({ running: true });
      void syncExecutionState();
    },
    [applyRunning, refreshChainStatusBadge, syncExecutionState],
  );

  const stopChainExecution = useCallback(() => {
    requestStopChainExecution();
    void syncExecutionState();
  }, [syncExecutionState]);

  return (
    <OrchestrationContext.Provider
      value={{
        chainRunning,
        chainStatusBadge,
        sessionRevision,
        runOrchestrationChain,
        stopChainExecution,
        refreshChainStatusBadge,
        syncExecutionState,
      }}
    >
      {children}
    </OrchestrationContext.Provider>
  );
}

export function useOrchestrationExecution() {
  const ctx = useContext(OrchestrationContext);
  return ctx ?? ORCHESTRATION_FALLBACK;
}

/** 聊天页订阅会话磁盘变更（含后台任务链写入） */
export function useChatSessionRevision() {
  const { sessionRevision } = useOrchestrationExecution();
  return sessionRevision;
}
