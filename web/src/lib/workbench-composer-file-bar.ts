export type ComposerFileBarState = {
  count: number;
  undoAll: (() => void) | null;
  review: (() => void) | null;
};

let state: ComposerFileBarState = { count: 0, undoAll: null, review: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeComposerFileBar(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getComposerFileBarState(): ComposerFileBarState {
  return state;
}

export function setComposerFileBarState(next: ComposerFileBarState) {
  state = next;
  emit();
}
