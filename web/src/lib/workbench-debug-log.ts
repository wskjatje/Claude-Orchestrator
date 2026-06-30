export type DebugEntry = {
  id: string;
  level: "log" | "info" | "warn" | "error" | "result" | "input";
  text: string;
  ts: number;
};

const MAX = 2000;
let seq = 0;
const entries: DebugEntry[] = [];
const listeners = new Set<() => void>();

let debugSnapshot: readonly DebugEntry[] = entries;

function emit() {
  debugSnapshot = entries.slice();
  listeners.forEach((fn) => fn());
}

export function subscribeDebugLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDebugEntries(): readonly DebugEntry[] {
  return debugSnapshot;
}

export function appendDebugEntry(level: DebugEntry["level"], text: string) {
  entries.push({ id: `d-${++seq}`, level, text, ts: Date.now() });
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  emit();
}

export function clearDebugLog() {
  entries.length = 0;
  emit();
}

export function evalDebugExpression(source: string): void {
  const expr = source.trim();
  if (!expr) return;
  appendDebugEntry("input", `> ${expr}`);
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${expr});`);
    const result = fn();
    const text =
      typeof result === "string"
        ? result
        : result === undefined
          ? "undefined"
          : JSON.stringify(result, null, 2) ?? String(result);
    appendDebugEntry("result", text);
  } catch (e) {
    appendDebugEntry("error", e instanceof Error ? e.message : String(e));
  }
}

let consolePatched = false;

/** 捕获页面 console 输出到调试控制台 */
export function installDebugConsoleCapture() {
  if (consolePatched || typeof window === "undefined") return;
  consolePatched = true;
  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  const wrap =
    (level: DebugEntry["level"], fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) => {
      fn(...args);
      try {
        appendDebugEntry(
          level,
          args
            .map((a) => (typeof a === "string" ? a : JSON.stringify(a) ?? String(a)))
            .join(" "),
        );
      } catch {
        /* ignore */
      }
    };
  console.log = wrap("log", orig.log);
  console.info = wrap("info", orig.info);
  console.warn = wrap("warn", orig.warn);
  console.error = wrap("error", orig.error);
}
