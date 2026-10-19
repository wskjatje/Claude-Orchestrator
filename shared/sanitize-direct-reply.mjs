/**
 * 直聊入库/展示前清洗：去掉模型泄漏的伪工具协议。
 * 仅用于只读/forceDirectChat；可写 Agent 真工具轨迹不要走这里整段剥除。
 */

const FAKE_TOOL_RE =
  /<tool_call\b|<\/?function_calls\b|<invoke\b|DSML|"name"\s*:\s*"(?:Bash|Read|Write|Edit|mcp__)/i

/** DeepSeek 等：`<｜｜DSML｜｜…>` / `◁|DSML|…` 整块 */
const DSML_BLOCK_RE =
  /[◄◁‹<]\s*[|｜]{0,2}\s*DSML\s*[|｜]{0,2}[^►▷›>\n]*[►▷›>|｜][\s\S]*?[◄◁‹<]\s*\/?\s*[|｜]{0,2}\s*DSML\s*[|｜]{0,2}[^►▷›>\n]*[►▷›>|｜]/gi

const DSML_TOKEN_RE =
  /[◄◁‹<]\s*[|｜]{0,2}\s*DSML\s*[|｜]{0,2}[^►▷›>\n]*[►▷›>|｜]/gi

/**
 * @param {string} text
 * @returns {string}
 */
function stripFakeToolPayloads(text) {
  let t = String(text || '')
  t = t.replace(/<tool_call\b[^>]*>[\s\S]*?<\/tool_call>/gi, '')
  t = t.replace(/<\/?tool_call\b[^>]*>/gi, '')
  t = t.replace(/<function_calls\b[^>]*>[\s\S]*?<\/function_calls>/gi, '')
  t = t.replace(/<invoke\b[^>]*>[\s\S]*?<\/invoke>/gi, '')
  t = t.replace(DSML_BLOCK_RE, '')
  t = t.replace(DSML_TOKEN_RE, '')
  t = t.replace(/^[^\n]*DSML[^\n]*$/gim, '')
  t = t.replace(
    /^\s*\{[^{}]*"name"\s*:\s*"(?:Bash|Read|Write|Edit|mcp__[a-z0-9_:-]+)"[^{}]*\}\s*$/gim,
    '',
  )
  // 伪 bash 探索围栏（直聊无工具时模型常整段模拟）
  t = t.replace(/```(?:bash|sh|shell|zsh)\b[\s\S]*?```/gi, (block) => {
    if (
      /(?:^|\n)\s*(?:cd|ls|find|cat|rg|grep|head|tail)\b/m.test(block) &&
      /(?:工作区|列出|探索|tree|node_modules|\.git)/.test(block)
    ) {
      return ''
    }
    return block
  })
  return t
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function isHollowCloseOnly(text) {
  const t = String(text || '')
    .replace(/<<<stream-events>>>[\s\S]*?<<<end-stream-events>>>/gi, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
  if (!t) return true
  return /^(?:已完成。?|Done\.?|OK\.?|完成。?)$/i.test(t)
}

/** 聊天区无 KaTeX：把常见行内公式换成纯文本，避免 `$\\rightarrow$` 原样外露 */
function stripInlineLatex(text) {
  let t = String(text || '')
  t = t.replace(/\$\\rightarrow\$/g, '→')
  t = t.replace(/\$\\to\$/g, '→')
  t = t.replace(/\$\\Rightarrow\$/g, '⇒')
  t = t.replace(/\$\\times\$/g, '×')
  t = t.replace(/\$\\cdot\$/g, '·')
  // 其它短行内公式：去掉 $ 壳，保留内部可读字符
  t = t.replace(/\$([^$\n]{1,40})\$/g, (_, inner) =>
    String(inner)
      .replace(/^\\+/, '')
      .replace(/[{}]/g, ''),
  )
  return t
}

/** 去掉直聊文末「下一步 / 切模式 / 征求确认」推销（对齐 Cursor 收尾） */
function stripDirectChatUpsellTail(text) {
  let t = String(text || '')
  // --- + 引用块收尾
  t = t.replace(/\n*---\s*\n+>\s*[\s\S]*$/u, '')
  // 单独引用推销段
  t = t.replace(/\n+>\s*(?:本轮只是建议|需要我下一轮|请切到\s*Plan)[\s\S]*$/iu, '')
  // 普通段落推销
  t = t.replace(
    /\n+(?:需要我下一轮|要不要我|是否现在|请切到\s*Plan\s*\/\s*Agent|可以开始吗)[^\n]*[\s\S]*$/u,
    '',
  )
  return t.trim()
}

/**
 * 把模型爱写的「## 1 / - **小标题**：」百科体压成 Cursor Ask：结论 + 扁平 1.–6.
 * 仅当已出现分节或重嵌套时改写；已是扁平编号则只去掉孤零 ## 结论。
 * @param {string} text
 * @returns {string}
 */
function flattenAskEncyclopediaFormat(text) {
  let t = String(text || '').trim()
  if (!t) return t

  const sectionCount = (t.match(/^##\s*\d+/gm) || []).length
  const heavyNest = (t.match(/^[-*]\s+\*\*[^*]+?\*\*[：:]/gm) || []).length
  if (sectionCount < 2 && heavyNest < 2) {
    // 先吃「## 结论\n正文」，再处理孤行，避免先改成「结论」后丢冒号
    t = t.replace(/^##\s*结论\s*\n+/m, '结论：')
    t = t.replace(/^##\s*结论\s*[：:]\s*/m, '结论：')
    t = t.replace(/^##\s*结论\s*$/m, '结论')
    return t
  }

  const parts = t.split(/(?=^##\s+)/m)
  /** @type {string} */
  let conclusion = ''
  /** @type {string[]} */
  const items = []

  for (const part of parts) {
    const sec = part.match(/^##\s+(\d+)[\.．、)]?\s*([^\n]*)\n?([\s\S]*)$/)
    if (sec) {
      const title = String(sec[2] || '')
        .replace(/[（(][^）)]*[）)]/g, '')
        .replace(/\*\*/g, '')
        .trim()
      const body = String(sec[3] || '').trim()
      /** @type {string[]} */
      const bits = []
      for (const line of body.split('\n')) {
        const heavy = line.match(/^[-*]\s+\*\*([^*]+)\*\*[：:]\s*(.*)$/)
        if (heavy) {
          bits.push(`${heavy[1].trim()}：${heavy[2].trim()}`)
          continue
        }
        const bullet = line.match(/^[-*]\s+(.*)$/)
        if (bullet) {
          bits.push(bullet[1].replace(/\*\*/g, '').trim())
          continue
        }
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) bits.push(trimmed.replace(/\*\*/g, ''))
      }
      const detail = bits.length
        ? bits.map((b) => b.replace(/[：:]+$/u, '').trim()).filter(Boolean).join('；')
        : body.replace(/\n+/g, ' ').replace(/\*\*/g, '').trim()
      const sentence = detail
        ? `${title}${/[：:]$/.test(title) ? '' : '：'}${detail}`
        : title
      if (sentence) {
        items.push(
          sentence
            .replace(/\s+/g, ' ')
            .replace(/：；/g, '；')
            .replace(/[。．]\s*；/g, '；')
            .replace(/；{2,}/g, '；')
            .trim(),
        )
      }
      continue
    }
    if (/^##\s*结论/.test(part)) {
      const body = part
        .replace(/^##\s*结论\s*[：:]?\s*/m, '')
        .replace(/\*\*/g, '')
        .trim()
      if (body) conclusion = body
      continue
    }
    if (!/^##\s/.test(part)) {
      const plain = part.replace(/\*\*/g, '').trim()
      if (plain) conclusion = conclusion ? `${conclusion}\n${plain}` : plain
    }
  }

  if (!items.length) {
    t = t.replace(/^##\s*结论\s*\n+/m, '结论：')
    return t
  }

  // 只重排模型已写内容：无结论块就不发明「见下列…」；不静默丢条目（条数上限留给策略提示，不在展示层砍）
  /** @type {string[]} */
  const lines = []
  if (conclusion.trim()) {
    const c = conclusion.trim()
    lines.push(/^结论/.test(c) ? c : `结论：${c}`, '')
  }
  for (let i = 0; i < items.length; i++) lines.push(`${i + 1}. ${items[i]}`)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeDirectChatReply(text) {
  let t = String(text || '')
  if (!t.trim()) return t

  // 1) 先处理 thinking：保留伪工具信号，避免先剥 tool_call 后再误把过程正文外露
  const think = t.match(/<thinking>([\s\S]*?)<\/thinking>/i)
  if (think) {
    const inner = String(think[1] || '')
    const rest = t.replace(/<thinking>[\s\S]*?<\/thinking>/i, '\n').trim()
    const innerHasFakeTool = FAKE_TOOL_RE.test(inner)
    if (innerHasFakeTool) {
      const cleanedInner = stripFakeToolPayloads(inner)
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      // 伪工具思考不外露；若正文仅有「已完成」空壳则丢弃
      t = isHollowCloseOnly(rest) ? '' : rest
      // 若无外露正文且清洗后仍像可读方案（无伪工具残渣），才放出
      if (!t && cleanedInner && !FAKE_TOOL_RE.test(cleanedInner) && cleanedInner.length > 40) {
        t = cleanedInner
      }
    } else {
      // 无伪工具：用户方案常被误塞进 thinking → 外露；去掉空壳「已完成」
      const cleanedInner = stripFakeToolPayloads(inner).replace(/\n{3,}/g, '\n\n').trim()
      const cleanedRest = isHollowCloseOnly(rest) ? '' : rest
      t = [cleanedInner, cleanedRest].filter(Boolean).join('\n\n')
    }
  }

  // 2) 未闭合 thinking / 残留标签
  t = t.replace(/<\/?thinking>/gi, '')

  // 3) 正文再剥一轮伪工具
  t = stripFakeToolPayloads(t)

  // 4) 展示格式：LaTeX → 纯文本；剥文末推销；百科分节 → Ask 扁平列表
  t = stripInlineLatex(t)
  t = stripDirectChatUpsellTail(t)
  t = flattenAskEncyclopediaFormat(t)

  t = t.replace(/\n{3,}/g, '\n\n').trim()
  return t
}
