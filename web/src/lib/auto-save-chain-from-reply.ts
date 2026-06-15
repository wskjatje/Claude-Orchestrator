import { toast } from "sonner";
import type { DesktopApi } from "@/types/desktop";
import { parseActiveChainFromBubbleText } from "@/lib/parse-active-chain";
import {
  DEFAULT_WBS_REL_PATH,
  persistWbsAndRegisterChain,
} from "@/lib/wbs-chain-registry";

export type AutoSaveChainResult =
  | {
      saved: true;
      stepCount: number;
      source: "json" | "markdown";
      chainId: string;
      chainName: string;
      wbsPath: string;
    }
  | { saved: false; reason: "empty" | "unparseable" | "no-api" | "save-failed"; error?: string };

/**
 * 从助手正文解析 WBS / active-chain，写入 docs/wbs.md 并注册到任务链列表。
 */
export async function autoSaveChainFromReply(
  api: DesktopApi | null | undefined,
  rawReply: string,
  opts?: { wbsPath?: string; skipWriteMarkdown?: boolean },
): Promise<AutoSaveChainResult> {
  const text = rawReply?.trim() ?? "";
  if (!text) return { saved: false, reason: "empty" };
  if (!api?.orchestrationCreateChain) return { saved: false, reason: "no-api" };

  const parsed = parseActiveChainFromBubbleText(text);
  if (!parsed.ok) return { saved: false, reason: "unparseable", error: parsed.error };

  const persisted = await persistWbsAndRegisterChain(api, {
    state: parsed.state,
    wbsPath: opts?.wbsPath ?? DEFAULT_WBS_REL_PATH,
    markdownSource: text,
    skipWriteMarkdown: opts?.skipWriteMarkdown,
  });
  if (!persisted.ok) {
    return { saved: false, reason: "save-failed", error: persisted.error };
  }

  return {
    saved: true,
    stepCount: persisted.stepCount,
    source: parsed.source,
    chainId: persisted.chainId,
    chainName: persisted.chainName,
    wbsPath: persisted.wbsPath,
  };
}

export function notifyAutoSavedChain(
  result: Pick<AutoSaveChainResult & { saved: true }, "stepCount" | "chainName" | "wbsPath">,
  onOpenChains?: () => void,
): void {
  toast.success(`已生成 WBS 与任务链「${result.chainName}」（${result.stepCount} 步）`, {
    description: `已写入 ${result.wbsPath}，可在侧栏「任务链」查看并执行。`,
    duration: 7000,
    ...(onOpenChains
      ? {
          action: {
            label: "打开任务链",
            onClick: () => onOpenChains?.(),
          },
        }
      : {}),
  });
}

export async function saveChainFromBubbleText(
  api: DesktopApi | null | undefined,
  content: string,
): Promise<
  | { ok: true; stepCount: number; chainId: string; chainName: string; wbsPath: string }
  | { ok: false; error: string }
> {
  const r = await autoSaveChainFromReply(api, content);
  if (r.saved) {
    return {
      ok: true,
      stepCount: r.stepCount,
      chainId: r.chainId,
      chainName: r.chainName,
      wbsPath: r.wbsPath,
    };
  }
  if (r.reason === "unparseable") return { ok: false, error: r.error || "未能解析任务链" };
  if (r.reason === "save-failed") return { ok: false, error: r.error || "写入失败" };
  if (r.reason === "no-api") return { ok: false, error: "当前无法写入任务链，请重启 npm run web:dev:full" };
  return { ok: false, error: "气泡内容为空" };
}
