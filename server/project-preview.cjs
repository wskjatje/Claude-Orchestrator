'use strict'

const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')

/** @type {{
 *   kind: string | null,
 *   port: number | null,
 *   url: string | null,
 *   process: import('node:child_process').ChildProcess | null,
 *   server: import('node:http').Server | null,
 *   cwd: string | null,
 *   label: string | null,
 *   entryRel: string | null,
 * }} */
let state = {
  kind: null,
  port: null,
  url: null,
  process: null,
  server: null,
  cwd: null,
  label: null,
  entryRel: null,
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const s = http.createServer()
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      s.close((err) => (err ? reject(err) : resolve(port)))
    })
    s.on('error', reject)
  })
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function listHtmlFiles(workspaceDir, maxDepth = 6) {
  /** @type {{ rel: string, abs: string, name: string }[]} */
  const hits = []
  function walk(dir, depth) {
    if (depth > maxDepth) return
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full, depth + 1)
      else if (/\.html?$/i.test(e.name)) {
        hits.push({
          rel: path.relative(workspaceDir, full).replace(/\\/g, '/'),
          abs: full,
          name: e.name,
        })
      }
    }
  }
  walk(workspaceDir, 0)
  return hits
}

function scoreHtmlHit(hit, hint) {
  const h = String(hint || '')
    .toLowerCase()
    .replace(/页面|效果|preview|run/gi, '')
    .trim()
  let score = 0
  const name = hit.name.toLowerCase()
  const rel = hit.rel.toLowerCase()
  if (!h) {
    if (name === 'index.html') score += 30
    if (rel === 'index.html') score += 20
    score += Math.max(0, 10 - rel.split('/').length)
    return score
  }
  if (name.includes(h) || rel.includes(h)) score += 15
  if (/login|登录/.test(h) && /login/.test(name)) score += 25
  if (/register|注册/.test(h) && /register/.test(name)) score += 25
  if (/home|首页/.test(h) && /index|home/.test(name)) score += 20
  return score
}

function pickHtmlEntry(workspaceDir, hint) {
  const hits = listHtmlFiles(workspaceDir)
  if (!hits.length) return null
  const ranked = hits
    .map((hit) => ({ hit, score: scoreHtmlHit(hit, hint) }))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]
  if (best && best.score > 0) return best.hit
  return hits.find((h) => h.name.toLowerCase() === 'index.html') || hits[0]
}

function detectNpmScript(cwd) {
  const pkg = readJsonSafe(path.join(cwd, 'package.json'))
  if (!pkg?.scripts) return null
  // 1) 精确匹配 dev / start / preview / serve
  for (const key of ['dev', 'start', 'preview', 'serve']) {
    if (typeof pkg.scripts[key] === 'string' && pkg.scripts[key].trim()) {
      return { script: key, label: `npm run ${key}`, cwd }
    }
  }
  // 2) monorepo / 前缀模式：web:dev、app:start、api:dev 等
  const keys = Object.keys(pkg.scripts).sort()
  for (const key of keys) {
    if (/:(dev|start|preview|serve)$/i.test(key) && typeof pkg.scripts[key] === 'string' && pkg.scripts[key].trim()) {
      return { script: key, label: `npm run ${key}`, cwd }
    }
  }
  return null
}

/**
 * 收集项目上下文（名称/框架/脚本/依赖/版本等）
 * @param {string} workspaceDir
 * @param {{ kind: string, script?: string, entryRel?: string, cwd?: string }} plan
 * @returns {{ name?: string, description?: string, framework?: string, frameworkVersion?: string, scripts?: Record<string,string>, deps?: Record<string,string>, pythonVersion?: string, venv?: string }}
 */
function gatherProjectContext(workspaceDir, plan) {
  /** @type {{ name?: string, description?: string, framework?: string, frameworkVersion?: string, scripts?: Record<string,string>, deps?: Record<string,string>, pythonVersion?: string, venv?: string }} */
  const ctx = {}
  const cwd = plan.cwd || workspaceDir

  if (plan.kind === 'npm-script') {
    const pkg = readJsonSafe(path.join(cwd, 'package.json'))
    if (pkg) {
      ctx.name = pkg.name
      ctx.description = pkg.description
      if (pkg.scripts && typeof pkg.scripts === 'object') {
        ctx.scripts = {}
        for (const [k, v] of Object.entries(pkg.scripts)) {
          if (typeof v === 'string') ctx.scripts[k] = v
        }
      }
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
      const versioned = {}
      const frameworks = []
      for (const [name, ver] of Object.entries(deps)) {
        if (typeof ver !== 'string') continue
        const v = ver.replace(/^[\^~>=<]+/, '')
        // 识别关键框架
        if (/^(vite|nuxt|@?vitepress)/.test(name)) { frameworks.push({ name, version: v, priority: 1 }) }
        else if (/^(react|react-dom|next|remix|gatsby)$/.test(name)) { frameworks.push({ name, version: v, priority: 2 }) }
        else if (/^(vue|@vue\/|nuxt)/.test(name)) { frameworks.push({ name, version: v, priority: 3 }) }
        else if (/^(angular|@angular\/)/.test(name)) { frameworks.push({ name, version: v, priority: 4 }) }
        else if (/^(svelte|@sveltejs\/)/i.test(name)) { frameworks.push({ name, version: v, priority: 5 }) }
        else if (/^(express|koa|fastify|hono|nestjs|@nestjs\/)/.test(name)) { frameworks.push({ name, version: v, priority: 6 }) }
        if (versioned[name] == null) versioned[name] = v
      }
      frameworks.sort((a, b) => a.priority - b.priority)
      if (frameworks.length > 0) {
        const f = frameworks[0]
        ctx.framework = f.name.replace(/^@?/, '')
        ctx.frameworkVersion = f.version
      }
      // 选出顶层关键依赖（最多 8 个）
      const picked = new Map()
      for (const fw of frameworks) picked.set(fw.name, fw.version)
      for (const [name, ver] of Object.entries(versioned)) {
        if (picked.size >= 8) break
        if (!picked.has(name) && !/^@types\//.test(name)) picked.set(name, ver)
      }
      ctx.deps = Object.fromEntries(Array.from(picked.entries()).slice(0, 8))
    }
  }

  if (plan.kind === 'python') {
    // 尝试获取 Python 版本
    try {
      const cp = require('node:child_process')
      const out = cp.execSync('python3 --version 2>/dev/null || python --version 2>/dev/null', {
        cwd,
        encoding: 'utf8',
        timeout: 5000,
      }).trim()
      ctx.pythonVersion = out.replace(/^(?:Python|python)\s*/i, '').trim()
    } catch { /* ignore */ }

    // 尝试查找虚拟环境
    const venvCandidates = ['venv', '.venv', 'env', '.env', 'envs']
    for (const v of venvCandidates) {
      const vp = path.join(workspaceDir, v)
      if (fs.existsSync(vp) && fs.statSync(vp).isDirectory()) {
        ctx.venv = v
        break
      }
    }

    // 读取 requirements.txt 获取关键依赖
    const reqPath = path.join(workspaceDir, 'requirements.txt')
    if (fs.existsSync(reqPath)) {
      try {
        const deps = {}
        const content = fs.readFileSync(reqPath, 'utf8')
        const lines = content.split(/\r?\n/).filter(Boolean)
        for (const line of lines.slice(0, 12)) {
          const m = line.match(/^([a-zA-Z0-9_-]+)\s*([><=!~]+\s*[\d.]+)?/)
          if (m) {
            deps[m[1]] = (m[2] || '').trim()
            // 识别框架
            if (/^flask$/i.test(m[1]) && !ctx.framework) { ctx.framework = 'Flask'; ctx.frameworkVersion = (m[2] || '').replace(/^[><=!~]+/, '').trim() }
            else if (/^django$/i.test(m[1]) && !ctx.framework) { ctx.framework = 'Django'; ctx.frameworkVersion = (m[2] || '').replace(/^[><=!~]+/, '').trim() }
            else if (/^fastapi$/i.test(m[1]) && !ctx.framework) { ctx.framework = 'FastAPI'; ctx.frameworkVersion = (m[2] || '').replace(/^[><=!~]+/, '').trim() }
          }
        }
        ctx.deps = deps
      } catch { /* ignore */ }
    }

    // 从入口文件检测框架
    if (!ctx.framework && plan.entryRel) {
      const abs = path.join(workspaceDir, plan.entryRel)
      if (fs.existsSync(abs)) {
        try {
          const content = fs.readFileSync(abs, 'utf8')
          if (/from\s+flask\b/i.test(content)) ctx.framework = 'Flask'
          else if (/from\s+django\b/i.test(content)) ctx.framework = 'Django'
          else if (/from\s+fastapi\b/i.test(content)) ctx.framework = 'FastAPI'
        } catch { /* ignore */ }
      }
    }

    // 项目名称（从入口文件目录名或 app.py 推断）
    if (plan.entryRel) {
      const parts = plan.entryRel.replace(/\\/g, '/').split('/')
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        if (p && p !== '.' && !/\.py$/i.test(p)) {
          ctx.name = p
          break
        }
      }
    }
  }

  return ctx
}

const PYTHON_SERVER_CANDIDATES = [
  'src/backend/preview_app.py',
  'src/backend/app.py',
  'backend/app.py',
  'app.py',
  'main.py',
  'manage.py',
  'run.py',
  'server.py',
  'wsgi.py',
]

/** 深度扫描：在常见子目录中查找 Python 服务入口 */
function findPythonServerEntryDeep(workspaceDir) {
  // 1) 精确候选
  for (const rel of PYTHON_SERVER_CANDIDATES) {
    const abs = path.join(workspaceDir, rel)
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return rel.replace(/\\/g, '/')
    }
  }
  // 2) 扫描根目录及一级子目录中的 *.py
  try {
    const dirs = [workspaceDir]
    for (const name of fs.readdirSync(workspaceDir)) {
      const full = path.join(workspaceDir, name)
      if (!name.startsWith('.') && !['node_modules', 'venv', '.venv', '__pycache__', 'dist', 'build'].includes(name)) {
        try {
          if (fs.statSync(full).isDirectory()) dirs.push(full)
        } catch { /* skip */ }
      }
    }
    for (const dir of dirs) {
      let entries
      try { entries = fs.readdirSync(dir) } catch { continue }
      for (const name of entries) {
        if (!name.endsWith('.py') || name.startsWith('_') || name.startsWith('.')) continue
        const abs = path.join(dir, name)
        try {
          if (!fs.statSync(abs).isFile()) continue
          const content = fs.readFileSync(abs, 'utf8')
          // 寻找：Flask/Django/FastAPI 入口特征
          if (
            /\bFlask\s*\(/i.test(content) ||
            /\bapp\.run\s*\(/i.test(content) ||
            /\buvicorn\.run\b/i.test(content) ||
            /\bfrom\s+flask\b/i.test(content) ||
            /\bfrom\s+fastapi\b/i.test(content) ||
            /if\s+__name__\s*==\s*['"]__main__['"]/.test(content)
          ) {
            return path.relative(workspaceDir, abs).replace(/\\/g, '/')
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
  return null
}

function findPythonServerEntry(workspaceDir) {
  return findPythonServerEntryDeep(workspaceDir)
}

function listAuthPythonModules(workspaceDir) {
  const authDir = path.join(workspaceDir, 'src/backend/auth')
  if (!fs.existsSync(authDir)) return []
  try {
    return fs
      .readdirSync(authDir)
      .filter((n) => n.endsWith('.py') && !n.startsWith('_'))
      .map((n) => `src/backend/auth/${n}`.replace(/\\/g, '/'))
  } catch {
    return []
  }
}

const PREVIEW_APP_TEMPLATE = `# src/backend/preview_app.py
# 本地 API 预览服务（由 Claude Orchestrator 自动生成，可手动修改后重启预览）

import importlib.util
import sys
from pathlib import Path

try:
    from flask import Flask, jsonify, request
except ImportError:
    print("请先安装 Flask：pip install flask", file=sys.stderr)
    raise SystemExit(1)

AUTH_DIR = Path(__file__).resolve().parent / "auth"
app = Flask(__name__)


def _load(name: str, filename: str):
    path = AUTH_DIR / filename
    if not path.is_file():
        return None
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        return None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@app.get("/health")
def health():
    return jsonify(ok=True, service="auth-preview")


@app.post("/api/auth/send_reset_email")
def api_send_reset_email():
    mod = _load("reset_password", "reset_password.py")
    if mod and hasattr(mod, "send_reset_email"):
        data = request.get_json(silent=True) or {}
        mod.send_reset_email(data.get("user_email", ""), data.get("reset_token", ""))
    return jsonify(ok=True)


@app.post("/api/auth/send_verification_code")
def api_send_verification_code():
    mod = _load("send_sms", "send_sms.py")
    return jsonify(ok=True, module="send_sms", loaded=mod is not None)


@app.post("/api/auth/login_by_phone")
def api_login_by_phone():
    mod = _load("login_by_phone", "login_by_phone.py")
    data = request.get_json(silent=True) or {}
    ok = False
    if mod and hasattr(mod, "login_with_phone"):
        mod.login_with_phone(data.get("phone_number", ""), data.get("verification_code", ""))
        ok = True
    return jsonify(ok=ok)


@app.post("/api/auth/login_by_qr_code")
def api_login_by_qr_code():
    mod = _load("login_by_qr_code", "login_by_qr_code.py")
    data = request.get_json(silent=True) or {}
    ok = mod.login_with_qr_code(data.get("qr_code", "")) if mod and hasattr(mod, "login_with_qr_code") else False
    return jsonify(ok=ok)


@app.post("/api/auth/generate_qr_code")
def api_generate_qr_code():
    mod = _load("generate_qr_code", "generate_qr_code.py")
    data = request.get_json(silent=True) or {}
    if mod and hasattr(mod, "generate_qr_payload"):
        return jsonify(ok=True, payload=mod.generate_qr_payload(data.get("user_id", "demo")))
    return jsonify(ok=False, error="generate_qr_code module unavailable")


@app.post("/api/auth/third_party_login")
def api_third_party_login():
    mod = _load("third_party_login", "third_party_login.py")
    data = request.get_json(silent=True) or {}
    ok = False
    if mod and hasattr(mod, "login_with_third_party"):
        ok = mod.login_with_third_party(data.get("provider", "wechat"), data.get("code", "demo"))
    return jsonify(ok=ok)


if __name__ == "__main__":
    port = int(__import__("os").environ.get("PORT", "5000"))
    print(f"Auth preview API http://127.0.0.1:{port}/health", flush=True)
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)
`

function ensurePreviewAppPy(workspaceDir) {
  const rel = 'src/backend/preview_app.py'
  const abs = path.join(workspaceDir, rel)
  if (fs.existsSync(abs)) return rel
  const modules = listAuthPythonModules(workspaceDir)
  if (!modules.length) return null
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, PREVIEW_APP_TEMPLATE, 'utf8')
  return rel
}

function buildPythonPreviewGuide(workspaceDir) {
  const modules = listAuthPythonModules(workspaceDir)
  const apiDoc = fs.existsSync(path.join(workspaceDir, 'docs/api-summary.md'))
    ? 'docs/api-summary.md'
    : null
  const html = pickHtmlEntry(workspaceDir, 'login')
  const lines = [
    '【Python 后端说明】`.py` 文件是服务端逻辑，不能像 HTML 一样直接在浏览器打开。',
    '',
    modules.length
      ? `已检测到 auth 模块（${modules.length} 个）：\n${modules.map((m) => `- \`${m}\``).join('\n')}`
      : '未检测到 `src/backend/auth/*.py`。',
    '',
    apiDoc ? `接口文档：\`${apiDoc}\`（可在右侧工作区点击打开）` : '',
    html ? `前端页面：\`${html.rel}\`（可一并浏览器预览）` : '',
    '',
    'Claude Orchestrator 可自动生成 `src/backend/preview_app.py` 并启动 Flask 预览 API（需本机已安装 `flask`：`pip install flask`）。',
  ].filter(Boolean)
  return lines.join('\n')
}

/** 杀掉占用指定端口的进程（如果存在） */
async function killPort(port) {
  const cp = require('node:child_process');
  try {
    cp.execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, {
      timeout: 5000,
      stdio: 'ignore',
    });
  } catch { /* ignore */ }
}

/** 从 Python 入口文件中提取 app.run 或 port= 指定的端口号 */
function detectFlaskPort(workspaceDir, entryRel) {
  try {
    const abs = path.join(workspaceDir, entryRel)
    if (!fs.existsSync(abs)) return null
    const content = fs.readFileSync(abs, 'utf8')
    const m = content.match(/(?:ports*[=:]s*)(d{3,5})/)
    return m ? parseInt(m[1], 10) : null
  } catch { return null }
}

async function startPythonPreview(workspaceDir, entryRel) {
  let rel = entryRel || findPythonServerEntry(workspaceDir)
  let abs = rel ? path.join(workspaceDir, rel) : ''
  if (!rel || !fs.existsSync(abs)) {
    const ensured = ensurePreviewAppPy(workspaceDir)
    if (ensured) {
      rel = ensured
      abs = path.join(workspaceDir, rel)
    }
  }
  if (!rel || !fs.existsSync(abs)) {
    return {
      ok: false,
      error: '未找到 Python 入口或 auth 模块',
      guide: buildPythonPreviewGuide(workspaceDir),
    }
  }

  // 检测虚拟环境
  let pythonBin = 'python3'
  for (const v of ['venv', '.venv', 'env', '.env']) {
    const vp = path.join(workspaceDir, v, 'bin', 'python3')
    if (fs.existsSync(vp)) { pythonBin = vp; break }
  }

  // 启动前清理端口：杀掉项目配置端口 + 常见 Flask 端口上的残留进程
  const flaskPort = detectFlaskPort(workspaceDir, rel)
  if (flaskPort) await killPort(flaskPort)
  for (const p of [5000, 5002, 8000]) {
    if (p !== flaskPort) await killPort(p)
  }

  const result = await spawnAndWaitForPythonUrl(pythonBin, abs, workspaceDir, rel)


  if (result.ok) return result

  // 端口被占 → 杀端口后重试一次
  if (result.stderr && /Address already in use/i.test(result.stderr)) {
    const portMatch = result.stderr.match(/Port\s+(\d{3,5})/i)
    const busyPort = portMatch ? parseInt(portMatch[1], 10) : flaskPort || 5000
    await killPort(busyPort)
    await new Promise((r) => setTimeout(r, 1000))
    const retry = await spawnAndWaitForPythonUrl(pythonBin, abs, workspaceDir, rel)
    if (retry.ok) return retry
    return {
      ok: false,
      stderr: retry.stderr || result.stderr,
      error: `端口 ${busyPort} 仍被占用，请关闭占用程序后重试。${retry.stderr ? ` 错误详情：${retry.stderr.trim().slice(0, 200)}` : ''}`,
      guide: buildPythonPreviewGuide(workspaceDir),
      entryRel: rel,
    }
  }

  return result
}

async function spawnAndWaitForPythonUrl(pythonBin, abs, workspaceDir, rel) {
  const child = spawn(pythonBin, [abs], {
    cwd: workspaceDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stderr = ''
  child.stderr?.on('data', (c) => {
    stderr += c.toString()
  })

  // Python 项目不用 fallback URL，只依赖 stderr 捕获 Flask 输出
  let url = await waitForDevServerUrl(child, [], 15000)

  // 流输出未捕获到 URL 且进程仍在运行 → 轮询 stderr 最长 25 秒
  if (!url && child.exitCode == null) {
    const deadline = Date.now() + 25000
    while (!extractUrlFromOutput(stderr) && Date.now() < deadline) {
      if (child.exitCode != null) break
      await new Promise((r) => setTimeout(r, 500))
    }
    url = extractUrlFromOutput(stderr) || null
  }

  // 二次覆盖：stderr 里有 Flask 真实地址则优先
  if (url && stderr) {
    const fromStderr = extractUrlFromOutput(stderr)
    if (fromStderr && fromStderr !== url) url = fromStderr
  }

  if (!url) {
    try { child.kill('SIGTERM') } catch { /* ignore */ }
    const needFlask = /No module named ['"]flask|请先安装 Flask/i.test(stderr)
    return {
      ok: false,
      stderr: stderr.trim().slice(0, 500) || undefined,
      error: needFlask
        ? '本机未安装 Flask，请在工作区终端执行：pip install flask'
        : `Python 预览服务未能启动${stderr ? `：${stderr.trim().slice(0, 240)}` : ''}`,
      guide: buildPythonPreviewGuide(workspaceDir),
      entryRel: rel,
    }
  }

  const openUrl = url.replace(/\/health\/?$/, '') || url
  state = {
    kind: 'python',
    port: 5000,
    url: openUrl,
    server: null,
    process: child,
    cwd: workspaceDir,
    label: `Python API · ${rel}`,
    entryRel: rel,
  }
  child.on('exit', () => {
    if (state.process === child) {
      state.url = null
      state.kind = null
    }
  })
  return {
    ok: true,
    url: openUrl,
    kind: 'python',
    label: state.label,
    entryRel: rel,
    command: `python3 ${rel}`,
    guide: buildPythonPreviewGuide(workspaceDir),
  }
}


function enrichRunPlan(plan, workspaceDir) {
  if (!plan?.ok || !workspaceDir) return plan
  if (plan.cwd) {
    const rel = path.relative(workspaceDir, plan.cwd).replace(/\\/g, '/')
    plan.cwdRel = !rel || rel === '.' ? '' : rel
  }
  // 注入项目上下文 — 必须在 terminalCommand 之前，以便获取 venv 等信息
  const ctx = gatherProjectContext(workspaceDir, plan)
  if (ctx) plan.ctx = ctx

  if (plan.kind === 'npm-script' && plan.script) {
    const base = `npm run ${plan.script}`
    plan.command = base
    plan.terminalCommand =
      plan.cwdRel && plan.cwdRel !== '.'
        ? `cd "${plan.cwdRel}" && ${base}`
        : base
  } else if (plan.kind === 'python' && plan.entryRel) {
    const venv = ctx?.venv
    plan.terminalCommand = venv
      ? `"${venv}/bin/python3" ${plan.entryRel}`
      : `python3 ${plan.entryRel}`
  }
  return plan
}

/**
 * @param {string} workspaceDir
 * @param {{ hint?: string, preferStatic?: boolean, preferPython?: boolean }} [opts]
 */
function detectProjectRunPlan(workspaceDir, opts) {
  const hint = String(opts?.hint || opts?.userLine || '').trim()
  const userLine = String(opts?.userLine || opts?.hint || '').trim()
  const preferStatic = Boolean(opts?.preferStatic)
  const preferPython = Boolean(opts?.preferPython) || /py|python|后端|api|接口|flask|auth|django|fastapi/i.test(hint)
  const wantRunProject =
    /(?:运行|启动|run|start).*(?:项目|应用|dev|开发服务器|本地服务)/i.test(userLine) ||
    /^(?:运行|启动)\s*项目/i.test(userLine)

  if (!workspaceDir || !fs.existsSync(workspaceDir)) {
    return { ok: false, error: '未选择工作区或工作区不存在', kind: 'none' }
  }

  // ── 先收集所有信号，再做决策（综合判断而非贪心匹配） ──

  const pyEntry = findPythonServerEntry(workspaceDir)
  const authModules = listAuthPythonModules(workspaceDir)

  const npmRoot = detectNpmScript(workspaceDir)
  const npmWeb = detectNpmScript(path.join(workspaceDir, 'web'))
  let npmSub = npmWeb
  if (!npmSub) {
    for (const sub of ['frontend', 'app', 'client', 'src']) {
      const found = detectNpmScript(path.join(workspaceDir, sub))
      if (found) { npmSub = found; break }
    }
  }
  const npm = npmRoot || npmSub

  const html = pickHtmlEntry(workspaceDir, hint)

  // ── 决策 ──

  // 1) 显式偏好 Python → 直接返回
  if (preferPython && (pyEntry || authModules.length)) {
    return {
      ok: true,
      kind: 'python',
      entryRel: pyEntry || 'src/backend/preview_app.py',
      label: 'Python API 预览',
      cwd: workspaceDir,
    }
  }

  if (wantRunProject) {
    // "运行项目" 优先级：npm 脚本 > Python 服务 > HTML 静态预览
    if (npm) {
      return {
        ok: true,
        kind: 'npm-script',
        script: npm.script,
        command: `npm run ${npm.script}`,
        label: npm.label,
        cwd: npm.cwd,
      }
    }
    if (pyEntry) {
      return {
        ok: true,
        kind: 'python',
        entryRel: pyEntry,
        label: `Python · ${pyEntry}`,
        cwd: workspaceDir,
      }
    }
    if (html) {
      return {
        ok: true,
        kind: 'static',
        entryRel: html.rel,
        label: `静态预览 · ${html.rel}`,
        cwd: workspaceDir,
      }
    }
    return {
      ok: false,
      kind: 'none',
      error: '未检测到可运行的项目配置',
      scanSummary: buildScanSummary(workspaceDir),
    }
  }

  // "预览" 优先级：静态（有偏好时）> npm > Python > HTML 兜底
  if (html && (preferStatic || /页面|html|登录|register|静态|界面|效果/i.test(hint) || !npm)) {
    return {
      ok: true,
      kind: 'static',
      entryRel: html.rel,
      label: `静态预览 · ${html.rel}`,
      cwd: workspaceDir,
    }
  }

  if (npm) {
    return {
      ok: true,
      kind: 'npm-script',
      script: npm.script,
      command: `npm run ${npm.script}`,
      label: npm.label,
      cwd: npm.cwd,
    }
  }

  if (pyEntry) {
    return {
      ok: true,
      kind: 'python',
      entryRel: pyEntry,
      label: `Python · ${pyEntry}`,
      cwd: workspaceDir,
    }
  }

  if (html) {
    return {
      ok: true,
      kind: 'static',
      entryRel: html.rel,
      label: `静态预览 · ${html.rel}`,
      cwd: workspaceDir,
    }
  }

  return {
    ok: false,
    kind: 'none',
    error: '未检测到可运行的项目配置',
    scanSummary: buildScanSummary(workspaceDir),
  }
}

/**
 * 生成扫描摘要，在检测失败时向用户说明扫描了哪些内容
 */
function buildScanSummary(workspaceDir) {
  const summary = []

  const rootPkg = readJsonSafe(path.join(workspaceDir, 'package.json'))
  const webPkg = readJsonSafe(path.join(workspaceDir, 'web/package.json'))

  if (rootPkg?.scripts) {
    const names = Object.keys(rootPkg.scripts).slice(0, 6)
    summary.push(`根目录 package.json 脚本：${names.map((n) => `\`${n}\``).join('、')}`)
  } else {
    summary.push('根目录 package.json：未找到')
  }

  if (webPkg?.scripts) {
    const names = Object.keys(webPkg.scripts).slice(0, 6)
    summary.push(`web/package.json 脚本：${names.map((n) => `\`${n}\``).join('、')}`)
  }

  // Python 生态检测：入口 + 配置 + 依赖
  const pyEntry = findPythonServerEntry(workspaceDir)
  const pySignals = []
  if (fs.existsSync(path.join(workspaceDir, 'requirements.txt'))) pySignals.push('requirements.txt')
  if (fs.existsSync(path.join(workspaceDir, 'setup.py'))) pySignals.push('setup.py')
  if (fs.existsSync(path.join(workspaceDir, 'pyproject.toml'))) pySignals.push('pyproject.toml')
  if (fs.existsSync(path.join(workspaceDir, 'Pipfile'))) pySignals.push('Pipfile')
  const venvDirs = ['venv', '.venv', 'env', '.env'].filter((v) => {
    const vp = path.join(workspaceDir, v)
    try { return fs.existsSync(vp) && fs.statSync(vp).isDirectory() } catch { return false }
  })
  if (venvDirs.length) pySignals.push(`虚拟环境：${venvDirs[0]}/`)

  if (pyEntry || pySignals.length) {
    const parts = []
    if (pyEntry) parts.push(`入口：${pyEntry}`)
    if (pySignals.length) parts.push(pySignals.join('、'))
    summary.push(`Python 项目：${parts.join('，')}`)
  } else {
    summary.push('Python 入口：未找到 app.py / main.py / manage.py / run.py')
  }

  const htmlHits = listHtmlFiles(workspaceDir, 3)
  if (htmlHits.length > 0) {
    const names = htmlHits.slice(0, 4).map((h) => h.rel).join('、')
    summary.push(`HTML 文件：${names}${htmlHits.length > 4 ? ' …' : ''}`)
  } else {
    summary.push('HTML 文件：未找到可预览的静态页面')
  }

  return summary
}

function detectProjectRunPlanEnriched(workspaceDir, opts) {
  return enrichRunPlan(detectProjectRunPlan(workspaceDir, opts), workspaceDir)
}

function safeJoinWorkspace(root, reqPath) {
  const rootResolved = path.resolve(root)
  const prefix = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep
  let p = decodeURIComponent(String(reqPath || '/').split('?')[0])
  if (p === '/') return null
  p = p.replace(/^[/\\]+/, '')
  if (!p || p.includes('..')) return null
  const abs = path.resolve(rootResolved, p)
  if (abs !== rootResolved && !abs.startsWith(prefix)) return null
  return abs
}

async function startStaticPreview(workspaceDir, entryRel) {
  const port = await findFreePort()
  const root = path.resolve(workspaceDir)
  const server = http.createServer((req, res) => {
    try {
      let reqPath = String(req.url || '/').split('?')[0]
      if (reqPath === '/' || reqPath === '') reqPath = `/${entryRel}`
      const abs = safeJoinWorkspace(root, reqPath)
      if (!abs) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      let filePath = abs
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html')
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404)
        res.end('Not Found')
        return
      }
      const ext = path.extname(filePath).toLowerCase()
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
      fs.createReadStream(filePath).pipe(res)
    } catch {
      res.writeHead(500)
      res.end('Internal Error')
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })

  const url = `http://127.0.0.1:${port}/${entryRel.replace(/^[/\\]+/, '')}`
  return { server, port, url }
}

function extractUrlFromOutput(text) {
  const m = String(text || '').match(/\bhttps?:\/\/(?:localhost|127\.0\.0\.1):\d{2,5}\/?[^\s)\]'"]*/i)
  return m ? m[0].replace(/[)\]'"]+$/, '') : null
}

async function waitForDevServerUrl(child, fallbackUrls, timeoutMs = 12000) {
  /** @type {string | null} */
  let found = null
  /** @type {string} */
  let allOutput = ''
  const onData = (chunk) => {
    const s = chunk.toString()
    allOutput += s
    const u = extractUrlFromOutput(s)
    if (u) found = u
  }
  child.stdout?.on('data', onData)
  child.stderr?.on('data', onData)

  const started = Date.now()
  while (!found && Date.now() - started < timeoutMs) {
    if (child.exitCode != null) break
    await new Promise((r) => setTimeout(r, 250))
  }
  if (found) return found

  // 循环结束后再用积累的完整输出提取一次（防止 chunk 切割导致漏过）
  const fromFull = extractUrlFromOutput(allOutput)
  if (fromFull) return fromFull

  for (const u of fallbackUrls) {
    try {
      const ok = await fetchHead(u)
      if (ok) return u
    } catch {
      /* try next */
    }
  }
  return null
}

function fetchHead(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        res.resume()
        resolve(res.statusCode && res.statusCode < 500)
      })
      .on('error', reject)
      .setTimeout(800, () => reject(new Error('timeout')))
  })
}

async function startNpmPreview(cwd, script) {
  const child = spawn('npm', ['run', script], {
    cwd,
    env: { ...process.env, BROWSER: 'none', CI: '1' },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  const fallbacks = [
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:4173',
  ]
  const url = await waitForDevServerUrl(child, fallbacks)
  if (!url) {
    try {
      child.kill('SIGTERM')
    } catch {
      /* ignore */
    }
    return { ok: false, error: `已执行 npm run ${script}，但未在 12s 内检测到本地预览 URL` }
  }
  return { ok: true, process: child, url }
}

async function stopPreview() {
  if (state.server) {
    await new Promise((resolve) => state.server.close(() => resolve()))
  }
  if (state.process && state.process.exitCode == null) {
    try {
      state.process.kill('SIGTERM')
    } catch {
      /* ignore */
    }
  }
  state = {
    kind: null,
    port: null,
    url: null,
    process: null,
    server: null,
    cwd: null,
    label: null,
    entryRel: null,
  }
}

/**
 * @param {string} workspaceDir
 * @param {{ hint?: string, preferStatic?: boolean }} [opts]
 */
async function startProjectPreview(workspaceDir, opts) {
  await stopPreview()
  const entryRelOpt =
    typeof opts?.entryRel === 'string' ? opts.entryRel.replace(/^[/\\]+/, '').trim() : ''
  if (entryRelOpt && !entryRelOpt.includes('..')) {
    const abs = path.join(workspaceDir, entryRelOpt)
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      const { server, port, url } = await startStaticPreview(workspaceDir, entryRelOpt)
      state = {
        kind: 'static',
        port,
        url,
        server,
        process: null,
        cwd: workspaceDir,
        label: `静态预览 · ${entryRelOpt}`,
        entryRel: entryRelOpt,
      }
      return {
        ok: true,
        url,
        kind: 'static',
        label: state.label,
        entryRel: entryRelOpt,
        port,
      }
    }
  }
  const plan = detectProjectRunPlan(workspaceDir, opts)
  if (!plan.ok) return { ok: false, error: plan.error || '无法启动预览' }

  if (plan.kind === 'python') {
    const r = await startPythonPreview(plan.cwd, plan.entryRel)
    if (!r.ok) return r
    return r
  }

  if (plan.kind === 'static') {
    const { server, port, url } = await startStaticPreview(plan.cwd, plan.entryRel)
    state = {
      kind: 'static',
      port,
      url,
      server,
      process: null,
      cwd: plan.cwd,
      label: plan.label,
      entryRel: plan.entryRel,
    }
    return {
      ok: true,
      url,
      kind: 'static',
      label: plan.label,
      entryRel: plan.entryRel,
      port,
      plan,
    }
  }

  if (plan.kind === 'npm-script') {
    const r = await startNpmPreview(plan.cwd, plan.script)
    if (!r.ok) return r
    state = {
      kind: 'npm-script',
      port: null,
      url: r.url,
      server: null,
      process: r.process,
      cwd: plan.cwd,
      label: plan.label,
      entryRel: null,
    }
    r.process?.on('exit', () => {
      if (state.process === r.process) {
        state.url = null
        state.kind = null
      }
    })
    return {
      ok: true,
      url: r.url,
      kind: 'npm-script',
      label: plan.label,
      command: plan.command,
      plan,
    }
  }

  return { ok: false, error: '不支持的预览类型' }
}

function getProjectPreviewStatus() {
  const running = Boolean(state.url && (state.server || (state.process && state.process.exitCode == null)))
  return {
    ok: true,
    running,
    url: running ? state.url : null,
    kind: running ? state.kind : null,
    label: running ? state.label : null,
    entryRel: running ? state.entryRel : null,
    port: running ? state.port : null,
    cwd: running ? state.cwd : null,
  }
}

module.exports = {
  detectProjectRunPlan: detectProjectRunPlanEnriched,
  detectProjectRunPlanRaw: detectProjectRunPlan,
  enrichRunPlan,
  startProjectPreview,
  stopPreview,
  getProjectPreviewStatus,
  buildPythonPreviewGuide,
  listAuthPythonModules,
}
