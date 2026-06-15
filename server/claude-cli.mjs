import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { loadChatSettings, getWorkspaceCwd, loadUiPrefs } from './store.mjs'
import { readGlobalClaudeEnv } from './paths.mjs'
import crypto from 'node:crypto'

const require = createRequire(import.meta.url)
const ccSwitch = require('./cc-switch.cjs')

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
  const m = mapApiModelId(model)
  if (!m || /^(sonnet|opus|haiku)$/i.test(m)) return env
  return {
    ...env,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: m,
    ANTHROPIC_DEFAULT_SONNET_MODEL: m,
    ANTHROPIC_DEFAULT_OPUS_MODEL: m,
  }
}

/** Claude Code / DeepSeek API 实际使用的模型 ID（deepseek-chat 在 CLI 侧已不可用） */
function mapApiModelId(model) {
  const m = String(model || '').trim()
  if (!m || /^(inherit|auto)$/i.test(m)) return m
  if (/^deepseek-chat$/i.test(m)) return 'deepseek-v4-flash'
  if (/^deepseek-reasoner$/i.test(m)) return 'deepseek-v4-pro'
  return m
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
  // ccr→Gemini 在 429/网络重试时可能 >3min；过短会误杀并只显示「生成已停止」
  if (base.includes(':3456') || /gemini/i.test(String(env.ANTHROPIC_DEFAULT_SONNET_MODEL || ''))) {
    return 360_000
  }
  return 180_000
}

function friendlyClaudeError(raw, env, providerName = '') {
  const t = String(raw || '')
  const base = String(env.ANTHROPIC_BASE_URL || '')
  const who = providerName ? `供应商「${providerName}」` : 'Provider'
  if (/429|quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(t)) {
    return (
      'Gemini API 配额/频率超限（429）。请在 Google AI Studio 检查 API Key 用量与计费；' +
      '或 CC Switch 切换到 Ollama/云梦等其它供应商。ccr 重试可能需 2–3 分钟才返回此错误。' +
      (t.includes('429') ? '' : ` 详情：${t.slice(0, 180)}`)
    )
  }
  if (/fetch failed|ECONNREFUSED|ConnectionRefused|ETIMEDOUT|socket hang up|Unable to connect to API/i.test(t)) {
    if (/127\.0\.0\.1:3456|localhost:3456/.test(base)) {
      return (
        '无法连接 Claude Code Router（ccr :3456）。请在终端执行 `ccr start` 并保持运行；' +
        '或在模型下拉中改用 DeepSeek / 云梦 等直连供应商（无需 ccr）。' +
        ` 原始错误：${t.slice(0, 200)}`
      )
    }
    return `${who} 连接失败（${base || '默认端点'}）：${t.slice(0, 240)}`
  }
  if (/Not logged in|Please run \/login/i.test(t)) {
    return 'Claude Code 未登录。请在终端运行 claude 后执行 /login，或改用 CC Switch 中的 Gemini/Ollama 供应商。'
  }
  if (/issue with the selected model/i.test(t)) {
    return (
      'Claude Code 无法使用当前模型配置。请确认 CC Switch 中 DeepSeek 地址为 https://api.deepseek.com/anthropic，' +
      '模型建议使用 deepseek-v4-flash；然后重启 npm run web:dev:full 再试。' +
      (t.includes('deepseek-chat') ? ' （deepseek-chat 需映射为 deepseek-v4-flash）' : '')
    )
  }
  return t
}

function timeoutHint(env, model, providerName = '') {
  const base = String(env.ANTHROPIC_BASE_URL || '')
  const modelId = String(model || '').trim()
  const who = providerName ? `供应商「${providerName}」` : '当前供应商'
  if (base.includes(':3456') || /gemini/i.test(String(env.ANTHROPIC_DEFAULT_SONNET_MODEL || ''))) {
    return ' Gemini/ccr 在配额不足(429)时会长时间重试；请检查 Google API 用量或更换供应商。'
  }
  if (/deepseek\.com/i.test(base) && /v4/i.test(modelId)) {
    return ` ${who} 的模型「${modelId}」可能不是 DeepSeek 官方 ID（请用 deepseek-chat），或 API Key/端点配置有误。`
  }
  return ` 请检查 CC Switch 中 ${who} 的 API 地址、Key 与模型 ID 是否匹配。`
}

/** 直连 Anthropic 兼容端点时快速探测，避免 Claude CLI 无效 Key/模型重试 180s */
async function preflightAnthropicEndpoint(env, model, providerName = '') {
  const base = ccSwitch.normalizeAnthropicBaseUrl(env.ANTHROPIC_BASE_URL || '').replace(/\/$/, '')
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
      return `${who} API Key 无效或未授权（HTTP 401）。请在 CC Switch 中更新 deepseek 供应商的 API Key。`
    }
    if (res.status === 404 || /model.*not found|unknown model|invalid model/i.test(detail)) {
      const deepseekHint = /api\.deepseek\.com/i.test(base)
        ? ' DeepSeek 请确认 API 地址为 https://api.deepseek.com/anthropic（不是根路径 /v1/messages）。'
        : ''
      return `${who} 不识别模型「${modelId}」（HTTP ${res.status}）。${deepseekHint}官方模型：deepseek-v4-flash / deepseek-v4-pro（或 deepseek-chat）；聚合站请用对应端点。`.trim()
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
  claudeSessionId,
  sessionName,
  isNewClaudeSession,
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

  const resolved = ccSwitch.resolveEnvForModel(model)
  const globalEnv = readGlobalClaudeEnv()
  const providerEnv = resolved.env || globalEnv
  const claudeEnv = ccSwitch.normalizeProviderEnv(
    syncEnvDefaultModels({ ...providerEnv }, model),
  )
  try {
    ccSwitch.writeClaudeSettingsFromEnv(claudeEnv, 'chinese')
  } catch {
    /* settings.json 写入失败时仍尝试用 env 启动 */
  }
  const env = { ...process.env, ...claudeEnv }
  const cliModel = resolveClaudeCliModel(model, env)

  const cwd = getWorkspaceCwd()
  const args = ['-p', prompt.trim(), '--permission-mode', 'auto']
  if (cliModel) args.push('--model', cliModel)
  if (process.env.WORKBENCH_CLAUDE_BARE === '1') args.push('--bare')

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

  const limit =
    typeof timeoutMs === 'number' && timeoutMs >= 0
      ? timeoutMs
      : defaultTimeoutMs(env)

  const rawModel = String(model || '').trim()
  const useExplicitModel =
    rawModel && !/^(sonnet|opus|haiku|inherit|auto)$/i.test(rawModel)
  const apiModel = useExplicitModel
    ? mapApiModelId(rawModel)
    : mapApiModelId(env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'sonnet')

  const preflightError = await preflightAnthropicEndpoint(
    env,
    apiModel,
    resolved.providerName,
  )
  if (preflightError) {
    return { ok: false, error: preflightError, content: '', aborted: false }
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
      child.stdin?.end()
    } catch (e) {
      resolve({ ok: false, error: e.message, content: '', aborted: false })
      return
    }

    const rid = requestId?.trim()
    if (rid) active.set(rid, child)

    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })

    const finish = (code, signal) => {
      if (timer) clearTimeout(timer)
      if (rid) active.delete(rid)
      const aborted = timedOut || signal === 'SIGTERM' || signal === 'SIGKILL'
      const out = stdout.trim()
      const err = stderr.trim()
      if (timedOut) {
        const hint = timeoutHint(env, cliModel || model, resolved.providerName)
        resolve({
          ok: false,
          content: out,
          error: `Claude Code 超时（${Math.round(limit / 1000)}s）。${hint}`.trim(),
          aborted: true,
        })
        return
      }
      if (aborted) {
        resolve({ ok: false, content: out, error: err || '已中止', aborted: true })
        return
      }
      if (code === 0) {
        if (!out && !err) {
          resolve({
            ok: false,
            content: '',
            error: 'Claude Code 返回空内容，请检查 CC Switch 供应商与 ccr/Ollama 是否正常。',
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
