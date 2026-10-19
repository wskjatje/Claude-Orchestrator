/**
 * 「声称已落盘但未出现 workspace-write 围栏」检测。
 * 只认明确写盘/建文件措辞；禁止把方案里的「已完成/任务状态」当写盘声称（会误杀正文）。
 */

export const MISSING_WORKSPACE_WRITE_TOAST =
  "本轮助手回复未出现 workspace-write 写盘块：内容仍只在聊天里。可点「确认写入」（须已配置默认写入路径），或让模型输出 ```workspace-write``` JSON（path+content）。";

export function hasWorkspaceWriteFence(text: string): boolean {
  return /(?:```|''')\s*`?\s*workspace-write\s*`?/i.test(String(text || ""));
}

/**
 * 是否像「已写磁盘 / 已创建文件」但无写盘围栏（且正文足够长）。
 * 不含泛化「已完成」「任务状态」——优化方案叙述常含这些词，不得触发硬失败。
 */
export function replySoundsLikeClaimedDiskWrite(r: string): boolean {
  const t = String(r || "").trim();
  if (t.length < 160) return false;
  if (hasWorkspaceWriteFence(t)) return false;
  return (
    /(?:已落盘|已写入\s+[`'"]?[\w./-]+\.[a-zA-Z0-9]+|写入成功|保存到工作区|已保存到\s*[`'"]?[\w./-]+)/i.test(
      t,
    ) ||
    /(?:已生成文件|磁盘上|涉及文件路径|已创建文件|创建以下文件|将写入以下路径|已添加文件|新增文件\s*[`'"]?[\w./-]+|文件已写入)/i.test(
      t,
    )
  );
}
