import { GENERAL_AGENT_DISPLAY_NAME } from "@/lib/agent-basename";
import { enrichAgentFailureHint } from "@/lib/agent-failure-hint";
import { stripLargeAssistantArtifacts } from "@/lib/assistant-reply";
import { trimTerminalDisplay } from "@/lib/chat-terminal-paste";
import { formatDomElementContext, type PendingDomElement } from "@/lib/dom-element-meta";
import {
  AUTO_MODEL_ID,
  chatSettingsPreservePayload,
  isAutoModelSelection,
  normalizeChatModelSelection,
} from "@/lib/model-catalog";
import { type PriorTurn, type UserImageAttachment } from "@/lib/ollama-messages";
import { parseAgentCommand } from "@/lib/parse-agent-command";
import type { AgentTurnMeta } from "@/lib/agent-turn-meta";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";
import type { PendingTerminalSnippet } from "@/components/composer-terminal-attachments";
import { getDesktop } from "@/lib/desktop-api";
import type { DesktopApi } from "@/types/desktop";
import {
  previousUserLineForAssistant,
  sanitizeReadonlyAssistantContent,
  shouldForceReadonlyAssistantDisplay,
  stripAgentTurnForReadonlyDisplay,
} from "@/lib/readonly-turn-display";

export type OrchMode = "claude-code" | "local-mcp";

export function fullChatSettingsPayload(
  s: Awaited<ReturnType<DesktopApi["getChatSettings"]>>,
): Parameters<DesktopApi["saveChatSettings"]>[0] {
  return chatSettingsPreservePayload(s);
}

/** ingest 阶段解析/虚构落盘等提示（已停用） */
export function toastIngestWorkspaceHint(_msg: string) {
  // 不再弹出 info 提示
}

/** 本地 MCP 编排返回的 orchestrationHints（已停用） */
export function toastIfLocalOrchestrationHints(_res: unknown) {
  // 不再弹出 info 提示
}

export type DiskMsg = {
  role: "user" | "assistant";
  content: string;
  ts?: number;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  /** 本轮若由 /agent 或底部 Agent pill 触发，记录 stem 便于气泡展示 */
  agentStem?: string;
  /** 界面展示用中文 Agent 名（与 agentStem 对应，不影响执行） */
  agentLabel?: string;
  /** Ollama /v1/chat/completions 返回的 usage，assistant 且模型上报时有值 */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    costUsd?: number;
  };
  latencyMs?: number;
  requestError?: boolean;
  /** 写盘/执行硬失败详情；有正文时气泡顶部横幅展示，禁止用此文案替换 content */
  requestErrorDetail?: string;
  billingSource?: "cloud" | "local";
  modelId?: string;
  /** 只读问答：禁止解析/展示文件编辑卡（对齐 Cursor Ask） */
  suppressFileEdits?: boolean;
  /** 本地通道：direct=Ollama 直聊（未连 MCP 工具）；orch=MCP 工具环 */
  localChannel?: "direct" | "orch";
  /** Agent 写盘/验证/过程轨迹，供续跑与气泡渲染 */
  agentTurn?: AgentTurnMeta;
};

export type ChatSession = {
  id: string;
  title: string;
  modelId: string;
  history: DiskMsg[];
  workspacePath?: string | null;
  /** Claude Code CLI --resume / --session-id */
  claudeSessionId?: string | null;
};

export function needsCheckpointConfirm(sess: ChatSession | undefined, historyIndex: number): boolean {
  if (!sess) return false;
  return historyIndex < sess.history.length - 1;
}

export function countUserMessages(hist: DiskMsg[]): number {
  return hist.filter((m) => m.role === "user").length;
}

export function lastUserMessageTs(hist: DiskMsg[]): number {
  for (let i = hist.length - 1; i >= 0; i--) {
    const m = hist[i];
    if (m?.role === "user") return m.ts ?? 0;
  }
  return 0;
}

/** 磁盘同步时保留内存里更完整的 history，避免 save→reload 竞态清空当前 tab */
export function mergeSessionsPreferLongerHistory(
  local: ChatSession[],
  disk: ChatSession[],
  sendingById: Record<string, boolean>,
): ChatSession[] {
  const localById = new Map(local.map((s) => [s.id, s]));
  const merged: ChatSession[] = [];
  for (const d of disk) {
    const l = localById.get(d.id);
    if (!l) {
      // 磁盘中有而本地没有的会话，全部保留（磁盘是持久化真相源）
      merged.push(d);
      continue;
    }
    const keepLocal =
      l.history.length > d.history.length ||
      Boolean(sendingById[l.id]) ||
      countUserMessages(l.history) > countUserMessages(d.history) ||
      (l.history.length === d.history.length &&
        lastUserMessageTs(l.history) >= lastUserMessageTs(d.history));
    merged.push(
      keepLocal
        ? {
            ...l,
            title: l.title || d.title,
            modelId: d.modelId || l.modelId,
            workspacePath: l.workspacePath || d.workspacePath,
          }
        : {
            ...d,
            title: d.title || l.title,
            modelId: d.modelId || l.modelId,
            workspacePath: d.workspacePath || l.workspacePath,
          },
    );
    localById.delete(d.id);
  }
  for (const l of localById.values()) merged.push(l);
  return merged;
}

export type Msg = {
  role: "user" | "assistant";
  name?: string;
  time?: string;
  content: string;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
  historyIndex?: number;
  requestError?: boolean;
  requestErrorDetail?: string;
  agentTurn?: AgentTurnMeta;
  suppressFileEdits?: boolean;
  localChannel?: "direct" | "orch";
};

/** 旧版任务链写入的超长「用户」气泡，在列表中折叠为摘要（不改磁盘时可逆：仅展示层）。 */
export function shortenLegacyChainUserBubbleForDisplay(raw: string): string {
  const t = raw.trim();
  if (t.length < 480) return raw;
  const hasVerboseHints =
    t.includes("【任务上下文】") ||
    t.includes("【自动路由】") ||
    t.includes("【执行约束】") ||
    /^\/agent\s+\S+/i.test(t) ||
    t.includes("【任务链 Agent 路由】");
  if (!hasVerboseHints) return raw;
  if (t.includes("【任务上下文】")) {
    const head = t.slice(0, 900);
    const ag = head.match(/\bagent\s*=\s*([^；\s\n]+)/i);
    const tid = head.match(/\btaskId\s*=\s*([^；\s\n]+)/i);
    if (ag && tid) {
      const snip = t
        .split("\n")
        .find((l) => {
          const s = l.trim();
          return (
            s.length > 0 &&
            !/^【任务上下文】/.test(s) &&
            !/^【执行约束】/.test(s) &&
            !/^【自动路由】/.test(s)
          );
        })
        ?.replace(/\s+/g, " ")
        .trim()
        .slice(0, 140);
      return `【任务链】${ag[1]} · ${tid[1]}${snip ? `\n${snip}${snip.length >= 140 ? "…" : ""}` : ""}`;
    }
  }
  const claude = t.match(/【任务链 Agent 路由】global:\/\/(\S+)（任务\s*([^）]+)）/);
  if (claude) {
    const line = t
      .split("\n")
      .find((l) => l.trim().startsWith("【任务】"))
      ?.trim()
      .slice(0, 120);
    return `【任务链】${claude[1]} · ${claude[2].trim()}${line ? `\n${line}${line.length >= 120 ? "…" : ""}` : ""}`;
  }
  const local = t.match(/^\/agent\s+(\S+)\s*（任务\s*([^）]+)）/);
  if (local) {
    const rest = t.slice(local[0].length).trim();
    const first = rest.split("\n").find((l) => l.trim().length > 0) ?? "";
    const snip = first.replace(/\s+/g, " ").slice(0, 140);
    return `【任务链】${local[1]} · ${local[2].trim()}${snip ? `\n${snip}${first.length > 140 ? "…" : ""}` : ""}`;
  }
  return raw;
}

export function lastAgentStemFromHistory(hist: DiskMsg[]): string | undefined {
  for (let i = hist.length - 1; i >= 0; i--) {
    const m = hist[i];
    if (m.role === "assistant" && m.agentStem) return m.agentStem;
    if (m.role === "user") {
      const cmd = parseAgentCommand(m.content);
      if (cmd.matched) return cmd.stem;
    }
  }
  return undefined;
}

export function assistantBubbleName(
  m: Pick<DiskMsg, "agentStem" | "agentLabel" | "modelId">,
  modelLabel: string,
): string {
  const rawModel = m.modelId?.trim();
  const displayModel = rawModel && rawModel !== "auto" ? rawModel : modelLabel;
  if (m.agentStem) {
    const label = m.agentLabel?.trim() || m.agentStem;
    const displayName = m.agentStem === "__general__" ? GENERAL_AGENT_DISPLAY_NAME : label;
    return `@${displayName} · ${displayModel}`;
  }
  return displayModel;
}

export function diskToDisplay(list: DiskMsg[], modelLabel: string): Msg[] {
  return list.map((m, historyIndex) => {
    if (m.role !== "assistant") {
      return {
        role: m.role,
        content: shortenLegacyChainUserBubbleForDisplay(m.content),
        name: undefined,
        time: m.ts ? new Date(m.ts).toLocaleString() : undefined,
        attachments: m.attachments?.length ? m.attachments : undefined,
        terminalSnippets: m.terminalSnippets?.length ? m.terminalSnippets : undefined,
        historyIndex,
      };
    }

    const userLine = previousUserLineForAssistant(list, historyIndex);
    const forceReadonly = shouldForceReadonlyAssistantDisplay({
      userLine,
      suppressFileEdits: m.suppressFileEdits,
      requestError: m.requestError,
    });
    let content = stripLargeAssistantArtifacts(m.content);
    if (forceReadonly) content = sanitizeReadonlyAssistantContent(content);

    const localChannel =
      forceReadonly && (m.billingSource === "local" || m.localChannel)
        ? ("direct" as const)
        : m.localChannel;

    return {
      role: "assistant" as const,
      content,
      name: assistantBubbleName(m, modelLabel),
      time: m.ts ? new Date(m.ts).toLocaleString() : undefined,
      historyIndex,
      requestError: m.requestError === true ? true : undefined,
      requestErrorDetail:
        typeof m.requestErrorDetail === "string" && m.requestErrorDetail.trim()
          ? m.requestErrorDetail.trim()
          : undefined,
      agentTurn: forceReadonly
        ? stripAgentTurnForReadonlyDisplay(m.agentTurn)
        : m.agentTurn,
      suppressFileEdits: forceReadonly ? true : undefined,
      localChannel,
    };
  });
}

/** Auto 模式：纯对话 prompt；可含已展开的 @ 上下文与项目规则（与 IDE 能力对齐） */
export async function buildPlainChatPrompt(
  priorHistory: PriorTurn[],
  userLine: string,
  workspaceDir: string | null,
  api: ReturnType<typeof getDesktop> | null,
  opts?: { systemConstraint?: string },
): Promise<string> {
  const { getWorkbenchInteractionMode, interactionModePromptBlock } = await import(
    "@/lib/workbench-interaction-mode"
  );
  const { loadProjectRulesSnippet } = await import("@/lib/project-rules");
  const mode = getWorkbenchInteractionMode();
  const preamble: string[] = [];
  if (workspaceDir) {
    preamble.push(`【工作区】${workspaceDir}`);
  }
  preamble.push("【语言】zh_CN（代码/路径除外）。");
  // 有回合策略时不再叠 mode 块，避免与 turn-policy 双源冲突
  if (opts?.systemConstraint?.trim()) {
    preamble.push(opts.systemConstraint.trim());
  } else {
    preamble.push(interactionModePromptBlock(mode));
  }
  const { buildDirectChatPolicyBlock } = await import(
    "../../../shared/direct-chat-policy.mjs"
  );
  preamble.push(buildDirectChatPolicyBlock(userLine));
  preamble.push(
    "【注意】你是普通聊天助手，没有实时工具；但本轮用户消息可能已嵌入 @selection / @git / @codebase / @problems / @文件 的展开内容，请据此回答。不要输出 XML 工具调用标签，勿声称已自行读盘或写盘。",
  );
  const rules = api ? await loadProjectRulesSnippet(api) : "";
  const blocks: string[] = [preamble.join("\n")];
  if (rules) blocks.push(rules);
  for (const m of priorHistory) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const tag = m.role === "user" ? "用户" : "助手";
    blocks.push(`${tag}：${m.content}`);
  }
  blocks.push(`用户：${userLine}`);
  return blocks.join("\n\n");
}

export function userMessageForHistoryIndex(
  history: DiskMsg[],
  historyIndex: number,
  modelLabel: string,
): Msg | null {
  const msg = history[historyIndex];
  if (!msg || msg.role !== "user") return null;
  const users = diskToDisplay(history.slice(0, historyIndex + 1), modelLabel).filter(
    (m) => m.role === "user",
  );
  return users[users.length - 1] ?? null;
}

export function newLocalId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildComposerUserLine(
  text: string,
  terminalSnippets: PendingTerminalSnippet[],
  domElements: PendingDomElement[] = [],
): string {
  const parts: string[] = [];
  if (text) parts.push(text);
  for (const el of domElements) {
    parts.push(formatDomElementContext(el));
  }
  const terminalPart = terminalSnippets
    .map((s) => trimTerminalDisplay(s.text))
    .filter(Boolean)
    .join("\n\n");
  if (terminalPart) parts.push(terminalPart);
  return parts.join("\n\n");
}

/** 按编排模式从池中选取会话 modelId；Auto / inherit 保留为 auto 哨兵值 */
export function pickOrchestratorModel(raw: string | undefined, pool: string[], mode: OrchMode): string {
  const t = normalizeChatModelSelection(raw);
  if (isAutoModelSelection(t)) return AUTO_MODEL_ID;
  const list = pool.filter(Boolean);
  if (t && list.includes(t)) return t;
  if (mode === "claude-code" && /^(sonnet|opus|haiku|claude-)/i.test(t)) return t;
  return AUTO_MODEL_ID;
}

export function extractPreviewUrlFromText(text: string): string | null {
  const t = String(text || "");
  const m = t.match(/\bhttps?:\/\/[^\s)]+/i);
  if (m?.[0]) return m[0];
  const m2 = t.match(/\blocalhost:\d{2,5}\b/i);
  if (m2?.[0]) return `http://${m2[0]}`;
  const m3 = t.match(/\b127\.0\.0\.1:\d{2,5}\b/i);
  if (m3?.[0]) return `http://${m3[0]}`;
  return null;
}

export function priorTurnsToOrchestrationMessages(prior: PriorTurn[]): PriorTurn[] {
  return prior.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    ...(m.attachments?.length ? { attachments: m.attachments } : {}),
  }));
}

/** 将 RPC 失败映射为聊天区可见文案（超时/429 须展示具体原因，勿一律「生成已停止」） */
export function formatAssistantFailure(res: { aborted?: boolean; error?: string | null }): string {
  const err = String(res.error || "").trim();
  if (res.aborted || res.error === "请求已取消") {
    if (err && /超时|429|配额|模型配置|deepseek|API Key|连接失败/i.test(err)) {
      return `请求失败：${err}`;
    }
    if (err && /已取消|已中止|生成已停止/i.test(err)) {
      return "（生成已停止）";
    }
    if (err && err.length > 24) {
      return `请求失败：${err}`;
    }
    return "（生成已停止）";
  }
  if (/Agent 工具环|工具环不可用|Host：|ensureCli|Ollama|不支持 tools|本地 MCP 编排/i.test(err)) {
    return enrichAgentFailureHint(err);
  }
  return `请求失败：${err || "未知错误"}`;
}

export function genSessionId() {
  try {
    return `s${crypto.randomUUID()}`;
  } catch {
    return `s${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
