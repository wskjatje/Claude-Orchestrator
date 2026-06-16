import fs from 'node:fs'
import path from 'node:path'
import { PROJECT_ROOT } from './paths.mjs'

const CATALOG_PATH = path.join(PROJECT_ROOT, 'docs/claude-orchestrator/frontend-apps.catalog.json')
const APPS_DOC_PATH = path.join(PROJECT_ROOT, 'docs/claude-orchestrator-apps.md')

export function loadFrontendAppCatalog() {
  try {
    const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
    if (!raw || typeof raw !== 'object') return null
    return raw
  } catch {
    return null
  }
}

function formatAppLine(app) {
  const route = String(app.route || '').trim()
  const name = String(app.name || '未命名').trim()
  const desc = String(app.description || '').trim()
  const routePart = route ? ` \`${route}\`` : ''
  return `- **${name}**${routePart}：${desc}`
}

/** Git 提交正文：前端应用说明（Markdown） */
export function buildFrontendAppsCommitSection(catalog = loadFrontendAppCatalog()) {
  if (!catalog?.groups?.length) {
    return '## Claude Orchestrator 前端应用\n\n（应用目录未配置）'
  }
  const lines = [`## ${catalog.productName || 'Claude Orchestrator'} 前端应用`, '']
  if (catalog.tagline) {
    lines.push(String(catalog.tagline).trim(), '')
  }
  for (const group of catalog.groups) {
    const label = String(group.label || '').trim()
    if (label) lines.push(`### ${label}`, '')
    for (const app of group.apps || []) {
      lines.push(formatAppLine(app))
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

/** 写入 docs/claude-orchestrator-apps.md，供 GitHub 仓库 README 式阅读 */
export function exportFrontendAppsDoc(catalog = loadFrontendAppCatalog()) {
  if (!catalog?.groups?.length) {
    return { ok: false, error: '未找到前端应用目录配置', path: null }
  }

  const product = catalog.productName || 'Claude Orchestrator'
  const lines = [
    `# ${product} 前端应用`,
    '',
    String(catalog.tagline || '').trim(),
    '',
  ]
  if (catalog.stack) {
    lines.push(`**技术栈**：${String(catalog.stack).trim()}`, '')
  }
  lines.push(
    '> 本文档在推送到个人 GitHub 时自动更新，与应用侧栏导航一致。',
    '',
    '## 应用一览',
    '',
  )

  for (const group of catalog.groups) {
    const label = String(group.label || '').trim()
    if (label) lines.push(`### ${label}`, '')
    for (const app of group.apps || []) {
      const route = String(app.route || '').trim()
      const name = String(app.name || '未命名').trim()
      const desc = String(app.description || '').trim()
      lines.push(`#### ${name}${route ? ` \`${route}\`` : ''}`, '', desc, '')
    }
  }

  lines.push(
    '## 本地运行',
    '',
    '```bash',
    'npm run web:dev:full   # Web + 本机 Bridge',
    'npm run desktop        # Electron 桌面版',
    '```',
    '',
  )

  fs.mkdirSync(path.dirname(APPS_DOC_PATH), { recursive: true })
  fs.writeFileSync(APPS_DOC_PATH, `${lines.join('\n').trimEnd()}\n`, 'utf8')
  return {
    ok: true,
    path: path.relative(PROJECT_ROOT, APPS_DOC_PATH).replace(/\\/g, '/'),
  }
}
