type FailureChannel = "本机编排" | "Host" | "MCP" | "连接" | "工作区";

export type AgentFailureKind =
  | "connection"
  | "model-capability"
  | "tool-protocol"
  | "edit-conflict"
  | "verification"
  | "budget-limit";

export function classifyAgentFailure(error: string): {
  kind: AgentFailureKind;
  label: string;
  action: string;
} {
  const err = String(error || "");
  if (/token 上限|费用.*上限|budget-limit|达到工具轮次上限|超时|timeout/i.test(err)) {
    return { kind: "budget-limit", label: "预算或轮次限制", action: "提高本轮护栏、缩小任务，或使用 Auto 重试。" };
  }
  if (/验证失败|测试失败|test.*fail|diagnostics|lint.*fail/i.test(err)) {
    return { kind: "verification", label: "验证失败", action: "查看真实测试输出后重试；系统会继续修复并在失败时回滚。" };
  }
  if (/编辑失败|冲突|覆盖|重新读取|回滚|恢复.*失败|未产生任何文件修改/i.test(err)) {
    return { kind: "edit-conflict", label: "编辑或回滚冲突", action: "先重新读取真实文件；若文件已被外部修改，确认后再重试。" };
  }
  if (/schema|argument|tool_calls|function|工具.*参数|工具协议|JSON.*工具/i.test(err)) {
    return { kind: "tool-protocol", label: "工具协议错误", action: "使用 Auto 或换支持原生工具调用的模型重试。" };
  }
  if (/不支持 tools|toolsUnsupported|tool_choice|未声明工具调用支持|模型.*不可用|未安装.*模型/i.test(err)) {
    return { kind: "model-capability", label: "模型能力不匹配", action: "选择已安装且支持 tools 的模型，或使用 Auto 重试。" };
  }
  return { kind: "connection", label: "连接或鉴权失败", action: "检查服务、API Key 与额度后重试。" };
}

function detectChannels(err: string): FailureChannel[] {
  const ch = new Set<FailureChannel>();
  if (
    /本地 MCP|localOrchestration|local-mcp|mcp\.json|MCP 编排|【MCP】|需 MCP 通道|禁止静默 Host|Ollama.*tools|带 tools/i.test(
      err,
    )
  ) {
    ch.add("MCP");
  }
  if (
    /本机编排|本地模型|Ollama|11434|不会改走直聊|localOrchestration/i.test(err) &&
    !ch.has("MCP")
  ) {
    ch.add("本机编排");
  }
  if (/Host Agent|Host：|preload|工具环不可用|host-agent/i.test(err)) {
    ch.add("Host");
  }
  if (
    /Ollama|11434|连接失败|API Key|401|403|鉴权|配额|429|不支持 tools|toolsUnsupported|未输出可用正文|thinking|实测返回 HTTP 400/i.test(
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

/** 实测 schema 拒收（本机已连通），勿再提示「启动 Ollama」 */
function isMeasuredToolsSchemaReject(err: string): boolean {
  return /实测返回 HTTP 400|Value looks like object, but can't find closing/i.test(err);
}

/** Agent 工具环失败：标注失败通道并附可行动下一步（Claude CLI 已移除，禁止再提示安装） */
export function enrichAgentFailureHint(error: string): string {
  const err = String(error || "").trim();
  if (!err) return "请求失败：未知错误";

  const channels = detectChannels(err);
  const failure = classifyAgentFailure(err);
  const tips: string[] = [];
  const gateAlreadyHasMcpAction =
    /请修复本机编排或 MCP|健康检查异常的服务器请先停用|禁止静默 Host 回落/i.test(err);

  if (
    !gateAlreadyHasMcpAction &&
    (channels.includes("MCP") ||
      /本地 MCP|localOrchestration|local-mcp|【MCP】|需 MCP 通道|不会改走直聊/i.test(err))
  ) {
    tips.push(
      "【MCP】修复本机编排或 MCP 服务器；健康检查异常的服务器请先停用。成功调用工具的回合应有工具结果正文",
    );
  }
  if (/未输出可用正文|只返回了 thinking/i.test(err)) {
    tips.push("【本机】在终端对同一模型试 `ollama run <模型>`；或换非 thinking 模型后重试");
  } else if (
    !isMeasuredToolsSchemaReject(err) &&
    /Ollama|11434|连接失败/i.test(err)
  ) {
    tips.push("【连接】启动本机 Ollama（默认 11434），确认模型已 pull，或改用已配置的云端模型");
  }
  if (
    /不支持 tools|toolsUnsupported|tool_choice|HTTP 400.*tools|带 tools|实测返回 HTTP 400/i.test(
      err,
    )
  ) {
    tips.push(
      "【连接】此回合需要工具时，请从已配置池中选择能力检测标记为支持 tools 的模型；纯问答应走直聊",
    );
  }
  if (channels.includes("工作区")) {
    tips.push("【工作区】先在工作区选择项目根目录");
  }
  if (/Host Agent 接口不可用|preload/i.test(err)) {
    tips.push("【Host】完全退出并重启桌面应用；Host 回落无 MCP（气泡标 Host）");
  } else if (/Host：/i.test(err)) {
    tips.push("【Host】无 MCP 保底路径；需要 MCP 时请保证本机编排成功");
  }
  if (/API Key|401|403|鉴权|配额|429/i.test(err)) {
    tips.push("【连接】检查模型供应商密钥与额度");
  }

  let head = err.startsWith("请求失败：") ? err : `请求失败：${err}`;
  if (/Agent 工具环不可用/i.test(err) && !/本机|Host|本地/.test(err.slice(0, 40))) {
    head = head.replace(/^请求失败：Agent 工具环不可用/, "请求失败：工具环不可用（本机编排）");
  }

  const tag = `类型：${failure.label}\n${channels.length > 0 ? `通道：${channels.join(" · ")}\n` : ""}`;
  if (!tips.some((tip) => tip.includes(failure.action))) tips.push(`【处理】${failure.action}`);

  return `${tag}${head}${tips.length ? `\n${tips.map((t) => `· ${t}`).join("\n")}` : ""}`;
}
