/**
 * 「声称已落盘但未出现 workspace-write 围栏」检测。
 * 须与仓库根目录 `workspace-write-guard.cjs`（供 renderer.js require）保持一致。
 */

export const MISSING_WORKSPACE_WRITE_TOAST =
  "本轮助手回复未出现 workspace-write 写盘块：内容多半仍只在聊天里。若无需模型再输出 JSON，可直接点输入栏旁「确认写入」→ 将上一条助手内容写入设置里的默认路径；或让模型输出 ```workspace-write``` JSON；亦可手动保存为 docs/prd.md 等。";

export function hasWorkspaceWriteFence(text: string): boolean {
  return /(?:```|''')\s*`?\s*workspace-write\s*`?/i.test(String(text || ""));
}

/** 是否像「已写磁盘 / 已完成实现」但无写盘围栏（且正文足够长，避免误报短句）。 */
export function replySoundsLikeClaimedDiskWrite(r: string): boolean {
  const t = String(r || "").trim();
  if (t.length < 160) return false;
  if (hasWorkspaceWriteFence(t)) return false;
  return /(?:任务状态|已完成|执行完毕|完全执行|基线|BASELINE|已建立(?!链)|已落盘|已写入\s+[`'"]?(?:docs\/|\w+))/i.test(
    t,
  ) ||
    /(?:可供.*[Aa]gent|互操作|已生成文件|磁盘上|涉及文件路径|已创建文件|创建以下文件|将写入以下路径|实现完成|编码完成|已添加文件|新增文件|模块实现完成)/i.test(
      t,
    );
}
