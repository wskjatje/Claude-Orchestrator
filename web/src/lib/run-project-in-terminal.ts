import type { DesktopApi } from "@/types/desktop";
import {
  extractPreviewHint,
  formatPreviewAssistantReply,
  isPythonPreviewQuestion,
  performProjectPreview,
} from "@/lib/project-preview";

export type ProjectRunPlan = {
  ok: boolean;
  kind?: string;
  error?: string;
  label?: string;
  command?: string;
  terminalCommand?: string;
  script?: string;
  entryRel?: string;
  cwdRel?: string;
  scanSummary?: string[];
  ctx?: {
    name?: string;
    description?: string;
    framework?: string;
    frameworkVersion?: string;
    scripts?: Record<string, string>;
    deps?: Record<string, string>;
    pythonVersion?: string;
    venv?: string;
  };
};

function isRunProjectIntent(text: string): boolean {
  const t = text.trim();
  return (
    /(?:运行|启动|run|start).*(?:项目|应用|dev|开发服务器|本地服务)/i.test(t) ||
    /^(?:运行|启动)\s*项目/i.test(t)
  );
}

/** 检测失败时的详细说明 */
function formatTerminalRunFailedReply(plan: ProjectRunPlan): string {
  const lines: string[] = [];
  lines.push("## 无法自动运行");
  lines.push("");
  lines.push("未能自动检测到项目的启动方式。");
  lines.push("");

  // 服务端返回的扫描摘要优先
  if (plan.scanSummary && plan.scanSummary.length > 0) {
    lines.push("**已扫描**：");
    for (const s of plan.scanSummary) lines.push(`- ${s}`);
    lines.push("");
  } else {
    lines.push("**已扫描**：");
    lines.push("- `package.json`：未找到 dev/start/preview/serve 脚本");
    lines.push("- Python 入口：未找到 app.py / main.py / manage.py");
    lines.push("- HTML 文件：未找到可预览的静态页面");
    lines.push("");
  }

  lines.push("请在底部终端手动执行项目的启动命令。");

  return lines.join("\n");
}

/** 静态 HTML 项目运行结果 */
function formatStaticRunReply(
  plan: ProjectRunPlan,
  preview: { ok: boolean; displayText: string; url?: string | null },
): string {
  const lines: string[] = [];
  lines.push("## 项目运行");
  lines.push("");

  const name = plan.ctx?.name;
  const infoLines: string[] = [];
  if (name) infoLines.push(`**${name}**`);
  if (plan.ctx?.framework) {
    const fw = `**${plan.ctx.framework}**${plan.ctx.frameworkVersion ? ` ${plan.ctx.frameworkVersion}` : ""}`;
    infoLines.push(`框架：${fw}`);
  }
  const typeLine =
    infoLines.length > 0
      ? `已检测到项目类型：**静态 HTML 项目**（${infoLines.join("，")}）`
      : "已检测到项目类型：**静态 HTML 项目**";
  lines.push(typeLine);
  lines.push("");

  if (plan.entryRel) lines.push(`> **入口文件**：${plan.entryRel}`);
  if (preview.url) lines.push(`> **访问地址**：[${preview.url}](${preview.url})`);
  lines.push("");

  if (preview.ok) {
    lines.push("已启动静态预览服务，正在浏览器中打开。");
    lines.push("");
    lines.push("发送「停止预览」可关闭本地预览服务。");
  } else {
    lines.push(`未能启动预览：${preview.displayText}`);
  }

  return lines.join("\n");
}

/** Python / npm-script 项目运行结果（多段：分析 → 依赖 → 执行 → 摘要） */
function formatPreviewRunReply(
  plan: ProjectRunPlan,
  preview: {
    ok: boolean;
    error?: string;
    url?: string | null;
    kind?: string | null;
    label?: string | null;
    command?: string | null;
    stderr?: string;
    plan?: Record<string, unknown>;
  },
): string {
  const ctx = plan.ctx;
  const isPython = plan.kind === "python";

  // ── 收集详情内容（折叠区内部） ──
  const detailLines: string[] = [];

  // 环境信息
  const infoLines: string[] = [];
  if (ctx?.framework) {
    const fwStr = `**框架**：${ctx.framework}${ctx.frameworkVersion ? ` ${ctx.frameworkVersion}` : ""}`;
    if (!infoLines.some((l) => l.includes("框架"))) infoLines.push(fwStr);
  }
  if (ctx?.pythonVersion) infoLines.push(`**Python**：${ctx.pythonVersion}`);
  if (ctx?.venv) infoLines.push(`**虚拟环境**：${ctx.venv}/（已检测到）`);
  if (plan.entryRel) infoLines.push(`**入口文件**：${plan.entryRel}`);
  if (plan.cwdRel && plan.cwdRel !== ".") infoLines.push(`**子目录**：${plan.cwdRel}/`);

  if (infoLines.length > 0) {
    detailLines.push(...infoLines.map((l) => `> ${l}`));
    detailLines.push("");
  }

  // 依赖段
  if (ctx?.deps && Object.keys(ctx.deps).length > 0) {
    const entries = Object.entries(ctx.deps);
    const versioned = entries.filter(([, ver]) => ver).slice(0, 12);
    const unversioned = entries.filter(([, ver]) => !ver).slice(0, 12);
    if (versioned.length > 0) {
      for (const [name, ver] of versioned) {
        detailLines.push(`${name.padEnd(20)}${(ver || "").replace(/^[~^>=<]+/, "")}`);
      }
    }
    if (unversioned.length > 0) {
      for (const [name] of unversioned) {
        detailLines.push(name);
      }
    }
    detailLines.push("");
  }

  // 执行前置提示
  if (ctx?.venv) {
    detailLines.push(
      `虚拟环境已就绪，Python ${ctx?.pythonVersion || ""}，所有依赖已安装。${isPython ? "现在启动项目。" : ""}`,
    );
    detailLines.push("");
  }

  // ── 构建最终输出 ──
  const lines: string[] = [];
  lines.push("## 项目运行");
  lines.push("");

  if (isPython) {
    const fw = ctx?.framework || "Python";
    const fwVer = ctx?.frameworkVersion ? ` ${ctx.frameworkVersion}` : "";
    const nameInfo = ctx?.name ? `，应用名称：**${ctx.name}**` : "";
    lines.push(`已检测到项目类型：**${fw}${fwVer} 项目**${nameInfo}`);
  } else {
    const fw = ctx?.framework;
    const fwVer = ctx?.frameworkVersion;
    const nameTag = ctx?.name
      ? ` **${ctx.name}**${fw ? `（${fw}${fwVer ? ` ${fwVer}` : ""}）` : ""}`
      : "";
    lines.push(
      `已检测到项目类型：**Node.js${fw ? ` / ${fw} ${fwVer || ""}`.trim() : ""} 项目**${nameTag}`,
    );
  }
  lines.push("");

  // 折叠区（默认收起）
  if (detailLines.length > 0) {
    lines.push("<details>");
    lines.push(`<summary>查看详情</summary>`);
    lines.push("");
    lines.push(...detailLines);
    lines.push("</details>");
    lines.push("");
  }

  // ── 运行时输出 ──
  if (preview.ok && preview.url) {
    lines.push(preview.url.startsWith("http") ? `> **${preview.url}**` : `> ${preview.url}`);
    lines.push("");
    lines.push("服务已在后台启动。");
  } else if (preview.ok) {
    lines.push("服务已在后台启动。");
  } else {
    const errorMsg = preview.error || preview.stderr || "服务未能启动";
    lines.push(`服务启动失败：${errorMsg}`);
    lines.push("");
    lines.push("请检查终端输出，或手动执行项目的启动命令。");
    return lines.join("\n");
  }

  // ── 运行状态摘要 ──
  lines.push("");
  if (isPython) {
    lines.push("项目已成功启动！以下是运行状态：");
    lines.push("");
    const statusLines: string[] = [];
    if (ctx?.name) statusLines.push(`**应用名称**：${ctx.name}`);
    if (ctx?.framework) {
      const mode = /debug/i.test(ctx.frameworkVersion || "") ? "（Debug 模式）" : "";
      statusLines.push(`**框架**：${ctx.framework} ${ctx.frameworkVersion || ""}${mode}`);
    }
    if (preview.url) statusLines.push(`**访问地址**：[${preview.url}](${preview.url})`);
    if (ctx?.pythonVersion) statusLines.push(`**Python 版本**：${ctx.pythonVersion}`);
    if (statusLines.length > 0) {
      lines.push(...statusLines.map((l) => `| ${l}`));
      lines.push("");
    }
    lines.push(
      `服务器正在后台运行中，你可以在浏览器中打开${preview.url ? ` ${preview.url} ` : " "}访问页面。如需停止服务，可以使用终端中的 \`Ctrl+C\`。`,
    );
  } else {
    lines.push("项目已成功启动！以下是运行状态：");
    lines.push("");
    if (preview.url) lines.push(`> **访问地址**：[${preview.url}](${preview.url})`);
    lines.push("");
    lines.push("服务正在后台运行中。如需停止，可以使用终端中的 `Ctrl+C`。");
    if (preview.url) lines.push("");
    lines.push("发送「停止预览」可关闭本地预览服务。");
  }

  return lines.join("\n");
}

/**
 *「运行项目」：检测 → 分析 → 后台执行 → 捕获输出 → 状态摘要。
 * Python/npm-script 项目通过 workspaceStartPreview 在服务端管理进程并捕获输出，
 * 静态 HTML 项目通过 performProjectPreview 启动本地静态服务。
 */
export async function runProjectFromChat(
  api: DesktopApi,
  userLine: string,
  opts?: { openTerminal?: () => void },
): Promise<{ ok: boolean; displayText: string; url?: string | null; ranInTerminal?: boolean }> {
  const runProject = isRunProjectIntent(userLine);
  const hint = extractPreviewHint(userLine);
  const preferPython = isPythonPreviewQuestion(userLine);

  // 服务端检测
  if (!api.workspaceDetectRunPlan) {
    return { ok: false, displayText: "当前环境不支持自动检测项目启动方式，请在底部终端手动运行。" };
  }

  const plan = (await api.workspaceDetectRunPlan({
    hint: runProject ? userLine.trim() : hint,
    userLine: userLine.trim(),
    preferStatic: !runProject,
    preferPython,
  })) as ProjectRunPlan;

  if (!plan.ok) {
    return { ok: false, displayText: formatTerminalRunFailedReply(plan) };
  }

  // "运行项目" — 通过服务端预览基础设施执行（捕获输出、检测 URL、返回状态）
  if (runProject) {
    // 静态 HTML → 本地静态服务
    if (plan.kind === "static" && plan.entryRel) {
      const preview = await performProjectPreview(api, userLine, {
        preferStatic: true,
        preferPython: false,
        entryRel: plan.entryRel,
      });
      return { ok: preview.ok, url: preview.url, displayText: formatStaticRunReply(plan, preview) };
    }

    // Python / npm-script → workspaceStartPreview（服务端 spawn 进程 + 捕获输出）
    if ((plan.kind === "python" || plan.kind === "npm-script") && api.workspaceStartPreview) {
      opts?.openTerminal?.();
      const preview = await api.workspaceStartPreview({
        hint: userLine.trim(),
        preferStatic: false,
        preferPython: plan.kind === "python",
        // 不传 entryRel，否则 startProjectPreview 会把 run.py / .html 当静态文件 serve
      });
      return {
        ok: preview.ok,
        url: preview.url ?? null,
        displayText: formatPreviewRunReply(plan, preview),
        ranInTerminal: false,
      };
    }

    return { ok: false, displayText: "当前项目类型暂不支持自动运行，请在底部终端手动执行。" };
  }

  // "预览" 模式 — 不在 run-project 路径下时才走这里
  return runNonProjectPreview(api, plan, userLine);
}

async function runNonProjectPreview(
  api: DesktopApi,
  plan: ProjectRunPlan,
  userLine: string,
): Promise<{ ok: boolean; displayText: string; url?: string | null; ranInTerminal?: boolean }> {
  // 静态 HTML → 本地静态服务
  if (plan.kind === "static") {
    const preview = await performProjectPreview(api, userLine, {
      preferStatic: true,
      preferPython: false,
      entryRel: plan.entryRel,
    });
    return { ok: preview.ok, displayText: preview.displayText, url: preview.url };
  }

  // Python / npm-script → 服务端预览（spawn + 捕获输出）
  if ((plan.kind === "python" || plan.kind === "npm-script") && api.workspaceStartPreview) {
    const preview = await api.workspaceStartPreview({
      hint: userLine.trim(),
      preferStatic: false,
      preferPython: plan.kind === "python",
      // 不传 entryRel，否则 startProjectPreview 会把 run.py 当静态文件 serve
    });
    return {
      ok: preview.ok,
      url: preview.url ?? null,
      displayText: formatPreviewRunReply(plan, preview),
    };
  }

  // 兜底：尝试直接打开预览
  const preview = await performProjectPreview(api, userLine);
  return { ok: preview.ok, displayText: preview.displayText, url: preview.url };
}

export { formatPreviewAssistantReply };
