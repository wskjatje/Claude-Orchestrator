import { c as createLucideIcon } from "./app-shell-DfKeMRG5.js";
const __iconNode = [
  [
    "path",
    {
      d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",
      key: "1ngwbx"
    }
  ]
];
const Wrench = createLucideIcon("wrench", __iconNode);
function isAutoAgentBasename(basename) {
  const raw = typeof basename === "string" ? basename.trim().toLowerCase() : "";
  return !raw || raw === "auto" || raw === "__auto__";
}
function agentStemFromBasename(basename) {
  const raw = typeof basename === "string" ? basename.trim() : "";
  if (!raw || isAutoAgentBasename(raw)) return "product-manager";
  const lower = raw.toLowerCase();
  const stripMd = lower.endsWith(".md") ? raw.slice(0, -3).trim() : raw;
  return stripMd || "product-manager";
}
function workspaceDirTrimmed(dir) {
  return typeof dir === "string" && dir.trim().length > 0;
}
async function buildClaudeCodePrompt(desktop, opts) {
  let executionSnapshot = "";
  if (workspaceDirTrimmed(opts.workspaceDir)) {
    try {
      const snap = await desktop.workspaceGetExecutionSnapshot();
      if (snap?.ok && typeof snap.text === "string" && snap.text.trim()) {
        executionSnapshot = "\n【当前项目执行情况快照】\n以下为应用从你的「所选工作区」采集的客观事实；若须写入磁盘请使用 ```workspace-write``` JSON。\n\n" + snap.text.trim();
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
    }
  }
  const orch = opts.orchestration ?? {};
  const localHint = orch.localOllamaModel?.trim() || "（用户未在设置中指定，可先 ollama_list_models 再选）";
  const orchName = orch.orchestratorModel?.trim() || "（由会话选择）";
  const stem = agentStemFromBasename(opts.localAgentBasename ?? void 0);
  const roleBlock = opts.skipDefaultRoleBlock ? "" : [
    `【角色】Agent「${stem}」`,
    stem === "product-manager" ? "先做需求澄清与验收口径；未确认前不做破坏性变更。" : ""
  ].filter(Boolean).join("\n");
  const preamble = [
    "【环境】Claude Code CLI；本机 Ollama 须经 MCP 工具 ollama_chat 调用。",
    `【模型】编排 ${orchName}；Ollama ${localHint}`,
    opts.workspaceDir ? `【工作区】${opts.workspaceDir}` : "",
    "【语言】简体中文（代码与路径除外）。",
    "【写盘】保存到工作区时使用 ```workspace-write``` JSON。",
    executionSnapshot,
    crossAgentSnippet
  ].filter(Boolean).join("\n");
  const blocks = [preamble];
  if (roleBlock) blocks.push(roleBlock);
  if (opts.chainCatalogSnippet?.trim()) blocks.push(opts.chainCatalogSnippet.trim());
  for (const m of opts.priorHistory) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const tag = m.role === "user" ? "### 用户" : "### 助手";
    let body = m.content;
    if (m.role === "user" && m.attachments?.length) {
      const names = m.attachments.filter((a) => a?.kind === "image").map((a) => a.name || "image").join(", ");
      body += `
（本条含 ${m.attachments.length} 个图片附件${names ? `：${names}` : ""}；若已落盘可在 .claudecode/chat-images/ 查找。）`;
    }
    blocks.push(`${tag}
${body}`);
  }
  let userBlock = opts.userLine;
  if (opts.savedImagePaths?.length) {
    userBlock += `

【附图·已落盘】用户上传 ${opts.savedImagePaths.length} 张截图，工作区相对路径：
${opts.savedImagePaths.map((p) => `- ${p}`).join("\n")}
请使用 Read 工具读取上述图片并结合用户问题分析（例如 HTTP 404 页面、终端报错）；禁止声称无法查看图片。`;
  } else if (opts.userAttachments?.length) {
    const names = opts.userAttachments.filter((a) => a?.kind === "image").map((a) => a.name || "image").join(", ");
    userBlock += `

【附图】用户附带 ${opts.userAttachments.length} 张截图${names ? `（${names}）` : ""}。请根据用户在对话中的描述与上下文排查；若需读图请提示用户确认工作区已落盘或使用支持视觉的模型。`;
  }
  blocks.push(`### 用户（本轮）
${userBlock}`);
  blocks.push(
    "### 指令\n1）理解「用户（本轮）」意图；2）如需本机开源模型推理，先判定权限与任务范围，再调用 MCP 工具 `ollama_chat`（勿跳过 Claude 编排）；3）如需列举已安装模型，可调用 `ollama_list_models`；4）其它工具/MCP/Skill 按工作区配置执行。"
  );
  return blocks.join("\n\n");
}
export {
  Wrench as W,
  agentStemFromBasename as a,
  buildClaudeCodePrompt as b,
  isAutoAgentBasename as i
};
