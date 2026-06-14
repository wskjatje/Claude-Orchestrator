import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadUiPrefsFromProjectDb, saveUiPrefsToProjectDb } from "@/lib/ui-prefs";

export type ThemeMode = "light" | "dark" | "system";
type Resolved = "light" | "dark";

type Ctx = {
  mode: ThemeMode;
  resolved: Resolved;
  setMode: (m: ThemeMode) => void;
  prefsLoaded: boolean;
};

const ThemeContext = createContext<Ctx | null>(null);

function getSystem(): Resolved {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(resolved: Resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<Resolved>(() =>
    typeof window === "undefined" ? "light" : getSystem(),
  );
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const prefs = await loadUiPrefsFromProjectDb();
      if (cancelled) return;
      const initial = prefs.themeMode || "system";
      setModeState(initial);
      const r: Resolved = initial === "system" ? getSystem() : initial;
      setResolved(r);
      apply(r);
      setPrefsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r: Resolved = mq.matches ? "dark" : "light";
      setResolved(r);
      apply(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    const r: Resolved = m === "system" ? getSystem() : m;
    setResolved(r);
    apply(r);
    void saveUiPrefsToProjectDb({ themeMode: m });
  };

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, prefsLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
