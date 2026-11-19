import assert from "node:assert/strict";
import { classifyAgentFailure, enrichAgentFailureHint } from "./agent-failure-hint.ts";
import { mcpCliGateFailureMessage } from "./mcp-cli-gate.ts";

const measured =
  "当前模型在带 tools 的 Ollama 请求上实测返回 HTTP 400（Value looks like object, but can't find closing '}' symbol）。本回合不会改走直聊。";

const measuredHint = enrichAgentFailureHint(measured);
assert.doesNotMatch(measuredHint, /启动本机 Ollama/);
assert.match(measuredHint, /能力检测标记为支持 tools/);
assert.doesNotMatch(measuredHint, /qwen|gemma/i);
assert.doesNotMatch(measuredHint, /Claude CLI|npm i -g|Claude Code/);

const gate = mcpCliGateFailureMessage(measured, ["filesystem", "memory"]);
const gated = enrichAgentFailureHint(gate);
assert.match(gated, /【MCP】已启用需 MCP 通道/);
// gate 正文已含行动建议 → tip 不再重复「修复本机编排」
assert.equal((gated.match(/修复本机编排或 MCP/g) || []).length, 1);
assert.doesNotMatch(gated, /启动本机 Ollama/);

const connectHint = enrichAgentFailureHint("连接失败：无法访问 Ollama 11434");
assert.match(connectHint, /启动本机 Ollama/);

for (const [message, kind] of [
  ["API Key 401", "connection"],
  ["模型不支持 tools", "model-capability"],
  ["工具 schema argument 无效", "tool-protocol"],
  ["编辑失败，请重新读取真实文件", "edit-conflict"],
  ["连续 3 次验证失败", "verification"],
  ["本轮已达到 token 上限", "budget-limit"],
]) {
  assert.equal(classifyAgentFailure(message).kind, kind);
}
assert.match(enrichAgentFailureHint("连续 3 次验证失败"), /类型：验证失败/);

console.log("agent-failure-hint.test.mjs ok");
