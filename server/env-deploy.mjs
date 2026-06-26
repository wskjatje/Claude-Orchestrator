import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync, spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')

/**
 * 检查单个依赖目录是否完整（检查 keyPackages 中每个包的 package.json 是否存在）
 */
function checkDepDir(dir, keyPackages) {
  const nodeModules = path.join(dir, 'node_modules')
  const hasNodeModules = fs.existsSync(nodeModules)
  if (!hasNodeModules) return { ok: false, exists: false }
  const missing = keyPackages.filter((pkg) => !fs.existsSync(path.join(nodeModules, pkg, 'package.json')))
  return { ok: missing.length === 0, exists: true, missing }
}

/**
 * 执行 shell 命令并返回 stdout 第一行（trimmed）。
 */
function shellOut(cmd, fallback = '') {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).toString().trim().split('\n')[0] || fallback
  } catch {
    return fallback
  }
}

/**
 * 获取磁盘可用空间（字节）。
 */
function getDiskFreeBytes(dir) {
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const out = execSync(`df -k "${dir}"`, { encoding: 'utf8', timeout: 5000 })
      const lines = out.trim().split('\n')
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/)
        return parseInt(parts[3], 10) * 1024
      }
    }
  } catch {
    /* ignore */
  }
  return 0
}

/**
 * 执行环境部署检查。
 * 返回 { ok, checks, suggestions }。
 */
export async function deployCheck() {
  const checks = []

  // 1. Node.js
  const nodeVersion = process.version
  const nodeMajor = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10)
  checks.push({
    id: 'node',
    label: 'Node.js 运行时',
    status: nodeMajor >= 20 ? 'ok' : 'warn',
    detail: nodeVersion,
    hint: nodeMajor >= 20 ? '' : '推荐 Node.js >= 20',
  })

  // 2. npm
  const npmVersion = shellOut('npm --version')
  checks.push({
    id: 'npm',
    label: 'npm 包管理器',
    status: npmVersion ? 'ok' : 'error',
    detail: npmVersion || '未找到',
    hint: npmVersion ? '' : '请安装 npm（通常随 Node.js 一起提供）',
  })

  // 3. Git
  const gitVersion = shellOut('git --version')
  const gitOk = gitVersion && /version/.test(gitVersion)
  checks.push({
    id: 'git',
    label: 'Git 版本控制',
    status: gitOk ? 'ok' : 'error',
    detail: gitVersion || '未找到',
    hint: gitOk ? '' : '请安装 Git（brew install git）',
  })

  // 4. 根目录依赖
  const rootDep = checkDepDir(PROJECT_ROOT, ['ws', 'node-pty'])
  checks.push({
    id: 'deps-root',
    label: '项目根依赖 (ws, node-pty)',
    status: rootDep.ok ? 'ok' : rootDep.exists ? 'warn' : 'error',
    detail: rootDep.ok ? '已安装' : rootDep.exists ? `缺失：${rootDep.missing.join(', ')}` : 'node_modules 不存在',
    hint: rootDep.ok ? '' : '请执行 npm install',
  })

  // 5. Web 依赖
  const webDir = path.join(PROJECT_ROOT, 'web')
  const webDep = checkDepDir(webDir, ['react', 'vite', '@tanstack/react-router'])
  checks.push({
    id: 'deps-web',
    label: 'Web UI 依赖 (React, Vite, Router)',
    status: webDep.ok ? 'ok' : webDep.exists ? 'warn' : 'error',
    detail: webDep.ok ? '已安装' : webDep.exists ? `缺失：${webDep.missing.join(', ')}` : 'node_modules 不存在',
    hint: webDep.ok ? '' : '请执行 npm run web:install',
  })

  // 6. Desktop 依赖
  const desktopDir = path.join(PROJECT_ROOT, 'desktop')
  const desktopDep = checkDepDir(desktopDir, ['electron'])
  checks.push({
    id: 'deps-desktop',
    label: '桌面端依赖 (Electron)',
    status: desktopDep.ok ? 'ok' : desktopDep.exists ? 'warn' : 'error',
    detail: desktopDep.ok ? '已安装' : desktopDep.exists ? `缺失：${desktopDep.missing.join(', ')}` : 'node_modules 不存在',
    hint: desktopDep.ok ? '' : '请执行 npm run desktop:install',
  })

  // 7. lock 文件完整性
  const rootLockOk = fs.existsSync(path.join(PROJECT_ROOT, 'package-lock.json'))
  const webLockOk = fs.existsSync(path.join(webDir, 'package-lock.json'))
  const desktopLockOk = fs.existsSync(path.join(desktopDir, 'package-lock.json'))
  const lockDetail = []
  if (!rootLockOk) lockDetail.push('根')
  if (!webLockOk) lockDetail.push('Web')
  if (!desktopLockOk) lockDetail.push('Desktop')
  checks.push({
    id: 'lockfiles',
    label: 'lock 文件完整性',
    status: lockDetail.length === 0 ? 'ok' : 'warn',
    detail: lockDetail.length === 0 ? 'package-lock.json 完整' : `缺失：${lockDetail.join('、')} lock 文件`,
    hint: lockDetail.length === 0 ? '' : '请确保项目文件完整',
  })

  // 8. 磁盘空间（取项目所在磁盘）
  const freeBytes = getDiskFreeBytes(PROJECT_ROOT)
  const freeGigs = Math.round(freeBytes / (1024 * 1024 * 1024) * 10) / 10
  const diskOk = freeGigs > 1
  checks.push({
    id: 'disk',
    label: '磁盘空间',
    status: diskOk ? 'ok' : 'warn',
    detail: freeGigs > 0 ? `${freeGigs} GB 可用` : '无法检测',
    hint: diskOk ? '' : '剩余空间不足 1 GB，建议清理磁盘',
  })

  const okCount = checks.filter((c) => c.status === 'ok').length
  const warnCount = checks.filter((c) => c.status === 'warn').length
  const errCount = checks.filter((c) => c.status === 'error').length

  return {
    ok: errCount === 0,
    checks,
    summary: {
      total: checks.length,
      ok: okCount,
      warn: warnCount,
      error: errCount,
    },
    projectRoot: PROJECT_ROOT,
  }
}

/**
 * 获取需要安装的 npm install 命令列表。
 */
function resolveInstallTargets() {
  const targets = []
  const webDir = path.join(PROJECT_ROOT, 'web')
  const desktopDir = path.join(PROJECT_ROOT, 'desktop')

  const rootDep = checkDepDir(PROJECT_ROOT, ['ws', 'node-pty'])
  if (!rootDep.ok) {
    targets.push({ dir: PROJECT_ROOT, label: '根依赖', cwd: '.' })
  }

  const webDep = checkDepDir(webDir, ['react', 'vite', '@tanstack/react-router'])
  if (!webDep.ok) {
    targets.push({ dir: webDir, label: 'Web UI 依赖', cwd: 'web' })
  }

  const desktopDep = checkDepDir(desktopDir, ['electron'])
  if (!desktopDep.ok) {
    targets.push({ dir: desktopDir, label: '桌面端依赖', cwd: 'desktop' })
  }

  return targets
}

/**
 * 安装缺失的依赖。
 * 返回 { ok, summary, logs }。
 */
export async function deployInstall() {
  const targets = resolveInstallTargets()
  const logs = []

  if (targets.length === 0) {
    return { ok: true, summary: '所有依赖已就绪，无需安装。', logs: ['✓ 全部依赖已安装'] }
  }

  for (const target of targets) {
    logs.push(`📦 安装 ${target.label}（${target.dir}）…`)
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund'], {
          cwd: target.dir,
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
        })
        let out = ''
        child.stdout?.on('data', (d) => { out += d.toString() })
        child.stderr?.on('data', (d) => { out += d.toString() })
        child.on('close', (code) => {
          if (code === 0) {
            logs.push(`  ✓ ${target.label} 安装完成`)
            resolve()
          } else {
            const snippet = out.slice(-500).trim()
            logs.push(`  ✗ ${target.label} 安装失败（exit code ${code}）`)
            if (snippet) logs.push(`  → ${snippet}`)
            reject(new Error(`${target.label} 安装退出码 ${code}`))
          }
        })
        child.on('error', (e) => {
          logs.push(`  ✗ ${target.label} 启动失败：${e.message}`)
          reject(e)
        })
      })
    } catch {
      // 继续安装其他
    }
  }

  // 安装后重新检查
  const recheck = await deployCheck()
  const allOk = recheck.checks.every((c) => c.status === 'ok' || c.status === 'warn')
  return {
    ok: allOk,
    summary: allOk
      ? '部署完成，所有依赖已就绪。'
      : `安装后仍有 ${recheck.summary.error} 项问题需要手动处理。`,
    logs,
    recheck: recheck.checks,
  }
}

/**
 * 检查 Vite 构建是否能通过（用于部署验证）。
 */
export async function deployVerify() {
  const webDir = path.join(PROJECT_ROOT, 'web')
  const buildScript = 'build:dev'
  const logs = []

  logs.push('🔍 验证 Web UI 构建…')
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', buildScript], {
        cwd: webDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        timeout: 120_000,
      })
      let out = ''
      child.stdout?.on('data', (d) => { out += d.toString() })
      child.stderr?.on('data', (d) => { out += d.toString() })
      child.on('close', (code) => {
        if (code === 0) {
          logs.push('  ✓ Web UI 构建通过')
          resolve()
        } else {
          const snippet = out.slice(-1000).trim()
          logs.push(`  ✗ 构建失败（exit code ${code}）`)
          if (snippet) logs.push(`  → ${snippet}`)
          reject(new Error(`构建退出码 ${code}`))
        }
      })
      child.on('error', (e) => {
        logs.push(`  ✗ 构建错误：${e.message}`)
        reject(e)
      })
    })
    return { ok: true, logs }
  } catch (e) {
    return { ok: false, logs, error: e.message }
  }
}
