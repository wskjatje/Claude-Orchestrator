/** 官方 MCP 实际启动命令（固定版本，非泛化包名） */
export const MCP_PRESET_COMMAND_LINES: Record<string, string> = {
  filesystem: "npx -y @modelcontextprotocol/server-filesystem@2026.1.14 ~/",
  fetch: "uvx mcp-server-fetch==2026.6.4",
  memory: "npx -y @modelcontextprotocol/server-memory@2026.1.26",
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
    name: "fetch",
    label: "网页抓取",
    desc: "获取网页正文（需安装 uv）",
    commandLine: MCP_PRESET_COMMAND_LINES.fetch,
  },
  {
    name: "memory",
    label: "记忆",
    desc: "记住对话里的重要信息",
    commandLine: MCP_PRESET_COMMAND_LINES.memory,
  },
];

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

  if (name === "filesystem") {
    if (/@modelcontextprotocol\/server-filesystem(?!@)/.test(raw)) {
      return MCP_PRESET_COMMAND_LINES.filesystem;
    }
  }
  if (name === "memory") {
    if (/@modelcontextprotocol\/server-memory(?!@)/.test(raw)) {
      return MCP_PRESET_COMMAND_LINES.memory;
    }
  }

  return raw;
}

export function presetCommandLine(name: string): string | undefined {
  return MCP_PRESET_COMMAND_LINES[name];
}
