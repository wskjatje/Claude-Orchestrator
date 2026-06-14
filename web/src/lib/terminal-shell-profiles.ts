export const TERMINAL_SHELL_PROFILES = [
  { id: "bash", label: "bash", path: "/bin/bash" },
  { id: "zsh", label: "zsh", path: "/bin/zsh" },
] as const;

export type TerminalShellId = (typeof TERMINAL_SHELL_PROFILES)[number]["id"];

const DEFAULT_SHELL_KEY = "workbench-terminal-default-shell";

export function getDefaultTerminalShell(): TerminalShellId {
  try {
    const v = localStorage.getItem(DEFAULT_SHELL_KEY);
    if (v === "bash" || v === "zsh") return v;
  } catch {
    /* ignore */
  }
  return "zsh";
}

export function setDefaultTerminalShell(id: TerminalShellId) {
  try {
    localStorage.setItem(DEFAULT_SHELL_KEY, id);
  } catch {
    /* ignore */
  }
}

export function resolveShellPath(shell?: string): string | undefined {
  if (!shell?.trim()) return undefined;
  const hit = TERMINAL_SHELL_PROFILES.find((p) => p.id === shell || p.path === shell);
  return hit?.path ?? shell;
}

export function shellDisplayLabel(shell?: string): string {
  if (!shell) return "zsh";
  const base = shell.split("/").pop();
  return base || shell;
}
