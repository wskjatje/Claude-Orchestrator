#!/usr/bin/env node
/**
 * CI 分包：热点 UI/门控文件 eslint。
 * 关闭 prettier/prettier（格式债另治），只拦语法/hooks 等真实问题。
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  'src/routes/agents.tsx',
  'src/routes/skills.tsx',
  'src/components/models-connections-panel.tsx',
  'src/components/global-chat-panel.tsx',
  'src/components/composer-session-chip.tsx',
  'src/hooks/use-desktop-ready.tsx',
  'src/lib/sidebar-connection-label.ts',
]

const r = spawnSync(
  'npx',
  [
    'eslint',
    '--max-warnings',
    '0',
    '--rule',
    'prettier/prettier: off',
    '--rule',
    'react-refresh/only-export-components: off',
    ...files,
  ],
  { cwd: path.join(root, 'web'), encoding: 'utf8', shell: process.platform === 'win32' },
)

if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)

if (r.status !== 0) {
  console.error('check-eslint-hot: FAILED')
  process.exit(r.status || 1)
}
console.log('check-eslint-hot: PASSED')
