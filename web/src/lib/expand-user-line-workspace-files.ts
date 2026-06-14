import type { DesktopApi } from "@/types/desktop";
import type { ParsedAgentCommand } from "@/lib/parse-agent-command";
import { relatedArtifactPathsForAgent } from "@/lib/agent-artifact-paths";

const EXPLICIT_PATH_RE =
  /\b((?:docs|app|data|scripts|frontend|src|test|tests)(?:\/[a-zA-Z0-9_.-]+)+\.(?:md|txt|json|yaml|yml))\b/g;

function uniq(paths: string[]): string[] {
  return [...new Set(paths.map((p) => p.replace(/\\/g, "/")))];
}

function extractExplicitRelativePaths(line: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(EXPLICIT_PATH_RE.source, "g");
  while ((m = re.exec(line)) !== null) {
    const p = m[1];
    if (!p.includes("..")) out.add(p.replace(/\\/g, "/"));
  }
  return [...out];
}

function defaultImplicitCandidates(settings: { defaultConfirmWritePath?: string }): string[] {
  return uniq([
    settings.defaultConfirmWritePath?.trim() || "docs/prd.md",
    "docs/prd_v1.2.md",
    "docs/prd.md",
  ]);
}

/**
 * 是否在消息里提及「要依据 PRD」却未带具体路径：此时按设置顺序尝试默认 PRD 文件。
 */
export function shouldTryImplicitPrdFiles(
  cmd: ParsedAgentCommand,
  displayLine: string,
  bodyOrLine: string,
): boolean {
  if (extractExplicitRelativePaths(bodyOrLine).length > 0) return false;
  if (cmd.matched && cmd.stem === "project-manager") {
    return /(?:需求|PRD|prd|产品经理|任务拆解|WBS|拆解|工作包)/i.test(bodyOrLine);
  }
  /** /pm：用户常只说「按项目检查/优化」而不带路径，仍应注入 PRD/README 供模型对齐现状 */
  if (cmd.matched && cmd.stem === "product-manager") {
    return /(?:需求|PRD|prd|产品经理|项目|实现|检查|优化|落地|范围|验收|现状)/i.test(bodyOrLine);
  }
  if (!cmd.matched) {
    return /(?:需求文档|产品经理需求|根据.*PRD|任务拆解|WBS|优化|WEB|web\s*应用|项目|按照|上文)/i.test(
      displayLine,
    );
  }
  return false;
}

/** 用户说「按照以上内容」「执行优化」等追问时，须注入工作区事实，避免本地小模型瞎猜 Django 模板 */
export function shouldInjectFollowUpWorkspaceContext(displayLine: string): boolean {
  const s = displayLine.trim();
  if (!s) return false;
  return (
    /(?:按照|根据|依).*?(?:以上|上文|前面|刚才|优化)/i.test(s) ||
    /继续.*?(?:优化|写|做|完善)/i.test(s) ||
    /(?:上面|前文)(?:的|说|提到)?/i.test(s) ||
    /^执行(?:优化|改进|方案)?$/i.test(s) ||
    /执行.*优化|落地.*优化|按.*优化建议/i.test(s) ||
    /(?:将|把).*(?:以上|上文|前面).*(?:生成|整理|写入|落盘|保存)/i.test(s) ||
    /(?:生成|整理|写入).*(?:需求文档|PRD|prd)/i.test(s)
  );
}

/** 极短且泛指「WEB应用/本项目」时，主动读 README/PRD 与目录树 */
export function shouldInjectProjectBootstrap(displayLine: string): boolean {
  const s = displayLine.trim();
  if (!s || s.length > 96) return false;
  return /^(WEB应用|web\s*应用|本项目|当前项目|这个仓库|工作区)$/i.test(s);
}

function flattenPanelTree(
  nodes: { name: string; type: string; children?: unknown[] }[],
  prefix = "",
  out: string[] = [],
  depth = 0,
): string[] {
  if (depth > 4 || out.length > 120) return out;
  for (const n of nodes) {
    if (!n?.name) continue;
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "file") out.push(p);
    else {
      out.push(`${p}/`);
      if (Array.isArray(n.children)) {
        flattenPanelTree(n.children as typeof nodes, p, out, depth + 1);
      }
    }
  }
  return out;
}

async function buildWorkspaceContextAppendix(desktop: DesktopApi): Promise<{
  appendix: string;
  injectedPaths: string[];
}> {
  const parts: string[] = [];
  const injectedPaths: string[] = [];

  if (typeof desktop.workspaceGetExecutionSnapshot === "function") {
    try {
      const snap = await desktop.workspaceGetExecutionSnapshot();
      if (snap?.ok && typeof snap.text === "string" && snap.text.trim()) {
        parts.push(
          "【当前工作区执行情况快照】\n" +
            "以下为应用从所选工作区采集的客观事实；请据此理解项目，勿编造 Django/Flask 等无关模板。\n\n" +
            snap.text.trim(),
        );
        injectedPaths.push("（工作区快照）");
      }
    } catch {
      /* ignore */
    }
  }

  if (typeof desktop.listWorkspacePanelTree === "function") {
    try {
      const tree = await desktop.listWorkspacePanelTree();
      if (tree?.ok && Array.isArray(tree.tree) && tree.tree.length > 0) {
        const lines = flattenPanelTree(tree.tree as { name: string; type: string; children?: unknown[] }[]);
        if (lines.length) {
          parts.push(
            "【工作区目录树（节选）】\n" + lines.slice(0, 100).join("\n"),
          );
          injectedPaths.push("（目录树）");
        }
      }
    } catch {
      /* ignore */
    }
  }

  const read = desktop.readWorkspaceTextFile;
  if (typeof read === "function") {
    const candidates = [
      "README.md",
      "docs/TO1-requirements.md",
      "docs/architecture-layers.md",
      "docs/prd.md",
      "pyproject.toml",
      "package.json",
    ];
    let readmeDone = false;
    for (const rel of candidates) {
      try {
        const r = await read(rel);
        if (r?.ok && typeof r.text === "string" && r.text.trim()) {
          parts.push(`【工作区文件：${rel}】\n${r.text.trim().slice(0, 16_000)}`);
          injectedPaths.push(rel);
          if (rel === "README.md") readmeDone = true;
          if (readmeDone && parts.length >= 3) break;
        }
      } catch {
        /* ignore */
      }
    }
  }

  const antiTemplate =
    "【强制·读工作区】以上内容为当前仓库真实文件。禁止假设 Django/Flask（若无 manage.py/settings.py）；" +
    "禁止重复粘贴 pip install / runserver 等通用教程。" +
    "若用户要求「执行/落地优化」，须基于上述 README/docs 给出针对本仓库的具体改动（路径+要点），" +
    "需要写盘时使用 ```workspace-write``` JSON 或 MCP workspace-write 工具，勿只输出空泛 bash。";

  if (!parts.length) return { appendix: "", injectedPaths: [] };
  parts.push(antiTemplate);
  const joined =
    "\n\n---\n（以下由应用从当前工作区自动注入，请优先阅读再回答，禁止再向用户索要已在下列内容中的信息）\n\n" +
    parts.join("\n\n");
  const MAX_APPENDIX_CHARS = 20_000;
  return {
    appendix:
      joined.length > MAX_APPENDIX_CHARS
        ? `${joined.slice(0, MAX_APPENDIX_CHARS)}\n\n…（工作区注入已截断至 ${MAX_APPENDIX_CHARS} 字符）`
        : joined,
    injectedPaths,
  };
}

export type ExpandWorkspaceFilesOptions = {
  settings: { defaultConfirmWritePath?: string };
  cmd: ParsedAgentCommand;
  displayLine: string;
};

/**
 * 用户询问「三省六部 / Agent 配置」等时，内置 MCP 往往没有「读 ~/.claude/agents」类工具，模型只能瞎猜。
 * 由桌面侧枚举目录并注入索引（与智能体页同源）。
 */
export function shouldInjectClaudeAgentsCatalog(displayLine: string): boolean {
  const s = displayLine.trim();
  if (!s) return false;
  return (
    /三省|六部|sanshengliubu|翰林|中书|门下|尚书/i.test(s) ||
    /(?:智能体|Agent|agent).*?(?:配置|职责|列表|目录)/i.test(s) ||
    /~\/.claude\/agents/i.test(s) ||
    /(?:查看|列出|显示).*(?:配置|职责|Agent|智能体)/i.test(s)
  );
}

async function buildClaudeAgentsCatalogAppendix(desktop: DesktopApi): Promise<{
  appendix: string;
  injectedPaths: string[];
}> {
  if (typeof desktop.listClaudeAgentMarkdown !== "function") {
    return { appendix: "", injectedPaths: [] };
  }
  const r = await desktop.listClaudeAgentMarkdown();
  const label = "~/.claude/agents（含 sanshengliubu/ 三省六部扩展）";
  if (!r?.ok) {
    return {
      appendix: `\n\n---\n（以下由应用尝试扫描 ${label} 失败：${r?.error ?? "未知错误"}）\n`,
      injectedPaths: [],
    };
  }
  const items = r.items ?? [];
  if (items.length === 0) {
    return {
      appendix: `\n\n---\n（以下由应用扫描 ${label}：当前尚无 .md；可在「智能体」页或本机目录添加角色文件。）\n`,
      injectedPaths: ["~/.claude/agents（空目录）"],
    };
  }
  const lines = items.map((row) => {
    const loc = row.source === "sanshengliubu" ? `sanshengliubu/${row.basename}` : row.basename;
    const desc = (row.description || "").replace(/\s+/g, " ").trim().slice(0, 240);
    const cat = row.category ? ` [${row.category}]` : "";
    return `- **${loc}**${cat}${desc ? ` — ${desc}` : ""}`;
  });
  const body = [
    "【本机 Agent 角色索引】根目录为常用角色；**sanshengliubu/** 下为「三省六部」等扩展角色（与界面「智能体」页一致）。",
    "同名 `.md` 若根目录与 sanshengliubu 各有一份，索引会列两条；实际按 stem 读规则时仍**优先根目录**（与桌面「读 Agent」一致）。",
    "",
    ...lines,
  ].join("\n");
  return {
    appendix: `\n\n---\n（以下由应用从 ${label} 自动读入目录索引）\n\n${body}`,
    injectedPaths: ["~/.claude/agents（目录索引）"],
  };
}

/**
 * 从工作区读取用户提到的相对路径，并把正文追加到发往模型的 userLine（本地 / 云同一套规则）。
 */
export async function expandUserLineWithWorkspaceFiles(
  desktop: DesktopApi,
  baseUserLine: string,
  opts: ExpandWorkspaceFilesOptions,
): Promise<{ expanded: string; injectedPaths: string[] }> {
  const { settings, cmd, displayLine } = opts;
  const injected: { path: string; text: string }[] = [];
  const seen = new Set<string>();

  const read = desktop.readWorkspaceTextFile;
  if (typeof read === "function") {
    const explicit = extractExplicitRelativePaths(baseUserLine);
    for (const rel of explicit) {
      if (seen.has(rel)) continue;
      const r = await read(rel);
      if (r?.ok && typeof r.text === "string" && r.text.trim()) {
        seen.add(rel);
        injected.push({ path: rel, text: r.text });
      }
    }

    const tryImplicit =
      shouldTryImplicitPrdFiles(cmd, displayLine, baseUserLine) && injected.length === 0;

    if (cmd.matched && typeof read === "function") {
      for (const rel of relatedArtifactPathsForAgent(cmd.stem)) {
        if (seen.has(rel)) continue;
        const r = await read(rel);
        if (r?.ok && typeof r.text === "string" && r.text.trim()) {
          seen.add(rel);
          injected.push({ path: rel, text: r.text });
        }
      }
    }

    if (tryImplicit) {
      const candidates =
        cmd.matched && cmd.stem === "product-manager"
          ? uniq([
              ...defaultImplicitCandidates(settings),
              "README.md",
              "docs/README.md",
              "docs/overview.md",
            ])
          : defaultImplicitCandidates(settings);
      for (const rel of candidates) {
        if (seen.has(rel)) continue;
        const r = await read(rel);
        if (r?.ok && typeof r.text === "string" && r.text.trim()) {
          seen.add(rel);
          injected.push({ path: rel, text: r.text });
          break;
        }
      }
    }
  }

  const workspaceAppendix = injected.length
    ? injected
        .map(
          ({ path, text }) =>
            `\n\n---\n（以下由应用从当前工作区自动读入：${path}）\n\n${text}`,
        )
        .join("")
    : "";

  let agentsAppendix = "";
  /** @type {string[]} */
  const agentsInjected: string[] = [];
  if (shouldInjectClaudeAgentsCatalog(displayLine)) {
    const ag = await buildClaudeAgentsCatalogAppendix(desktop);
    agentsAppendix = ag.appendix;
    agentsInjected.push(...ag.injectedPaths);
  }

  let contextAppendix = "";
  /** @type {string[]} */
  const contextInjected: string[] = [];
  const needBootstrap =
    shouldInjectFollowUpWorkspaceContext(displayLine) ||
    shouldInjectProjectBootstrap(displayLine) ||
    (injected.length === 0 &&
      shouldTryImplicitPrdFiles(cmd, displayLine, baseUserLine));
  if (needBootstrap && typeof desktop.workspaceGetExecutionSnapshot === "function") {
    const ctx = await buildWorkspaceContextAppendix(desktop);
    contextAppendix = ctx.appendix;
    contextInjected.push(...ctx.injectedPaths);
  }

  if (!workspaceAppendix && !agentsAppendix && !contextAppendix) {
    return { expanded: baseUserLine, injectedPaths: [] };
  }

  return {
    expanded: baseUserLine + workspaceAppendix + contextAppendix + agentsAppendix,
    injectedPaths: [...injected.map((x) => x.path), ...contextInjected, ...agentsInjected],
  };
}
