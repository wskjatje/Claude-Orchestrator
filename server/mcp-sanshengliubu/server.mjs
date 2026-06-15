#!/usr/bin/env node
/**
 * 三省六部 MCP：编排底层工具（local-time、Agent 索引等）。
 * 注册名建议为 sanshengliubu；由 Bridge 内置路径启动。
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const sdkRoot = path.join(__dirname, '..', 'vendor', 'cad', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs', 'server')
const { McpServer } = require(path.join(sdkRoot, 'mcp.js'))
const { StdioServerTransport } = require(path.join(sdkRoot, 'stdio.js'))
const z = require(path.join(__dirname, '..', 'vendor', 'cad', 'node_modules', 'zod'))

const TZ = process.env.LOCAL_TIME_TZ || 'Asia/Shanghai'

function formatLocalTime(d = new Date()) {
  const full = d.toLocaleString('sv-SE', { timeZone: TZ }).replace('T', ' ')
  return { full, timezone: TZ, timestamp: d.getTime() }
}

function listSanshengliubuAgents() {
  const agentsDir = path.join(os.homedir(), '.claude', 'agents', 'sanshengliubu')
  if (!fs.existsSync(agentsDir)) {
    return '（未找到 ~/.claude/agents/sanshengliubu 目录）'
  }
  const names = fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/i, ''))
    .sort()
  return names.length ? names.join('\n') : '（目录为空）'
}

const server = new McpServer({
  name: 'sanshengliubu',
  version: '1.0.0',
})

server.registerTool(
  'local_time',
  {
    description: '返回本机墙钟时间（默认 Asia/Shanghai），供编排与日志对齐。',
    inputSchema: z.object({}),
  },
  async () => {
    const t = formatLocalTime()
    return {
      content: [{ type: 'text', text: `${t.full} (${t.timezone})` }],
    }
  },
)

server.registerTool(
  'list_sanshengliubu_agents',
  {
    description: '列出 ~/.claude/agents/sanshengliubu 下已安装的 Agent stem（三省六部扩展）。',
    inputSchema: z.object({}),
  },
  async () => {
    return {
      content: [{ type: 'text', text: listSanshengliubuAgents() }],
    }
  },
)

server.registerTool(
  'governance_order',
  {
    description: '返回三省六部编排顺序：MCP → Skills → Agent。',
    inputSchema: z.object({}),
  },
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: '【三省六部·执行顺序】须遵守 MCP → Skills → Agent；底层工具（local_time 等）可随时调用。',
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
  console.error('[sanshengliubu MCP]', err)
  process.exit(1)
})
