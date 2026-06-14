export type WorkbenchProblem = {
  relPath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: "error" | "warning";
  message: string;
  rule?: string | null;
};
