import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageBanner } from "@/components/page-layout";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { useHasDesktop } from "@/hooks/use-desktop-ready";

type HookSummary = {
  event: string;
  matcherCount: number;
  sampleCommands: string[];
};

const HOOK_EVENT_REF = [
  { id: "PreToolUse", desc: "工具调用前，可拦截危险操作" },
  { id: "PostToolUse", desc: "工具调用后，常用于格式化/测试" },
  { id: "UserPromptSubmit", desc: "用户提交提示前" },
  { id: "Stop", desc: "模型完成回复时" },
  { id: "SessionStart", desc: "会话开始时" },
  { id: "PostToolUseFailure", desc: "工具调用失败时" },
];

function summarizeHooks(hooks: unknown): HookSummary[] {
  if (!hooks || typeof hooks !== "object") return [];
  const out: HookSummary[] = [];
  for (const [event, raw] of Object.entries(hooks as Record<string, unknown>)) {
    const groups = Array.isArray(raw) ? raw : [];
    const sampleCommands: string[] = [];
    for (const g of groups) {
      if (!g || typeof g !== "object") continue;
      const handlers = Array.isArray((g as { hooks?: unknown }).hooks)
        ? (g as { hooks: unknown[] }).hooks
        : [];
      for (const h of handlers) {
        if (h && typeof h === "object" && "command" in h) {
          const cmd = String((h as { command?: unknown }).command ?? "").trim();
          if (cmd) sampleCommands.push(cmd.slice(0, 100));
        }
      }
    }
    out.push({ event, matcherCount: groups.length, sampleCommands: sampleCommands.slice(0, 2) });
  }
  return out.sort((a, b) => a.event.localeCompare(b.event));
}

/** 只读展示 ~/.claude/settings.json 顶层 hooks（配置请在 Claude Code 侧编辑）。 */
export function ClaudeHooksPanel({ compact = false }: { compact?: boolean }) {
  const hasDesktopApi = useHasDesktop();
  const [settingsHooksJson, setSettingsHooksJson] = useState<string | null>(null);
  const [settingsHooksRaw, setSettingsHooksRaw] = useState<unknown>(undefined);
  const [settingsHooksErr, setSettingsHooksErr] = useState<string | null>(null);
  const [settingsMissing, setSettingsMissing] = useState(false);
  const [hooksLoading, setHooksLoading] = useState(false);

  const loadHooks = useCallback(async () => {
    const api = getDesktop();
    if (!api?.readClaudeConfigJson) return;
    setHooksLoading(true);
    setSettingsHooksErr(null);
    const r = await api.readClaudeConfigJson("settings.json");
    setHooksLoading(false);
    if (!r.ok) {
      setSettingsHooksErr(r.error ?? "读取失败");
      setSettingsHooksJson(null);
      setSettingsHooksRaw(undefined);
      setSettingsMissing(false);
      return;
    }
    if (r.missing) {
      setSettingsMissing(true);
      setSettingsHooksJson(null);
      setSettingsHooksRaw(undefined);
      return;
    }
    setSettingsMissing(false);
    const h =
      r.data && typeof r.data === "object" && r.data !== null && "hooks" in r.data
        ? (r.data as { hooks?: unknown }).hooks
        : undefined;
    setSettingsHooksRaw(h);
    try {
      setSettingsHooksJson(
        h !== undefined ? JSON.stringify(h, null, 2) : "// settings.json 中尚无顶层 hooks 字段",
      );
    } catch {
      setSettingsHooksErr("无法序列化 hooks");
    }
  }, []);

  useEffect(() => {
    if (!hasDesktopApi) return;
    void loadHooks();
  }, [hasDesktopApi, loadHooks]);

  const hookSummaries = useMemo(() => summarizeHooks(settingsHooksRaw), [settingsHooksRaw]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-muted-foreground", compact ? "text-[11.5px]" : "text-[12px]")}>
          {compact ? (
            <>
              读取{" "}
              <code className="rounded bg-code-bg px-1 font-mono text-[10.5px]">~/.claude/settings.json</code>{" "}
              中的 hooks。
            </>
          ) : (
            <>
              用户级配置：
              <code className="mx-1 rounded bg-code-bg px-1 font-mono text-[11px]">~/.claude/settings.json</code>
              顶层 <code className="rounded bg-code-bg px-1 font-mono text-[11px]">hooks</code>。编辑请在 Claude Code
              配置侧完成，此处仅只读查看。
            </>
          )}{" "}
          <a
            href="https://code.claude.com/docs/en/hooks"
            className="text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            官方文档
          </a>
        </p>
        <button
          type="button"
          disabled={!hasDesktopApi || hooksLoading}
          onClick={() => void loadHooks()}
          className="btn-row shrink-0"
        >
          <RefreshCw className={cn("h-3 w-3", hooksLoading && "animate-spin")} /> 刷新
        </button>
      </div>

      {settingsHooksErr && (
        <PageBanner className="border-destructive/30 bg-destructive/10 text-destructive">{settingsHooksErr}</PageBanner>
      )}
      {settingsMissing && !settingsHooksErr && (
        <PageBanner>尚未创建 settings.json，或其中没有 hooks 字段。</PageBanner>
      )}

      {hookSummaries.length > 0 && (
        <div className={cn("grid gap-2", compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
          {hookSummaries.map((h) => (
            <div key={h.event} className="rounded-lg border border-border bg-surface px-3 py-2">
              <div className="font-mono text-[11.5px] font-semibold text-primary">{h.event}</div>
              <div className="mt-0.5 text-[10.5px] text-muted-foreground">{h.matcherCount} 组 matcher</div>
              {!compact &&
                h.sampleCommands.map((c, i) => (
                  <div key={i} className="mt-1 truncate font-mono text-[10px] text-foreground/80" title={c}>
                    {c}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {!settingsHooksErr && !settingsMissing && settingsHooksJson !== null && (
        <details className="rounded-lg border border-border bg-surface-elevated/40">
          <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium">原始 hooks JSON</summary>
          <pre className="max-h-[min(320px,40vh)] overflow-auto whitespace-pre-wrap break-words border-t border-border p-3 font-mono text-[11px] leading-relaxed">
            {settingsHooksJson}
          </pre>
        </details>
      )}

      {!compact ? (
        <div>
          <div className="mb-2 text-[12px] font-medium text-foreground">常见事件参考</div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {HOOK_EVENT_REF.map((ev) => (
              <li key={ev.id} className="rounded-md border border-border/60 bg-surface px-2.5 py-1.5 text-[11px]">
                <code className="text-primary">{ev.id}</code>
                <span className="text-muted-foreground"> — {ev.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <details className="rounded-lg border border-border/70 bg-surface/50">
          <summary className="cursor-pointer px-3 py-2 text-[11.5px] font-medium text-muted-foreground">
            常见 Hook 事件说明
          </summary>
          <ul className="space-y-1 border-t border-border px-3 py-2">
            {HOOK_EVENT_REF.map((ev) => (
              <li key={ev.id} className="text-[11px]">
                <code className="text-primary">{ev.id}</code>
                <span className="text-muted-foreground"> — {ev.desc}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
