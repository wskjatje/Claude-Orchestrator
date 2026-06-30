import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import https from 'node:https'
import dns from 'node:dns'
import { createRequire } from 'node:module'
import { loadChatSettings, getWorkspaceCwd, loadUiPrefs } from './store.mjs'
import { readGlobalClaudeEnv } from './paths.mjs'
import crypto from 'node:crypto'
import {
  appendStreamJsonLine,
  createStreamDisplayState,
  finalizeStreamDisplay,
} from './claude-stream-parse.mjs'

const require = createRequire(import.meta.url)
const cloudProviders = require('./cloud-providers.cjs')
const chatImages = require('./chat-images.cjs')

/** @type {Map<string, import('node:child_process').ChildProcess>} */
const active = new Map()

function expandUser(p) {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

async function execSimple(cmd, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', cmd], {
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('close', (code) => {
      resolve({ ok: code === 0, stdout, stderr })
    })
    child.on('error', (e) => {
      resolve({ ok: false, stdout, stderr: e.message })
    })
  })
}

export async function resolveClaudePath() {
  const settings = loadChatSettings()
  const manual = settings.claudeCliPath?.trim()
  if (manual) {
    const resolved = path.resolve(expandUser(manual))
    if (!fs.existsSync(resolved)) {
      return { claudePath: resolved, resolveError: '手动路径不存在' }
    }
    const safe = resolved.includes(' ') ? `"${resolved}"` : resolved
    const ver = await execSimple(`${safe} --version`)
    return {
      claudePath: resolved,
      versionLine: (ver.stdout || ver.stderr).trim(),
      resolveError: ver.ok ? '' : ver.stderr || '无法执行 --version',
    }
  }
  const which = await execSimple('command -v claude')
  const claudePath = which.stdout.trim()
  if (!claudePath) {
    return { claudePath: '', resolveError: 'PATH 中未找到 claude' }
  }
  const safe = claudePath.includes(' ') ? `"${claudePath}"` : claudePath
  const ver = await execSimple(`${safe} --version`)
  return {
    claudePath,
    versionLine: (ver.stdout || ver.stderr).trim(),
    resolveError: ver.ok ? '' : ver.stderr || '',
  }
}

/** 第三方 API：CLI 用 sonnet 别名，真实模型由 env ANTHROPIC_DEFAULT_* 映射 */
function isThirdPartyAnthropicBase(base) {
  const b = String(base || '').trim().toLowerCase()
  if (!b) return false
  return !b.includes('anthropic.com')
}

function syncEnvDefaultModels(env, model) {
  const m = mapApiModelId(model, env)
  if (!m || /^(sonnet|opus|haiku)$/i.test(m)) return env
  return {
    ...env,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: m,
    ANTHROPIC_DEFAULT_SONNET_MODEL: m,
    ANTHROPIC_DEFAULT_OPUS_MODEL: m,
  }
}

/** 将用户配置的模型 ID 映射为实际 API 可用的模型标识 */
function mapApiModelId(model, env) {
  const m = String(model || '').trim()
  if (!m || /^(inherit|auto)$/i.test(m)) return m
  const normalized = cloudProviders.normalizeCloudModelId(m)
  if (normalized !== m) return normalized
  // OpenRouter 聚合站：自动补充供应商前缀（如 openai/gpt-4o）
  if (env && isOpenRouterEndpoint(env.ANTHROPIC_BASE_URL) && !m.includes('/')) {
    const base = m.toLowerCase()
    // 常见模型自动匹配供应商前缀
    if (/^gpt-/) return `openai/${m}`
    if (/^claude-/) return `anthropic/${m}`
    if (/^gemini-/) return `google/${m}`
    if (/^deepseek-/) return `deepseek/${m}`
  }
  return m
}

function isOpenRouterEndpoint(baseUrl) {
  return /openrouter\.ai/i.test(String(baseUrl || ''))
}

function resolveClaudeCliModel(model, env) {
  const m = typeof model === 'string' ? model.trim() : ''
  if (!m || /^(inherit|auto)$/i.test(m)) return undefined
  if (/^(sonnet|opus|haiku)$/i.test(m)) return m.toLowerCase()
  const sonnet = String(env.ANTHROPIC_DEFAULT_SONNET_MODEL || '').trim()
  const haiku = String(env.ANTHROPIC_DEFAULT_HAIKU_MODEL || '').trim()
  const opus = String(env.ANTHROPIC_DEFAULT_OPUS_MODEL || '').trim()
  if (sonnet && m === sonnet) return 'sonnet'
  if (haiku && m === haiku) return 'haiku'
  if (opus && m === opus) return 'opus'
  if (/^gemini-/i.test(m) || /^claude-/i.test(m)) return m
  if (isThirdPartyAnthropicBase(env.ANTHROPIC_BASE_URL)) return m
  return m
}

function defaultTimeoutMs(env) {
  const fromEnv = Number(process.env.WORKBENCH_CLAUDE_TIMEOUT_MS)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  // Gemini / 第三方 API 给更长超时
  const base = String(env.ANTHROPIC_BASE_URL || '')
  if (/gemini/i.test(String(env.ANTHROPIC_DEFAULT_SONNET_MODEL || '')) || /gemini/i.test(base)) {
    return 360_000
  }
  return 180_000
}

/** 任务链单步默认超时（可 WORKBENCH_CHAIN_TIMEOUT_MS 覆盖） */
export function chainStepTimeoutMs(env) {
  const fromEnv = Number(process.env.WORKBENCH_CHAIN_TIMEOUT_MS)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  return Math.max(defaultTimeoutMs(env || {}), 600_000)
}

function friendlyClaudeError(raw, env, providerName = '') {
  const t = String(raw || '')
  const base = String(env.ANTHROPIC_BASE_URL || '')
  const who = providerName ? `供应商「${providerName}」` : 'Provider'
  if (/429|quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(t)) {
    return (
      'Gemini API 配额/频率超限（429）。请在 Google AI Studio 检查 API Key 用量与计费；' +
      '或在「设置 → 模型与连接」改用其它供应商。' +
      (t.includes('429') ? '' : ` 详情：${t.slice(0, 180)}`)
    )
  }
  if (/API_KEY_INVALID|API key expired|invalid.*api.?key/i.test(t)) {
    return `${who} API Key 无效或已过期。请在「设置 → 模型与连接」更新 API Key。`
  }
  if (/fetch failed|ECONNREFUSED|ConnectionRefused|ETIMEDOUT|socket hang up|Unable to connect to API/i.test(t)) {
    return `${who} 连接失败（${base || '默认端点'}）：${t.slice(0, 240)}`
  }
  if (/Not logged in|Please run \/login/i.test(t)) {
    return 'Claude Code 未登录。请在终端运行 claude 后执行 /login，或在「设置 → 模型与连接」配置其它云供应商。'
  }
  if (/退出码\s*143|exit code 143|SIGTERM/i.test(t)) {
    return '请求已取消或超时中断。若未手动停止，请检查模型连接或在「设置 → 模型与连接」更换供应商。'
  }
  if (/issue with the selected model/i.test(t)) {
    return (
      '当前模型配置不受支持。请在「设置 → 模型与连接」检查模型 ID 和 API 端点是否正确。'
    )
  }
  return t
}

function timeoutHint(env, model, providerName = '', attachmentCount = 0) {
  const base = String(env.ANTHROPIC_BASE_URL || '')
  const who = providerName ? `供应商「${providerName}」` : '当前供应商'
  const imageNote =
    attachmentCount > 0
      ? ` 您附带了 ${attachmentCount} 张截图：部分供应商不支持直接看图，若未用本机视觉模型预解析，Claude Code 会多次 Read 读盘，易触发超时。建议减少附图、在设置中配置 Ollama 视觉模型，或改用「本地 MCP」模式。`
      : ''
  if (/gemini/i.test(String(env.ANTHROPIC_DEFAULT_SONNET_MODEL || ''))) {
    return `${imageNote} Gemini 在配额不足(429)时会长时间重试；请检查 Google API 用量或更换供应商。`.trim()
  }
  return (
    `${imageNote} 请在「设置 → 模型与连接」检查 ${who} 的 API 地址、Key 与模型 ID。` +
    ' 若直连正常仍超时，请检查 MCP 服务是否离线或 Agent 任务是否过长。'
  ).trim()
}

function timeoutMsForRequest(env, timeoutMs, attachmentCount = 0) {
  const base =
    typeof timeoutMs === 'number' && timeoutMs >= 0 ? timeoutMs : defaultTimeoutMs(env)
  if (!attachmentCount) return base
  return Math.max(base, 300_000 + attachmentCount * 90_000)
}

/** 直连 Anthropic 兼容端点时快速探测，避免 Claude CLI 无效 Key/模型重试 180s */
async function preflightAnthropicEndpoint(env, model, providerName = '') {
  const base = cloudProviders.normalizeAnthropicBaseUrl(env.ANTHROPIC_BASE_URL || '').replace(/\/$/, '')
  const key = String(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || '').trim()
  if (!base || !key) return null
  if (/127\.0\.0\.1:3456|localhost:3456/.test(base)) return null

  const modelId = String(model || env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'sonnet').trim()
  const who = providerName ? `供应商「${providerName}」` : 'API'
  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (res.ok) return null
    const bodyText = await res.text().catch(() => '')
    let detail = bodyText.slice(0, 200)
    try {
      const data = JSON.parse(bodyText)
      detail =
        data?.error?.message ||
        data?.message ||
        (typeof data?.error === 'string' ? data.error : '') ||
        detail
    } catch {
      /* use bodyText slice */
    }
    if (res.status === 401 || /authentication|invalid.*api.?key|api key/i.test(detail)) {
      return `${who} API Key 无效或未授权（HTTP 401）。请在「设置 → 模型与连接」更新 API Key。`
    }
    if (res.status === 404 || /model.*not found|unknown model|invalid model/i.test(detail)) {
      const migrated = cloudProviders.normalizeCloudModelId(modelId)
      const geminiHint =
        migrated !== modelId && /^gemini-/i.test(modelId)
          ? ` 该实验/旧版模型已下线，建议改用「${migrated}」。`
          : /^gemini-2\.0-flash-exp$/i.test(modelId)
            ? ' 该实验模型已下线，请改用 gemini-2.5-flash。'
            : ''
      return `${who} 不识别模型「${modelId}」（HTTP ${res.status}）。请在「设置 → 模型与连接」检查模型名称是否正确。${geminiHint}`
    }
    return `${who} 拒绝请求（HTTP ${res.status}）：${detail.slice(0, 240)}`
  } catch (e) {
    if (e?.name === 'TimeoutError' || /timeout/i.test(String(e?.message || e))) {
      return `${who} 在 20s 内无响应（${base}）。请检查网络或 API 端点是否正确。`
    }
    return `${who} 连接失败（${base}）：${String(e?.message || e).slice(0, 200)}`
  }
}

/**
 * 多级 DNS 解析：Google DNS → Cloudflare DNS → 系统 DNS。
 * 返回解析到的真实公网 IP，若全部被拦截则返回空。
 */
function resolveHostnameDns(hostname) {
  const dnsServers = [
    ['8.8.8.8', '1.1.1.1'],    // Google
    ['1.1.1.1', '8.8.4.4'],    // Cloudflare
    ['208.67.222.222', '208.67.220.220'], // OpenDNS
  ]
  const tryResolve = (servers) => new Promise((resolve) => {
    const resolver = new dns.Resolver({ timeout: 3000, tries: 1 })
    try { resolver.setServers(servers) } catch { resolve(''); return }
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !Array.isArray(addresses) || !addresses.length) { resolve(''); return }
      const ip = addresses[0]
      resolve(ip === '127.0.0.1' || ip === '0.0.0.0' || ip.startsWith('192.168.') ? '' : ip)
    })
  })

  return (async () => {
    for (const servers of dnsServers) {
      const ip = await tryResolve(servers)
      if (ip) return ip
    }
    // 最后尝试系统 DNS（可能会被本地拦截）
    try {
      const addresses = await dns.promises.resolve4(hostname)
      const ip = Array.isArray(addresses) && addresses.length ? addresses[0] : ''
      return (ip && ip !== '127.0.0.1' && ip !== '0.0.0.0' && !ip.startsWith('192.168.')) ? ip : ''
    } catch {
      return ''
    }
  })()
}

/**
 * 用 https.request + Google DNS 直接调用 OpenAI-compatible Chat Completions API。
 */
async function callOpenAiCompatibleApi({
  prompt,
  model,
  endpoint,
  apiKey,
  requestId,
  onDelta,
  timeoutMs,
  abortSignal,
  providerName,
}) {
  const base = endpoint.replace(/\/$/, '')
  const apiModel = String(model || '').trim() || 'gpt-4o'
  const who = providerName || apiModel
  const limit = Math.min(Math.max(timeoutMs || 180_000, 30_000), 600_000)
  const stream = typeof onDelta === 'function'

  let parsedUrl
  try {
    parsedUrl = new URL(`${base}/chat/completions`)
  } catch {
    return { ok: false, content: '', error: `供应商「${who}」API 端点格式错误：${base}`, aborted: false }
  }

  const hostname = parsedUrl.hostname
  const realIp = await resolveHostnameDns(hostname)
  if (!realIp) {
    return {
      ok: false, content: '', error:
        `供应商「${who}」无法解析域名（${hostname}）——本机 DNS 可能被本地代理/翻墙软件拦截。` +
        '请暂停 VPN/代理后重试，或在「设置 → 模型与连接」检查 API 端点与网络。',
      aborted: false,
    }
  }
  const isHttps = parsedUrl.protocol === 'https:'

  const bodyRaw = JSON.stringify({
    model: apiModel,
    messages: [{ role: 'user', content: prompt }],
    stream,
    max_tokens: 8192,
  })

  const requestOptions = {
    hostname: realIp || hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(bodyRaw),
      Host: hostname,
    },
    servername: hostname,
    rejectUnauthorized: true,
    agent: false,
  }

  const transport = https

  return new Promise((resolve) => {
    let timedOut = false
    let finished = false
    const req = transport.request(requestOptions)

    req.setTimeout(limit, () => { timedOut = true; req.destroy(new Error('timeout')) })

    if (abortSignal && !abortSignal.aborted) {
      abortSignal.addEventListener('abort', () => {
        if (!timedOut && !finished) { timedOut = true; req.destroy(new Error('aborted')) }
      }, { once: true })
    }

    req.on('response', (res) => {
      const chunks = []
      let fullContent = ''
      const cleanup = () => { finished = true }

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          cleanup()
          const errBody = Buffer.concat(chunks).toString('utf8').slice(0, 300)
          if (res.statusCode === 401 || /invalid.*api.?key|unauthorized/i.test(errBody)) {
            resolve({ ok: false, content: '', error: `供应商「${who}」API Key 无效或已过期。请在「设置 → 模型与连接」更新 API Key。`, aborted: false })
          } else {
            resolve({ ok: false, content: '', error: `供应商「${who}」返回 ${res.statusCode}。${errBody ? ` ${errBody}` : ''}`, aborted: false })
          }
        })
        return
      }

      if (!stream) {
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          cleanup()
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            resolve({ ok: true, content: data?.choices?.[0]?.message?.content || '', error: null, aborted: false })
          } catch {
            resolve({ ok: false, content: '', error: `供应商「${who}」响应解析失败`, aborted: false })
          }
        })
        return
      }

      let buf = ''
      const emit = () => {
        let idx
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line || line === 'data: [DONE]') continue
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            const delta = json?.choices?.[0]?.delta?.content
            if (delta) { fullContent += delta; if (onDelta && !timedOut) onDelta(delta, requestId) }
          } catch { /* skip */ }
        }
      }
      res.on('data', (chunk) => { buf += chunk.toString('utf8'); emit() })
      res.on('end', () => { cleanup(); emit(); resolve({ ok: true, content: fullContent, error: null, aborted: false }) })
    })

    req.on('error', (e) => {
      finished = true
      if (timedOut) { resolve({ ok: false, content: '', error: `供应商「${who}」请求超时`, aborted: true }) }
      else { resolve({ ok: false, content: '', error: `供应商「${who}」连接失败：${String(e?.message || e).slice(0, 240)}`, aborted: false }) }
    })

    req.write(bodyRaw)
    req.end()
  })
}

/**
 * 用 https.request + Google DNS 直接调用 Google Gemini API。
 */
async function callGeminiApi({
  prompt,
  model,
  endpoint,
  apiKey,
  requestId,
  onDelta,
  timeoutMs,
  abortSignal,
  providerName,
}) {
  const base = endpoint.replace(/\/$/, '')
  const limit = Math.min(Math.max(timeoutMs || 180_000, 30_000), 600_000)
  const stream = typeof onDelta === 'function'

  // Gemini 使用 x-goog-api-key 认证
  const authHeader = apiKey
  // 模型名清洗：统一小写、空格变短横，确保以 gemini- 开头
  const cleaned = String(model || '').trim().toLowerCase().replace(/\s+/g, '-')
  const apiModel = cleaned.startsWith('gemini-') ? cleaned : `gemini-${cleaned}` || 'gemini-2.0-flash'
  const who = providerName || apiModel
  // 分离 base URL 中的 /v1beta 部分
  const v1betaBase = base.includes('/v1beta') ? base.split('/v1beta')[0] + '/v1beta' : base + '/v1beta'
  const modelEndpoint = stream
    ? `${v1betaBase}/models/${apiModel}:streamGenerateContent?alt=sse`
    : `${v1betaBase}/models/${apiModel}:generateContent`

  let parsedUrl
  try {
    parsedUrl = new URL(modelEndpoint)
  } catch {
    return { ok: false, content: '', error: `供应商「${who}」API 端点格式错误：${base}`, aborted: false }
  }

  const hostname = parsedUrl.hostname
  const realIp = await resolveHostnameDns(hostname)
  if (!realIp) {
    return {
      ok: false, content: '', error:
        `供应商「${who}」无法解析域名（${hostname}）——本机 DNS 可能被本地代理/翻墙软件拦截。` +
        '请暂停 VPN/代理后重试，或在「设置 → 模型与连接」检查 API 端点与网络。',
      aborted: false,
    }
  }
  const isHttps = parsedUrl.protocol === 'https:'

  const bodyRaw = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 8192 },
  })

  const requestOptions = {
    hostname: realIp || hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': authHeader,
      'Content-Length': Buffer.byteLength(bodyRaw),
      Host: hostname,
    },
    servername: hostname,
    rejectUnauthorized: true,
    agent: false,
  }

  const transport = https

  return new Promise((resolve) => {
    let timedOut = false
    let finished = false
    const req = transport.request(requestOptions)

    req.setTimeout(limit, () => { timedOut = true; req.destroy(new Error('timeout')) })

    if (abortSignal && !abortSignal.aborted) {
      abortSignal.addEventListener('abort', () => {
        if (!timedOut && !finished) { timedOut = true; req.destroy(new Error('aborted')) }
      }, { once: true })
    }

    req.on('response', (res) => {
      const chunks = []
      let fullContent = ''
      const cleanup = () => { finished = true }

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          cleanup()
          const errBody = Buffer.concat(chunks).toString('utf8').slice(0, 300)
          if (res.statusCode === 401 || /API_KEY_INVALID|invalid.*api.?key|unauthorized/i.test(errBody)) {
            resolve({ ok: false, content: '', error: `供应商「${who}」API Key 无效或已过期。请在「设置 → 模型与连接」更新 API Key。`, aborted: false })
          } else if (res.statusCode === 403 || res.statusCode === 429) {
            resolve({ ok: false, content: '', error: `供应商「${who}」返回 ${res.statusCode}（配额/权限不足）。${errBody ? ` ${errBody.slice(0, 200)}` : ''}`, aborted: false })
          } else {
            resolve({ ok: false, content: '', error: `供应商「${who}」返回 ${res.statusCode}。${errBody ? ` ${errBody}` : ''}`, aborted: false })
          }
        })
        return
      }

      if (!stream) {
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          cleanup()
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.text || ''
            resolve({ ok: true, content: text, error: null, aborted: false })
          } catch {
            resolve({ ok: false, content: '', error: `供应商「${who}」响应解析失败`, aborted: false })
          }
        })
        return
      }

      // Gemini streaming SSE: data: {"candidates":[{...}]}
      let buf = ''
      const emit = () => {
        let idx
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line || line === 'data: [DONE]') continue
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            if (text) { fullContent += text; if (onDelta && !timedOut) onDelta(text, requestId) }
          } catch { /* skip */ }
        }
      }
      res.on('data', (chunk) => { buf += chunk.toString('utf8'); emit() })
      res.on('end', () => { cleanup(); emit(); resolve({ ok: true, content: fullContent, error: null, aborted: false }) })
    })

    req.on('error', (e) => {
      finished = true
      if (timedOut) { resolve({ ok: false, content: '', error: `供应商「${who}」请求超时`, aborted: true }) }
      else { resolve({ ok: false, content: '', error: `供应商「${who}」连接失败：${String(e?.message || e).slice(0, 240)}`, aborted: false }) }
    })

    req.write(bodyRaw)
    req.end()
  })
}

export async function runClaudeCodePrint({
  prompt,
  model,
  requestId,
  timeoutMs,
  attachmentCount,
  attachments,
  claudeSessionId,
  sessionName,
  isNewClaudeSession,
  onDelta,
}) {
  if (!prompt?.trim()) {
    return { ok: false, error: '提示词为空', content: '', aborted: false }
  }

  const resolved = cloudProviders.resolveEnvForModel(model)
  const globalEnv = readGlobalClaudeEnv()
  const providerEnv = resolved.env || globalEnv
  const claudeEnv = cloudProviders.normalizeProviderEnv(
    syncEnvDefaultModels({ ...providerEnv }, model),
  )
  try {
    cloudProviders.writeClaudeSettingsFromEnv(claudeEnv, 'chinese')
  } catch {
    /* settings.json 写入失败时仍尝试用 env 启动 */
  }
  const thirdParty = isThirdPartyAnthropicBase(claudeEnv.ANTHROPIC_BASE_URL)
  const env = {
    ...process.env,
    ...claudeEnv,
    /** 避免 -p 模式等待全部 MCP 握手（慢/离线 MCP 会导致 180–300s 假超时） */
    MCP_CONNECTION_NONBLOCKING:
      process.env.MCP_CONNECTION_NONBLOCKING ??
      (process.env.WORKBENCH_MCP_NONBLOCKING !== '0' ? 'true' : 'false'),
  }

  // === 路由决策：端点判断 ===
  // 端点指向本地（127.0.0.1 / localhost / 内网）→ 走 claude CLI
  // 端点指向外网（api.openai.com 等）→ 直接调用 API
  const providerEndpoint = String(claudeEnv.ANTHROPIC_BASE_URL || '').trim()
  let endpointHost = ''
  try { endpointHost = new URL(providerEndpoint).hostname } catch {}

  const isLocalEndpoint =
    !endpointHost ||
    endpointHost === '127.0.0.1' ||
    endpointHost === 'localhost' ||
    endpointHost === '0.0.0.0' ||
    endpointHost.startsWith('192.168.') ||
    /^10\.\d+\.\d+\.\d+$/.test(endpointHost) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(endpointHost)

  // --- 供应商已知支持 directApi，用已知 directApiBase 覆盖存储的 endpoint 以确保路径正确 ---
  let effectiveEndpoint = providerEndpoint
  let rawModel = String(model || '').trim()
  let directInfo = cloudProviders.supportsDirectApi(resolved.providerName)
  // providerName 未匹配时，通过模型名启发式推断
  if ((!directInfo.direct || !directInfo.apiBase) && isLocalEndpoint) {
    const inferred = cloudProviders.inferDirectApiFromModel(rawModel)
    if (inferred.direct && inferred.apiBase) {
      directInfo = inferred
    }
  }
  if (directInfo.direct && directInfo.apiBase && (isLocalEndpoint || resolved.providerName)) {
    effectiveEndpoint = directInfo.apiBase
  }

  // ---- 远程端点 / 已知 directApi 供应商 → 直接 API ----
  if ((!isLocalEndpoint && providerEndpoint) || (isLocalEndpoint && effectiveEndpoint !== providerEndpoint)) {
    const directApiKey = String(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || '').trim()
    if (!directApiKey) {
      return { ok: false, content: '', error: '供应商未配置 API Key，请在「设置 → 模型与连接」中添加。', aborted: false }
    }
    const useExplicitModel = rawModel && !/^(sonnet|opus|haiku|inherit|auto)$/i.test(rawModel)
    const directModel = useExplicitModel
      ? mapApiModelId(rawModel, env)
      : mapApiModelId(env.ANTHROPIC_DEFAULT_SONNET_MODEL || rawModel || 'gpt-4o', env)

    const maxTimeout = Math.min(Math.max(timeoutMs || 180_000, 30_000), 600_000)

    // 检测 Gemini 端点 → 走 Gemini 原生 API
    const isGemini = /generativelanguage\.googleapis|googleapis\.com\/.*\/models/i.test(effectiveEndpoint)

    try {
      if (isGemini) {
        const r = await callGeminiApi({
          prompt: prompt.trim(),
          model: directModel,
          endpoint: effectiveEndpoint,
          apiKey: directApiKey,
          providerName: resolved.providerName,
          requestId: requestId?.trim(),
          onDelta: typeof onDelta === 'function' ? onDelta : undefined,
          timeoutMs: maxTimeout,
        })
        if (r) return r
      } else {
        const r = await callOpenAiCompatibleApi({
          prompt: prompt.trim(),
          model: directModel,
          endpoint: effectiveEndpoint,
          apiKey: directApiKey,
          providerName: resolved.providerName,
          requestId: requestId?.trim(),
          onDelta: typeof onDelta === 'function' ? onDelta : undefined,
          timeoutMs: maxTimeout,
        })
        if (r) return r
      }
    } catch (e) {
      return { ok: false, content: '', error: `API 调用异常（端点：${providerEndpoint}，模型：${directModel}）：${String(e?.message || e).slice(0, 200)}`, aborted: false }
    }
  }

  // ---- 本地端点 → claude CLI 路径（Anthropic 兼容端点） ----
  const snap = await resolveClaudePath()
  if (!snap.claudePath || snap.resolveError) {
    return {
      ok: false,
      error: snap.resolveError || '未检测到 Claude Code CLI',
      content: '',
      aborted: false,
    }
  }
  const cliModel = resolveClaudeCliModel(model, env)

  const cwd = getWorkspaceCwd()
  const imageAttachments = Array.isArray(attachments)
    ? attachments.filter((a) => a?.kind === 'image' && a?.dataUrl)
    : []
  const imageCount = Math.max(
    Math.max(0, Number(attachmentCount) || 0),
    imageAttachments.length,
  )
  const useMultimodalInput = imageAttachments.length > 0

  if (useMultimodalInput && !chatImages.modelSupportsClaudeCodeVision(model, claudeEnv)) {
    const who = resolved.providerName || '当前供应商'
    return {
      ok: false,
      error:
        `${who} 的模型「${String(model || '').trim() || '默认'}」不支持图片输入（非视觉模型不可带图）。` +
        ' 请切换到 Claude Sonnet / Gemini 等视觉模型，或改用「本地 MCP」+ Ollama 视觉模型。',
      content: '',
      aborted: false,
    }
  }

  const args = useMultimodalInput
    ? ['-p', '--permission-mode', 'auto', '--input-format', 'stream-json']
    : ['-p', prompt.trim(), '--permission-mode', 'auto']
  if (cliModel) args.push('--model', cliModel)
  const useBare =
    process.env.WORKBENCH_CLAUDE_BARE === '1' ||
    (process.env.WORKBENCH_CLAUDE_BARE !== '0' && thirdParty)
  if (useBare) args.push('--bare')
  /** 第三方 API：不加载 ~/.claude 里的 MCP，避免 Agent 子进程卡在 MCP 连接 */
  if (
    thirdParty &&
    process.env.WORKBENCH_CLAUDE_STRICT_MCP !== '0' &&
    !args.includes('--strict-mcp-config')
  ) {
    args.push('--strict-mcp-config')
  }

  const prefs = loadUiPrefs()
  const tagName = String(sessionName || prefs.defaultSessionTag || '')
    .trim()
    .replace(/^claude:/i, '')
    .slice(0, 120)
  let resolvedSessionId = String(claudeSessionId || '').trim()
  if (resolvedSessionId) {
    args.push('--resume', resolvedSessionId)
  } else if (isNewClaudeSession !== false) {
    resolvedSessionId = crypto.randomUUID()
    args.push('--session-id', resolvedSessionId)
    if (tagName) args.push('--name', tagName)
  }

  const imageCountForTimeout = imageCount
  const limit = timeoutMsForRequest(env, timeoutMs, imageCountForTimeout)

  rawModel = String(model || '').trim()
  const useExplicitModel =
    rawModel && !/^(sonnet|opus|haiku|inherit|auto)$/i.test(rawModel)
  const apiModel = useExplicitModel
    ? mapApiModelId(rawModel, env)
    : mapApiModelId(env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'sonnet', env)

  const preflightError = await preflightAnthropicEndpoint(
    env,
    apiModel,
    resolved.providerName,
  )
  if (preflightError) {
    return { ok: false, error: preflightError, content: '', aborted: false }
  }

  const useStreaming = typeof onDelta === 'function' || useMultimodalInput
  if (useStreaming) {
    args.push('--output-format', 'stream-json', '--verbose', '--include-partial-messages')
  } else if (useMultimodalInput) {
    args.push('--output-format', 'stream-json', '--verbose')
  }

  return new Promise((resolve) => {
    let child
    let timedOut = false
    let timer = null
    try {
      child = spawn(snap.claudePath, args, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      if (useMultimodalInput) {
        child.stdin?.write(chatImages.buildStreamJsonUserLine(prompt.trim(), imageAttachments))
      }
      child.stdin?.end()
    } catch (e) {
      resolve({ ok: false, error: e.message, content: '', aborted: false })
      return
    }

    const rid = requestId?.trim()
    if (rid) active.set(rid, child)

    let stdout = ''
    let stderr = ''
    const streamState = useStreaming ? createStreamDisplayState() : null
    let streamLineBuf = ''
    let emittedDisplayLen = 0

    const flushStreamDisplay = (finalize = false) => {
      if (!useStreaming || !streamState || !onDelta) return
      if (finalize) finalizeStreamDisplay(streamState)
      const next = streamState.display.slice(emittedDisplayLen)
      if (!next) return
      emittedDisplayLen = streamState.display.length
      onDelta(next, rid)
    }

    const consumeStreamChunk = (chunk) => {
      if (!useStreaming || !streamState) {
        stdout += chunk
        return
      }
      streamLineBuf += chunk
      let idx = streamLineBuf.indexOf('\n')
      while (idx >= 0) {
        const line = streamLineBuf.slice(0, idx).trim()
        streamLineBuf = streamLineBuf.slice(idx + 1)
        if (line) appendStreamJsonLine(line, streamState)
        idx = streamLineBuf.indexOf('\n')
      }
      flushStreamDisplay(false)
    }

    child.stdout?.on('data', (d) => {
      consumeStreamChunk(d.toString())
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })

    const finish = (code, signal) => {
      if (timer) clearTimeout(timer)
      if (rid) active.delete(rid)
      if (useStreaming && streamState) {
        const rest = streamLineBuf.trim()
        if (rest) appendStreamJsonLine(rest, streamState)
        flushStreamDisplay(true)
      }
      const streamed = streamState?.display?.trim() ?? ''
      const out = useStreaming ? streamed || stdout.trim() : stdout.trim()
      const err = stderr.trim()
      const terminated =
        timedOut ||
        signal === 'SIGTERM' ||
        signal === 'SIGKILL' ||
        code === 143 ||
        code === 137
      if (timedOut) {
        const hint = timeoutHint(env, cliModel || model, resolved.providerName, imageCountForTimeout)
        resolve({
          ok: false,
          content: out,
          error: `Claude Code 超时（${Math.round(limit / 1000)}s）。${hint}`.trim(),
          aborted: true,
        })
        return
      }
      if (terminated) {
        resolve({
          ok: false,
          content: out,
          error: friendlyClaudeError(err || out || '请求已取消', env, resolved.providerName),
          aborted: true,
        })
        return
      }
      if (code === 0) {
        if (!out && !err) {
          resolve({
            ok: false,
            content: '',
            error: 'Claude Code 返回空内容，请检查「设置 → 模型与连接」中的供应商配置是否正常。',
            aborted: false,
          })
          return
        }
        resolve({
          ok: true,
          content: out || err,
          error: null,
          aborted: false,
          claudeSessionId: resolvedSessionId || undefined,
        })
        return
      }
      const msg = friendlyClaudeError(
        err || out || `claude 退出码 ${code}`,
        env,
        resolved.providerName,
      )
      resolve({
        ok: false,
        content: out || err,
        error: msg,
        aborted: false,
      })
    }

    child.on('close', finish)
    child.on('error', (e) => {
      if (timer) clearTimeout(timer)
      if (rid) active.delete(rid)
      resolve({ ok: false, error: e.message, content: '', aborted: false })
    })

    if (limit > 0) {
      timer = setTimeout(() => {
        timedOut = true
        try {
          child.kill('SIGTERM')
        } catch {
          /* ignore */
        }
      }, limit)
    }
  })
}

export function abortClaudeCode(requestId) {
  const id = requestId?.trim()
  if (!id) return { ok: false }
  const child = active.get(id)
  if (child && !child.killed) {
    child.kill('SIGTERM')
    return { ok: true }
  }
  return { ok: false }
}

export async function claudeCliStatus() {
  const settings = loadChatSettings()
  const snap = await resolveClaudePath()
  let hint = snap.resolveError
  if (!hint && !snap.claudePath) {
    hint = '未检测到 claude，请在设置中配置 claude 可执行文件路径'
  }
  return {
    ok: true,
    configuredPath: settings.claudeCliPath || '',
    claudePath: snap.claudePath,
    versionLine: snap.versionLine,
    detectionSource: settings.claudeCliPath?.trim() ? 'manual' : 'path',
    hint: hint || '',
  }
}

export async function runClaudeDoctor() {
  const snap = await resolveClaudePath()
  if (!snap.claudePath) {
    return { ok: false, error: snap.resolveError || '未找到 claude CLI' }
  }
  const safe = snap.claudePath.includes(' ') ? `"${snap.claudePath}"` : snap.claudePath
  const cwd = getWorkspaceCwd()
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', `${safe} doctor`], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      if (!child.killed) child.kill('SIGTERM')
    }, 120_000)
    child.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
      resolve({
        ok: code === 0,
        exitCode: code ?? 1,
        content: combined.slice(0, 48_000),
        error: code === 0 ? null : stderr.trim() || `claude doctor 退出码 ${code ?? '?'}`,
      })
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ ok: false, error: e.message, content: '' })
    })
  })
}
