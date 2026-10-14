/**
 * 回合策略（对齐 Cursor）
 *
 * Cursor 模型：
 * - Ask = 通道级硬只读（无写工具 / 不落盘）
 * - Agent = 允许改仓库，但「问句」语义仍只回答
 * - Plan = 可提改动，不自动落盘
 *
 * 语义按言语行为（问句 vs 祈使/变更），不按模型名、不按项目名硬编码。
 * 失败明确报错，禁止静默换后端。
 */

/** @typedef {'ask'|'plan'|'agent'} InteractionMode */
/** @typedef {'readonly'|'write'|'chat'} TurnIntent */
/**
 * @typedef {object} TurnPolicy
 * @property {InteractionMode} interactionMode
 * @property {TurnIntent} intent
 * @property {boolean} allowWrites
 * @property {boolean} allowTools
 * @property {boolean} forceDirectChat
 * @property {boolean} autoApplyWrites
 * @property {'none'|'slim-product'|'agent-full'} contextLevel
 * @property {string} systemConstraint
 */

/** 祈使 / 变更言语行为 → 需要写盘或改仓库 */
const MUTATION_SPEECH_ACT_RE =
  /(?:请?(?:帮我)?(?:把|将|给|对).{0,40}?(?:改成|改为|修改|更新|替换|写入|写到|写进|保存|落盘|删除|移除|重命名)|(?:修复|重构|实现|添加|新增|创建|生成|写入|保存|更新|删除|改一下|改掉|补上|接上).{0,60}?(?:文件|代码|函数|组件|页面|配置|README|测试|bug|缺陷)|(?:commit|apply|patch|refactor|implement|fix|add|create|write|save|update|delete)\b)/i

/** 问句 / 求解释言语行为 → 只读 */
const INTERROGATIVE_SPEECH_ACT_RE =
  /(?:[?？]|^(?:请)?(?:问|告诉我|请问|解释|说明|介绍|概述|总结|讲讲|说说|帮我看|看一下|什么是|为什么|怎么理解)|(?:是什么|做什么|干什么|怎么用|有什么用|主要做|属于什么|如何理解|能不能讲)[?？！!。.]*$)/

/** 工作区/项目指称的简短问询 → 附产品摘录（非业务名列表） */
const WORKSPACE_TOPIC_RE =
  /(?:项目|仓库|工作区|codebase|repo)\s*(?:是什么|做什么|干什么|主要|介绍|概述)|(?:告诉我|介绍|说明).{0,24}(?:项目|仓库|工作区)|^(?:本项目|当前项目|这个仓库|工作区|WEB应用|web\s*应用)$/i

/**
 * @param {string} displayLine
 */
export function shouldInjectProjectBootstrap(displayLine) {
  const s = String(displayLine || '').trim()
  if (!s || s.length > 160) return false
  return WORKSPACE_TOPIC_RE.test(s)
}

/**
 * @param {string} displayLine
 */
export function isReadOnlyUserIntent(displayLine) {
  return classifyTurnIntent(displayLine) === 'readonly'
}

/**
 * @param {string} displayLine
 * @returns {TurnIntent}
 */
export function classifyTurnIntent(displayLine) {
  const s = String(displayLine || '').trim()
  if (!s) return 'chat'
  // 变更言语优先于问句（「改成什么？」这类仍可能是变更）
  if (MUTATION_SPEECH_ACT_RE.test(s)) return 'write'
  if (INTERROGATIVE_SPEECH_ACT_RE.test(s) || shouldInjectProjectBootstrap(s)) return 'readonly'
  return 'chat'
}

/**
 * @param {{
 *   displayLine: string
 *   interactionMode: InteractionMode
 *   isGeneralTurn?: boolean
 *   isNamedAgent?: boolean
 * }} input
 * @returns {TurnPolicy}
 */
export function resolveTurnPolicy(input) {
  const interactionMode = input.interactionMode || 'ask'
  const intent = classifyTurnIntent(input.displayLine)
  const isGeneral = Boolean(input.isGeneralTurn) || !input.isNamedAgent

  // 不问改就不写：仅「变更」言语行为 + Agent/Plan 才允许写盘（Ask / 问句 / chat 一律禁写）
  const allowWrites =
    intent === 'write' && (interactionMode === 'agent' || interactionMode === 'plan')
  const autoApplyWrites = allowWrites && interactionMode === 'agent'
  const readOnly = !allowWrites

  // 直聊：Ask、问句、或通用对话且非「变更」语义（寒暄/闲聊不进工具环）
  const forceDirectChat =
    interactionMode === 'ask' || intent === 'readonly' || (isGeneral && intent !== 'write')
  const allowTools =
    !forceDirectChat &&
    (interactionMode === 'agent' || interactionMode === 'plan' || Boolean(input.isNamedAgent))

  /** @type {TurnPolicy['contextLevel']} */
  let contextLevel = 'none'
  if (input.isNamedAgent && allowWrites) contextLevel = 'agent-full'
  else if (shouldInjectProjectBootstrap(input.displayLine) || intent === 'readonly') {
    contextLevel = 'slim-product'
  }

  let systemConstraint = ''
  if (readOnly) {
    systemConstraint =
      '【回合策略·只读】用户在提问/求解释。只用自然语言回答。' +
      '禁止工具写盘、禁止 ```workspace-write``` / ```diff``` / path+content JSON、禁止创建或改写仓库文件。'
  } else if (intent === 'write' && interactionMode === 'agent') {
    systemConstraint =
      '【回合策略·变更】用户要求修改工作区。按需用 ```workspace-write```（path+content）提出改动；' +
      '只改与请求相关的文件，禁止无关整库重写；勿宣称已落盘（由应用落盘）。'
  } else if (interactionMode === 'plan') {
    systemConstraint =
      '【回合策略·Plan】可提出方案与 workspace-write/diff，勿宣称已落盘。'
  } else if (interactionMode === 'agent') {
    systemConstraint =
      '【回合策略·Agent】仅当用户本轮明确要求改文件/修代码时才写盘；纯说明与问答禁止输出写盘块。'
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
  }
}

/**
 * Cursor 对齐的落盘档位：
 * - ask：禁止写盘
 * - plan：可暂存待 Accept，不自动落盘
 * - agent：可立即落盘
 * @param {{ allowWrites?: boolean, autoApplyWrites?: boolean, interactionMode?: string } | null | undefined} policy
 * @returns {'ask' | 'plan' | 'agent'}
 */
export function effectiveWriteMode(policy) {
  const p = policy && typeof policy === 'object' ? policy : {}
  if (p.allowWrites === false) return 'ask'
  if (p.autoApplyWrites === false) return 'plan'
  const m = String(p.interactionMode || '').toLowerCase()
  if (m === 'ask') return 'ask'
  if (m === 'plan' || m === 'propose' || m === 'manual') return 'plan'
  if (p.allowWrites === true && p.autoApplyWrites === true) return 'agent'
  if (m === 'agent') return 'agent'
  return 'ask'
}

/** CLI --permission-mode：仅 agent 档用 acceptEdits */
export function cliPermissionModeFromWriteMode(writeMode) {
  return writeMode === 'agent' ? 'acceptEdits' : 'plan'
}
