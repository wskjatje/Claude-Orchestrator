import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  toHostMcpCallName,
  isHostMcpMutationTool,
} from '../server/host-mcp-runtime.mjs'

assert.equal(toHostMcpCallName('filesystem__read_file'), 'mcp__filesystem__read_file')
for (const name of [
  'write_file', 'edit_file', 'move_file', 'delete_file', 'apply_patch',
  'create_entities', 'add_observations', 'write_query', 'append_insight',
]) {
  assert.equal(isHostMcpMutationTool(name), true, `${name} must stay behind Host edit engine`)
}
for (const name of ['read_file', 'list_directory', 'fetch', 'read_query', 'search_nodes']) {
  assert.equal(isHostMcpMutationTool(name), false, `${name} should remain callable`)
}

const root = process.cwd()
const host = fs.readFileSync(path.join(root, 'server/host-agent-loop.mjs'), 'utf8')
const bridge = fs.readFileSync(path.join(root, 'server/handlers.mjs'), 'utf8')
const send = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
assert.match(host, /connectHostMcpRuntime/)
assert.match(host, /activeTools = \[\.\.\.TOOLS, \.\.\.mcpRuntime\.tools\]/)
assert.match(host, /ctx\.mcpRuntime\?\.routes\?\.has\(name\)/)
assert.match(bridge, /allowedMcpServers/)
assert.match(send, /allowedMcpServers: mcpNamesRequiringCli/)
assert.doesNotMatch(send, /wantsUnifiedAgentLoop\s*&&\s*!blockHostWhenMcpEnabled/)

console.log('check-host-mcp-runtime: ok')
