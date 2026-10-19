import { useEffect, useRef, type RefObject } from "react";
import { onBridgeEvent } from "@/lib/install-desktop-bridge";
import type { StreamAgentEvent } from "@/lib/stream-agent-events";
import { mergeStreamEvents } from "@/lib/compress-agent-display";

type ToolEventDetail = {
  requestId?: string;
  event?: StreamAgentEvent;
};

/**
 * 订阅 Bridge agent_tool_event：边跑边把工具行写入当前助手气泡 agentTurn.streamEvents。
 */
export function useAgentToolStream(opts: {
  activeSessionId: string;
  requestId: string | null;
  requestIdRef?: RefObject<string | null>;
  enabled: boolean;
  onToolEvent: (
    sessionId: string,
    event: StreamAgentEvent,
    requestId: string,
  ) => void;
}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.enabled) return;

    const off = onBridgeEvent("agent_tool_event", (detail) => {
      const { activeSessionId, requestId, requestIdRef, onToolEvent } =
        optsRef.current;
      const liveRequestId = requestIdRef?.current ?? requestId;
      if (!liveRequestId) return;
      const payload = (detail || {}) as ToolEventDetail;
      if (payload.requestId !== liveRequestId) return;
      const ev = payload.event;
      if (!ev || ev.type !== "tool") return;
      onToolEvent(activeSessionId, ev, liveRequestId);
    });

    return off;
  }, [opts.enabled]);
}

/** 把直播工具事件合并进助手消息的 agentTurn.streamEvents */
export function mergeLiveToolEventIntoAssistantMessages<
  T extends {
    role: string;
    agentTurn?: {
      streamEvents?: StreamAgentEvent[];
      [k: string]: unknown;
    };
    [k: string]: unknown;
  },
>(messages: T[], event: StreamAgentEvent): T[] {
  if (!messages.length) return messages;
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return messages;
  const prev = last.agentTurn?.streamEvents || [];
  const nextEvents = mergeStreamEvents(prev, [event]);
  const updated = [...messages];
  updated[updated.length - 1] = {
    ...last,
    agentTurn: {
      ...(last.agentTurn || {}),
      streamEvents: nextEvents,
    },
  };
  return updated;
}
