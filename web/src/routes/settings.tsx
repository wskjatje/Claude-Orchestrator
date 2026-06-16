import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Save, Download, Upload, RefreshCw, GitBranch, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { InfoHint } from "@/components/info-hint";
import { chatSettingsPreservePayload } from "@/lib/model-catalog";
import { ModelsConnectionsPanel } from "@/components/models-connections-panel";
import { PageRoot, SettingsLayout, SettingsNavItem } from "@/components/page-layout";
import { useDesktopReady, useHasDesktop } from "@/hooks/use-desktop-ready";
import { getDesktop, isWebBridge } from "@/lib/desktop-api";
import { cn } from "@/lib/utils";
import {
  CONFIRM_WRITE_FOOTER,
  CONFIRM_WRITE_SECTION_HINT,
  GIT_PUSH_HINT,
  GIT_PUSH_HINT_DETAIL,
  PAGE_DESC,
  SETTINGS_SAVED_PROJECT,
  SETTINGS_TAB_HINT,
  WORKSPACE_API_MISSING,
} from "@/lib/ui-copy";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "应用设置 · Claude Orchestrator" }] }),
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
  const tabHint = SETTINGS_TAB_HINT;

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

  return (
    <AppShell>
      <PageRoot>
        <PageHeader
          title="应用设置"
          description={
            settingsTab === "general"
              ? PAGE_DESC.settings.general
              : settingsTab === "models"
                ? PAGE_DESC.settings.models
                : PAGE_DESC.settings.advanced
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
              {WORKSPACE_API_MISSING}
            </p>
          )}
          {hint ? (
            <p className="rounded-lg border border-border bg-primary-soft/30 px-3 py-2 text-[12.5px] text-foreground">
              {hint}
            </p>
          ) : null}

          {settingsTab === "general" ? (
            <div className="max-w-xl space-y-4">
              <Section title="一键确认写入" hint={CONFIRM_WRITE_SECTION_HINT}>
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
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{CONFIRM_WRITE_FOOTER}</p>
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
                  {SETTINGS_SAVED_PROJECT}
                </div>
              )}
            </div>
          ) : null}

          {settingsTab === "models" ? (
            <ModelsConnectionsPanel onSettingsUpdated={() => void refreshSettingsSummary()} />
          ) : null}

          {settingsTab === "advanced" ? <SettingsAdvancedTab desktop={desktop} /> : null}
        </SettingsLayout>
      </PageRoot>
    </AppShell>
  );
}

function SettingsAdvancedTab({ desktop }: { desktop: boolean }) {
  function briefGitError(error?: string, fallback = "操作失败") {
    const line = error?.split("\n").find((l) => l.trim())?.trim();
    return line || fallback;
  }

  function gitToast(text: string, tone: "success" | "warning" | "error" = "success") {
    const opts = { duration: 2600 };
    if (tone === "error") toast.error(text, opts);
    else if (tone === "warning") toast.warning(text, opts);
    else toast.message(text, opts);
  }

  const [personalGithubRepo, setPersonalGithubRepo] = useState("");
  const [gitUserName, setGitUserName] = useState("");
  const [gitUserEmail, setGitUserEmail] = useState("");
  const [upstreamGithubRepo, setUpstreamGithubRepo] = useState("https://github.com/anthropics/claude-code.git");
  const [pushReason, setPushReason] = useState("");
  const [gitBusy, setGitBusy] = useState<"pull" | "pullPersonal" | "push" | "save" | "checkUpstream" | null>(null);
  const [gitStatus, setGitStatus] = useState<Awaited<
    ReturnType<NonNullable<ReturnType<typeof getDesktop>>["workbenchGitStatus"]>
  > | null>(null);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  const refreshGitStatus = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workbenchGitStatus) return;
    const r = await api.workbenchGitStatus();
    setGitStatus(r);
  }, []);

  useEffect(() => {
    const api = getDesktop();
    if (!api || !desktop) return;
    void (async () => {
      const s = await api.getChatSettings();
      setPersonalGithubRepo(s.personalGithubRepo?.trim() ?? "");
      setGitUserName(s.gitUserName?.trim() ?? "");
      setGitUserEmail(s.gitUserEmail?.trim() ?? "");
      setUpstreamGithubRepo(
        s.upstreamGithubRepo?.trim() || "https://github.com/anthropics/claude-code.git",
      );
      if (api.workbenchGitStatus) {
        const st = await api.workbenchGitStatus();
        setGitStatus(st);
        if (!s.gitUserName?.trim() && st.gitUserName) setGitUserName(st.gitUserName);
        if (!s.gitUserEmail?.trim() && st.gitUserEmail) setGitUserEmail(st.gitUserEmail);
      }
      const configured =
        Boolean(s.personalGithubRepo?.trim()) &&
        Boolean(s.gitUserName?.trim()) &&
        Boolean(s.gitUserEmail?.trim());
      setConfigDrawerOpen(!configured);
    })();
  }, [desktop]);

  const githubSettingsPayload = () => ({
    personalGithubRepo: personalGithubRepo.trim(),
    gitUserName: gitUserName.trim(),
    gitUserEmail: gitUserEmail.trim(),
    upstreamGithubRepo: upstreamGithubRepo.trim(),
  });

  const saveGithubSettings = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitSaveGithubSettings) return;
    setGitBusy("save");
    try {
      await api.workbenchGitSaveGithubSettings(githubSettingsPayload());
      gitToast("已保存。");
      if (personalGithubRepo.trim() && gitUserName.trim() && gitUserEmail.trim()) {
        setConfigDrawerOpen(false);
      }
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  const checkUpstreamUpdates = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitCheckUpstream) return;
    setGitBusy("checkUpstream");
    try {
      const r = await api.workbenchGitCheckUpstream({
        upstreamGithubRepo: upstreamGithubRepo.trim() || undefined,
      });
      if (!r.ok) {
        gitToast(briefGitError(r.error, "检测失败"), "error");
        return;
      }
      gitToast(
        r.hasUpdates ? "官方可能有更新，可同步。" : "已与官方最新一致。",
        r.hasUpdates ? "warning" : "success",
      );
    } finally {
      setGitBusy(null);
    }
  };

  const pullFromGithub = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitPullUpstream) return;
    setGitBusy("pull");
    try {
      const r = await api.workbenchGitPullUpstream({
        upstreamGithubRepo: upstreamGithubRepo.trim() || undefined,
      });
      if (!r.ok) {
        gitToast(briefGitError(r.error, "同步失败"), "error");
        return;
      }
      gitToast("同步成功。");
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  const pullFromPersonal = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitPullPersonal) return;
    if (!personalGithubRepo.trim()) {
      gitToast("请先配置个人仓库。", "error");
      setConfigDrawerOpen(true);
      return;
    }
    if (!gitUserName.trim() || !gitUserEmail.trim()) {
      gitToast("请先填写 Git 身份。", "error");
      setConfigDrawerOpen(true);
      return;
    }
    setGitBusy("pullPersonal");
    try {
      await api.workbenchGitSaveGithubSettings(githubSettingsPayload());
      const r = await api.workbenchGitPullPersonal({
        personalGithubRepo: personalGithubRepo.trim(),
      });
      gitToast(r.ok ? "拉取成功。" : briefGitError(r.error, "拉取失败"), r.ok ? "success" : "error");
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  const pushToPersonal = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitPushPersonal) return;
    if (!personalGithubRepo.trim()) {
      gitToast("请先配置个人仓库。", "error");
      setConfigDrawerOpen(true);
      return;
    }
    if (!gitUserName.trim() || !gitUserEmail.trim()) {
      gitToast("请先填写 Git 身份。", "error");
      setConfigDrawerOpen(true);
      return;
    }
    const reason = pushReason.trim();
    if (!reason) {
      gitToast("请填写推送说明。", "error");
      return;
    }
    setGitBusy("push");
    try {
      await api.workbenchGitSaveGithubSettings(githubSettingsPayload());
      const r = await api.workbenchGitPushPersonal({
        reason,
        personalGithubRepo: personalGithubRepo.trim(),
      });
      if (!r.ok) {
        gitToast(briefGitError(r.error, "推送失败"), "error");
        return;
      }
      if (r.nothingToCommit) {
        gitToast("已与远程一致，无需推送。");
      } else {
        gitToast("推送成功。");
      }
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  const personalRepoShort = personalGithubRepo.trim().replace(/^https:\/\/github\.com\//, "") || "未配置";

  return (
    <>
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <Section title="GitHub 同步">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 shadow-xs">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[12px] text-foreground">{personalRepoShort}</p>
              {gitStatus?.ok ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px]">
                    <GitBranch className="h-3 w-3" />
                    {gitStatus.branch || "—"}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px]",
                      gitStatus.dirty ? "bg-warning/10 text-warning" : "bg-success/10 text-success",
                    )}
                  >
                    {gitStatus.dirty ? "有改动" : "干净"}
                  </span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!desktop}
              onClick={() => setConfigDrawerOpen(true)}
              className="btn-row shrink-0"
            >
              <Settings className="h-3.5 w-3.5" /> 仓库配置
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-surface-elevated p-4 shadow-xs">
            <p className="mb-3 text-[13px] font-semibold text-foreground">官方 Claude Code</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!desktop || gitBusy !== null}
                onClick={() => void checkUpstreamUpdates()}
                className="btn-row"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", gitBusy === "checkUpstream" && "animate-spin")} />
                {gitBusy === "checkUpstream" ? "检测中…" : "检测官方更新"}
              </button>
              <button
                type="button"
                disabled={!desktop || gitBusy !== null}
                onClick={() => void pullFromGithub()}
                className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-40"
              >
                <Download className={cn("h-3.5 w-3.5", gitBusy === "pull" && "animate-pulse")} />
                {gitBusy === "pull" ? "同步中…" : "同步官方"}
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-surface-elevated p-4 shadow-xs">
            <p className="mb-3 text-[13px] font-semibold text-foreground">个人仓库</p>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-medium text-foreground/80">推送说明</span>
              <textarea
                value={pushReason}
                onChange={(e) => setPushReason(e.target.value)}
                disabled={!desktop}
                placeholder="本次推送做了什么"
                rows={2}
                spellCheck={false}
                className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
              />
            </label>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!desktop || gitBusy !== null || !personalGithubRepo.trim() || !gitUserName.trim() || !gitUserEmail.trim()}
                  onClick={() => void pullFromPersonal()}
                  className="btn-row"
                >
                  <Download className={cn("h-3.5 w-3.5", gitBusy === "pullPersonal" && "animate-pulse")} />
                  {gitBusy === "pullPersonal" ? "拉取中…" : "拉取"}
                </button>
                <button
                  type="button"
                  disabled={
                    !desktop ||
                    gitBusy !== null ||
                    !personalGithubRepo.trim() ||
                    !gitUserName.trim() ||
                    !gitUserEmail.trim() ||
                    !pushReason.trim()
                  }
                  onClick={() => void pushToPersonal()}
                  className="btn-row"
                >
                  <Upload className={cn("h-3.5 w-3.5", gitBusy === "push" && "animate-pulse")} />
                  {gitBusy === "push" ? "推送中…" : "推送"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground sm:max-w-sm sm:text-right">
                {GIT_PUSH_HINT}
                <InfoHint side="left">{GIT_PUSH_HINT_DETAIL}</InfoHint>
              </p>
            </div>
          </div>
        </Section>
      </div>

      {configDrawerOpen ? (
        <GitHubConfigDrawer
          desktop={desktop}
          gitBusy={gitBusy}
          gitUserName={gitUserName}
          gitUserEmail={gitUserEmail}
          personalGithubRepo={personalGithubRepo}
          upstreamGithubRepo={upstreamGithubRepo}
          gitStatus={gitStatus}
          onClose={() => setConfigDrawerOpen(false)}
          onGitUserNameChange={setGitUserName}
          onGitUserEmailChange={setGitUserEmail}
          onPersonalGithubRepoChange={setPersonalGithubRepo}
          onUpstreamGithubRepoChange={setUpstreamGithubRepo}
          onSave={() => void saveGithubSettings()}
        />
      ) : null}
    </>
  );
}

function GitHubConfigDrawer({
  desktop,
  gitBusy,
  gitUserName,
  gitUserEmail,
  personalGithubRepo,
  upstreamGithubRepo,
  gitStatus,
  onClose,
  onGitUserNameChange,
  onGitUserEmailChange,
  onPersonalGithubRepoChange,
  onUpstreamGithubRepoChange,
  onSave,
}: {
  desktop: boolean;
  gitBusy: string | null;
  gitUserName: string;
  gitUserEmail: string;
  personalGithubRepo: string;
  upstreamGithubRepo: string;
  gitStatus: Awaited<ReturnType<NonNullable<ReturnType<typeof getDesktop>>["workbenchGitStatus"]>> | null;
  onClose: () => void;
  onGitUserNameChange: (v: string) => void;
  onGitUserEmailChange: (v: string) => void;
  onPersonalGithubRepoChange: (v: string) => void;
  onUpstreamGithubRepoChange: (v: string) => void;
  onSave: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={onClose} />
      <div className="flex h-full max-h-screen w-full max-w-md flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[14px] font-semibold text-foreground">仓库配置</div>
            <div className="text-[11px] text-muted-foreground">个人 push / pull 与 Git 身份</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-1">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-medium text-foreground/80">Git 用户名</span>
              <input
                value={gitUserName}
                onChange={(e) => onGitUserNameChange(e.target.value)}
                disabled={!desktop}
                placeholder="GitHub 提交者名称"
                spellCheck={false}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-medium text-foreground/80">Git 邮箱</span>
              <input
                value={gitUserEmail}
                onChange={(e) => onGitUserEmailChange(e.target.value)}
                disabled={!desktop}
                placeholder="GitHub 账号邮箱"
                spellCheck={false}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-foreground/80">个人仓库 URL</span>
            <input
              value={personalGithubRepo}
              onChange={(e) => onPersonalGithubRepoChange(e.target.value)}
              disabled={!desktop}
              placeholder="https://github.com/你的用户名/repo.git"
              spellCheck={false}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-foreground/80">官方 upstream</span>
            <input
              value={upstreamGithubRepo}
              onChange={(e) => onUpstreamGithubRepoChange(e.target.value)}
              disabled={!desktop}
              spellCheck={false}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
            />
          </label>
          {gitStatus?.error ? (
            <p className="text-[11.5px] text-destructive">{gitStatus.error}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="btn-row">
            取消
          </button>
          <button
            type="button"
            disabled={!desktop || gitBusy !== null}
            onClick={onSave}
            className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" /> {gitBusy === "save" ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
