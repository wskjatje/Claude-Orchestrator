/** 默认 $/1M tokens（估算；DeepSeek/Gemini 等第三方按公开价近似） */
const DEFAULT_MODEL_PRICING = {
  'claude-sonnet-4-20250514': { inputPer1M: 3, outputPer1M: 15 },
  'claude-opus-4-20250514': { inputPer1M: 15, outputPer1M: 75 },
  'claude-haiku-3-5-20240307': { inputPer1M: 0.8, outputPer1M: 4 },
  sonnet: { inputPer1M: 3, outputPer1M: 15 },
  opus: { inputPer1M: 15, outputPer1M: 75 },
  haiku: { inputPer1M: 0.8, outputPer1M: 4 },
  'deepseek-chat': { inputPer1M: 0.27, outputPer1M: 1.1 },
  'deepseek-v4-flash': { inputPer1M: 0.27, outputPer1M: 1.1 },
  'deepseek-v4-pro': { inputPer1M: 0.55, outputPer1M: 2.19 },
  'deepseek-reasoner': { inputPer1M: 0.55, outputPer1M: 2.19 },
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 10 },
}

export function normalizePricingTable(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [model, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object') continue
    const inputPer1M = Number(v.inputPer1M)
    const outputPer1M = Number(v.outputPer1M)
    if (!Number.isFinite(inputPer1M) || !Number.isFinite(outputPer1M)) continue
    out[String(model).trim()] = { inputPer1M, outputPer1M }
  }
  return out
}

export function resolveModelPricing(model, customTable = {}) {
  const m = String(model || '').trim()
  const merged = { ...DEFAULT_MODEL_PRICING, ...normalizePricingTable(customTable) }
  if (merged[m]) return merged[m]
  const lower = m.toLowerCase()
  for (const [key, val] of Object.entries(merged)) {
    if (key.toLowerCase() === lower) return val
  }
  if (/deepseek/i.test(m)) return merged['deepseek-v4-flash']
  if (/gemini/i.test(m)) return merged['gemini-2.5-flash']
  if (/claude/i.test(m)) return merged.sonnet
  return { inputPer1M: 1, outputPer1M: 5 }
}

export function estimateUsageCostUsd(usage, model, customTable = {}) {
  if (!usage || typeof usage !== 'object') return 0
  const input =
    Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) +
    Number(usage.cache_creation_input_tokens ?? 0) +
    Number(usage.cache_read_input_tokens ?? 0)
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0)
  const { inputPer1M, outputPer1M } = resolveModelPricing(model, customTable)
  return (input / 1_000_000) * inputPer1M + (output / 1_000_000) * outputPer1M
}

export function formatUsd(n) {
  if (!Number.isFinite(n) || n <= 0) return '$0.00'
  if (n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}
