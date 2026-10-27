/** 本机模型上下文窗口手动覆盖循环（设置页标签 / Composer 占用条共用） */
export const LOCAL_CTX_OVERRIDE_CYCLE = [8192, 16_384, 32_768, 65_536] as const;

/** @returns 下一档；末档后再点 → null（清除覆盖） */
export function nextLocalContextOverride(current: number | null | undefined): number | null {
  const cur = typeof current === "number" && current >= 1024 ? Math.floor(current) : null;
  const idx = LOCAL_CTX_OVERRIDE_CYCLE.findIndex((n) => n === cur);
  if (idx < 0) return LOCAL_CTX_OVERRIDE_CYCLE[0];
  if (idx >= LOCAL_CTX_OVERRIDE_CYCLE.length - 1) return null;
  return LOCAL_CTX_OVERRIDE_CYCLE[idx + 1]!;
}
