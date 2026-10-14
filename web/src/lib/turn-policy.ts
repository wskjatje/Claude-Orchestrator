/**
 * 与 server/turn-policy.mjs 保持同步（Cursor 式言语行为策略）。
 * 不按模型名/项目名硬编码；不做静默换后端。
 */

export type InteractionMode = "ask" | "plan" | "agent";
export type TurnIntent = "readonly" | "write" | "chat";

export type TurnPolicy = {
  interactionMode: InteractionMode;
  intent: TurnIntent;
  allowWrites: boolean;
  allowTools: boolean;
  forceDirectChat: boolean;
  autoApplyWrites: boolean;
  contextLevel: "none" | "slim-product" | "agent-full";
  systemConstraint: string;
};

const MUTATION_SPEECH_ACT_RE =
  /(?:请?(?:帮我)?(?:把|将|给|对).{0,40}?(?:改成|改为|修改|更新|替换|写入|写到|写进|保存|落盘|删除|移除|重命名)|(?:修复|重构|实现|添加|新增|创建|生成|写入|保存|更新|删除|改一下|改掉|补上|接上).{0,60}?(?:文件|代码|函数|组件|页面|配置|README|测试|bug|缺陷)|(?:commit|apply|patch|refactor|implement|fix|add|create|write|save|update|delete)\b)/i;

const INTERROGATIVE_SPEECH_ACT_RE =
  /(?:[?？]|^(?:请)?(?:问|告诉我|请问|解释|说明|介绍|概述|总结|讲讲|说说|帮我看|看一下|什么是|为什么|怎么理解)|(?:是什么|做什么|干什么|怎么用|有什么用|主要做|属于什么|如何理解|能不能讲)[?？！!。.]*$)/;

const WORKSPACE_TOPIC_RE =
  /(?:项目|仓库|工作区|codebase|repo)\s*(?:是什么|做什么|干什么|主要|介绍|概述)|(?:告诉我|介绍|说明).{0,24}(?:项目|仓库|工作区)|^(?:本项目|当前项目|这个仓库|工作区|WEB应用|web\s*应用)$/i;

export function shouldInjectProjectBootstrap(displayLine: string): boolean {
  const s = String(displayLine || "").trim();
  if (!s || s.length > 160) return false;
  return WORKSPACE_TOPIC_RE.test(s);
}

export function classifyTurnIntent(displayLine: string): TurnIntent {
  const s = String(displayLine || "").trim();
  if (!s) return "chat";
  if (MUTATION_SPEECH_ACT_RE.test(s)) return "write";
  if (INTERROGATIVE_SPEECH_ACT_RE.test(s) || shouldInjectProjectBootstrap(s)) return "readonly";
  return "chat";
}

export function isReadOnlyUserIntent(displayLine: string): boolean {
  return classifyTurnIntent(displayLine) === "readonly";
}

export function resolveTurnPolicy(input: {
  displayLine: string;
  interactionMode: InteractionMode;
  isGeneralTurn?: boolean;
  isNamedAgent?: boolean;
}): TurnPolicy {
  const interactionMode = input.interactionMode || "ask";
  const intent = classifyTurnIntent(input.displayLine);
  const isGeneral = Boolean(input.isGeneralTurn) || !input.isNamedAgent;

  // 不问改就不写：仅「变更」言语行为 + Agent/Plan 通道才允许写盘。
  // Ask 通道、问句、寒暄/闲聊（chat）一律禁写，避免模型乱吐 workspace-write 刷 Edit 卡。
  const allowWrites =
    intent === "write" && (interactionMode === "agent" || interactionMode === "plan");
  const autoApplyWrites = allowWrites && interactionMode === "agent";
  const readOnly = !allowWrites;
  const forceDirectChat =
    interactionMode === "ask" || intent === "readonly" || (isGeneral && intent !== "write");
  const allowTools =
    !forceDirectChat &&
    (interactionMode === "agent" || interactionMode === "plan" || Boolean(input.isNamedAgent));

  let contextLevel: TurnPolicy["contextLevel"] = "none";
  if (input.isNamedAgent && allowWrites) contextLevel = "agent-full";
  else if (shouldInjectProjectBootstrap(input.displayLine) || intent === "readonly") {
    contextLevel = "slim-product";
  }

  let systemConstraint = "";
  if (readOnly) {
    systemConstraint =
      "【回合策略·只读】用户在提问/求解释。只用自然语言回答。" +
      "禁止工具写盘、禁止 ```workspace-write``` / ```diff``` / path+content JSON、禁止创建或改写仓库文件。";
  } else if (intent === "write" && interactionMode === "agent") {
    systemConstraint =
      "【回合策略·变更】用户要求修改工作区。按需用 ```workspace-write```（path+content）提出改动；" +
      "只改与请求相关的文件，禁止无关整库重写；勿宣称已落盘（由应用落盘）。";
  } else if (interactionMode === "plan") {
    systemConstraint =
      "【回合策略·Plan】可提出方案与 workspace-write/diff，勿宣称已落盘。";
  } else if (interactionMode === "agent") {
    systemConstraint =
      "【回合策略·Agent】仅当用户本轮明确要求改文件/修代码时才写盘；纯说明与问答禁止输出写盘块。";
  }

  return {
    interactionMode,
    intent,
    allowWrites,
    allowTools,
    forceDirectChat,
    autoApplyWrites,
    contextLevel,
    systemConstraint,
  };
}

/** Cursor 对齐：ask 禁写 / plan 暂存 / agent 落盘 */
export type EffectiveWriteMode = "ask" | "plan" | "agent";

export function effectiveWriteMode(
  policy: Pick<TurnPolicy, "allowWrites" | "autoApplyWrites" | "interactionMode"> | null | undefined,
): EffectiveWriteMode {
  const p = policy || { allowWrites: false, autoApplyWrites: false, interactionMode: "ask" as const };
  if (p.allowWrites === false) return "ask";
  if (p.autoApplyWrites === false) return "plan";
  if (p.interactionMode === "ask") return "ask";
  if (p.interactionMode === "plan") return "plan";
  if (p.allowWrites && p.autoApplyWrites) return "agent";
  if (p.interactionMode === "agent") return "agent";
  return "ask";
}

export function cliPermissionModeFromWriteMode(writeMode: EffectiveWriteMode): "plan" | "acceptEdits" {
  return writeMode === "agent" ? "acceptEdits" : "plan";
}
