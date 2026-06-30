import type { DesktopApi } from "@/types/desktop";
import type { PriorTurn, UserImageAttachment } from "@/lib/ollama-messages";
import { agentStemFromBasename } from "@/lib/agent-basename";

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
    /** 附图经 stream-json inline 送入 Claude Code，不再提示 Read 落盘 */
    inlineVision?: boolean;
    /** Claude Code --resume：历史已在 CLI 会话内，勿重复折叠 priorHistory */
    sessionResume?: boolean;
    orchestration?: ClaudeOrchestrationHints;
    /** 与设置 `localAgentBasename` 同源；缺省按产品经理（product-manager） */
    localAgentBasename?: string | null;
    /** 链尾自主学习等场景勿注入默认角色段，避免干扰 Skill */
    skipDefaultRoleBlock?: boolean;
    /** 当前 Agent 可调用的任务链摘要（对话 /chain 与引导用） */
    chainCatalogSnippet?: string;
    /** MCP Ollama 聊天工具名（默认 ollama_chat） */
    mcpChatToolName?: string;
    /** MCP 模型列举工具名（默认 ollama_list_models） */
    mcpListModelsToolName?: string;
  },
): Promise<string> {
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
    "（未设置）";
  const orchName = orch.orchestratorModel?.trim() || "（默认）";

  const stem = agentStemFromBasename(opts.localAgentBasename ?? undefined);
  const roleBlock = opts.skipDefaultRoleBlock || stem === "__general__"
    ? ""
    : [
        `【角色】Agent「${stem}」`,
        stem === "product-manager"
          ? "先做需求澄清与验收口径；未确认前不做破坏性变更。"
          : "",
      ]
        .filter(Boolean)
        .join("\n");

  const mcpChatTool = opts.mcpChatToolName?.trim() || "ollama_chat";
  const mcpListModelsTool = opts.mcpListModelsToolName?.trim() || "ollama_list_models";

  const preamble = [
    `【环境】Claude Code CLI；Ollama 经 MCP ${mcpChatTool} 调用。`,
    `【模型】${orchName}；Ollama ${localHint}`,
    opts.workspaceDir ? `【工作区】${opts.workspaceDir}` : "",
    "【语言】zh_CN（代码/路径除外）。",
    stem === "__general__"
      ? "【MUST_NOT】不可使用 workspace-write。纯问答不写文件；仅用户明确要求写/生成/保存/更新时才可写。"
      : "【写盘】```workspace-write``` JSON。",
    crossAgentSnippet,
  ]
    .filter(Boolean)
    .join("\n");

  const blocks: string[] = [preamble];
  if (roleBlock) blocks.push(roleBlock);
  if (opts.chainCatalogSnippet?.trim()) blocks.push(opts.chainCatalogSnippet.trim());

  for (const m of opts.priorHistory) {
    if (opts.sessionResume) break;
    if (m.role !== "user" && m.role !== "assistant") continue;
    const tag = m.role === "user" ? "### 用户" : "### 助手";
    let body = m.content;
    if (m.role === "user" && m.attachments?.length) {
      if (opts.inlineVision) {
        body += `\n（本条含 ${m.attachments.length} 张截图，已作为 multimodal 附件随本轮一并送入模型。）`;
      } else {
        const names = m.attachments
          .filter((a) => a?.kind === "image")
          .map((a) => a.name || "image")
          .join(", ");
        body += `\n（本条含 ${m.attachments.length} 个图片附件${names ? `：${names}` : ""}；若已落盘可在 .claudecode/chat-images/ 查找。）`;
      }
    }
    blocks.push(`${tag}\n${body}`);
  }

  let userBlock = opts.userLine;
  if (opts.inlineVision) {
    /* 图片由 Claude Code stream-json content blocks 直送模型 */
  } else if (opts.savedImagePaths?.length) {
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
    "### INSTRUCTIONS\n" +
      "1) Understand user intent. 2) For local open-source model, check scope then call MCP `" + mcpChatTool + "`. 3) List models: `" + mcpListModelsTool + "`. 4) Other tools/MCP/Skills per workspace config.",
  );

  return blocks.join("\n\n");
}
