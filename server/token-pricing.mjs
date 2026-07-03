/** 常用币种对 USD 的近似汇率（仅供参考，所有实际 API 以 USD 结算） */
const CURRENCY_RATES = {
  USD: 1,
  CNY: 7.2, // 1 USD ≈ 7.2 CNY
  EUR: 0.92,
  JPY: 150,
  GBP: 0.79,
};

/** 默认 $/1M tokens（估算；DeepSeek/Gemini 等第三方按公开价近似） */
const DEFAULT_MODEL_PRICING = {
  "claude-sonnet-4-20250514": { inputPer1M: 3, outputPer1M: 15 },
  "claude-opus-4-20250514": { inputPer1M: 15, outputPer1M: 75 },
  "claude-haiku-3-5-20240307": { inputPer1M: 0.8, outputPer1M: 4 },
  sonnet: { inputPer1M: 3, outputPer1M: 15 },
  opus: { inputPer1M: 15, outputPer1M: 75 },
  haiku: { inputPer1M: 0.8, outputPer1M: 4 },
  "deepseek-chat": { inputPer1M: 0.27, outputPer1M: 1.1 },
  "deepseek-v4-flash": { inputPer1M: 0.27, outputPer1M: 1.1 },
  "deepseek-v4-pro": { inputPer1M: 0.55, outputPer1M: 2.19 },
  "deepseek-reasoner": { inputPer1M: 0.55, outputPer1M: 2.19 },
  "gemini-2.5-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10 },
};

export function convertToUsd(amount, fromCurrency) {
  const c = String(fromCurrency || "")
    .trim()
    .toUpperCase();
  if (!c || c === "USD") return amount;
  const rate = CURRENCY_RATES[c];
  if (!rate) return amount; // 无法识别的币种当 USD 处理
  return amount / rate;
}

/** 格式化时带币种符号 */
const CURRENCY_SYMBOLS = {
  USD: "$",
  CNY: "¥",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
};

export function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOLS[String(currency || "").trim()] || currency || "$";
}

export function normalizePricingTable(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [model, v] of Object.entries(raw)) {
    if (!v || typeof v !== "object") continue;
    const inputPer1M = Number(v.inputPer1M);
    const outputPer1M = Number(v.outputPer1M);
    if (!Number.isFinite(inputPer1M) || !Number.isFinite(outputPer1M)) continue;
    const entry = { inputPer1M, outputPer1M };
    // 保留非默认币种信息，默认 USD 不存储节约 KV 体积
    const currency = String(v.currency || "")
      .trim()
      .toUpperCase();
    if (currency && currency !== "USD") entry.currency = currency;
    out[String(model).trim()] = entry;
  }
  return out;
}

export function resolveModelPricing(model, customTable = {}) {
  const m = String(model || "").trim();
  const merged = {
    ...DEFAULT_MODEL_PRICING,
    ...normalizePricingTable(customTable),
  };
  if (merged[m]) return { ...merged[m] };
  const lower = m.toLowerCase();
  for (const [key, val] of Object.entries(merged)) {
    if (key.toLowerCase() === lower) return { ...val };
  }
  return { inputPer1M: 1, outputPer1M: 5 }; // 通用回退
}

export function getDefaultModelPricing() {
  return { ...DEFAULT_MODEL_PRICING };
}

export function estimateUsageCostUsd(usage, model, customTable = {}) {
  if (!usage || typeof usage !== "object") return 0;
  const input =
    Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) +
    Number(usage.cache_creation_input_tokens ?? 0) +
    Number(usage.cache_read_input_tokens ?? 0);
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0);
  const pricing = resolveModelPricing(model, customTable);
  // 如果有非 USD 币种，先换算为 USD
  const inputUsd = pricing.currency
    ? convertToUsd(pricing.inputPer1M, pricing.currency)
    : pricing.inputPer1M;
  const outputUsd = pricing.currency
    ? convertToUsd(pricing.outputPer1M, pricing.currency)
    : pricing.outputPer1M;
  return (input / 1_000_000) * inputUsd + (output / 1_000_000) * outputUsd;
}

export function formatUsd(n) {
  if (!Number.isFinite(n) || n <= 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
