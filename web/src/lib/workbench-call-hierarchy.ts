/** Call Hierarchy Peek 状态（真 Language Service / LSP；无假树）+ 展开历史栈 */

import type { TsCallHierarchyItem } from "@/lib/workspace-tsservice-client";

export type CallHierarchyPeekState = {
  item: TsCallHierarchyItem;
  incoming: TsCallHierarchyItem[];
  outgoing: TsCallHierarchyItem[];
};

type Listener = () => void;

let state: CallHierarchyPeekState | null = null;
/** 展开前压栈，供「返回」；上限防无限 */
let stack: CallHierarchyPeekState[] = [];
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

export function subscribeCallHierarchyPeek(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCallHierarchyPeek(): CallHierarchyPeekState | null {
  return state;
}

export function getCallHierarchyStackDepth(): number {
  return stack.length;
}

/** 根级打开或替换当前帧；默认清空历史（新查询） */
export function setCallHierarchyPeek(next: CallHierarchyPeekState | null, opts?: { push?: boolean }) {
  if (!next) {
    state = null;
    stack = [];
    emit();
    return;
  }
  if (opts?.push && state) {
    stack = [...stack, state].slice(-12);
  } else if (!opts?.push) {
    stack = [];
  }
  state = next;
  emit();
}

/** 返回上一层；无历史则关闭 */
export function popCallHierarchyPeek(): boolean {
  if (!stack.length) {
    if (!state) return false;
    state = null;
    emit();
    return true;
  }
  state = stack[stack.length - 1]!;
  stack = stack.slice(0, -1);
  emit();
  return true;
}

export function clearCallHierarchyPeek() {
  if (!state && !stack.length) return;
  state = null;
  stack = [];
  emit();
}
