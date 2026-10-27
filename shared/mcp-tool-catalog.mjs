/**
 * MCP 工具目录（对齐 Cursor dynamic context discovery · 最优省 token）：
 * - 全文 + 完整 schema 落盘
 * - 请求里：短名描述 + 参数「骨架」（type/required/enum + 两层嵌套）
 * - 更深 / 不确定参数时先 mcp_describe_tool / read_file 再调用
 */
import fs from 'node:fs'
import path from 'node:path'

export const MCP_TOOL_CATALOG_REL = '.claudecode/mcp-tool-catalog'
export const MCP_DESCRIBE_TOOL_NAME = 'mcp_describe_tool'

/**
 * @param {string} serverId
 * @param {string} toolName
 */
export function mcpToolCatalogRelPath(serverId, toolName) {
  const sid = String(serverId || 'mcp')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 64)
  const tn = String(toolName || 'tool')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 96)
  return `${MCP_TOOL_CATALOG_REL}/${sid}/${tn}.json`
}

/** 骨架最多展开层数（0=顶层属性值再展两层）；更深靠 mcp_describe_tool */
const SKELETON_MAX_DEPTH = 2

/**
 * @param {unknown} node
 * @param {number} depth 0=顶层属性值；小于 SKELETON_MAX_DEPTH 继续展开；更深只留 type
 * @returns {Record<string, unknown>}
 */
function skeletonNode(node, depth) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return { type: 'string' }
  }
  const pv = /** @type {Record<string, unknown>} */ (node)
  const type = typeof pv.type === 'string' ? pv.type : 'string'
  /** @type {Record<string, unknown>} */
  const out = {
    type: type === 'object' || type === 'array' ? type : type || 'string',
  }
  if (
    Array.isArray(pv.enum) &&
    pv.enum.every((x) => typeof x === 'string' || typeof x === 'number')
  ) {
    out.enum = pv.enum.slice(0, 24)
  }
  // 两层嵌套：object.properties / array.items
  if (depth < SKELETON_MAX_DEPTH) {
    if (
      out.type === 'object' &&
      pv.properties &&
      typeof pv.properties === 'object' &&
      !Array.isArray(pv.properties)
    ) {
      /** @type {Record<string, unknown>} */
      const nested = {}
      for (const [k, v] of Object.entries(
        /** @type {Record<string, unknown>} */ (pv.properties),
      )) {
        nested[k] = skeletonNode(v, depth + 1)
      }
      out.properties = nested
      if (Array.isArray(pv.required)) {
        out.required = pv.required.map(String).filter((n) => n in nested).slice(0, 24)
      }
    }
    if (out.type === 'array' && pv.items != null) {
      out.items = skeletonNode(pv.items, depth + 1)
    }
  }
  return out
}

/**
 * 参数骨架：去掉 description 等散文，保留 type / enum / required，以及两层嵌套。
 * @param {unknown} schema
 * @returns {Record<string, unknown>}
 */
export function skeletonMcpParameters(schema) {
  const raw =
    schema && typeof schema === 'object' && !Array.isArray(schema)
      ? /** @type {Record<string, unknown>} */ (schema)
      : {}
  /** @type {Record<string, unknown>} */
  const propsIn =
    raw.properties && typeof raw.properties === 'object' && !Array.isArray(raw.properties)
      ? /** @type {Record<string, unknown>} */ (raw.properties)
      : {}
  /** @type {Record<string, unknown>} */
  const props = {}
  for (const [k, v] of Object.entries(propsIn)) {
    props[k] = skeletonNode(v, 0)
  }
  /** @type {Record<string, unknown>} */
  const result = { type: 'object', properties: props }
  if (Array.isArray(raw.required)) {
    result.required = raw.required.map(String).filter((n) => n in props).slice(0, 24)
  }
  return result
}

/**
 * @param {string} workspaceRoot
 * @param {Array<{
 *   serverId: string
 *   originalToolName: string
 *   prefixed: string
 *   description?: string
 *   inputSchema?: unknown
 * }>} entries
 * @param {{ inRequestCallNames?: Iterable<string>, requestCap?: number }} [opts]
 * @returns {{ ok: boolean, indexRel: string, count: number, byCallRel: string }}
 */
export function writeMcpToolCatalog(workspaceRoot, entries, opts = {}) {
  const root = String(workspaceRoot || '').trim()
  if (!root || !Array.isArray(entries) || !entries.length) {
    return { ok: false, indexRel: '', count: 0, byCallRel: '' }
  }
  const base = path.join(root, MCP_TOOL_CATALOG_REL)
  try {
    fs.mkdirSync(base, { recursive: true })
  } catch {
    return { ok: false, indexRel: '', count: 0, byCallRel: '' }
  }

  const inRequest = new Set(
    opts.inRequestCallNames ? [...opts.inRequestCallNames].map(String) : entries.map((e) => e.prefixed),
  )
  const requestCap =
    typeof opts.requestCap === 'number' && opts.requestCap > 0 ? opts.requestCap : null
  const omitted = entries.filter((e) => !inRequest.has(e.prefixed))

  /** @type {Record<string, string>} */
  const byCall = {}
  /** @type {string[]} */
  const indexLines = [
    '# MCP tool catalog',
    '',
    'Full description + inputSchema in JSON files. Use `mcp_describe_tool` with callName, or `read_file` a path below, before calling an unfamiliar MCP tool.',
    '',
  ]
  if (omitted.length || (requestCap != null && entries.length > requestCap)) {
    indexLines.push(
      `> Request tool list is capped${requestCap != null ? ` at ${requestCap}` : ''}. Tools marked **catalog-only** are not in the model tool list — call \`mcp_describe_tool\` / \`read_file\` then the real tool name if the server exposes it outside the cap.`,
      '',
    )
  }
  let count = 0
  for (const e of entries) {
    const rel = mcpToolCatalogRelPath(e.serverId, e.originalToolName)
    const abs = path.join(root, rel)
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      const body = {
        serverId: e.serverId,
        name: e.originalToolName,
        callName: e.prefixed,
        description: String(e.description || '').slice(0, 12_000),
        inputSchema: e.inputSchema ?? { type: 'object', properties: {} },
        inRequest: inRequest.has(e.prefixed),
      }
      fs.writeFileSync(abs, `${JSON.stringify(body, null, 2)}\n`, 'utf8')
      byCall[e.prefixed] = rel
      const tag = inRequest.has(e.prefixed) ? 'in-request' : 'catalog-only'
      indexLines.push(
        `- \`${e.prefixed}\` ← ${e.serverId}/${e.originalToolName} · \`${rel}\` · ${tag}`,
      )
      count += 1
    } catch {
      /* skip one */
    }
  }
  const indexRel = `${MCP_TOOL_CATALOG_REL}/INDEX.md`
  const byCallRel = `${MCP_TOOL_CATALOG_REL}/_by_call.json`
  try {
    fs.writeFileSync(path.join(root, indexRel), `${indexLines.join('\n')}\n`, 'utf8')
    fs.writeFileSync(path.join(root, byCallRel), `${JSON.stringify(byCall, null, 2)}\n`, 'utf8')
  } catch {
    return { ok: count > 0, indexRel: '', count, byCallRel: '' }
  }
  return { ok: count > 0, indexRel, count, byCallRel }
}

/**
 * 自某节点向下还能展开几层 object.properties / array.items（不含当前层）。
 * @param {unknown} node
 * @param {number} [acc]
 */
function schemaNestingDepth(node, acc = 0) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return acc
  const pv = /** @type {Record<string, unknown>} */ (node)
  let max = acc
  if (
    pv.type === 'object' &&
    pv.properties &&
    typeof pv.properties === 'object' &&
    !Array.isArray(pv.properties)
  ) {
    for (const child of Object.values(/** @type {Record<string, unknown>} */ (pv.properties))) {
      max = Math.max(max, schemaNestingDepth(child, acc + 1))
    }
  }
  if (pv.type === 'array' && pv.items && typeof pv.items === 'object' && !Array.isArray(pv.items)) {
    max = Math.max(max, schemaNestingDepth(pv.items, acc + 1))
  }
  return max
}

/**
 * 骨架装不下的复杂 schema（嵌套深于 SKELETON_MAX_DEPTH / 属性过多）→ 请求里强制先 describe。
 * @param {unknown} schema
 */
export function mcpSchemaNeedsDescribe(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false
  const raw = /** @type {Record<string, unknown>} */ (schema)
  const props =
    raw.properties && typeof raw.properties === 'object' && !Array.isArray(raw.properties)
      ? /** @type {Record<string, unknown>} */ (raw.properties)
      : {}
  const keys = Object.keys(props)
  if (keys.length >= 10) return true
  for (const v of Object.values(props)) {
    // 顶层属性值再向下超过骨架层数 → describe
    if (schemaNestingDepth(v) > SKELETON_MAX_DEPTH) return true
  }
  return false
}

/**
 * @param {string} serverId
 * @param {string} originalToolName
 * @param {string} catalogRel
 * @param {number} [maxLen]
 * @param {{ requireDescribe?: boolean }} [opts]
 */
export function shortMcpToolDescription(
  serverId,
  originalToolName,
  catalogRel,
  maxLen = 96,
  opts = {},
) {
  const tip = opts.requireDescribe
    ? catalogRel
      ? `Must mcp_describe_tool first. ${catalogRel}`
      : 'Must mcp_describe_tool first'
    : catalogRel
      ? `Unsure args → mcp_describe_tool. File: ${catalogRel}`
      : 'MCP tool'
  const s = `【${serverId}】${originalToolName}. ${tip}`
  return s.slice(0, Math.max(48, maxLen))
}

/** Ollama tools 条目：按 callName 取完整目录 JSON */
export function buildMcpDescribeOllamaTool() {
  return {
    type: 'function',
    function: {
      name: MCP_DESCRIBE_TOOL_NAME,
      description:
        'Load full MCP tool description and inputSchema from the workspace catalog before calling an unfamiliar MCP tool. Arg: callName (exact tools[].function.name).',
      parameters: {
        type: 'object',
        properties: {
          callName: { type: 'string' },
        },
        required: ['callName'],
      },
    },
  }
}

/**
 * @param {string} workspaceRoot
 * @param {string} callName
 * @returns {{ ok: boolean, text: string }}
 */
export function readMcpToolCatalogByCallName(workspaceRoot, callName) {
  const root = String(workspaceRoot || '').trim()
  const name = String(callName || '').trim()
  if (!root || !name) {
    return { ok: false, text: 'mcp_describe_tool: need workspace and callName' }
  }
  const byCallAbs = path.join(root, MCP_TOOL_CATALOG_REL, '_by_call.json')
  try {
    const map = JSON.parse(fs.readFileSync(byCallAbs, 'utf8'))
    const rel = map && typeof map === 'object' ? map[name] : null
    if (!rel || typeof rel !== 'string') {
      return {
        ok: false,
        text: `mcp_describe_tool: unknown callName「${name}」。Check ${MCP_TOOL_CATALOG_REL}/INDEX.md`,
      }
    }
    const abs = path.join(root, rel)
    const raw = fs.readFileSync(abs, 'utf8')
    return { ok: true, text: raw.slice(0, 24_000) }
  } catch (e) {
    return {
      ok: false,
      text: `mcp_describe_tool failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}
