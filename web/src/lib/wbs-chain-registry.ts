import type { DesktopApi } from "@/types/desktop";
import type { ActiveChainState } from "@/lib/parse-active-chain";
import { parseActiveChainFromBubbleText } from "@/lib/parse-active-chain";
import { MSG_API_NOT_READY } from "@/lib/ui-copy";

export const DEFAULT_WBS_REL_PATH = "docs/wbs.md";

export const WBS_GENERATE_PM_PROMPT = `/agent project-manager 请为当前工作区项目输出完整 WBS，并确保可解析为任务链：
1. 使用 Markdown 表格，列含：任务编号、工作摘要、执行 Agent、依赖任务、交付标准
2. 任务编号格式 WBS-01、WBS-02…
3. 执行 Agent 使用可识别角色（如 前端工程师、后端工程师、测试工程师 或 frontend-engineer 等）
4. 在回复中给出完整表格（系统将自动写入 ${DEFAULT_WBS_REL_PATH} 并注册到「任务链」列表）`;

export function wbsChainNameFromPath(relPath: string): string {
  return `WBS · ${relPath.replace(/^\/+/, "")}`;
}

function summaryFromInstruction(instruction: string): string {
  const m = instruction.match(/^请执行任务\s+\S+[：:]\s*([\s\S]*)$/);
  if (m) {
    const body = m[1].trim();
    const first = body.split("\n")[0]?.trim() ?? body;
    return first.replace(/\s+/g, " ");
  }
  return instruction.replace(/\s+/g, " ").trim().slice(0, 200);
}

function escapeMdCell(s: string): string {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

/** 由任务链步骤生成标准 WBS Markdown（落盘 docs/wbs.md） */
export function buildWbsMarkdownFromChainState(
  state: ActiveChainState,
  opts?: { title?: string; sourceNote?: string },
): string {
  const title = opts?.title ?? "WBS 任务分解";
  const lines = [
    `# ${title}`,
    "",
    opts?.sourceNote ?? "由 Claude Orchestrator 根据项目经理 WBS 自动生成。",
    "",
    "| 任务编号 | 工作摘要 | 执行 Agent |",
    "| --- | --- | --- |",
  ];
  state.steps.forEach((s, i) => {
    const taskId = s.taskId?.trim() || `WBS-${String(i + 1).padStart(2, "0")}`;
    const summary = escapeMdCell(summaryFromInstruction(s.instruction));
    const agent = escapeMdCell(s.agentName);
    lines.push(`| ${taskId} | ${summary} | ${agent} |`);
  });
  lines.push("");
  return lines.join("\n");
}

function pickWbsMarkdownToWrite(
  state: ActiveChainState,
  markdownSource?: string,
): string {
  const src = markdownSource?.trim();
  if (src) {
    const parsed = parseActiveChainFromBubbleText(src);
    if (parsed.ok && (parsed.state.steps?.length ?? 0) > 0) {
      if (/\|.+\|/.test(src) && /工作摘要|执行\s*agent|task\s*summary/i.test(src)) {
        return src.includes("# WBS")
          ? src
          : `# WBS 任务分解\n\n${src.trim()}\n`;
      }
    }
  }
  return buildWbsMarkdownFromChainState(state);
}

export async function registerParsedChainInList(
  api: DesktopApi,
  opts: {
    state: ActiveChainState;
    name?: string;
    description?: string;
    wbsPath?: string;
    resetProgress?: boolean;
  },
): Promise<
  | { ok: true; chainId: string; chainName: string; stepCount: number }
  | { ok: false; error: string }
> {
  if (!api.orchestrationCreateChain || !api.orchestrationActivateChain) {
    return { ok: false, error: MSG_API_NOT_READY };
  }

  const steps = opts.state.steps?.filter((s) => s.agentName?.trim() && s.instruction?.trim()) ?? [];
  if (!steps.length) {
    return { ok: false, error: "任务链步骤为空" };
  }

  const state: ActiveChainState = {
    status: "idle",
    currentIndex: opts.resetProgress !== false ? 0 : (opts.state.currentIndex ?? 0),
    steps,
  };

  const wbsPath = opts.wbsPath?.trim() || DEFAULT_WBS_REL_PATH;
  const chainName = opts.name?.trim() || wbsChainNameFromPath(wbsPath);
  const description =
    opts.description?.trim() || `WBS 来源：${wbsPath} · ${steps.length} 步`;

  const listR = await api.orchestrationListChains?.();
  const items = listR?.ok ? (listR.items ?? []) : [];
  const existing = items.find(
    (c) =>
      c.name === chainName ||
      (opts.wbsPath && c.description?.includes(opts.wbsPath)) ||
      c.description?.includes(`WBS 来源：${wbsPath}`),
  );

  let chainId = "";

  if (existing?.id && api.orchestrationUpdateChain) {
    const updated = await api.orchestrationUpdateChain({
      id: existing.id,
      name: chainName,
      description,
      enabled: true,
      state,
    });
    if (!updated.ok) {
      return { ok: false, error: updated.error ?? "更新任务链失败" };
    }
    chainId = existing.id;
  } else {
    const created = await api.orchestrationCreateChain({
      name: chainName,
      description,
      category: "custom",
      templateId: null,
      enabled: true,
      state,
    });
    if (!created.ok || !created.chain?.id) {
      return { ok: false, error: created.error ?? "创建任务链失败" };
    }
    chainId = created.chain.id;
  }

  const act = await api.orchestrationActivateChain(chainId);
  if (!act.ok) {
    return { ok: false, error: act.error ?? "激活任务链失败" };
  }

  return { ok: true, chainId, chainName, stepCount: steps.length };
}

/** 写入 WBS Markdown 并注册/激活任务链（可在「任务链」列表查看） */
export async function persistWbsAndRegisterChain(
  api: DesktopApi,
  opts: {
    state: ActiveChainState;
    wbsPath?: string;
    markdownSource?: string;
    chainName?: string;
    skipWriteMarkdown?: boolean;
  },
): Promise<
  | {
      ok: true;
      chainId: string;
      chainName: string;
      stepCount: number;
      wbsPath: string;
    }
  | { ok: false; error: string }
> {
  const wbsPath = opts.wbsPath?.trim() || DEFAULT_WBS_REL_PATH;

  if (!opts.skipWriteMarkdown && api.workspaceApplyWriteFence) {
    const md = pickWbsMarkdownToWrite(opts.state, opts.markdownSource);
    try {
      const wr = await api.workspaceApplyWriteFence([{ path: wbsPath, content: md }]);
      if (!wr.ok) {
        return { ok: false, error: wr.error || `写入 ${wbsPath} 失败` };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const registered = await registerParsedChainInList(api, {
    state: opts.state,
    wbsPath,
    name: opts.chainName,
    resetProgress: true,
  });
  if (!registered.ok) return registered;

  return {
    ok: true,
    chainId: registered.chainId,
    chainName: registered.chainName,
    stepCount: registered.stepCount,
    wbsPath,
  };
}

export type WbsChainIntent =
  | { matched: false }
  | { matched: true; action: "generate-wbs" }
  | { matched: true; action: "sync-from-workspace"; autoRun: boolean };

export type WbsChainSyncResult =
  | {
      ok: true;
      pickedPath: string;
      chainName: string;
      chainId: string;
      stepCount: number;
      autoRun: boolean;
    }
  | { ok: false; error: string };

/** @deprecated 使用 parseWbsChainIntent */
export type WbsChatCommand =
  | { matched: false }
  | { matched: true; action: "sync" }
  | { matched: true; action: "generate" };

/** 识别 slash 与自然语言：从工作区 WBS 生成/同步项目任务链 */
export function parseWbsChainIntent(raw: string): WbsChainIntent {
  const t = raw.trim();
  if (!t) return { matched: false };

  if (t.startsWith("/wbs")) {
    const rest = t.slice(4).trim();
    if (rest === "生成" || rest === "generate" || rest === "gen") {
      return { matched: true, action: "generate-wbs" };
    }
    const autoRun =
      rest === "执行" ||
      rest === "run" ||
      rest === "开工" ||
      rest === "执行链" ||
      /^(执行|开工|跑)/.test(rest);
    if (!rest || rest === "同步" || rest === "sync" || rest === "链" || rest === "chain" || autoRun) {
      return { matched: true, action: "sync-from-workspace", autoRun };
    }
    return { matched: false };
  }

  if (/^\/任务链(?:\s+(.*))?$/i.test(t)) {
    const rest = (t.match(/^\/任务链(?:\s+(.*))?$/i)?.[1] ?? "").trim();
    const autoRun = /^(执行|开工|跑|run)/i.test(rest);
    return { matched: true, action: "sync-from-workspace", autoRun };
  }

  if (t.length > 160) return { matched: false };

  const autoRunPatterns: RegExp[] = [
    /^(开始|继续)?执行.*任务链/,
    /任务链.*(开工|执行|跑起来|跑链)/,
    /按\s*wbs\s*(开工|执行)/i,
    /wbs.*(开工|执行|跑链|跑起来)/i,
    /同步.*并.*执行/,
  ];
  for (const re of autoRunPatterns) {
    if (re.test(t)) return { matched: true, action: "sync-from-workspace", autoRun: true };
  }

  const syncPatterns: RegExp[] = [
    /生成.*(项目)?任务链/,
    /(创建|同步|建立|更新).*(项目)?任务链/,
    /根据.{0,24}wbs.{0,24}(生成|同步|创建|建立)/i,
    /wbs.{0,32}(生成|同步|转|变|建).{0,12}(任务链|执行链|链)/i,
    /从.{0,20}wbs.{0,20}(生成|同步|创建)/i,
    /把.{0,20}wbs.{0,20}(转成|变成|同步为).{0,12}任务链/,
    /生成对应.{0,12}任务链/,
    /^(同步|生成|创建)\s*任务链$/,
    /^任务链\s*(生成|同步)$/,
  ];
  for (const re of syncPatterns) {
    if (re.test(t)) return { matched: true, action: "sync-from-workspace", autoRun: false };
  }

  return { matched: false };
}

/** @deprecated 使用 parseWbsChainIntent */
export function parseWbsChatCommand(raw: string): WbsChatCommand {
  const intent = parseWbsChainIntent(raw);
  if (!intent.matched) return { matched: false };
  if (intent.action === "generate-wbs") return { matched: true, action: "generate" };
  return { matched: true, action: "sync" };
}

export function formatWbsChainSyncAssistantReply(result: WbsChainSyncResult & { ok: true }): string {
  const lines = [
    `已根据工作区 **${result.pickedPath}** 生成项目任务链 **「${result.chainName}」**（共 ${result.stepCount} 步）。`,
    "",
    "- 可在侧栏 **任务链** 列表查看与编辑（搜索 **WBS** 或筛选 **自定义**）",
    result.autoRun
      ? "- 已在后台 **开始执行**；切换页签不会中断"
      : "- 底部显示 **工作流：待执行** 时，到任务链页点 **执行** 即可开跑",
    "",
    "快捷命令：`/任务链` 仅生成 · `/任务链 执行` 或 `/wbs 同步` 生成并执行",
  ];
  return lines.join("\n");
}
