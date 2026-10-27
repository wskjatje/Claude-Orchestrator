type EventHandler = (detail: unknown) => void;

const eventHandlers = new Map<string, Set<EventHandler>>();

/** 订阅桥接事件；泛型约束 detail，内部仍按 unknown 分发 */
export function onBridgeEvent<T = unknown>(channel: string, fn: (detail: T) => void): () => void {
  const wrapped: EventHandler = (detail) => fn(detail as T);
  if (!eventHandlers.has(channel)) eventHandlers.set(channel, new Set());
  eventHandlers.get(channel)!.add(wrapped);
  return () => {
    eventHandlers.get(channel)?.delete(wrapped);
  };
}

export function dispatchBridgeEvent(channel: string, detail: unknown) {
  eventHandlers.get(channel)?.forEach((fn) => fn(detail));
}
