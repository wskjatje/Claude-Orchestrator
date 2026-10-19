#!/usr/bin/env node
/**
 * 闸门：workspace-write 须对齐 Cursor —— 仅 JSON path + content|contents。
 * 禁止 YAML path:/content: 兜底、禁止 markdownFenceAsPlan / docs/${stem} 猜路径。
 * 逻辑与 web/src/lib/assistant-reply.ts 对齐。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(root, 'web/src/lib/assistant-reply.ts'), 'utf8')
const sharedPol = fs.readFileSync(path.join(root, 'shared/turn-policy.mjs'), 'utf8')
const webPol = fs.readFileSync(path.join(root, 'web/src/lib/turn-policy.ts'), 'utf8')
const srvPol = fs.readFileSync(path.join(root, 'server/turn-policy.mjs'), 'utf8')
assert(/shared\/turn-policy\.mjs/.test(webPol) && /shared\/turn-policy\.mjs/.test(srvPol), 'turn-policy re-export')

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else console.log('ok:', msg)
}

assert(!/parseYamlStyleWorkspaceWrite/.test(src), 'no YAML workspace-write parser')
assert(!/markdownFenceAsPlan/.test(src), 'no markdownFenceAsPlan path invent')
assert(!/docs\/\$\{stem\}/.test(src) && !/docs\/\${stem}/.test(src), 'no docs/${stem}.md hardcode')
assert(/contentRaw = o\.content/.test(src) && /o\.contents/.test(src), 'accept content|contents')
assert(/typeof o\.path !== "string"/.test(src), 'require explicit path field')
assert(/禁止 YAML 伪结构/.test(src), 'reject YAML in findBlocks')
assert(/findTopLevelJsonEnd/.test(src), 'JSON-first end scanner')
assert(/findBalancedTripleFenceClose/.test(src), 'balanced fence for strip-only')

assert(sharedPol.includes('禁止缺 path 瞎猜'), 'turn-policy both: no path guess')
assert(sharedPol.includes('禁止格式错误时静默兜底'), 'turn-policy both: no silent format fallback')
assert(sharedPol.includes('仅 JSON path+content'), 'turn-policy both: JSON-only write format')

/** Runtime mini-replica：仅 JSON；YAML / 裸文 → 0 项 */
function findTopLevelJsonEnd(s, start) {
  let i = start
  while (i < s.length && /\s/.test(s[i])) i++
  const c0 = s[i]
  if (c0 !== '{' && c0 !== '[') return -1
  let depth = 0
  let inStr = false
  let esc = false
  for (; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) {
        esc = false
        continue
      }
      if (c === '\\') {
        esc = true
        continue
      }
      if (c === '"') {
        inStr = false
        continue
      }
      continue
    }
    if (c === '"') {
      inStr = true
      continue
    }
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return -1
}

function findBalancedTripleFenceClose(text, bodyStart) {
  let depth = 1
  let pos = bodyStart
  while (pos < text.length) {
    const idx = text.indexOf('```', pos)
    if (idx === -1) return null
    const after = text.slice(idx + 3)
    const openLang = after.match(/^([a-zA-Z0-9_+-]*)\r?\n/)
    const lang = openLang ? openLang[1] : ''
    if (lang && /^workspace-write$/i.test(lang)) {
      if (depth === 1) return { index: idx, consumeClose: false }
      depth -= 1
      if (depth === 0) return { index: idx, consumeClose: false }
      pos = idx + 3
      continue
    }
    if (lang) {
      depth += 1
      pos = idx + 3
      continue
    }
    depth -= 1
    if (depth === 0) return { index: idx, consumeClose: true }
    pos = idx + 3
  }
  return null
}

function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null
  if (typeof item.path !== 'string') return null
  const p = item.path.trim()
  if (!p || p.includes('..')) return null
  const contentRaw = item.content != null ? item.content : item.contents != null ? item.contents : null
  if (contentRaw == null) return null
  return { path: p.replace(/\\/g, '/'), content: String(contentRaw) }
}

function parseAll(text) {
  const openRe = /(?:```|''')\s*`?\s*workspace-write\s*`?\s*\n?/gi
  const out = []
  let m
  while ((m = openRe.exec(text))) {
    const bodyStart = m.index + m[0].length
    const peek = text.slice(bodyStart, bodyStart + 96)
    if (/^\s*(?:path|file|filePath)\s*:/i.test(peek) && !/^\s*[{\[]/.test(peek)) {
      const closed = findBalancedTripleFenceClose(text, bodyStart)
      openRe.lastIndex = closed
        ? closed.consumeClose
          ? closed.index + 3
          : closed.index
        : text.length
      continue
    }
    if (!/^\s*[{\[]/.test(text.slice(bodyStart))) {
      const closed = findBalancedTripleFenceClose(text, bodyStart)
      openRe.lastIndex = closed
        ? closed.consumeClose
          ? closed.index + 3
          : closed.index
        : text.length
      continue
    }
    const relJson = text.slice(bodyStart).search(/[{\[]/)
    if (relJson === -1) {
      openRe.lastIndex = bodyStart + 1
      continue
    }
    const abs = bodyStart + relJson
    const jsonEnd = findTopLevelJsonEnd(text, abs)
    if (jsonEnd === -1) {
      openRe.lastIndex = bodyStart + 1
      continue
    }
    try {
      const parsed = JSON.parse(text.slice(abs, jsonEnd).trim())
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const it of items) {
        const n = normalizeItem(it)
        if (n) out.push(n)
      }
    } catch {
      /* ignore */
    }
    let outerEnd = jsonEnd
    while (outerEnd < text.length && /\s/.test(text[outerEnd])) outerEnd++
    const closeFence = text.slice(outerEnd).match(/^(?:```|''')/)
    if (closeFence) outerEnd += closeFence[0].length
    openRe.lastIndex = outerEnd
  }
  return out
}

const jsonOk =
  '```workspace-write\n{"path":"docs/a.md","content":"hi\\n```bash\\nx\\n```\\nok"}\n```\n'
assert(parseAll(jsonOk).length === 1 && parseAll(jsonOk)[0].path === 'docs/a.md', 'JSON fence ok')

const contentsAlias =
  '```workspace-write\n{"path":"src/x.ts","contents":"export {}"}\n```\n'
assert(parseAll(contentsAlias)[0]?.content === 'export {}', 'contents alias ok')

const yamlReject =
  '```workspace-write\npath: docs/a.md\ncontent: hi\n\n```bash\nx\n```\nok\n```\n'
assert(parseAll(yamlReject).length === 0, 'YAML fence rejected (no兜底)')

const bareMd =
  '```workspace-write\n# 优化方案\n\n一堆正文超过八十字符用来触发旧猜路径逻辑abcdefghijklmnopqrstuvwxyz\n```\n'
assert(parseAll(bareMd).length === 0, 'bare markdown fence rejected (no docs/${stem})')

const noPath = '```workspace-write\n{"content":"x"}\n```\n'
assert(parseAll(noPath).length === 0, 'missing path rejected')

const fileAlias = '```workspace-write\n{"file":"docs/a.md","content":"x"}\n```\n'
assert(parseAll(fileAlias).length === 0, 'file alias rejected (path only)')

const sibling =
  '```workspace-write\n{"path":"docs/a.md","content":"A"}\n```\n\n```workspace-write\n{"path":"docs/b.md","content":"B"}\n```\n'
const sib = parseAll(sibling)
assert(sib.length === 2 && sib[0].path === 'docs/a.md' && sib[1].path === 'docs/b.md', 'sibling JSON ok')

if (process.exitCode) {
  console.error('check-workspace-write-yaml: FAILED')
  process.exit(process.exitCode)
}
console.log('check-workspace-write-yaml: PASSED (Cursor JSON-only)')
