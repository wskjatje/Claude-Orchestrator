/** 与 web/src/lib/model-catalog.ts 对齐：解析 Auto / inherit → 实际可调用模型 ID */

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const cloudProviders = require('./cloud-providers.cjs')

export const AUTO_MODEL_ID = 'auto'

export function isAutoModelSelection(model) {
  const id = String(model || '').trim().toLowerCase()
  return !id || id === AUTO_MODEL_ID
}

export function isInheritedAgentModel(model) {
  const id = String(model || '').trim().toLowerCase()
  return !id || id === 'inherit' || id === AUTO_MODEL_ID
}

export function normalizeChatModelSelection(model) {
  const id = String(model || '').trim()
  if (isAutoModelSelection(id) || isInheritedAgentModel(id)) return AUTO_MODEL_ID
  return id
}

export function parseAgentModelFromFrontmatter(content) {
  const trimmed = String(content || '').trimStart()
  if (!trimmed.startsWith('---')) return undefined
  const closeIdx = trimmed.indexOf('\n---', 3)
  if (closeIdx === -1) return undefined
  const fm = trimmed.slice(3, closeIdx)
  const match = fm.match(/^model:\s*['"]?([^'"\n#]+)['"]?\s*(?:#.*)?$/im)
  const model = match?.[1]?.trim()
  if (!model || isInheritedAgentModel(model)) return undefined
  return model
}

function resolveAutoModelFromPools(cloud, local, preferredMode) {
  if (preferredMode === 'local-mcp') {
    return local.length ? { mode: 'local-mcp', modelId: local[0] } : null
  }
  return cloud.length ? { mode: 'claude-code', modelId: cloud[0] } : null
}

export function resolveModelForExecution(input) {
  const cloud = (input.cloudModels || []).map((m) => String(m || '').trim()).filter(Boolean)
  const local = (input.localModels || []).map((m) => String(m || '').trim()).filter(Boolean)
  const cloudAll = (input.allCloudModels || cloud).map((m) => String(m || '').trim()).filter(Boolean)
  const localAll = (input.allLocalModels || local).map((m) => String(m || '').trim()).filter(Boolean)
  const agentRaw = input.agentModel?.trim()
  const agent = agentRaw && !isInheritedAgentModel(agentRaw) ? agentRaw : undefined

  if (agent) {
    if (cloudAll.includes(agent)) return { mode: 'claude-code', modelId: agent }
    if (localAll.includes(agent)) return { mode: 'local-mcp', modelId: agent }
    // Agent 指定了模型但不在任何已配置供应商池中 → 忽略 agent 声明，回退到会话模型/自动选择
  }

  const selected = normalizeChatModelSelection(input.selectedModel)
  if (selected && !isAutoModelSelection(selected)) {
    if (local.includes(selected)) return { mode: 'local-mcp', modelId: selected }
    if (cloud.includes(selected)) return { mode: 'claude-code', modelId: selected }
    if (/^(sonnet|opus|haiku|claude-)/i.test(selected)) {
      return { mode: 'claude-code', modelId: selected }
    }
    return resolveAutoModelFromPools(cloud, local, input.preferredMode)
  }

  return resolveAutoModelFromPools(cloud, local, input.preferredMode)
}

export async function loadConfiguredModelPools(settings) {
  const pools = cloudProviders.buildModelPools(settings);
  return {
    cloudModels: pools.configured.cloudModels,
    localModels: pools.configured.localModels,
  };
}

export async function loadChatModelPools(settings) {
  const pools = cloudProviders.buildModelPools(settings);
  return pools.chat;
}

export async function resolveExecutionModel({
  settings,
  sessionModelId,
  agentBasename,
  pools,
  readAgentMarkdown,
}) {
  const preferredMode = settings?.orchestrationMode === 'local-mcp' ? 'local-mcp' : 'claude-code'
  let agentModel
  if (agentBasename && typeof readAgentMarkdown === 'function') {
    const stem = String(agentBasename).replace(/\.md$/i, '')
    const content = readAgentMarkdown(stem ? `${stem}.md` : agentBasename)
    if (content) agentModel = parseAgentModelFromFrontmatter(content)
  }
  const chatPools = pools || (await loadChatModelPools(settings))
  const fullPools = await loadConfiguredModelPools(settings)
  const resolved = resolveModelForExecution({
    selectedModel: sessionModelId || settings?.model,
    cloudModels: chatPools.cloudModels,
    localModels: chatPools.localModels,
    allCloudModels: fullPools.cloudModels,
    allLocalModels: fullPools.localModels,
    agentModel,
    preferredMode,
  })
  if (!resolved) {
    return {
      ok: false,
      error:
        '未解析到可用模型：请在「设置 → 模型与连接」添加云模型或本地模型；会话选 Auto 时需要至少一个已配置模型。',
    }
  }
  if (isAutoModelSelection(resolved.modelId)) {
    return { ok: false, error: '模型仍为 auto，请检查模型池配置。' }
  }
  return { ok: true, ...resolved }
}
