import { useEffect, useRef, type RefObject } from "react";
import { onBridgeEvent } from "@/lib/install-desktop-bridge";

type MessageDeltaDetail = {
  requestId?: string;
  content?: string;
};

/**
 * 订阅 Bridge 流式 delta；后端 emit message_delta 时实时更新当前会话气泡。
 */
export function useChatStream(opts: {
  activeSessionId: string;
  requestId: string | null;
  requestIdRef?: RefObject<string | null>;
  enabled: boolean;
  onDelta: (sessionId: string, content: string) => void;
}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.enabled) return;

    const off = onBridgeEvent("message_delta", (detail) => {
      const { activeSessionId, requestId, requestIdRef, onDelta } = optsRef.current;
      const liveRequestId = requestIdRef?.current ?? requestId;
      if (!liveRequestId) return;
      const payload = (detail || {}) as MessageDeltaDetail;
      if (payload.requestId !== liveRequestId) return;
      const chunk = payload.content ?? "";
      if (!chunk) return;
      onDelta(activeSessionId, chunk);
    });

    return off;
  }, [opts.enabled]);
}
