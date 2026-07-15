import { toast } from "sonner";
import { getDesktop } from "@/lib/desktop-api";
import { runOrchestrationChainInBackground } from "@/lib/orchestration-chain-runner";
import { MSG_API_NOT_READY } from "@/lib/ui-copy";

const REVIEW_SKILLS = [
  "security-review",
  "correctness-review",
  "maintainability-review",
  "react-best-practices",
];

function buildReviewInstruction(baseBranch: string, diff: string) {
  const body = diff.trim() || `（相对 ${baseBranch} 无差异）`;
  return [
    "【Agent】global://code-reviewer",
    `【对照分支】${baseBranch}`,
    `【输入】以下为 git diff ${baseBranch} 的输出：`,
    "",
    body,
    "",
    "【任务】对照上述分支审查 diff；问题分级 + 文件行号引用；阻塞项须可执行修复建议",
    "【PATH】docs/code-review-report.md",
    "【WRITE】结构化中文 markdown",
  ].join("\n");
}

/** 对照 main/master 启动 code-reviewer 后台审查 */
export async function runScmDiffCodeReview(): Promise<{ ok: boolean; error?: string }> {
  const api = getDesktop();
  if (!api?.orchestrationCreateChain || !api.orchestrationActivateChain) {
    toast.error(MSG_API_NOT_READY);
    return { ok: false, error: MSG_API_NOT_READY };
  }

  let baseBranch = "main";
  let diff = "";
  if (api.workspaceGetGitDiffVsBase) {
    const diffR = await api.workspaceGetGitDiffVsBase();
    if (!diffR.ok) {
      toast.error(diffR.error || "无法读取对照 diff");
      return { ok: false, error: diffR.error || "无法读取对照 diff" };
    }
    baseBranch = diffR.baseBranch || baseBranch;
    diff = String(diffR.diff || "").slice(0, 120_000);
  }

  const instruction = buildReviewInstruction(baseBranch, diff);
  const chainR = await api.orchestrationCreateChain({
    name: `源码审查 · ${baseBranch}`,
    description: `对照 ${baseBranch} 审查 diff`,
    category: "custom",
    templateId: null,
    state: {
      status: "idle",
      currentIndex: 0,
      steps: [
        {
          agentName: "code-reviewer",
          taskId: "SCM-REVIEW",
          instruction,
          skills: REVIEW_SKILLS,
          mcps: [],
        },
      ],
    },
  });

  if (!chainR.ok || !chainR.chain?.id) {
    const err = chainR.error || "创建审查任务失败";
    toast.error(err);
    return { ok: false, error: err };
  }

  const act = await api.orchestrationActivateChain(chainR.chain.id);
  if (!act.ok) {
    const err = act.error || "激活审查任务失败";
    toast.error(err);
    return { ok: false, error: err };
  }

  await runOrchestrationChainInBackground({ skipConfirm: true });
  toast.success(`已启动对照 ${baseBranch} 的代码审查`);
  return { ok: true };
}
