#!/usr/bin/env node
/**
 * 将 ~/.claude/agents 下 Markdown frontmatter 的 description 译为简体中文。
 * 用法：node scripts/translate-agent-descriptions-zh.mjs [--dry-run]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const AGENTS_DIR = path.join(os.homedir(), '.claude', 'agents')
const OLLAMA = (process.env.OLLAMA_BASE || 'http://127.0.0.1:11434').replace(/\/$/, '')
const MODEL = process.env.TRANSLATE_MODEL || 'qwen2.5-coder:latest'
const BATCH = Number(process.env.TRANSLATE_BATCH || 12)
const DRY = process.argv.includes('--dry-run')

const HAS_CJK = /[\u4e00-\u9fff]/

function listAgentFiles(dir) {
  /** @type {string[]} */
  const out = []
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name)
      if (ent.isDirectory()) walk(full)
      else if (ent.name.toLowerCase().endsWith('.md')) out.push(full)
    }
  }
  walk(dir)
  return out.sort()
}

function parseFrontmatter(raw) {
  if (!raw.trimStart().startsWith('---')) return null
  const closeIdx = raw.indexOf('\n---', 3)
  if (closeIdx === -1) return null
  const fm = raw.slice(3, closeIdx)
  const body = raw.slice(closeIdx + 4)
  const dm = fm.match(/^description:\s*(.+)$/m)
  const desc = dm ? dm[1].trim().replace(/^["']|["']$/g, '') : ''
  return { fm, body, desc, descLine: dm ? dm[0] : null }
}

function replaceDescription(fm, oldLine, newDesc) {
  const safe = newDesc.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const line = `description: ${safe.includes(':') || safe.includes('#') ? `"${safe}"` : safe}`
  if (oldLine) return fm.replace(oldLine, line)
  return `${fm.trimEnd()}\n${line}\n`
}

async function translateBatch(items) {
  const payload = items.map((x) => ({ file: x.rel, en: x.desc }))
  const prompt = `你是技术文档翻译。将下列 Agent 的英文 description 译为**简体中文**（每条 1～2 句，保留专业术语可留英文缩写如 MCP/PRD/SOC2）。
只返回 JSON 数组，无 markdown 围栏，格式：[{"file":"xxx.md","zh":"中文描述"}]
条目数必须等于 ${items.length}。

${JSON.stringify(payload, null, 2)}`

  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: 0.2, num_predict: 4096 },
    }),
  })
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`)
  const data = await res.json()
  let text = String(data?.message?.content || '').trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new Error('模型未返回 JSON 数组')
  return parsed
}

function relFromAgents(abs) {
  return path.relative(AGENTS_DIR, abs).replace(/\\/g, '/')
}

async function main() {
  if (!fs.existsSync(AGENTS_DIR)) {
    console.error('未找到', AGENTS_DIR)
    process.exit(1)
  }

  const files = listAgentFiles(AGENTS_DIR)
  /** @type {{ abs: string, rel: string, raw: string, desc: string, fm: string, body: string, descLine: string | null }[]} */
  const todo = []

  for (const abs of files) {
    const raw = fs.readFileSync(abs, 'utf8')
    const parsed = parseFrontmatter(raw)
    if (!parsed?.desc?.trim()) continue
    if (HAS_CJK.test(parsed.desc)) continue
    todo.push({
      abs,
      rel: relFromAgents(abs),
      raw,
      desc: parsed.desc,
      fm: parsed.fm,
      body: parsed.body,
      descLine: parsed.descLine,
    })
  }

  console.log(`待翻译 ${todo.length} / ${files.length} 个 Agent（已跳过含中文 description）`)
  if (!todo.length) return

  let updated = 0
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    console.log(`批次 ${Math.floor(i / BATCH) + 1}：${batch.map((b) => b.rel).join(', ')}`)
    let translations
    try {
      translations = await translateBatch(batch)
    } catch (e) {
      console.error('翻译失败，跳过本批：', e.message)
      continue
    }
    const byFile = new Map(translations.map((t) => [String(t.file).replace(/\\/g, '/'), String(t.zh || '').trim()]))

    for (const item of batch) {
      const zh = byFile.get(item.rel) || byFile.get(path.basename(item.rel))
      if (!zh || !HAS_CJK.test(zh)) {
        console.warn('  跳过（无有效中文）', item.rel)
        continue
      }
      const newFm = replaceDescription(item.fm, item.descLine, zh.slice(0, 500))
      const next = `---\n${newFm}\n---${item.body}`
      if (DRY) {
        console.log(`  [dry] ${item.rel}\n    ${zh.slice(0, 80)}…`)
      } else {
        fs.writeFileSync(item.abs, next, 'utf8')
      }
      updated++
    }
  }

  console.log(DRY ? `dry-run 完成，将更新 ${updated} 个文件` : `已更新 ${updated} 个 description`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
