import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { PROJECT_ROOT } from './paths.mjs'
import { loadChatSettings } from './store.mjs'
import {
  bundledSanshengliubuMcpServerPath,
  expandHome,
  normalizeMcpServerEntry,
  readMcpConfigFile,
  writeMcpConfigFile,
} from './claude-mcp-config.mjs'

const require = createRequire(import.meta.url)
const chainsApi = require('./orchestration-chains.cjs')

const AGENTS_SRC = path.join(PROJECT_ROOT, 'docs', 'agents')
const SKILLS_SRC = path.join(PROJECT_ROOT, 'docs', 'skills')
const CHAINS_SRC = path.join(PROJECT_ROOT, 'docs', 'chains')
const MCP_SRC = path.join(PROJECT_ROOT, '.mcp.json')

const AGENTS_DEST = path.join(os.homedir(), '.claude', 'agents')
const SKILLS_DEST = path.join(os.homedir(), '.claude', 'skills')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyMarkdownTree(srcDir, destDir) {
  const copied = []
  if (!fs.existsSync(srcDir)) return copied

  function walk(rel = '') {
    const abs = rel ? path.join(srcDir, rel) : srcDir
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? path.join(rel, ent.name) : ent.name
      if (ent.isDirectory()) {
        walk(childRel)
        continue
      }
      if (!ent.isFile() || !/\.md$/i.test(ent.name)) continue
      if (ent.name.startsWith('.') || ent.name === '.md') continue
      const from = path.join(srcDir, childRel)
      const to = path.join(destDir, childRel)
      ensureDir(path.dirname(to))
      fs.copyFileSync(from, to)
      copied.push(path.relative(PROJECT_ROOT, to).replace(/\\/g, '/'))
    }
  }

  walk()
  return copied
}

function normalizeImportedMcpServer(name, cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg
  const next = { ...cfg }
  if (Array.isArray(next.args)) {
    next.args = next.args.map((a) => expandHome(String(a)))
  }
  if (name === 'sanshengliubu' && String(next.command || '').trim() === 'node') {
    next.args = [bundledSanshengliubuMcpServerPath()]
  }
  return normalizeMcpServerEntry(next)
}

function importMcpFromRepo(customPath) {
  if (!fs.existsSync(MCP_SRC)) {
    return { ok: true, imported: 0, path: null, reason: '无 .mcp.json' }
  }
  let repoData
  try {
    repoData = JSON.parse(fs.readFileSync(MCP_SRC, 'utf8'))
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), imported: 0 }
  }
  const servers = repoData?.mcpServers
  if (!servers || typeof servers !== 'object' || !Object.keys(servers).length) {
    return { ok: true, imported: 0, path: null, reason: '无 MCP 服务器配置' }
  }

  const read = readMcpConfigFile(customPath)
  if (!read.ok) return { ok: false, error: read.error || '无法读取 MCP 配置', imported: 0 }
  const data = read.data || { mcpServers: {} }
  if (!data.mcpServers || typeof data.mcpServers !== 'object') data.mcpServers = {}

  let imported = 0
  for (const [name, cfg] of Object.entries(servers)) {
    if (!cfg || typeof cfg !== 'object') continue
    data.mcpServers[name] = normalizeImportedMcpServer(name, cfg)
    imported += 1
  }

  const written = writeMcpConfigFile(customPath, data)
  return { ok: true, imported, path: written.path }
}

function loadChainRecordsFromDocs() {
  if (!fs.existsSync(CHAINS_SRC)) {
    return { ok: true, records: [], reason: '无 docs/chains 目录' }
  }
  const records = []
  for (const file of fs.readdirSync(CHAINS_SRC)) {
    if (!file.endsWith('.json') || file === 'index.json') continue
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(CHAINS_SRC, file), 'utf8'))
      if (raw && typeof raw === 'object' && raw.id) records.push(raw)
    } catch {
      /* skip invalid */
    }
  }
  return { ok: true, records }
}

/**
 * 将仓库内 docs/agents、docs/skills、docs/chains、.mcp.json 部署到本机运行目录。
 * 与 push 前 exportPersonalGithubArtifacts 互为逆操作。
 */
export function importPersonalGithubArtifacts(opts = {}) {
  ensureDir(AGENTS_DEST)
  ensureDir(SKILLS_DEST)

  const agents = copyMarkdownTree(AGENTS_SRC, AGENTS_DEST)
  const skills = copyMarkdownTree(SKILLS_SRC, SKILLS_DEST)

  const chainLoad = loadChainRecordsFromDocs()
  const chainImport = chainLoad.records?.length
    ? chainsApi.importOrchestrationChainRecords(chainLoad.records, {
        overwrite: opts.overwrite !== false,
      })
    : { ok: true, imported: 0, skipped: 0, results: [] }

  const settings = loadChatSettings()
  const mcp = importMcpFromRepo(settings.mcpConfigAbsolutePath)

  const summary = []
  if (agents.length) summary.push(`${agents.length} 个 Agent → ~/.claude/agents/`)
  if (skills.length) summary.push(`${skills.length} 个 Skill → ~/.claude/skills/`)
  if (chainImport.imported) {
    summary.push(`${chainImport.imported} 条任务链 → .claudecode/orchestration/chains/`)
  } else if (chainImport.skipped) {
    summary.push(`任务链 ${chainImport.skipped} 条跳过（本地已改或无步骤）`)
  }
  if (mcp.imported) summary.push(`${mcp.imported} 个 MCP → ${mcp.path || 'MCP 配置'}`)
  if (!summary.length) {
    summary.push('（仓库内未找到可部署的 Agent/Skill/任务链/MCP）')
  }

  const ok = chainImport.ok !== false && mcp.ok !== false
  return {
    ok,
    error: !ok ? chainImport.error || mcp.error : undefined,
    agents,
    skills,
    chains: chainImport,
    mcp,
    summary: summary.join('；'),
  }
}
