/**
 * 任务链预设模板：与 ~/.claude/agents 中核心 Agent 对齐；每步通过 skills[] 关联 Skill 文件。
 * 落盘路径与 agent-artifact-paths 一致（docs/prd.md、docs/wbs.md 等）。
 */

import { defaultArtifactPathForAgent } from "@/lib/agent-artifact-paths";
import { allSkillFilesForAgentStems, skillFileStemsForAgent } from "@/lib/agent-skill-defaults";

export type ChainTemplateVarKey = "projectName" | "featureDesc" | "featureSummary";

export type ChainTemplateCategory = "single" | "pipeline";

export type ChainTemplateStep = {
  agentName: string;
  taskId: string;
  instruction: string;
  skills?: string[];
  mcps?: string[];
};

export type ChainTemplate = {
  id: string;
  category: ChainTemplateCategory;
  name: string;
  description: string;
  /** 本模板涉及的 Agent stem（与 ~/.claude/agents/{stem}.md 一致） */
  agents: string[];
  /** 本模板各步涉及的 Skill 文件 stem（去重） */
  skills: string[];
  vars: ChainTemplateVarKey[];
  steps: ChainTemplateStep[];
};

export const CHAIN_TEMPLATE_VAR_LABELS: Record<ChainTemplateVarKey, string> = {
  projectName: "项目名称（可选，会写进步骤说明里）",
  featureDesc: "功能描述（用一句话说明要做什么）",
  featureSummary: "交付要求（告诉执行 Agent 要做到什么）",
};

export const CHAIN_TEMPLATE_DEFAULTS: Record<ChainTemplateVarKey, string> = {
  projectName: "当前工作区项目",
  featureDesc: "以用户本次对话描述的功能为准",
  featureSummary: "以对话与工作区文档中的交付要求为准",
};

/** 系统中已配置路由 Skill 的核心 Agent（~/.claude/agents 均存在） */
export const CORE_CHAIN_AGENT_STEMS = [
  "product-manager",
  "product-sprint-prioritizer",
  "project-manager",
  "software-architect",
  "frontend-engineer",
  "backend-engineer",
  "qa-engineer",
  "devops-engineer",
  "code-reviewer",
  "design-ux-architect",
  "design-ui-designer",
  "ui-ux-designer",
] as const;

export type CoreChainAgentStem = (typeof CORE_CHAIN_AGENT_STEMS)[number];

function artifactPath(stem: string): string {
  return defaultArtifactPathForAgent(stem);
}

function stepAgentHeader(stem: string): string {
  return `【Agent】global://${stem}（~/.claude/agents/${stem}.md）`;
}

function step(
  stem: CoreChainAgentStem,
  taskId: string,
  body: string,
  skillsOverride?: string[],
): ChainTemplateStep {
  const outPath = artifactPath(stem);
  return {
    agentName: stem,
    taskId,
    instruction: `${stepAgentHeader(stem)}\n${body}\n\n【落盘】workspace-write → \`${outPath}\`（本 Agent 默认路径；代码另写 src/ 并在交付说明中列出）`,
    skills: skillsOverride ?? skillFileStemsForAgent(stem),
  };
}

function singleTemplate(
  id: string,
  name: string,
  description: string,
  stem: CoreChainAgentStem,
  taskId: string,
  body: string,
  vars: ChainTemplateVarKey[],
  skillsOverride?: string[],
): ChainTemplate {
  const stepDef = step(stem, taskId, body, skillsOverride);
  return {
    id,
    category: "single",
    name,
    description,
    agents: [stem],
    skills: stepDef.skills ?? [],
    vars,
    steps: [stepDef],
  };
}

const GENERIC_CTX =
  "【上下文】以当前工作区与用户本次对话中的需求为准；若工作区已有相关文档，优先阅读后再执行。";
const GENERIC_DELIVERY = "【交付】按对话中已确认的范围、验收标准与工作区相关文档执行。";

/** code12 三省六部编排心智模型（MCP → Skills → Agent） */
const SANSHENGLIUBU_GOVERNANCE =
  "【三省六部·执行顺序】须遵守 MCP → Skills → Agent；底层工具（local-time 等）可随时调用。";

function sanshengliubuStep(
  stem: CoreChainAgentStem,
  taskId: string,
  body: string,
  skillsOverride?: string[],
  mcpsOverride?: string[],
): ChainTemplateStep {
  const base = step(stem, taskId, `${SANSHENGLIUBU_GOVERNANCE}\n${body}`, skillsOverride);
  return { ...base, mcps: mcpsOverride ?? ["sanshengliubu"] };
}

function governancePipelineTemplate(
  id: string,
  name: string,
  description: string,
  agents: CoreChainAgentStem[],
  steps: ChainTemplateStep[],
  vars: ChainTemplateVarKey[] = [],
): ChainTemplate {
  return {
    id,
    category: "pipeline",
    name,
    description,
    agents: [...agents],
    skills: allSkillFilesForAgentStems(agents),
    vars,
    steps,
  };
}

const SELF_LEARNING_AGENT_STEMS: CoreChainAgentStem[] = [
  "product-manager",
  "product-sprint-prioritizer",
  "project-manager",
  "software-architect",
  "ui-ux-designer",
  "frontend-engineer",
  "backend-engineer",
  "code-reviewer",
  "qa-engineer",
  "devops-engineer",
];

function agentSelfReviewBody(stem: CoreChainAgentStem): string {
  return `【任务】对照 ~/.claude/agents/${stem}.md 与你在最近任务链/本轮对话中的实际表现，输出：\n1. 是否越权、漏项或应转交未转交\n2. 建议追加到该 Agent 规则文件的 1～3 条 Markdown 要点（可粘贴草案）\n\n【禁止】不写业务实现代码、不代替其他角色执行`;
}

export const CHAIN_TEMPLATES: ChainTemplate[] = [
  // —— 单 Agent + Skill（12 个核心角色各一）——
  singleTemplate(
    "single-product-manager",
    "产品经理 · PRD",
    "需求澄清 → 验收口径 → PRD",
    "product-manager",
    "PRD-1",
    `${GENERIC_CTX}\n\n【任务】\n1. 目标用户与核心场景\n2. 可测试验收标准\n3. 非目标与待确认项\n\n【禁止】不写 WBS、不写代码/UI 稿`,
    [],
  ),
  singleTemplate(
    "single-sprint-prioritizer",
    "冲刺优先级 · Backlog",
    "用户故事 → 优先级排序",
    "product-sprint-prioritizer",
    "SPRINT-1",
    `【输入】优先读 \`${artifactPath("product-manager")}\`\n${GENERIC_CTX}\n\n【任务】用户故事列表（含验收标准）、优先级排序、容量与依赖说明\n\n【禁止】不写页面布局/HTML`,
    [],
  ),
  singleTemplate(
    "single-project-manager",
    "项目经理 · WBS",
    "WBS 拆解 → 依赖编排",
    "project-manager",
    "WBS-1",
    `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("product-sprint-prioritizer")}\`（若有）\n${GENERIC_CTX}\n\n【任务】WBS 表格：编号 | 摘要 | Agent | 依赖 | 里程碑\n\n【禁止】不写代码/UI`,
    [],
  ),
  singleTemplate(
    "single-software-architect",
    "软件架构师 · 架构说明",
    "模块边界 → 接口契约 → 技术选型",
    "software-architect",
    "ARCH-1",
    `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("project-manager")}\`\n${GENERIC_CTX}\n\n【任务】模块边界、接口契约、数据流、技术选型与风险\n\n【禁止】不写具体页面 HTML/CSS`,
    [],
  ),
  singleTemplate(
    "single-backend-engineer",
    "后端工程师 · API",
    "API / 数据层实现",
    "backend-engineer",
    "BE-1",
    `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("software-architect")}\`\n${GENERIC_DELIVERY}\n\n【任务】在架构边界内实现 API/数据层；接口说明写入默认 md，代码写入 src/`,
    [],
  ),
  singleTemplate(
    "single-frontend-engineer",
    "前端工程师 · 页面实现",
    "页面实现 → a11y",
    "frontend-engineer",
    "FE-1",
    `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("software-architect")}\`、\`${artifactPath("design-ui-designer")}\`（若有）\n${GENERIC_DELIVERY}\n\n【任务】实现可运行页面；说明写入默认 md，代码写入 src/`,
    [],
  ),
  singleTemplate(
    "single-qa-engineer",
    "测试工程师 · QA 报告",
    "测试策略 → 用例 → QA 报告",
    "qa-engineer",
    "QA-1",
    `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("frontend-engineer")}\`、\`${artifactPath("backend-engineer")}\`、src/ 改动\n\n【任务】对照验收标准；问题分级：阻塞/高/中/低；可执行回归建议`,
    [],
  ),
  singleTemplate(
    "single-devops-engineer",
    "DevOps · 发布计划",
    "CI/CD → 发布回滚",
    "devops-engineer",
    "REL-1",
    `【输入】\`${artifactPath("software-architect")}\`、\`${artifactPath("qa-engineer")}\`（若有）\n${GENERIC_CTX}\n\n【任务】发布步骤、回滚方案、环境变量与监控检查清单`,
    [],
  ),
  singleTemplate(
    "single-code-reviewer",
    "代码评审员 · 评审报告",
    "安全 → 正确性 → 可维护性评审",
    "code-reviewer",
    "REVIEW-1",
    `【任务】评审工作区 src/ 与 server/ 近期改动\n\n【输出】问题分级 + 文件行号引用；阻塞项须可执行修复建议`,
    [],
  ),
  singleTemplate(
    "single-design-ux-architect",
    "UX 架构师 · 信息架构",
    "信息架构 → 页面骨架",
    "design-ux-architect",
    "UX-1",
    `【输入】\`${artifactPath("product-manager")}\`\n${GENERIC_CTX}\n\n【任务】用户流程、信息架构、页面清单、可落地的 HTML/CSS 骨架说明\n\n【禁止】不写后端/API`,
    [],
  ),
  singleTemplate(
    "single-design-ui-designer",
    "UI 设计师 · 视觉规范",
    "视觉规范 → 组件状态",
    "design-ui-designer",
    "UI-1",
    `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("design-ux-architect")}\`（若有）\n${GENERIC_CTX}\n\n【任务】组件清单、关键状态、间距/色板/字体；可交付 HTML/CSS 骨架`,
    [],
  ),
  singleTemplate(
    "single-ui-ux-designer",
    "UI/UX 设计师 · 交互+视觉",
    "交互流程 → 视觉规范",
    "ui-ux-designer",
    "UIX-1",
    `【输入】\`${artifactPath("product-manager")}\`\n${GENERIC_CTX}\n\n【任务】交互流程 + 视觉规范 + 组件状态；禁止写后端实现`,
    [],
  ),

  // —— 多 Agent 流水线（含三省六部工作流；已合并原全栈/冲刺/后端 API 重复链）——
  {
    id: "pipeline-frontend-ui",
    category: "pipeline",
    name: "前端 + UI 五步",
    description: "PRD → UX → UI → 前端 → QA",
    agents: [
      "product-manager",
      "design-ux-architect",
      "design-ui-designer",
      "frontend-engineer",
      "qa-engineer",
    ],
    skills: allSkillFilesForAgentStems([
      "product-manager",
      "design-ux-architect",
      "design-ui-designer",
      "frontend-engineer",
      "qa-engineer",
    ]),
    vars: [],
    steps: [
      step("product-manager", "UI-0", `${GENERIC_CTX}\n\n【任务】页面相关验收标准与非目标`),
      step(
        "design-ux-architect",
        "UI-1",
        `【输入】\`${artifactPath("product-manager")}\`\n\n【任务】流程与信息架构 + HTML/CSS 骨架`,
      ),
      step(
        "design-ui-designer",
        "UI-2",
        `【输入】\`${artifactPath("design-ux-architect")}\`\n\n【任务】视觉规范与组件状态`,
      ),
      step(
        "frontend-engineer",
        "UI-3",
        `【输入】\`${artifactPath("design-ui-designer")}\`、\`${artifactPath("product-manager")}\`\n${GENERIC_DELIVERY}`,
      ),
      step(
        "qa-engineer",
        "UI-4",
        `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("frontend-engineer")}\``,
      ),
    ],
  },
  {
    id: "pipeline-release",
    category: "pipeline",
    name: "发布上线四步",
    description: "QA → 评审 → DevOps → 复盘",
    agents: ["qa-engineer", "code-reviewer", "devops-engineer", "project-manager"],
    skills: allSkillFilesForAgentStems(["qa-engineer", "code-reviewer", "devops-engineer", "project-manager"]),
    vars: [],
    steps: [
      step(
        "qa-engineer",
        "REL-0",
        `【输入】\`${artifactPath("product-manager")}\` + 待发布改动\n\n【任务】发布前回归与阻塞项清单`,
      ),
      step(
        "code-reviewer",
        "REL-1",
        `【输入】待发布 diff\n\n【任务】安全/正确性评审；阻塞项须修复建议`,
      ),
      step(
        "devops-engineer",
        "REL-2",
        `${GENERIC_CTX}\n\n【任务】发布步骤、回滚、监控与验证清单`,
      ),
      step(
        "project-manager",
        "REL-3",
        `【任务】复盘返工原因与可复用经验；建议更新 ~/.claude/memory/经验库.txt`,
        ["self_learning"],
      ),
    ],
  },
  {
    id: "pipeline-review-fix",
    category: "pipeline",
    name: "评审修复三步",
    description: "评审 → 修复 → QA",
    agents: ["code-reviewer", "frontend-engineer", "qa-engineer"],
    skills: allSkillFilesForAgentStems(["code-reviewer", "frontend-engineer", "qa-engineer"]),
    vars: [],
    steps: [
      step(
        "code-reviewer",
        "FIX-0",
        `【任务】全量评审 src/ 与 server/；输出分级问题清单`,
      ),
      step(
        "frontend-engineer",
        "FIX-1",
        `【输入】\`${artifactPath("code-reviewer")}\`\n${GENERIC_DELIVERY}\n\n【任务】修复评审中的阻塞/高优先级前端问题（若无前端问题则说明跳过）`,
      ),
      step(
        "qa-engineer",
        "FIX-2",
        `【输入】\`${artifactPath("code-reviewer")}\`\n\n【任务】对修复项复验并更新 QA 结论`,
      ),
    ],
  },

  // —— 三省六部（Claude code12 · 归入流水线列表）——
  governancePipelineTemplate(
    "sanshengliubu-pm-wbs",
    "三省六部 · 需求确认 → WBS",
    "需求确认 → 冲刺 → WBS",
    ["product-manager", "product-sprint-prioritizer", "project-manager"],
    [
      sanshengliubuStep(
        "product-manager",
        "REQ-摘要",
        "基于前文与用户已书面确认的需求，输出最终需求摘要、验收口径与风险列表（不写具体业务实现代码）。",
      ),
      sanshengliubuStep(
        "product-sprint-prioritizer",
        "SPRINT-排序",
        `【输入】\`${artifactPath("product-manager")}\`\n\n【任务】MoSCoW/RICE 排序的用户故事与本冲刺范围`,
      ),
      sanshengliubuStep(
        "project-manager",
        "WBS-拆解执行",
        `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("product-sprint-prioritizer")}\`\n\n阅读工作区 CLAUDE.md 与上一步摘要；将需求拆解为工作包（执行 Agent stem、依赖、DoD），再按链内后续步骤或当场约定驱动 MCP 工具链执行（遵守确认门禁）。`,
      ),
    ],
  ),
  governancePipelineTemplate(
    "sanshengliubu-dev-wbs",
    "三省六部 · 开发五链",
    "WBS → 架构 → 后端 → 评审 → QA",
    ["project-manager", "software-architect", "backend-engineer", "code-reviewer", "qa-engineer"],
    [
      sanshengliubuStep(
        "project-manager",
        "WBS-链-01",
        "阅读当前工作区根目录 CLAUDE.md。将用户本轮需求拆成工作包表（含执行 Agent stem、计划周期、依赖、DoD）；禁止编写业务实现代码。",
      ),
      sanshengliubuStep(
        "software-architect",
        "WBS-链-02",
        "基于上一步工作包，给出模块边界与核心接口草案（文字即可）；不写具体源文件实现。",
      ),
      sanshengliubuStep(
        "backend-engineer",
        "WBS-链-03",
        `【输入】\`${artifactPath("software-architect")}\`\n${GENERIC_DELIVERY}\n\n按架构草案在工作区内落地约定的服务端骨架（路由/models 等），保证可运行或可通过静态检查；完成后简述变更路径。`,
      ),
      sanshengliubuStep(
        "code-reviewer",
        "WBS-链-04",
        "针对本轮链式任务已改动的文件做代码评审：风险点与必须修改项列表；不代替用户合并。",
      ),
      sanshengliubuStep(
        "qa-engineer",
        "WBS-链-05",
        `【输入】\`${artifactPath("product-manager")}\`（若有）、\`${artifactPath("backend-engineer")}\` + server/ 改动\n\n【任务】对照验收标准出 QA 报告与阻塞项`,
      ),
    ],
  ),
  governancePipelineTemplate(
    "sanshengliubu-orchestration",
    "三省六部 · 全链路十一",
    "口径 → 冲刺 → WBS → 方案 → UI → 前后端 → 评审 → QA → DevOps → 复盘",
    [
      "product-manager",
      "product-sprint-prioritizer",
      "project-manager",
      "software-architect",
      "ui-ux-designer",
      "backend-engineer",
      "frontend-engineer",
      "code-reviewer",
      "qa-engineer",
      "devops-engineer",
    ],
    [
      sanshengliubuStep(
        "product-manager",
        "SLB-0",
        `${GENERIC_CTX}\n\n【任务】冻结需求口径：用户故事、验收标准、非目标与风险；禁止大面积改代码`,
      ),
      sanshengliubuStep(
        "product-sprint-prioritizer",
        "SLB-0b",
        `【输入】\`${artifactPath("product-manager")}\`\n\n【任务】MoSCoW/RICE 排序的用户故事与冲刺范围`,
      ),
      sanshengliubuStep(
        "project-manager",
        "SLB-1",
        `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("product-sprint-prioritizer")}\`\n\n【任务】WBS：编号 | 摘要 | Agent | 依赖 | DoD`,
      ),
      sanshengliubuStep(
        "software-architect",
        "SLB-2",
        `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("project-manager")}\`\n\n【任务】模块边界、接口契约与技术选型；须用户确认后再进入实现`,
      ),
      sanshengliubuStep(
        "ui-ux-designer",
        "SLB-2b",
        `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("software-architect")}\`\n\n【任务】若有 UI 需求：交互流程与视觉规范；无 UI 需求则说明跳过`,
      ),
      sanshengliubuStep(
        "backend-engineer",
        "SLB-3",
        `【输入】\`${artifactPath("software-architect")}\`\n${GENERIC_DELIVERY}\n\n【任务】按架构落地服务端；代码写 src/，说明落默认 md`,
      ),
      sanshengliubuStep(
        "frontend-engineer",
        "SLB-4",
        `【输入】\`${artifactPath("product-manager")}\`、\`${artifactPath("software-architect")}\`、\`${artifactPath("ui-ux-designer")}\`（若有）\n${GENERIC_DELIVERY}\n\n【任务】实现页面与交互；代码写 src/`,
      ),
      sanshengliubuStep(
        "code-reviewer",
        "SLB-5",
        "【输入】本轮链式任务已改动文件\n\n【任务】安全/正确性评审；输出必须修改项列表",
      ),
      sanshengliubuStep(
        "qa-engineer",
        "SLB-6",
        `【输入】\`${artifactPath("product-manager")}\` + 本轮改动\n\n【任务】对照验收标准出 QA 报告与阻塞项`,
      ),
      sanshengliubuStep(
        "devops-engineer",
        "SLB-7",
        `${GENERIC_CTX}\n\n【任务】若有基础设施/发布变更：步骤、回滚与验证清单`,
      ),
      sanshengliubuStep(
        "project-manager",
        "SLB-8",
        "【任务】按链上执行顺序复盘各 Agent；提炼经验并建议更新 ~/.claude/memory/经验库.txt 与任务链顺序优化草案",
        ["self_learning"],
      ),
    ],
  ),
  governancePipelineTemplate(
    "pipeline-agent-self-learning",
    "Agent 自学 · 全角色复盘",
    "各 Agent 自检 → 项目经理汇总复盘",
    SELF_LEARNING_AGENT_STEMS,
    [
      ...SELF_LEARNING_AGENT_STEMS.map((stem, i) =>
        sanshengliubuStep(stem, `LEARN-${String(i + 1).padStart(2, "0")}`, agentSelfReviewBody(stem)),
      ),
      sanshengliubuStep(
        "project-manager",
        "LEARN-汇总",
        `【Skill】须完整遵循 ~/.claude/skills/self_learning.md\n\n【输入】读取 ~/.claude/orchestration/active-chain.json（若存在）及本链前序各 Agent 自检结论\n\n【任务】\n1. 按 steps 顺序逐 Agent 复盘产出与边界\n2. 对比预期与实际，提炼 ≥1 条可迁移经验\n3. 给出 Agent 规则补全与任务链顺序优化草案\n4. 追加写入 ~/.claude/memory/经验库.txt\n\n【禁止】不修改仓库内 Agent 文件，仅输出建议草案`,
        ["self_learning"],
      ),
    ],
  ),
];

export function substituteChainTemplateVars(
  text: string,
  vars: Partial<Record<ChainTemplateVarKey, string>>,
): string {
  const merged = { ...CHAIN_TEMPLATE_DEFAULTS, ...vars };
  return text.replace(/\{(\w+)\}/g, (full, key: string) => {
    if (key in merged) return merged[key as ChainTemplateVarKey];
    return full;
  });
}

export function applyChainTemplate(
  template: ChainTemplate,
  vars: Partial<Record<ChainTemplateVarKey, string>>,
): ChainTemplateStep[] {
  return template.steps.map((s) => ({
    agentName: s.agentName,
    taskId: substituteChainTemplateVars(s.taskId, vars),
    instruction: substituteChainTemplateVars(s.instruction, vars),
    skills: s.skills?.length ? [...s.skills] : skillFileStemsForAgent(s.agentName),
    mcps: s.mcps?.length ? [...s.mcps] : [],
  }));
}

export function officialChainId(templateId: string): string {
  return `official-${templateId}`;
}

export function isOfficialChainId(id: string): boolean {
  return id.startsWith("official-");
}

export function getChainTemplate(id: string): ChainTemplate | undefined {
  return CHAIN_TEMPLATES.find((t) => t.id === id);
}

/** 模板 Skill 摘要（用于列表展示） */
export function formatTemplateSkillSummary(skills: string[], max = 2): string {
  if (!skills.length) return "";
  const head = skills.slice(0, max).join("、");
  return skills.length > max ? `${head}…` : head;
}

export const CHAIN_TEMPLATE_CATEGORY_LABEL: Record<ChainTemplateCategory, string> = {
  single: "单 Agent + Skill",
  pipeline: "多 Agent 流水线",
};
