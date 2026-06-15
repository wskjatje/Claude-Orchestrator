import type { LayoutStorage } from "react-resizable-panels";
import { getUiPrefsCache, scheduleSaveUiPrefs } from "@/lib/ui-prefs";

/** 面板布局持久化在项目 SQLite（ui_prefs.layoutStorage），不再使用 localStorage。 */
export const ssrSafeLayoutStorage: LayoutStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") return null;
    return getUiPrefsCache().layoutStorage[key] ?? null;
  },
  setItem(key: string, value: string) {
    if (typeof window === "undefined") return;
    scheduleSaveUiPrefs({ layoutStorage: { [key]: value } });
  },
};
