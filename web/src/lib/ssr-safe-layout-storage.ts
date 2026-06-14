import type { LayoutStorage } from "react-resizable-panels";

/** Avoid `useDefaultLayout` default `storage = localStorage` during SSR. */
export const ssrSafeLayoutStorage: LayoutStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* quota / private mode */
    }
  },
};
