type FailureChannel = "CLI" | "Host" | "MCP" | "连接" | "工作区";

function detectChannels(err: string): FailureChannel[] {
  const ch = new Set<FailureChannel>();
  if (/ensureCli|未找到|claudePath|可执行 claude|npm 安装|claude -p|CLI/i.test(err)) {
    ch.add("CLI");
  }
  if (/Host Agent|Host：|preload|工具环不可用|host-agent/i.test(err)) {
    ch.add("Host");
  }
  if (
    /本地 MCP|localOrchestration|local-mcp|mcp\.json|MCP 编排|【MCP】|需 MCP 通道|禁止静默 Host/i.test(
      err,
    )
  ) {
    ch.add("MCP");
  }
  if (
    /Ollama|11434|连接失败|API Key|401|403|鉴权|配额|429|不支持 tools|toolsUnsupported|未输出可用正文|thinking/i.test(
      err,
    )
  ) {
    ch.add("连接");
  }
  if (/未选择工作区/i.test(err)) {
    ch.add("工作区");
  }
  return [...ch];
}

/** Agent 工具环失败：标注失败通道（CLI / Host / MCP）并附可行动下一步 */
export function enrichAgentFailureHint(error: string): string {
  const err = String(error || "").trim();
  if (!err) return "请求失败：未知错误";

  const channels = detectChannels(err);
  const tips: string[] = [];

  if (channels.includes("CLI") || /ensureCli|未找到|claudePath|可执行 claude|npm 安装/i.test(err)) {
    tips.push("【CLI】检查网络后重试（将自动 ensureCli），或 npm i -g @anthropic-ai/claude-code；成功回合气泡应标 CLI");
  }
  if (
    channels.includes("MCP") ||
    /本地 MCP|localOrchestration|local-mcp|【MCP】|需 MCP 通道/i.test(err)
  ) {
    tips.push(
      "【MCP】修复 Claude CLI 或本地编排；或在设置→高级→MCP 禁用相关服务器后再用 Host。成功 MCP 回合应标「MCP·用过」",
    );
  }
  if (/未输出可用正文|只返回了 thinking/i.test(err)) {
    tips.push("【本地直聊】在终端对同一模型试 `ollama run <模型>`；或换 qwen2.5 等非 thinking 模型后重试");
  } else if (/Ollama|11434|连接失败/i.test(err)) {
    tips.push("【连接】启动本机 Ollama（默认 11434），确认模型已 pull，或改用已配置的云端模型");
  }
  if (/不支持 tools|toolsUnsupported|tool_choice/i.test(err)) {
    tips.push("【连接】此回合需要工具时，换支持 function calling 的模型；纯问答应走直聊、不需要 tools");
  }
  if (channels.includes("工作区")) {
    tips.push("【工作区】先在工作区选择项目根目录");
  }
  if (/Host Agent 接口不可用|preload/i.test(err)) {
    tips.push("【Host】完全退出并重启桌面应用；Host 回落无 MCP（气泡标 Host）");
  } else if (/Host：/i.test(err)) {
    tips.push("【Host】无 MCP 保底路径；需要 MCP 时请保证 CLI 或本地编排成功");
  }
  if (/API Key|401|403|鉴权|配额|429/i.test(err)) {
    tips.push("【连接】检查模型供应商密钥与额度");
  }

  let head = err.startsWith("请求失败：") ? err : `请求失败：${err}`;
  if (/Agent 工具环不可用/i.test(err) && !/CLI|Host|本地/.test(err.slice(0, 40))) {
    head = head.replace(
      /^请求失败：Agent 工具环不可用/,
      "请求失败：工具环不可用（CLI→Host）",
    );
  }

  const tag =
    channels.length > 0 ? `通道：${channels.join(" · ")}\n` : channels.length === 0 && tips.length ? "" : "";

  if (!tips.length && !tag) return head;
  return `${tag}${head}${tips.length ? `\n${tips.map((t) => `· ${t}`).join("\n")}` : ""}`;
}
