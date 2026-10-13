#!/usr/bin/env node
/**
 * 外部应用 MCP（方案 A）：经标准 MCP 打开 URL / 本机路径（系统默认应用）。
 * 不嵌入 OpenClaw；不替代编码主路径。注册名建议 external-apps。
 *
 * 环境变量（可选）：
 * - EXTERNAL_APPS_ALLOW_PREFIXES：逗号分隔绝对路径前缀
 *   未设时默认仅允许 process.cwd()（工作区根）及其子路径；仍禁 shell 元字符
 */
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { platform } from 'node:os'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const sdkRoot = path.join(
  __dirname,
  '..',
  'vendor',
  'cad',
  'node_modules',
  '@modelcontextprotocol',
  'sdk',
  'dist',
  'cjs',
  'server',
)
const { McpServer } = require(path.join(sdkRoot, 'mcp.js'))
const { StdioServerTransport } = require(path.join(sdkRoot, 'stdio.js'))
const z = require(path.join(__dirname, '..', 'vendor', 'cad', 'node_modules', 'zod'))

const SHELL_META = /[|&;`$<>(){}[\]\\*!?\n\r]/

function resolveReal(p) {
  const abs = path.resolve(p)
  try {
    return fs.realpathSync(abs)
  } catch {
    return abs
  }
}

function allowPrefixes() {
  const raw = process.env.EXTERNAL_APPS_ALLOW_PREFIXES || ''
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => resolveReal(p))
  if (fromEnv.length) return fromEnv
  // 默认：仅工作区根（Claude 通常以项目根为 cwd；realpath 对齐 macOS /tmp）
  const cwd = process.cwd()
  return cwd ? [resolveReal(cwd)] : []
}

function assertSafeToken(label, value) {
  const s = String(value || '').trim()
  if (!s) throw new Error(`${label} 为空`)
  if (SHELL_META.test(s)) throw new Error(`${label} 含非法字符`)
  return s
}

function assertPathAllowed(absPath) {
  const prefixes = allowPrefixes()
  if (!prefixes.length) {
    throw new Error('未配置路径白名单（EXTERNAL_APPS_ALLOW_PREFIXES 或 cwd）')
  }
  const abs = resolveReal(absPath)
  const ok = prefixes.some((pre) => abs === pre || abs.startsWith(pre + path.sep))
  if (!ok) {
    throw new Error(
      `路径不在白名单内（默认仅工作区根；可设 EXTERNAL_APPS_ALLOW_PREFIXES）：${abs}`,
    )
  }
}

async function openWithSystem(target, { appName } = {}) {
  const plat = platform()
  if (plat === 'darwin') {
    const args = appName ? ['-a', appName, target] : [target]
    await execFileAsync('open', args, { timeout: 15_000 })
    return
  }
  if (plat === 'win32') {
    await execFileAsync('cmd', ['/c', 'start', '', target], { timeout: 15_000, windowsHide: true })
    return
  }
  await execFileAsync('xdg-open', [target], { timeout: 15_000 })
}

const server = new McpServer({
  name: 'external-apps',
  version: '1.0.0',
})

server.registerTool(
  'list_capabilities',
  {
    description:
      '列出本 MCP 可调用的外部应用能力（打开 URL / 本机路径）。不等于 OpenClaw 渠道网关。',
    inputSchema: z.object({}),
  },
  async () => {
    const prefixes = allowPrefixes()
    const text = [
      '【external-apps MCP】',
      '- open_url：用系统默认浏览器打开 http(s) URL',
      '- open_path：用系统默认应用打开本机文件/目录（可选指定 macOS App 名）',
      '- list_capabilities：本说明',
      prefixes.length
        ? `- 路径白名单前缀：${prefixes.join(' · ')}`
        : '- 路径白名单：无（拒绝 open_path）',
      '管理入口：产品「设置 → 高级 → MCP 服务器」。编码主路径不依赖本 MCP。',
    ].join('\n')
    return { content: [{ type: 'text', text }] }
  },
)

server.registerTool(
  'open_url',
  {
    description: '用系统默认浏览器打开 http 或 https URL（调用外部浏览器应用）。',
    inputSchema: z.object({
      url: z.string().describe('完整 URL，仅 http/https'),
    }),
  },
  async ({ url }) => {
    const raw = assertSafeToken('url', url)
    let parsed
    try {
      parsed = new URL(raw)
    } catch {
      throw new Error('URL 无效')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('仅允许 http/https')
    }
    await openWithSystem(parsed.toString())
    return {
      content: [{ type: 'text', text: `已请求系统打开：${parsed.toString()}` }],
    }
  },
)

server.registerTool(
  'open_path',
  {
    description:
      '用系统默认应用打开本机文件或目录；macOS 可传 appName（如 "Safari"、"Visual Studio Code"）。',
    inputSchema: z.object({
      path: z.string().describe('绝对路径或 ~/ 开头'),
      appName: z.string().optional().describe('仅 macOS：open -a 的应用名'),
    }),
  },
  async ({ path: rawPath, appName }) => {
    let p = assertSafeToken('path', rawPath)
    if (p === '~') p = process.env.HOME || ''
    else if (p.startsWith('~/')) p = path.join(process.env.HOME || '', p.slice(2))
    const abs = path.resolve(p)
    if (!path.isAbsolute(abs)) throw new Error('须为绝对路径')
    assertPathAllowed(abs)
    if (!fs.existsSync(abs)) throw new Error(`路径不存在：${abs}`)
    const app = appName ? assertSafeToken('appName', appName) : undefined
    if (app && platform() !== 'darwin') {
      throw new Error('appName 仅支持 macOS')
    }
    await openWithSystem(abs, { appName: app })
    return {
      content: [
        {
          type: 'text',
          text: app ? `已请求用「${app}」打开：${abs}` : `已请求系统打开：${abs}`,
        },
      ],
    }
  },
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('[external-apps MCP]', err)
  process.exit(1)
})
