/** 与 web/src/lib/model-catalog.ts 对齐：解析 Auto / inherit → 实际可调用模型 ID */

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
  if (preferredMode === 'local-mcp' && local.length) {
    return { mode: 'local-mcp', modelId: local[0] }
  }
  if (cloud.length) return { mode: 'claude-code', modelId: cloud[0] }
  if (local.length) return { mode: 'local-mcp', modelId: local[0] }
  return null
}

export function resolveModelForExecution(input) {
  const cloud = (input.cloudModels || []).map((m) => String(m || '').trim()).filter(Boolean)
  const local = (input.localModels || []).map((m) => String(m || '').trim()).filter(Boolean)
  const agentRaw = input.agentModel?.trim()
  const agent = agentRaw && !isInheritedAgentModel(agentRaw) ? agentRaw : undefined

  if (agent) {
    if (cloud.includes(agent)) return { mode: 'claude-code', modelId: agent }
    if (local.includes(agent)) return { mode: 'local-mcp', modelId: agent }
    return { mode: 'claude-code', modelId: agent }
  }

  const selected = normalizeChatModelSelection(input.selectedModel)
  if (selected && !isAutoModelSelection(selected)) {
    if (local.includes(selected)) return { mode: 'local-mcp', modelId: selected }
    if (cloud.includes(selected)) return { mode: 'claude-code', modelId: selected }
    if (/^(sonnet|opus|haiku|claude-)/i.test(selected)) {
      return { mode: 'claude-code', modelId: selected }
    }
    return cloud.length
      ? { mode: 'claude-code', modelId: selected }
      : local.length
        ? { mode: 'local-mcp', modelId: selected }
        : null
  }

  return resolveAutoModelFromPools(cloud, local, input.preferredMode)
}

export async function loadChatModelPools(settings, ccSwitch) {
  const localModels = [
    ...new Set((settings?.localModelCatalog ?? []).map((m) => String(m || '').trim()).filter(Boolean)),
  ]
  const cloudSet = new Set(
    (settings?.cloudModelCatalog ?? []).map((m) => String(m || '').trim()).filter(Boolean),
  )
  if (ccSwitch?.collectCloudModelPool) {
    try {
      const pool = await ccSwitch.collectCloudModelPool({ settings, fetchRemote: false })
      for (const m of pool?.models ?? []) {
        const id = String(m || '').trim()
        if (id) cloudSet.add(id)
      }
    } catch {
      /* 离线时仅用 catalog */
    }
  }
  const localHint = String(settings?.localOllamaModel || '').trim()
  if (localHint && !localModels.includes(localHint)) localModels.unshift(localHint)
  return { cloudModels: [...cloudSet], localModels }
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
  const modelPools = pools || (await loadChatModelPools(settings, null))
  const resolved = resolveModelForExecution({
    selectedModel: sessionModelId || settings?.model,
    cloudModels: modelPools.cloudModels,
    localModels: modelPools.localModels,
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
