export type ForwardedPort = {
  id: string;
  port: number;
  address: string;
  url: string;
  label: string;
  source: string;
};

const PORT_URL_RE =
  /(?:https?:\/\/)?(?:127\.0\.0\.1|localhost|\[::1\]|0\.0\.0\.0):(\d{2,5})\b/gi;

const KNOWN: Omit<ForwardedPort, "id">[] = [
  {
    port: 5188,
    address: "127.0.0.1:5188",
    url: "http://127.0.0.1:5188",
    label: "工作台 UI（Vite）",
    source: "工作台",
  },
  {
    port: 18790,
    address: "127.0.0.1:18790",
    url: "http://127.0.0.1:18790",
    label: "Web 桥接 API",
    source: "桥接",
  },
];

const ports = new Map<number, ForwardedPort>();
const listeners = new Set<() => void>();

let portsSnapshot: ForwardedPort[] = rebuildPortsSnapshot();

function rebuildPortsSnapshot(): ForwardedPort[] {
  return [...ports.values()].sort((a, b) => a.port - b.port);
}

function emit() {
  portsSnapshot = rebuildPortsSnapshot();
  listeners.forEach((fn) => fn());
}

function upsert(p: Omit<ForwardedPort, "id">) {
  const existing = ports.get(p.port);
  if (existing && existing.source !== p.source && existing.source !== "auto") return;
  ports.set(p.port, { ...p, id: `port-${p.port}` });
}

export function subscribePorts(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getForwardedPorts(): ForwardedPort[] {
  return portsSnapshot;
}

export function initKnownPorts() {
  for (const p of KNOWN) upsert(p);
  emit();
}

export function scanTextForPorts(text: string, source = "auto") {
  if (!text) return;
  let m: RegExpExecArray | null;
  PORT_URL_RE.lastIndex = 0;
  while ((m = PORT_URL_RE.exec(text))) {
    const port = Number(m[1]);
    if (port < 1 || port > 65535) continue;
    upsert({
      port,
      address: `127.0.0.1:${port}`,
      url: `http://127.0.0.1:${port}`,
      label: `端口 ${port}`,
      source,
    });
  }
  emit();
}

export function registerPort(port: number, label: string, source: string, url?: string) {
  upsert({
    port,
    address: `127.0.0.1:${port}`,
    url: url ?? `http://127.0.0.1:${port}`,
    label,
    source,
  });
  emit();
}
