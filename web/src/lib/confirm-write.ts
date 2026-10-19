import { parseWorkspaceWriteItemsFromBubble, stripWorkspaceWriteFencesForHistory } from "@/lib/assistant-reply";

/**
 * 从助手纯文本中提取用户/模型**已写出**的相对路径（文末 CTA 行），非关键词硬编码文件名。
 * 仅用于提示；一键写入仍以围栏或设置默认路径为准。
 */
export function inferSuggestedWritePathFromBubbleText(text: string): string | null {
  const ONE_LINE_PATH =
    /\b((?:docs|app|data|scripts|frontend)\/[a-zA-Z0-9_.\/-]+\.(?:md|txt))\b/;
  const safe = text.replace(/\n*【一键写入】[\s\S]*$/u, "").trim();
  const lines = safe.split(/\r?\n/);

  for (let i = lines.length - 1; i >= 0; i--) {
    const L = lines[i];
    const pathMatch = L.match(ONE_LINE_PATH);
    if (!pathMatch) continue;
    const cta =
      /(?:需要|是否|请|建议|可以|能否|要不要|将.*生成|保存为|写入|路径|Markdown|文件|例如|如[：:为]?|e\.g\.)/i.test(L) ||
      /`docs\//.test(L);
    if (cta) return pathMatch[1].replace(/\\/g, "/");
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    const L = lines[i];
    if (/(?:例如|如[：:为]|\(e\.g\.)/.test(L)) {
      const m = L.match(ONE_LINE_PATH);
      if (m) return m[1].replace(/\\/g, "/");
    }
  }

  return null;
}

/** 用户要求把会话/任务链里已有代码批量写入项目（不调模型，扫历史助手气泡） */
export function isBulkWriteProjectMessage(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /(?:将|把).*(?:以上|上文|前面|任务链|所有|全部).*(?:代码|文件|产物)?.*(?:写入|落盘|保存)/i.test(t) ||
    /(?:批量|全部).*(?:写入|落盘|保存)/i.test(t) ||
    /\/bulk-write(?:-project)?\b/i.test(t)
  );
}

/** 用户明确要求落盘/生成文档时，可对无 workspace-write 的回复做 Agent 专属路径兜底 */
export function userWantsArtifactPersist(displayLine: string): boolean {
  const s = displayLine.trim();
  if (!s) return false;
  return (
    /(?:生成|整理|写入|落盘|保存).*(?:文档|文件|工作区|prd|PRD|wbs|WBS)/i.test(s) ||
    /(?:将|把).*(?:以上|上文|前面).*(?:生成|整理|写入|落盘|保存)/i.test(s)
  );
}

/** 用户要分析/优化/规划等可交付产出，但未显式说「写入」 */
export function userImplicitlyWantsDeliverable(displayLine: string): boolean {
  const s = displayLine.trim();
  if (!s) return false;
  return /(?:优化|分析|评估|规划|梳理|整理|总结|产出|拆解|调研|设计|改进|重构|backlog|优先级)/i.test(
    s,
  );
}

/** 助手正文里声称已写入某路径（常见于 -p 模式口述，磁盘其实未改） */
export function extractClaimedWritePathFromText(text: string): string | null {
  const patterns = [
    /已写入\s+[`'"]?((?:docs|[\w.-]+)\/[\w./-]+\.(?:md|txt|json|yaml|yml))[`'"]?/i,
    /已(?:经)?(?:保存|落盘)(?:到|至)?\s+[`'"]?((?:docs|[\w.-]+)\/[\w./-]+\.(?:md|txt))[`'"]?/i,
    /(?:写入|保存)(?:到|至)\s+[`'"]?((?:docs|[\w.-]+)\/[\w./-]+\.(?:md|txt))[`'"]?\s*(?:成功|完成|完毕)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    const p = m?.[1]?.replace(/\\/g, "/");
    if (p && !p.includes("..")) return p;
  }
  return null;
}

/**
 * 将上一条助手全文落盘：
 * 1) 有可解析 workspace-write 围栏 → 按围栏 path/content；
 * 2) 否则仅当设置提供了 `defaultRelativePath` → 写入该路径；
 * 3) 否则返回 []（调用方硬失败，禁止关键词猜 docs/*.md）。
 *
 * `agentStem` 保留参数兼容调用方，不再用于硬编码默认文件名。
 */
export function buildConfirmWriteItems(
  assistantRaw: string,
  defaultRelativePath: string,
  _agentStem?: string,
): { path: string; content: string }[] {
  const parsed = parseWorkspaceWriteItemsFromBubble(assistantRaw);
  if (parsed.length > 0) return parsed;

  let body = assistantRaw.trim();
  body = body.replace(/\n*【工作区已写入】[\s\S]*$/u, "").trim();
  body = stripWorkspaceWriteFencesForHistory(body);
  if (!body) return [];

  const fallback = defaultRelativePath.trim().replace(/^[/\\]+/, "").replace(/\\/g, "/");
  if (!fallback || fallback.includes("..")) return [];
  return [{ path: fallback, content: body }];
}

/** 气泡右键「写入」：仅围栏项，无围栏则空（菜单不应显示该项） */
export function buildFenceOnlyWriteItems(
  assistantRaw: string,
): { path: string; content: string }[] {
  return parseWorkspaceWriteItemsFromBubble(assistantRaw);
}
