import { createRequire } from 'node:module'
import { PROJECT_DATA_DIR } from '../server/paths.mjs'

const require = createRequire(import.meta.url)
const {
  loadWorkspaceCheckpoint,
  restoreWorkspaceCheckpoint,
} = require('../server/workspace-checkpoint.cjs')

const id = String(process.argv[2] || '').trim()
try {
  const checkpoint = loadWorkspaceCheckpoint(PROJECT_DATA_DIR, id)
  const result = restoreWorkspaceCheckpoint(checkpoint)
  if (result.failed.length) {
    console.error(`检查点 ${checkpoint.id}：已恢复 ${result.restored.length} 个文件，${result.failed.length} 个文件未覆盖。`)
    for (const item of result.failed) console.error(`- ${item.path || '(未知路径)'}：${item.error}`)
    process.exitCode = 1
  } else {
    console.log(`检查点 ${checkpoint.id}：已恢复 ${result.restored.length} 个文件。`)
  }
} catch (error) {
  console.error(`无法恢复检查点：${error?.message || String(error)}`)
  process.exitCode = 1
}
