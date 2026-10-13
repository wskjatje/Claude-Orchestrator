import fs from 'node:fs'
import path from 'node:path'
import { loadWorkspace } from './store.mjs'

/** 根级规则；不含 AGENTS/CLAUDE（由 CLI 侧自行读取，避免双重注入） */
const ROOT_CANDIDATES = [
  '.claudecode/user-preferences.mdc',
  '.claudecode/RULES.md',
  '.claudecode/rules.md',
  'RULES.md',
  '.cursorrules',
]

const RULE_EXTS = new Set(['.mdc', '.md'])

/** @type {{ close: () => void } | null} */
let watcher = null
/** @type {string | null} */
let watchedRoot = null
let debounceTimer = null
/** @type {((detail: any) => void) | null} */
let onRulesChanged = null

/**
 * 由 handlers 注入广播回调，避免循环依赖。
 * @param {(detail: any) => void} fn
 */
export function setProjectRulesChangedEmitter(fn) {
  onRulesChanged = typeof fn === 'function' ? fn : null
}

/**
 * 列出工作区内全部项目规则文件（根候选 + .cursor/rules 目录）
 * @returns {{ ok: boolean, files: Array<{ relPath: string, mtimeMs: number, size: number }>, error?: string }}
 */
export function listProjectRuleFiles() {
  const workspaceDir = loadWorkspace()
  if (!workspaceDir) return { ok: false, files: [], error: '未选择工作区' }
  const root = path.resolve(workspaceDir)
  if (!fs.existsSync(root)) return { ok: false, files: [], error: '工作区路径不存在' }

  /** @type {Array<{ relPath: string, mtimeMs: number, size: number }>} */
  const files = []

  for (const rel of ROOT_CANDIDATES) {
    pushIfFile(root, rel, files)
  }

  const cursorRules = path.join(root, '.cursor', 'rules')
  if (fs.existsSync(cursorRules) && fs.statSync(cursorRules).isDirectory()) {
    walkRulesDir(root, cursorRules, files)
  }

  files.sort((a, b) => a.relPath.localeCompare(b.relPath, 'en'))
  return { ok: true, files }
}

function pushIfFile(root, rel, out) {
  const abs = path.resolve(root, rel)
  if (!abs.startsWith(root)) return
  try {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return
    const st = fs.statSync(abs)
    out.push({
      relPath: rel.replace(/\\/g, '/'),
      mtimeMs: st.mtimeMs,
      size: st.size,
    })
  } catch {
    /* skip */
  }
}

function walkRulesDir(root, absDir, out) {
  let ents = []
  try {
    ents = fs.readdirSync(absDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of ents) {
    const abs = path.join(absDir, ent.name)
    if (!abs.startsWith(root)) continue
    if (ent.isDirectory()) {
      walkRulesDir(root, abs, out)
      continue
    }
    if (!ent.isFile()) continue
    const ext = path.extname(ent.name).toLowerCase()
    if (!RULE_EXTS.has(ext)) continue
    try {
      const st = fs.statSync(abs)
      out.push({
        relPath: path.relative(root, abs).replace(/\\/g, '/'),
        mtimeMs: st.mtimeMs,
        size: st.size,
      })
    } catch {
      /* skip */
    }
  }
}

function emitRulesChanged() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    if (!onRulesChanged) return
    const listed = listProjectRuleFiles()
    onRulesChanged({
      workspace: loadWorkspace(),
      files: listed.ok ? listed.files : [],
    })
  }, 120)
}

/**
 * 监视 .cursor/rules 与根规则文件；工作区切换时调用。
 */
export function ensureProjectRulesWatcher() {
  const workspaceDir = loadWorkspace()
  const root = workspaceDir ? path.resolve(workspaceDir) : null

  if (root === watchedRoot && watcher) return
  stopProjectRulesWatcher()
  watchedRoot = root
  if (!root || !fs.existsSync(root)) return

  // 禁止对整个工作区 recursive watch（大仓库会 EMFILE 并拖垮 Bridge）
  const cursorDir = path.join(root, '.cursor')
  const cursorRules = path.join(root, '.cursor', 'rules')
  const claudecodeDir = path.join(root, '.claudecode')
  /** @type {string[]} */
  const targets = []
  if (fs.existsSync(cursorRules)) targets.push(cursorRules)
  else if (fs.existsSync(cursorDir)) targets.push(cursorDir)
  if (fs.existsSync(claudecodeDir)) targets.push(claudecodeDir)
  for (const rel of ROOT_CANDIDATES) {
    const abs = path.join(root, rel)
    if (fs.existsSync(abs)) targets.push(abs)
  }

  const watchers = []
  for (const t of [...new Set(targets)]) {
    try {
      const st = fs.statSync(t)
      const recursive = st.isDirectory() && (t === cursorRules || t === claudecodeDir)
      const w = fs.watch(t, recursive ? { recursive: true } : {}, () => {
        emitRulesChanged()
        if (t === cursorDir) {
          setTimeout(() => {
            if (watchedRoot === root) {
              stopProjectRulesWatcher()
              watchedRoot = null
              ensureProjectRulesWatcher()
            }
          }, 200)
        }
      })
      w.on('error', (err) => {
        // EMFILE 等不可恢复错误：关掉该 watcher，保留 Bridge；轮询仍会补绑
        console.warn('[project-rules] watch error:', err?.code || err?.message || err)
        try {
          w.close()
        } catch {
          /* ignore */
        }
      })
      watchers.push(w)
    } catch (err) {
      console.warn('[project-rules] watch skip:', t, err?.message || err)
    }
  }

  // 冷启动：立刻广播一包，便于前端刷缓存
  emitRulesChanged()

  // 无 .cursor 时缩短轮询，便于新建目录后挂上
  const poll = setInterval(() => {
    if (watchedRoot !== root) return
    let needRebind = false
    for (const rel of ROOT_CANDIDATES) {
      const abs = path.join(root, rel)
      if (fs.existsSync(abs) && !targets.includes(abs)) needRebind = true
    }
    if (fs.existsSync(cursorRules) && !targets.includes(cursorRules)) needRebind = true
    if (!needRebind) return
    emitRulesChanged()
    stopProjectRulesWatcher()
    watchedRoot = null
    ensureProjectRulesWatcher()
  }, 1500)
  watchers.push({
    close() {
      clearInterval(poll)
    },
  })

  if (!watchers.length) return
  watcher = {
    close() {
      for (const w of watchers) {
        try {
          w.close()
        } catch {
          /* */
        }
      }
    },
  }
}

export function stopProjectRulesWatcher() {
  if (watcher) {
    try {
      watcher.close()
    } catch {
      /* */
    }
  }
  watcher = null
  watchedRoot = null
}
