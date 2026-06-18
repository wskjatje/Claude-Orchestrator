import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
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

/** Gemini/ccr/DeepSeek 等：CLI 用 sonnet 别名，真实模型由 env ANTHROPIC_DEFAULT_* 映射 */
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

/** Claude Code / DeepSeek API 实际使用的模型 ID（deepseek-chat 在 CLI 侧已不可用） */
function mapApiModelId(model, env) {
  const m = String(model || '').trim()
  if (!m || /^(inherit|auto)$/i.test(m)) return m
  if (/^deepseek-chat$/i.test(m)) return 'deepseek-v4-flash'
  if (/^deepseek-reasoner$/i.test(m)) return 'deepseek-v4-pro'
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
  if (/^gemini-/i.test(m) || /^claude-/i.test(m)) return 'sonnet'
  if (/^deepseek-/i.test(m)) return 'sonnet'
  if (isThirdPartyAnthropicBase(env.ANTHROPIC_BASE_URL)) return 'sonnet'
  return m
}

function defaultTimeoutMs(env) {
  const fromEnv = Number(process.env.WORKBENCH_CLAUDE_TIMEOUT_MS)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  const base = String(env.ANTHROPIC_BASE_URL || '')
  if (base.includes(':3456') || /gemini/i.test(String(env.ANTHROPIC_DEFAULT_SONNET_MODEL || ''))) {
    return 360_000
  }
  if (/deepseek\.com/i.test(base)) return 300_000
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
      '或在「设置 → 模型与连接」改用 Ollama 等其它供应商。ccr 重试可能需 2–3 分钟才返回此错误。' +
      (t.includes('429') ? '' : ` 详情：${t.slice(0, 180)}`)
    )
  }
  if (/fetch failed|ECONNREFUSED|ConnectionRefused|ETIMEDOUT|socket hang up|Unable to connect to API/i.test(t)) {
    if (/127\.0\.0\.1:3456|localhost:3456/.test(base)) {
      return (
        '无法连接本地 Claude Code Router（ccr :3456）。请在终端执行 `ccr start` 并保持运行；' +
        '或在模型下拉中改用其它直连供应商（无需 ccr）。' +
        ` 原始错误：${t.slice(0, 200)}`
      )
    }
    return `${who} 连接失败（${base || '默认端点'}）：${t.slice(0, 240)}`
  }
  if (/Not logged in|Please run \/login/i.test(t)) {
    return 'Claude Code 未登录。请在终端运行 claude 后执行 /login，或在「设置 → 模型与连接」配置 Gemini/Ollama 等云供应商。'
  }
  if (/退出码\s*143|exit code 143|SIGTERM/i.test(t)) {
    return '请求已取消或超时中断。若未手动停止，请检查模型连接或在「设置 → 模型与连接」更换供应商。'
  }
  if (/issue with the selected model/i.test(t)) {
    return (
      '当前模型配置不受支持。请在「设置 → 模型与连接」检查模型 ID 和 API 端点是否正确。' +
      (t.includes('deepseek-chat') ? ' （列表中的 deepseek-chat 会自动映射为 deepseek-v4-flash）' : '')
    )
  }
  return t
}

function timeoutHint(env, model, providerName = '', attachmentCount = 0) {
  const base = String(env.ANTHROPIC_BASE_URL || '')
  const who = providerName ? `供应商「${providerName}」` : '当前供应商'
  const imageNote =
    attachmentCount > 0
      ? ` 您附带了 ${attachmentCount} 张截图：部分供应商不支持直接看图，若未用本机视觉模型预解析，Claude Code 会多次 Read 读盘，易触发超时。建议减少附图、在设置中配置 Ollama 视觉模型（如 qwen2.5vl），或改用「本地 MCP」模式。`
      : ''
  if (base.includes(':3456') || /gemini/i.test(String(env.ANTHROPIC_DEFAULT_SONNET_MODEL || ''))) {
    return `${imageNote} Gemini/ccr 在配额不足(429)时会长时间重试；请检查 Google API 用量或更换供应商。`.trim()
  }
  if (/deepseek\.com/i.test(base)) {
    return (
      `${imageNote} 请在「设置 → 模型与连接」确认 ${who} 的 API 地址与模型 ID 是否正确。` +
      ' 若 API 测试正常仍超时，多为 Agent 多轮或 MCP 连接过慢；可先发一句简单消息验证，或在设置中关闭离线 MCP。'
    ).trim()
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
      return `${who} 不识别模型「${modelId}」（HTTP ${res.status}）。请在「设置 → 模型与连接」检查模型名称是否正确。`
    }
    return `${who} 拒绝请求（HTTP ${res.status}）：${detail.slice(0, 240)}`
  } catch (e) {
    if (e?.name === 'TimeoutError' || /timeout/i.test(String(e?.message || e))) {
      return `${who} 在 20s 内无响应（${base}）。请检查网络或 API 端点是否正确。`
    }
    return `${who} 连接失败（${base}）：${String(e?.message || e).slice(0, 200)}`
  }
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
  const snap = await resolveClaudePath()
  if (!snap.claudePath || snap.resolveError) {
    return {
      ok: false,
      error: snap.resolveError || '未检测到 Claude Code CLI',
      content: '',
      aborted: false,
    }
  }
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
        `${who} 的模型「${String(model || '').trim() || '默认'}」不支持图片输入（与 Cursor 相同：非视觉模型不可带图）。` +
        ' 请切换到 Claude Sonnet / Gemini 等视觉模型，或改用「本地 MCP」+ Ollama 视觉模型（如 qwen2.5vl）。',
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

  const rawModel = String(model || '').trim()
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
    hint = '未检测到 claude；请在设置中配置 /opt/homebrew/bin/claude'
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
