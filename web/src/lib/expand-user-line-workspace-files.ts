import type { DesktopApi } from "@/types/desktop";
import type { ParsedAgentCommand } from "@/lib/parse-agent-command";
import { relatedArtifactPathsForAgent } from "@/lib/agent-artifact-paths";

const EXPLICIT_PATH_RE =
  /\b((?:docs|app|data|scripts|frontend|src|test|tests)(?:\/[a-zA-Z0-9_.-]+)+\.(?:md|txt|json|yaml|yml))\b/g;
/** 方案 E：@ 前缀引用，支持任意常见扩展名 */
const AT_REFERENCE_RE = /@([a-zA-Z0-9_.\-/]+\.(?:md|txt|json|yaml|yml|ts|tsx|js|jsx|css|html|py|go|rs|cpp|c|cxx|h|hpp|java|kt|swift|rb|php|vue|svelte))\b/g;

function uniq(paths: string[]): string[] {
  return [...new Set(paths.map((p) => p.replace(/\\/g, "/")))];
}

function extractExplicitRelativePaths(line: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;

  // 匹配 @ 前缀引用：@README.md、@src/index.tsx、@docs/prd.md
  const atRe = new RegExp(AT_REFERENCE_RE.source, "g");
  while ((m = atRe.exec(line)) !== null) {
    const p = m[1];
    if (!p.includes("..")) out.add(p.replace(/\\/g, "/"));
  }

  // 匹配不带 @ 前缀的传统路径格式
  const legacyRe = new RegExp(EXPLICIT_PATH_RE.source, "g");
  while ((m = legacyRe.exec(line)) !== null) {
    const p = m[1];
    if (!p.includes("..")) out.add(p.replace(/\\/g, "/"));
  }

  return [...out];
}

function defaultImplicitCandidates(settings: { defaultConfirmWritePath?: string }): string[] {
  return uniq([
    settings.defaultConfirmWritePath?.trim() || "",
    "README.md",
  ].filter(Boolean));
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
    return /(?:需求文档|产品经理需求|根据.*PRD|任务拆解|WBS|WEB|web\s*应用)/i.test(
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
    /(?:按照|根据|依).*?(?:以上|上文|前面|刚才).*(?:优化|执行|实现|修改|调整|生成|整理|写入|落盘|完善)/i.test(s) ||
    /继续.*?(?:执行|优化|写|做|完善|实现|修改|落地)/i.test(s) ||
    /(?:上面|前文)(?:的|说|提到)?(?:.*)(?:优化|执行|修改|方案|实现)/i.test(s) ||
    /^执行(?:优化|改进|方案)?$/i.test(s) ||
    /执行.*优化|落地.*优化|按.*优化建议/i.test(s) ||
    /(?:将|把).*(?:以上|上文|前面).*(?:生成|整理|写入|落盘|保存)/i.test(s) ||
    /(?:生成|整理|写入).*(?:需求文档|PRD|prd)/i.test(s)
  );
}

/** 用户问"当前项目是什么"或泛指「WEB应用/本项目」时，注入 README/PRD 与目录树 */
export function shouldInjectProjectBootstrap(displayLine: string): boolean {
  const s = displayLine.trim();
  if (!s || s.length > 96) return false;
  return (
    /^(WEB应用|web\s*应用|本项目|当前项目|这个仓库|工作区)$/i.test(s) ||
    /^告诉我\s*(?:这|当前|本).*(?:项目|仓库|工作区)/.test(s) ||
    /^(?:这(?:是|个)|当前)(?:项目|仓库|工作区)\s*(?:是|做什么|干什么|属于)/.test(s) ||
    /^(?:这是什么|这是什么项目|这是什么仓库|这是做什么的)$/.test(s)
  );
}

/**
 * 是否跳过工作区上下文注入。
 * 当用户消息明显与工作区项目无关（系统/Agent/设置/技能/链/任务等），
 * 跳过注入可每轮节省 500-2000 token。
 */
function shouldSkipWorkspaceContext(displayLine: string): boolean {
  const s = displayLine.trim();
  if (!s) return false;
  // Agent/智能体/技能/角色 列表或配置
  if (
    /(?:有哪些|列出|查看|当前|切换|选择)\s*(?:agent|Agent|智能体|技能|角色)/.test(s) ||
    /^(?:agent|Agent|智能体|技能|角色)[.．、：:]*(?:列表|配置|设置|管理|目录)/.test(s)
  )
    return true;
  // 设置/模式/模型相关（非项目开发问题）
  if (
    /^(?:设置|模式|配置|模型|云端模型|本地模型)(?:在哪|在哪里|是什么|怎么|有什么用|如何)/.test(s) ||
    /(?:查看|打开|修改|保存)\s*(?:设置|配置|选项|偏好)/.test(s)
  )
    return true;
  // 历史/会话导航
  if (
    /(?:历史|会话|聊天)(?:记录|列表|管理|切换|\s*在哪)/.test(s) ||
    /(?:切换|打开|关闭)\s*(?:会话|聊天|对话)/.test(s)
  )
    return true;
  // 任务链/流水线/发布
  if (
    /^(?:任务链|流水线|发布|pipeline|chain|工作流)\s*(?:配置|设置|查看|是什么|怎么用)/i.test(s) ||
    /(?:三省六部|任务链|automation.*chain)/i.test(s)
  )
    return true;
  // 纯确认/感谢（短句）
  if (
    /^(?:好的|知道了|收到|可以|嗯|行|谢谢|感谢|明白了|没问题|ok|OK|好\s*的|好\s*吧|好嘞|可以\s*了|完成)$/.test(s)
  )
    return true;
  return false;
}

const MAX_FILE_CHARS = 4_000;
const MAX_APPENDIX_CHARS = 20_000;

/**
 * 扫描工作区 docs/ 目录，返回真实文件清单 markdown。
 * 供 Auto 和链路模式共用，阻断模型对虚构路径（如 architecture-note.md）的模式联想。
 */
export async function buildDocsFileListHint(desktop: DesktopApi): Promise<string> {
  if (typeof desktop.listWorkspaceMarkdownFiles !== "function") return "";
  try {
    const ls = await desktop.listWorkspaceMarkdownFiles();
    if (!ls?.ok || !Array.isArray(ls.files)) return "";
    const docsFiles = ls.files
      .filter((f) => f.relPath.startsWith("docs/") && f.relPath.endsWith(".md"))
      .slice(0, 60)
    if (!docsFiles.length) return "";
    return (
      "\n\n【docs/ 实际文件清单】（仅列出真实存在的文件，不在列表中的文档不存在）\n" +
      docsFiles.map((f) => `- ${f.relPath}`).join("\n")
    );
  } catch {
    return "";
  }
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
          "【工作区快照】\n" +
            snap.text.trim(),
        );
        injectedPaths.push("（工作区快照）");
      }
    } catch {
      /* ignore */
    }
  }

  const read = desktop.readWorkspaceTextFile;
  if (typeof read === "function") {
    const candidates = [
      "README.md",
      "package.json",
      "pyproject.toml",
      "Cargo.toml",
      "go.mod",
      "Gemfile",
      "composer.json",
      "desktop/package.json",
    ];
    let readmeDone = false;
    for (const rel of candidates) {
      try {
        const r = await read(rel);
        if (r?.ok && typeof r.text === "string" && r.text.trim()) {
          parts.push(`【工作区文件：${rel}】\n${r.text.trim().slice(0, MAX_FILE_CHARS)}`);
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
    "【强制】项目定义以 package.json/README.md 为权威来源。" +
    "勿引用任务跟踪文件的猜测内容。勿虚构不存在的文档。" +
    "纯询问场景无需写文档/任务跟踪文件。落地优化须基于真实文件给具体改动。";

  // 共享函数：注入实际 docs/ 文件列表
  const docsFileList = await buildDocsFileListHint(desktop);

  if (!parts.length) return { appendix: "", injectedPaths: [] };
  parts.push(antiTemplate);
  if (docsFileList) parts.push(docsFileList.trim());
  const joined =
    "\n\n---\n【工作区注入】\n\n" +
    parts.join("\n\n");
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
  /** 方案 G：当前是否在任务链中执行。链中只读根文档 + 上一步产出，避免冗余注入。 */
  chainRunning?: boolean;
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
  const { settings, cmd, displayLine, chainRunning } = opts;
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
      const upstreamPaths = relatedArtifactPathsForAgent(cmd.stem);
      // 方案 G：链中只读根文档 + 上一步产出（前 2 个），非链模式保持全量读取
      const candidates = opts.chainRunning ? upstreamPaths.slice(0, 2) : upstreamPaths;
      const foundPaths: string[] = [];
      const missingPaths: string[] = [];
      for (const rel of candidates) {
        if (seen.has(rel)) continue;
        const r = await read(rel);
        if (r?.ok && typeof r.text === "string" && r.text.trim()) {
          seen.add(rel);
          injected.push({ path: rel, text: r.text });
          foundPaths.push(rel);
        } else {
          missingPaths.push(rel);
        }
      }
      // 不再注入缺失文件声明
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
          .map(({ path, text }) =>
            `\n\n---\n【工作区：${path}】\n\n${text}`,
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
    !shouldSkipWorkspaceContext(displayLine) &&
    (shouldInjectFollowUpWorkspaceContext(displayLine) ||
      shouldInjectProjectBootstrap(displayLine) ||
      (injected.length === 0 &&
        shouldTryImplicitPrdFiles(cmd, displayLine, baseUserLine)));
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

// 工作区文件路径模式（agent 指令中常见）
const INSTRUCTION_FILE_RE =
  /\b((?:docs|config|src|app|server|web|scripts)\/[a-zA-Z0-9_\-./]+\.(?:md|txt|json|yaml|yml|toml))\b/g;
const ROOT_BOOTSTRAP_RE =
  /\b((?:README|CLAUDE|CHANGELOG|CONTRIBUTING|package|tsconfig|vite)\.(?:md|json|ts))\b/g;
const CHAIN_STEP_GLOB_RE = /docs\/chain-steps\/\*\.md/g;

/**
 * 扫描提示词中 agent 指令提及的工作区文件，逐条检查存在性并注入实际状态。
 * 供 cloud-direct 等无工具调用能力的场景使用，避免 LLM 虚构不存在的文件内容。
 */
export async function preReadInstructedWorkspaceFiles(
  api: DesktopApi,
  text: string,
  skipPaths?: string[],
): Promise<string> {
  const paths = new Set<string>();

  // 匹配 docs/xxx.md 等指令式路径
  let m: RegExpExecArray | null;
  const dirRe = new RegExp(INSTRUCTION_FILE_RE.source, "g");
  while ((m = dirRe.exec(text)) !== null) {
    const p = m[1].replace(/\\/g, "/");
    if (!p.includes("..")) paths.add(p);
  }
  // 匹配 README.md / package.json 等根文件
  const rootRe = new RegExp(ROOT_BOOTSTRAP_RE.source, "g");
  while ((m = rootRe.exec(text)) !== null) {
    const p = m[1].replace(/\\/g, "/");
    if (!p.includes("..")) paths.add(p);
  }

  // 展开 docs/chain-steps/*.md 通配符
  let chainStepFiles: string[] = [];
  if (CHAIN_STEP_GLOB_RE.test(text) && typeof api.listWorkspaceMarkdownFiles === "function") {
    try {
      const listed = await api.listWorkspaceMarkdownFiles();
      if (listed?.ok && Array.isArray(listed.files)) {
        chainStepFiles = listed.files
          .map((f) => (f as { relPath: string }).relPath)
          .filter((rel) => rel.startsWith("docs/chain-steps/") && rel.endsWith(".md"))
          .slice(0, 10);
        for (const p of chainStepFiles) paths.add(p);
      }
    } catch {
      /* ignore */
    }
  }

  // 去重：跳过已由 expandUserLineWithWorkspaceFiles 注入的路径
  if (skipPaths?.length) {
    for (const p of skipPaths) {
      paths.delete(p);
    }
  }

  if (paths.size === 0) return "";

  const found: { rel: string; content: string }[] = [];
  const missing: string[] = [];
  let totalChars = 0;
  const MAX_CHARS = 20_000;

  const read = api.readWorkspaceTextFile;
  for (const rel of paths) {
    if (totalChars >= MAX_CHARS) break;
    if (!read) break;
    try {
      const r = await read(rel);
      if (r?.ok && r.text) {
        const MAX_FILE = 30_000;
        const content =
          r.text.length > MAX_FILE ? r.text.slice(0, MAX_FILE) + "\n\n...（截断）" : r.text;
        found.push({ rel, content });
        totalChars += content.length;
      } else {
        missing.push(rel);
      }
    } catch {
      missing.push(rel);
    }
  }

  if (!found.length) return "";

  const lines: string[] = ["\n\n---\n【工作区文件】"];

  if (found.length) {
    lines.push("\n✅ 已读取：");
    for (const f of found) {
      lines.push(`  - ${f.rel}`);
    }
    for (const f of found) {
      lines.push(`\n【${f.rel}】\n${f.content}`);
    }
  }

  lines.push("\n---\n");

  return lines.join("\n");
}
