/** Composer 回合底栏：Canvas 方案 + 仍打开的后台终端命令 */

export type ComposerCanvasPlan = {
  path: string;
  title: string;
};

export type BackgroundTerminalRun = {
  sessionId: string;
  command: string;
};

export type ComposerTurnFooterFile = {
  path: string;
  added?: number;
  removed?: number;
};

export type ComposerTurnFooterSnapshot = {
  canvas?: ComposerCanvasPlan;
  terminals?: BackgroundTerminalRun[];
  files?: ComposerTurnFooterFile[];
};

type Listener = () => void;

let canvas: ComposerCanvasPlan | null = null;
/** 仅保留仍打开会话上的命令；引用须稳定，供 useSyncExternalStore */
let runs: BackgroundTerminalRun[] = [];
let openSessionIds = new Set<string>();
let sessionsKnown = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

function planTitleFromPath(path: string): string {
  const base = path.split("/").pop() || path;
  const stem = base.replace(/\.md$/i, "").trim() || base;
  // 对齐 Cursor：底栏显示方案名，不套「Canvas:」前缀
  return stem;
}

export function subscribeComposerTurnFooter(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getComposerCanvasPlan(): ComposerCanvasPlan | null {
  return canvas;
}

/**
 * 必须返回稳定引用：useSyncExternalStore 用 Object.is 比较；
 * 每次 filter 出新数组会在打开终端后触发 Maximum update depth。
 */
export function getComposerBackgroundTerminalRuns(): BackgroundTerminalRun[] {
  return runs;
}

export function getComposerBackgroundTerminalCount(): number {
  return runs.length;
}

/** 写入方案文档后挂到回合底栏（真实路径，无占位） */
export function trackComposerCanvasPlan(path: string) {
  const p = String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  if (!p) return;
  canvas = { path: p, title: planTitleFromPath(p) };
  emit();
}

export function clearComposerCanvasPlan() {
  if (!canvas) return;
  canvas = null;
  emit();
}

/** 集成终端成功写入一行命令后记录；失败发送不调用 */
export function recordBackgroundTerminalRun(sessionId: string, command: string) {
  const id = String(sessionId || "").trim();
  const cmd = String(command || "").trim();
  if (!id || !cmd) return;
  if (sessionsKnown && !openSessionIds.has(id)) return;
  runs = [...runs, { sessionId: id, command: cmd }].slice(-40);
  emit();
}

/** 终端面板上报仍打开的会话；关掉的会话从计数里消失 */
export function publishOpenTerminalSessions(ids: string[]) {
  const nextIds = new Set(ids.map((id) => String(id || "").trim()).filter(Boolean));
  const sameIds =
    sessionsKnown &&
    nextIds.size === openSessionIds.size &&
    [...nextIds].every((id) => openSessionIds.has(id));
  sessionsKnown = true;
  openSessionIds = nextIds;
  const nextRuns = runs.filter((r) => openSessionIds.has(r.sessionId));
  const runsChanged = nextRuns.length !== runs.length || nextRuns.some((r, i) => r !== runs[i]);
  // 无变化时保持原引用，避免订阅方无意义重渲
  if (runsChanged) runs = nextRuns;
  if (!sameIds || runsChanged) emit();
}

export function snapshotComposerTurnFooter(
  files?: ComposerTurnFooterFile[],
): ComposerTurnFooterSnapshot | null {
  const terminals = runs;
  const fileRows = (files || []).filter((f) => f.path);
  if (!canvas && !terminals.length && !fileRows.length) return null;
  return {
    ...(canvas ? { canvas } : {}),
    ...(terminals.length ? { terminals: terminals.map((t) => ({ ...t })) } : {}),
    ...(fileRows.length ? { files: fileRows } : {}),
  };
}

/** 回合落盘后清掉活动摘要，历史留在该条消息上 */
export function resetLiveComposerTurnSignals() {
  const had = Boolean(canvas) || runs.length > 0;
  canvas = null;
  runs = [];
  if (had) emit();
}
