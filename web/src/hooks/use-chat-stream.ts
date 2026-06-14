import { useEffect, useRef } from "react";
import { getBridge } from "@/lib/bridge-client";

/**
 * 订阅 Bridge 流式 delta；后端 emit message_delta 时实时更新当前会话气泡。
 * 若 daemon 未推送事件则静默无影响。
 */
export function useChatStream(opts: {
  activeSessionId: string;
  requestId: string | null;
  enabled: boolean;
  onDelta: (sessionId: string, content: string) => void;
}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.enabled) return;
    const client = getBridge();
    const off = client.on((ev) => {
      if (ev.type !== "message_delta") return;
      const { activeSessionId, requestId, onDelta } = optsRef.current;
      if (!requestId) return;
      const chunk = ev.payload.content ?? "";
      if (!chunk) return;
      onDelta(activeSessionId, chunk);
    });
    return off;
  }, [opts.enabled]);
}
