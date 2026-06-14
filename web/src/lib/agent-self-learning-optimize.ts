import type { DesktopApi } from "@/types/desktop";
import { buildClaudeCodePrompt } from "@/lib/claude-prompt";
import { resolveClaudeModelForSelfLearning } from "@/lib/automated-self-learning";

/**
 * 按 self_learning 工作流审阅并生成 Agent Markdown 修订稿（不自动落盘，由用户在编辑器中确认保存）。
 */
export async function optimizeAgentMarkdownViaWorkflow(
  api: DesktopApi,
  opts: {
    stem: string;
    basename: string;
    currentMarkdown: string;
    sessionModelId?: string;
  },
): Promise<{ ok: boolean; markdown?: string; error?: string }> {
  if (typeof api.claudeCodePrompt !== "function") {
    return { ok: false, error: "当前环境未暴露 Claude Code 接口。" };
  }

  const settings = await api.getChatSettings();
  const model = resolveClaudeModelForSelfLearning(
    opts.sessionModelId ?? settings.model ?? "",
    settings.model ?? "",
  );

  const skillRead = await api.readClaudeSkillMarkdown("self_learning.md");
  let skillBody = "";
  if (skillRead?.ok && typeof skillRead.content === "string") {
    skillBody = skillRead.content.replace(/^---[\s\S]*?---\s*/, "").trim();
  }
  if (!skillBody) {
    skillBody =
      "回顾目标与结果、对比预期与实际、提炼可迁移经验、写入 ~/.claude/memory/经验库.txt，并给出可执行的规则改进。";
  }

  const userLine = [
    "【工作流自我学习 · Agent 规则优化】",
    `目标：优化 ~/.claude/agents/${opts.basename}（stem: ${opts.stem}）`,
    "",
    "请严格参照下方 self_learning 方法论，审阅当前 Agent Markdown 并输出**一份完整可直接保存的修订版**（含 YAML frontmatter）。",
    "优化重点：职责边界清晰、可执行步骤、工具与权限约束、与任务链/其它 Agent 的协作说明。",
    "禁止只输出 diff 或建议列表；必须输出完整 .md 正文。",
    "",
    "=== 当前 Agent Markdown ===",
    opts.currentMarkdown.trim(),
    "",
    "=== self_learning Skill 正文 ===",
    skillBody,
  ].join("\n");

  try {
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
    const res = await api.claudeCodePrompt({ prompt, model });
    if (!res.ok) {
      return { ok: false, error: res.error || "优化请求失败" };
    }
    const text = String(res.content ?? "").trim();
    if (!text) return { ok: false, error: "模型未返回修订内容" };
    const fenced = text.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
    const markdown = (fenced?.[1] ?? text).trim();
    if (!markdown.includes("---") || !markdown.includes("description:")) {
      return {
        ok: false,
        error: "返回内容不像完整 Agent Markdown（缺少 frontmatter），请重试或手动编辑。",
      };
    }
    return { ok: true, markdown };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
