import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, 'server/vendor/cad/local-mcp-orchestrator.js')
if (!fs.existsSync(target)) {
  throw new Error(`本地 MCP 编排文件不存在：${path.relative(root, target)}；请先运行 npm run vendor:install`)
}

let source = fs.readFileSync(target, 'utf8')
let changed = false

function replaceOnce(pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`vendor MCP 文件结构不匹配，无法应用协议补丁：${label}`)
  source = source.replace(pattern, replacement)
  changed = true
}

if (!source.includes("require('../../../shared/tool-call-protocol.cjs')")) {
  replaceOnce(
    /(const \{ StdioClientTransport \} = require\([^\n]+\)\s*\n)/,
    "$1const toolCallProtocol = require('../../../shared/tool-call-protocol.cjs')\n",
    '共享协议模块引用',
  )
}

if (!source.includes("require('../../../shared/ollama-stream.cjs')")) {
  replaceOnce(
    /(const toolCallProtocol = require\([^\n]+\)\s*\n)/,
    "$1const ollamaStream = require('../../../shared/ollama-stream.cjs')\n",
    'Ollama 增量拼接模块引用',
  )
}

if (!source.includes('ollamaStream.appendOllamaIncrement(content, delta, onDelta)')) {
  replaceOnce(
    /    let piece = delta\n    if \(content && delta\.startsWith\(content\)\) piece = delta\.slice\(content\.length\)\n    else if \(content && content\.endsWith\(delta\)\) piece = ''\n    if \(piece\) \{\n      content \+= piece\n      if \(typeof onDelta === 'function'\) onDelta\(piece\)\n    \} else if \(!content && delta\) \{\n      content = delta\n      if \(typeof onDelta === 'function'\) onDelta\(delta\)\n    \}/,
    '    content = ollamaStream.appendOllamaIncrement(content, delta, onDelta)',
    'Ollama 流式增量无损拼接',
  )
}

function replaceFunction(name, replacement, label) {
  if (source.includes(`function ${name}(`) && source.includes(`return toolCallProtocol.${label}(`)) return
  const pattern = new RegExp(`function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}`)
  if (!pattern.test(source)) throw new Error(`vendor MCP 文件中找不到 ${name}，无法应用协议补丁`)
  source = source.replace(pattern, replacement)
  changed = true
}

replaceFunction(
  'parseOllamaAssistantMessageForTools',
  'function parseOllamaAssistantMessageForTools(data, knownNames) {\n  return toolCallProtocol.parseAssistantToolMessage(data, knownNames)\n}',
  'parseAssistantToolMessage',
)
replaceFunction(
  'normalizeToolCallsList',
  'function normalizeToolCallsList(raw, knownNames) {\n  return toolCallProtocol.normalizeToolCalls(raw, knownNames)\n}',
  'normalizeToolCalls',
)

if (!source.includes('inputSchema: r.inputSchema')) {
  replaceOnce(
    /rows\.map\(\(r\) => \[r\.prefixed, \{ client: r\.client, originalToolName: r\.originalToolName \}\]\)/,
    'rows.map((r) => [r.prefixed, { client: r.client, originalToolName: r.originalToolName, inputSchema: r.inputSchema }])',
    'MCP 工具 schema 路由',
  )
}

if (!source.includes('toolCallProtocol.validateToolArguments(p.arguments, route.inputSchema)')) {
  replaceOnce(
    /(    mcpDebugLine\(\n      `execute_tool_invocation:)/,
    "    if (route.inputSchema && typeof route.inputSchema === 'object') {\n      const validation = toolCallProtocol.validateToolArguments(p.arguments, route.inputSchema)\n      if (!validation.ok) return `工具调用失败：参数无效，${validation.error}`\n    }\n$1",
    'MCP 执行前参数校验',
  )
}

if (!source.includes("{ signal: toolController.signal }")) {
  replaceOnce(
    /  const ms = typeof p\.toolExecutionTimeoutMs === 'number' && p\.toolExecutionTimeoutMs > 0 \? p\.toolExecutionTimeoutMs : 120_000\n/,
    "$&  const toolController = new AbortController()\n  const abortFromParent = () => toolController.abort(p.signal?.reason)\n  if (p.signal?.aborted) abortFromParent()\n  else p.signal?.addEventListener('abort', abortFromParent, { once: true })\n",
    'MCP 调用取消信号',
  )
  replaceOnce(
    /    const tr = await route\.client\.callTool\(\{\n      name: route\.originalToolName,\n      arguments: p\.arguments,\n    \}\)/,
    "    const tr = await route.client.callTool(\n      { name: route.originalToolName, arguments: p.arguments },\n      undefined,\n      { signal: toolController.signal },\n    )",
    'MCP SDK AbortSignal',
  )
  replaceOnce(
    /  try \{\n    toolText = await Promise\.race\(\[\n      run\(\),\n      new Promise\(\(_, rej\) => setTimeout\(\(\) => rej\(new Error\(`工具执行超时（>\$\{ms\}ms）`\)\), ms\)\),\n    \]\)/,
    "  let timeoutId\n  try {\n    toolText = await Promise.race([\n      run(),\n      new Promise((_, rej) => {\n        timeoutId = setTimeout(() => {\n          toolController.abort(new Error(`工具执行超时（>${ms}ms）`))\n          rej(new Error(`工具执行超时（>${ms}ms）`))\n        }, ms)\n      }),\n    ])",
    'MCP 超时中止底层调用',
  )
  replaceOnce(
    /  const executionMs = Date\.now\(\) - t0\n/,
    "  clearTimeout(timeoutId)\n  p.signal?.removeEventListener('abort', abortFromParent)\n  const executionMs = Date.now() - t0\n",
    'MCP 取消监听清理',
  )
  replaceOnce(
    /( \*   workspaceRoot\?: string\n)/,
    '$1 *   signal?: AbortSignal\n',
    'MCP 调用信号参数',
  )
  // The call site is patched separately to keep compatibility with upstream formatting.
  if (!source.includes('signal: ac.signal')) {
    replaceOnce(
      /(        const execResult = await execute_tool_invocation\(\{[\s\S]*?          workspaceRoot,\n)(        \}\))/,
      '$1          signal: ac.signal,\n$2',
      'MCP 执行信号接线',
    )
  }
  changed = true
}

if (!source.includes('toolName: name')) {
  replaceOnce(
    /(name: trailLabel,\n)/g,
    '$1              toolName: name,\n',
    'MCP 原始工具名事件',
  )
}

if (changed) fs.writeFileSync(target, source, 'utf8')
process.stdout.write(changed ? '已将共享工具协议补丁应用到本地 MCP 编排文件。\n' : '本地 MCP 编排文件已包含共享工具协议补丁。\n')
