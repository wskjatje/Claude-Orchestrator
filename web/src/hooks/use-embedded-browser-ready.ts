import { useEffect, useState } from "react";
import { isEmbeddedBrowserReady } from "@/lib/embedded-browser-native";

/** 内嵌浏览器是否可用（iframe 内容区 或 Electron WebContentsView） */
export function useEmbeddedBrowserReady(): boolean {
  const [ready, setReady] = useState(() => isEmbeddedBrowserReady());

  useEffect(() => {
    const sync = () => setReady(isEmbeddedBrowserReady());
    sync();
    window.addEventListener("embedded-browser:ready", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("embedded-browser:ready", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return ready;
}
