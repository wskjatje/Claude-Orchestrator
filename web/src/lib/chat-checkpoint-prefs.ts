const SKIP_KEY = "chat-checkpoint-confirm-skip";

export function shouldSkipCheckpointConfirm(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SKIP_KEY) === "1";
}

export function setSkipCheckpointConfirm(skip: boolean): void {
  if (typeof localStorage === "undefined") return;
  if (skip) localStorage.setItem(SKIP_KEY, "1");
  else localStorage.removeItem(SKIP_KEY);
}
