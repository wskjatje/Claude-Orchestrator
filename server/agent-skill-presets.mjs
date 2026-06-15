/** Agent → Skill stem / tools 预设（与 web/src/lib/agent-skill-catalog.ts 对齐） */

const ROUTING_SKILL_STEM = {
  WBS拆解: 'wbs-decompose',
  依赖编排: 'dependency-orchestration',
  里程碑与风险管理: 'milestone-risk-mgmt',
  需求澄清: 'product-req-clarify',
  验收口径定义: 'product-acceptance-criteria',
  范围管理: 'product-scope-mgmt',
  冲刺优先级: 'sprint-prioritization',
  'RICE/MoSCoW': 'rice-moscow-prioritization',
  用户故事拆分: 'user-story-split',
  容量与依赖: 'capacity-dependencies',
  架构边界定义: 'arch-boundary-definition',
  接口契约设计: 'api-contract-design',
  技术选型评估: 'tech-selection-eval',
  前端实现: 'frontend-implementation',
  UI交互优化: 'ui-interaction-optimization',
  可访问性基线: 'accessibility-baseline',
  服务端实现: 'backend-implementation',
  数据层设计: 'data-layer-design',
  事务与安全基线: 'transaction-security-baseline',
  测试策略: 'test-strategy',
  自动化用例: 'automated-test-cases',
  缺陷闭环: 'defect-closure',
  'CI/CD流程': 'cicd-workflow',
  发布回滚: 'release-rollback',
  可观测性治理: 'observability-governance',
  安全审查: 'security-review',
  正确性审查: 'correctness-review',
  可维护性评估: 'maintainability-review',
  信息架构: 'information-architecture',
  '布局与 CSS 体系': 'layout-css-system',
  'UX 结构说明': 'ux-structure-spec',
  UX结构说明: 'ux-structure-spec',
  '可落地的 HTML/CSS 骨架': 'html-css-skeleton',
  视觉设计系统: 'visual-design-system',
  组件与像素级界面: 'pixel-perfect-ui',
  可访问性: 'accessibility-baseline',
  交互流程: 'interaction-flow',
  视觉规范: 'visual-spec',
  组件与可访问性基线: 'component-a11y-baseline',
}

const AGENT_ROUTING_PRESETS = {
  'project-manager': {
    skills: ['WBS拆解', '依赖编排', '里程碑与风险管理'],
    tools: ['readWorkspaceTextFile', 'listWorkspaceMarkdownFiles', 'workspace-write'],
  },
  'product-manager': {
    skills: ['需求澄清', '验收口径定义', '范围管理'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'product-sprint-prioritizer': {
    skills: ['冲刺优先级', 'RICE/MoSCoW', '用户故事拆分', '容量与依赖'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'software-architect': {
    skills: ['架构边界定义', '接口契约设计', '技术选型评估'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'frontend-engineer': {
    skills: ['前端实现', 'UI交互优化', '可访问性基线'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'backend-engineer': {
    skills: ['服务端实现', '数据层设计', '事务与安全基线'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'qa-engineer': {
    skills: ['测试策略', '自动化用例', '缺陷闭环'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'devops-engineer': {
    skills: ['CI/CD流程', '发布回滚', '可观测性治理'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'code-reviewer': {
    skills: ['安全审查', '正确性审查', '可维护性评估'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'design-ux-architect': {
    skills: ['信息架构', '布局与 CSS 体系', 'UX 结构说明', '可落地的 HTML/CSS 骨架'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'design-ui-designer': {
    skills: ['视觉设计系统', '组件与像素级界面', '可访问性'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
  'ui-ux-designer': {
    skills: ['交互流程', '视觉规范', '组件与可访问性基线'],
    tools: ['readWorkspaceTextFile', 'workspace-write'],
  },
}

const EXTRA_AGENT_SKILL_STEMS = {
  'product-sprint-prioritizer': [],
  'project-manager': ['self_learning'],
  'frontend-engineer': ['frontend-design', 'react-best-practices', 'web-design-guidelines'],
  'qa-engineer': ['webapp-testing'],
  'devops-engineer': ['vercel-deploy-claimable'],
  'code-reviewer': ['react-best-practices'],
  'design-ux-architect': ['frontend-design', 'web-design-guidelines'],
  'design-ui-designer': ['frontend-design', 'canvas-design'],
  'ui-ux-designer': ['frontend-design', 'canvas-design', 'web-design-guidelines'],
}

function routingLabelToStem(label) {
  const t = String(label || '').trim()
  if (ROUTING_SKILL_STEM[t]) return ROUTING_SKILL_STEM[t]
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function presetToolsToAgentTools(tools) {
  const map = {
    readWorkspaceTextFile: 'read',
    listWorkspaceMarkdownFiles: 'read',
    'workspace-write': 'edit',
  }
  const out = tools.map((t) => map[t.trim()] || t.trim()).filter(Boolean)
  return [...new Set(out.length ? out : ['read', 'edit'])]
}

export function getAgentSkillToolBundle(agentStem) {
  const stem = String(agentStem || '').trim()
  if (!stem) return null
  const preset = AGENT_ROUTING_PRESETS[stem]
  if (!preset) return null
  const skillStems = new Set()
  if (preset) {
    for (const label of preset.skills) {
      skillStems.add(routingLabelToStem(label))
    }
  }
  for (const s of EXTRA_AGENT_SKILL_STEMS[stem] ?? []) {
    skillStems.add(s)
  }
  const tools = preset ? presetToolsToAgentTools(preset.tools) : ['read', 'edit']
  return {
    agentStem: stem,
    skillStems: [...skillStems],
    tools,
  }
}

/** 按 Agent 列表/frontmatter 解析 Skill 与 tools（不依赖固定预设表） */
export function resolveAgentSkillBundleFromMeta(agentStem, parsed, agentEntry = {}) {
  const stem = String(agentStem || '').trim()
  const skillStems = new Set()
  for (const s of [...(parsed?.skills || []), ...(agentEntry.skills || [])]) {
    const t = String(s || '').trim()
    if (t) skillStems.add(routingLabelToStem(t))
  }
  if (skillStems.size === 0 && stem) {
    skillStems.add(stem)
  }
  const tools = parsed?.tools?.length
    ? parsed.tools
    : agentEntry.tools?.length
      ? agentEntry.tools
      : ['read', 'edit']
  return {
    agentStem: stem,
    skillStems: [...skillStems],
    tools,
  }
}

const SHORT_DESCRIPTIONS = {
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
  self_learning: '任务链复盘并写入经验库',
  'frontend-design': '高质量前端界面设计与实现',
  'react-best-practices': 'React 质量与性能最佳实践',
  'web-design-guidelines': 'Web 可用性与视觉规范',
  'webapp-testing': 'Playwright 本地 Web 应用测试',
  'vercel-deploy-claimable': 'Vercel 预览部署与认领',
  'canvas-design': '海报与静态视觉设计（PNG/PDF）',
}

export function getSkillDefinition(stem, agentStem) {
  const s = String(stem || '').trim()
  const labelEntry = Object.entries(ROUTING_SKILL_STEM).find(([, v]) => v === s)
  const label = labelEntry?.[0] ?? s
  return {
    stem: s,
    name: label,
    description: SHORT_DESCRIPTIONS[s] || `${label}：步骤与验收基线`,
    category: '项目',
    agentStem,
  }
}
