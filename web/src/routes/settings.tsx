import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  Save,
  Download,
  Sparkles,
  ShieldCheck,
  GitBranch,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { ClaudeHooksPanel } from "@/components/claude-hooks-panel";
import { InfoHint } from "@/components/info-hint";
import { chatSettingsPreservePayload } from "@/lib/model-catalog";
import { ModelsConnectionsPanel } from "@/components/models-connections-panel";
import { PageRoot, SettingsLayout, SettingsNavItem } from "@/components/page-layout";
import { useDesktopReady, useHasDesktop } from "@/hooks/use-desktop-ready";
import { getDesktop, isWebBridge } from "@/lib/desktop-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "应用设置 · 本地代码助手" }] }),
  component: SettingsPage,
});

function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("page-section", className)}>
      <div className="page-section-header">
        <h3 className="text-[13.5px] font-semibold tracking-tight text-foreground">{title}</h3>
        {hint && <InfoHint>{hint}</InfoHint>}
      </div>
      {children}
    </section>
  );
}

function SettingsOverview({
  workspacePath,
  orchestrationMode,
  modelLabel,
  activeTab,
}: {
  workspacePath: string;
  orchestrationMode: "claude-code" | "local-mcp";
  modelLabel: string;
  activeTab: "general" | "models" | "advanced";
}) {
  const wsShort =
    workspacePath.length > 48 ? `…${workspacePath.slice(-44)}` : workspacePath;
  const tabHint: Record<typeof activeTab, string> = {
    general: "配置聊天「确认写入」的默认落盘路径。工作区在侧栏「工作目录」修改。",
    models: "管理云 API 供应商与本机 Ollama；本地模型须测试连接后点击添加，聊天页与此列表同步。",
    advanced: "GitHub 源码同步、Agent OS 诊断；MCP 工具在侧栏「MCP 服务器」管理。",
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2.5 shadow-xs">
          <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">工作区</div>
          <div className="mt-0.5 truncate font-mono text-[11.5px] text-foreground" title={workspacePath}>
            {wsShort}
          </div>
          <div className="mt-1 text-[10.5px] text-muted-foreground">侧栏 · 工作目录</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2.5 shadow-xs">
          <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">编排</div>
          <div className="mt-0.5 text-[13px] font-semibold text-foreground">
            {orchestrationMode === "local-mcp" ? "本地 Ollama + MCP" : "Claude Code"}
          </div>
          <div className="mt-1 text-[10.5px] text-muted-foreground">聊天页切换</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2.5 shadow-xs">
          <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">默认模型</div>
          <div className="mt-0.5 truncate font-mono text-[12px] font-semibold text-foreground">{modelLabel}</div>
          <div className="mt-1 text-[10.5px] text-muted-foreground">模型与连接 Tab</div>
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">{tabHint[activeTab]}</p>
    </div>
  );
}

function SettingsPage() {
  const desktopReady = useDesktopReady();
  const desktop = useHasDesktop();
  const [workspacePath, setWorkspacePath] = useState("(未载入)");
  const [modelSelect, setModelSelect] = useState("");
  const [orchestrationModeSelect, setOrchestrationModeSelect] = useState<"claude-code" | "local-mcp">(
    "claude-code",
  );
  const [hint, setHint] = useState("");
  /** 一键「确认写入」时，无可用 workspace-write 块则写入此相对路径 */
  const [defaultConfirmWritePathInput, setDefaultConfirmWritePathInput] = useState("docs/prd.md");
  /** 本地 MCP：mcpServers JSON 绝对路径；空则 ~/.claude/config.json → mcp.json */
  const [mcpConfigAbsolutePathInput, setMcpConfigAbsolutePathInput] = useState("");
  /** 与主进程编排详细日志会话开关对齐（勿依赖打包内置 DEBUG） */
  const [devMcpOrchDebug, setDevMcpOrchDebug] = useState(false);
  const [agentOsRuntimeVer, setAgentOsRuntimeVer] = useState<string>("");
  const [agentOsBusy, setAgentOsBusy] = useState<"meta" | "quality" | null>(null);
  const [settingsTab, setSettingsTab] = useState<"general" | "models" | "advanced">("general");

  const refreshWorkspace = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const p = await api.getWorkspace();
    setWorkspacePath(p && p.trim() ? p.trim() : "（尚未选择）");
  }, []);

  const refreshSettingsSummary = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const s = await api.getChatSettings();
    setModelSelect(s.model || "");
    setOrchestrationModeSelect(s.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code");
    setMcpConfigAbsolutePathInput(s.mcpConfigAbsolutePath?.trim() ?? "");
    setDevMcpOrchDebug(s.devMcpOrchDebug === true);
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshWorkspace();
      const api = getDesktop();
      if (!api) return;
      const s = await api.getChatSettings();
      setOrchestrationModeSelect(s.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code");
      setDefaultConfirmWritePathInput(s.defaultConfirmWritePath?.trim() || "docs/prd.md");
      setModelSelect(s.model || "");
      setMcpConfigAbsolutePathInput(s.mcpConfigAbsolutePath?.trim() ?? "");
      setDevMcpOrchDebug(s.devMcpOrchDebug === true);
      setHint("");
    })();
  }, [refreshWorkspace]);

  useEffect(() => {
    const api = getDesktop();
    if (!api?.onWorkspaceChanged) return;
    return api.onWorkspaceChanged(() => void refreshWorkspace());
  }, [refreshWorkspace]);

  const saveGeneralSettings = async () => {
    const api = getDesktop();
    if (!api) return;
    const s = await api.getChatSettings();
    await api.saveChatSettings({
      ...chatSettingsPreservePayload(s),
      defaultConfirmWritePath: defaultConfirmWritePathInput.trim() || "docs/prd.md",
    });
    setHint("已保存：一键确认写入默认路径。");
  };

  const persistDevMcpOrchDebug = async (checked: boolean) => {
    const api = getDesktop();
    if (!api) return;
    setDevMcpOrchDebug(checked);
    const s = await api.getChatSettings();
    await api.saveChatSettings({
      ...chatSettingsPreservePayload(s),
      devMcpOrchDebug: checked,
    });
    toast.success(checked ? "已开启编排调试日志（仅本会话级标志）" : "已关闭编排调试日志");
  };

  const runAgentOsMeta = async () => {
    const api = getDesktop();
    if (!api?.agentOsMetaAnalyze) {
      toast.error("当前环境未暴露 Agent OS 接口，请更新桌面应用。");
      return;
    }
    setAgentOsBusy("meta");
    try {
      const r = await api.agentOsMetaAnalyze();
      const ok = (r as { ok?: boolean }).ok !== false;
      if (ok) toast.success("Meta 分析已完成（结果见控制台或日志）。");
      else toast.error(String((r as { error?: string }).error || "Meta 分析失败"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setAgentOsBusy(null);
    }
  };

  const runAgentOsQuality = async () => {
    const api = getDesktop();
    if (!api?.agentOsQualityReport) {
      toast.error("当前环境未暴露质量报告接口，请更新桌面应用。");
      return;
    }
    setAgentOsBusy("quality");
    try {
      const r = await api.agentOsQualityReport();
      if (r.ok && typeof r.report === "string" && r.report.trim()) {
        toast.success("质量报告已生成。");
      } else {
        toast.error(String(r.error || "未能生成质量报告"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setAgentOsBusy(null);
    }
  };

  useEffect(() => {
    if (!desktop) return;
    void (async () => {
      const api = getDesktop();
      if (!api?.agentOsRuntimeVersion) return;
      const r = await api.agentOsRuntimeVersion();
      setAgentOsRuntimeVer(r.ok && r.version ? r.version : "—");
    })();
  }, [desktop]);

  return (
    <AppShell>
      <PageRoot>
        <PageHeader
          title="应用设置"
          description={
            settingsTab === "general"
              ? "聊天落盘与其它通用偏好"
              : settingsTab === "models"
                ? "已添加的云模型与本地 Ollama"
                : "GitHub 同步、Agent OS 与 Hooks"
          }
        />
        <SettingsLayout
          nav={
            <>
              <SettingsNavItem active={settingsTab === "general"} onClick={() => setSettingsTab("general")}>
                通用
              </SettingsNavItem>
              <SettingsNavItem active={settingsTab === "models"} onClick={() => setSettingsTab("models")}>
                模型与连接
              </SettingsNavItem>
              <SettingsNavItem active={settingsTab === "advanced"} onClick={() => setSettingsTab("advanced")}>
                编排与高级
              </SettingsNavItem>
            </>
          }
        >
          {settingsTab === "general" ? (
            <SettingsOverview
              workspacePath={workspacePath}
              orchestrationMode={orchestrationModeSelect}
              modelLabel={modelSelect || "—"}
              activeTab={settingsTab}
            />
          ) : null}

          {desktopReady && !desktop && (
            <p className="rounded-lg border border-border bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
              未检测到桌面 API。请运行 npm run web:dev:full 并刷新本页。
            </p>
          )}
          {hint ? (
            <p className="rounded-lg border border-border bg-primary-soft/30 px-3 py-2 text-[12.5px] text-foreground">
              {hint}
            </p>
          ) : null}

          {settingsTab === "general" ? (
            <div className="max-w-xl space-y-4">
              <Section
                title="一键确认写入"
                hint="用户说「确认写入」且回复中无 workspace-write 块时，写入此相对路径。"
              >
                <label className="block text-[12px] text-muted-foreground" htmlFor="default-confirm-write-path">
                  默认相对路径
                </label>
                <input
                  id="default-confirm-write-path"
                  type="text"
                  value={defaultConfirmWritePathInput}
                  onChange={(e) => setDefaultConfirmWritePathInput(e.target.value)}
                  disabled={!desktop}
                  placeholder="docs/prd.md"
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                />
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  产品经理、项目经理等角色须用户在聊天中确认；其它 Agent 可自动落盘。
                </p>
                <button
                  type="button"
                  onClick={() => void saveGeneralSettings()}
                  disabled={!desktop}
                  className="btn-gradient-primary mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" /> 保存
                </button>
              </Section>

              {desktopReady && desktop && isWebBridge() && (
                <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  Web Bridge：设置保存在项目内{" "}
                  <code className="font-mono text-[11px]">.claudecode/workbench.db</code>。
                </div>
              )}
            </div>
          ) : null}

          {settingsTab === "models" ? (
            <ModelsConnectionsPanel onSettingsUpdated={() => void refreshSettingsSummary()} />
          ) : null}

          {settingsTab === "advanced" ? (
            <SettingsAdvancedTab
              desktop={desktop}
              devMcpOrchDebug={devMcpOrchDebug}
              agentOsRuntimeVer={agentOsRuntimeVer}
              agentOsBusy={agentOsBusy}
              onDevMcpOrchDebugChange={(checked) => void persistDevMcpOrchDebug(checked)}
              onAgentOsMeta={() => void runAgentOsMeta()}
              onAgentOsQuality={() => void runAgentOsQuality()}
            />
          ) : null}
        </SettingsLayout>
      </PageRoot>
    </AppShell>
  );
}

function SettingsAdvancedTab({
  desktop,
  devMcpOrchDebug,
  agentOsRuntimeVer,
  agentOsBusy,
  onDevMcpOrchDebugChange,
  onAgentOsMeta,
  onAgentOsQuality,
}: {
  desktop: boolean;
  devMcpOrchDebug: boolean;
  agentOsRuntimeVer: string;
  agentOsBusy: "meta" | "quality" | null;
  onDevMcpOrchDebugChange: (checked: boolean) => void;
  onAgentOsMeta: () => void;
  onAgentOsQuality: () => void;
}) {
  const [personalGithubRepo, setPersonalGithubRepo] = useState("");
  const [upstreamGithubRepo, setUpstreamGithubRepo] = useState("https://github.com/anthropics/claude-code.git");
  const [clearConfigOnPush, setClearConfigOnPush] = useState(true);
  const [gitBusy, setGitBusy] = useState<"pull" | "push" | "save" | null>(null);
  const [gitLog, setGitLog] = useState("");
  const [gitStatus, setGitStatus] = useState<Awaited<
    ReturnType<NonNullable<ReturnType<typeof getDesktop>>["workbenchGitStatus"]>
  > | null>(null);

  const refreshGitStatus = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workbenchGitStatus) return;
    const r = await api.workbenchGitStatus();
    setGitStatus(r);
  }, []);

  useEffect(() => {
    const api = getDesktop();
    if (!api || !desktop) return;
    void api.getChatSettings().then((s) => {
      setPersonalGithubRepo(s.personalGithubRepo?.trim() ?? "");
      setUpstreamGithubRepo(
        s.upstreamGithubRepo?.trim() || "https://github.com/anthropics/claude-code.git",
      );
    });
    void refreshGitStatus();
  }, [desktop, refreshGitStatus]);

  const saveGithubSettings = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitSaveGithubSettings) return;
    setGitBusy("save");
    try {
      await api.workbenchGitSaveGithubSettings({
        personalGithubRepo: personalGithubRepo.trim(),
        upstreamGithubRepo: upstreamGithubRepo.trim(),
      });
      setGitLog("已保存 GitHub 仓库配置。");
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  const pullFromGithub = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitPullUpstream) return;
    setGitBusy("pull");
    setGitLog("");
    try {
      const r = await api.workbenchGitPullUpstream({
        upstreamGithubRepo: upstreamGithubRepo.trim() || undefined,
      });
      setGitLog(r.combined || r.error || (r.ok ? `已同步：${r.headLine ?? ""}` : "拉取失败"));
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  const pushToPersonal = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitPushPersonal) return;
    if (!personalGithubRepo.trim()) {
      setGitLog("请先填写并保存个人 GitHub 仓库地址。");
      return;
    }
    setGitBusy("push");
    setGitLog("");
    try {
      await api.workbenchGitSaveGithubSettings({
        personalGithubRepo: personalGithubRepo.trim(),
        upstreamGithubRepo: upstreamGithubRepo.trim(),
      });
      const r = await api.workbenchGitPushPersonal({
        clearPersonalConfig: clearConfigOnPush,
        personalGithubRepo: personalGithubRepo.trim(),
      });
      const msg = r.combined || r.error || (r.ok ? "推送完成" : "推送失败");
      setGitLog(
        r.clearedConfig ? `${msg}\n（已清空本地模型/会话/工作区历史等配置）` : msg,
      );
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        同步官方 Claude Code 的插件、命令与 Hooks 逻辑；你的模型、会话、
        <code className="font-mono text-[11px]">server/</code>、
        <code className="font-mono text-[11px]">web/</code>、
        <code className="font-mono text-[11px]">.claudecode/</code> 等工作台配置不会被覆盖。推送仅到个人 fork。
      </p>

      <Section
        title="源码仓库（GitHub）"
        hint="按路径同步官方逻辑；push 到个人 fork，可选推送前清空工作台配置。"
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
              个人 GitHub 仓库（push 目标）
            </label>
            <input
              value={personalGithubRepo}
              onChange={(e) => setPersonalGithubRepo(e.target.value)}
              disabled={!desktop}
              placeholder="https://github.com/你的用户名/claudecode.git"
              spellCheck={false}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
              官方 upstream（pull 来源）
            </label>
            <input
              value={upstreamGithubRepo}
              onChange={(e) => setUpstreamGithubRepo(e.target.value)}
              disabled={!desktop}
              spellCheck={false}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!desktop || gitBusy !== null}
              onClick={() => void saveGithubSettings()}
              className="btn-row"
            >
              <Save className="h-3.5 w-3.5" /> {gitBusy === "save" ? "保存中…" : "保存仓库配置"}
            </button>
          </div>

          {gitStatus?.ok ? (
            <div className="rounded-lg border border-border/80 bg-secondary/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <div>
                分支 <span className="font-mono text-foreground">{gitStatus.branch}</span>
                {gitStatus.dirty ? (
                  <span className="ml-2 text-muted-foreground">· 有本地改动（不影响同步官方逻辑）</span>
                ) : (
                  <span className="ml-2 text-success">· 工作区干净</span>
                )}
              </div>
              {gitStatus.syncScopeNote ? (
                <div className="mt-0.5">{gitStatus.syncScopeNote}</div>
              ) : null}
              {gitStatus.originUrl ? (
                <div className="mt-0.5 truncate font-mono" title={gitStatus.originUrl}>
                  origin → {gitStatus.originUrl}
                </div>
              ) : null}
            </div>
          ) : gitStatus?.error ? (
            <div className="text-[11.5px] text-destructive">
              <p>{gitStatus.error}</p>
              {gitStatus.error.includes("未知 RPC") ? (
                <p className="mt-1 text-muted-foreground">
                  Bridge 未加载最新接口：请重启 <code className="font-mono text-[11px]">npm run web:dev:full</code>
                  ，或稍等 Bridge 自动重启后点「刷新 Git 状态」。
                </p>
              ) : null}
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
            <input
              type="checkbox"
              checked={clearConfigOnPush}
              disabled={!desktop}
              onChange={(e) => setClearConfigOnPush(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <span className="text-[12.5px] leading-snug">
              <span className="font-medium text-foreground">推送前清空本地配置</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                清空已添加模型/供应商、对话会话、工作区历史等（保留 GitHub 地址与本机 CLI 自动检测）
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!desktop || gitBusy !== null}
              onClick={() => void pullFromGithub()}
              className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-40"
            >
              <Download className={cn("h-3.5 w-3.5", gitBusy === "pull" && "animate-pulse")} />
              {gitBusy === "pull" ? "同步中…" : "同步官方插件与逻辑"}
            </button>
            <button
              type="button"
              disabled={!desktop || gitBusy !== null || !personalGithubRepo.trim()}
              onClick={() => void pushToPersonal()}
              className="btn-row"
            >
              <Upload className={cn("h-3.5 w-3.5", gitBusy === "push" && "animate-pulse")} />
              {gitBusy === "push" ? "推送中…" : "推送到个人仓库"}
            </button>
            <button
              type="button"
              disabled={!desktop || gitBusy !== null}
              onClick={() => void refreshGitStatus()}
              className="btn-row"
            >
              <GitBranch className="h-3.5 w-3.5" /> 刷新 Git 状态
            </button>
          </div>

          {gitLog ? (
            <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-code-bg/80 p-2 font-mono text-[10.5px]">
              {gitLog}
            </pre>
          ) : null}
        </div>
      </Section>

      <Section title="诊断与调试" hint="开发排障用；正式使用通常无需改动。">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
            <input
              type="checkbox"
              checked={devMcpOrchDebug}
              disabled={!desktop}
              onChange={(e) => onDevMcpOrchDebugChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <span className="text-[12.5px] leading-snug">
              <span className="font-medium text-foreground">本地 MCP 编排详细日志</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">输出 [MCP:loop] 级调试信息</span>
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-secondary/20 px-3 py-2">
            <span className="text-[11.5px] text-muted-foreground">
              Agent OS{" "}
              <span className="font-mono font-medium text-foreground">{agentOsRuntimeVer || "—"}</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!desktop || agentOsBusy !== null}
                onClick={onAgentOsMeta}
                className="btn-row text-[11.5px]"
              >
                <Sparkles className="h-3 w-3" />
                {agentOsBusy === "meta" ? "分析中…" : "Meta 分析"}
              </button>
              <button
                type="button"
                disabled={!desktop || agentOsBusy !== null}
                onClick={onAgentOsQuality}
                className="btn-row text-[11.5px]"
              >
                <ShieldCheck className="h-3 w-3" />
                {agentOsBusy === "quality" ? "生成中…" : "质量报告"}
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Claude Hooks" hint="只读；编辑请在 Claude Code 的 settings.json 完成。">
        <ClaudeHooksPanel compact />
      </Section>
    </div>
  );
}
