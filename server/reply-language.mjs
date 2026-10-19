/**
 * 按用户输入的文字脚本检测回复语言（非产品默认写死某一种语言）。
 * 对齐 Cursor：语言写入 system 提示约束模型；出站不因语言不一致拒发或丢弃正文。
 * `assertReplyLanguageMatchesUser` 仅作审计/诊断（ok 恒为 true，mismatch 时带 warning）。
 */

/** @typedef {{ tag: string, label: string, confident: boolean, scores: Record<string, number> }} LangDetect }

/**
 * 去掉代码块与 URL，避免干扰语言统计
 * @param {string} text
 */
export function stripNonProseForLangDetect(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[a-zA-Z0-9_./\\-]{24,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} ch
 * @returns {string|null} 脚本桶
 */
function scriptBucket(ch) {
  const cp = ch.codePointAt(0)
  if (cp == null) return null
  // CJK（含日文汉字；韩文音节另计）
  if (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x3000 && cp <= 0x303f)
  ) {
    return 'cjk'
  }
  if (cp >= 0x3040 && cp <= 0x30ff) return 'ja' // 假名
  if (cp >= 0xac00 && cp <= 0xd7af) return 'ko' // 韩文音节
  if (cp >= 0x0400 && cp <= 0x04ff) return 'cyrl'
  if (cp >= 0x0600 && cp <= 0x06ff) return 'arab'
  if (cp >= 0x0e00 && cp <= 0x0e7f) return 'thai'
  if ((cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a)) return 'latn'
  return null
}

const TAG_LABEL = {
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  en: 'English',
  ru: 'Russian',
  ar: 'Arabic',
  th: 'Thai',
  latn: 'the same Latin-script language as the user',
}

/**
 * @param {string} text
 * @returns {LangDetect}
 */
export function detectReplyLanguage(text) {
  const prose = stripNonProseForLangDetect(text)
  /** @type {Record<string, number>} */
  const scores = { cjk: 0, ja: 0, ko: 0, latn: 0, cyrl: 0, arab: 0, thai: 0 }
  for (const ch of prose) {
    const b = scriptBucket(ch)
    if (b && scores[b] != null) scores[b] += 1
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  if (total < 2) {
    return { tag: 'und', label: '', confident: false, scores }
  }

  // 假名优先日语；韩文音节优先韩语；否则 CJK 视为中文
  if (scores.ja >= 2 && scores.ja >= scores.cjk * 0.15) {
    return {
      tag: 'ja',
      label: TAG_LABEL.ja,
      confident: scores.ja / total >= 0.12,
      scores,
    }
  }
  if (scores.ko / total >= 0.2) {
    return { tag: 'ko', label: TAG_LABEL.ko, confident: true, scores }
  }
  if (scores.cjk / total >= 0.25) {
    return { tag: 'zh', label: TAG_LABEL.zh, confident: true, scores }
  }
  if (scores.arab / total >= 0.25) {
    return { tag: 'ar', label: TAG_LABEL.ar, confident: true, scores }
  }
  if (scores.cyrl / total >= 0.25) {
    return { tag: 'ru', label: TAG_LABEL.ru, confident: true, scores }
  }
  if (scores.thai / total >= 0.25) {
    return { tag: 'th', label: TAG_LABEL.th, confident: true, scores }
  }
  if (scores.latn / total >= 0.45) {
    // 拉丁文：英文是最常见默认标签；仍要求与用户同为拉丁文脚本
    return { tag: 'en', label: TAG_LABEL.en, confident: true, scores }
  }
  return { tag: 'und', label: '', confident: false, scores }
}

/**
 * 写入 system 的语言策略（随用户输入变化，不写死某语）
 * @param {string} userLine
 */
export function buildLanguagePolicyInstruction(userLine) {
  const d = detectReplyLanguage(userLine)
  if (!d.confident || !d.label) {
    return [
      '【最终回复·语言】使用与用户消息相同的自然语言撰写正文。',
      '禁止在用户使用某一语言时改用另一种语言复述规范、待命或寒暄。',
      '代码、路径、API/库名、专有名词可保留原文。',
    ].join('')
  }
  return [
    `【最终回复·语言】用户消息主要为 ${d.label}（检测标签 ${d.tag}）。`,
    `面向用户的正文必须使用 ${d.label}，与用户一致。`,
    '禁止切换到其它语言复述内部规范、工具链或待命状态。',
    '代码、路径、API/库名、专有名词可保留原文。',
  ].join('')
}

/**
 * 诊断用户与助手正文语言是否一致（对齐 Cursor：永不因此拒发）。
 * @param {string} userLine
 * @param {string} assistantText
 * @returns {{
 *   ok: true,
 *   mismatch?: boolean,
 *   user?: LangDetect,
 *   reply?: LangDetect,
 *   warning?: string,
 * }}
 */
export function assertReplyLanguageMatchesUser(userLine, assistantText) {
  const user = detectReplyLanguage(userLine)
  const reply = detectReplyLanguage(assistantText)
  if (!user.confident) return { ok: true, user, reply }
  // 助手几乎无自然语言（仅代码）时不提示
  const replyLetters =
    (reply.scores.cjk || 0) +
    (reply.scores.ja || 0) +
    (reply.scores.ko || 0) +
    (reply.scores.latn || 0) +
    (reply.scores.cyrl || 0) +
    (reply.scores.arab || 0) +
    (reply.scores.thai || 0)
  if (replyLetters < 12) return { ok: true, user, reply }

  if (!reply.confident) {
    return {
      ok: true,
      mismatch: true,
      user,
      reply,
      warning: `回复语言无法确认与用户一致（用户侧 ${user.label || user.tag}）；正文已照常展示。`,
    }
  }

  // CJK 族：zh/ja 在汉字为主时可能互判；用户 zh + 回复以汉字为主则视为一致
  if (user.tag === 'zh' && (reply.tag === 'zh' || (reply.tag === 'ja' && (reply.scores.cjk || 0) > (reply.scores.ja || 0)))) {
    return { ok: true, user, reply }
  }
  if (user.tag === reply.tag) return { ok: true, user, reply }

  // 拉丁文：en 与其它拉丁语种都算匹配
  if (user.tag === 'en' && reply.tag === 'en') return { ok: true, user, reply }

  return {
    ok: true,
    mismatch: true,
    user,
    reply,
    warning: `回复语言（${reply.label || reply.tag}）与用户输入语言（${user.label || user.tag}）不一致；正文已照常展示（对齐 Cursor，不出站拒发）。`,
  }
}
