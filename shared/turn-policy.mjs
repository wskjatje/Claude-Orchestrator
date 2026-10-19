/**
 * 回合策略单源（对齐 Cursor）。
 * web/src/lib/turn-policy.ts 与 server/turn-policy.mjs 仅再导出本文件。
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

/** 祈使 / 变更言语行为 → 需要写盘或改仓库（含「按方案执行」类，对齐 Cursor Agent 跟进） */
const MUTATION_SPEECH_ACT_RE =
  /(?:请?(?:帮我)?(?:把|将|给|对).{0,40}?(?:改成|改为|修改|更新|替换|写入|写到|写进|保存|落盘|删除|移除|重命名)|(?:请?修改|修复|重构|实现|添加|新增|创建|生成|写入|保存|更新|删除|改一下|改掉|补上|接上).{0,60}?(?:文件|代码|函数|组件|页面|配置|README|测试|bug|缺陷|[\w./-]+\.[a-zA-Z0-9]+)|(?:改代码|改文件|改一下代码)|(?:并写入|写到|写进)\s*[\w./-]+\.[a-zA-Z0-9]+|(?:按(?:照)?|根据|依据).{0,20}(?:方案|计划|建议|优化).{0,16}(?:执行|落地|实施|改)|(?:开始|请|帮我)?(?:执行|落地|实施)(?:一下|吧)?\s*(?:优化|方案|计划|改动|P\d+)?|(?:请|帮我|去|继续)?(?:动手(?:改|做)|落盘|开改)|^(?:改|写)(?:一下|吧)?$|(?:commit|apply|patch|refactor|implement|fix|add|create|write|save|update|delete|go\s*ahead|do\s*it)\b)/i

/** 问句 / 求解释言语行为 → 只读 */
const INTERROGATIVE_SPEECH_ACT_RE =
  /(?:[?？]|^(?:请)?(?:问|告诉我|请问|解释|说明|介绍|概述|总结|讲讲|说说|帮我看|看一下|什么是|为什么|怎么理解)|(?:是什么|做什么|干什么|怎么用|有什么用|主要做|属于什么|如何理解|能不能讲)[?？！!。.]*$)/

/** 工作区/项目指称的简短问询 → 附产品摘录（非业务名列表） */
const WORKSPACE_TOPIC_RE =
  /(?:项目|仓库|工作区|codebase|repo)\s*(?:是什么|做什么|干什么|主要|介绍|概述)|(?:告诉我|介绍|说明).{0,24}(?:项目|仓库|工作区)|^(?:本项目|当前项目|这个仓库|工作区|WEB应用|web\s*应用)$/i

/** 技术/产品只读问答（无「?」也可）→ readonly + slim 摘录 */
const TECHNICAL_QA_RE =
  /(?:架构|性能|瓶颈|依赖|模块|技术栈|目录结构|怎么用|如何用|如何运行|如何启动|怎么跑|优化建议|该怎么优化|如何优化|有哪些依赖|还有哪些可以优化|怎么改比较好)/i

/**
 * 对齐 Cursor Plan/CreatePlan：用户在要「方案文档」产物（非立刻改业务源码）。
 * Ask 仍只聊；Plan/Agent 须允许写入 Markdown 方案文件。
 */
const PLAN_DOCUMENT_SPEECH_ACT_RE =
  /(?:优化方案|合理优化|完整优化|改进方案|实施计划|方案文档|给我.{0,10}方案|给出.{0,10}方案|写一份?.{0,8}方案|制定.{0,10}(?:方案|计划)|根据以上.{0,16}方案|(?:create|write).{0,16}\bplan\b)/i

/**
 * @param {string} displayLine
 */
export function shouldInjectProjectBootstrap(displayLine) {
  const s = String(displayLine || '').trim()
  if (!s || s.length > 160) return false
  return WORKSPACE_TOPIC_RE.test(s) || TECHNICAL_QA_RE.test(s)
}

/**
 * @param {string} displayLine
 */
export function isPlanDocumentRequest(displayLine) {
  return PLAN_DOCUMENT_SPEECH_ACT_RE.test(String(displayLine || '').trim())
}

/**
 * 由本轮用户话术生成方案 Markdown 相对路径（非硬编码固定文件名）。
 * 供 Plan/方案文档约束与 UI 识别；禁止缺 path 时静默猜其它 docs/*.md。
 * @param {string} displayLine
 * @returns {string} e.g. docs/优化方案.md
 */
export function suggestPlanDocumentRelPath(displayLine) {
  const s = String(displayLine || '').trim()
  let slug = s
    .replace(/(?:请|帮我|给我|给出|写一份?|制定|根据以上|一个|一份|完整|合理)/g, '')
    .replace(/[^\u4e00-\u9fffA-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48)
  if (!slug || slug.length < 2) slug = 'plan'
  if (!/\.md$/i.test(slug)) slug = `${slug}.md`
  return `docs/${slug}`
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
  if (
    INTERROGATIVE_SPEECH_ACT_RE.test(s) ||
    shouldInjectProjectBootstrap(s) ||
    TECHNICAL_QA_RE.test(s)
  ) {
    return 'readonly'
  }
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
  const planArtifact =
    isPlanDocumentRequest(input.displayLine) &&
    (interactionMode === 'plan' || interactionMode === 'agent') &&
    intent !== 'write'

  // 不问改就不写：变更言语 或 Plan/Agent 方案文档；Ask / 纯问句禁写
  const allowWrites =
    (intent === 'write' || planArtifact) &&
    (interactionMode === 'agent' || interactionMode === 'plan')
  const autoApplyWrites = allowWrites && interactionMode === 'agent'
  const readOnly = !allowWrites

  // 直聊：Ask、或非写盘意图。方案文档 / 变更 → 进工具环
  const forceDirectChat =
    interactionMode === 'ask' ||
    (!allowWrites && (intent === 'readonly' || (isGeneral && intent !== 'write')))
  const allowTools =
    !forceDirectChat &&
    (interactionMode === 'agent' || interactionMode === 'plan' || Boolean(input.isNamedAgent))

  /** @type {TurnPolicy['contextLevel']} */
  let contextLevel = 'none'
  if (input.isNamedAgent && allowWrites) contextLevel = 'agent-full'
  else if (
    shouldInjectProjectBootstrap(input.displayLine) ||
    intent === 'readonly' ||
    planArtifact
  ) {
    contextLevel = 'slim-product'
  }

  let systemConstraint = ''
  if (planArtifact) {
    const suggestedPath = suggestPlanDocumentRelPath(input.displayLine)
    systemConstraint =
      '【回合策略·方案文档】对齐 Cursor Plan：优先用 write_file 将完整方案写入工作区 Markdown；' +
      '无 tools 时必须用 ```workspace-write' +
      `（仅 JSON：{"path":"${suggestedPath}","content":"..."}；若用户已指定其它 .md 路径则用用户路径。` +
      '禁止硬编码固定文件名如 optimization-plan.md、禁止 YAML path:/content:、禁止缺 path 时另猜无关 docs/*.md）。' +
      '只写方案/计划文档，禁止改业务源码与配置（除非用户明确要求执行/落代码）。' +
      'content 内若含代码示例，用缩进或单行反引号，避免在 content 里再套 ``` 围栏。' +
      '聊天可附短摘要；勿宣称已落盘（由应用落盘/Accept）；落盘后底栏可 Open/Build。'
  } else if (readOnly) {
    systemConstraint =
      '【回合策略·只读】用户在提问/求解释。只用自然语言回答。' +
      '禁止工具写盘、禁止 ```workspace-write``` / ```diff``` / path+content JSON、禁止创建或改写仓库文件。' +
      '对齐 Cursor Ask：先 1 句结论，再扁平 1. 2. 3. 编号（最多 6 条、每条一两句，可含已见路径）。' +
      '若问「做什么/是什么」可简述产品；若问「怎么优化/如何改进/怎么用/还有哪些可以优化」，按上式短答。' +
      '禁止 ## 1/## 2 分节、禁止 - **加粗小标题**： 嵌套、禁止长开场与「三个维度」百科体、禁止 LaTeX、禁止编造未读路径。' +
      '禁止文末推销下一步、征求确认或要求用户切模式。'
  } else if (intent === 'write' && interactionMode === 'agent') {
    systemConstraint =
      '【回合策略·变更】用户要求修改工作区。优先用 search_replace / write_file 工具改盘；' +
      '仅当无 tools 时才用 ```workspace-write```（仅 JSON path+content|contents）。' +
      '只改与请求相关的文件，禁止无关整库重写；勿宣称已落盘（由应用落盘）。' +
      'workspace-write 正文必须是 JSON 对象：须含显式 path，禁止 path:/content: YAML、禁止缺 path 瞎猜、禁止硬编码默认文件名、禁止格式错误时静默兜底。' +
      '【写盘内容·Cursor】先读同目录与入口再写；贴合仓库已有框架/路由/import；优先局部改；' +
      '禁止模块头教学式适配示例、双框架百科、未请求的冗长 docstring/注释墙；禁止代码内静默兜底假成功；禁止整文件注水重写。' +
      '收尾对齐 Cursor 执行反馈：Explored/Edit/Bash 过程由界面展示；正文仅 1～3 句说明改了什么。禁止「是否需你接入」表、禁止「接入点 / 需要你确认后再落 / TODO(接入点) / 未验证声明」整节、禁止「改动清单」与实写文件对不上、禁止【工作区已写入】、禁止「已完成 N 处改动」、禁止「下一步 / P2 / 建议继续」推销。读不到的文件不要列待办。'
  } else if (interactionMode === 'plan') {
    const planPathHint = suggestPlanDocumentRelPath(input.displayLine || '方案')
    systemConstraint =
      '【回合策略·Plan】对齐 Cursor：优先用 write_file / search_replace 工具提出方案与改动（暂存待 Accept）；' +
      '仅当当前模型无 tools 时才用 ```workspace-write```（仅 JSON path+content|contents）。勿宣称已落盘；用户 Accept/Build 后才写入。' +
      `方案 Markdown 默认 path 建议「${planPathHint}」（用户已指定其它 .md 则用用户路径）；落盘后底栏可 Open/Build。` +
      '【写盘内容·Cursor】贴合仓库已有风格；禁止教学式适配示例与整文件注水。'
  } else if (interactionMode === 'agent') {
    systemConstraint =
      '【回合策略·Agent】仅当用户本轮明确要求改文件/修代码时才写盘；纯说明与问答禁止输出写盘块。' +
      '有 tools 时优先 search_replace/write_file；围栏 ```workspace-write``` 仅作无 tools/fragile 回退。'
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
