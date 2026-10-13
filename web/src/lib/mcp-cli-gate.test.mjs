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

const msg = mcpCliGateFailureMessage("CLI 挂了", ["external-apps", "fetch"]);
assert.match(msg, /【MCP】/);
assert.match(msg, /external-apps/);
assert.match(msg, /CLI 挂了/);
assert.match(msg, /禁止静默 Host/);

console.log("mcp-cli-gate.test.mjs ok");
