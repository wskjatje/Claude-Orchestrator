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

/**
 * @param {{ allowWrites?: boolean, forceDirectChat?: boolean, allowTools?: boolean, intent?: string }} input
 * @returns {'prefer-cloud'|'prefer-local'|'prefer-mode'}
 */
export function inferModelRouteHint(input = {}) {
  if (input.allowWrites || input.intent === 'write') return 'prefer-cloud'
  if (input.forceDirectChat || input.intent === 'readonly' || input.allowTools === false) {
    return 'prefer-local'
  }
  if (input.intent === 'chat') return 'prefer-local'
  return 'prefer-cloud'
}

/**
 * @param {string[]} cloud
 * @param {string[]} local
 * @param {'claude-code'|'local-mcp'} [preferredMode]
 * @param {'prefer-cloud'|'prefer-local'|'prefer-mode'} [routeHint]
 * @param {{ preferredCloudModel?: string, preferredLocalModel?: string }} [prefs]
 */
function resolveAutoModelFromPools(cloud, local, preferredMode, routeHint = 'prefer-mode', prefs = {}) {
  const preferCloud = String(prefs.preferredCloudModel || '').trim()
  const preferLocal = String(prefs.preferredLocalModel || '').trim()
  const pickFrom = (list, preferred) => {
    if (preferred && list.includes(preferred)) return preferred
    return list[0] || null
  }
  const pickCloud = () => {
    const id = pickFrom(cloud, preferCloud)
    return id ? { mode: 'claude-code', modelId: id } : null
  }
  const pickLocal = () => {
    const id = pickFrom(local, preferLocal)
    return id ? { mode: 'local-mcp', modelId: id } : null
  }
  const pickByMode = () => {
    if (preferredMode === 'local-mcp') return pickLocal() || pickCloud()
    return pickCloud() || pickLocal()
  }
  // prefer-cloud / prefer-local：对侧池空禁止静默换通道
  if (routeHint === 'prefer-cloud') return pickCloud()
  if (routeHint === 'prefer-local') return pickLocal()
  return pickByMode()
}

/** 空云池 + 需要云时的硬错误文案（前后端单源） */
export const CLOUD_PROVIDER_REQUIRED_ERROR =
  '未启用云供应商：请在「设置 → 模型与连接」添加并启用云模型；不会自动改用本地模型。'

/** 空本地池 + prefer-local 时硬错误（禁止静默改云） */
export const LOCAL_PROVIDER_REQUIRED_ERROR =
  '未启用本地模型：请在「设置 → 模型与连接」配置 Ollama/本地池；不会自动改用云模型。'

/** 手选/Agent 模型不在已启用池 */
export const MODEL_NOT_IN_POOL_ERROR =
  '所选模型不在已启用池内：请在「设置 → 模型与连接」启用该模型后再选；不会按名称启发式推断通道。'

/** 本地模型未出现在本机 Ollama /api/tags（禁止调用未 pull 的标签） */
export const LOCAL_MODEL_NOT_INSTALLED_ERROR =
  '所选本地模型未安装到本机 Ollama：请先 ollama pull，或在「设置 → 模型与连接」改选已安装模型；不会调用未安装模型。'

/**
 * 优先级：用户手选 > Agent frontmatter > Auto(routeHint)
 */
export function resolveModelForExecution(input) {
  const cloud = (input.cloudModels || []).map((m) => String(m || '').trim()).filter(Boolean)
  const local = (input.localModels || []).map((m) => String(m || '').trim()).filter(Boolean)
  const cloudAll = (input.allCloudModels || cloud).map((m) => String(m || '').trim()).filter(Boolean)
  const localAll = (input.allLocalModels || local).map((m) => String(m || '').trim()).filter(Boolean)

  const selected = normalizeChatModelSelection(input.selectedModel)
  if (selected && !isAutoModelSelection(selected)) {
    if (local.includes(selected) || localAll.includes(selected)) {
      return { mode: 'local-mcp', modelId: selected, userPinned: true }
    }
    if (cloud.includes(selected) || cloudAll.includes(selected)) {
      return { mode: 'claude-code', modelId: selected, userPinned: true }
    }
    // 池外手选：硬失败（禁止名称启发式默默当云/本地）
    return null
  }

  const agentRaw = input.agentModel?.trim()
  const agent = agentRaw && !isInheritedAgentModel(agentRaw) ? agentRaw : undefined
  if (agent) {
    if (cloudAll.includes(agent)) {
      return { mode: 'claude-code', modelId: agent, userPinned: false }
    }
    if (localAll.includes(agent)) {
      return { mode: 'local-mcp', modelId: agent, userPinned: false }
    }
    // 池外 Agent frontmatter：硬失败
    return null
  }

  const hint = input.routeHint || 'prefer-mode'
  const auto = resolveAutoModelFromPools(cloud, local, input.preferredMode, hint, {
    preferredCloudModel: input.preferredCloudModel,
    preferredLocalModel: input.preferredLocalModel,
  })
  return auto ? { ...auto, userPinned: false, routeHint: hint } : null
}

export async function loadConfiguredModelPools(settings) {
  // 本地侧只保留本机 Ollama 已安装标签（与聊天池同一硬闸）
  if (typeof cloudProviders.buildModelPoolsInstalled === 'function') {
    const pools = await cloudProviders.buildModelPoolsInstalled(settings)
    return {
      cloudModels: pools.configured.cloudModels,
      localModels: pools.configured.localModels,
    }
  }
  const pools = cloudProviders.buildModelPools(settings)
  return {
    cloudModels: pools.configured.cloudModels,
    localModels: pools.configured.localModels,
  }
}

export async function loadChatModelPools(settings) {
  if (typeof cloudProviders.buildModelPoolsInstalled === 'function') {
    const pools = await cloudProviders.buildModelPoolsInstalled(settings)
    return pools.chat
  }
  const pools = cloudProviders.buildModelPools(settings)
  return pools.chat
}

export async function resolveExecutionModel({
  settings,
  sessionModelId,
  agentBasename,
  pools,
  readAgentMarkdown,
  routeHint,
  turnPolicy,
}) {
  const preferredMode = settings?.orchestrationMode === 'local-mcp' ? 'local-mcp' : 'claude-code'
  let agentModel
  // 会话手选非 Auto 时不读 Agent frontmatter，避免覆盖用户指定
  const sessionSel = normalizeChatModelSelection(sessionModelId || settings?.model)
  const userPinned = sessionSel && !isAutoModelSelection(sessionSel)
  if (!userPinned && agentBasename && typeof readAgentMarkdown === 'function') {
    const stem = String(agentBasename).replace(/\.md$/i, '')
    const content = readAgentMarkdown(stem ? `${stem}.md` : agentBasename)
    if (content) agentModel = parseAgentModelFromFrontmatter(content)
  }
  const chatPools = pools || (await loadChatModelPools(settings))
  const fullPools = await loadConfiguredModelPools(settings)
  const hint =
    routeHint ||
    (turnPolicy
      ? inferModelRouteHint({
          allowWrites: turnPolicy.allowWrites,
          forceDirectChat: turnPolicy.forceDirectChat,
          allowTools: turnPolicy.allowTools,
          intent: turnPolicy.intent,
        })
      : undefined)
  const resolved = resolveModelForExecution({
    selectedModel: sessionModelId || settings?.model,
    cloudModels: chatPools.cloudModels,
    localModels: chatPools.localModels,
    allCloudModels: fullPools.cloudModels,
    allLocalModels: fullPools.localModels,
    agentModel: userPinned ? undefined : agentModel,
    preferredMode,
    routeHint: hint,
    preferredCloudModel: settings?.preferredCloudModel,
    preferredLocalModel: settings?.preferredLocalModel,
  })
  if (!resolved) {
    const cloudEmpty = !(fullPools.cloudModels?.length || chatPools.cloudModels?.length)
    const localEmpty = !(fullPools.localModels?.length || chatPools.localModels?.length)
    if (hint === 'prefer-cloud' && cloudEmpty) {
      return { ok: false, error: CLOUD_PROVIDER_REQUIRED_ERROR }
    }
    if (hint === 'prefer-local' && localEmpty) {
      return { ok: false, error: LOCAL_PROVIDER_REQUIRED_ERROR }
    }
    if (userPinned && sessionSel && !isAutoModelSelection(sessionSel)) {
      const inLocal =
        fullPools.localModels?.includes(sessionSel) || chatPools.localModels?.includes(sessionSel)
      const inCloud =
        fullPools.cloudModels?.includes(sessionSel) || chatPools.cloudModels?.includes(sessionSel)
      if (!inLocal && !inCloud) {
        // 设置里曾启用/编目过本地，但本机 Ollama tags 无此标签 → 未安装（非笼统池外）
        const raw = cloudProviders.buildModelPools(settings)
        const wasLocalConfigured =
          (raw.configured?.localModels || []).includes(sessionSel) ||
          (raw.chat?.localModels || []).includes(sessionSel)
        return {
          ok: false,
          error: wasLocalConfigured ? LOCAL_MODEL_NOT_INSTALLED_ERROR : MODEL_NOT_IN_POOL_ERROR,
        }
      }
    }
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
