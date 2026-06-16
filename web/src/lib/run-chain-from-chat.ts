import type { SavedChainSummary } from "@/types/desktop";
import { getDesktop } from "@/lib/desktop-api";
import {
  formatChainListForAgent,
  resolveChainQuery,
} from "@/lib/agent-chain-catalog";
import { parseChainCommand } from "@/lib/parse-chain-command";
import { syncOfficialGenericChains } from "@/lib/sync-official-chains";
import type { ChainRunOptions } from "@/lib/orchestration-chain-runner";
import { MSG_API_NOT_READY } from "@/lib/ui-copy";

export async function handleChainChatCommand(
  text: string,
  agentStem: string,
  runChain: (opts?: ChainRunOptions) => Promise<void>,
): Promise<{ handled: true; assistantText: string } | { handled: false }> {
  const cmd = parseChainCommand(text);
  if (!cmd.matched) return { handled: false };

  const api = getDesktop();
  if (!api?.orchestrationActivateChain || !api.orchestrationStartChainRun) {
    return {
      handled: true,
      assistantText: MSG_API_NOT_READY,
    };
  }

  await syncOfficialGenericChains();
  const listR = await api.orchestrationListChains?.();
  const savedItems: SavedChainSummary[] = listR?.ok ? (listR.items ?? []) : [];

  if (cmd.action === "list") {
    return { handled: true, assistantText: formatChainListForAgent(agentStem, savedItems) };
  }

  const entry = resolveChainQuery(cmd.query, agentStem, savedItems);
  if (!entry) {
    return {
      handled: true,
      assistantText:
        `未找到匹配「${cmd.query}」的任务链。\n\n` + formatChainListForAgent(agentStem, savedItems),
    };
  }

  const act = await api.orchestrationActivateChain(entry.id);
  if (!act.ok) {
    return {
      handled: true,
      assistantText: `无法激活任务链「${entry.name}」：${act.error ?? "未知错误"}`,
    };
  }

  await runChain({ skipConfirm: true });
  return {
    handled: true,
    assistantText:
      `已开始后台执行任务链「${entry.name}」（${entry.stepCount} 步）。\n` +
      `可在顶栏查看进度；切换页签不会中断。发送停止指令或点击「停止」可中断。`,
  };
}
