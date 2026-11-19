import assert from 'node:assert/strict'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { connectHostMcpRuntime } from '../server/host-mcp-runtime.mjs'

const root = process.cwd()
const configPath = path.resolve(process.env.MCP_CONFIG || path.join(root, '.mcp.json'))
const controller = new AbortController()
const connectedAt = performance.now()
const runtime = await connectHostMcpRuntime({
  workspaceRoot: root,
  mcpConfigAbsolutePath: configPath,
  allowedMcpServerIds: ['memory'],
  signal: controller.signal,
})

try {
  const connectMs = Math.round(performance.now() - connectedAt)
  assert.equal(runtime.connections.length, 1, 'one selected MCP server must create one connection')
  assert.equal(runtime.routes.has('mcp__memory__read_graph'), true, 'memory.read_graph must be routed')

  const calls = []
  for (let index = 0; index < 2; index += 1) {
    const startedAt = performance.now()
    const result = await runtime.call('mcp__memory__read_graph', {}, controller.signal)
    calls.push({ ms: Math.round(performance.now() - startedAt), ok: result.ok })
    assert.equal(result.ok, true, result.error || `memory.read_graph call ${index + 1} failed`)
  }

  assert.equal(runtime.connections.length, 1, 'repeated calls must reuse the original connection')
  assert.ok(calls[1].ms < Math.max(100, connectMs), 'the second call must not pay another connection startup cost')
  console.log(`check-host-mcp-reuse: ok (connect ${connectMs}ms, calls ${calls.map((item) => `${item.ms}ms`).join('/')}, 1 connection)`)
} finally {
  await runtime.close()
}
