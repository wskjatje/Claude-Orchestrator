import { getUiPrefsCache, patchUiPrefsCache, saveUiPrefsToProjectDb, type TerminalShellId } from "@/lib/ui-prefs";

export const TERMINAL_SHELL_PROFILES = [
  { id: "bash", label: "bash", path: "/bin/bash" },
  { id: "zsh", label: "zsh", path: "/bin/zsh" },
] as const;

export type { TerminalShellId };

export function getDefaultTerminalShell(): TerminalShellId {
  const v = getUiPrefsCache().defaultTerminalShell;
  if (v === "bash" || v === "zsh") return v;
  return "zsh";
}

export function setDefaultTerminalShell(id: TerminalShellId) {
  patchUiPrefsCache({ defaultTerminalShell: id });
  void saveUiPrefsToProjectDb({ defaultTerminalShell: id });
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
