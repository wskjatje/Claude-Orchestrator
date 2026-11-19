import assert from "node:assert/strict";
import {
  enabledMcpNamesRequiringCliChannel,
  mcpCliGateFailureMessage,
} from "./mcp-cli-gate.ts";

assert.deepEqual(
  enabledMcpNamesRequiringCliChannel({
    sanshengliubu: { command: "node" },
    "external-apps": { command: "node" },
    fetch: { command: "uvx", disabled: true },
  }),
  ["external-apps"],
);

assert.deepEqual(enabledMcpNamesRequiringCliChannel({ sanshengliubu: {} }), []);

assert.deepEqual(
  enabledMcpNamesRequiringCliChannel(
    {
      memory: { command: "npx" },
      sqlite: { command: "uvx" },
    },
    { sqlite: { status: "error" }, memory: { status: "ok" } },
  ),
  ["memory"],
);

const msg = mcpCliGateFailureMessage("本机编排挂了", ["external-apps", "fetch"]);
assert.match(msg, /【MCP】/);
assert.match(msg, /external-apps/);
assert.match(msg, /本机编排挂了/);
assert.match(msg, /禁止无 MCP 工具证据/);
assert.doesNotMatch(msg, /Claude CLI/);
assert.doesNotMatch(msg, /npm i -g/);

console.log("mcp-cli-gate.test.mjs ok");
