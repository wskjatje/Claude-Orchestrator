#!/usr/bin/env node
/**
 * 规范化 ~/.claude/skills/*.md：
 * - 检测并移除内容重复文件
 * - 补全缺失的 name
 * - 简化 description
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SKILLS_DIR = path.resolve(path.join(os.homedir(), '.claude', 'skills'))

/** stem → 中文展示名 */
const SKILL_NAMES = {
  _单通道推荐技能索引: '单通道技能索引',
  'brand-guidelines': '品牌规范',
  'canvas-design': '画布视觉设计',
  'figma-implement-design': 'Figma 设计稿转代码',
  'frontend-design': '前端界面设计',
  'frontend-skill': 'Landing 页前端',
  'react-best-practices': 'React 最佳实践',
  'web-design-guidelines': 'Web 设计规范',
  'webapp-testing': 'Web 应用测试',
  self_learning: '自主学习',
  'vercel-deploy-claimable': 'Vercel 部署',
  'wbs-decompose': 'WBS拆解',
  'dependency-orchestration': '依赖编排',
  'milestone-risk-mgmt': '里程碑与风险管理',
  'product-req-clarify': '需求澄清',
  'product-acceptance-criteria': '验收口径定义',
  'product-scope-mgmt': '范围管理',
  'sprint-prioritization': '冲刺优先级',
  'rice-moscow-prioritization': 'RICE/MoSCoW',
  'user-story-split': '用户故事拆分',
  'capacity-dependencies': '容量与依赖',
  'arch-boundary-definition': '架构边界定义',
  'api-contract-design': '接口契约设计',
  'tech-selection-eval': '技术选型评估',
  'frontend-implementation': '前端实现',
  'ui-interaction-optimization': 'UI交互优化',
  'accessibility-baseline': '可访问性基线',
  'backend-implementation': '服务端实现',
  'data-layer-design': '数据层设计',
  'transaction-security-baseline': '事务与安全基线',
  'test-strategy': '测试策略',
  'automated-test-cases': '自动化用例',
  'defect-closure': '缺陷闭环',
  'cicd-workflow': 'CI/CD流程',
  'release-rollback': '发布回滚',
  'observability-governance': '可观测性治理',
  'security-review': '安全审查',
  'correctness-review': '正确性审查',
  'maintainability-review': '可维护性评估',
  'information-architecture': '信息架构',
  'layout-css-system': '布局与 CSS 体系',
  'ux-structure-spec': 'UX结构说明',
  'html-css-skeleton': 'HTML/CSS 骨架',
  'visual-design-system': '视觉设计系统',
  'pixel-perfect-ui': '组件与像素级界面',
  'interaction-flow': '交互流程',
  'visual-spec': '视觉规范',
  'component-a11y-baseline': '组件与可访问性基线',
}

/** stem → 简短 description（≤60 字） */
const SHORT_DESCRIPTIONS = {
  _单通道推荐技能索引: '推荐 User Skill 总索引',
  'brand-guidelines': '品牌视觉与文案一致性',
  'figma-implement-design': 'Figma 设计稿转前端代码',
  'frontend-skill': 'Landing 页与品牌视觉实现',
  self_learning: '任务链复盘并写入经验库',
  'frontend-design': '高质量前端界面设计与实现',
  'react-best-practices': 'React 质量与性能最佳实践',
  'web-design-guidelines': 'Web 可用性与视觉规范',
  'webapp-testing': 'Playwright 本地 Web 应用测试',
  playwright: 'Playwright 本地 Web 应用测试',
  'vercel-deploy-claimable': 'Vercel 预览部署与认领',
  'canvas-design': '海报与静态视觉设计（PNG/PDF）',
  'wbs-decompose': 'WBS 拆解与里程碑划分',
  'dependency-orchestration': '任务依赖梳理与编排',
  'milestone-risk-mgmt': '里程碑计划与风险管控',
  'product-req-clarify': '需求澄清与范围确认',
  'product-acceptance-criteria': '验收标准与口径定义',
  'product-scope-mgmt': '产品范围与非目标管理',
  'sprint-prioritization': '冲刺优先级排序',
  'rice-moscow-prioritization': 'RICE / MoSCoW 优先级',
  'user-story-split': '用户故事拆分',
  'capacity-dependencies': '团队容量与依赖评估',
  'arch-boundary-definition': '系统架构边界划分',
  'api-contract-design': 'API 与接口契约设计',
  'tech-selection-eval': '技术选型评估',
  'frontend-implementation': '前端功能实现与交付',
  'ui-interaction-optimization': 'UI 交互与体验优化',
  'accessibility-baseline': '可访问性（a11y）基线',
  'backend-implementation': '服务端与 API 实现',
  'data-layer-design': '数据模型与持久化设计',
  'transaction-security-baseline': '事务、鉴权与安全基线',
  'test-strategy': '测试策略与覆盖规划',
  'automated-test-cases': '自动化测试用例设计',
  'defect-closure': '缺陷跟踪与闭环',
  'cicd-workflow': 'CI/CD 流水线',
  'release-rollback': '发布与回滚流程',
  'observability-governance': '日志、指标与可观测性',
  'security-review': '安全审查要点',
  'correctness-review': '逻辑正确性审查',
  'maintainability-review': '可维护性评估',
  'information-architecture': '信息架构与导航',
  'layout-css-system': '布局与 CSS 体系',
  'ux-structure-spec': 'UX 结构与流程说明',
  'html-css-skeleton': '可落地的 HTML/CSS 骨架',
  'visual-design-system': '视觉设计系统',
  'pixel-perfect-ui': '像素级界面与组件',
  'interaction-flow': '交互流程设计',
  'visual-spec': '视觉规范',
  'component-a11y-baseline': '组件规范与 a11y 基线',
}

/** 内容重复时保留 canonical，删除 alias */
const DUPLICATE_CANONICAL = {
  playwright: 'webapp-testing',
}

const CATEGORY_DEFAULT = '工程'

function hashContent(text) {
  return crypto.createHash('md5').update(text).digest('hex')
}

function parseFrontmatter(raw) {
  const trimmed = raw.trimStart()
  if (!trimmed.startsWith('---')) {
    return { fm: '', body: trimmed, extra: [] }
  }
  const closeIdx = trimmed.indexOf('\n---', 3)
  if (closeIdx === -1) return { fm: '', body: trimmed, extra: [] }
  const fmBlock = trimmed.slice(3, closeIdx)
  const rest = trimmed.slice(closeIdx + 4).replace(/^\s+/, '')
  const lines = fmBlock.split('\n')
  const meta = {}
  const extra = []
  for (const line of lines) {
    const m = line.match(/^([\w-]+):\s*(.*)$/)
    if (m) meta[m[1]] = m[2].trim()
    else if (line.trim()) extra.push(line)
  }
  return { meta, body: rest, extra }
}

function resolveName(stem, meta) {
  const preferred = SKILL_NAMES[stem]
  if (preferred) return preferred
  const existing = (meta.name || meta.displayName || '').trim()
  if (existing && !/^[a-z0-9_-]+$/i.test(existing)) return existing
  if (existing && SKILL_NAMES[existing]) return SKILL_NAMES[existing]
  const fromDesc = SHORT_DESCRIPTIONS[stem]?.split(/[：:]/)[0]?.trim()
  if (fromDesc) return fromDesc
  return preferred || stem
}

function resolveDescription(stem, meta) {
  if (SHORT_DESCRIPTIONS[stem]) return SHORT_DESCRIPTIONS[stem]
  const cur = (meta.description || '').trim()
  const agentMatch = cur.match(/关联技能：(.+?)。/)
  if (agentMatch) return `${agentMatch[1]}：步骤与验收基线`
  if (cur.length > 72) return cur.slice(0, 69) + '…'
  return cur || `${resolveName(stem, meta)}：步骤与验收基线`
}

function resolveCategory(meta) {
  const c = (meta.category || '').trim()
  if (['项目', '通用', '工程', '集成', '分析', '媒体'].includes(c)) return c
  if (c) return c
  return CATEGORY_DEFAULT
}

function simplifyBody(body, name, desc) {
  let b = body
  b = b.replace(
    /^#\s*\n\n## 职责\n\n- Agent `[^`]+` 关联技能：。执行时须遵循本 Skill 的步骤与验收标准。\n\n## 关联 Agent\n\n`[^`]+`\n\n\n## 步骤\n\n- （可在此补充操作步骤与验收标准）\n?/,
    `# ${name}\n\n## 职责\n\n- ${desc}\n\n## 步骤\n\n- （可在此补充操作步骤与验收标准）\n`,
  )
  b = b.replace(
    /- Agent `[^`]+` 关联技能：[^。\n]+。执行时须遵循本 Skill 的步骤与验收标准。/g,
    `- ${desc}`,
  )
  return b
}

function serializeSkill({ name, description, category, body, extra = [] }) {
  const fmLines = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    `category: ${category}`,
    ...extra,
    '---',
    '',
  ]
  return `${fmLines.join('\n')}${body.endsWith('\n') ? body : `${body}\n`}`
}

function listFlatSkillFiles() {
  if (!fs.existsSync(SKILLS_DIR)) return []
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.md'))
    .map((d) => path.join(SKILLS_DIR, d.name))
}

function updateAgentSkillRefs() {
  const agentsDir = path.join(os.homedir(), '.claude', 'agents')
  if (!fs.existsSync(agentsDir)) return []
  const changed = []
  for (const d of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!d.isFile() || !d.name.endsWith('.md')) continue
    const full = path.join(agentsDir, d.name)
    let raw = fs.readFileSync(full, 'utf8')
    if (!/^skills:.*\bplaywright\b/m.test(raw)) continue
    const next = raw.replace(
      /^skills:\s*(.+)$/m,
      (_, list) => {
        const items = list
          .split(/[,，\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((s) => s !== 'playwright')
        return `skills: ${items.join(', ')}`
      },
    )
    if (next !== raw) {
      fs.writeFileSync(full, next, 'utf8')
      changed.push(d.name)
    }
  }
  return changed
}

function main() {
  const files = listFlatSkillFiles()
  const byHash = new Map()
  const removed = []
  const updated = []

  for (const full of files) {
    const base = path.basename(full)
    const stem = base.slice(0, -3)
    if (!stem) {
      fs.unlinkSync(full)
      removed.push(base + ' (空文件名)')
      continue
    }
    const raw = fs.readFileSync(full, 'utf8')
    const h = hashContent(raw)
    if (!byHash.has(h)) byHash.set(h, [])
    byHash.get(h).push({ full, stem, base })
  }

  for (const [, group] of byHash) {
    if (group.length < 2) continue
    const stems = group.map((g) => g.stem)
    let keep = group[0]
    for (const g of group) {
      const canonical = DUPLICATE_CANONICAL[g.stem]
      if (canonical && stems.includes(canonical)) {
        fs.unlinkSync(g.full)
        removed.push(`${g.base}（与 ${canonical}.md 重复）`)
      } else if (Object.values(DUPLICATE_CANONICAL).includes(g.stem)) {
        keep = g
      }
    }
    for (const g of group) {
      if (g.full === keep.full) continue
      if (fs.existsSync(g.full)) {
        fs.unlinkSync(g.full)
        removed.push(`${g.base}（与 ${keep.base} 内容重复）`)
      }
    }
  }

  for (const full of listFlatSkillFiles()) {
    const base = path.basename(full)
    const stem = base.slice(0, -3)
    const raw = fs.readFileSync(full, 'utf8')
    const { meta, body, extra } = parseFrontmatter(raw)
    const name = resolveName(stem, meta)
    const description = resolveDescription(stem, meta)
    const category = resolveCategory(meta)
    const preservedExtra = extra.filter((l) => l.startsWith('license:'))
    const newBody = simplifyBody(body, name, description)
    const next = serializeSkill({
      name,
      description,
      category,
      body: newBody,
      extra: preservedExtra,
    })
    if (next !== raw) {
      fs.writeFileSync(full, next, 'utf8')
      updated.push(base)
    }
  }

  const agentsPatched = updateAgentSkillRefs()

  console.log(`Skill 目录: ${SKILLS_DIR}`)
  console.log(`移除重复/无效: ${removed.length ? removed.join('; ') : '无'}`)
  console.log(`更新 ${updated.length} 个文件`)
  console.log(
    agentsPatched.length
      ? `Agent skills 字段已移除 playwright 引用: ${agentsPatched.join(', ')}`
      : 'Agent 无 playwright 重复引用',
  )
}

main()
