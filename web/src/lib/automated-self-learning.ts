import type { DesktopApi, OrchestrationState } from "@/types/desktop";
import { ingestWorkspaceWritesAndCollapseDisplay } from "@/lib/assistant-reply";
import { buildClaudeCodePrompt } from "@/lib/claude-prompt";
import { maybeToastMissingWorkspaceWrite } from "@/lib/maybe-toast-workspace-write";
import { toast } from "sonner";

/** 与聊天会话 DiskMsg 对齐，供任务链结束后追加自主学习回合 */
export type SelfLearningDiskMsg = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  latencyMs?: number;
  requestError?: boolean;
};

/**
 * 编排模型为 Ollama 标签时，自主学习仍走 Claude Code，须回落到设置中的 CLI 别名。
 */
export function resolveClaudeModelForSelfLearning(
  sessionModelId: string,
  settingsModel: string,
): string {
  const s = sessionModelId.trim();
  if (/^(sonnet|opus|haiku)$/i.test(s)) return s.toLowerCase();
  if (/^claude-/i.test(s)) return s;
  const g = settingsModel.trim();
  if (g && /^(sonnet|opus|haiku)$/i.test(g)) return g.toLowerCase();
  return "sonnet";
}

/**
 * 任务链全部执行完毕后，按 `~/.claude/skills/self_learning.md` 再发一轮 `claude -p`（与旧版 `renderer.js` 行为对齐）。
 */
export async function runAutomatedSelfLearningAfterChain(
  api: DesktopApi,
  opts: {
    orchestrationMode?: "claude-code" | "local-mcp";
    sessionModelId: string;
    chainState: OrchestrationState;
    requestId?: string;
  },
): Promise<{ diskMsgs: SelfLearningDiskMsg[] }> {
  if (opts.orchestrationMode === "local-mcp") {
    return {
      diskMsgs: [
        {
          role: "assistant",
          content: "【自主学习跳过】当前为本地模型模式（local-mcp），不要求 Claude CLI 登录。",
          ts: Date.now(),
        },
      ],
    };
  }

  if (typeof api.claudeCodePrompt !== "function") {
    return {
      diskMsgs: [
        {
          role: "assistant",
          content: "【自主学习跳过】当前未暴露 claudeCodePrompt。",
          ts: Date.now(),
          requestError: true,
        },
      ],
    };
  }

  const settings = await api.getChatSettings();
  const model = resolveClaudeModelForSelfLearning(
    opts.sessionModelId,
    settings.model ?? "",
  );
  const n = Array.isArray(opts.chainState?.steps) ? opts.chainState.steps!.length : 0;

  const skillRead = await api.readClaudeSkillMarkdown("self_learning.md");
  let skillBody = "";
  if (skillRead?.ok && typeof skillRead.content === "string") {
    skillBody = skillRead.content.replace(/^---[\s\S]*?---\s*/, "").trim();
  }
  if (!skillBody) {
    skillBody =
      "（未能读取 ~/.claude/skills/self_learning.md）仍须执行：回顾目标与结果、对比预期与实际、提炼一条可迁移经验、写入 ~/.claude/memory/经验库.txt、输出总结。";
  }

  const userLine = [
    "【系统自动触发·自主学习】",
    "本消息由应用在任务链「全部步骤已执行完毕」后自动下发；请严格按下述 Skill 正文执行。",
    "",
    `任务链上下文：共 ${n} 步；链状态 status=${opts.chainState?.status ?? "—"}。`,
    "",
    skillBody,
  ].join("\n");

  const uiLabel =
    "【系统自动·自主学习】任务链已完成，正在按 ~/.claude/skills/self_learning.md 总结（非手动触发）。";

  const workspaceDir = await api.getWorkspace();
  const prompt = await buildClaudeCodePrompt(api, {
    workspaceDir,
    priorHistory: [],
    userLine,
    skipDefaultRoleBlock: true,
    orchestration: {
      orchestratorModel: model,
      localOllamaModel: settings.localOllamaModel,
      ollamaBase: settings.ollamaBase,
    },
  });

  const diskMsgs: SelfLearningDiskMsg[] = [{ role: "user", content: uiLabel, ts: Date.now() }];

  const started = Date.now();
  let res: {
    ok: boolean;
    content?: string;
    error?: string | null;
    aborted?: boolean;
  };
  try {
    res = await api.claudeCodePrompt({
      prompt,
      model,
      requestId: opts.requestId,
    });
  } catch (e) {
    res = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  if (!res.ok) {
    diskMsgs.push({
      role: "assistant",
      content: `【自主学习失败】${res.error || "未知错误"}`,
      ts: Date.now(),
      requestError: true,
    });
    try {
      await api.memoryAppendEvent({
        event: "desktop_self_learning",
        ok: false,
        error: res.error || "unknown",
        stepCount: n,
      });
    } catch {
      /* ignore */
    }
    return { diskMsgs };
  }

  const reply = res.content || "";
  maybeToastMissingWorkspaceWrite(reply);
  const displayContent = await ingestWorkspaceWritesAndCollapseDisplay(api, reply, (m) =>
    toast.warning(m, { duration: 12_000 }),
  );
  diskMsgs.push({
    role: "assistant",
    content: displayContent,
    ts: Date.now(),
    latencyMs: Math.max(0, Date.now() - started),
  });

  try {
    await api.memoryAppendEvent({
      event: "desktop_self_learning",
      ok: true,
      stepCount: n,
    });
  } catch {
    /* ignore */
  }

  return { diskMsgs };
}
