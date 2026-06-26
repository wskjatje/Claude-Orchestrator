'use strict'

const https = require('node:https')
const http = require('node:http')
const dns = require('node:dns')
const cloudProviders = require('./cloud-providers.cjs')

/** requestId → ClientRequest 实例，用于中止 */
const activeRequests = new Map()

/**
 * 通过公共 DNS 解析主机名，绕过本地代理/VPN 的 DNS 劫持。
 * 返回真实公网 IP，全部被拦截则返回空字符串。
 */
function resolveHostname(hostname) {
  const dnsServers = [
    ['8.8.8.8', '1.1.1.1'],
    ['1.1.1.1', '8.8.4.4'],
    ['208.67.222.222', '208.67.220.220'],
  ]
  const tryResolve = (servers) => new Promise((resolve) => {
    let resolver
    try {
      resolver = new dns.Resolver({ timeout: 3000, tries: 1 })
      resolver.setServers(servers)
    } catch { resolve(''); return }
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
 * 发送 HTTP(S) POST 请求，返回 { status, data }。
 * 通过公共 DNS 解析绕过代理劫持，用 servername 确保 TLS SNI 正确。
 * @param {string} url
 * @param {object} bodyJson
 * @param {object} [headers]
 * @param {number} [timeoutMs]
 * @param {string} [requestId] 可选，用于支持中止请求
 */
function httpPostJson(url, bodyJson, headers = {}, timeoutMs = 120_000, requestId = '') {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://')
    const parsed = new URL(url)
    const hostname = parsed.hostname
    const body = JSON.stringify(bodyJson)

    resolveHostname(hostname).then((realIp) => {
      const opts = {
        hostname: realIp || hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          Host: hostname,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: timeoutMs,
        servername: hostname,
        rejectUnauthorized: true,
      }
      const lib = isHttps ? https : http
      const req = lib.request(opts, (res) => {
        let buf = ''
        res.on('data', (chunk) => { buf += chunk.toString() })
        res.on('end', () => {
          if (requestId) activeRequests.delete(requestId)
          try {
            const data = JSON.parse(buf)
            resolve({ status: res.statusCode, data })
          } catch {
            resolve({ status: res.statusCode, data: null })
          }
        })
      })
      req.on('error', (e) => {
        if (requestId) activeRequests.delete(requestId)
        reject(e)
      })
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')) })
      // 注册到 activeRequests 以支持中止
      if (requestId) activeRequests.set(requestId, req)
      req.write(body)
      req.end()
    }).catch((e) => reject(e))
  })
}

/**
 * 从 Gemini 原生 API 响应中提取文本内容。
 */
function extractGeminiContent(data) {
  try {
    const candidates = data?.candidates
    if (!Array.isArray(candidates) || !candidates.length) return ''
    const parts = candidates[0]?.content?.parts
    if (!Array.isArray(parts)) return ''
    return parts.map((p) => p.text || '').join('')
  } catch {
    return ''
  }
}

/**
 * 直接调用云供应商 API
 * @param {{ prompt: string; model?: string; requestId?: string; timeoutMs?: number }} payload
 * @returns {Promise<{ ok: boolean; content?: string; error?: string | null; aborted?: boolean }>}
 */
async function directPrompt(payload) {
  const prompt = String(payload?.prompt || '').trim()
  if (!prompt) return { ok: false, error: '提示词为空', content: '', aborted: false }

  const model = String(payload?.model || '').trim()
  const requestId = String(payload?.requestId || '').trim()
  const timeoutMs = Number.isFinite(payload?.timeoutMs) && payload.timeoutMs > 0 ? payload.timeoutMs : 120_000

  // 1. 通过 cloud-providers 解析当前供应商配置
  const resolved = cloudProviders.resolveEnvForModel(model)
  if (!resolved.env?.ANTHROPIC_BASE_URL) {
    return {
      ok: false,
      error: resolved.providerName
        ? `供应商「${resolved.providerName}」未提供有效 API 端点`
        : '请先在「设置 → 模型与连接」中添加云模型供应商',
      content: '',
      aborted: false,
    }
  }

  const apiKey = String(resolved.env.ANTHROPIC_API_KEY || resolved.env.ANTHROPIC_AUTH_TOKEN || '').trim()
  if (!apiKey) {
    return {
      ok: false,
      error: `供应商「${resolved.providerName}」的 API Key 为空，请在设置中配置`,
      content: '',
      aborted: false,
    }
  }

  const apiModel = resolved.model

  // 2. 获取正确的 API base URL
  //    ANTHROPIC_BASE_URL 可能经过 normalizeAnthropicBaseUrl 处理（如 DeepSeek → /anthropic），
  //    但直接 API 路径需要原始的 directApiBase。
  //    对已知供应商，用 KNOWN_CLOUD_PROVIDERS 中的 directApiBase 覆盖。
  const directInfo = cloudProviders.supportsDirectApi(resolved.providerName)
  const isKnownProvider = directInfo.direct && directInfo.apiBase
  const effectiveBase = isKnownProvider
    ? directInfo.apiBase.replace(/\/+$/, '')
    : String(resolved.env.ANTHROPIC_BASE_URL).replace(/\/+$/, '')

  const isGemini = /generativelanguage\.googleapis/i.test(effectiveBase) ||
    resolved.providerName === 'Google Gemini'

  try {
    if (isGemini) {
      // ---------- Gemini 原生 API ----------
      // 用 x-goog-api-key 认证，不走 Bearer
      const cleanBase = effectiveBase
        .replace(/\/?models\/?$/i, '')
        .replace(/\/v1beta\/?/i, '/v1beta')
        .replace(/\/+$/, '')
      const apiBase = cleanBase.includes('/v1beta')
        ? cleanBase
        : cleanBase + '/v1beta'
      const url = `${apiBase}/models/${apiModel}:generateContent`

      const { status, data } = await httpPostJson(
        url,
        { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
        { 'x-goog-api-key': apiKey },
        timeoutMs,
        requestId,
      )

      if (status !== 200) {
        const errBody = data ? JSON.stringify(data).slice(0, 300) : ''
        return {
          ok: false,
          error: `云模型 API 错误 (${status}): ${errBody || '请求失败'}`,
          content: '',
          aborted: false,
        }
      }

      const content = extractGeminiContent(data)
      return { ok: true, content: content || '', aborted: false }
    }

    // ---------- OpenAI 兼容 API ----------
    // 已知供应商：directApiBase 已含版本路径（如 /v1），直接拼接 /chat/completions
    // 自定义供应商：保持向后兼容，拼接 /v1/chat/completions
    const url = isKnownProvider
      ? `${effectiveBase}/chat/completions`
      : `${effectiveBase}/v1/chat/completions`

    const { status, data } = await httpPostJson(
      url,
      {
        model: apiModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      },
      { Authorization: `Bearer ${apiKey}` },
      timeoutMs,
      requestId,
    )

    if (status !== 200) {
      const errBody = data ? JSON.stringify(data).slice(0, 300) : ''
      return {
        ok: false,
        error: `云模型 API 错误 (${status}): ${errBody || '请求失败'}`,
        content: '',
        aborted: false,
      }
    }

    const content =
      data?.choices?.[0]?.message?.content ||
      data?.content?.[0]?.text ||
      data?.response ||
      ''

    return { ok: true, content, aborted: false }
  } catch (e) {
    const msg = e?.message || String(e)
    // 超时
    if (msg === '请求超时' || e?.code === 'ERR_REQ_TIMEOUT') {
      return { ok: false, error: '请求超时', content: '', aborted: true }
    }
    // DNS 全部被拦截
    if (msg.includes('getaddrinfo') || msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN')) {
      return {
        ok: false,
        error: `供应商「${resolved.providerName}」无法解析域名——本机 DNS 可能被本地代理/翻墙软件拦截。请暂停 VPN/代理后重试，或在「设置 → 模型与连接」检查 API 端点与网络。`,
        content: '',
        aborted: false,
      }
    }
    return { ok: false, error: msg, content: '', aborted: false }
  }
}

/**
 * 中止进行中的直接请求
 * @param {string} requestId
 * @returns {{ ok: boolean }}
 */
function directAbort(requestId) {
  const req = activeRequests.get(String(requestId || '').trim())
  if (req) {
    req.destroy()
    activeRequests.delete(String(requestId || '').trim())
  }
  return { ok: true }
}

module.exports = { directPrompt, directAbort }
