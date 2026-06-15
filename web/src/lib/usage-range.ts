export const USAGE_RANGE_PRESETS = ["今天", "7天", "30天"] as const;
export type UsageRangePreset = (typeof USAGE_RANGE_PRESETS)[number];

export function todayStartMs(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function rangeToBounds(range: string, now = Date.now()): { start: number; end: number } {
  const end = now;
  if (range === "今天") return { start: todayStartMs(now), end };
  if (range === "7天") return { start: end - 7 * 24 * 60 * 60 * 1000, end };
  if (range === "30天") return { start: end - 30 * 24 * 60 * 60 * 1000, end };
  return { start: 0, end };
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function parseUsageRange(raw: unknown): UsageRangePreset {
  if (raw === "7天" || raw === "30天") return raw;
  return "今天";
}
