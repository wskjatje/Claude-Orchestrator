import {
  buildAgentArtifactPathHint,
} from "@/lib/agent-artifact-paths";

export type AgentRoutingMode = "claude-code" | "local-mcp";

type AgentRoutingPreset = {
  skills: string[];
  tools: string[];
};

/** 负责页面/UI 实现或视觉设计的 Agent */
const UI_IMPLEMENTATION_STEMS = new Set([
  "design-ui-designer",
  "design-ux-architect",
  "ui-ux-designer",
  "design-visual-storyteller",
  "frontend-engineer",
]);

const UI_TASK_RE =
  /(?:登录页|登录页面|注册|忘记密码|页面|界面|UI|HTML|html|css|mockup|原型|扫码|第三方登录|视觉|布局)/i;

/** 任务链模板与本地 MCP 路由共用；skills 为声明式 Skill 名（非自动注入 SKILL.md 正文） */
export const AGENT_ROUTING_PRESETS: Record<string, AgentRoutingPreset> = {
  "project-manager": {
    skills: ["WBS拆解", "依赖编排", "里程碑与风险管理"],
    tools: ["readWorkspaceTextFile", "listWorkspaceMarkdownFiles", "workspace-write"],
  },
  "product-manager": {
    skills: ["需求澄清", "验收口径定义", "范围管理"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "product-sprint-prioritizer": {
    skills: ["冲刺优先级", "RICE/MoSCoW", "用户故事拆分", "容量与依赖"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "software-architect": {
    skills: ["架构边界定义", "接口契约设计", "技术选型评估"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "frontend-engineer": {
    skills: ["前端实现", "UI交互优化", "可访问性基线"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "backend-engineer": {
    skills: ["服务端实现", "数据层设计", "事务与安全基线"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "qa-engineer": {
    skills: ["测试策略", "自动化用例", "缺陷闭环"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "devops-engineer": {
    skills: ["CI/CD流程", "发布回滚", "可观测性治理"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "code-reviewer": {
    skills: ["安全审查", "正确性审查", "可维护性评估"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "design-ux-architect": {
    skills: ["信息架构", "布局与 CSS 体系", "UX 结构说明", "可落地的 HTML/CSS 骨架"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "design-ui-designer": {
    skills: ["视觉设计系统", "组件与像素级界面", "可访问性"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
  "ui-ux-designer": {
    skills: ["交互流程", "视觉规范", "组件与可访问性基线"],
    tools: ["readWorkspaceTextFile", "workspace-write"],
  },
};

function buildRoutingToolHint(mode: AgentRoutingMode, preset: AgentRoutingPreset): string {
  if (mode === "local-mcp") {
    return [...new Set([...preset.tools, "ollama_list_models", "ollama_chat", "workspace-write"])].join("、");
  }
  return [...preset.tools, "MCP（按需）", "workspace-write"].join("、");
}

function buildAgentScopeGuard(stem: string, body: string): string {
  if (!UI_TASK_RE.test(body)) return "";
  if (UI_IMPLEMENTATION_STEMS.has(stem)) return "";
  if (stem === "product-manager") {
    return "【本职边界·强制】用户描述含页面/UI 需求：只产出 PRD 要点、验收标准、范围与非目标；禁止写「登录页面设计描述」、HTML/CSS 或视觉稿。需要 UI 时请明确建议 `/agent design-ui-designer` 或 `/agent frontend-engineer`。";
  }
  if (stem === "product-sprint-prioritizer") {
    return "【本职边界·强制】用户描述功能（如登录页）：只产出冲刺优先级、用户故事列表（含验收标准）、RICE/MoSCoW 排序与依赖；禁止写页面布局/HTML/CSS/「整体布局·详细设计」类 UI 稿。UI 设计 → design-ui-designer；前端实现 → frontend-engineer。";
  }
  if (stem === "project-manager") {
    return "【本职边界·强制】只拆解 WBS/里程碑/依赖与风险；禁止代写页面设计或前端代码。";
  }
  if (stem === "software-architect") {
    return "【本职边界·强制】只产出架构边界、模块划分、接口契约；禁止代写具体页面 HTML/CSS。";
  }
  return "【本职边界·强制】用户任务含页面/UI，但 global://" +
    stem +
    " 不包含画界面；须按 ~/.claude/agents 中该角色定义作答，并说明应委派给哪个 Agent。";
}

/**
 * 为 Agent 任务自动注入“技能/工具路由”提示，提升执行落地率。
 */
export function buildAgentRoutedInstruction(
  stem: string,
  body: string,
  mode: AgentRoutingMode,
): string {
  const cleanBody = body.trim();
  const lock =
    `【角色锁定】你只扮演 global://${stem}；禁止自称其它 Agent，禁止混淆产品经理与项目经理等不同职务。禁止在同一回复中分段扮演「Agent: 需求分析员/架构师/前端…」；其它职务须由任务链下一步或用户另发 /agent 指令调用。`;
  const scopeGuard = buildAgentScopeGuard(stem, cleanBody);
  const executeHint = !cleanBody
    ? UI_IMPLEMENTATION_STEMS.has(stem)
      ? "【执行指令】你已接管本轮。请阅读上文用户目标与 assistant 已有设计说明，直接产出**新的**可交付物（完整 HTML/CSS 代码，或 ```workspace-write``` 写入工作区相对路径）。禁止逐字重复上一条 assistant 回复。"
      : `【执行指令】你已接管 global://${stem}。请仅按该 Agent 本职阅读上文并产出对应交付物；禁止写其它 Agent 负责的内容（尤其禁止 UI 设计稿若你不是设计/前端 Agent）。`
    : "";
  const preset = AGENT_ROUTING_PRESETS[stem];
  const designDeliver = UI_IMPLEMENTATION_STEMS.has(stem)
    ? "【交付】须给出可直接使用的页面代码（HTML+CSS）或 workspace-write 落盘；不要只写抽象设计要点清单。"
    : "";
  const artifactPathHint = buildAgentArtifactPathHint(stem);
  if (!preset) {
    return [lock, scopeGuard, artifactPathHint, executeHint, designDeliver, cleanBody]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }
  const routingBlock = [
    `【路由】~/.claude/agents/${stem}.md → Skill：${preset.skills.join("、")} → 工具：${buildRoutingToolHint(mode, preset)}。`,
    "【语言】除代码/路径/库名/API 外，说明与小结须用简体中文；勿用英文小节标题堆砌计划书。",
    "【反馈】最终对用户可见的说明控制在短段落 + 要点列表；勿逐条复述工具返回全文。",
    designDeliver,
  ]
    .filter(Boolean)
    .join("\n");
  return [lock, scopeGuard, artifactPathHint, executeHint, cleanBody, routingBlock].filter(Boolean).join("\n\n").trim();
}
