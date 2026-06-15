import { AGENT_ROUTING_PRESETS } from "@/lib/agent-skill-routing";

/** 全局 Skill 文件（~/.claude/skills/{stem}.md）模板 */
const SKILL_LIBRARY: Record<string, { name: string; description: string; category?: string }> = {
  self_learning: {
    name: "自主学习",
    description: "任务链复盘并写入经验库",
    category: "工程",
  },
  "frontend-design": {
    name: "前端界面设计",
    description: "高质量前端界面设计与实现",
    category: "工程",
  },
  "react-best-practices": {
    name: "React 最佳实践",
    description: "React 质量与性能最佳实践",
    category: "工程",
  },
  "web-design-guidelines": {
    name: "Web 设计规范",
    description: "Web 可用性与视觉规范",
    category: "工程",
  },
  "webapp-testing": {
    name: "Web 应用测试",
    description: "Playwright 本地 Web 应用测试",
    category: "分析",
  },
  "vercel-deploy-claimable": {
    name: "Vercel 部署",
    description: "Vercel 预览部署与认领",
    category: "集成",
  },
  "canvas-design": {
    name: "画布视觉设计",
    description: "海报与静态视觉设计（PNG/PDF）",
    category: "工程",
  },
};

/** 路由预设中的中文 Skill 名 → 本机 skill 文件 stem */
const ROUTING_SKILL_STEM: Record<string, string> = {
  WBS拆解: "wbs-decompose",
  依赖编排: "dependency-orchestration",
  里程碑与风险管理: "milestone-risk-mgmt",
  需求澄清: "product-req-clarify",
  验收口径定义: "product-acceptance-criteria",
  范围管理: "product-scope-mgmt",
  冲刺优先级: "sprint-prioritization",
  "RICE/MoSCoW": "rice-moscow-prioritization",
  用户故事拆分: "user-story-split",
  容量与依赖: "capacity-dependencies",
  架构边界定义: "arch-boundary-definition",
  接口契约设计: "api-contract-design",
  技术选型评估: "tech-selection-eval",
  前端实现: "frontend-implementation",
  UI交互优化: "ui-interaction-optimization",
  可访问性基线: "accessibility-baseline",
  服务端实现: "backend-implementation",
  数据层设计: "data-layer-design",
  事务与安全基线: "transaction-security-baseline",
  测试策略: "test-strategy",
  自动化用例: "automated-test-cases",
  缺陷闭环: "defect-closure",
  "CI/CD流程": "cicd-workflow",
  发布回滚: "release-rollback",
  可观测性治理: "observability-governance",
  安全审查: "security-review",
  正确性审查: "correctness-review",
  可维护性评估: "maintainability-review",
  信息架构: "information-architecture",
  "布局与 CSS 体系": "layout-css-system",
  "UX 结构说明": "ux-structure-spec",
  UX结构说明: "ux-structure-spec",
  "可落地的 HTML/CSS 骨架": "html-css-skeleton",
  视觉设计系统: "visual-design-system",
  组件与像素级界面: "pixel-perfect-ui",
  可访问性: "accessibility-baseline",
  交互流程: "interaction-flow",
  视觉规范: "visual-spec",
  组件与可访问性基线: "component-a11y-baseline",
};

/** 额外文件 stem（非路由中文名，来自历史任务链映射） */
const EXTRA_AGENT_SKILL_STEMS: Record<string, string[]> = {
  "product-sprint-prioritizer": [],
  "project-manager": ["self_learning"],
  "frontend-engineer": ["frontend-design", "react-best-practices", "web-design-guidelines"],
  "qa-engineer": ["webapp-testing"],
  "devops-engineer": ["vercel-deploy-claimable"],
  "code-reviewer": ["react-best-practices"],
  "design-ux-architect": ["frontend-design", "web-design-guidelines"],
  "design-ui-designer": ["frontend-design", "canvas-design"],
  "ui-ux-designer": ["frontend-design", "canvas-design", "web-design-guidelines"],
};

function routingLabelToStem(label: string): string {
  const t = label.trim();
  if (ROUTING_SKILL_STEM[t]) return ROUTING_SKILL_STEM[t];
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function presetToolsToAgentTools(tools: string[]): string[] {
  const map: Record<string, string> = {
    readWorkspaceTextFile: "read",
    listWorkspaceMarkdownFiles: "read",
    "workspace-write": "edit",
  };
  const out = tools.map((t) => map[t.trim()] || t.trim()).filter(Boolean);
  return [...new Set(out.length ? out : ["read", "edit"])];
}

export type AgentSkillToolBundle = {
  agentStem: string;
  skillStems: string[];
  tools: string[];
};

export function getAgentSkillToolBundle(agentStem: string): AgentSkillToolBundle | null {
  const stem = agentStem.trim();
  if (!stem) return null;
  const preset = AGENT_ROUTING_PRESETS[stem];
  if (!preset) return null;
  const skillStems = new Set<string>();
  if (preset) {
    for (const label of preset.skills) {
      skillStems.add(routingLabelToStem(label));
    }
  }
  for (const s of EXTRA_AGENT_SKILL_STEMS[stem] ?? []) {
    skillStems.add(s);
  }
  const tools = preset ? presetToolsToAgentTools(preset.tools) : ["read", "edit"];
  return {
    agentStem: stem,
    skillStems: [...skillStems],
    tools,
  };
}

/** 按 Agent 列表/frontmatter 解析 Skill 与 tools（同步逻辑以本机列表为准，不依赖固定预设） */
export function resolveAgentSkillBundleFromMeta(
  agentStem: string,
  parsed: { skills?: string[]; tools?: string[] },
  agentEntry: { skills?: string[]; tools?: string[] } = {},
): AgentSkillToolBundle {
  const stem = agentStem.trim();
  const skillStems = new Set<string>();
  for (const s of [...(parsed.skills ?? []), ...(agentEntry.skills ?? [])]) {
    const t = String(s || "").trim();
    if (t) skillStems.add(routingLabelToStem(t));
  }
  if (skillStems.size === 0 && stem) {
    skillStems.add(stem);
  }
  const tools = parsed.tools?.length
    ? parsed.tools
    : agentEntry.tools?.length
      ? agentEntry.tools
      : ["read", "edit"];
  return {
    agentStem: stem,
    skillStems: [...skillStems],
    tools,
  };
}

const SHORT_DESCRIPTIONS: Record<string, string> = {
  "wbs-decompose": "WBS 拆解与里程碑划分",
  "dependency-orchestration": "任务依赖梳理与编排",
  "milestone-risk-mgmt": "里程碑计划与风险管控",
  "product-req-clarify": "需求澄清与范围确认",
  "product-acceptance-criteria": "验收标准与口径定义",
  "product-scope-mgmt": "产品范围与非目标管理",
  "sprint-prioritization": "冲刺优先级排序",
  "rice-moscow-prioritization": "RICE / MoSCoW 优先级",
  "user-story-split": "用户故事拆分",
  "capacity-dependencies": "团队容量与依赖评估",
  "arch-boundary-definition": "系统架构边界划分",
  "api-contract-design": "API 与接口契约设计",
  "tech-selection-eval": "技术选型评估",
  "frontend-implementation": "前端功能实现与交付",
  "ui-interaction-optimization": "UI 交互与体验优化",
  "accessibility-baseline": "可访问性（a11y）基线",
  "backend-implementation": "服务端与 API 实现",
  "data-layer-design": "数据模型与持久化设计",
  "transaction-security-baseline": "事务、鉴权与安全基线",
  "test-strategy": "测试策略与覆盖规划",
  "automated-test-cases": "自动化测试用例设计",
  "defect-closure": "缺陷跟踪与闭环",
  "cicd-workflow": "CI/CD 流水线",
  "release-rollback": "发布与回滚流程",
  "observability-governance": "日志、指标与可观测性",
  "security-review": "安全审查要点",
  "correctness-review": "逻辑正确性审查",
  "maintainability-review": "可维护性评估",
  "information-architecture": "信息架构与导航",
  "layout-css-system": "布局与 CSS 体系",
  "ux-structure-spec": "UX 结构与流程说明",
  "html-css-skeleton": "可落地的 HTML/CSS 骨架",
  "visual-design-system": "视觉设计系统",
  "pixel-perfect-ui": "像素级界面与组件",
  "interaction-flow": "交互流程设计",
  "visual-spec": "视觉规范",
  "component-a11y-baseline": "组件规范与 a11y 基线",
};

export function getSkillDefinition(stem: string, agentStem?: string): {
  stem: string;
  name: string;
  description: string;
  category: string;
  agentStem?: string;
} {
  const s = stem.trim();
  const lib = SKILL_LIBRARY[s];
  if (lib) {
    return {
      stem: s,
      name: lib.name,
      description: lib.description,
      category: lib.category || "工程",
      agentStem,
    };
  }
  const labelEntry = Object.entries(ROUTING_SKILL_STEM).find(([, v]) => v === s);
  const label = labelEntry?.[0] ?? s;
  return {
    stem: s,
    name: label,
    description: SHORT_DESCRIPTIONS[s] ?? `${label}：步骤与验收基线`,
    category: "项目",
    agentStem,
  };
}

/** @deprecated 使用 getAgentSkillToolBundle */
export const AGENT_SKILL_FILE_STEMS: Record<string, string[]> = Object.fromEntries(
  Object.keys({ ...AGENT_ROUTING_PRESETS, ...EXTRA_AGENT_SKILL_STEMS }).map((stem) => [
    stem,
    getAgentSkillToolBundle(stem)?.skillStems ?? [],
  ]),
);
