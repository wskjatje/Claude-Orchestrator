'use strict'

const path = require('node:path')

/**
 * SQLite、运行日志与编排状态的唯一数据目录解析。
 * 打包应用由 Electron 注入 userData；开发态才落在仓库 .claudecode。
 */
function resolveProjectDataPaths(env = process.env, serverDir = __dirname) {
  const configuredRoot = String(env.CLAUDE_ORCHESTRATOR_PROJECT_ROOT || '').trim()
  const projectRoot = configuredRoot
    ? path.resolve(configuredRoot)
    : path.join(serverDir, '..')
  const userData = String(env.CLAUDE_ORCHESTRATOR_USER_DATA || '').trim()
  const projectDataDir = userData
    ? path.join(path.resolve(userData), '.claudecode')
    : path.join(projectRoot, '.claudecode')
  return {
    projectRoot,
    projectDataDir,
    projectDbPath: path.join(projectDataDir, 'workbench.db'),
  }
}

module.exports = {
  resolveProjectDataPaths,
  ...resolveProjectDataPaths(),
}
