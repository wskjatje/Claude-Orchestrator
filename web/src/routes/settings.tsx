import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Save, Download, Upload, RefreshCw, GitBranch, Settings, X, FolderInput } from "lucide-react";
import { toast } from "sonner";
import { InfoHint } from "@/components/info-hint";
import { RequiredMark } from "@/components/required-mark";
import { chatSettingsPreservePayload } from "@/lib/model-catalog";
import { ModelsConnectionsPanel } from "@/components/models-connections-panel";
import { DeployDialog } from "@/components/deploy-dialog";
import { PageRoot, SettingsLayout, SettingsNavItem } from "@/components/page-layout";
import { useDesktopReady, useHasDesktop } from "@/hooks/use-desktop-ready";
import { getDesktop, isWebBridge } from "@/lib/desktop-api";
import { cn } from "@/lib/utils";
import {
  CONFIRM_WRITE_FOOTER,
  CONFIRM_WRITE_SECTION_HINT,
  GIT_PUSH_HINT,
  GIT_PUSH_HINT_DETAIL,
  GIT_DEPLOY_HINT,
  GIT_PUSH_REASON_LABEL,
  GIT_PUSH_REASON_PLACEHOLDER,
  GIT_PUSH_REASON_REQUIRED,
  PAGE_DESC,
  SETTINGS_SAVED_PROJECT,
  SETTINGS_TAB_HINT,
  WORKSPACE_API_MISSING,
} from "@/lib/ui-copy";
import { formatGitErrorMessage } from "@/lib/git-error-message";

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
          <div className="mt-1 text-[10.5px] text-muted-foreground">模型配置</div>
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
  const [defaultConfirmWritePathInput, setDefaultConfirmWritePathInput] = useState("");
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
      setDefaultConfirmWritePathInput(s.defaultConfirmWritePath?.trim() || "");
      setModelSelect(s.model || "");
      setMcpConfigAbsolutePathInput(s.mcpConfigAbsolutePath?.trim() ?? "");
      setHint("");
    })();
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!desktop) return;
    void refreshWorkspace();
  }, [desktop, refreshWorkspace]);

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
      defaultConfirmWritePath: defaultConfirmWritePathInput.trim(),
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
                模型配置
              </SettingsNavItem>
              <SettingsNavItem active={settingsTab === "advanced"} onClick={() => setSettingsTab("advanced")}>
                高级
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
            <div className="max-w-2xl space-y-5">
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
    return formatGitErrorMessage(error, fallback);
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
  const [workspacePath, setWorkspacePath] = useState("");
  const [gitBusy, setGitBusy] = useState<"pull" | "pullPersonal" | "deployPersonal" | "push" | "commitBranch" | "save" | "checkUpstream" | null>(null);
  const [gitStatus, setGitStatus] = useState<Awaited<
    ReturnType<NonNullable<ReturnType<typeof getDesktop>>["workbenchGitStatus"]>
  > | null>(null);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);

  const refreshGitStatus = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workbenchGitStatus) return;
    const r = await api.workbenchGitStatus();
    setGitStatus(r);
    if (r.workspacePath) setWorkspacePath(r.workspacePath);
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
        if (st.workspacePath) setWorkspacePath(st.workspacePath);
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

  useEffect(() => {
    const api = getDesktop();
    if (!api?.onWorkspaceChanged || !desktop) return;
    return api.onWorkspaceChanged(() => {
      void refreshGitStatus();
    });
  }, [desktop, refreshGitStatus]);

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
      gitToast(
        r.ok
          ? r.deployed?.summary
            ? `拉取并部署：${r.deployed.summary}`
            : "拉取成功。"
          : briefGitError(r.error, "拉取失败"),
        r.ok ? "success" : "error",
      );
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  const deployFromRepo = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitDeployPersonal) return;
    // 先检查环境依赖
    if (api.envDeployCheck) {
      try {
        const env = await api.envDeployCheck();
        if (!env.ok) {
          // 环境有问题 → 打开部署检查对话框，让用户修复
          setDeployDialogOpen(true);
          return;
        }
      } catch {
        // 检测失败不影响部署
      }
    }
    setGitBusy("deployPersonal");
    try {
      const r = await api.workbenchGitDeployPersonal();
      gitToast(r.ok ? r.summary || "已部署到本地。" : briefGitError(r.error, "部署失败"), r.ok ? "success" : "error");
    } finally {
      setGitBusy(null);
    }
  };

  const deployFromRepoSilent = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitDeployPersonal) return;
    setGitBusy("deployPersonal");
    try {
      const r = await api.workbenchGitDeployPersonal();
      gitToast(r.ok ? r.summary || "已部署到本地。" : briefGitError(r.error, "部署失败"), r.ok ? "success" : "error");
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
      gitToast(GIT_PUSH_REASON_REQUIRED, "error");
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
      setPushReason("");
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

  const commitBranch = async () => {
    const api = getDesktop();
    if (!api?.workbenchGitCommitBranch) return;
    const reason = pushReason.trim();
    if (!reason) {
      gitToast("请填写变更说明。", "error");
      return;
    }
    setGitBusy("commitBranch");
    try {
      const r = await api.workbenchGitCommitBranch({ reason });
      if (!r.ok) {
        gitToast(briefGitError(r.error, "提交失败"), "error");
        return;
      }
      setPushReason("");
      if (r.committed) {
        gitToast(`已提交到 ${r.branch || "当前分支"}（${r.commitHash || ""}）。`);
      } else {
        gitToast("没有需要提交的变更。");
      }
      await refreshGitStatus();
    } finally {
      setGitBusy(null);
    }
  };

  const personalRepoShort = personalGithubRepo.trim().replace(/^https:\/\/github\.com\//, "") || "未配置";

  return (
    <>
      <div className="max-w-2xl space-y-5">
        {/* ── 仓库摘要 ── */}
        <Section title="GitHub 同步">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-secondary/50">
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12px] font-medium text-foreground">
                    {personalRepoShort}
                  </p>
                  {gitStatus?.ok && (
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {(gitStatus.personalBranch || gitStatus.branch || "—")}
                      </span>
                      <span className="text-[9px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {gitStatus.personalDirty !== undefined
                          ? gitStatus.personalDirty
                            ? "有改动"
                            : "干净"
                          : gitStatus.dirty
                            ? "有改动"
                            : "干净"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={!desktop}
              onClick={() => setConfigDrawerOpen(true)}
              className="btn-row"
            >
              <Settings className="h-3.5 w-3.5" /> 仓库配置
            </button>
          </div>
        </Section>

        {/* ── 官方 Claude Code ── */}
        <Section title="官方同步">
          <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
            从 Anthropic 官方仓库同步 Agent、Skill、任务链与 MCP 预设等编排资产。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!desktop || gitBusy !== null}
              onClick={() => void checkUpstreamUpdates()}
              className="btn-row"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", gitBusy === "checkUpstream" && "animate-spin")} />
              {gitBusy === "checkUpstream" ? "检测中…" : "检测更新"}
            </button>
            <button
              type="button"
              disabled={!desktop || gitBusy !== null}
              onClick={() => void pullFromGithub()}
              className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
            >
              <Download className={cn("h-3.5 w-3.5", gitBusy === "pull" && "animate-pulse")} />
              {gitBusy === "pull" ? "同步中…" : "同步官方"}
            </button>
          </div>
        </Section>

        {/* ── 个人仓库 ── */}
        <Section title="个人仓库">
          {workspacePath ? (
            <p className="mb-3 truncate font-mono text-[11px] text-muted-foreground" title={workspacePath}>
              工作区：{workspacePath}
            </p>
          ) : (
            <p className="mb-3 text-[11px] text-warning">
              未选择工作区，推送说明将无法带上项目名。
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1 text-[12px] font-medium text-foreground/80">
              {GIT_PUSH_REASON_LABEL} <RequiredMark />
            </span>
            <textarea
              value={pushReason}
              onChange={(e) => setPushReason(e.target.value)}
              disabled={!desktop}
              placeholder={GIT_PUSH_REASON_PLACEHOLDER}
              rows={2}
              spellCheck={false}
              required
              className="input-enhanced w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] outline-none disabled:opacity-40"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={!desktop || gitBusy !== null}
              onClick={() => void deployFromRepo()}
              className="btn-row"
            >
              <FolderInput className={cn("h-3.5 w-3.5", gitBusy === "deployPersonal" && "animate-pulse")} />
              {gitBusy === "deployPersonal" ? "部署中…" : "部署到本地"}
            </button>
            <button
              type="button"
              disabled={!desktop || gitBusy !== null}
              onClick={() => void commitBranch()}
              className="btn-row"
            >
              <GitBranch className={cn("h-3.5 w-3.5", gitBusy === "commitBranch" && "animate-pulse")} />
              {gitBusy === "commitBranch" ? "提交中…" : "提交分支"}
            </button>
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
                !gitUserEmail.trim()
              }
              onClick={() => void pushToPersonal()}
              className="btn-row"
            >
              <Upload className={cn("h-3.5 w-3.5", gitBusy === "push" && "animate-pulse")} />
              {gitBusy === "push" ? "推送中…" : "推送"}
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <p>{GIT_PUSH_HINT} {GIT_DEPLOY_HINT}</p>
            <p className="mt-1 text-[10.5px] text-muted-foreground/60">{GIT_PUSH_HINT_DETAIL}</p>
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

      <DeployDialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen} onReady={deployFromRepoSilent} />
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
      <div className="flex-1 bg-foreground/25 backdrop-blur-sm" onClick={onClose} />
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
