type EventHandler = (detail: unknown) => void;

const eventHandlers = new Map<string, Set<EventHandler>>();

export function onBridgeEvent(channel: string, fn: EventHandler) {
  if (!eventHandlers.has(channel)) eventHandlers.set(channel, new Set());
  eventHandlers.get(channel)!.add(fn);
  return () => eventHandlers.get(channel)?.delete(fn);
}

export function dispatchBridgeEvent(channel: string, detail: unknown) {
  eventHandlers.get(channel)?.forEach((fn) => fn(detail));
}
