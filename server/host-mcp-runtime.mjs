import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  connectMergedMcpAndBuildTools,
  execute_tool_invocation,
} = require('./vendor/cad/local-mcp-orchestrator.js')

const HOST_MCP_TOOL_CAP = 40
const MUTATION_RE = /(?:^|_)(?:write|edit|create|update|delete|remove|move|rename|add|append|insert|execute|run|send|post|put|patch|drop|alter|upsert|set|store)(?:_|$)/i

export function toHostMcpCallName(localName) {
  return `mcp__${String(localName || '').replace(/[^A-Za-z0-9_.-]+/g, '_')}`
}

export function isHostMcpMutationTool(name) {
  return MUTATION_RE.test(String(name || ''))
}

/** Host 模型共用的 MCP 只读运行时；写工具不进入模型 schema。 */
export async function connectHostMcpRuntime(options) {
  const connected = await connectMergedMcpAndBuildTools({
    bundledMcpServerJs: '',
    ollamaBase: '',
    shouldAbort: () => Boolean(options.signal?.aborted),
    mcpConfigAbsolutePath: options.mcpConfigAbsolutePath,
    allowedMcpServerIds: options.allowedMcpServerIds,
    workspaceRoot: options.workspaceRoot,
    includeBundledOllamaLocal: false,
  })

  const routes = new Map()
  const tools = []
  for (const tool of connected.ollamaTools || []) {
    const localName = String(tool?.function?.name || '')
    const route = connected.routeByPrefixed.get(localName)
    if (!route || isHostMcpMutationTool(route.originalToolName)) continue
    const callName = toHostMcpCallName(localName)
    routes.set(callName, route)
    tools.push({
      type: 'function',
      function: {
        ...tool.function,
        name: callName,
        description: `MCP 只读工具。${String(tool.function.description || '')}`.slice(0, 180),
      },
    })
    if (tools.length >= HOST_MCP_TOOL_CAP) break
  }

  return {
    tools,
    routes,
    connections: connected.connections || [],
    warnings: connected.connectErrors || [],
    async call(name, args, signal) {
      const result = await execute_tool_invocation({
        name,
        arguments: args && typeof args === 'object' ? args : {},
        routeByPrefixed: routes,
        workspaceRoot: options.workspaceRoot,
        signal,
      })
      let parsed = null
      try { parsed = JSON.parse(result.toolText) } catch { /* ordinary text result */ }
      const textFailure = /^(?:error|failed|refused|permission denied|工具调用失败|调用失败)\b/i.test(
        String(result.toolText || '').trim(),
      )
      const failed = Boolean(result.error) || parsed?.ok === false || textFailure
      return {
        ok: !failed,
        output: result.toolText,
        error:
          result.error ||
          (parsed?.ok === false ? parsed.error || 'MCP 工具失败' : null) ||
          (textFailure ? String(result.toolText || '').slice(0, 1000) : null),
        executionMs: result.executionMs,
      }
    },
    async close() {
      for (const connection of connected.connections || []) {
        try { await connection.client.close() } catch { /* best effort */ }
      }
    },
  }
}
