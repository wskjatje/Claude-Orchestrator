import assert from "node:assert/strict";
import {
  recommendToolsCapableModel,
  rememberModelCapability,
} from "./model-capability-cache.ts";

rememberModelCapability("model-a", { tools: true });
rememberModelCapability("model-b", { tools: true });
rememberModelCapability("model-c", { tools: false });

const picked = recommendToolsCapableModel(
  ["model-a", "model-b", "model-c"],
  "model-a",
);
assert.equal(picked, "model-b");

const respectsPoolOrder = recommendToolsCapableModel(
  ["model-b", "model-a"],
);
assert.equal(respectsPoolOrder, "model-b");

console.log("model-capability-cache.test.mjs ok");
