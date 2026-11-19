#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { resolveTurnPolicy } from '../shared/turn-policy.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TASKS_FILE = path.join(ROOT, 'eval/tasks/suite-v1.json')
const DEFAULT_BASE = 'http://127.0.0.1:11434'
const CHILD_TASK = process.env.AGENT_EVAL_CHILD_TASK
const ASSERTION_TYPES = new Set([
  'answerIncludes', 'fileContains', 'fileNotContains', 'fileExists', 'lineCount',
  'fileUnchanged', 'workspaceUnchanged', 'workspaceContains', 'workspaceNotContains',
  'fileExistsGlob', 'commandPass', 'toolCalled', 'manualReview',
])

function parseArgs(argv) {
  const out = { backend: 'both', repeat: 3, timeoutMs: 300_000, allowNetwork: false, keep: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') out.help = true
    else if (arg === '--list') out.list = true
    else if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--allow-network') out.allowNetwork = true
    else if (arg === '--keep-workspaces') out.keep = true
    else if (['--backend', '--model', '--task', '--repeat', '--ollama-base', '--timeout-ms', '--out'].includes(arg)) {
      const value = argv[++i]
      if (!value) throw new Error(`${arg} 缺少参数`)
      const key = ({ '--ollama-base': 'ollamaBase', '--timeout-ms': 'timeoutMs' })[arg] || arg.slice(2)
      out[key] = ['repeat', 'timeoutMs'].includes(key) ? Number(value) : value
    } else throw new Error(`未知参数：${arg}`)
  }
  if (!Number.isInteger(out.repeat) || out.repeat < 1 || out.repeat > 5) throw new Error('--repeat 须为 1–5')
  if (!Number.isFinite(out.timeoutMs) || out.timeoutMs < 5_000 || out.timeoutMs > 900_000) throw new Error('--timeout-ms 须在 5000–900000 之间')
  if (!['host', 'local-mcp', 'both'].includes(out.backend)) throw new Error('--backend 须为 host、local-mcp 或 both')
  return out
}

function loadSuite() {
  const suite = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'))
  if (!Array.isArray(suite.tasks) || !suite.tasks.length) throw new Error('评测任务集为空')
  const ids = new Set()
  for (const task of suite.tasks) {
    if (!task.id || ids.has(task.id)) throw new Error(`任务 ID 缺失或重复：${task.id || '(空)'}`)
    ids.add(task.id)
    if (typeof task.prompt !== 'string' || !task.prompt.trim()) throw new Error(`${task.id}: prompt 不能为空`)
    if (!['ask', 'agent'].includes(task.mode)) throw new Error(`${task.id}: mode 须为 ask 或 agent`)
    if (!Array.isArray(task.assertions)) throw new Error(`${task.id}: assertions 须为数组`)
    for (const file of Object.keys(task.workspaceFiles || {})) safeRelative(file)
    for (const spec of task.generatedFiles || []) {
      safeRelative(spec.path)
      if (!Number.isInteger(spec.lines) && !Number.isInteger(spec.count)) throw new Error(`${task.id}: generatedFiles 需提供 lines 或 count`)
    }
    for (const check of task.assertions) {
      if (!ASSERTION_TYPES.has(check.type)) throw new Error(`${task.id}: 不支持的断言类型 ${check.type}`)
      if (['fileContains', 'fileNotContains', 'fileExists', 'lineCount', 'fileUnchanged'].includes(check.type)) safeRelative(check.path)
      if (check.type === 'commandPass' && (!Array.isArray(check.argv) || !check.argv.length || check.argv.some((x) => typeof x !== 'string'))) throw new Error(`${task.id}: commandPass 需使用 argv 数组`)
    }
  }
  return suite
}

function safeRelative(rel) {
  const normalized = String(rel || '').replace(/\\/g, '/')
  if (!normalized || normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`不安全的评测路径：${rel}`)
  }
  return normalized
}

function writeFixture(task, workspace) {
  const initialHashes = new Map()
  const write = (relative, content) => {
    const rel = safeRelative(relative)
    const target = path.resolve(workspace, rel)
    if (!target.startsWith(`${workspace}${path.sep}`)) throw new Error(`评测路径越界：${rel}`)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content, 'utf8')
    initialHashes.set(rel, createHash('sha256').update(content).digest('hex'))
  }
  // 先生成批量基础文件，再让 workspaceFiles 覆盖特定样本；
  // 否则像 E10 的 module_57.js 这类显式夹具会被后续批量生成器静默覆盖。
  for (const spec of task.generatedFiles || []) {
    if (Number.isInteger(spec.lines)) {
      const count = Math.max(1, Math.min(100_000, spec.lines))
      const rows = Array.from({ length: count }, (_, index) => {
        const line = index + 1
        return line === spec.targetLine ? String(spec.target) : String(spec.template || 'ROW_{i}').replaceAll('{i}', String(line))
      })
      write(spec.path, `${rows.join('\n')}\n`)
    } else if (Number.isInteger(spec.count)) {
      const count = Math.max(1, Math.min(10_000, spec.count))
      for (let i = 0; i < count; i++) {
        const rel = path.posix.join(spec.path, String(spec.template || 'file_{i}.txt').replaceAll('{i}', String(i)))
        write(rel, String(spec.contentTemplate || '').replaceAll('{i}', String(i)))
      }
    }
  }
  for (const [rel, content] of Object.entries(task.workspaceFiles || {})) write(rel, String(content))
  return initialHashes
}

function listFiles(root) {
  const out = []
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) visit(full)
      else if (entry.isFile()) out.push(full)
    }
  }
  visit(root)
  return out
}

function isSafeFile(workspace, file) {
  try {
    const rootReal = fs.realpathSync(workspace)
    const fileReal = fs.realpathSync(file)
    return fileReal.startsWith(`${rootReal}${path.sep}`) && fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink()
  } catch {
    return false
  }
}

function globToRegExp(pattern) {
  const escaped = pattern.split('*').map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')).join('.*')
  return new RegExp(`^${escaped}$`)
}

async function runCommand(workspace, argv, timeoutMs = 60_000) {
  if (!Array.isArray(argv) || !argv.length || argv.some((x) => typeof x !== 'string')) return { ok: false, error: 'invalid argv' }
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), { cwd: workspace, stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
    let stdout = ''
    let stderr = ''
    const cap = 32_000
    child.stdout.on('data', (chunk) => { stdout = (stdout + chunk.toString()).slice(-cap) })
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-cap) })
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, exitCode: code, signal, stdout, stderr })
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ ok: false, error: error.message, stdout, stderr })
    })
  })
}

async function evaluateAssertions(task, workspace, answer, toolNames, initialHashes) {
  const results = []
  for (const check of task.assertions) {
    let ok = false
    let detail = ''
    if (check.type === 'answerIncludes') {
      ok = answer.toLowerCase().includes(String(check.value).toLowerCase())
    } else if (check.type === 'fileContains' || check.type === 'fileNotContains' || check.type === 'fileExists' || check.type === 'lineCount' || check.type === 'fileUnchanged') {
      const rel = safeRelative(check.path)
      const file = path.resolve(workspace, rel)
      const exists = file.startsWith(`${workspace}${path.sep}`) && isSafeFile(workspace, file)
      if (check.type === 'fileExists') ok = exists
      else if (check.type === 'lineCount') ok = exists && fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((_, index, lines) => index < lines.length - 1 || lines[index] !== '').length === check.equals
      else if (check.type === 'fileUnchanged') {
        const before = initialHashes.get(rel)
        const after = exists ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : ''
        ok = Boolean(before && before === after)
      } else {
        const content = exists ? fs.readFileSync(file, 'utf8') : ''
        ok = check.type === 'fileContains' ? content.includes(String(check.value)) : !content.includes(String(check.value))
      }
      detail = rel
    } else if (check.type === 'workspaceUnchanged') {
      ok = [...initialHashes.entries()].every(([rel, before]) => {
        const file = path.resolve(workspace, safeRelative(rel))
        return isSafeFile(workspace, file) && createHash('sha256').update(fs.readFileSync(file)).digest('hex') === before
      })
      detail = `${initialHashes.size} 个初始文件`
    } else if (check.type === 'workspaceContains' || check.type === 'workspaceNotContains') {
      const needle = String(check.value)
      const found = listFiles(workspace).some((file) => {
        try { return fs.readFileSync(file, 'utf8').includes(needle) } catch { return false }
      })
      ok = check.type === 'workspaceContains' ? found : !found
    } else if (check.type === 'fileExistsGlob') {
      const matcher = globToRegExp(String(check.pattern))
      ok = listFiles(workspace).some((file) => matcher.test(path.relative(workspace, file).replace(/\\/g, '/')))
      detail = String(check.pattern)
    } else if (check.type === 'commandPass') {
      const command = await runCommand(workspace, check.argv, check.timeoutMs || 60_000)
      ok = command.ok
      detail = command.ok ? `exit=${command.exitCode}` : String(command.error || command.stderr || `exit=${command.exitCode}`).slice(0, 240)
    } else if (check.type === 'toolCalled') {
      ok = toolNames.some((name) => name.toLowerCase().includes(String(check.value).toLowerCase()))
      detail = toolNames.join(', ')
    } else if (check.type === 'manualReview') {
      ok = false
      detail = check.reason || '需要人工判分'
    } else {
      detail = `不支持的断言类型：${check.type}`
    }
    results.push({ type: check.type, ok, detail })
  }
  return results
}

function projectResult(task, backend, result, events, durationMs, workspace, initialHashes) {
  const answer = String(result?.content || '')
  const trace = Array.isArray(result?.toolTrace) ? result.toolTrace : []
  const toolNames = [...trace.map((item) => String(item?.tool || '')), ...events.map((event) => String(event?.toolName || event?.name || ''))].filter(Boolean)
  const editFailureCount = trace.filter((item) => item?.ok === false && /write|edit|replace|patch/i.test(String(item?.tool || ''))).length +
    events.filter((event) => event?.status === 'fail' && /write|edit|replace|patch/i.test(String(event?.toolName || event?.name || ''))).length
  return evaluateAssertions(task, workspace, answer, toolNames, initialHashes).then((assertions) => {
    const manual = assertions.some((item) => item.type === 'manualReview')
    const auto = assertions.filter((item) => item.type !== 'manualReview')
    const passed = Boolean(result?.ok) && auto.every((item) => item.ok)
    return {
      status: !passed ? 'failed' : manual ? 'needs_review' : 'passed',
      ok: passed && !manual,
      answer,
      error: result?.error ? String(result.error).slice(0, 1200) : null,
      turns: Number(result?.turns ?? result?.iterationCount) || 0,
      durationMs,
      usage: {
        prompt_tokens: Math.max(0, Number(result?.usage?.prompt_tokens) || 0),
        completion_tokens: Math.max(0, Number(result?.usage?.completion_tokens) || 0),
        total_tokens: Math.max(0, Number(result?.usage?.total_tokens) || 0),
      },
      toolCallCount: Math.max(trace.length, Number(result?.toolsTrace?.called) || 0, events.filter((event) => event?.status === 'running').length),
      toolNames: [...new Set(toolNames)],
      toolTrace: trace.slice(-80).map((item) => ({
        tool: String(item?.tool || ''),
        detail: String(item?.detail || '').slice(0, 240),
        path: item?.path ? String(item.path) : undefined,
        ok: item?.ok !== false,
        failedArguments:
          item?.ok === false && item?.args && typeof item.args === 'object'
            ? JSON.stringify(item.args).slice(0, 2400)
            : undefined,
        exitCode: typeof item?.exitCode === 'number' ? item.exitCode : undefined,
        output: item?.output ? String(item.output).slice(-2000) : undefined,
      })),
      editFailureCount,
      writeRepairAttempted: Boolean(result?.evalWriteRepairAttempted),
      writeRepairPaths: Array.isArray(result?.evalWriteRepairPaths) ? result.evalWriteRepairPaths : [],
      writtenPaths: [...new Set([
        ...(Array.isArray(result?.writtenPaths) ? result.writtenPaths : []),
        ...events.filter((event) => event?.status === 'ok' && event?.path && /write|edit|replace/i.test(String(event?.toolName || event?.name || ''))).map((event) => String(event.path)),
      ])],
      assertions,
    }
  })
}

async function runChild() {
  const job = JSON.parse(CHILD_TASK || '{}')
  const repoRoot = ROOT
  process.env.CLAUDE_ORCHESTRATOR_PROJECT_ROOT = repoRoot
  process.env.CLAUDE_ORCHESTRATOR_USER_DATA = job.userData || path.join(job.runDir, 'user-data')
  process.env.WORKBENCH_WORKSPACE = job.workspace
  process.env.HOME = path.join(job.runDir, 'home')
  fs.mkdirSync(process.env.HOME, { recursive: true })
  // 评测子进程不得复用用户级 npm 缓存：既避免权限污染，也防止模型因历史 root-owned 文件尝试 sudo 修复。
  process.env.npm_config_cache = path.join(job.runDir, 'npm-cache')
  fs.mkdirSync(process.env.npm_config_cache, { recursive: true })
  const store = await import(pathToFileURL(path.join(ROOT, 'server/store.mjs')).href)
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const workspaceWrite = require(path.join(ROOT, 'server/workspace-write.cjs'))
  store.saveWorkspace(job.workspace)
  store.saveChatSettings({
    model: job.model,
    localOllamaModel: job.model,
    localModelCatalog: [job.model],
    chatEnabledLocalModels: [job.model],
    orchestrationMode: 'local-mcp',
    ollamaBase: job.ollamaBase,
    mcpConfigAbsolutePath: job.mcpConfig,
  })
  const events = []
  const initialFiles = new Map(listFiles(job.workspace).map((file) => [
    path.relative(job.workspace, file).replace(/\\/g, '/'),
    createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  ]))
  const isEvalInfrastructureFile = (rel) =>
    rel.startsWith('.claudecode/mcp-tool-catalog/') || rel === '.claudecode/mcp-tool-catalog'
  const workspaceChanged = () => {
    const current = listFiles(job.workspace)
      .filter((file) => !isEvalInfrastructureFile(path.relative(job.workspace, file).replace(/\\/g, '/')))
    const taskFilesBefore = [...initialFiles.keys()].filter((rel) => !isEvalInfrastructureFile(rel))
    if (current.length !== taskFilesBefore.length) return true
    return current.some((file) => {
      const rel = path.relative(job.workspace, file).replace(/\\/g, '/')
      return initialFiles.get(rel) !== createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    })
  }
  const policy = resolveTurnPolicy({
    displayLine: job.task.prompt,
    interactionMode: job.task.mode,
    isGeneralTurn: true,
    isNamedAgent: false,
  })
  const common = {
    userLine: job.task.prompt,
    priorMessages: [],
    interactionMode: job.task.mode,
    readOnlyTurn: job.task.mode === 'ask',
    allowWrites: job.task.mode !== 'ask',
    autoApplyWrites: job.task.mode !== 'ask',
    requireAppliedWrite: policy.autoApplyWrites && policy.requireAppliedWrite,
    toolExecutionTimeoutMs: 120_000,
    maxTurns: 10,
    requestId: `eval-${job.task.id}-${job.runIndex}`,
    onDelta: () => {},
    onToolEvent: (event) => events.push(event),
  }
  let result
  if (job.backend === 'host') {
    const { runHostAgentLoop } = await import(pathToFileURL(path.join(ROOT, 'server/host-agent-loop.mjs')).href)
    result = await runHostAgentLoop({ ...common, model: job.model })
  } else {
    const orchestrator = require(path.join(ROOT, 'server/vendor/cad/local-mcp-orchestrator.js'))
    const support = require(path.join(ROOT, 'server/cad-support.cjs'))
    const { applyWorkspaceWriteFenceItems } = require(path.join(ROOT, 'server/workspace-write.cjs'))
    result = await orchestrator.runLocalMcpOrchestration({
      ...common,
      orchestratorModel: job.model,
      bundledMcpServerJs: support.bundledOllamaMcpServerPath(),
      workspaceRoot: job.workspace,
      ollamaBase: job.ollamaBase,
      mcpConfigAbsolutePath: job.mcpConfig,
      agentMarkdown: '',
      shouldAbort: () => false,
      applyWorkspaceWriteItems: (items) => applyWorkspaceWriteFenceItems(job.workspace, items),
    })
    let evalWriteRepairAttempted = false
    let evalWriteRepairPaths = []
    if (result?.ok && policy.intent === 'write' && !workspaceChanged()) {
      evalWriteRepairAttempted = true
      const repaired = await orchestrator.runLocalMcpOrchestration({
        ...common,
        priorMessages: [
          { role: 'user', content: job.task.prompt },
          { role: 'assistant', content: String(result.content || '').slice(0, 6000) },
        ],
        userLine: `原始任务：${job.task.prompt}\n\n上一轮未成功落盘。请按原任务直接执行，不要要求用户重复路径或确认；只重新输出一个 \`\`\`workspace-write 围栏，正文必须是 JSON 对象 {"path":"<相对路径>","content":"完整文件内容"}。不要在围栏外写说明；禁止空落盘收尾。`,
        languageSourceLine: job.task.prompt,
        interactionMode: job.task.mode,
        readOnlyTurn: false,
        allowWrites: true,
        autoApplyWrites: true,
        systemConstraint: '只输出一个 ```workspace-write JSON 围栏。path 与 content 都必须是 JSON 字符串。',
        orchestratorModel: job.model,
        bundledMcpServerJs: support.bundledOllamaMcpServerPath(),
        workspaceRoot: job.workspace,
        ollamaBase: job.ollamaBase,
        mcpConfigAbsolutePath: job.mcpConfig,
        agentMarkdown: '',
        shouldAbort: () => false,
        applyWorkspaceWriteItems: (items) => applyWorkspaceWriteFenceItems(job.workspace, items),
      })
      if (repaired?.ok) {
        const ingested = workspaceWrite.ingestTextAndApplyWorkspaceWrite(
          String(repaired.content || ''),
          job.workspace,
          { applyWrites: true },
        )
        evalWriteRepairPaths = Array.isArray(ingested?.written) ? [...new Set(ingested.written)] : []
        result = {
          ...repaired,
          content: String(ingested?.displayText || repaired.content || ''),
          evalWriteRepairAttempted,
          evalWriteRepairPaths,
          writtenPaths: [...new Set([
            ...(Array.isArray(repaired.writtenPaths) ? repaired.writtenPaths : []),
            ...evalWriteRepairPaths,
          ])],
        }
      } else {
        result = { ...result, evalWriteRepairAttempted, evalWriteRepairPaths }
      }
    } else {
      result = { ...result, evalWriteRepairAttempted, evalWriteRepairPaths }
    }
  }
  process.stdout.write(`${JSON.stringify({ result, events })}\n`)
}

async function spawnRun({ task, backend, model, ollamaBase, timeoutMs, runIndex, keep, userData }) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), `claude-agent-eval-${task.id.toLowerCase()}-`))
  const workspace = path.join(runDir, 'workspace')
  fs.mkdirSync(workspace, { recursive: true })
  const initialHashes = writeFixture(task, workspace)
  const mcpConfig = path.join(runDir, 'mcp.json')
  fs.writeFileSync(mcpConfig, JSON.stringify({ mcpServers: {} }, null, 2))
  const job = { runDir, workspace, mcpConfig, task, backend, model, ollamaBase, runIndex, userData }
  const isolatedEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      !/(API.?KEY|AUTH.?TOKEN|PASSWORD|SECRET)/i.test(key) &&
      !/^(ANTHROPIC|OPENAI|GEMINI|GOOGLE|DEEPSEEK|CLAUDE_CODE_OAUTH)_/i.test(key),
    ),
  )
  const env = { ...isolatedEnv, AGENT_EVAL_CHILD_TASK: JSON.stringify(job) }
  const started = Date.now()
  const childResult = await new Promise((resolve) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--child'], {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })
    let stdout = ''
    let stderr = ''
    const cap = 2_000_000
    child.stdout.on('data', (chunk) => { stdout = (stdout + chunk.toString()).slice(-cap) })
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-cap) })
    const timer = setTimeout(() => {
      try {
        if (process.platform === 'win32') child.kill('SIGTERM')
        else process.kill(-child.pid, 'SIGTERM')
      } catch { /* process already ended */ }
    }, timeoutMs)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) || ''
      try { resolve({ code, signal, stderr, payload: JSON.parse(line) }) }
      catch { resolve({ code, signal, stderr, parseError: '评测子进程未返回有效 JSON', stdout: stdout.slice(-1000) }) }
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ code: 1, error: error.message, stderr })
    })
  })
  const durationMs = Date.now() - started
  let projected
  if (childResult.payload) projected = await projectResult(task, backend, childResult.payload.result, childResult.payload.events || [], durationMs, workspace, initialHashes)
  else projected = { status: 'failed', ok: false, error: String(childResult.error || childResult.parseError || childResult.stderr || `子进程退出 ${childResult.code}`).slice(0, 1200), durationMs, turns: 0, toolCallCount: 0, toolNames: [], editFailureCount: 0, writtenPaths: [], assertions: [] }
  if (keep) projected.workspace = workspace
  else fs.rmSync(runDir, { recursive: true, force: true })
  return projected
}

async function checkOllama(base, model) {
  const response = await fetch(`${base.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(3_000) })
  if (!response.ok) throw new Error(`Ollama /api/tags 返回 HTTP ${response.status}`)
  const data = await response.json()
  const models = Array.isArray(data.models) ? data.models : []
  const match = models.find((item) => String(item.name || '') === model)
  if (!match) throw new Error(`模型不在当前 Ollama tags：${model}`)
  let version = null
  try {
    const info = await fetch(`${base.replace(/\/$/, '')}/api/version`, { signal: AbortSignal.timeout(2_000) })
    if (info.ok) version = (await info.json()).version || null
  } catch { /* version endpoint is optional */ }
  return { version, model: match.name, digest: match.digest || null, details: match.details || {} }
}

function summarize(runs) {
  const groups = new Map()
  for (const run of runs) {
    const key = `${run.backend}/${run.taskId}`
    const item = groups.get(key) || { backend: run.backend, taskId: run.taskId, title: run.title, attempted: 0, passed: 0, failed: 0, needsReview: 0, notRun: 0, durationsMs: [], turns: [], promptTokens: [], editFailures: 0 }
    if (run.status === 'not_run' || run.status === 'skipped') item.notRun++
    else {
      item.attempted++
      if (run.status === 'passed') item.passed++
      else if (run.status === 'needs_review') item.needsReview++
      else item.failed++
      item.durationsMs.push(run.durationMs || 0)
      item.turns.push(run.turns || 0)
      item.promptTokens.push(Math.max(0, Number(run.usage?.prompt_tokens) || 0))
      item.editFailures += run.editFailureCount || 0
    }
    groups.set(key, item)
  }
  return [...groups.values()].map((item) => ({
    ...item,
    successRate: item.attempted ? item.passed / item.attempted : null,
    avgDurationMs: item.durationsMs.length ? Math.round(item.durationsMs.reduce((a, b) => a + b, 0) / item.durationsMs.length) : null,
    avgTurns: item.turns.length ? Number((item.turns.reduce((a, b) => a + b, 0) / item.turns.length).toFixed(2)) : null,
    avgPromptTokens: item.promptTokens.length ? Math.round(item.promptTokens.reduce((a, b) => a + b, 0) / item.promptTokens.length) : null,
  }))
}

function renderMarkdown(report) {
  const runtime = report.runtime
    ? `${report.runtime.model}${report.runtime.digest ? ` · digest ${report.runtime.digest}` : ''}${report.runtime.version ? ` · Ollama ${report.runtime.version}` : ''}`
    : '未连接 / 未配置'
  const lines = [
    '# 双模型 Agent 任务评测',
    '',
    `- 任务集版本：${report.suiteVersion}`,
    `- 开始时间：${report.startedAt}`,
    `- 本机环境：${report.environment.platform}/${report.environment.arch} · Node ${report.environment.node}`,
    `- 模型：${report.model || '未配置'}；运行时：${runtime}`,
    `- 执行环：${report.backends.join('、')}；每项重复 ${report.repeat} 次`,
    '',
    '| 执行环 | 任务 | 尝试 | 通过 | 失败 | 待人工复核 | 未运行/跳过 | 平均轮次 | 平均耗时 ms | 平均 prompt token | 编辑失败 |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ]
  for (const row of report.summary || []) {
    lines.push(`| ${row.backend} | ${row.taskId} ${row.title} | ${row.attempted} | ${row.passed} | ${row.failed} | ${row.needsReview} | ${row.notRun} | ${row.avgTurns ?? '—'} | ${row.avgDurationMs ?? '—'} | ${row.avgPromptTokens ?? '—'} | ${row.editFailures} |`)
  }
  lines.push('', '## 逐次结果', '')
  for (const run of report.runs) {
    lines.push(`- **${run.backend} · ${run.taskId} · 第 ${run.repeat} 次：${run.status}**${run.reason ? ` — ${run.reason}` : ''}`)
    if (run.usage?.total_tokens) {
      lines.push(`  - Token：prompt ${run.usage.prompt_tokens}；completion ${run.usage.completion_tokens}；total ${run.usage.total_tokens}`)
    }
    if (run.error) lines.push(`  - 错误：${run.error.replace(/\s+/g, ' ').slice(0, 300)}`)
    if (run.writeRepairAttempted) {
      lines.push(`  - 零写入补救：已尝试${run.writeRepairPaths?.length ? `；落盘 ${run.writeRepairPaths.join('、')}` : '；仍未落盘'}`)
    }
    for (const assertion of run.assertions || []) {
      lines.push(`  - ${assertion.ok ? '通过' : '未通过'}：${assertion.type}${assertion.detail ? `（${assertion.detail.replace(/\s+/g, ' ').slice(0, 180)}）` : ''}`)
    }
  }
  lines.push('', '> `not_run` / `skipped` 不计入通过率。网络类任务默认跳过；需显式传 `--allow-network`。本报告只证明这些具体模型与执行环在该任务集上的结果，不代表其他供应商能力。', '')
  return `${lines.join('\n')}\n`
}

async function main() {
  if (process.argv.includes('--child')) return runChild()
  const args = parseArgs(process.argv.slice(2).filter((arg) => arg !== '--child'))
  const suite = loadSuite()
  if (args.help) {
    process.stdout.write('用法：npm run eval:agent -- --model <Ollama模型> [--backend both|host|local-mcp] [--repeat 3] [--task E01] [--allow-network] [--keep-workspaces]\n')
    return
  }
  if (args.list || args.dryRun) {
    for (const task of suite.tasks) process.stdout.write(`${task.id}\t${task.category}\t${task.title}${task.requiresNetwork ? '\t[需要 --allow-network]' : ''}\n`)
    if (args.dryRun) {
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-agent-eval-dry-run-'))
      let fileCount = 0
      try {
        for (const task of suite.tasks) {
          const workspace = path.join(scratch, task.id)
          fs.mkdirSync(workspace, { recursive: true })
          writeFixture(task, workspace)
          fileCount += listFiles(workspace).length
        }
      } finally { fs.rmSync(scratch, { recursive: true, force: true }) }
      process.stdout.write(`任务格式有效：${suite.tasks.length} 项，临时夹具 ${fileCount} 个文件；未执行模型或任务命令。\n`)
    }
    return
  }
  const backends = args.backend === 'both' ? ['host', 'local-mcp'] : [args.backend]
  const tasks = args.task ? suite.tasks.filter((task) => task.id === args.task) : suite.tasks
  if (!tasks.length) throw new Error(`未找到任务：${args.task}`)
  const now = new Date().toISOString()
  const report = {
    schemaVersion: 1,
    suiteVersion: suite.version,
    startedAt: now,
    environment: { platform: process.platform, arch: process.arch, node: process.version, ollamaBase: args.ollamaBase || process.env.EVAL_OLLAMA_BASE || process.env.OLLAMA_HOST || DEFAULT_BASE },
    model: args.model || process.env.EVAL_MODEL || '',
    repeat: args.repeat,
    backends,
    runtime: null,
    runs: [],
  }
  const model = report.model
  const ollamaBase = report.environment.ollamaBase
  let availabilityError = ''
  if (!model) availabilityError = '缺少 --model；未执行任何模型任务。'
  else {
    try { report.runtime = await checkOllama(ollamaBase, model) }
    catch (error) { availabilityError = error.message }
  }
  // 同一份报告模拟同一 IDE 安装：任务工作区仍彼此隔离，
  // 但 model:digest 协议策略等用户级状态允许跨任务学习。
  const sharedUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-agent-eval-user-data-'))
  try {
    for (const backend of backends) {
      for (const task of tasks) {
        for (let repeat = 1; repeat <= args.repeat; repeat++) {
          let status = ''
          let reason = ''
          if (!task.backends?.includes(backend) && task.backends) {
            status = 'skipped'
            reason = `任务不适用于 ${backend}`
          } else if (task.requiresNetwork && !args.allowNetwork) {
            status = 'skipped'
            reason = '该任务需要网络；须显式传 --allow-network 才会在临时工作区运行'
          } else if (availabilityError) {
            status = 'not_run'
            reason = availabilityError
          }
          const base = { taskId: task.id, title: task.title, backend, repeat, model: model || null }
          if (status) {
            report.runs.push({ ...base, status, reason, turns: 0, durationMs: 0, toolCallCount: 0, editFailureCount: 0, assertions: [] })
            continue
          }
          const result = await spawnRun({
            task,
            backend,
            model,
            ollamaBase,
            timeoutMs: args.timeoutMs,
            runIndex: repeat,
            keep: args.keep,
            userData: sharedUserData,
          })
          report.runs.push({ ...base, ...result })
        }
      }
    }
  } finally {
    fs.rmSync(sharedUserData, { recursive: true, force: true })
  }
  report.summary = summarize(report.runs)
  report.finishedAt = new Date().toISOString()
  const outDir = path.resolve(ROOT, args.out || '.workbuddy/eval-results')
  fs.mkdirSync(outDir, { recursive: true })
  const safeModel = (model || 'unconfigured').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80)
  const stamp = report.startedAt.replace(/[:.]/g, '-')
  const safeScope = `${backends.join('_')}-${args.task || 'all'}`
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80)
  // 同一毫秒并行启动的不同评测必须写入不同报告，避免互相覆盖。
  const outFile = path.join(outDir, `${stamp}-${safeModel}-${safeScope}-p${process.pid}.json`)
  const markdownFile = outFile.replace(/\.json$/, '.md')
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`)
  fs.writeFileSync(markdownFile, renderMarkdown(report))
  const attempted = report.runs.filter((run) => !['not_run', 'skipped'].includes(run.status)).length
  const failed = report.runs.filter((run) => run.status === 'failed').length
  process.stdout.write(`评测结果：${outFile}\n已尝试 ${attempted}/${report.runs.length} 次，失败 ${failed} 次。\n`)
  if (availabilityError) process.stdout.write(`未执行原因：${availabilityError}\n`)
  if (failed) process.exitCode = 1
  else if (attempted < report.runs.length || report.runs.some((run) => run.status === 'needs_review')) process.exitCode = 2
  process.stdout.write(`摘要：${markdownFile}\n`)
}

if (CHILD_TASK) {
  runChild().catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`)
    process.exitCode = 1
  })
} else {
  main().catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`)
    process.exitCode = 1
  })
}
