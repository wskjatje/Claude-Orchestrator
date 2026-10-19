/**
 * node scripts/check-model-route.mjs
 * 双轨 Auto + 用户手选优先；禁 prefer-local→云 / 池外启发式
 */
import {
  inferModelRouteHint,
  resolveModelForExecution,
  isAutoModelSelection,
  CLOUD_PROVIDER_REQUIRED_ERROR,
  LOCAL_PROVIDER_REQUIRED_ERROR,
  MODEL_NOT_IN_POOL_ERROR,
} from '../server/resolve-execution-model.mjs'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

const cloud = ['claude-sonnet', 'gpt-4o']
const local = ['qwen2.5-coder', 'llama3']

assert(inferModelRouteHint({ allowWrites: true }) === 'prefer-cloud', 'write → prefer-cloud')
assert(
  inferModelRouteHint({ forceDirectChat: true, allowWrites: false }) === 'prefer-local',
  'ask → prefer-local',
)
assert(inferModelRouteHint({ intent: 'readonly' }) === 'prefer-local', 'readonly → prefer-local')

const pinned = resolveModelForExecution({
  selectedModel: 'qwen2.5-coder',
  cloudModels: cloud,
  localModels: local,
  routeHint: 'prefer-cloud',
})
assert(pinned?.modelId === 'qwen2.5-coder' && pinned.userPinned && pinned.mode === 'local-mcp', 'hand-pick local wins over prefer-cloud')

const pinnedCloud = resolveModelForExecution({
  selectedModel: 'claude-sonnet',
  cloudModels: cloud,
  localModels: local,
  routeHint: 'prefer-local',
})
assert(
  pinnedCloud?.modelId === 'claude-sonnet' && pinnedCloud.userPinned,
  'hand-pick cloud wins over prefer-local',
)

const autoWrite = resolveModelForExecution({
  selectedModel: 'auto',
  cloudModels: cloud,
  localModels: local,
  routeHint: 'prefer-cloud',
})
assert(autoWrite?.modelId === 'claude-sonnet' && !autoWrite.userPinned, 'Auto write → cloud first')

const autoAsk = resolveModelForExecution({
  selectedModel: 'auto',
  cloudModels: cloud,
  localModels: local,
  routeHint: 'prefer-local',
})
assert(autoAsk?.modelId === 'qwen2.5-coder' && autoAsk.mode === 'local-mcp', 'Auto ask → local first')

const autoAskNoLocal = resolveModelForExecution({
  selectedModel: 'auto',
  cloudModels: cloud,
  localModels: [],
  routeHint: 'prefer-local',
})
assert(autoAskNoLocal == null, 'prefer-local + empty local → null (no silent cloud)')

const outOfPool = resolveModelForExecution({
  selectedModel: 'my-custom-ollama',
  cloudModels: cloud,
  localModels: local,
  allLocalModels: [...local, 'my-custom-ollama'],
  routeHint: 'prefer-cloud',
})
assert(outOfPool?.modelId === 'my-custom-ollama' && outOfPool.userPinned, 'pin outside chat pool via allLocal')

assert(isAutoModelSelection('auto') && !isAutoModelSelection('claude-sonnet'), 'auto detect')

const preferPick = resolveModelForExecution({
  selectedModel: 'auto',
  cloudModels: cloud,
  localModels: local,
  routeHint: 'prefer-cloud',
  preferredCloudModel: 'gpt-4o',
})
assert(preferPick?.modelId === 'gpt-4o', 'Auto prefers preferredCloudModel when in pool')

const agentOut = resolveModelForExecution({
  selectedModel: 'auto',
  cloudModels: cloud,
  localModels: local,
  agentModel: 'custom-agent-model',
  routeHint: 'prefer-local',
})
assert(agentOut == null, 'Agent frontmatter outside pool → null')

const emptyCloudPrefer = resolveModelForExecution({
  selectedModel: 'auto',
  cloudModels: [],
  localModels: local,
  allCloudModels: [],
  allLocalModels: local,
  routeHint: 'prefer-cloud',
})
assert(emptyCloudPrefer == null, 'prefer-cloud + empty cloud → null (no silent local)')
assert(String(CLOUD_PROVIDER_REQUIRED_ERROR).includes('未启用云供应商'), 'error copy single-source')
assert(String(LOCAL_PROVIDER_REQUIRED_ERROR).includes('未启用本地模型'), 'local error copy')
assert(String(MODEL_NOT_IN_POOL_ERROR).includes('不在已启用池内'), 'pool error copy')

const heuristicPin = resolveModelForExecution({
  selectedModel: 'claude-sonnet-4-20250514',
  cloudModels: cloud,
  localModels: local,
  allCloudModels: cloud,
  allLocalModels: local,
  routeHint: 'prefer-mode',
})
assert(heuristicPin == null, 'pool-out hand-pick (name heuristic) → null')

if (process.exitCode) {
  console.error('\ncheck-model-route: FAILED')
  process.exit(1)
}
console.log('\ncheck-model-route: PASSED')
