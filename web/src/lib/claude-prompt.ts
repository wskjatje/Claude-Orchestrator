import type { DesktopApi } from "@/types/desktop";
import type { PriorTurn, UserImageAttachment } from "@/lib/ollama-messages";
import { agentStemFromBasename } from "@/lib/agent-basename";

function workspaceDirTrimmed(dir: string | null): dir is string {
  return typeof dir === "string" && dir.trim().length > 0;
}

export type ClaudeOrchestrationHints = {
  /** Claude Code CLI --model，编排层（sonnet / opus / haiku） */
  orchestratorModel?: string;
  /** 建议 MCP `ollama_chat` 使用的 Ollama 模型标签 */
  localOllamaModel?: string;
  /** Ollama HTTP 基址，须与 MCP 环境 OLLAMA_HOST 一致 */
  ollamaBase?: string;
};

/**
 * 将对话上下文折叠为单条字符串，供 Claude Code CLI `claude -p` 使用。
 * 桌面应用**不直连 Ollama**；本地开源模型推理须由 Claude 通过 MCP 工具 `ollama-local` / `ollama_chat` 调度。
 */
export async function buildClaudeCodePrompt(
  desktop: DesktopApi,
  opts: {
    workspaceDir: string | null;
    priorHistory: PriorTurn[];
    userLine: string;
    userAttachments?: UserImageAttachment[];
    savedImagePaths?: string[];
    orchestration?: ClaudeOrchestrationHints;
    /** 与设置 `localAgentBasename` 同源；缺省按产品经理（product-manager） */
    localAgentBasename?: string | null;
    /** 链尾自主学习等场景勿注入默认角色段，避免干扰 Skill */
    skipDefaultRoleBlock?: boolean;
    /** 当前 Agent 可调用的任务链摘要（对话 /chain 与引导用） */
    chainCatalogSnippet?: string;
  },
): Promise<string> {
  let executionSnapshot = "";
  if (workspaceDirTrimmed(opts.workspaceDir)) {
    try {
      const snap = await desktop.workspaceGetExecutionSnapshot();
      if (snap?.ok && typeof snap.text === "string" && snap.text.trim()) {
        executionSnapshot =
          "\n【当前项目执行情况快照】\n" +
          "以下为应用从你的「所选工作区」采集的客观事实；若须写入磁盘请使用 ```workspace-write``` JSON。\n\n" +
          snap.text.trim();
      }
    } catch {
      executionSnapshot = "\n【快照】采集失败，可忽略。\n";
    }
  }

  let crossAgentSnippet = "";
  if (typeof desktop.getCrossAgentContext === "function") {
    try {
      const cx = await desktop.getCrossAgentContext();
      if (cx?.ok && typeof cx.text === "string" && cx.text.trim()) {
        crossAgentSnippet = "\n\n" + cx.text.trim();
      }
    } catch {
      /* ignore */
    }
  }

  const orch = opts.orchestration ?? {};
  const localHint =
    orch.localOllamaModel?.trim() ||
    "（用户未在设置中指定，可先 ollama_list_models 再选）";
  const orchName = orch.orchestratorModel?.trim() || "（由会话选择）";

  const stem = agentStemFromBasename(opts.localAgentBasename ?? undefined);
  const roleBlock =
    opts.skipDefaultRoleBlock
      ? ""
      : [
          `【默认角色·桌面助手】`,
          `本轮默认以 Agent「${stem}」为第一视角（对应 ~/.claude/agents/${stem}.md；如需显式路由可用“Agent 路由：global://${stem}”文字指令，避免使用斜杠命令）。`,
          `若为产品经理（product-manager）：先做需求澄清、范围与验收口径、风险与依赖；用户未明确确认前不做破坏性仓库变更。`,
          `自主学习：日常可在结论中提示将可复用经验追加到 ~/.claude/memory/经验库.txt；任务链全部跑完后应用会按 ~/.claude/skills/self_learning.md 自动触发复盘（须已安装该 Skill）。`,
          `需求确认后的移交：当用户已书面确认需求（或明确表示可进入拆解/执行）时，请输出简短「已确认需求摘要」，并说明下一步应由「项目经理」Agent（project-manager）做 WBS 拆解与执行编排；用户可在本条消息上「从本条生成任务链」写入 ~/.claude/orchestration/active-chain.json（首步建议使用 project-manager），再点击「一键跑链」由 Claude Code 经 MCP 逐步执行。`,
          `任务链调用：用户可用 /chain list 列出、/chain run <名称> 后台执行与本 Agent 相关的通用任务链；你可在回复中引导用户使用这些命令。`,
        ].join("\n");

  const preamble = [
    "【架构约束·强制】本请求由本地桌面助手提交给 Claude Code CLI；应用已注入 MCP 服务 `ollama-local`（含工具 `ollama_chat`、`ollama_list_models`）。",
    "禁止假设「桌面直连 Ollama」：任何本机 Ollama 推理必须通过 MCP 工具调用（Claude 编排 → MCP → Ollama）。",
    "【一轮会话·模型已融合】用户在界面中已将「编排（CLI --model）」与「本机 Ollama（MCP）」作为同一条链路选择；须视为一体：" +
      "编排层为 " +
      orchName +
      "；当需要本机权重推理时，调用 `ollama_chat` 的 model 必须使用下列「本地推理模型建议」（除非用户在本轮对话里明确要求改用其它标签）。",
    "【编排层模型】当前 CLI `--model`（Anthropic 侧编排）：" + orchName,
    "【本地推理模型建议】当需要调用 Ollama 时，`ollama_chat` 的 model 参数优先使用：" + localHint,
    "【Ollama 服务地址】应与设置一致（MCP 环境 OLLAMA_HOST）：" +
      (orch.ollamaBase?.trim() || "http://127.0.0.1:11434"),
    "在同一工作区目录执行时，CLI 会加载 ~/.claude 下 Skills、Hooks、Agents；请先完成权限与任务判定，再决定是否调用 ollama_chat。",
    "【语言】用户使用中文时，除代码、路径、库名或用户要求英文外，通篇用简体中文。",
    "【可见回复】任务链或分步执行场景：除代码与路径外，用简体中文要点收束（建议少量列表）；勿用英文小节标题堆砌 Implementation Plan / Execution；勿在最终正文重复粘贴超大 JSON（含 workspace-write 工具负载全文）。",
    "【写盘】若用户要求保存到工作区，请在回复中使用 ```workspace-write``` JSON：单文件 {\"path\":\"相对路径\",\"content\":\"正文\"} 或多文件数组。代码块定界须用三个反引号（与 ~ 同键），勿用三个英文单引号。首行反引号加 workspace-write 后换行再写 JSON。",
    "【防误判·强制】仅对话文字**不算**已创建磁盘文件；**禁止**在未输出 `workspace-write` 且未确认助手已落盘成功时，声称「已生成 manifest/outputs」「基线已建立」「其它 Agent 可自动读取」，或**仅以「### 涉及文件路径」等列表暗示已完成落盘**（须配合 ```workspace-write``` 或工具写盘才可声称已写入工作区）。",
    opts.workspaceDir
      ? `【工作区路径】${opts.workspaceDir}`
      : "【工作区路径】（未选择）",
    executionSnapshot,
    crossAgentSnippet,
  ].join("\n");

  const blocks: string[] = [preamble];
  if (roleBlock) blocks.push(roleBlock);
  if (opts.chainCatalogSnippet?.trim()) blocks.push(opts.chainCatalogSnippet.trim());

  for (const m of opts.priorHistory) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const tag = m.role === "user" ? "### 用户" : "### 助手";
    let body = m.content;
    if (m.role === "user" && m.attachments?.length) {
      const names = m.attachments
        .filter((a) => a?.kind === "image")
        .map((a) => a.name || "image")
        .join(", ");
      body += `\n（本条含 ${m.attachments.length} 个图片附件${names ? `：${names}` : ""}；若已落盘可在 .claudecode/chat-images/ 查找。）`;
    }
    blocks.push(`${tag}\n${body}`);
  }

  let userBlock = opts.userLine;
  if (opts.savedImagePaths?.length) {
    userBlock += `\n\n【附图·已落盘】用户上传 ${opts.savedImagePaths.length} 张截图，工作区相对路径：\n${opts.savedImagePaths.map((p) => `- ${p}`).join("\n")}\n请使用 Read 工具读取上述图片并结合用户问题分析（例如 HTTP 404 页面、终端报错）；禁止声称无法查看图片。`;
  } else if (opts.userAttachments?.length) {
    const names = opts.userAttachments
      .filter((a) => a?.kind === "image")
      .map((a) => a.name || "image")
      .join(", ");
    userBlock += `\n\n【附图】用户附带 ${opts.userAttachments.length} 张截图${names ? `（${names}）` : ""}。请根据用户在对话中的描述与上下文排查；若需读图请提示用户确认工作区已落盘或使用支持视觉的模型。`;
  }
  blocks.push(`### 用户（本轮）\n${userBlock}`);
  blocks.push(
    "### 指令\n" +
      "1）理解「用户（本轮）」意图；2）如需本机开源模型推理，先判定权限与任务范围，再调用 MCP 工具 `ollama_chat`（勿跳过 Claude 编排）；3）如需列举已安装模型，可调用 `ollama_list_models`；4）其它工具/MCP/Skill 按工作区配置执行。",
  );

  return blocks.join("\n\n");
}
