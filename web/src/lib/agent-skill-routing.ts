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
  "__general__": {
    skills: [],
    tools: ["readWorkspaceTextFile", "listWorkspaceMarkdownFiles", "listFiles", "grep"],
  },
};

function buildRoutingToolHint(stem: string, mode: AgentRoutingMode, preset: AgentRoutingPreset, mcpChatToolName?: string, mcpListModelsToolName?: string): string {
  const chatTool = mcpChatToolName?.trim() || "ollama_chat";
  const listTool = mcpListModelsToolName?.trim() || "ollama_list_models";
  const always = [...preset.tools];
  if (stem !== "__general__") always.push("workspace-write");
  if (mode === "local-mcp") {
    return [...new Set([...always, listTool, chatTool])].join("、");
  }
  return [...always, "MCP（按需）"].join("、");
}

function buildAgentScopeGuard(stem: string, body: string): string {
  if (!UI_TASK_RE.test(body)) return "";
  if (UI_IMPLEMENTATION_STEMS.has(stem)) return "";
  const hints: Record<string, string> = {
    "product-manager": "Output PRD only. NO UI → delegate to design-ui-designer or frontend-engineer.",
    "product-sprint-prioritizer": "Output sprint priority/user stories only. NO UI drafts.",
    "project-manager": "WBS/milestones only. NO page design or frontend code.",
    "software-architect": "Architecture/contracts only. NO page HTML/CSS.",
  };
  return `【BOUNDARY】${hints[stem] || `${stem} does not render UI. Delegate UI to the appropriate agent.`}`;
}

/**
 * 为 Agent 任务自动注入“技能/工具路由”提示，提升执行落地率。
 */
export function buildAgentRoutedInstruction(
  stem: string,
  body: string,
  mode: AgentRoutingMode,
  toolOverrides?: { mcpChatToolName?: string; mcpListModelsToolName?: string },
): string {
  const cleanBody = body.trim();

  // 写盘细则以 turn-policy systemConstraint 为准；此处只提示勿伪称已落盘
  const writePolicy =
    "【写盘·Cursor】仅当用户明确要求写/保存/生成文件时输出 ```workspace-write``` JSON（{\"path\":\"...\",\"content\":\"...\"}；也接受 contents）。" +
    "禁止 YAML、禁止 ```json/裸 JSON 当写盘、禁止缺 path 猜 docs；无有效围栏勿声称已写入。回合策略见系统约束。";

  // 通用 Agent：无角色锁
  if (stem === "__general__") {
    return [
      "【范围】通用助手。先读工作区相关文件；按需聊天/代码/UI/架构/终端。",
      "【回复】简体中文短要点（≤5 条）：结论、路径、下一步。勿长篇计划或回显 JSON。",
      writePolicy,
      cleanBody,
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  const artifactPathHint = buildAgentArtifactPathHint(stem);
  const lock = `【ROLE】global://${stem}. Single role per reply. Other roles → /agent or next chain step.`;
  const scopeGuard = buildAgentScopeGuard(stem, cleanBody);
  const preset = AGENT_ROUTING_PRESETS[stem];

  if (!preset) {
    return [lock, scopeGuard, artifactPathHint, cleanBody, writePolicy]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  const routingBlock = [
    `【路由】${stem} → Skills: ${preset.skills.join("、")} → Tools: ${buildRoutingToolHint(stem, mode, preset, toolOverrides?.mcpChatToolName, toolOverrides?.mcpListModelsToolName)}.`,
    "【回复】简体中文短要点（≤5 条）：结论、路径、验证、下一步。",
  ];

  return [lock, scopeGuard, artifactPathHint, cleanBody, ...routingBlock, writePolicy]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
