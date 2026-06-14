import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDesktop } from "@/lib/desktop-api";
import { registerWorkbenchLintHandler, type WorkbenchLintMode } from "@/lib/workbench-lint-bridge";
import type { WorkbenchProblem } from "@/types/workbench-problems";

type Ctx = {
  problems: WorkbenchProblem[];
  linting: boolean;
  lintFiles: (relPaths: string[], mode?: WorkbenchLintMode) => Promise<void>;
  lintOpenFiles: (relPaths: string[]) => Promise<void>;
  clearProblems: () => void;
  problemsForFile: (relPath: string) => WorkbenchProblem[];
  errorCount: number;
  warningCount: number;
};

const WorkbenchProblemsContext = createContext<Ctx | null>(null);

export function WorkbenchProblemsProvider({ children }: { children: ReactNode }) {
  const [problems, setProblems] = useState<WorkbenchProblem[]>([]);
  const [linting, setLinting] = useState(false);

  const lintFiles = useCallback(async (relPaths: string[], mode: WorkbenchLintMode = "full") => {
    const api = getDesktop();
    if (!api?.workspaceLintFiles || !relPaths.length) return;
    setLinting(true);
    try {
      const r = await api.workspaceLintFiles(relPaths, mode);
      if (!r.ok) return;
      const next = r.problems ?? [];
      setProblems((prev) => {
        const drop = new Set(relPaths);
        const kept = prev.filter((p) => !drop.has(p.relPath));
        return [...kept, ...next];
      });
    } finally {
      setLinting(false);
    }
  }, []);

  const lintOpenFiles = useCallback(
    async (relPaths: string[]) => {
      const unique = [...new Set(relPaths.filter(Boolean))];
      if (!unique.length) return;
      await lintFiles(unique);
    },
    [lintFiles],
  );

  const clearProblems = useCallback(() => setProblems([]), []);

  const problemsForFile = useCallback(
    (relPath: string) => problems.filter((p) => p.relPath === relPath),
    [problems],
  );

  const errorCount = useMemo(() => problems.filter((p) => p.severity === "error").length, [problems]);
  const warningCount = useMemo(
    () => problems.filter((p) => p.severity === "warning").length,
    [problems],
  );

  const value = useMemo(
    () => ({
      problems,
      linting,
      lintFiles,
      lintOpenFiles,
      clearProblems,
      problemsForFile,
      errorCount,
      warningCount,
    }),
    [problems, linting, lintFiles, lintOpenFiles, clearProblems, problemsForFile, errorCount, warningCount],
  );

  useEffect(() => {
    registerWorkbenchLintHandler(lintFiles);
    return () => registerWorkbenchLintHandler(null);
  }, [lintFiles]);

  return <WorkbenchProblemsContext.Provider value={value}>{children}</WorkbenchProblemsContext.Provider>;
}

export function useWorkbenchProblems() {
  const ctx = useContext(WorkbenchProblemsContext);
  if (!ctx) throw new Error("useWorkbenchProblems must be used within WorkbenchProblemsProvider");
  return ctx;
}

export function useWorkbenchProblemsOptional() {
  return useContext(WorkbenchProblemsContext);
}
