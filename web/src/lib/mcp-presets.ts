/** MCP 模板预设；带 __BUNDLED_*__ 的由 bundledMcpCommandLines 替换为仓库内固定命令 */
export const MCP_PRESET_COMMAND_LINES: Record<string, string> = {
  filesystem: "__BUNDLED_FILESYSTEM__",
  fetch: "__BUNDLED_FETCH__",
  memory: "__BUNDLED_MEMORY__",
  "sequential-thinking": "__BUNDLED_SEQUENTIAL__",
  postgres: "npx -y @modelcontextprotocol/server-postgres <connection-string>",
  puppeteer: "__BUNDLED_PUPPETEER__",
  "brave-search": "npx -y @modelcontextprotocol/server-brave-search",
  "google-maps": "npx -y @modelcontextprotocol/server-google-maps",
  slack: "npx -y @modelcontextprotocol/server-slack",
  sqlite: "__BUNDLED_SQLITE__",
  sanshengliubu: "node __BUNDLED_SANSHENGLIUBU__",
  "external-apps": "node __BUNDLED_EXTERNAL_APPS__",
};

/** 检测未替换的尖括号占位符，如 `<path/to/db>`、`<connection-string>` */
export function hasAngleBracketPlaceholder(text: string): boolean {
  return /<[^>]+>/.test(text);
}

/** 各预设 MCP 需要的环境变量 key（值为空，由用户填写） */
export const MCP_TEMPLATE_ENV: Record<string, Record<string, string>> = {
  "brave-search": { BRAVE_API_KEY: "" },
  "google-maps": { GOOGLE_MAPS_API_KEY: "" },
  slack: { SLACK_BOT_TOKEN: "", SLACK_TEAM_ID: "" },
};

export type McpPresetMeta = {
  name: string;
  label: string;
  desc: string;
  commandLine: string;
};

export const MCP_PRESETS: McpPresetMeta[] = [
  {
    name: "filesystem",
    label: "文件系统",
    desc: "读写本机目录（默认 ~/）",
    commandLine: MCP_PRESET_COMMAND_LINES.filesystem,
  },
  {
    name: "sequential-thinking",
    label: "深度推理",
    desc: "结构化推理，解决复杂问题",
    commandLine: MCP_PRESET_COMMAND_LINES["sequential-thinking"],
  },
  {
    name: "fetch",
    label: "网页抓取",
    desc: "获取网页正文（需安装 uv）",
    commandLine: MCP_PRESET_COMMAND_LINES.fetch,
  },
  {
    name: "memory",
    label: "记忆",
    desc: "记录对话中的重要信息",
    commandLine: MCP_PRESET_COMMAND_LINES.memory,
  },
  {
    name: "puppeteer",
    label: "浏览器自动化",
    desc: "控制无头浏览器抓取或截图",
    commandLine: MCP_PRESET_COMMAND_LINES.puppeteer,
  },
  {
    name: "postgres",
    label: "PostgreSQL",
    desc: "企业级数据库读写，需连接串参数",
    commandLine: MCP_PRESET_COMMAND_LINES.postgres,
  },
  {
    name: "sqlite",
    label: "SQLite",
    desc: "本地 SQLite（使用仓库内固定服务与 demo 库）",
    commandLine: MCP_PRESET_COMMAND_LINES.sqlite,
  },
  {
    name: "brave-search",
    label: "Brave Search",
    desc: "搜索引擎集成，需 BRAVE_API_KEY 环境变量",
    commandLine: MCP_PRESET_COMMAND_LINES["brave-search"],
  },
  {
    name: "google-maps",
    label: "Google Maps",
    desc: "地图服务，需 GOOGLE_MAPS_API_KEY 环境变量",
    commandLine: MCP_PRESET_COMMAND_LINES["google-maps"],
  },
  {
    name: "slack",
    label: "Slack",
    desc: "团队协作，需 SLACK_BOT_TOKEN + SLACK_TEAM_ID",
    commandLine: MCP_PRESET_COMMAND_LINES.slack,
  },
  {
    name: "sanshengliubu",
    label: "三省六部",
    desc: "编排底层工具：local_time、Agent 索引、治理顺序",
    commandLine: MCP_PRESET_COMMAND_LINES.sanshengliubu,
  },
  {
    name: "external-apps",
    label: "外部应用",
    desc: "打开 URL / 本机路径（系统默认应用）；标准 MCP，非 OpenClaw 渠道",
    commandLine: MCP_PRESET_COMMAND_LINES["external-apps"],
  },
];

/** 用户已有的 MCP 是否与某个预设名称匹配（用于 UI 标记） */
export function isPresetName(name: string): boolean {
  return name in MCP_PRESET_COMMAND_LINES;
}

function collapseHomeInToken(token: string, homeDir: string): string {
  if (!homeDir) return token;
  if (token === homeDir) return "~";
  if (token.startsWith(`${homeDir}/`)) return `~/${token.slice(homeDir.length + 1)}`;
  return token;
}

export function formatStdioCommandLine(command: string | null, args: string[], homeDir = ""): string {
  if (!command) return "";
  const parts = [command, ...args.map((a) => collapseHomeInToken(String(a), homeDir))];
  return parts.join(" ");
}

/** 将配置中的 command/args 解析为界面展示用的实际命令行 */
export function resolveMcpCommandLine(
  name: string,
  commandBin: string | null,
  args: string[],
  homeDir = "",
): string {
  const raw = formatStdioCommandLine(commandBin, args, homeDir);

  if (/@modelcontextprotocol\/server-fetch\b/.test(raw)) {
    return MCP_PRESET_COMMAND_LINES.fetch;
  }
  if (name === "fetch" && commandBin === "npx") {
    return MCP_PRESET_COMMAND_LINES.fetch;
  }

  if (name === "filesystem" && /@modelcontextprotocol\/server-filesystem/.test(raw)) {
    return MCP_PRESET_COMMAND_LINES.filesystem;
  }
  if (name === "memory" && /@modelcontextprotocol\/server-memory/.test(raw)) {
    return MCP_PRESET_COMMAND_LINES.memory;
  }

  return raw;
}

const BUNDLED_PLACEHOLDERS = new Set([
  MCP_PRESET_COMMAND_LINES.filesystem,
  MCP_PRESET_COMMAND_LINES.fetch,
  MCP_PRESET_COMMAND_LINES.memory,
  MCP_PRESET_COMMAND_LINES["sequential-thinking"],
  MCP_PRESET_COMMAND_LINES.puppeteer,
  MCP_PRESET_COMMAND_LINES.sqlite,
  MCP_PRESET_COMMAND_LINES.sanshengliubu,
  MCP_PRESET_COMMAND_LINES["external-apps"],
]);

export function presetCommandLine(name: string, bundledLines?: Record<string, string>): string | undefined {
  if (bundledLines?.[name]) return bundledLines[name];
  return MCP_PRESET_COMMAND_LINES[name];
}

export function resolvePresetCommandLineForForm(
  name: string,
  bundledLines?: Record<string, string>,
): string {
  if (bundledLines?.[name]) return bundledLines[name]!;
  const line = MCP_PRESET_COMMAND_LINES[name];
  if (!line) return "";
  // 内置占位未解析时不回填伪命令，避免启用坏配置
  if (BUNDLED_PLACEHOLDERS.has(line)) return "";
  return line;
}
