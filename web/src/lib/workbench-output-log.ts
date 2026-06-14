export type OutputChannelId =
  | "workbench"
  | "bridge"
  | "tasks"
  | "terminal"
  | "typescript";

export type OutputChannelDef = {
  id: OutputChannelId;
  label: string;
};

export const OUTPUT_CHANNELS: OutputChannelDef[] = [
  { id: "workbench", label: "工作台" },
  { id: "bridge", label: "桥接" },
  { id: "tasks", label: "任务" },
  { id: "terminal", label: "终端" },
  { id: "typescript", label: "类型检查" },
];

const MAX_LINES = 4000;

type ChannelState = {
  lines: string[];
};

const channels = new Map<OutputChannelId, ChannelState>(
  OUTPUT_CHANNELS.map((c) => [c.id, { lines: [] }]),
);

const listeners = new Set<() => void>();

let outputSnapshot: Record<OutputChannelId, readonly string[]> = buildOutputSnapshot();

function buildOutputSnapshot(): Record<OutputChannelId, readonly string[]> {
  const out = {} as Record<OutputChannelId, readonly string[]>;
  for (const { id } of OUTPUT_CHANNELS) {
    out[id] = channel(id).lines;
  }
  return out;
}

function emit() {
  outputSnapshot = buildOutputSnapshot();
  listeners.forEach((fn) => fn());
}

function channel(id: OutputChannelId): ChannelState {
  let c = channels.get(id);
  if (!c) {
    c = { lines: [] };
    channels.set(id, c);
  }
  return c;
}

export function subscribeOutputLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getOutputSnapshot(): Record<OutputChannelId, readonly string[]> {
  return outputSnapshot;
}

export function appendOutput(id: OutputChannelId, line: string) {
  const c = channel(id);
  const stamp = new Date().toLocaleTimeString(undefined, { hour12: false });
  c.lines.push(`[${stamp}] ${line}`);
  if (c.lines.length > MAX_LINES) c.lines.splice(0, c.lines.length - MAX_LINES);
  emit();
}

export function appendOutputRaw(id: OutputChannelId, text: string) {
  const c = channel(id);
  const parts = text.split("\n").filter((l, i, arr) => l.length > 0 || i < arr.length - 1);
  for (const part of parts) {
    c.lines.push(part);
  }
  if (c.lines.length > MAX_LINES) c.lines.splice(0, c.lines.length - MAX_LINES);
  emit();
}

export function clearOutput(id: OutputChannelId) {
  channel(id).lines.length = 0;
  emit();
}

export function clearAllOutput() {
  for (const { id } of OUTPUT_CHANNELS) clearOutput(id);
}
