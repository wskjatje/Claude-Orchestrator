type HistoryMsg = { ts?: number };

export type SessionWithHistory = {
  id: string;
  history: HistoryMsg[];
};

/** 会话最近活动时间（用于历史列表排序） */
export function sessionActivityMs(sess: SessionWithHistory): number {
  for (let i = sess.history.length - 1; i >= 0; i--) {
    const ts = sess.history[i]?.ts;
    if (typeof ts === "number") return ts;
  }
  const idMatch = /^s(\d{10,})$/.exec(sess.id);
  if (idMatch) return Number(idMatch[1]);
  return 0;
}

export function sortSessionsByLatest<T extends SessionWithHistory>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) => sessionActivityMs(b) - sessionActivityMs(a));
}
