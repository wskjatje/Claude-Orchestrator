import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { getDesktop } from "@/lib/desktop-api";
import { invalidateProjectRulesCache } from "@/lib/project-rules";
import {
  loadUserPreferencesText,
  saveUserPreferencesText,
  USER_PREFERENCES_REL,
  USER_PREFERENCES_TEMPLATE,
} from "@/lib/user-preferences";
import {
  DESKTOP_HYDRATING,
  LOCAL_ONLY_HINT,
  USER_PREFS_LOAD_FAILED,
} from "@/lib/ui-copy";
import { useDesktopGate } from "@/hooks/use-desktop-ready";
import { cn } from "@/lib/utils";

/**
 * 设置 · 基础：编辑工作区用户偏好（每轮注入 Agent prompt）。
 */
export function UserPreferencesPanel({ disabled }: { disabled?: boolean }) {
  const { phase } = useDesktopGate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const reload = useCallback(async () => {
    if (phase === "hydrating") {
      setLoading(true);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const api = getDesktop();
      if (phase === "offline" || !api?.readWorkspaceTextFile) {
        setText(USER_PREFERENCES_TEMPLATE);
        setDirty(false);
        setLoadError(LOCAL_ONLY_HINT);
        return;
      }
      const r = await loadUserPreferencesText(api);
      setText(r.text || USER_PREFERENCES_TEMPLATE);
      setDirty(false);
      if (!r.ok) {
        setLoadError(r.error?.trim() || USER_PREFS_LOAD_FAILED);
        if (r.error) toast.warning(r.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : USER_PREFS_LOAD_FAILED;
      setLoadError(msg);
      setText(USER_PREFERENCES_TEMPLATE);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [phase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onSave = async () => {
    const api = getDesktop();
    if (!api?.workspaceApplyWriteFence) {
      toast.error(LOCAL_ONLY_HINT);
      return;
    }
    setSaving(true);
    const r = await saveUserPreferencesText(api, text);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error || "保存失败");
      return;
    }
    invalidateProjectRulesCache();
    setDirty(false);
    setLoadError(null);
    toast.message("用户偏好已保存，下一轮对话生效");
  };

  const panelDisabled = disabled || loading || phase !== "ready";

  return (
    <section className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-medium text-foreground">用户偏好</h3>
          <details className="mt-0.5">
            <summary className="cursor-pointer text-[11px] text-muted-foreground">
              高级 · 文件位置
            </summary>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{USER_PREFERENCES_REL}</p>
          </details>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loadError ? (
            <button
              type="button"
              disabled={loading || phase === "hydrating"}
              onClick={() => void reload()}
              className="btn-row inline-flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              重试
            </button>
          ) : null}
          <button
            type="button"
            disabled={panelDisabled || saving || !dirty}
            onClick={() => void onSave()}
            className={cn("btn-row inline-flex items-center gap-1.5")}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
      {loadError ? (
        <p className="mb-2 text-[12px] text-warning" role="status">
          {loadError}
        </p>
      ) : null}
      {loading && phase === "hydrating" ? (
        <p className="mb-2 text-[12px] text-muted-foreground">{DESKTOP_HYDRATING}</p>
      ) : null}
      <p className="mb-2 text-[12px] text-muted-foreground">
        每轮对话自动注入。写清语言、编码习惯与禁止事项，Agent 会更稳定地按你的偏好执行。
      </p>
      <textarea
        value={text}
        disabled={panelDisabled}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        spellCheck={false}
        className={cn(
          "min-h-[14rem] w-full resize-y rounded-md border border-border/70 bg-background px-3 py-2",
          "font-mono text-[12px] leading-relaxed text-foreground outline-none",
          "focus:border-primary/50 disabled:opacity-50",
        )}
        aria-label="用户偏好规则"
      />
    </section>
  );
}
