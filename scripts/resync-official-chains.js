/**
 * 重新生成 docs/chains/official-*.json。
 * 与 web/src/lib/chain-step-instruction.ts 保持同步（优化后版本）。
 *
 * 运行：node scripts/resync-official-chains.js
 */
const fs = require("node:fs");
const path = require("node:path");

const CHAINS_DIR = path.join(__dirname, "..", "docs", "chains");

// ===== 与 chain-step-instruction.ts 一致（优化后版本）=====
const IMPLEMENTATION_STEMS = new Set([
  "frontend-engineer",
  "backend-engineer",
  "devops-engineer",
]);

const AGENT_ARTIFACT_PATHS = {
  "product-manager": "docs/prd.md",
  "product-sprint-prioritizer": "docs/sprint-backlog.md",
  "project-manager": "docs/wbs.md",
  "software-architect": "docs/architecture-note.md",
  "frontend-engineer": "docs/frontend-implementation.md",
  "backend-engineer": "docs/api-summary.md",
  "qa-engineer": "docs/qa-report.md",
  "devops-engineer": "docs/release-plan.md",
  "code-reviewer": "docs/code-review-report.md",
  "design-ui-designer": "docs/ui-spec.md",
  "design-ux-architect": "docs/ux-architecture.md",
  "ui-ux-designer": "docs/ui-ux-spec.md",
  __general__: "docs/note.md",
};

const UPSTREAM_ARTIFACTS = {
  "project-manager": ["docs/prd.md", "docs/sprint-backlog.md"],
  "software-architect": ["docs/prd.md", "docs/wbs.md", "docs/sprint-backlog.md"],
  "frontend-engineer": ["docs/prd.md", "docs/architecture-note.md", "docs/ui-spec.md", "docs/ux-architecture.md"],
  "backend-engineer": ["docs/prd.md", "docs/architecture-note.md", "docs/wbs.md"],
  "qa-engineer": ["docs/prd.md", "docs/frontend-implementation.md", "docs/api-summary.md"],
  "devops-engineer": ["docs/architecture-note.md", "docs/release-plan.md"],
  "code-reviewer": ["docs/frontend-implementation.md", "docs/api-summary.md"],
  "design-ui-designer": ["docs/prd.md", "docs/ux-architecture.md"],
  "design-ux-architect": ["docs/prd.md"],
  "ui-ux-designer": ["docs/prd.md", "docs/ux-architecture.md"],
  "product-sprint-prioritizer": ["docs/prd.md"],
};

function defaultArtifactPath(stem) {
  return AGENT_ARTIFACT_PATHS[stem] || `docs/agents/${stem}.md`;
}

function buildChainStepReadBlock(stem) {
  if (!stem || stem === "__general__") {
    return "【READ】Pre-injected workspace state. Read files as needed.";
  }
  const upstream = UPSTREAM_ARTIFACTS[stem] || [];
  const lines = [];
  if (upstream.length) {
    lines.push(`【READ】Read upstream artifacts first (pre-injected): ${upstream.map((p) => "`" + p + "`").join(", ")}.`);
  } else {
    lines.push("【READ】No fixed upstream md. Pre-injected workspace state available.");
  }
  return lines.join("\n");
}

function buildChainStepWriteBlock(stem) {
  if (!stem || stem === "__general__") {
    return "【WRITE】```workspace-write``` JSON auto-writes. Docs→docs/, code→src/.";
  }
  const p = defaultArtifactPath(stem);
  const pathHint = `【ARTIFACT PATH】global://${stem} default => \`${p}\`. Subsequent deliveries reuse same path (append/overwrite explicitly). Do NOT write into other agent files (e.g. product-manager→docs/prd.md). Unmapped stem => \`docs/agents/{stem}.md\` or \`docs/{category}/{name}.md\`.`;
  const lines = [pathHint];
  lines.push(`【WRITE】Output valid \`\`\`workspace-write\`\`\` JSON. No fence → system writes summary to docs/chain-steps/{taskId}-${stem}.md.`);
  lines.push("【NO FAKE WRITE】Don't claim 'written' without a valid workspace-write fence.");
  if (IMPLEMENTATION_STEMS.has(stem)) {
    lines.push("【CODE WRITE】Business code → src/ (first line = relative path). Docs use default md path.");
  }
  return lines.join("\n");
}

const MUST_DO = [
  "【1】Base reply on pre-injected file state.",
  "【2】Leave verifiable artifact via ```workspace-write``` JSON.",
  "【3】Don't claim 'written' without a valid workspace-write fence.",
  "【4】Reply in short Chinese (≤5 points): conclusion, paths, verification, next step.",
].join("\n");

// ===== 与 chain-templates.ts 一致 =====
const SANSHENGLIUBU_GOVERNANCE =
  "【三省六部·执行顺序】须遵守 MCP → Skills → Agent；底层工具（local-time 等）可随时调用。";
const GENERIC_CTX =
  "【上下文】以当前工作区与用户本次对话中的需求为准；若工作区已有相关文档，优先阅读后再执行。";
const GENERIC_DELIVERY =
  "【交付】按对话中已确认的范围、验收标准与工作区相关文档执行。";

function step(stem, taskId, body, skillsOverride) {
  const instruction =
    `【Agent】global://${stem}（~/.claude/agents/${stem}.md）\n${body}\n\n${buildChainStepReadBlock(stem)}\n\n${buildChainStepWriteBlock(stem)}`;
  return {
    agentName: stem,
    taskId,
    instruction,
    skills: skillsOverride || [],
    mcps: [],
  };
}

function sanshengliubuStep(stem, taskId, body, skillsOverride, mcpsOverride) {
  const s = step(stem, taskId, `${SANSHENGLIUBU_GOVERNANCE}\n${body}`, skillsOverride);
  return { ...s, mcps: mcpsOverride ?? ["sanshengliubu"] };
}

// ===== 模板定义 =====
const officialChains = [
  // -- single --
  {
    id: "official-single-product-manager",
    name: "产品经理 · PRD",
    description: "需求澄清 → 验收口径 → PRD",
    category: "single",
    step: step("product-manager", "PRD-1",
      `${GENERIC_CTX}\n\n【任务】\n1. 目标用户与核心场景\n2. 可测试验收标准\n3. 非目标与待确认项\n\n【禁止】不写 WBS、不写代码/UI 稿`),
  },
  {
    id: "official-single-sprint-prioritizer",
    name: "冲刺优先级 · Backlog",
    description: "用户故事 → 优先级排序",
    category: "single",
    step: step("product-sprint-prioritizer", "SPRINT-1",
      `【输入】优先读 \`${defaultArtifactPath("product-manager")}\`\n${GENERIC_CTX}\n\n【任务】用户故事列表（含验收标准）、优先级排序、容量与依赖说明\n\n【禁止】不写页面布局/HTML`),
  },
  {
    id: "official-single-project-manager",
    name: "项目经理 · WBS",
    description: "WBS 拆解 → 依赖编排",
    category: "single",
    step: step("project-manager", "WBS-1",
      `【输入】\`${defaultArtifactPath("product-manager")}\`、\`${defaultArtifactPath("product-sprint-prioritizer")}\`（若有）\n${GENERIC_CTX}\n\n【任务】WBS 表格：编号 | 摘要 | Agent | 依赖 | 里程碑\n\n【禁止】不写代码/UI`),
  },
  {
    id: "official-single-software-architect",
    name: "软件架构师 · 架构说明",
    description: "模块边界 → 接口契约 → 技术选型",
    category: "single",
    step: step("software-architect", "ARCH-1",
      `【输入】\`${defaultArtifactPath("product-manager")}\`、\`${defaultArtifactPath("project-manager")}\`\n${GENERIC_CTX}\n\n【任务】模块边界、接口契约、数据流、技术选型与风险\n\n【禁止】不写具体页面 HTML/CSS`),
  },
  {
    id: "official-single-backend-engineer",
    name: "后端工程师 · API",
    description: "API / 数据层实现",
    category: "single",
    step: step("backend-engineer", "BE-1",
      `【输入】\`${defaultArtifactPath("product-manager")}\`、\`${defaultArtifactPath("software-architect")}\`\n${GENERIC_DELIVERY}\n\n【任务】在架构边界内实现 API/数据层；接口说明写入默认 md，代码写入 src/`),
  },
  {
    id: "official-single-frontend-engineer",
    name: "前端工程师 · 页面实现",
    description: "页面实现 → a11y",
    category: "single",
    step: step("frontend-engineer", "FE-1",
      `【输入】\`${defaultArtifactPath("product-manager")}\`、\`${defaultArtifactPath("software-architect")}\`、\`${defaultArtifactPath("design-ui-designer")}\`（若有）\n${GENERIC_DELIVERY}\n\n【任务】实现可运行页面；说明写入默认 md，代码写入 src/`),
  },
  {
    id: "official-single-qa-engineer",
    name: "测试工程师 · QA 报告",
    description: "测试策略 → 用例 → QA 报告",
    category: "single",
    step: step("qa-engineer", "QA-1",
      `【输入】\`${defaultArtifactPath("product-manager")}\`、\`${defaultArtifactPath("frontend-engineer")}\`、\`${defaultArtifactPath("backend-engineer")}\`、src/ 改动\n\n【任务】对照验收标准；问题分级：阻塞/高/中/低；可执行回归建议`),
  },
  {
    id: "official-single-devops-engineer",
    name: "DevOps · 发布计划",
    description: "CI/CD → 发布回滚",
    category: "single",
    step: step("devops-engineer", "REL-1",
      `【输入】\`${defaultArtifactPath("software-architect")}\`、\`${defaultArtifactPath("qa-engineer")}\`（若有）\n${GENERIC_CTX}\n\n【任务】发布步骤、回滚方案、环境变量与监控检查清单`),
  },
  {
    id: "official-single-code-reviewer",
    name: "代码评审员 · 评审报告",
    description: "安全 → 正确性 → 可维护性评审",
    category: "single",
    step: step("code-reviewer", "REVIEW-1",
      `【任务】评审工作区 src/ 与 server/ 近期改动\n\n【输出】问题分级 + 文件行号引用；阻塞项须可执行修复建议`),
  },
  {
    id: "official-single-design-ux-architect",
    name: "UX 架构师 · 信息架构",
    description: "信息架构 → 页面骨架",
    category: "single",
    step: step("design-ux-architect", "UX-1",
      `【输入】\`${defaultArtifactPath("product-manager")}\`\n${GENERIC_CTX}\n\n【任务】用户流程、信息架构、页面清单、可落地的 HTML/CSS 骨架说明\n\n【禁止】不写后端/API`),
  },
  {
    id: "official-single-design-ui-designer",
    name: "UI 设计师 · 视觉规范",
    description: "视觉规范 → 组件状态",
    category: "single",
    step: step("design-ui-designer", "UI-1",
      `【输入】\`${defaultArtifactPath("product-manager")}\`、\`${defaultArtifactPath("design-ux-architect")}\`（若有）\n${GENERIC_CTX}\n\n【任务】组件清单、关键状态、间距/色板/字体；可交付 HTML/CSS 骨架`),
  },
  {
    id: "official-single-ui-ux-designer",
    name: "UI/UX 设计师 · 交互+视觉",
    description: "交互流程 → 视觉规范",
    category: "single",
    step: step("ui-ux-designer", "UIX-1",
      `【输入】\`${defaultArtifactPath("product-manager")}\`\n${GENERIC_CTX}\n\n【任务】交互流程 + 视觉规范 + 组件状态；禁止写后端实现`),
  },

  // -- pipeline frontend-ui --
  {
    id: "official-pipeline-frontend-ui",
    name: "前端 + UI 五步",
    description: "PRD → UX → UI → 前端 → QA",
    category: "pipeline",
    multiSteps: [
      step("product-manager", "UI-0", `${GENERIC_CTX}\n\n【任务】页面相关验收标准与非目标`),
      step("design-ux-architect", "UI-1",
        `【输入】\`${defaultArtifactPath("product-manager")}\`\n\n【任务】流程与信息架构 + HTML/CSS 骨架`),
      step("design-ui-designer", "UI-2",
        `【输入】\`${defaultArtifactPath("design-ux-architect")}\`\n\n【任务】视觉规范与组件状态`),
      step("frontend-engineer", "UI-3",
        `【输入】\`${defaultArtifactPath("design-ui-designer")}\`、\`${defaultArtifactPath("product-manager")}\`\n${GENERIC_DELIVERY}`),
      step("qa-engineer", "UI-4",
        `【输入】\`${defaultArtifactPath("product-manager")}\`、\`${defaultArtifactPath("frontend-engineer")}\``),
    ],
  },
  {
    id: "official-pipeline-release",
    name: "发布上线四步",
    description: "QA → 评审 → DevOps → 复盘",
    category: "pipeline",
    multiSteps: [
      step("qa-engineer", "REL-0",
        `【输入】\`${defaultArtifactPath("product-manager")}\` + 待发布改动\n\n【任务】发布前回归与阻塞项清单`),
      step("code-reviewer", "REL-1",
        `【输入】待发布 diff\n\n【任务】安全/正确性评审；阻塞项须修复建议`),
      step("devops-engineer", "REL-2",
        `${GENERIC_CTX}\n\n【任务】发布步骤、回滚、监控与验证清单`),
      step("project-manager", "REL-3",
        `【任务】复盘返工原因与可复用经验；建议更新 ~/.claude/memory/经验库.txt`,
        ["self_learning"]),
    ],
  },
  {
    id: "official-pipeline-review-fix",
    name: "评审修复三步",
    description: "评审 → 修复 → QA",
    category: "pipeline",
    multiSteps: [
      step("code-reviewer", "FIX-0", `【任务】全量评审 src/ 与 server/；输出分级问题清单`),
      step("frontend-engineer", "FIX-1",
        `【输入】\`${defaultArtifactPath("code-reviewer")}\`\n${GENERIC_DELIVERY}\n\n【任务】修复评审中的阻塞/高优先级前端问题（若无前端问题则说明跳过）`),
      step("qa-engineer", "FIX-2",
        `【输入】\`${defaultArtifactPath("code-reviewer")}\`\n\n【任务】对修复项复验并更新 QA 结论`),
    ],
  },

  // -- 三省六部 --
  {
    id: "official-sanshengliubu-pm-wbs",
    name: "三省六部 · 需求确认 → WBS",
    description: "需求确认 → 冲刺 → WBS",
    category: "pipeline",
    multiSteps: [
      sanshengliubuStep("product-manager", "REQ-摘要",
        `${GENERIC_CTX}\n\n【任务】目标用户与验收口径、非目标与风险列表（不写 WBS/代码/UI 稿）`),
      sanshengliubuStep("product-sprint-prioritizer", "SPRINT-排序",
        `${GENERIC_CTX}\n\n【任务】MoSCoW/RICE 排序的用户故事与本冲刺范围\n\n【禁止】不写页面布局/HTML`),
      sanshengliubuStep("project-manager", "WBS-拆解执行",
        `${GENERIC_CTX}\n\n【任务】WBS 表格：编号 | 摘要 | Agent | 依赖 | DoD\n\n阅读工作区 CLAUDE.md；遵守确认门禁；再按链内后续步骤驱动 MCP 工具链。`),
    ],
  },
  {
    id: "official-sanshengliubu-dev-wbs",
    name: "三省六部 · 开发五链",
    description: "WBS → 架构 → 后端 → 评审 → QA",
    category: "pipeline",
    multiSteps: [
      sanshengliubuStep("project-manager", "WBS-链-01",
        `${GENERIC_CTX}\n\n【任务】WBS 表格：编号 | 摘要 | Agent | 依赖 | DoD\n\n【禁止】不写代码/UI`),
      sanshengliubuStep("software-architect", "WBS-链-02",
        `${GENERIC_CTX}\n\n【任务】模块边界、接口契约、数据流与技术选型\n\n【禁止】不写具体页面 HTML/CSS`),
      sanshengliubuStep("backend-engineer", "WBS-链-03",
        `${GENERIC_DELIVERY}\n\n【任务】在架构边界内落地服务端骨架（路由/models 等），保证可运行或可通过静态检查；代码写 src/，说明落默认 md`),
      sanshengliubuStep("code-reviewer", "WBS-链-04",
        "【附加上游】本轮链式任务已改动的 src/ 与 server/ 文件\n\n【任务】代码评审：风险点与必须修改项列表；不代替用户合并"),
      sanshengliubuStep("qa-engineer", "WBS-链-05",
        "【附加上游】server/ 与 src/ 本轮改动\n\n【任务】对照验收标准出 QA 报告与阻塞项"),
    ],
  },
  {
    id: "official-sanshengliubu-orchestration",
    name: "三省六部 · 全链路十一",
    description: "口径 → 冲刺 → WBS → 方案 → UI → 前后端 → 评审 → QA → DevOps → 复盘",
    category: "pipeline",
    multiSteps: [
      sanshengliubuStep("product-manager", "SLB-0",
        `${GENERIC_CTX}\n\n【任务】冻结需求口径：用户故事、验收标准、非目标与风险；禁止大面积改代码`),
      sanshengliubuStep("product-sprint-prioritizer", "SLB-0b",
        `${GENERIC_CTX}\n\n【任务】MoSCoW/RICE 排序的用户故事与冲刺范围\n\n【禁止】不写页面布局/HTML`),
      sanshengliubuStep("project-manager", "SLB-1",
        `${GENERIC_CTX}\n\n【任务】WBS：编号 | 摘要 | Agent | 依赖 | DoD`),
      sanshengliubuStep("software-architect", "SLB-2",
        `${GENERIC_CTX}\n\n【任务】模块边界、接口契约与技术选型；须用户确认后再进入实现`),
      sanshengliubuStep("ui-ux-designer", "SLB-2b",
        `${GENERIC_CTX}\n\n【任务】若有 UI 需求：交互流程与视觉规范；无 UI 需求则说明跳过`),
      sanshengliubuStep("backend-engineer", "SLB-3",
        `${GENERIC_DELIVERY}\n\n【任务】按架构落地服务端；代码写 src/，说明落默认 md`),
      sanshengliubuStep("frontend-engineer", "SLB-4",
        `${GENERIC_DELIVERY}\n\n【任务】实现页面与交互；代码写 src/`),
      sanshengliubuStep("code-reviewer", "SLB-5",
        "【附加上游】本轮链式任务已改动的 src/ 与 server/ 文件\n\n【任务】安全/正确性评审；输出必须修改项列表"),
      sanshengliubuStep("qa-engineer", "SLB-6",
        "【附加上游】本轮 src/ 与 server/ 改动\n\n【任务】对照验收标准出 QA 报告与阻塞项"),
      sanshengliubuStep("devops-engineer", "SLB-7",
        `${GENERIC_CTX}\n\n【任务】若有基础设施/发布变更：步骤、回滚与验证清单`),
      sanshengliubuStep("project-manager", "SLB-8",
        "【任务】按链上执行顺序复盘各 Agent；提炼经验并建议更新 ~/.claude/memory/经验库.txt 与任务链顺序优化草案",
        ["self_learning"]),
    ],
  },
  {
    id: "official-pipeline-agent-self-learning",
    name: "Agent 自学 · 全角色复盘",
    description: "各 Agent 自检 → 项目经理汇总复盘",
    category: "pipeline",
    multiSteps: (() => {
      const stems = [
        "product-manager", "product-sprint-prioritizer", "project-manager",
        "software-architect", "ui-ux-designer", "frontend-engineer",
        "backend-engineer", "code-reviewer", "qa-engineer", "devops-engineer",
      ];
      const steps = stems.map((stem, i) => {
        const body =
          `【任务】对照 ~/.claude/agents/${stem}.md 与你在最近任务链/本轮对话中的实际表现，输出：\n` +
          "1. 是否越权、漏项或应转交未转交\n" +
          "2. 建议追加到该 Agent 规则文件的 1～3 条 Markdown 要点（可粘贴草案）\n\n" +
          "【禁止】不写业务实现代码、不代替其他角色执行";
        return sanshengliubuStep(stem, `LEARN-${String(i + 1).padStart(2, "0")}`, body);
      });
      steps.push(sanshengliubuStep("project-manager", "LEARN-汇总",
        "【Skill】须完整遵循 ~/.claude/skills/self_learning.md\n\n" +
        "【输入】读取 ~/.claude/orchestration/active-chain.json（若存在）及本链前序各 Agent 自检结论\n\n" +
        "【任务】\n" +
        "1. 按 steps 顺序逐 Agent 复盘产出与边界\n" +
        "2. 对比预期与实际，提炼 ≥1 条可迁移经验\n" +
        "3. 给出 Agent 规则补全与任务链顺序优化草案\n" +
        "4. 追加写入 ~/.claude/memory/经验库.txt\n\n" +
        "【禁止】不修改仓库内 Agent 文件，仅输出建议草案",
        ["self_learning"]
      ));
      return steps;
    })(),
  },
];

// ===== 主流程：写入 JSON =====
function makeChainRecord(id, name, description, category, steps) {
  const now = "2026-06-29T11:00:00.000Z";
  return {
    id,
    name,
    description,
    category,
    enabled: true,
    templateId: id.replace(/^official-/, ""),
    official: true,
    userModified: false,
    createdAt: now,
    updatedAt: now,
    state: {
      status: "idle",
      currentIndex: 0,
      steps,
    },
  };
}

let count = 0;
for (const chain of officialChains) {
  const steps = chain.multiSteps || [chain.step];
  const record = makeChainRecord(chain.id, chain.name, chain.description, chain.category, steps);
  const fp = path.join(CHAINS_DIR, `${chain.id}.json`);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(record, null, 2) + "\n", "utf8");
  console.log(`✓ ${chain.id}.json (${steps.length} steps)`);
  count++;
}

console.log(`\n已同步 ${count} 个 official 链文件。`);
