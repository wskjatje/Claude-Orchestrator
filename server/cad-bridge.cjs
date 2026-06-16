'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFile, execFileSync } = require('node:child_process')
const { promisify } = require('node:util')

const execFileAsync = promisify(execFile)

const CAD = path.join(__dirname, 'vendor/cad')
const workspaceWrite = require('./workspace-write.cjs')
const projectPreview = require('./project-preview.cjs')
const chatImages = require('./chat-images.cjs')
const support = require('./cad-support.cjs')
const agentDailyReports = require('./agent-daily-reports.cjs')
const agentExecRegistry = require('./agent-exec-registry.cjs')
const projectLogs = require('./project-logs.cjs')
const orchestrationChains = require('./orchestration-chains.cjs')
const cloudProviders = require('./cloud-providers.cjs')
const { chainStepTimeoutMs } = require('./claude-cli.mjs')
const {
  isAutoModelSelection,
  loadChatModelPools,
  resolveExecutionModel,
} = require('./resolve-execution-model.mjs')

const { applyWorkspaceWriteFenceItems, ingestTextAndApplyWorkspaceWrite, bulkIngestAssistantTexts, collapseWrittenSummary, extractInvolvedSectionPaths } = workspaceWrite
const { expandChainStepInstructionWithWorkspaceReads } = require('./chain-step-read-inject.cjs')
const { buildCrossAgentContextMarkdown } = require(path.join(CAD, 'memory-cross-agent.js'))
const { runLocalMcpOrchestration } = require(path.join(CAD, 'local-mcp-orchestrator.js'))
const {
  parseDelegationEnvelope,
  normalizeDelegationSteps,
  buildExecutableDelegationInstruction,
  buildTaskChainExecutableInstruction,
  appendStepSkillFilesToInstruction,
  appendStepMcpsToInstruction,
  appendStepChainMetaToInstruction,
  buildAgentRoutedInstruction,
} = require(path.join(CAD, 'multi-agent-runtime.js'))

/** @type {Record<string, unknown>} */
let deps = {}

/** @type {Map<string, { cancelled: boolean }>} */
const activeLocalOrchestrationRequests = new Map()

/** 服务端任务链执行状态（与浏览器路由/HMR 解耦） */
const chainRunState = {
  running: false,
  stopRequested: false,
  activeRequestId: null,
  pinnedSessionId: null,
  lastError: null,
}

function emitChainRunStatus() {
  broadcast('orchestration:chain-status', {
    running: chainRunState.running,
    stopRequested: chainRunState.stopRequested,
    pinnedSessionId: chainRunState.pinnedSessionId,
    lastError: chainRunState.lastError,
  })
}

function loadChatSessionsDisk() {
  if (typeof deps.loadChatSessions === 'function') return deps.loadChatSessions()
  return { activeId: 's0', sessions: [] }
}

function countUserMessages(hist) {
  return (Array.isArray(hist) ? hist : []).filter((m) => m?.role === 'user').length
}

function lastUserMessageTs(hist) {
  const h = Array.isArray(hist) ? hist : []
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i]?.role === 'user') return h[i].ts ?? 0
  }
  return 0
}

/** 落盘前合并，避免链式写入覆盖 UI 刚保存的用户消息 */
function mergeSessionsPreferLongerHistory(local, disk) {
  const localById = new Map((Array.isArray(local) ? local : []).map((s) => [s.id, s]))
  const merged = []
  for (const d of Array.isArray(disk) ? disk : []) {
    const l = localById.get(d.id)
    if (!l) {
      merged.push(d)
      continue
    }
    const lHist = Array.isArray(l.history) ? l.history : []
    const dHist = Array.isArray(d.history) ? d.history : []
    const keepLocal =
      lHist.length > dHist.length ||
      countUserMessages(lHist) > countUserMessages(dHist) ||
      (lHist.length === dHist.length && lastUserMessageTs(lHist) >= lastUserMessageTs(dHist))
    merged.push(
      keepLocal
        ? { ...d, ...l, title: d.title || l.title, history: lHist }
        : { ...l, ...d, modelId: d.modelId || l.modelId, history: dHist },
    )
    localById.delete(d.id)
  }
  for (const l of localById.values()) merged.push(l)
  return merged
}

function saveChatSessionsDisk(activeId, sessions) {
  if (typeof deps.saveChatSessions === 'function') {
    const disk = loadChatSessionsDisk()
    const diskSessions = Array.isArray(disk?.sessions) ? disk.sessions : []
    const incoming = Array.isArray(sessions) ? sessions : []
    const mergedSessions = mergeSessionsPreferLongerHistory(incoming, diskSessions)
    const activeByWorkspace =
      disk?.activeByWorkspace && typeof disk.activeByWorkspace === 'object'
        ? { ...disk.activeByWorkspace }
        : {}
    activeByWorkspace[''] = activeId
    const pinned = mergedSessions.find((s) => s.id === activeId) ?? incoming.find((s) => s.id === activeId)
    const wsPath = typeof pinned?.workspacePath === 'string' ? pinned.workspacePath.trim() : ''
    if (wsPath) activeByWorkspace[wsPath] = activeId
    return deps.saveChatSessions({
      activeId,
      activeByWorkspace,
      sessions: mergedSessions,
      composerDrafts: disk?.composerDrafts,
    })
  }
  return { ok: false, error: 'saveChatSessions 不可用' }
}

function loadOrchestrationState() {
  try {
    const { primary, legacy } = orchestrationFile()
    if (!primary) return { ok: false, error: '无任务链路径', state: null }
    if (!fs.existsSync(primary)) {
      if (legacy && fs.existsSync(legacy)) {
        fs.mkdirSync(path.dirname(primary), { recursive: true })
        fs.copyFileSync(legacy, primary)
      } else {
        return { ok: false, error: '无活跃任务链', state: null }
      }
    }
    const state = JSON.parse(fs.readFileSync(primary, 'utf8'))
    return { ok: true, state, error: null }
  } catch (e) {
    return { ok: false, error: e?.message || String(e), state: null }
  }
}

function advanceOrchestrationState() {
  try {
    const { primary } = orchestrationFile()
    if (!primary || !fs.existsSync(primary)) return { ok: false, error: '无活跃任务链', state: null }
    const state = JSON.parse(fs.readFileSync(primary, 'utf8'))
    if (!Array.isArray(state.steps)) return { ok: false, error: '链格式无效', state: null }
    state.currentIndex = (state.currentIndex ?? 0) + 1
    if (state.currentIndex >= state.steps.length) state.status = 'completed'
    orchestrationChains.syncOrchestrationChainState(state)
    return { ok: true, state: JSON.parse(fs.readFileSync(primary, 'utf8')), error: null }
  } catch (e) {
    return { ok: false, error: e?.message || String(e), state: null }
  }
}

function newRequestId() {
  return `chain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function runClaudeChainStep(agentName, taskId, instruction, modelId, requestId) {
  const settings = loadChatSettings()
  const userLine = `【任务链 Agent 路由】global://${agentName}（任务 ${taskId || '—'}）\n${instruction}${CHAIN_REPLY_HINT}`
  const resolved = cloudProviders.resolveEnvForModel(modelId?.trim() || settings.model?.trim())
  const timeoutMs = chainStepTimeoutMs(resolved.env || {})
  const r = await deps.runClaudeCodePrint({
    prompt: userLine,
    model: modelId?.trim() || settings.model?.trim() || undefined,
    requestId,
    timeoutMs,
  })
  const out = (r.content || '').trim()
  if (!r.ok) {
    return { ok: false, error: r.error || out || 'Claude Code CLI 执行失败', output: out }
  }
  const workspaceDir = loadWorkspace()
  let output = out
  if (workspaceDir) {
    const wr = ingestTextAndApplyWorkspaceWrite(out, workspaceDir, {
      agentName,
      taskId,
      ensureChainArtifact: true,
    })
    if (wr.displayText) output = wr.displayText
    else output = support.stripLargeAssistantArtifactsMain(out)
  } else {
    output = support.stripLargeAssistantArtifactsMain(out)
  }
  return { ok: true, output, error: null }
}

async function runLocalChainStep({ priorMessages, userLine, modelId, requestId, agentName, allowedMcpServers }) {
  return runLocalOrch({
    priorMessages,
    userLine,
    orchestratorModel: modelId,
    requestId,
    agentBasenameOverride: agentName ? `${agentName}.md` : undefined,
    allowedMcpServers,
  })
}

async function orchestrationChainLoop() {
  chainRunState.running = true
  chainRunState.stopRequested = false
  chainRunState.lastError = null
  emitChainRunStatus()

  try {
    const disk0 = loadChatSessionsDisk()
    if (!chainRunState.pinnedSessionId) {
      chainRunState.pinnedSessionId = disk0.activeId || disk0.sessions?.[0]?.id || 's0'
    }
    const settings = loadChatSettings()
    const mode = settings.orchestrationMode === 'local-mcp' ? 'local-mcp' : 'claude-code'
    const modelPools = await loadChatModelPools(settings)

    while (!chainRunState.stopRequested) {
      const pinnedId = chainRunState.pinnedSessionId
      const disk = loadChatSessionsDisk()
      const sessions = Array.isArray(disk.sessions) ? [...disk.sessions] : []
      const sess = sessions.find((s) => s.id === pinnedId)
      if (!sess) {
        chainRunState.lastError = '绑定的会话不存在，任务链已暂停'
        appendAppLog(`[chain-run] ${chainRunState.lastError}`)
        break
      }

      let hist = Array.isArray(sess.history) ? [...sess.history] : []

      const loaded = loadOrchestrationState()
      if (!loaded.ok || !loaded.state?.steps?.length) {
        chainRunState.lastError = loaded.error || '无可用任务链'
        appendAppLog(`[chain-run] ${chainRunState.lastError}`)
        break
      }

      const state = loaded.state
      const steps = state.steps ?? []
      const idx = state.currentIndex ?? 0

      if (idx >= steps.length) {
        appendAppLog('[chain-run] 任务链已全部执行完毕')
        break
      }

      const step = steps[idx] || {}
      const agentName = String(step.agentName ?? '').trim()
      const taskId = String(step.taskId ?? '').trim()
      const instruction = String(step.instruction ?? '').trim()

      if (!agentName || !instruction) {
        chainRunState.lastError = `链中第 ${idx + 1} 步缺少 agentName 或 instruction`
        appendAppLog(`[chain-run] ${chainRunState.lastError}`)
        break
      }

      const rawModelId =
        sess.modelId?.trim() || settings.model?.trim() || settings.localOllamaModel?.trim() || ''
      const resolvedModel = await resolveChainStepModel({
        settings,
        sessionModelId: rawModelId,
        agentName,
        pools: modelPools,
      })
      if (!resolvedModel.ok) {
        chainRunState.lastError = resolvedModel.error || '无法解析执行模型'
        appendAppLog(`[chain-run] ${chainRunState.lastError}`)
        hist = [
          ...hist,
          {
            role: 'assistant',
            content:
              `任务链在第 ${idx + 1}/${steps.length} 步无法启动（流程未完成，已暂停）：${chainRunState.lastError}\n` +
              `请在「设置 → 模型与连接」添加模型，或将会话模型从 Auto 改为具体模型后点击「继续执行」。`,
            ts: Date.now(),
            requestError: true,
          },
        ]
        const nextSessions = sessions.map((s) => (s.id === pinnedId ? { ...s, history: hist } : s))
        saveChatSessionsDisk(pinnedId, nextSessions)
        break
      }
      const execModelId = resolvedModel.modelId

      const workspaceDir = loadWorkspace()
      let instructionWithMeta = appendStepChainMetaToInstruction(instruction, step)
      if (workspaceDir) {
        instructionWithMeta = expandChainStepInstructionWithWorkspaceReads(
          instructionWithMeta,
          agentName,
          workspaceDir,
          { taskId },
        )
      }
      const execInstruction = buildTaskChainExecutableInstruction(agentName, taskId, instructionWithMeta)
      const routedExecInstruction = buildAgentRoutedInstruction(agentName, execInstruction, mode)
      const stepMarker = `【任务链】第 ${idx + 1}/${steps.length} 步 · ${agentName}`
      const lastMsg = hist.length ? hist[hist.length - 1] : null
      const alreadyAnnounced =
        lastMsg?.role === 'user' && String(lastMsg.content || '').includes(stepMarker)

      if (!alreadyAnnounced) {
        const stepOneLine = instruction.replace(/\s+/g, ' ').trim().slice(0, 160)
        hist = [
          ...hist,
          {
            role: 'user',
            content: `${stepMarker} · ${taskId || '—'}${
              stepOneLine
                ? `\n${stepOneLine}${instruction.trim().length > 160 ? '…' : ''}`
                : ''
            }`,
            ts: Date.now(),
          },
        ]
        const nextSessions = sessions.map((s) => (s.id === pinnedId ? { ...s, history: hist } : s))
        saveChatSessionsDisk(pinnedId, nextSessions)
      }

      if (chainRunState.stopRequested) break

      const agentStem = agentStemFromName(agentName)
      appendMemoryEventRow({
        type: 'agent_exec',
        agent: agentStem,
        phase: 'start',
        source: 'chain_step',
        taskId,
        instruction_preview: instruction.slice(0, 240),
      })

      const chainStarted = Date.now()
      let res

      if (mode === 'claude-code') {
        const reqId = newRequestId()
        chainRunState.activeRequestId = reqId
        res = await runClaudeChainStep(agentName, taskId, routedExecInstruction, execModelId, reqId)
        chainRunState.activeRequestId = null
      } else {
        const reqId = newRequestId()
        chainRunState.activeRequestId = reqId
        const priorForApi = hist.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || ''),
        }))
        res = await runLocalChainStep({
          priorMessages: priorForApi,
          userLine: routedExecInstruction,
          modelId: execModelId,
          requestId: reqId,
          agentName,
          allowedMcpServers: Array.isArray(step.mcps)
            ? step.mcps.map((x) => String(x ?? '').trim()).filter(Boolean)
            : undefined,
        })
        chainRunState.activeRequestId = null
      }

      if (chainRunState.stopRequested || res?.aborted) {
        appendMemoryEventRow({
          type: 'agent_exec',
          agent: agentStem,
          phase: 'end',
          source: 'chain_step',
          taskId,
          aborted: true,
        })
        break
      }

      if (!res?.ok) {
        const failedStep = `${idx + 1}/${steps.length}`
        hist = [
          ...hist,
          {
            role: 'assistant',
            content:
              `任务链在第 ${failedStep} 步执行失败（流程未完成，已暂停）：${res.error || '未知错误'}\n` +
              `可修复后点击「继续执行」，将从当前退出点继续。`,
            ts: Date.now(),
            requestError: true,
          },
        ]
        const nextSessions = sessions.map((s) => (s.id === pinnedId ? { ...s, history: hist } : s))
        saveChatSessionsDisk(pinnedId, nextSessions)
        chainRunState.lastError = res.error || '步骤执行失败'
        appendAppLog(`[chain-run] step ${failedStep} failed: ${chainRunState.lastError}`)
        appendMemoryEventRow({
          type: 'agent_exec',
          agent: agentStem,
          phase: 'end',
          source: 'chain_step',
          taskId,
          error: chainRunState.lastError,
        })
        break
      }

      let reply =
        mode === 'claude-code'
          ? String(res.output || '')
          : String(res.content || '')

      if (workspaceDir) {
        const wr = ingestTextAndApplyWorkspaceWrite(reply, workspaceDir, {
          agentName,
          taskId,
          ensureChainArtifact: true,
        })
        const mergedWritten = [
          ...new Set([
            ...(Array.isArray(res.toolWrittenPaths) ? res.toolWrittenPaths : []),
            ...(Array.isArray(wr.written) ? wr.written : []),
          ]),
        ]
        if (mergedWritten.length) {
          appendAppLog(`[chain-run] wrote ${mergedWritten.join(', ')}`)
        }
        if (wr.displayText) {
          reply = wr.displayText
        } else if (mergedWritten.length) {
          reply = collapseWrittenSummary(reply, mergedWritten, {
            claimedPaths: extractInvolvedSectionPaths(reply),
          })
        } else {
          reply = support.stripLargeAssistantArtifactsMain(reply)
        }
      } else {
        reply = support.stripLargeAssistantArtifactsMain(reply)
      }
      hist = [
        ...hist,
        {
          role: 'assistant',
          content: reply,
          ts: Date.now(),
          latencyMs: Math.max(0, Date.now() - chainStarted),
        },
      ]
      const nextSessions2 = sessions.map((s) => (s.id === pinnedId ? { ...s, history: hist } : s))
      saveChatSessionsDisk(pinnedId, nextSessions2)

      appendMemoryEventRow({
        type: 'agent_exec',
        agent: agentStem,
        phase: 'end',
        source: 'chain_step',
        taskId,
        latencyMs: Math.max(0, Date.now() - chainStarted),
      })

      if (chainRunState.stopRequested) break

      const adv = advanceOrchestrationState()
      if (!adv.ok) {
        hist = [
          ...hist,
          {
            role: 'assistant',
            content:
              `任务链推进失败（流程未完成，已暂停）：${adv.error || '无法推进任务链'}\n` +
              `可修复后点击「继续执行」，将从当前退出点继续。`,
            ts: Date.now(),
            requestError: true,
          },
        ]
        const nextSessions3 = sessions.map((s) => (s.id === pinnedId ? { ...s, history: hist } : s))
        saveChatSessionsDisk(pinnedId, nextSessions3)
        chainRunState.lastError = adv.error || '推进失败'
        break
      }

      const st = adv.state
      const chainDone =
        st && Array.isArray(st.steps) && (st.currentIndex ?? 0) >= (st.steps?.length ?? 0)
      if (chainDone) {
        appendAppLog('[chain-run] completed')
        break
      }
    }
  } catch (e) {
    chainRunState.lastError = e?.message || String(e)
    appendAppLog(`[chain-run] exception: ${chainRunState.lastError}`)
    try {
      const pinnedId = chainRunState.pinnedSessionId
      const disk = loadChatSessionsDisk()
      const sessions = Array.isArray(disk.sessions) ? [...disk.sessions] : []
      const sess = sessions.find((s) => s.id === pinnedId)
      if (sess) {
        const hist = [
          ...(Array.isArray(sess.history) ? sess.history : []),
          {
            role: 'assistant',
            content:
              `任务链执行异常（流程未完成，已暂停）：${chainRunState.lastError || '未知异常'}\n` +
              `可修复后点击「继续执行」，将从当前退出点继续。`,
            ts: Date.now(),
            requestError: true,
          },
        ]
        const nextSessions = sessions.map((s) => (s.id === pinnedId ? { ...s, history: hist } : s))
        saveChatSessionsDisk(pinnedId, nextSessions)
      }
    } catch {
      /* ignore */
    }
  } finally {
    chainRunState.running = false
    chainRunState.stopRequested = false
    chainRunState.activeRequestId = null
    emitChainRunStatus()
  }
}

const CHAIN_REPLY_HINT =
  '\n\n【任务链·可见回复】面向对话窗口的输出须为简体中文短要点（代码/路径/API 名除外）；' +
  '禁止英文 Implementation Plan / Execution 等长篇计划标题；' +
  '写盘完成后勿在正文整段粘贴 ```json``` 形式的 workspace-write 工具负载（界面会折叠大段 JSON）。'

function init(dependencies) {
  deps = dependencies
}

function loadWorkspace() {
  return typeof deps.loadWorkspace === 'function' ? deps.loadWorkspace() : null
}

function loadChatSettings() {
  return typeof deps.loadChatSettings === 'function' ? deps.loadChatSettings() : {}
}

async function resolveChainStepModel({ settings, sessionModelId, agentName, pools }) {
  return resolveExecutionModel({
    settings,
    sessionModelId,
    agentBasename: agentName ? `${agentName}.md` : undefined,
    pools,
    readAgentMarkdown: (basename) => support.readClaudeAgentMarkdownContent(basename),
  })
}

function broadcast(channel, detail) {
  if (typeof deps.broadcast === 'function') deps.broadcast(channel, detail)
}

function appendAppLog(message) {
  try {
    const p = deps.appLogFilePath?.()
    const line = `[${new Date().toISOString()}] ${String(message).replace(/\r?\n/g, ' ')}`
    if (p) {
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.appendFileSync(p, `${line}\n`, 'utf8')
    }
    projectLogs.appendLogEntry({ ts: new Date().toISOString(), message: String(message), source: 'app' })
  } catch {
    /* ignore */
  }
}

const { normalizeAgentStem: normalizeAgentStemForExec } = require('./agent-artifact-paths.cjs')

function agentStemFromName(name) {
  const stem = normalizeAgentStemForExec(name)
  if (stem) return stem
  return String(name || '').trim().replace(/\.md$/i, '')
}

function appendMemoryEventRow(obj) {
  const row = { ts: new Date().toISOString(), ...obj, hook: obj.hook ?? 'web-bridge' }
  const dir = path.join(os.homedir(), '.claude', 'memory')
  fs.mkdirSync(dir, { recursive: true })
  fs.appendFileSync(path.join(dir, 'events.jsonl'), `${JSON.stringify(row)}\n`, 'utf8')
  try {
    agentDailyReports.appendAgentDailyActivity(deps.dailyReportsDir?.(), row)
  } catch {
    /* ignore */
  }
  try {
    const reg = agentExecRegistry.recordAgentExec(row)
    if (reg) {
      broadcast('agent-exec:changed', { date: reg.date, stem: reg.entry?.stem, status: reg.entry?.status })
    }
  } catch {
    /* ignore */
  }
  try {
    const preview = String(row.instruction_preview || row.instruction || '').slice(0, 200)
    projectLogs.appendLogEntry({
      ts: row.ts,
      level: 'INFO',
      source: 'event',
      message: `${row.type || row.event || 'event'} · ${row.agent || '?'} · ${preview || row.phase || ''}`.trim(),
      meta: row,
    })
  } catch {
    /* ignore */
  }
  return row
}

function loadScheduledTasks() {
  let list = []
  if (typeof deps.loadScheduledTasks === 'function') {
    list = deps.loadScheduledTasks()
  } else {
    try {
      const p = deps.scheduledTasksPath?.()
      if (p && fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'))
        list = Array.isArray(data.tasks) ? data.tasks : Array.isArray(data) ? data : []
      }
    } catch {
      list = []
    }
  }
  return list.map(support.sanitizeScheduledTask).filter(Boolean)
}

function saveScheduledTasksFile(tasks) {
  if (typeof deps.saveScheduledTasks === 'function') {
    deps.saveScheduledTasks(tasks)
    return
  }
  const p = deps.scheduledTasksPath?.()
  if (!p) return
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify({ version: 1, tasks }, null, 2), 'utf8')
}

async function executeScheduledTask(task) {
  if (!task || typeof task !== 'object') return { ok: false, error: '任务不存在' }
  const body =
    (typeof task.payload === 'string' && task.payload.trim()) ||
    (typeof task.name === 'string' && task.name.trim()) ||
    '定时任务'
  if (task.action === 'toast') {
    broadcast('scheduler:toast', { title: task.name || '定时任务', body })
    return { ok: true }
  }
  if (task.action === 'log') {
    appendAppLog(`TASK ${task.name}: ${body}`)
    return { ok: true }
  }
  if (task.action === 'reportAppend') {
    const settings = loadChatSettings()
    const model = settings.model?.trim()
    if (!model) return { ok: false, error: '未配置 Claude Code 模型' }
    const workspaceDir = loadWorkspace()
    const snap = support.gatherWorkspaceExecutionSnapshot(workspaceDir)
    const prompt = [
      '你是项目经理，撰写简短项目进度闪报（简体中文，禁止 Markdown 标题符号）。',
      `【任务说明】${body}`,
      '【工作区快照】',
      snap,
    ].join('\n\n')
    const r = await deps.runClaudeCodePrint({ prompt, model, timeoutMs: 0 })
    if (!r.ok) return { ok: false, error: r.error || 'Claude 执行失败' }
    const dir = deps.dailyReportsDir?.()
    if (dir) {
      fs.mkdirSync(dir, { recursive: true })
      const fp = path.join(dir, `${support.formatLocalYYYYMMDD()}-mcp-agent.md`)
      fs.appendFileSync(fp, `\n\n---\n\n${r.content || ''}\n`, 'utf8')
    }
    return { ok: true }
  }
  return { ok: false, error: `未知 action: ${task.action}` }
}

function persistScheduledTaskRun(taskId, result, ranAt) {
  if (typeof deps.loadScheduledTasks !== 'function' || typeof deps.saveScheduledTasks !== 'function') {
    return
  }
  const list = loadScheduledTasks()
  const next = list.map((t) => {
    if (t.id !== taskId) return t
    return {
      ...t,
      lastRunAt: ranAt,
      lastRunError: result.ok ? '' : String(result.error || '执行失败').slice(0, 500),
    }
  })
  saveScheduledTasksFile(next)
  broadcast('scheduled-tasks:changed', { tasks: next })
}

async function runScheduledTaskWithMeta(task, source) {
  if (!task) return { ok: false, error: '任务不存在' }
  appendAppLog(`INFO scheduler ${source} name="${task.name}" id=${task.id}`)
  const ranAt = Date.now()
  try {
    const result = await executeScheduledTask(task)
    persistScheduledTaskRun(task.id, result, ranAt)
    if (!result.ok) {
      appendAppLog(`WARN scheduler task failed id=${task.id} ${result.error || ''}`)
    }
    return result
  } catch (e) {
    const msg = e?.message || String(e)
    persistScheduledTaskRun(task.id, { ok: false, error: msg }, ranAt)
    appendAppLog(`ERROR scheduler task id=${task.id} ${msg}`)
    return { ok: false, error: msg }
  }
}

function orchestrationFile() {
  const { primary, legacy } = deps.orchestrationChainPath?.() || {}
  return { primary, legacy }
}

function applyWritesInWorkspace(items) {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区', written: [], errors: ['未选择工作区'] }
  }
  return applyWorkspaceWriteFenceItems(workspaceDir, items)
}

function createTrackingWorkspaceWriter(sessionWritten) {
  return (items) => {
    const r = applyWritesInWorkspace(items)
    if (Array.isArray(r?.written)) {
      for (const p of r.written) {
        if (p && !sessionWritten.includes(p)) sessionWritten.push(p)
      }
    }
    return r
  }
}

async function runLocalOrch(payload) {
  const settings = loadChatSettings()
  const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : ''
  const state = { cancelled: false }
  if (requestId) activeLocalOrchestrationRequests.set(requestId, state)

  const prior = Array.isArray(payload?.priorMessages) ? payload.priorMessages : []
  const userLineRaw = typeof payload?.userLine === 'string' ? payload.userLine : ''
  const userAttachments = Array.isArray(payload?.userAttachments) ? payload.userAttachments : []
  let orchestratorModel =
    typeof payload?.orchestratorModel === 'string' ? payload.orchestratorModel.trim() : ''
  const overrideRaw =
    typeof payload?.agentBasenameOverride === 'string' ? payload.agentBasenameOverride.trim() : ''
  const agentBasenameForRead = overrideRaw || settings.localAgentBasename || ''
  if (isAutoModelSelection(orchestratorModel)) {
    const pools = await loadChatModelPools(settings)
    const resolved = await resolveExecutionModel({
      settings,
      sessionModelId: orchestratorModel || settings.model,
      agentBasename: agentBasenameForRead || undefined,
      pools,
      readAgentMarkdown: (basename) => support.readClaudeAgentMarkdownContent(basename),
    })
    if (!resolved.ok) {
      return { ok: false, content: '', error: resolved.error, aborted: false, toolWrittenPaths: [] }
    }
    orchestratorModel = resolved.modelId
  }
  const agentMarkdown = support.readClaudeAgentMarkdownContent(agentBasenameForRead)
  const lockedAgentStem = support.stemFromAgentBasenameForOrchestration(agentBasenameForRead)
  const allowedMcpServers = Array.isArray(payload?.allowedMcpServers)
    ? payload.allowedMcpServers.map((x) => String(x ?? '').trim()).filter(Boolean)
    : undefined
  const toolWritten = []

  const enriched = await chatImages.enrichUserLineForImages({
    ollamaBase: settings.ollamaBase,
    orchestratorModel,
    visionModelHint: settings.localOllamaModel || '',
    userLine: userLineRaw,
    attachments: userAttachments,
  })
  const userLine = enriched.userLine

  try {
    const r = await runLocalMcpOrchestration({
      bundledMcpServerJs: support.bundledOllamaMcpServerPath(),
      workspaceRoot: loadWorkspace() || undefined,
      ollamaBase: settings.ollamaBase,
      mcpConfigAbsolutePath: settings.mcpConfigAbsolutePath || '',
      orchestratorModel,
      priorMessages: prior
        .filter((x) => x && (x.role === 'user' || x.role === 'assistant'))
        .map((x) => ({
          role: x.role,
          content: typeof x.content === 'string' ? x.content : '',
          attachments: Array.isArray(x.attachments) ? x.attachments : undefined,
        })),
      userLine,
      userImages: enriched.images,
      agentMarkdown,
      lockedAgentStem,
      allowedMcpServers,
      crossAgentContext: buildCrossAgentContextMarkdown(),
      defaultOllamaModelHint: settings.localOllamaModel || '',
      devMcpOrchDebug: Boolean(settings.devMcpOrchDebug),
      shouldAbort: () => state.cancelled,
      applyWorkspaceWriteItems: createTrackingWorkspaceWriter(toolWritten),
    })
    return {
      ok: r.ok,
      content: r.content ?? '',
      error: r.error ?? null,
      aborted: Boolean(r.aborted),
      orchestrationHints: Array.isArray(r.orchestrationHints) ? r.orchestrationHints : undefined,
      toolWrittenPaths: toolWritten,
    }
  } finally {
    if (requestId) activeLocalOrchestrationRequests.delete(requestId)
  }
}

async function getClaudeCliVersionSnapshot() {
  const cli =
    loadChatSettings().claudeCliPath?.trim() || process.env.WORKBENCH_CLAUDE_CLI || '/opt/homebrew/bin/claude'
  try {
    const { stdout } = await execFileAsync(cli, ['--version'], { timeout: 15_000 })
    return { ok: true, versionLine: String(stdout || '').trim() }
  } catch (e) {
    return { ok: false, versionLine: '', error: e?.message || String(e) }
  }
}

function createHandlers() {
  return {
    'workspace:applyWriteFence': async (args) => {
      const items = Array.isArray(args?.[0]) ? args[0] : []
      const workspaceDir = loadWorkspace()
      if (!workspaceDir) return { ok: false, error: '未选择工作区', written: [] }
      return applyWorkspaceWriteFenceItems(workspaceDir, items)
    },

    'workspace:ingestFromAssistantText': async (args) => {
      const payload = args?.[0] || {}
      const text = typeof payload.text === 'string' ? payload.text : ''
      const workspaceDir = loadWorkspace()
      if (!workspaceDir) return { ok: false, error: '未选择工作区', written: [] }
      return ingestTextAndApplyWorkspaceWrite(text, workspaceDir, {
        agentName: payload.agentName,
        taskId: payload.taskId,
        ensureChainArtifact: Boolean(payload.ensureChainArtifact),
        ensureAgentArtifact: Boolean(payload.ensureAgentArtifact),
        autoWriteProject: payload.autoWriteProject,
        manualConfirmOnly: payload.manualConfirmOnly,
      })
    },

    'workspace:bulkIngestFromHistory': async (args) => {
      const payload = args?.[0] || {}
      const texts = Array.isArray(payload.texts) ? payload.texts : []
      const workspaceDir = loadWorkspace()
      if (!workspaceDir) return { ok: false, error: '未选择工作区', written: [] }
      return bulkIngestAssistantTexts(texts, workspaceDir, {
        agentName: payload.agentName,
      })
    },

    'chat:saveImageAttachments': async (args) => {
      const attachments = Array.isArray(args?.[0]) ? args[0] : []
      const workspaceDir = loadWorkspace()
      if (!workspaceDir) return { ok: false, error: '未选择工作区', paths: [] }
      return chatImages.saveChatImageAttachments(workspaceDir, attachments)
    },

    'workspace:detectRunPlan': async (args) => {
      const payload = args?.[0] || {}
      const workspaceDir = loadWorkspace()
      if (!workspaceDir) return { ok: false, error: '未选择工作区' }
      return projectPreview.detectProjectRunPlan(workspaceDir, {
        hint: payload.hint,
        userLine: payload.userLine || payload.hint,
        preferStatic: Boolean(payload.preferStatic),
        preferPython: Boolean(payload.preferPython),
      })
    },

    'workspace:startPreview': async (args) => {
      const payload = args?.[0] || {}
      const workspaceDir = loadWorkspace()
      if (!workspaceDir) return { ok: false, error: '未选择工作区' }
      const r = await projectPreview.startProjectPreview(workspaceDir, {
        hint: payload.hint,
        preferStatic: Boolean(payload.preferStatic),
        preferPython: Boolean(payload.preferPython),
        entryRel: typeof payload.entryRel === 'string' ? payload.entryRel : undefined,
      })
      if (r.ok && r.url) {
        broadcast('workspace:preview-changed', { running: true, url: r.url, kind: r.kind })
      }
      return r
    },

    'workspace:stopPreview': async () => {
      await projectPreview.stopPreview()
      broadcast('workspace:preview-changed', { running: false, url: null })
      return { ok: true }
    },

    'workspace:getPreviewStatus': async () => projectPreview.getProjectPreviewStatus(),

    'workspace:getExecutionSnapshot': async () => {
      const workspaceDir = loadWorkspace()
      const text = support.gatherWorkspaceExecutionSnapshot(workspaceDir)
      return { ok: true, text }
    },

    'workspace:listMarkdownFiles': async () => {
      return support.listWorkspaceMarkdownFiles(loadWorkspace())
    },

    'local-orchestration:prompt': async (args) => runLocalOrch(args?.[0]),

    'local-orchestration:abort': async (args) => {
      const id = typeof args?.[0] === 'string' ? args[0].trim() : ''
      const st = id ? activeLocalOrchestrationRequests.get(id) : null
      if (st) st.cancelled = true
      return { ok: Boolean(st) }
    },

    'claude-code:runChainStep': async (args) => {
      const payload = args?.[0] || {}
      const step = payload?.step && typeof payload.step === 'object' ? payload.step : {}
      const agentName = String(step.agentName ?? '').trim()
      const taskId = String(step.taskId ?? '').trim()
      const instruction = String(step.instruction ?? '').trim()
      if (!agentName || !instruction) {
        return { ok: false, error: '缺少 agentName 或 instruction', output: '' }
      }
      const settings = loadChatSettings()
      const userLine = `【任务链 Agent 路由】global://${agentName}（任务 ${taskId || '—'}）\n${instruction}${CHAIN_REPLY_HINT}`
      const r = await deps.runClaudeCodePrint({
        prompt: userLine,
        model: settings.model?.trim() || undefined,
        requestId: undefined,
        timeoutMs: 0,
      })
      const out = (r.content || '').trim()
      if (!r.ok) {
        return { ok: false, error: r.error || out || 'Claude Code CLI 执行失败', output: out }
      }
      const cleaned = support.stripLargeAssistantArtifactsMain(out)
      const workspaceDir = loadWorkspace()
      let written = []
      let output = cleaned
      if (workspaceDir) {
        const wr = ingestTextAndApplyWorkspaceWrite(cleaned, workspaceDir, {
          agentName,
          taskId,
          ensureChainArtifact: true,
        })
        written = Array.isArray(wr.written) ? wr.written : []
        if (wr.displayText) output = wr.displayText
      }
      return { ok: true, output, error: null, writtenPaths: written }
    },

    'claude-code:cliUpdate': async () => {
      const before = await getClaudeCliVersionSnapshot()
      const cmd = 'npm install -g @anthropic-ai/claude-code@latest'
      let result = { ok: false, stdout: '', stderr: '' }
      try {
        const { stdout, stderr } = await execFileAsync('npm', ['install', '-g', '@anthropic-ai/claude-code@latest'], {
          timeout: 300_000,
          maxBuffer: 4 * 1024 * 1024,
        })
        result = { ok: true, stdout: String(stdout || ''), stderr: String(stderr || '') }
      } catch (e) {
        result = {
          ok: false,
          stdout: String(e.stdout || ''),
          stderr: String(e.stderr || e.message || ''),
        }
      }
      const after = await getClaudeCliVersionSnapshot()
      const combined = [result.stderr, result.stdout].filter(Boolean).join('\n').trim()
      const combinedLower = combined.toLowerCase()
      const npmSaysUpToDate = /\bup to date\b/.test(combinedLower)
      const vB = (before.versionLine || '').trim()
      const vA = (after.versionLine || '').trim()
      const versionChanged = vB !== vA
      const firstInstall = !vB && vA
      const actuallyUpdated = Boolean(result.ok) && !npmSaysUpToDate && (versionChanged || firstInstall)
      return {
        ok: result.ok,
        actuallyUpdated,
        command: cmd,
        method: 'npm',
        versionBefore: vB,
        versionAfter: vA,
        stdout: result.stdout,
        stderr: result.stderr,
        combined,
      }
    },

    'multi-agent:executeDelegation': async (args) => {
      const payload = args?.[0] || {}
      const settings = loadChatSettings()
      const mode = settings.orchestrationMode === 'local-mcp' ? 'local-mcp' : 'claude-code'
      const rawOrchestratorModel =
        typeof payload?.orchestratorModel === 'string' && payload.orchestratorModel.trim()
          ? payload.orchestratorModel.trim()
          : settings.model?.trim() || ''
      const modelPools = await loadChatModelPools(settings)
      const resolvedOrchestrator = await resolveExecutionModel({
        settings,
        sessionModelId: rawOrchestratorModel,
        pools: modelPools,
        readAgentMarkdown: (basename) => support.readClaudeAgentMarkdownContent(basename),
      })
      if (!resolvedOrchestrator.ok) {
        return {
          ok: false,
          error: resolvedOrchestrator.error || '无法解析执行模型',
          stepResults: [],
          synthesis: null,
        }
      }
      const orchestratorModel = resolvedOrchestrator.modelId

      const rawText = typeof payload?.rawText === 'string' ? payload.rawText : ''
      let parsedObj =
        payload?.delegation && typeof payload.delegation === 'object' ? payload.delegation : null

      if (!parsedObj && rawText) {
        const pr = parseDelegationEnvelope(rawText)
        if (!pr.ok) {
          return { ok: false, error: pr.error || '无法解析委派 JSON', stepResults: [], synthesis: null }
        }
        parsedObj = pr.obj
      }
      if (!parsedObj) {
        return {
          ok: false,
          error: '缺少 delegation 对象或 rawText',
          stepResults: [],
          synthesis: null,
        }
      }

      const normalized = normalizeDelegationSteps(parsedObj)
      if (!normalized.steps.length) {
        return {
          ok: false,
          error: 'delegate_to / steps 为空',
          stepResults: [],
          synthesis: null,
        }
      }

      /** @type {{ agentName: string, taskId: string, ok: boolean, output: string, error: string | null }[]} */
      const stepResults = []
      const delegationWorkspaceDir = loadWorkspace()

      for (let i = 0; i < normalized.steps.length; i++) {
        const step = normalized.steps[i]
        let execInstr = buildExecutableDelegationInstruction(step)
        if (delegationWorkspaceDir) {
          execInstr = expandChainStepInstructionWithWorkspaceReads(
            execInstr,
            step.agentName,
            delegationWorkspaceDir,
            { taskId: step.taskId },
          )
        }
        const routed = buildAgentRoutedInstruction(step.agentName, execInstr, mode)

        if (mode === 'claude-code') {
          const userLine = `【任务链 Agent 路由】global://${step.agentName}（任务 ${step.taskId || '—'}）\n${routed}${CHAIN_REPLY_HINT}`
          const r = await deps.runClaudeCodePrint({
            prompt: userLine,
            model: orchestratorModel || undefined,
            requestId: undefined,
            timeoutMs: 0,
          })
          const out = (r.content || '').trim()
          stepResults.push({
            agentName: step.agentName,
            taskId: step.taskId,
            ok: Boolean(r.ok),
            output: r.ok ? support.stripLargeAssistantArtifactsMain(out) : out,
            error: r.ok ? null : r.error || out || 'Claude Code CLI 失败',
          })
          if (!r.ok) {
            return {
              ok: false,
              error: `委派在第 ${i + 1} 步失败（${step.agentName}）`,
              stepResults,
              synthesis: null,
            }
          }
          const workspaceDir = loadWorkspace()
          if (workspaceDir && r.ok) {
            ingestTextAndApplyWorkspaceWrite(stepResults[i].output, workspaceDir, {
              agentName: step.agentName,
              taskId: step.taskId,
              ensureChainArtifact: true,
            })
          }
        } else {
          const agentBasenameForRead = `${step.agentName}.md`
          const state = { cancelled: false }
          const requestId = `delegation-${Date.now()}-${i}`
          activeLocalOrchestrationRequests.set(requestId, state)
          try {
            const r = await runLocalMcpOrchestration({
              bundledMcpServerJs: support.bundledOllamaMcpServerPath(),
              workspaceRoot: loadWorkspace() || undefined,
              ollamaBase: settings.ollamaBase,
              mcpConfigAbsolutePath: settings.mcpConfigAbsolutePath || '',
              orchestratorModel,
              priorMessages: [],
              userLine: routed,
              agentMarkdown: support.readClaudeAgentMarkdownContent(agentBasenameForRead),
              lockedAgentStem: support.stemFromAgentBasenameForOrchestration(agentBasenameForRead),
              crossAgentContext: buildCrossAgentContextMarkdown(),
              defaultOllamaModelHint: settings.localOllamaModel || '',
              devMcpOrchDebug: Boolean(settings.devMcpOrchDebug),
              shouldAbort: () => state.cancelled,
              applyWorkspaceWriteItems: applyWritesInWorkspace,
            })
            const out = String(r.content || '').trim()
            stepResults.push({
              agentName: step.agentName,
              taskId: step.taskId,
              ok: Boolean(r.ok),
              output: out,
              error: r.ok ? null : r.error || null,
            })
            if (!r.ok) {
              return {
                ok: false,
                error: `委派在第 ${i + 1} 步失败：${r.error || ''}`,
                stepResults,
                synthesis: null,
              }
            }
            const workspaceDir = loadWorkspace()
            if (workspaceDir) {
              ingestTextAndApplyWorkspaceWrite(out, workspaceDir, {
                agentName: step.agentName,
                taskId: step.taskId,
                ensureChainArtifact: true,
              })
            }
          } finally {
            activeLocalOrchestrationRequests.delete(requestId)
          }
        }
      }

      let synthesis = null
      if (normalized.synthesize && stepResults.length) {
        const agg = stepResults
          .map(
            (r) =>
              `### ${r.agentName}（${r.taskId}）${r.ok ? '' : ' [失败]'}\n${r.ok ? r.output : r.error || ''}`,
          )
          .join('\n\n')
        const synBody = `【委派执行结果汇总】\n\n${agg}\n\n【汇总指令】\n${normalized.synthesizeInstruction}`
        const synRouted = buildAgentRoutedInstruction(normalized.synthesizeStem, synBody, mode)

        if (mode === 'claude-code') {
          const userLine = `【任务链 Agent 路由】global://${normalized.synthesizeStem}（委派汇总）\n${synRouted}${CHAIN_REPLY_HINT}`
          const r = await deps.runClaudeCodePrint({
            prompt: userLine,
            model: orchestratorModel || undefined,
            requestId: undefined,
            timeoutMs: 0,
          })
          const out = (r.content || '').trim()
          synthesis = {
            ok: Boolean(r.ok),
            agentName: normalized.synthesizeStem,
            output: r.ok ? support.stripLargeAssistantArtifactsMain(out) : out,
            error: r.ok ? null : r.error || null,
          }
        } else {
          const stem = normalized.synthesizeStem
          const requestId = `delegation-synth-${Date.now()}`
          const state = { cancelled: false }
          activeLocalOrchestrationRequests.set(requestId, state)
          try {
            const r = await runLocalMcpOrchestration({
              bundledMcpServerJs: support.bundledOllamaMcpServerPath(),
              workspaceRoot: loadWorkspace() || undefined,
              ollamaBase: settings.ollamaBase,
              mcpConfigAbsolutePath: settings.mcpConfigAbsolutePath || '',
              orchestratorModel,
              priorMessages: [],
              userLine: synRouted,
              agentMarkdown: support.readClaudeAgentMarkdownContent(`${stem}.md`),
              lockedAgentStem: support.stemFromAgentBasenameForOrchestration(`${stem}.md`),
              crossAgentContext: buildCrossAgentContextMarkdown(),
              defaultOllamaModelHint: settings.localOllamaModel || '',
              devMcpOrchDebug: Boolean(settings.devMcpOrchDebug),
              shouldAbort: () => state.cancelled,
              applyWorkspaceWriteItems: applyWritesInWorkspace,
            })
            synthesis = {
              ok: Boolean(r.ok),
              agentName: stem,
              output: String(r.content || '').trim(),
              error: r.ok ? null : r.error || null,
            }
          } finally {
            activeLocalOrchestrationRequests.delete(requestId)
          }
        }
      }

      return { ok: true, stepResults, synthesis, error: null }
    },

    'claudeAgents:listMarkdown': async () => {
      try {
        return { ok: true, items: support.collectAgentMarkdownEntries(), error: null }
      } catch (e) {
        return { ok: false, items: [], error: e?.message || String(e) }
      }
    },

    'claudeAgents:readMarkdown': async (args) => {
      const content = support.readClaudeAgentMarkdownContent(args?.[0])
      if (!content) return { ok: false, error: '文件不存在或无效', content: null }
      return { ok: true, content, error: null }
    },

    'claudeSkills:listMarkdown': async () => {
      try {
        return {
          ok: true,
          items: support.collectSkillMarkdownEntries(loadWorkspace()),
          error: null,
        }
      } catch (e) {
        return { ok: false, items: [], error: e?.message || String(e) }
      }
    },

    'claudeSkills:readMarkdown': async (args) => {
      const basename = typeof args?.[0] === 'string' ? args[0].trim() : ''
      if (!basename || !basename.endsWith('.md') || basename.includes('..') || /[/\\]/.test(basename)) {
        return { ok: false, error: '无效文件名', content: null }
      }
      const skillsDir = path.resolve(path.join(os.homedir(), '.claude', 'skills'))
      const target = path.resolve(path.join(skillsDir, basename))
      if (path.relative(skillsDir, target).startsWith('..')) {
        return { ok: false, error: '路径无效', content: null }
      }
      try {
        if (!fs.existsSync(target)) return { ok: false, error: '文件不存在', content: null }
        return { ok: true, content: fs.readFileSync(target, 'utf8'), error: null }
      } catch (e) {
        return { ok: false, error: e?.message || String(e), content: null }
      }
    },

    'claudeSkills:saveMarkdown': async (args) => {
      const body = args?.[0] || {}
      const basename = typeof body.basename === 'string' ? body.basename.trim() : ''
      const content = typeof body.content === 'string' ? body.content : ''
      if (!basename) return { ok: false, error: 'basename 不能为空' }
      const skillsDir = path.resolve(path.join(os.homedir(), '.claude', 'skills'))
      const target = path.resolve(path.join(skillsDir, basename))
      if (path.relative(skillsDir, target).startsWith('..') || !basename.endsWith('.md')) {
        return { ok: false, error: '文件名无效' }
      }
      if (body.createOnly === true && fs.existsSync(target)) {
        return { ok: false, error: `已存在：${basename}` }
      }
      return support.writeClaudeSkillMarkdownContent(basename, content)
    },

    'agents:syncSkillsFromGithub': async (args) => {
      const body = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
      try {
        const { syncAgentSkillsFromGithub } = await import('./agent-skills-github.mjs')
        return await syncAgentSkillsFromGithub(body)
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },

    'claudeDotfiles:readMarkdown': async (args) => {
      const basename = typeof args?.[0] === 'string' ? args[0].trim() : ''
      if (basename !== 'CLAUDE.md') {
        return { ok: false, error: '仅允许 CLAUDE.md', content: null }
      }
      const target = path.join(os.homedir(), '.claude', 'CLAUDE.md')
      try {
        if (!fs.existsSync(target)) return { ok: false, error: '文件不存在', content: null }
        return { ok: true, content: fs.readFileSync(target, 'utf8'), error: null }
      } catch (e) {
        return { ok: false, error: e?.message || String(e), content: null }
      }
    },

    'claude:openUserSubdir': async (args) => {
      const which = typeof args?.[0] === 'string' ? args[0].trim() : ''
      if (!['agents', 'skills'].includes(which)) {
        return { ok: false, error: '仅支持 agents 或 skills' }
      }
      const dir = path.join(os.homedir(), '.claude', which)
      fs.mkdirSync(dir, { recursive: true })
      execFile('open', [dir])
      return { ok: true, path: dir }
    },

    'claudeAgents:createMarkdown': async (args) => {
      let stem = typeof args?.[0] === 'string' ? args[0].trim().replace(/\.md$/i, '') : ''
      if (!stem) {
        const d = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        stem = `new-agent-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
      }
      if (stem.length > 120 || /[/\\]|\.\./.test(stem)) {
        return { ok: false, error: '文件名无效' }
      }
      const agentsDir = path.join(os.homedir(), '.claude', 'agents')
      fs.mkdirSync(agentsDir, { recursive: true })
      const target = path.join(agentsDir, `${stem}.md`)
      if (fs.existsSync(target)) return { ok: false, error: `已存在：${stem}.md` }
      const template = `---
description: 简述该 Agent 的职责。
category: 通用
---

# ${stem}

## 职责

- （待填）
`
      fs.writeFileSync(target, template, 'utf8')
      execFile('open', ['-R', target])
      return { ok: true, stem, basename: `${stem}.md`, fullPath: target }
    },

    'claudeAgents:openMarkdownFile': async (args) => {
      const basename = typeof args?.[0] === 'string' ? args[0].trim() : ''
      if (!basename || !basename.endsWith('.md')) return { ok: false, error: '无效文件名' }
      const target = path.join(os.homedir(), '.claude', 'agents', basename)
      if (!fs.existsSync(target)) return { ok: false, error: '文件不存在' }
      execFile('open', ['-R', target])
      return { ok: true, path: target }
    },

    'claudeAgents:saveMarkdown': async (args) => {
      const body = args?.[0] || {}
      const basename = typeof body.basename === 'string' ? body.basename.trim() : ''
      const content = typeof body.content === 'string' ? body.content : ''
      if (!basename) return { ok: false, error: 'basename 不能为空' }
      const resolved = support.resolveAgentMarkdownWritePath(basename)
      if (!resolved.ok) return resolved
      const exists = fs.existsSync(resolved.target)
      if (!exists && body.createOnly !== false) {
        const agentsDir = path.join(os.homedir(), '.claude', 'agents')
        const rootTarget = path.join(agentsDir, resolved.basename)
        if (fs.existsSync(rootTarget)) {
          return { ok: false, error: `已存在：${resolved.basename}` }
        }
      }
      return support.writeClaudeAgentMarkdownContent(basename, content)
    },

    'memory:getCrossAgentContextText': async () => ({
      ok: true,
      text: buildCrossAgentContextMarkdown(),
    }),

    'memory:appendEvent': async (args) => {
      try {
        const obj = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
        appendMemoryEventRow(obj)
        return { ok: true, error: null }
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },

    'orchestration:loadChain': async () => {
      try {
        const { primary, legacy } = orchestrationFile()
        if (!fs.existsSync(primary)) {
          if (legacy && fs.existsSync(legacy)) {
            fs.mkdirSync(path.dirname(primary), { recursive: true })
            fs.copyFileSync(legacy, primary)
          } else {
            return {
              ok: false,
              error: '无活跃任务链',
              state: null,
            }
          }
        }
        const state = JSON.parse(fs.readFileSync(primary, 'utf8'))
        return { ok: true, state, error: null }
      } catch (e) {
        return { ok: false, error: e?.message || String(e), state: null }
      }
    },

    'orchestration:advanceChain': async () => {
      try {
        const { primary } = orchestrationFile()
        if (!fs.existsSync(primary)) return { ok: false, error: '无活跃任务链', state: null }
        const state = JSON.parse(fs.readFileSync(primary, 'utf8'))
        if (!Array.isArray(state.steps)) return { ok: false, error: '链格式无效', state: null }
        state.currentIndex = (state.currentIndex ?? 0) + 1
        if (state.currentIndex >= state.steps.length) state.status = 'completed'
        fs.mkdirSync(path.dirname(primary), { recursive: true })
        fs.writeFileSync(primary, JSON.stringify(state, null, 2), 'utf8')
        return { ok: true, state, error: null }
      } catch (e) {
        return { ok: false, error: e?.message || String(e), state: null }
      }
    },

    'orchestration:saveChain': async (args) => {
      try {
        const state = args?.[0]?.state
        if (!state || !Array.isArray(state.steps) || !state.steps.length) {
          return { ok: false, error: 'steps 须为非空数组', path: null, state: null }
        }
        const normalized = {
          status: typeof state.status === 'string' ? state.status : 'idle',
          currentIndex: 0,
          steps: state.steps.map((s) => ({
            agentName: String(s.agentName ?? '').trim(),
            taskId: String(s.taskId ?? '').trim(),
            instruction: String(s.instruction ?? '').trim(),
          })),
        }
        const { primary } = orchestrationFile()
        fs.mkdirSync(path.dirname(primary), { recursive: true })
        fs.writeFileSync(primary, JSON.stringify(normalized, null, 2), 'utf8')
        const activeId = orchestrationChains.getActiveOrchestrationChainId()
        if (activeId) {
          orchestrationChains.updateOrchestrationChain(activeId, { state: normalized })
        }
        return { ok: true, path: primary, state: normalized, error: null }
      } catch (e) {
        return { ok: false, error: e?.message || String(e), path: null, state: null }
      }
    },

    'orchestration:clearChain': async () => {
      try {
        const { primary } = orchestrationFile()
        if (primary && fs.existsSync(primary)) fs.unlinkSync(primary)
        return { ok: true, error: null }
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },

    'orchestration:listChains': async () => orchestrationChains.listOrchestrationChains(),

    'orchestration:ensureOfficialChains': async (args) => {
      const payload = args?.[0]
      const r = orchestrationChains.ensureOfficialGenericChains(payload?.items)
      if (r.ok) broadcast('orchestration:chain-status', { kind: 'registry-changed' })
      return r
    },

    'orchestration:listChainsForAgent': async (args) => {
      const stem = String(args?.[0] ?? '').trim()
      return orchestrationChains.listOrchestrationChainsForAgent(stem)
    },

    'orchestration:getChain': async (args) => {
      const id = String(args?.[0]?.id ?? args?.[0] ?? '').trim()
      if (!id) return { ok: false, error: '缺少 id', chain: null }
      return orchestrationChains.getOrchestrationChain(id)
    },

    'orchestration:createChain': async (args) => {
      const payload = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
      const r = orchestrationChains.createOrchestrationChain(payload)
      if (r.ok) broadcast('orchestration:chain-status', { kind: 'registry-changed' })
      return r
    },

    'orchestration:updateChain': async (args) => {
      const payload = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
      const id = String(payload.id ?? '').trim()
      if (!id) return { ok: false, error: '缺少 id', chain: null }
      const r = orchestrationChains.updateOrchestrationChain(id, payload)
      if (r.ok) broadcast('orchestration:chain-status', { kind: 'registry-changed' })
      return r
    },

    'orchestration:deleteChain': async (args) => {
      const id = String(args?.[0]?.id ?? args?.[0] ?? '').trim()
      if (!id) return { ok: false, error: '缺少 id' }
      const r = orchestrationChains.deleteOrchestrationChain(id)
      if (r.ok) broadcast('orchestration:chain-status', { kind: 'registry-changed' })
      return r
    },

    'orchestration:activateChain': async (args) => {
      const id = String(args?.[0]?.id ?? args?.[0] ?? '').trim()
      if (!id) return { ok: false, error: '缺少 id', state: null }
      const r = orchestrationChains.activateOrchestrationChain(id)
      if (r.ok) broadcast('orchestration:chain-status', { kind: 'activated', id })
      return r
    },

    'orchestration:toggleChainEnabled': async (args) => {
      const payload = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
      const id = String(payload.id ?? '').trim()
      if (!id) return { ok: false, error: '缺少 id', chain: null }
      const r = orchestrationChains.toggleOrchestrationChainEnabled(id, payload.enabled)
      if (r.ok) broadcast('orchestration:chain-status', { kind: 'registry-changed' })
      return r
    },

    /** 服务端后台跑链：RPC 立即返回，切换页签/HMR 不中断 Node 侧执行 */
    'orchestration:startChainRun': async (args) => {
      if (chainRunState.running) {
        return { ok: false, error: '任务链已在服务端执行中', started: false }
      }
      const payload = args?.[0] && typeof args[0] === 'object' ? args[0] : {}
      const pinned = String(payload.pinnedSessionId ?? '').trim()
      if (pinned) chainRunState.pinnedSessionId = pinned
      void orchestrationChainLoop()
      return { ok: true, started: true, error: null }
    },

    'orchestration:stopChainRun': async () => {
      chainRunState.stopRequested = true
      const id = chainRunState.activeRequestId
      if (id) {
        const st = activeLocalOrchestrationRequests.get(id)
        if (st) st.cancelled = true
        if (typeof deps.abortClaudeCode === 'function') {
          deps.abortClaudeCode(id)
        }
      }
      emitChainRunStatus()
      return { ok: true }
    },

    'orchestration:getChainRunStatus': async () => ({
      ok: true,
      running: chainRunState.running,
      stopRequested: chainRunState.stopRequested,
      pinnedSessionId: chainRunState.pinnedSessionId,
      lastError: chainRunState.lastError,
      activeChainId: orchestrationChains.getActiveOrchestrationChainId(),
    }),

    'scheduled-tasks:get': async () => ({ ok: true, tasks: loadScheduledTasks() }),

    'scheduled-tasks:save': async (args) => {
      try {
        const existing = loadScheduledTasks()
        const prevById = new Map(existing.map((t) => [t.id, t]))
        const list = Array.isArray(args?.[0]) ? args[0] : []
        const tasks = list
          .map((raw) => {
            const t = support.sanitizeScheduledTask(raw)
            if (!t) return null
            const prev = prevById.get(t.id)
            if (prev) {
              const scheduleChanged =
                prev.scheduleType !== t.scheduleType ||
                prev.intervalMinutes !== t.intervalMinutes ||
                prev.dailyTime !== t.dailyTime
              if (scheduleChanged) {
                t.lastRunAt = null
                t.lastRunError = ''
              } else if (raw.lastRunAt === undefined && prev.lastRunAt) {
                t.lastRunAt = prev.lastRunAt
                t.lastRunError = prev.lastRunError || ''
              }
            }
            return t
          })
          .filter(Boolean)
        saveScheduledTasksFile(tasks)
        broadcast('scheduled-tasks:changed', { tasks: loadScheduledTasks() })
        return { ok: true, tasks: loadScheduledTasks() }
      } catch (e) {
        return { ok: false, error: e?.message || String(e), tasks: loadScheduledTasks() }
      }
    },

    'scheduled-tasks:runNow': async (args) => {
      const tid = typeof args?.[0] === 'string' ? args[0].trim() : ''
      if (!tid) return { ok: false, error: '缺少任务 id' }
      const task = loadScheduledTasks().find((t) => t.id === tid)
      if (!task) return { ok: false, error: '任务不存在' }
      return runScheduledTaskWithMeta(task, 'runNow')
    },

    'logs:readTail': async (args) => {
      const opts = args?.[0] || {}
      const maxLines =
        typeof opts.maxLines === 'number' && opts.maxLines > 0 ? Math.min(2000, opts.maxLines) : 400
      const maxBytes =
        typeof opts.maxBytes === 'number' && opts.maxBytes > 0 ? Math.min(500_000, opts.maxBytes) : 120_000
      const source = typeof opts.source === 'string' ? opts.source : 'app'
      if (source === 'claudeEvents') {
        return support.readTextFileTail(
          support.claudeMemoryEventsPath(),
          Math.min(2000, maxLines),
          Math.min(800_000, maxBytes),
          '（无 events.jsonl）',
        )
      }
      if (source === 'claudeDebugLatest') {
        const p = path.join(os.homedir(), '.claude', 'debug', 'latest')
        let resolved = p
        try {
          resolved = fs.realpathSync(p)
        } catch {
          /* use p */
        }
        const r = support.readTextFileTail(resolved, maxLines, Math.min(1_000_000, maxBytes), '（无 debug/latest）')
        if (r.ok) r.content = `[Claude debug]\n\n${r.content}`
        return r
      }
      if (source === 'claudeHistoryJsonl') {
        return support.readTextFileTail(
          path.join(os.homedir(), '.claude', 'history.jsonl'),
          maxLines,
          Math.min(600_000, maxBytes),
          '（无 history.jsonl）',
        )
      }
      if (source === 'claudeLibraryLogs') {
        const logsDir = path.join(os.homedir(), 'Library', 'Logs', 'Claude')
        let latest = ''
        try {
          if (fs.existsSync(logsDir)) {
            const files = fs
              .readdirSync(logsDir)
              .filter((n) => n.endsWith('.log'))
              .map((n) => ({ n, m: fs.statSync(path.join(logsDir, n)).mtimeMs }))
              .sort((a, b) => b.m - a.m)
            latest = files[0] ? path.join(logsDir, files[0].n) : ''
          }
        } catch {
          latest = ''
        }
        if (!latest) {
          return { ok: true, content: '（未找到 ~/Library/Logs/Claude/*.log）', lines: 0 }
        }
        const r = support.readTextFileTail(latest, maxLines, Math.min(800_000, maxBytes), '（空）')
        if (r.ok) r.content = `[Claude Desktop · ${path.basename(latest)}]\n\n${r.content}`
        return r
      }
      const appPath = deps.appLogFilePath?.()
      const dbR = projectLogs.readLogTail({ source: 'app', maxLines, maxBytes })
      if (dbR.ok && dbR.content?.trim()) return dbR
      return support.readTextFileTail(appPath || '', maxLines, maxBytes, '（暂无应用日志）')
    },

    'logs:overviewSnapshot': async () => {
      const appPath = deps.appLogFilePath?.()
      return agentDailyReports.logsOverviewSnapshot(appPath || '', support.claudeMemoryEventsPath())
    },

    'logs:clear': async () => {
      try {
        const p = deps.appLogFilePath?.()
        if (p && fs.existsSync(p)) fs.unlinkSync(p)
        projectLogs.clearAppLogs()
        appendAppLog('INFO logs cleared')
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },

    'daily-reports:list': async () => {
      try {
        const dir = deps.dailyReportsDir?.()
        if (!dir || !fs.existsSync(dir)) return { ok: true, files: [] }
        const files = fs
          .readdirSync(dir)
          .filter((n) => n.endsWith('.md'))
          .sort()
          .reverse()
        return { ok: true, files }
      } catch (e) {
        return { ok: false, files: [], error: e?.message || String(e) }
      }
    },

    'daily-reports:get': async (args) => {
      const date =
        typeof args?.[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args[0].trim())
          ? args[0].trim()
          : support.formatLocalYYYYMMDD()
      const fp = path.join(deps.dailyReportsDir?.() || '', `${date}-mcp-agent.md`)
      if (!fs.existsSync(fp)) return { ok: true, date, content: '', missing: true }
      return { ok: true, date, content: fs.readFileSync(fp, 'utf8'), missing: false }
    },

    'daily-reports:save': async (args) => {
      const payload = args?.[0] || {}
      const date =
        typeof payload.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.date.trim())
          ? payload.date.trim()
          : support.formatLocalYYYYMMDD()
      const content = typeof payload.content === 'string' ? payload.content : ''
      const dir = deps.dailyReportsDir?.()
      if (!dir) return { ok: false, error: '日报目录未配置' }
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, `${date}-mcp-agent.md`), content, 'utf8')
      return { ok: true, date, path: path.join(dir, `${date}-mcp-agent.md`) }
    },

    'daily-reports:template': async () => {
      const d = support.formatLocalYYYYMMDD()
      return {
        ok: true,
        content: `# 项目日报 · ${d}\n\n## 进度概览\n\n## 风险与阻塞\n\n## 明日计划\n`,
      }
    },

    'agent-daily-reports:listDates': async () => {
      try {
        const dir = deps.dailyReportsDir?.()
        const dates = agentDailyReports.listAgentDailyReportDates(dir || '')
        return { ok: true, dates }
      } catch (e) {
        return { ok: false, dates: [], error: e?.message || String(e) }
      }
    },

    'agent-daily-reports:listAgents': async (args) => {
      const date =
        typeof args?.[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args[0].trim())
          ? args[0].trim()
          : support.formatLocalYYYYMMDD()
      try {
        const dir = deps.dailyReportsDir?.()
        const stems = agentDailyReports.listAgentStemsForDate(dir || '', date)
        return { ok: true, date, stems }
      } catch (e) {
        return { ok: false, date, stems: [], error: e?.message || String(e) }
      }
    },

    'agent-daily-reports:listAgentRegistry': async (args) => {
      const date =
        typeof args?.[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args[0].trim())
          ? args[0].trim()
          : support.formatLocalYYYYMMDD()
      try {
        const { agents } = agentExecRegistry.listAgentsForDate(date, support.claudeMemoryEventsPath())
        return { ok: true, date, agents }
      } catch (e) {
        return { ok: false, date, agents: [], error: e?.message || String(e) }
      }
    },

    'agent-daily-reports:get': async (args) => {
      const payload = args?.[0] || {}
      const date =
        typeof payload.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.date.trim())
          ? payload.date.trim()
          : support.formatLocalYYYYMMDD()
      const stem = typeof payload.stem === 'string' ? payload.stem.trim() : ''
      if (!stem) return { ok: false, error: '缺少 stem' }
      return agentDailyReports.readAgentDailyReport(deps.dailyReportsDir?.() || '', date, stem)
    },

    'agent-daily-reports:save': async (args) => {
      const payload = args?.[0] || {}
      const date = typeof payload.date === 'string' ? payload.date : support.formatLocalYYYYMMDD()
      const stem = typeof payload.stem === 'string' ? payload.stem : ''
      const content = typeof payload.content === 'string' ? payload.content : ''
      if (!stem) return { ok: false, error: '缺少 stem' }
      return agentDailyReports.writeAgentDailyReport(deps.dailyReportsDir?.() || '', date, stem, content)
    },

    'agent-daily-reports:buildFromEvents': async (args) => {
      const payload = args?.[0] || {}
      const date = typeof payload.date === 'string' ? payload.date : support.formatLocalYYYYMMDD()
      const stem = typeof payload.stem === 'string' ? payload.stem.trim() : ''
      if (!stem) return { ok: false, error: '缺少 stem' }
      return agentDailyReports.buildAgentDailyReportFromEvents(
        deps.dailyReportsDir?.() || '',
        date,
        stem,
        support.claudeMemoryEventsPath(),
      )
    },

    'agent-daily-reports:generate': async (args) => {
      const payload = args?.[0] || {}
      const date =
        typeof payload.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.date.trim())
          ? payload.date.trim()
          : support.formatLocalYYYYMMDD()
      const stem = typeof payload.stem === 'string' ? payload.stem.trim() : ''
      if (!stem) return { ok: false, error: '缺少 stem' }
      const settings = loadChatSettings()
      const model = settings.model?.trim()
      if (!model) return { ok: false, error: '未配置 Claude Code 模型' }
      const cur = agentDailyReports.readAgentDailyReport(deps.dailyReportsDir?.() || '', date, stem)
      const draft = cur.content || agentDailyReports.defaultReportMarkdown(stem, date)
      const prompt = [
        '你是项目助理。根据以下 Agent 日报草稿，用简体中文更新整份 Markdown：',
        '1. 填写「执行摘要」3～5 条要点；',
        '2. 保留「今日活动」已有条目；',
        '3. 若有信息则补充「产出与变更」「风险与待办」；',
        '4. 不要删除文首标题行；',
        '5. 只输出完整 Markdown，不要解释。',
        '',
        draft,
      ].join('\n')
      const r = await deps.runClaudeCodePrint({ prompt, model, timeoutMs: 0 })
      if (!r.ok) return { ok: false, error: r.error || 'Claude 生成失败' }
      const content = (r.content || '').trim() || draft
      return agentDailyReports.writeAgentDailyReport(deps.dailyReportsDir?.() || '', date, stem, content)
    },

    'reference-files:readAsImageAttachments': async (args) => {
      const filePaths = args?.[0]
      const items = []
      if (!Array.isArray(filePaths)) return { ok: false, items: [] }
      const byExt = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      }
      for (const fp of filePaths.slice(0, 8)) {
        if (typeof fp !== 'string' || !fp.trim()) continue
        const abs = path.resolve(fp.trim())
        const ext = path.extname(abs).toLowerCase()
        const mime = byExt[ext]
        if (!mime || !fs.existsSync(abs)) continue
        try {
          const buf = fs.readFileSync(abs)
          if (buf.length > 1_200_000) continue
          items.push({
            kind: 'image',
            name: path.basename(abs),
            mime,
            dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
          })
        } catch {
          /* skip */
        }
      }
      return { ok: items.length > 0, items }
    },

    'agentExecution:readTail': async (args) => {
      const stem = typeof args?.[0] === 'string' ? args[0].trim() : ''
      if (!stem || stem.length > 120) return { ok: false, error: '无效 Agent 标识', content: '' }
      const stemLower = stem.toLowerCase()
      const appPath = deps.appLogFilePath?.()
      const appR = support.readTextFileTail(appPath || '', 6000, 900_000, '')
      const appLines = (appR.content || '').split('\n').filter((l) => l.toLowerCase().includes(stemLower))
      const parts = []
      if (appLines.length) {
        parts.push(`【应用日志 · 匹配 ${stem}】\n${appLines.slice(-220).join('\n')}`)
      }
      const evR = support.readTextFileTail(support.claudeMemoryEventsPath(), 6000, 650_000, '')
      const evMatched = (evR.content || '')
        .split('\n')
        .filter((l) => l.toLowerCase().includes(stemLower))
        .slice(-80)
      if (evMatched.length) {
        parts.push(`【events.jsonl · 匹配 ${stem}】\n${evMatched.join('\n')}`)
      }
      if (!parts.length) {
        return { ok: true, content: `（暂无与「${stem}」相关的执行记录）` }
      }
      return { ok: true, content: parts.join('\n\n---\n\n') }
    },

    'claude-memory:todayEventsSummary': async (args) => {
      const date =
        typeof args?.[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args[0].trim())
          ? args[0].trim()
          : support.formatLocalYYYYMMDD()
      return support.summarizeClaudeEventsForDailyReport(date)
    },

    'claude-logs:bundleMarkdown': async (args) => {
      const n =
        typeof args?.[0]?.maxLinesPerSection === 'number' && args[0].maxLinesPerSection > 0
          ? Math.min(300, args[0].maxLinesPerSection)
          : 140
      return support.buildClaudeCodeBundleMarkdown(n)
    },

    'agent-os:metaAnalyze': async () => {
      try {
        const { analyze_system_performance } = require(path.join(CAD, 'meta-agent-runtime.js'))
        return analyze_system_performance(loadWorkspace())
      } catch (e) {
        return { ok: false, error: e?.message || String(e), readOnly: true }
      }
    },

    'agent-os:workflowRun': async (args) => {
      try {
        const wf = require(path.join(CAD, 'workflow-graph-runtime.js'))
        const payload = args?.[0] || {}
        const def =
          payload?.definition && typeof payload.definition === 'object' ? payload.definition : payload
        if (!def || !Array.isArray(def.nodes)) return { ok: false, error: '缺少 definition.nodes' }
        const g = wf.create_workflow_graph(def)
        if (!g.ok) return { ok: false, error: g.error }
        const ws = loadWorkspace()
        const useMcp = Boolean(payload?.useLocalMcpNodes)
        let execute_workflow_node = wf.execute_workflow_node_stub
        if (useMcp) {
          const { createMcpWorkflowNodeExecutor } = require(path.join(CAD, 'workflow-node-executor.js'))
          execute_workflow_node = createMcpWorkflowNodeExecutor({
            runLocalMcpOrchestration,
            getWorkspace: loadWorkspace,
            getSettings: loadChatSettings,
            bundledMcpServerJs: support.bundledOllamaMcpServerPath(),
            readAgentMarkdown: support.readClaudeAgentMarkdownContent,
            stemFromBasename: support.stemFromAgentBasenameForOrchestration,
            buildCrossAgent: buildCrossAgentContextMarkdown,
            applyWorkspaceWrites: applyWritesInWorkspace,
            shouldAbort: () => false,
          })
        }
        const out = await wf.execute_workflow_async({
          graph: g,
          execute_workflow_node,
          ctx: typeof payload?.ctx === 'object' ? payload.ctx : {},
        })
        return { ok: out.ok, trace: out.trace, aggregate: out.aggregate, usedLocalMcpNodes: useMcp }
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },

    'agent-os:qualityReport': async () => {
      try {
        const { generate_quality_report } = require(path.join(CAD, 'agent-os-evaluation.js'))
        return { ok: true, report: generate_quality_report(loadWorkspace()) }
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },

    'agent-os:runtimeVersion': async () => {
      try {
        const pkg = JSON.parse(
          fs.readFileSync(path.join(CAD, '../agent-os-runtime/package.json'), 'utf8'),
        )
        return { ok: true, version: String(pkg.version || '0.0.0') }
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },
  }
}

module.exports = {
  init,
  createHandlers,
  runScheduledTaskWithMeta,
  executeScheduledTask,
  listScheduledTasks: loadScheduledTasks,
}
