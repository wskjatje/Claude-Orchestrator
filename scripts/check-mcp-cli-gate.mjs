/**
 * 包装 web/src/lib/mcp-cli-gate.test.mjs 进门禁
 * node scripts/check-mcp-cli-gate.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const testFile = path.join(root, 'web/src/lib/mcp-cli-gate.test.mjs')
const r = spawnSync(process.execPath, [testFile], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
if (r.status !== 0) {
  console.error('\ncheck-mcp-cli-gate: FAILED')
  process.exit(r.status || 1)
}
console.log('check-mcp-cli-gate: PASSED')
