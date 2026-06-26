/** MCP 模板预设（不锁定版本，npx/uvx 每次拉取最新） */
export const MCP_PRESET_COMMAND_LINES: Record<string, string> = {
  filesystem: "npx -y @modelcontextprotocol/server-filesystem ~/",
  fetch: "uvx mcp-server-fetch",
  memory: "npx -y @modelcontextprotocol/server-memory",
  "sequential-thinking": "npx -y @modelcontextprotocol/server-sequential-thinking",
  postgres: "npx -y @modelcontextprotocol/server-postgres <connection-string>",
  puppeteer: "npx -y @modelcontextprotocol/server-puppeteer",
  "brave-search": "npx -y @modelcontextprotocol/server-brave-search",
  "google-maps": "npx -y @modelcontextprotocol/server-google-maps",
  slack: "npx -y @modelcontextprotocol/server-slack",
  sanshengliubu: "node __BUNDLED_SANSHENGLIUBU__",
};

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
    desc: "本地数据管理（需安装 uv / Python 3.10+）",
    commandLine: "uvx mcp-server-sqlite --db-path <path/to/db>",
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

export function presetCommandLine(name: string, bundledLines?: Record<string, string>): string | undefined {
  if (name === "sanshengliubu" && bundledLines?.sanshengliubu) {
    return bundledLines.sanshengliubu;
  }
  return MCP_PRESET_COMMAND_LINES[name];
}

export function resolvePresetCommandLineForForm(
  name: string,
  bundledLines?: Record<string, string>,
): string {
  const line = presetCommandLine(name, bundledLines);
  if (line && line !== MCP_PRESET_COMMAND_LINES.sanshengliubu) return line;
  if (name === "sanshengliubu" && bundledLines?.sanshengliubu) return bundledLines.sanshengliubu;
  return line ?? "";
}
