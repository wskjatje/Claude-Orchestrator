/** @codebase 预览中勾选的文件；发送时仅注入所选（空=全部） */

type Listener = () => void;

const listeners = new Set<Listener>();
let selected = new Set<string>();
let lastQuery = "";

function bump() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

export function setCodebaseInjectQuery(query: string) {
  if (query === lastQuery) return;
  lastQuery = query;
  selected = new Set();
  bump();
}

export function toggleCodebaseInjectPath(relPath: string) {
  const p = relPath.replace(/\\/g, "/");
  const next = new Set(selected);
  if (next.has(p)) next.delete(p);
  else next.add(p);
  selected = next;
  bump();
}

export function setCodebaseInjectPaths(paths: string[]) {
  selected = new Set(paths.map((p) => p.replace(/\\/g, "/")));
  bump();
}

export function getCodebaseInjectPaths(): Set<string> {
  return selected;
}

export function subscribeCodebaseInject(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
