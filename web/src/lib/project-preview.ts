import type { DesktopApi } from "@/types/desktop";
import { openExternalUrl } from "@/lib/open-external";

export type DiskMsg = { role: string; content: string; ts?: number; requestError?: boolean };

/** 用户要求预览/运行项目（不调模型，由 Bridge 检测并启动） */
export function isProjectPreviewMessage(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 160) return false;
  if (/^(?:\/preview|\/run(?:-project)?)\b/i.test(t)) return true;
  return (
    /(?:预览|查看|看看|打开|怎么|如何).*(?:页面|效果|界面|login|登录|注册|项目|py|python|后端|api|接口)/i.test(t) ||
    /(?:py|python|\.py|后端|api).*(?:预览|效果|运行|查看)/i.test(t) ||
    /(?:运行|启动|run|start|preview).*(?:项目|应用|dev|开发服务器|本地服务|后端|api)/i.test(t) ||
    /刚刚生成.*(?:预览|效果|运行)/i.test(t) ||
    /^(?:预览|运行)\s*\S+/i.test(t)
  );
}

export function isPythonPreviewQuestion(text: string): boolean {
  const t = text.trim();
  return /(?:py|python|\.py|后端|api|接口|flask|auth)/i.test(t) && /(?:预览|效果|运行|查看|怎么|如何)/i.test(t);
}

/** 从用户句子里提取预览 hint（如「登录页面」→「登录」） */
export function extractPreviewHint(text: string): string {
  const t = text.trim();
  const patterns = [
    /(?:预览|查看|打开|运行)\s*(?:一下\s*)?(.+?)(?:页面|界面|效果|项目)?\s*$/i,
    /(?:preview|run)\s+(.+)$/i,
    /\/preview\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  if (/登录|login/i.test(t)) return "login";
  if (/注册|register/i.test(t)) return "register";
  if (/首页|index|home/i.test(t)) return "index";
  return "";
}

export function formatPreviewAssistantReply(res: {
  ok: boolean;
  url?: string | null;
  label?: string | null;
  kind?: string | null;
  entryRel?: string | null;
  command?: string | null;
  error?: string | null;
  guide?: string | null;
  plan?: { kind?: string; entryRel?: string; command?: string; label?: string };
}): string {
  const parts: string[] = [];
  if (res.guide?.trim()) parts.push(res.guide.trim());

  if (!res.ok || !res.url) {
    parts.push(
      `【项目预览】未能启动。\n` +
        `- 原因：${res.error || "未知错误"}\n` +
        `- 静态页：确保存在 \`src/login.html\`；Node 项目需 \`package.json\` 的 \`dev\` 脚本。\n` +
        `- Python 后端：需 \`pip install flask\`，Orchestrator 会生成 \`src/backend/preview_app.py\`。`,
    );
    return parts.join("\n\n");
  }

  parts.push(
    "【项目预览】已启动。",
    `- 方式：${res.label || res.kind || "preview"}`,
    `- 地址：[${res.url}](${res.url})`,
  );
  if (res.entryRel) parts.push(`- 入口：\`${res.entryRel}\``);
  if (res.command) parts.push(`- 命令：\`${res.command}\``);
  if (res.kind === "python") {
    parts.push(
      "",
      "可用 curl 冒烟测试，例如：",
      "```bash",
      "curl -s http://127.0.0.1:5000/health",
      'curl -s -X POST http://127.0.0.1:5000/api/auth/login_by_phone -H "Content-Type: application/json" -d \'{"phone_number":"13800000000","verification_code":"123456"}\'',
      "```",
    );
  }
  parts.push("", "发送「停止预览」可关闭本地静态服务；Python/Node dev 进程需自行在终端结束。");
  return parts.join("\n");
}

export async function performProjectPreview(
  api: DesktopApi,
  userLine: string,
  opts?: { entryRel?: string; preferStatic?: boolean; preferPython?: boolean },
): Promise<{
  ok: boolean;
  displayText: string;
  url?: string | null;
  error?: string | null;
}> {
  if (!api.workspaceStartPreview) {
    return {
      ok: false,
      displayText:
        "【项目预览】当前 Bridge 不支持预览 RPC。\n\n请在终端 **Ctrl+C** 停止后重新运行 `npm run web:dev:full`，再试「浏览器预览」。",
      error: "RPC 不可用",
    };
  }
  const hint = extractPreviewHint(userLine);
  const preferPython = opts?.preferPython ?? isPythonPreviewQuestion(userLine);
  const preferStatic =
    opts?.preferStatic ??
    (!preferPython && /页面|html|登录|register|静态|界面|效果/i.test(userLine));
  const res = await api.workspaceStartPreview({
    hint,
    preferStatic,
    preferPython,
    entryRel: opts?.entryRel,
  });
  let displayText = formatPreviewAssistantReply(res);
  if (res.ok && res.url) {
    if (res.kind === "python") {
      await openExternalUrl(`${res.url.replace(/\/$/, "")}/health`);
    } else {
      await openExternalUrl(res.url);
    }
  } else if (res.error && /未知 RPC|workspace:startPreview/i.test(res.error)) {
    return {
      ok: false,
      displayText:
        "【项目预览】Bridge 未加载预览接口（`workspace:startPreview`）。\n\n请 **Ctrl+C** 后重新运行 `npm run web:dev:full`，再点击「浏览器预览」。",
      url: null,
      error: res.error,
    };
  }
  return {
    ok: Boolean(res.ok && res.url),
    displayText,
    url: res.url,
    error: res.error,
  };
}

export function isStopPreviewMessage(text: string): boolean {
  const t = text.trim();
  return /^(?:停止预览|关闭预览|\/preview-stop)\s*[!！。.]*$/iu.test(t);
}

export async function performStopPreview(api: DesktopApi): Promise<string> {
  if (!api.workspaceStopPreview) {
    return "【项目预览】当前 Bridge 不支持停止预览。";
  }
  await api.workspaceStopPreview();
  return "【项目预览】已停止本地静态预览服务。";
}
