import type { DesktopApi } from "@/types/desktop";
import {
  runCommandInWorkbenchTerminalBridge,
  workbenchTerminalFocusTab,
} from "@/lib/workbench-terminal-run-bridge";
import {
  extractPreviewHint,
  formatPreviewAssistantReply,
  isPythonPreviewQuestion,
  performProjectPreview,
} from "@/lib/project-preview";

export type ProjectRunPlan = {
  ok: boolean;
  kind?: string;
  error?: string;
  label?: string;
  command?: string;
  terminalCommand?: string;
  script?: string;
  entryRel?: string;
  cwdRel?: string;
};

function isRunProjectIntent(text: string): boolean {
  const t = text.trim();
  return (
    /(?:运行|启动|run|start).*(?:项目|应用|dev|开发服务器|本地服务)/i.test(t) ||
    /^(?:运行|启动)\s*项目/i.test(t)
  );
}

function planToTerminalCommand(plan: ProjectRunPlan): string {
  if (plan.terminalCommand?.trim()) return plan.terminalCommand.trim();
  if (plan.kind === "npm-script" && plan.script) {
    const base = plan.command?.trim() || `npm run ${plan.script}`;
    if (plan.cwdRel) return `cd "${plan.cwdRel}" && ${base}`;
    return base;
  }
  if (plan.kind === "python" && plan.entryRel) {
    return `python3 ${plan.entryRel}`;
  }
  if (plan.command?.trim()) {
    const base = plan.command.trim();
    if (plan.cwdRel) return `cd "${plan.cwdRel}" && ${base}`;
    return base;
  }
  return "";
}

function defaultRunProjectCommand(): string {
  return "npm run dev";
}

function formatTerminalRunReply(plan: ProjectRunPlan, command: string, sent: boolean): string {
  if (sent) {
    const detail = plan.label ? `（${plan.label}）` : "";
    return `已在终端执行 \`${command}\`${detail}，输出见底部终端面板。`;
  }
  return `终端未就绪，请复制运行：\`${command}\``;
}

/**
 * Cursor 式「运行项目」：检测脚本 → 打开终端 → 执行命令（可见输出）。
 */
export async function runProjectFromChat(
  api: DesktopApi,
  userLine: string,
  opts?: { openTerminal?: () => void },
): Promise<{ ok: boolean; displayText: string; url?: string | null; ranInTerminal?: boolean }> {
  const runProject = isRunProjectIntent(userLine);
  const hint = extractPreviewHint(userLine);
  const preferPython = isPythonPreviewQuestion(userLine);

  opts?.openTerminal?.();

  /** 等待终端面板挂载（terminalOpen 触发重渲染） */
  if (runProject) {
    await new Promise((r) => window.setTimeout(r, 500));
  }
  workbenchTerminalFocusTab();

  if (!api.workspaceDetectRunPlan) {
    if (runProject) {
      const cmd = defaultRunProjectCommand();
      const sent = await runCommandInWorkbenchTerminalBridge(cmd);
      return {
        ok: sent,
        ranInTerminal: sent,
        displayText: formatTerminalRunReply(
          { ok: true, label: "默认 dev 脚本", command: cmd },
          cmd,
          sent,
        ),
      };
    }
    return {
      ok: false,
      displayText: "当前无法自动检测启动方式，请在底部终端手动运行项目。",
    };
  }

  const plan = (await api.workspaceDetectRunPlan({
    hint: runProject ? userLine.trim() : hint,
    userLine: userLine.trim(),
    preferStatic: !runProject,
    preferPython,
  })) as ProjectRunPlan;

  if (runProject) {
    const cmd = plan.ok ? planToTerminalCommand(plan) || defaultRunProjectCommand() : defaultRunProjectCommand();
    const sent = await runCommandInWorkbenchTerminalBridge(cmd, { maxWaitMs: 15_000 });
    return {
      ok: sent,
      ranInTerminal: sent,
      displayText: formatTerminalRunReply(
        plan.ok ? plan : { ok: true, label: "默认 dev 脚本", command: cmd },
        cmd,
        sent,
      ),
    };
  }

  if (!plan.ok) {
    return {
      ok: false,
      displayText: `无法识别启动方式：${plan.error || "未检测到 dev/start 脚本或可预览文件"}。`,
    };
  }

  const terminalCmd = planToTerminalCommand(plan);
  if (terminalCmd && (plan.kind === "npm-script" || plan.kind === "python")) {
    const sent = await runCommandInWorkbenchTerminalBridge(terminalCmd);
    return {
      ok: sent,
      ranInTerminal: sent,
      displayText: formatTerminalRunReply(plan, terminalCmd, sent),
    };
  }

  if (plan.kind === "static") {
    const preview = await performProjectPreview(api, userLine, {
      preferStatic: true,
      preferPython,
      entryRel: plan.entryRel,
    });
    return {
      ok: preview.ok,
      displayText: preview.displayText,
      url: preview.url,
    };
  }

  if (terminalCmd) {
    const sent = await runCommandInWorkbenchTerminalBridge(terminalCmd);
    return {
      ok: sent,
      ranInTerminal: sent,
      displayText: formatTerminalRunReply(plan, terminalCmd, sent),
    };
  }

  const preview = await performProjectPreview(api, userLine);
  return {
    ok: preview.ok,
    displayText: preview.displayText,
    url: preview.url,
  };
}

export { formatPreviewAssistantReply };
