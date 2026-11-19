/**
 * 包装 MCP 闸门 + Agent 失败 tip 单元测试进门禁
 * node scripts/check-mcp-cli-gate.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tests = [
  path.join(root, 'web/src/lib/mcp-cli-gate.test.mjs'),
  path.join(root, 'web/src/lib/agent-failure-hint.test.mjs'),
]

for (const testFile of tests) {
  const r = spawnSync(
    process.execPath,
    ['--experimental-strip-types', testFile],
    {
      cwd: root,
      encoding: 'utf8',
      env: process.env,
    },
  )
  if (r.stdout) process.stdout.write(r.stdout)
  if (r.stderr) process.stderr.write(r.stderr)
  if (r.status !== 0) {
    console.error(`\ncheck-mcp-cli-gate: FAILED (${path.basename(testFile)})`)
    process.exit(r.status || 1)
  }
}
console.log('check-mcp-cli-gate: PASSED')
