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
  /** 跨页续流：匹配任意进行中 requestId（不必等于当前 activeStreamRequestId） */
  matchRequestId?: (requestId: string) => boolean;
  enabled: boolean;
  onDelta: (sessionId: string, content: string, requestId: string) => void;
}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.enabled) return;

    const off = onBridgeEvent("message_delta", (detail) => {
      const { activeSessionId, requestId, requestIdRef, matchRequestId, onDelta } =
        optsRef.current;
      const payload = (detail || {}) as MessageDeltaDetail;
      const incoming = payload.requestId ?? "";
      if (!incoming) return;
      const liveRequestId = requestIdRef?.current ?? requestId;
      const matched = matchRequestId
        ? matchRequestId(incoming)
        : Boolean(liveRequestId) && incoming === liveRequestId;
      if (!matched) return;
      const chunk = payload.content ?? "";
      if (!chunk) return;
      onDelta(activeSessionId, chunk, incoming);
    });

    return off;
  }, [opts.enabled]);
}
