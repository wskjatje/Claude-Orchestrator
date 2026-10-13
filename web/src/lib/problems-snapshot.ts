import type { WorkbenchProblem } from "@/types/workbench-problems";

/** 供发送链读取当前 Problems（避免 index.tsx 硬依赖 React context） */
let snapshot: WorkbenchProblem[] = [];

export function setProblemsSnapshot(problems: WorkbenchProblem[]) {
  snapshot = problems;
}

export function getProblemsSnapshot(): WorkbenchProblem[] {
  return snapshot;
}
