import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** 仓库根目录（claudecode 项目） */
export const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 项目内持久化目录：SQLite + 编排链文件 + 日志（不写入浏览器缓存） */
export const PROJECT_DATA_DIR = path.join(PROJECT_ROOT, '.claudecode')

export const PROJECT_DB_PATH = path.join(PROJECT_DATA_DIR, 'workbench.db')

/** 旧版全局 JSON 目录，仅用于一次性迁移 */
export const LEGACY_DATA_DIR = path.join(os.homedir(), '.claude-workbench')

export const DEFAULT_WORKSPACE =
  process.env.WORKBENCH_WORKSPACE?.trim() ||
  PROJECT_ROOT

export const DEFAULT_CLAUDE_CLI =
  process.env.WORKBENCH_CLAUDE_CLI?.trim() || '/opt/homebrew/bin/claude'

export function ensureProjectDataDir() {
  fs.mkdirSync(PROJECT_DATA_DIR, { recursive: true })
}

/** @deprecated 使用 PROJECT_DATA_DIR */
export const DATA_DIR = LEGACY_DATA_DIR

export function ensureDataDir() {
  ensureProjectDataDir()
}

export function orchestrationChainPath() {
  return {
    primary: path.join(PROJECT_DATA_DIR, 'orchestration', 'active-chain.json'),
    legacy: path.join(LEGACY_DATA_DIR, 'orchestration', 'active-chain.json'),
  }
}

export function orchestrationChainsDir() {
  return path.join(PROJECT_DATA_DIR, 'orchestration', 'chains')
}

export function orchestrationChainsIndexPath() {
  return path.join(PROJECT_DATA_DIR, 'orchestration', 'chains-index.json')
}

export function appLogFilePath() {
  return path.join(PROJECT_DATA_DIR, 'logs', 'app.log')
}

export function dailyReportsDir() {
  return path.join(PROJECT_DATA_DIR, 'daily-reports')
}

export function scheduledTasksPath() {
  return path.join(PROJECT_DATA_DIR, 'scheduled-tasks.json')
}

export function readGlobalClaudeEnv() {
  try {
    const p = path.join(os.homedir(), '.claude', 'settings.json')
    const data = JSON.parse(fs.readFileSync(p, 'utf8'))
    return data?.env && typeof data.env === 'object' ? data.env : {}
  } catch {
    return {}
  }
}

export function globalDefaultModel() {
  const env = readGlobalClaudeEnv()
  const m =
    env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL ||
    'gemini-2.5-flash'
  return String(m).trim() || 'gemini-2.5-flash'
}
