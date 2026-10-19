'use strict'

const https = require('node:https')
const http = require('node:http')
const dns = require('node:dns')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const cloudProviders = require('./cloud-providers.cjs')

/** @type {null | ((text: string) => string)} */
let sanitizeDirectChatReplyFn = null

async function sanitizeCloudDirectContent(content) {
  const raw = String(content || '')
  if (!raw.trim()) return raw
  try {
    if (!sanitizeDirectChatReplyFn) {
      const mod = await import(
        pathToFileURL(path.join(__dirname, '../shared/sanitize-direct-reply.mjs')).href
      )
      sanitizeDirectChatReplyFn = mod.sanitizeDirectChatReply
    }
    return sanitizeDirectChatReplyFn(raw)
  } catch {
    return raw
  }
}

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

/**
 * OpenAI 兼容 SSE 流式 POST。onDelta(chunk) 逐步回调；失败硬抛错（不回落非流式）。
 * @param {string} url
 * @param {object} bodyJson
 * @param {object} [headers]
 * @param {number} [timeoutMs]
 * @param {string} [requestId]
 * @param {(chunk: string) => void} onDelta
 * @returns {Promise<{ status: number, content: string }>}
 */
/**
 * @param {object} [streamOpts]
 * @param {boolean} [streamOpts.injectStreamFlag=true] OpenAI 需 body.stream=true；Gemini SSE 端点勿注入
 */
function httpPostJsonStream(url, bodyJson, headers = {}, timeoutMs = 120_000, requestId = '', onDelta, streamOpts = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://')
    const parsed = new URL(url)
    const hostname = parsed.hostname
    const injectStream = streamOpts?.injectStreamFlag !== false
    const body = JSON.stringify(injectStream ? { ...bodyJson, stream: true } : bodyJson)

    resolveHostname(hostname).then((realIp) => {
      const opts = {
        hostname: realIp || hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
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
        let content = ''
        let reasoning = ''
        let status = res.statusCode || 0
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          buf += chunk
          const parts = buf.split(/\n/)
          buf = parts.pop() || ''
          for (const line of parts) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            const payload = t.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const j = JSON.parse(payload)
              const openai = cloudProviders.openAiVisibleText(j?.choices?.[0])
              let delta = openai.content
              if (!delta && openai.reasoning) reasoning += openai.reasoning
              // Gemini streamGenerateContent?alt=sse
              if (!delta && Array.isArray(j?.candidates)) {
                const parts = j.candidates[0]?.content?.parts
                if (Array.isArray(parts)) {
                  delta = parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('')
                }
              }
              if (delta) {
                content += delta
                if (typeof onDelta === 'function') onDelta(delta)
              }
            } catch {
              /* ignore bad sse line */
            }
          }
        })
        res.on('end', () => {
          if (requestId) activeRequests.delete(requestId)
          if (status !== 200) {
            reject(new Error(`云模型流式 API 错误 (${status}): ${content.slice(0, 300) || '请求失败'}`))
            return
          }
          const visible = cloudProviders.finalizeOpenAiVisible(content, reasoning)
          resolve({ status, content: visible.content || content })
        })
      })
      req.on('error', (e) => {
        if (requestId) activeRequests.delete(requestId)
        reject(e)
      })
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')) })
      if (requestId) activeRequests.set(requestId, req)
      req.write(body)
      req.end()
    }).catch((e) => reject(e))
  })
}

/** @type {null | typeof import('../shared/direct-chat-policy.mjs')} */
let directChatPolicyMod = null

async function loadDirectChatPolicy() {
  if (!directChatPolicyMod) {
    directChatPolicyMod = await import(
      pathToFileURL(path.join(__dirname, '../shared/direct-chat-policy.mjs')).href
    )
  }
  return directChatPolicyMod
}

/**
 * @param {string} content
 * @param {null | {
 *   url: string,
 *   apiKey: string,
 *   apiModel: string,
 *   prompt: string,
 *   timeoutMs: number,
 *   requestId: string,
 *   extras?: object,
 *   onDelta?: ((chunk: string) => void) | null,
 * }} [continueCtx] 半截时再打一轮（仅 OpenAI 兼容）
 */
async function finishDirectOk(content, continueCtx = null) {
  let out = await sanitizeCloudDirectContent(content)
  if (continueCtx?.url && continueCtx.apiKey && continueCtx.apiModel && continueCtx.prompt) {
    try {
      const pol = await loadDirectChatPolicy()
      if (typeof pol.looksLikeTruncatedDirectReply === 'function' && pol.looksLikeTruncatedDirectReply(out)) {
        const tail = out.slice(-72).replace(/\s+/g, ' ')
        const contBody = {
          model: continueCtx.apiModel,
          messages: [
            { role: 'user', content: continueCtx.prompt },
            { role: 'assistant', content: out },
            {
              role: 'user',
              content: `上一条在半句处截断。截断处：「${tail}」。请只补后半句并立刻结束；禁止重写全文、禁止新开长章节。`,
            },
          ],
          stream: false,
          ...(continueCtx.extras && typeof continueCtx.extras === 'object' ? continueCtx.extras : {}),
        }
        const { status, data } = await httpPostJson(
          continueCtx.url,
          contBody,
          { Authorization: `Bearer ${continueCtx.apiKey}` },
          continueCtx.timeoutMs || 120_000,
          continueCtx.requestId || '',
        )
        if (status === 200) {
          const openai = cloudProviders.openAiVisibleText(data?.choices?.[0])
          const visible = cloudProviders.finalizeOpenAiVisible(
            openai.content || data?.content?.[0]?.text || data?.response || '',
            openai.reasoning,
          )
          const cont = await sanitizeCloudDirectContent(visible.ok ? visible.content : '')
          if (cont && cont !== out) {
            // 简单拼接；若续写重复开头则去重
            let piece = cont
            const overlap = Math.min(48, Math.floor(out.length / 4), piece.length)
            for (let n = overlap; n >= 12; n--) {
              if (piece.startsWith(out.slice(-n))) {
                piece = piece.slice(n).trimStart()
                break
              }
            }
            if (piece) {
              if (typeof continueCtx.onDelta === 'function') continueCtx.onDelta(piece)
              out = await sanitizeCloudDirectContent(`${out}${piece}`)
            }
          }
        }
      }
    } catch {
      /* 续写失败仍返回已有正文，不硬失败 */
    }
  }
  return {
    ok: true,
    content: out,
    aborted: false,
  }
}

async function directPrompt(payload) {
  const prompt = String(payload?.prompt || '').trim()
  if (!prompt) return { ok: false, error: '提示词为空', content: '', aborted: false }

  const model = String(payload?.model || '').trim()
  const requestId = String(payload?.requestId || '').trim()
  const timeoutMs = Number.isFinite(payload?.timeoutMs) && payload.timeoutMs > 0 ? payload.timeoutMs : 120_000
  const onDelta = typeof payload?.onDelta === 'function' ? payload.onDelta : null

  // 1. 通过 cloud-providers 解析当前供应商配置
  const resolved = cloudProviders.resolveEnvForModel(model)
  if (resolved.error) {
    return {
      ok: false,
      error: resolved.error,
      content: '',
      aborted: false,
    }
  }
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
      const geminiBody = { contents: [{ role: 'user', parts: [{ text: prompt }] }] }
      const geminiHeaders = { 'x-goog-api-key': apiKey }

      // 有 onDelta：必须 streamGenerateContent，断流硬失败，禁止静默回落 generateContent
      if (onDelta) {
        const streamUrl = `${apiBase}/models/${apiModel}:streamGenerateContent?alt=sse`
        try {
          const streamed = await httpPostJsonStream(
            streamUrl,
            geminiBody,
            geminiHeaders,
            timeoutMs,
            requestId,
            onDelta,
            { injectStreamFlag: false },
          )
          return finishDirectOk(streamed.content || '')
        } catch (e) {
          const msg = e?.message || String(e)
          if (msg === '请求超时') return { ok: false, error: '请求超时', content: '', aborted: true }
          return { ok: false, error: msg, content: '', aborted: false }
        }
      }

      const url = `${apiBase}/models/${apiModel}:generateContent`
      const { status, data } = await httpPostJson(
        url,
        geminiBody,
        geminiHeaders,
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
      return finishDirectOk(content || '')
    }

    // ---------- OpenAI 兼容 API ----------
    // 已知供应商：directApiBase 已含版本路径（如 /v1），直接拼接 /chat/completions
    // 自定义供应商：保持向后兼容，拼接 /v1/chat/completions
    const url = isKnownProvider
      ? `${effectiveBase}/chat/completions`
      : `${effectiveBase}/v1/chat/completions`

    const openaiExtras = cloudProviders.deepSeekRequestExtras(apiModel)
    const continueCtx = {
      url,
      apiKey,
      apiModel,
      prompt,
      timeoutMs,
      requestId,
      extras: openaiExtras,
      onDelta,
    }

    if (onDelta) {
      try {
        const streamed = await httpPostJsonStream(
          url,
          {
            model: apiModel,
            messages: [{ role: 'user', content: prompt }],
            ...openaiExtras,
          },
          { Authorization: `Bearer ${apiKey}` },
          timeoutMs,
          requestId,
          onDelta,
        )
        if (!String(streamed.content || '').trim()) {
          return { ok: false, error: '云模型未返回可显示正文。', content: '', aborted: false }
        }
        return finishDirectOk(streamed.content, continueCtx)
      } catch (e) {
        const msg = e?.message || String(e)
        if (msg === '请求超时') return { ok: false, error: '请求超时', content: '', aborted: true }
        return { ok: false, error: msg, content: '', aborted: false }
      }
    }

    const { status, data } = await httpPostJson(
      url,
      {
        model: apiModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        ...openaiExtras,
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

    const openai = cloudProviders.openAiVisibleText(data?.choices?.[0])
    const visible = cloudProviders.finalizeOpenAiVisible(
      openai.content || data?.content?.[0]?.text || data?.response || '',
      openai.reasoning,
    )
    if (!visible.ok) {
      return { ok: false, error: visible.error, content: '', aborted: false }
    }
    return finishDirectOk(visible.content, continueCtx)
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
