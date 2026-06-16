import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  PROJECT_ROOT,
  orchestrationChainsDir,
  orchestrationChainsIndexPath,
} from './paths.mjs'
import { loadChatSettings } from './store.mjs'
import {
  collapseHome,
  normalizeMcpServerEntry,
  readMcpConfigFile,
} from './claude-mcp-config.mjs'
import { exportFrontendAppsDoc } from './frontend-app-catalog.mjs'

const AGENTS_SRC = path.join(os.homedir(), '.claude', 'agents')
const SKILLS_SRC = path.join(os.homedir(), '.claude', 'skills')
const AGENTS_DEST = path.join(PROJECT_ROOT, 'docs', 'agents')
const SKILLS_DEST = path.join(PROJECT_ROOT, 'docs', 'skills')
const CHAINS_DEST = path.join(PROJECT_ROOT, 'docs', 'chains')
const MCP_DEST = path.join(PROJECT_ROOT, '.mcp.json')

const SENSITIVE_ENV_KEY = /(?:api[_-]?key|secret|token|password|credential|auth(?:orization)?)/i

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

function sanitizeMcpServerConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg
  const next = { ...cfg }
  if (Array.isArray(next.args)) {
    next.args = next.args.map((a) => collapseHome(String(a)))
  }
  if (next.url) next.url = String(next.url)
  if (next.env && typeof next.env === 'object') {
    const env = {}
    for (const [k, v] of Object.entries(next.env)) {
      if (SENSITIVE_ENV_KEY.test(k)) continue
      env[k] = collapseHome(String(v))
    }
    if (Object.keys(env).length) next.env = env
    else delete next.env
  }
  return normalizeMcpServerEntry(next)
}

function exportSanitizedMcpConfig() {
  const settings = loadChatSettings()
  const read = readMcpConfigFile(settings.mcpConfigAbsolutePath)
  if (!read.ok) {
    return { ok: false, error: read.error || '无法读取 MCP 配置', exported: false }
  }
  const servers = read.data?.mcpServers
  if (!servers || typeof servers !== 'object' || !Object.keys(servers).length) {
    if (fs.existsSync(MCP_DEST)) {
      fs.unlinkSync(MCP_DEST)
    }
    return { ok: true, exported: false, path: null, reason: '无 MCP 服务器配置' }
  }

  const mcpServers = {}
  for (const [name, cfg] of Object.entries(servers)) {
    if (!cfg || typeof cfg !== 'object') continue
    if (cfg.disabled === true) {
      mcpServers[name] = { ...sanitizeMcpServerConfig(cfg), disabled: true }
    } else {
      mcpServers[name] = sanitizeMcpServerConfig(cfg)
    }
  }

  if (!Object.keys(mcpServers).length) {
    if (fs.existsSync(MCP_DEST)) fs.unlinkSync(MCP_DEST)
    return { ok: true, exported: false, path: null, reason: '无有效 MCP 条目' }
  }

  const payload = { mcpServers }
  fs.writeFileSync(MCP_DEST, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return {
    ok: true,
    exported: true,
    path: path.relative(PROJECT_ROOT, MCP_DEST).replace(/\\/g, '/'),
    serverCount: Object.keys(mcpServers).length,
  }
}

function normalizeChainSteps(steps) {
  if (!Array.isArray(steps)) return []
  return steps
    .map((s) => ({
      agentName: String(s?.agentName ?? '').trim(),
      taskId: String(s?.taskId ?? '').trim(),
      instruction: String(s?.instruction ?? '').trim(),
      skills: Array.isArray(s?.skills)
        ? s.skills.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [],
      mcps: Array.isArray(s?.mcps)
        ? s.mcps.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [],
    }))
    .filter((s) => s.agentName && s.instruction)
}

function sanitizeChainRecordForExport(record) {
  if (!record || typeof record !== 'object') return null
  const id = String(record.id || '').trim()
  if (!id) return null
  const state = record.state && typeof record.state === 'object' ? record.state : {}
  return {
    id,
    name: String(record.name || '未命名任务链').trim(),
    description: String(record.description || '').trim(),
    category:
      record.category === 'single' || record.category === 'pipeline'
        ? record.category
        : 'custom',
    enabled: record.enabled !== false,
    templateId: record.templateId ? String(record.templateId) : null,
    official: id.startsWith('official-'),
    userModified: Boolean(record.userModified),
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    state: {
      status: 'idle',
      currentIndex: 0,
      steps: normalizeChainSteps(state.steps),
    },
  }
}

function resetExportDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  ensureDir(dir)
}

function exportOrchestrationChains() {
  const srcDir = orchestrationChainsDir()
  if (!fs.existsSync(srcDir)) {
    return { ok: true, exported: false, chains: [], count: 0, reason: '无任务链目录' }
  }

  const chainFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'))
  if (!chainFiles.length) {
    if (fs.existsSync(CHAINS_DEST)) {
      fs.rmSync(CHAINS_DEST, { recursive: true, force: true })
    }
    return { ok: true, exported: false, chains: [], count: 0, reason: '无任务链' }
  }

  resetExportDir(CHAINS_DEST)
  const copied = []
  const summaries = []

  for (const file of chainFiles) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'))
      const sanitized = sanitizeChainRecordForExport(raw)
      if (!sanitized || !sanitized.state.steps.length) continue
      const dest = path.join(CHAINS_DEST, `${sanitized.id}.json`)
      fs.writeFileSync(dest, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf8')
      const rel = path.relative(PROJECT_ROOT, dest).replace(/\\/g, '/')
      copied.push(rel)
      summaries.push({
        id: sanitized.id,
        name: sanitized.name,
        description: sanitized.description,
        category: sanitized.category,
        enabled: sanitized.enabled,
        stepCount: sanitized.state.steps.length,
      })
    } catch {
      /* skip invalid chain file */
    }
  }

  if (!copied.length) {
    fs.rmSync(CHAINS_DEST, { recursive: true, force: true })
    return { ok: true, exported: false, chains: [], count: 0, reason: '无有效任务链' }
  }

  const indexPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    activeChainId: null,
    chains: summaries,
  }

  const indexPath = orchestrationChainsIndexPath()
  if (fs.existsSync(indexPath)) {
    try {
      const localIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
      if (Array.isArray(localIndex?.chains) && localIndex.chains.length) {
        const byId = new Map(summaries.map((row) => [row.id, row]))
        indexPayload.chains = localIndex.chains
          .map((row) => {
            const id = String(row?.id || '').trim()
            return byId.get(id) || null
          })
          .filter(Boolean)
        if (!indexPayload.chains.length) indexPayload.chains = summaries
      }
    } catch {
      /* use summaries only */
    }
  }

  const indexDest = path.join(CHAINS_DEST, 'index.json')
  fs.writeFileSync(indexDest, `${JSON.stringify(indexPayload, null, 2)}\n`, 'utf8')
  copied.push(path.relative(PROJECT_ROOT, indexDest).replace(/\\/g, '/'))

  return {
    ok: true,
    exported: true,
    chains: copied,
    count: summaries.length,
    path: path.relative(PROJECT_ROOT, CHAINS_DEST).replace(/\\/g, '/'),
  }
}

/**
 * 推送个人 GitHub 前：将 ~/.claude/agents、skills、任务链与脱敏 MCP 写入仓库可提交路径。
 * 本地模型/API/会话/日志/项目记录等由 resetPersonalWorkbenchData 清空，.claudecode 仍不入库。
 */
export function exportPersonalGithubArtifacts() {
  ensureDir(AGENTS_DEST)
  ensureDir(SKILLS_DEST)

  const agents = copyMarkdownTree(AGENTS_SRC, AGENTS_DEST)
  const skills = copyMarkdownTree(SKILLS_SRC, SKILLS_DEST)
  const chains = exportOrchestrationChains()
  const mcp = exportSanitizedMcpConfig()
  const appsDoc = exportFrontendAppsDoc()

  const paths = [...agents, ...skills, ...(chains.chains || [])]
  if (mcp.exported && mcp.path) paths.push(mcp.path)
  if (appsDoc.ok && appsDoc.path) paths.push(appsDoc.path)

  const summary = []
  if (agents.length) summary.push(`${agents.length} 个 Agent → docs/agents/`)
  if (skills.length) summary.push(`${skills.length} 个 Skill → docs/skills/`)
  if (chains.exported && chains.count) {
    summary.push(`${chains.count} 条任务链 → docs/chains/`)
  }
  if (mcp.exported) summary.push(`${mcp.serverCount} 个 MCP → .mcp.json`)
  if (appsDoc.ok) summary.push('前端应用说明 → docs/claude-orchestrator-apps.md')
  if (!summary.length) {
    summary.push('（未找到可导出的 Agent/Skill/任务链/MCP，仅推送其它已跟踪变更）')
  }

  return {
    ok: mcp.ok !== false,
    error: mcp.error,
    agents,
    skills,
    chains,
    mcp,
    appsDoc,
    paths,
    summary: summary.join('；'),
  }
}
