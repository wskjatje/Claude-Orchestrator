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

function appTitle(app) {
  const route = String(app.route || '').trim()
  const name = String(app.name || '未命名').trim()
  return route ? `**${name}** \`${route}\`` : `**${name}**`
}

function formatAppBlock(app, { indentFeatures = true } = {}) {
  const lines = []
  const summary = String(app.summary || '').trim()
  const desc = String(app.description || '').trim()
  const head = summary ? `${appTitle(app)} — ${summary}` : appTitle(app)
  lines.push(`- ${head}${desc ? `：${desc}` : ''}`)
  const features = Array.isArray(app.features)
    ? app.features.map((f) => String(f || '').trim()).filter(Boolean)
    : []
  if (features.length && indentFeatures) {
    for (const f of features) {
      lines.push(`  - ${f}`)
    }
  }
  return lines
}

/** Git 提交正文：当前项目已实现的前端内容说明 */
export function buildFrontendAppsCommitSection(catalog = loadFrontendAppCatalog()) {
  if (!catalog?.groups?.length) {
    return '## Claude Orchestrator · 前端实现说明\n\n（应用目录未配置）'
  }

  const lines = [
    `## ${catalog.productName || 'Claude Orchestrator'} · 前端实现说明`,
    '',
    String(catalog.tagline || '').trim(),
    '',
  ]

  if (Array.isArray(catalog.uiOverview) && catalog.uiOverview.length) {
    lines.push('### 整体 UI', '')
    for (const item of catalog.uiOverview) {
      lines.push(`- ${String(item).trim()}`)
    }
    lines.push('')
  }

  for (const group of catalog.groups) {
    const label = String(group.label || '').trim()
    if (label) lines.push(`### ${label}`, '')
    for (const app of group.apps || []) {
      lines.push(...formatAppBlock(app))
    }
    lines.push('')
  }

  if (catalog.stack) {
    lines.push(`**前端栈**：${String(catalog.stack).trim()}`)
  }

  return lines.join('\n').trimEnd()
}

/** 写入 docs/claude-orchestrator-apps.md，供 GitHub 仓库阅读 */
export function exportFrontendAppsDoc(catalog = loadFrontendAppCatalog(), personalRoot) {
  if (!catalog?.groups?.length) {
    return { ok: false, error: '未找到前端应用目录配置', path: null }
  }

  const root = personalRoot || PROJECT_ROOT
  const appsDocPath = path.join(root, 'docs/claude-orchestrator-apps.md')

  const product = catalog.productName || 'Claude Orchestrator'
  const lines = [
    `# ${product} · 前端实现说明`,
    '',
    String(catalog.tagline || '').trim(),
    '',
  ]

  if (catalog.stack) {
    lines.push(`**技术栈**：${String(catalog.stack).trim()}`, '')
  }

  lines.push(
    '> 推送到个人 GitHub 时自动更新；内容与侧栏导航及当前 Web 实现一致。',
    '',
  )

  if (Array.isArray(catalog.uiOverview) && catalog.uiOverview.length) {
    lines.push('## 整体 UI', '')
    for (const item of catalog.uiOverview) {
      lines.push(`- ${String(item).trim()}`)
    }
    lines.push('')
  }

  lines.push('## 页面与功能', '')

  for (const group of catalog.groups) {
    const label = String(group.label || '').trim()
    if (label) lines.push(`### ${label}`, '')
    for (const app of group.apps || []) {
      const route = String(app.route || '').trim()
      const name = String(app.name || '未命名').trim()
      const summary = String(app.summary || '').trim()
      const desc = String(app.description || '').trim()
      lines.push(`#### ${name}${route ? ` \`${route}\`` : ''}`, '')
      if (summary) lines.push(`> ${summary}`, '')
      if (desc) lines.push(desc, '')
      const features = Array.isArray(app.features)
        ? app.features.map((f) => String(f || '').trim()).filter(Boolean)
        : []
      if (features.length) {
        lines.push('**已实现界面：**', '')
        for (const f of features) {
          lines.push(`- ${f}`)
        }
        lines.push('')
      }
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
    '## 维护说明',
    '',
    '页面说明源文件：`docs/claude-orchestrator/frontend-apps.catalog.json`。修改后推送个人 GitHub 即可同步到提交信息与本文档。',
    '',
  )

  fs.mkdirSync(path.dirname(appsDocPath), { recursive: true })
  fs.writeFileSync(appsDocPath, `${lines.join('\n').trimEnd()}\n`, 'utf8')
  return {
    ok: true,
    path: path.relative(PROJECT_ROOT, appsDocPath).replace(/\\/g, '/'),
  }
}
