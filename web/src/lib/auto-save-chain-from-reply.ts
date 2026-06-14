import { toast } from "sonner";
import type { DesktopApi } from "@/types/desktop";
import { parseActiveChainFromBubbleText } from "@/lib/parse-active-chain";

export type AutoSaveChainResult =
  | { saved: true; stepCount: number; source: "json" | "markdown" }
  | { saved: false; reason: "empty" | "unparseable" | "no-api" | "save-failed"; error?: string };

/**
 * 从助手正文解析 WBS / active-chain JSON，并写入 active-chain.json。
 * 用于聊天回复后自动生成任务链（用户再到「任务链」页检查并执行）。
 */
export async function autoSaveChainFromReply(
  api: DesktopApi | null | undefined,
  rawReply: string,
): Promise<AutoSaveChainResult> {
  const text = rawReply?.trim() ?? "";
  if (!text) return { saved: false, reason: "empty" };
  if (!api?.orchestrationSaveChain) return { saved: false, reason: "no-api" };

  const parsed = parseActiveChainFromBubbleText(text);
  if (!parsed.ok) return { saved: false, reason: "unparseable", error: parsed.error };

  const saved = await api.orchestrationSaveChain({ state: parsed.state });
  if (!saved.ok) {
    return { saved: false, reason: "save-failed", error: saved.error || "写入失败" };
  }

  return { saved: true, stepCount: parsed.state.steps.length, source: parsed.source };
}

export function notifyAutoSavedChain(
  stepCount: number,
  onOpenChains?: () => void,
): void {
  toast.success(`已自动生成 ${stepCount} 步任务链`, {
    description: "请到「任务链」点击「添加任务链」手动创建并保存；聊天结果不会自动出现在列表中。",
    duration: 6500,
    ...(onOpenChains
      ? {
          action: {
            label: "打开任务链",
            onClick: onOpenChains,
          },
        }
      : {}),
  });
}

export async function saveChainFromBubbleText(
  api: DesktopApi | null | undefined,
  content: string,
): Promise<{ ok: true; stepCount: number } | { ok: false; error: string }> {
  const r = await autoSaveChainFromReply(api, content);
  if (r.saved) return { ok: true, stepCount: r.stepCount };
  if (r.reason === "unparseable") return { ok: false, error: r.error || "未能解析任务链" };
  if (r.reason === "save-failed") return { ok: false, error: r.error || "写入失败" };
  if (r.reason === "no-api") return { ok: false, error: "当前无法写入任务链，请重启 npm run web:dev:full" };
  return { ok: false, error: "气泡内容为空" };
}
