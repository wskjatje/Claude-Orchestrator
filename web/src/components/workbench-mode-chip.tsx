import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import {
  cycleWorkbenchInteractionMode,
  getWorkbenchInteractionMode,
  interactionModeLabel,
  setWorkbenchInteractionMode,
  subscribeWorkbenchInteractionMode,
  type WorkbenchInteractionMode,
} from "@/lib/workbench-interaction-mode";

/** 顺序：Agent → Ask → Plan */
const MODES: WorkbenchInteractionMode[] = ["agent", "ask", "plan"];

export function WorkbenchModeChip({ className }: { className?: string }) {
  const mode = useSyncExternalStore(
    subscribeWorkbenchInteractionMode,
    getWorkbenchInteractionMode,
    getWorkbenchInteractionMode,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key !== "Tab") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest(".cm-editor")) return;
      if (!t?.closest("[data-workbench-composer]")) return;
      e.preventDefault();
      cycleWorkbenchInteractionMode();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-md bg-secondary/40 p-0.5",
        className,
      )}
      title="Agent · Ask · Plan（Shift+Tab 切换）"
    >
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          className={cn("composer-chrome-chip", mode === m && "composer-chrome-chip--active")}
          onClick={() => setWorkbenchInteractionMode(m)}
        >
          {interactionModeLabel(m)}
        </button>
      ))}
    </div>
  );
}
