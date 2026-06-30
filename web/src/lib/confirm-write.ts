import { parseWorkspaceWriteItemsFromBubble, stripWorkspaceWriteFencesForHistory } from "@/lib/assistant-reply";
import { defaultArtifactPathForAgent, normalizeAgentStem } from "@/lib/agent-artifact-paths";
import { parseActiveChainFromBubbleText } from "@/lib/parse-active-chain";

/** 注意：`/` 分隔的正则字面量里，`/` 必须写成 `\/`，否则会在 `(frontend)/` 处提前结束解析 */
const ONE_LINE_PATH =
  /\b((?:docs|app|data|scripts|frontend)\/[a-zA-Z0-9_.\/-]+\.(?:md|txt))\b/;

/**
 * 从助手纯文本中推断「推荐写入」的相对路径（如文末「例如 `docs/wbs_hie_egs.md`」），
 * 避免一键写入时一律落到默认 `docs/prd.md`。
 */
export function inferSuggestedWritePathFromBubbleText(text: string): string | null {
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

  // 不再做“全文最后一个 docs/xxx.md”兜底，避免把引用路径（如 docs/prd.md）误判成目标写入路径。
  return null;
}

/**
 * 当文本里没明确给出 docs/xxx.md 时，按产出类型给统一默认名（所有 Agent 共用同一套规则）。
 * 目标：避免无脑回落到 docs/prd.md。
 */
function inferCanonicalMdPathByContent(text: string): string | null {
  const t = text.toLowerCase();
  if (/(qa engineer|测试工程师|qa\s*&\s*audit|质量审计)/i.test(text)) return "docs/qa-report.md";
  if (/(sprint backlog|冲刺优先级|rice|moscow|用户故事列表)/i.test(text)) return "docs/sprint-backlog.md";
  if (/(wbs|任务分解|工作包|task\s*summary)/i.test(text)) return "docs/wbs.md";
  if (/(进度报|status report|当前状态|预计完成时间|项目状态)/i.test(text)) return "docs/project-status.md";
  if (/(会议纪要|meeting notes|行动项)/i.test(text)) return "docs/meeting-notes.md";
  if (/(风险登记|risk log|mitigation)/i.test(text)) return "docs/risk-log.md";
  if (/(里程碑|milestone)/i.test(text)) return "docs/milestone-plan.md";
  if (/(测试方案|测试报告|qa|验收|test plan|test report)/i.test(text)) return "docs/qa-report.md";
  if (/(架构|architecture|边界|数据流|接口契约)/i.test(text)) return "docs/architecture-note.md";
  if (/(ui spec|视觉规范|界面设计|组件库)/i.test(text)) return "docs/ui-spec.md";
  if (/(ux|信息架构|交互流程)/i.test(text)) return "docs/ux-architecture.md";
  if (/(api|接口说明|openapi|swagger)/i.test(text)) return "docs/api-summary.md";
  if (/(代码评审|review|审查)/i.test(text)) return "docs/code-review-report.md";
  if (/(发布|部署|devops|ci\/cd)/i.test(text)) return "docs/release-plan.md";
  if (/(prd|需求文档|验收口径|用户故事)/i.test(text)) return "docs/prd.md";
  if (/(市场调研|趋势研究|竞品)/i.test(text)) return "docs/market-research.md";
  if (t.includes("markdown")) return "docs/note.md";
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
 * 将上一条助手全文落盘：若含可解析的 workspace-write 则按其中 path 写；否则按 Agent 身份或内容推断路径。
 */
export function buildConfirmWriteItems(
  assistantRaw: string,
  defaultRelativePath: string,
  agentStem?: string,
): { path: string; content: string }[] {
  const stemPath = agentStem ? defaultArtifactPathForAgent(normalizeAgentStem(agentStem)) : null;
  const fallback =
    stemPath ||
    defaultRelativePath.trim().replace(/^[/\\]+/, "").replace(/\\/g, "/") ||
    "";
  const parsed = parseWorkspaceWriteItemsFromBubble(assistantRaw);
  if (parsed.length > 0) return parsed;
  let body = assistantRaw.trim();
  body = body.replace(/\n*【工作区已写入】[\s\S]*$/u, "").trim();
  body = stripWorkspaceWriteFencesForHistory(body);
  if (!body) return [];
  const suggested = inferSuggestedWritePathFromBubbleText(assistantRaw);
  const canonical = inferCanonicalMdPathByContent(body);
  const parsedChain = parseActiveChainFromBubbleText(body);
  const wbsChainPath =
    parsedChain.ok && (parsedChain.state.steps?.length ?? 0) > 0 ? "docs/wbs.md" : null;
  const pathForPlain =
    suggested && !suggested.includes("..")
      ? suggested
      : wbsChainPath && !wbsChainPath.includes("..")
        ? wbsChainPath
        : canonical && !canonical.includes("..")
          ? canonical
          : fallback;
  return [{ path: pathForPlain, content: body }];
}
