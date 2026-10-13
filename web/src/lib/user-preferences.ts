import type { DesktopApi } from "@/types/desktop";

/** 工作区用户偏好规则（每轮 alwaysApply 注入） */
export const USER_PREFERENCES_REL = ".claudecode/user-preferences.mdc";

export const USER_PREFERENCES_TEMPLATE = `---
description: 用户偏好（每轮注入；请按需改成你的习惯）
alwaysApply: true
---

# 用户偏好

以下为对本工作区 Agent 的稳定要求。未填写的条目可删除。

## 语言与沟通
- 对用户说明用简体中文；代码、路径、标识符保持原样
- 回复简洁，先结论后细节

## 编码习惯
- 优先复用项目已有模式，避免无关重构
- 不擅自扩大改动范围；不做未要求的文档/注释堆砌

## 默认技术选型
-（例：测试用 vitest / 包管理 pnpm / UI 走现有组件库）

## 禁止事项
- 不提交密钥、凭证、真实客户数据
- 不静默改 Agent/规则文件；偏好只改本文件
- 不允许兜底回答：无工具/无文件证据时，禁止声称已改文件、已打开应用、已跑通测试；缺证据就如实说明，不要编造

## 其他
-（自由补充）
`;

export function isUserPreferencesPath(relPath: string): boolean {
  const n = relPath.replace(/\\/g, "/");
  return (
    n === USER_PREFERENCES_REL ||
    n === ".cursor/rules/user-preferences.mdc" ||
    n.endsWith("/user-preferences.mdc")
  );
}

/** 若不存在则写入模板；已存在则不覆盖 */
export async function ensureUserPreferencesFile(
  api: DesktopApi | null | undefined,
): Promise<{ ok: boolean; created: boolean; error?: string }> {
  if (!api?.readWorkspaceTextFile || !api.workspaceApplyWriteFence) {
    return { ok: false, created: false, error: "工作区写接口不可用" };
  }
  try {
    const st = api.fileStat ? await api.fileStat(USER_PREFERENCES_REL) : null;
    if (st?.ok && st.exists) return { ok: true, created: false };
    const r = await api.workspaceApplyWriteFence([
      { path: USER_PREFERENCES_REL, content: USER_PREFERENCES_TEMPLATE },
    ]);
    if (!r?.ok) return { ok: false, created: false, error: r?.error || "写入失败" };
    return { ok: true, created: true };
  } catch (e) {
    return {
      ok: false,
      created: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function loadUserPreferencesText(
  api: DesktopApi | null | undefined,
): Promise<{ ok: boolean; text: string; error?: string }> {
  if (!api?.readWorkspaceTextFile) {
    return { ok: false, text: "", error: "读接口不可用" };
  }
  await ensureUserPreferencesFile(api);
  try {
    const r = await api.readWorkspaceTextFile(USER_PREFERENCES_REL);
    if (!r?.ok || typeof r.text !== "string") {
      return { ok: false, text: USER_PREFERENCES_TEMPLATE, error: r?.error || "读取失败" };
    }
    return { ok: true, text: r.text };
  } catch (e) {
    return {
      ok: false,
      text: USER_PREFERENCES_TEMPLATE,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function saveUserPreferencesText(
  api: DesktopApi | null | undefined,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!api?.workspaceApplyWriteFence) {
    return { ok: false, error: "写接口不可用" };
  }
  const body = String(text || "").trim() ? String(text) : USER_PREFERENCES_TEMPLATE;
  try {
    const r = await api.workspaceApplyWriteFence([{ path: USER_PREFERENCES_REL, content: body }]);
    if (!r?.ok) return { ok: false, error: r?.error || "保存失败" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
