import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Cloud, Cpu, Pencil, Plus, RefreshCw, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { getDesktop } from "@/lib/desktop-api";
import { chatSettingsPreservePayload, resolveCloudProviderCatalog } from "@/lib/model-catalog";

export type CcSwitchProvider = {
  id: string;
  name: string;
  isCurrent: boolean;
  baseUrl: string;
  models: string[];
  hasApiKey: boolean;
  apiKeyPreview: string;
  websiteUrl?: string;
  notes?: string;
};

type DrawerMode = "closed" | "cloud-create" | "cloud-edit" | "local";

type CloudForm = {
  name: string;
  providerId: string;
  endpoint: string;
  apiKey: string;
  homepage: string;
  defaultModel: string;
  extraModels: string;
  setAsCurrent: boolean;
};

const EMPTY_CLOUD_FORM: CloudForm = {
  name: "",
  providerId: "",
  endpoint: "",
  apiKey: "",
  homepage: "",
  defaultModel: "",
  extraModels: "",
  setAsCurrent: true,
};

type Props = {
  onSettingsUpdated?: () => void;
};

export function ModelsConnectionsPanel({ onSettingsUpdated }: Props) {
  const desktop = useHasDesktop();
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<CcSwitchProvider[]>([]);
  const [busy, setBusy] = useState<"load" | "save" | "sync" | "activate" | "local" | null>(null);

  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [cloudForm, setCloudForm] = useState<CloudForm>(EMPTY_CLOUD_FORM);

  const [ollamaBase, setOllamaBase] = useState("http://127.0.0.1:11434");
  const [localModelCatalog, setLocalModelCatalog] = useState<string[]>([]);
  const [currentModelId, setCurrentModelId] = useState("");
  const [localPick, setLocalPick] = useState<Set<string>>(new Set());
  const [localTest, setLocalTest] = useState<{
    status: "idle" | "testing" | "ok" | "fail";
    message: string;
    discovered: string[];
  }>({ status: "idle", message: "", discovered: [] });

  const closeDrawer = useCallback(() => {
    setDrawer("closed");
    setEditingProviderId(null);
    setCloudForm(EMPTY_CLOUD_FORM);
    setLocalPick(new Set());
  }, []);

  const loadLocalSettings = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const s = await api.getChatSettings();
    const base = s.ollamaBase?.trim() || "http://127.0.0.1:11434";
    setOllamaBase(base);
    setCurrentModelId(s.model?.trim() || "");
    let catalog = [...(s.localModelCatalog ?? [])];
    if (!catalog.length && s.model?.trim()) {
      const probe = await api.listOllamaModels(base);
      const mid = s.model.trim();
      if (probe.ok && (probe.models ?? []).includes(mid)) {
        catalog = [mid];
        await api.saveChatSettings({
          ...chatSettingsPreservePayload(s),
          localModelCatalog: catalog,
        });
      }
    }
    setLocalModelCatalog(catalog);
    setLocalTest({ status: "idle", message: "", discovered: [] });
  }, []);

  const refreshProviders = useCallback(async () => {
    const api = getDesktop();
    if (!api?.ccSwitchListProviders) return;
    setBusy("load");
    try {
      const status = await api.ccSwitchStatus?.();
      if (status) setInstalled(status.installed);
      const r = await api.ccSwitchListProviders();
      if (!r.ok) {
        toast.error(r.error || "读取云模型失败");
        setProviders([]);
        return;
      }
      const allProviders = r.providers ?? [];
      const s = await api.getChatSettings();
      const resolved = resolveCloudProviderCatalog(s.cloudProviderCatalog, allProviders);
      const stored = s.cloudProviderCatalog ?? [];
      if (
        resolved.length !== stored.length ||
        resolved.some((id, i) => id !== stored[i])
      ) {
        const latest = await api.getChatSettings();
        await api.saveChatSettings({
          ...chatSettingsPreservePayload(latest),
          cloudProviderCatalog: resolved,
        });
      }
      setProviders(allProviders.filter((p) => resolved.includes(p.id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "读取云模型失败");
      setProviders([]);
    } finally {
      setBusy(null);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshProviders();
    await loadLocalSettings();
  }, [loadLocalSettings, refreshProviders]);

  useEffect(() => {
    if (desktop) void refreshAll();
  }, [desktop, refreshAll]);

  const localCatalogSet = useMemo(() => new Set(localModelCatalog), [localModelCatalog]);

  const openCloudCreate = () => {
    setEditingProviderId(null);
    setCloudForm(EMPTY_CLOUD_FORM);
    setDrawer("cloud-create");
  };

  const openCloudEdit = (p: CcSwitchProvider) => {
    const models = p.models.filter(Boolean);
    setEditingProviderId(p.id);
    setCloudForm({
      name: p.name,
      providerId: p.id,
      endpoint: p.baseUrl || "",
      apiKey: "",
      homepage: p.websiteUrl || "",
      defaultModel: models[0] || "",
      extraModels: models.slice(1).join(", "),
      setAsCurrent: p.isCurrent,
    });
    setDrawer("cloud-edit");
  };

  const openLocalConfig = async () => {
    await loadLocalSettings();
    setLocalPick(new Set());
    setDrawer("local");
  };

  const refreshCloudModels = async () => {
    const api = getDesktop();
    if (!api?.ccSwitchRefreshCloudModels) return;
    setBusy("sync");
    try {
      const r = await api.ccSwitchRefreshCloudModels({ fetchRemote: true });
      if (!r.ok) {
        toast.error(r.error || "刷新云模型列表失败");
        return;
      }
      toast.success(`已合并 ${r.models?.length ?? 0} 个云模型`);
      onSettingsUpdated?.();
    } finally {
      setBusy(null);
    }
  };

  const saveCloudProvider = async () => {
    const api = getDesktop();
    if (!api?.ccSwitchUpsertProvider) {
      toast.error("未连接本机 Bridge，请确认 npm run web:dev:full 正在运行");
      return;
    }
    const { name, providerId, endpoint, apiKey, homepage, defaultModel: dm, extraModels, setAsCurrent } =
      cloudForm;
    if (!name.trim() || !endpoint.trim() || !dm.trim()) {
      toast.error("请填写名称、API 端点与默认模型");
      return;
    }
    const trimmedId = providerId.trim();
    const targetId = editingProviderId || trimmedId;
    if (!editingProviderId && !apiKey.trim()) {
      toast.error("新建须填写 API Key");
      return;
    }
    if (!editingProviderId && trimmedId && providers.some((p) => p.id === trimmedId)) {
      toast.error(`供应商 ID「${trimmedId}」已存在，请修改已有条目`);
      return;
    }
    setBusy("save");
    try {
      const r = await api.ccSwitchUpsertProvider({
        id: targetId || undefined,
        name: name.trim(),
        endpoint: endpoint.trim(),
        apiKey: apiKey.trim(),
        homepage: homepage.trim(),
        sonnetModel: dm.trim(),
        haikuModel: dm.trim(),
        opusModel: dm.trim(),
        extraModels: extraModels.trim(),
        setCurrent: setAsCurrent,
        syncWorkbench: true,
      });
      if (!r.ok) {
        toast.error(r.error || "保存失败");
        return;
      }
      toast.success(editingProviderId ? `已更新「${name.trim()}」` : `已添加「${name.trim()}」`);
      closeDrawer();
      await refreshProviders();
      try {
        await api.ccSwitchRefreshCloudModels?.({ fetchRemote: true });
      } catch {
        /* ignore */
      }
      onSettingsUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(null);
    }
  };

  const saveOllamaBase = async () => {
    const api = getDesktop();
    if (!api) return;
    const s = await api.getChatSettings();
    await api.saveChatSettings({
      ...chatSettingsPreservePayload(s),
      ollamaBase: ollamaBase.trim(),
    });
  };

  const testLocalConnection = async () => {
    const api = getDesktop();
    if (!api) return;
    setLocalTest({ status: "testing", message: "正在连接本机 Ollama…", discovered: [] });
    setBusy("local");
    try {
      const base = ollamaBase.trim() || "http://127.0.0.1:11434";
      const r = await api.listOllamaModels(base);
      if (r.ok && r.models?.length) {
        const discovered = r.models.filter(Boolean);
        const notAdded = discovered.filter((m) => !localModelCatalog.includes(m));
        setLocalPick(new Set(notAdded));
        setLocalTest({
          status: "ok",
          message: `连接成功，发现 ${discovered.length} 个模型`,
          discovered,
        });
        await saveOllamaBase();
      } else {
        setLocalTest({
          status: "fail",
          message: r.error || "无法连接或未安装模型",
          discovered: [],
        });
      }
    } catch (e) {
      setLocalTest({
        status: "fail",
        message: e instanceof Error ? e.message : "连接失败",
        discovered: [],
      });
    } finally {
      setBusy(null);
    }
  };

  const toggleLocalPick = (model: string) => {
    if (localCatalogSet.has(model)) return;
    setLocalPick((prev) => {
      const next = new Set(prev);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return next;
    });
  };

  const selectAllLocalPick = () => {
    const notAdded = localTest.discovered.filter((m) => !localCatalogSet.has(m));
    setLocalPick(new Set(notAdded));
  };

  const deleteCloudProvider = async (p: CcSwitchProvider) => {
    if (p.isCurrent) {
      toast.error("不能删除当前启用的云模型");
      return;
    }
    const api = getDesktop();
    if (!api?.ccSwitchDeleteProvider) {
      toast.error("未连接本机 Bridge，请确认 npm run web:dev:full 正在运行");
      return;
    }
    if (!window.confirm(`确定删除云模型「${p.name}」？此操作不可撤销。`)) return;
    setBusy("save");
    try {
      const r = await api.ccSwitchDeleteProvider({ providerId: p.id });
      if (!r.ok) {
        toast.error(r.error || "删除失败");
        return;
      }
      toast.success(`已删除「${p.name}」`);
      await refreshProviders();
      onSettingsUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(null);
    }
  };

  const removeLocalModel = async (model: string) => {
    const api = getDesktop();
    if (!api) return;
    if (model === currentModelId) {
      toast.error("不能删除当前使用的模型");
      return;
    }
    if (!window.confirm(`确定从列表中删除本地模型「${model}」？`)) return;
    setBusy("local");
    try {
      const s = await api.getChatSettings();
      const catalog = (s.localModelCatalog ?? []).filter((m) => m !== model);
      const nextModel = s.model === model ? catalog[0] ?? "" : s.model ?? "";
      const nextMcp =
        s.localOllamaModel === model ? catalog[0] ?? "" : s.localOllamaModel ?? "";
      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        localModelCatalog: catalog,
        model: nextModel,
        localOllamaModel: nextMcp,
      });
      setLocalModelCatalog(catalog);
      toast.success(`已删除「${model}」`);
      onSettingsUpdated?.();
    } finally {
      setBusy(null);
    }
  };

  const finishLocalDrawer = async () => {
    const api = getDesktop();
    if (!api) return;
    setBusy("local");
    try {
      const toAdd = [...localPick].filter((m) => !localModelCatalog.includes(m));
      const s = await api.getChatSettings();
      const catalog =
        toAdd.length > 0
          ? [...new Set([...(s.localModelCatalog ?? []), ...toAdd])]
          : [...(s.localModelCatalog ?? [])];
      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        ollamaBase: ollamaBase.trim(),
        localModelCatalog: catalog,
        ...(toAdd.length > 0
          ? {
              model: s.model?.trim() || toAdd[0],
              localOllamaModel: s.localOllamaModel?.trim() || toAdd[0],
            }
          : {}),
      });
      setLocalModelCatalog(catalog);
      if (toAdd.length > 0) {
        toast.success(`已添加 ${toAdd.length} 个本地模型`);
      }
      closeDrawer();
      onSettingsUpdated?.();
    } finally {
      setBusy(null);
    }
  };

  const activateProvider = async (p: CcSwitchProvider) => {
    const api = getDesktop();
    if (!api?.ccSwitchSetCurrentProvider) return;
    setBusy("activate");
    try {
      const r = await api.ccSwitchSetCurrentProvider({
        providerId: p.id,
        model: p.models[0] || cloudForm.defaultModel.trim(),
        syncWorkbench: true,
      });
      if (!r.ok) {
        toast.error(r.error || "启用失败");
        return;
      }
      toast.success(`已启用 ${p.name}`);
      await refreshProviders();
      onSettingsUpdated?.();
    } finally {
      setBusy(null);
    }
  };

  const syncWorkbench = async () => {
    const api = getDesktop();
    if (!api?.ccSwitchSyncWorkbench) return;
    setBusy("sync");
    try {
      const r = await api.ccSwitchSyncWorkbench();
      if (!r.ok) {
        toast.error(r.error || "同步失败");
        return;
      }
      toast.success(`已同步：${r.providerName} → ${r.model}`);
      onSettingsUpdated?.();
    } finally {
      setBusy(null);
    }
  };

  if (!desktop) return null;

  const drawerOpen = drawer !== "closed";
  const cloudDrawer = drawer === "cloud-create" || drawer === "cloud-edit";

  return (
    <div className="w-full space-y-4">
      {installed === false && (
        <p className="rounded-lg border border-border bg-warning/10 px-3 py-2 text-[12px] text-warning">
          未检测到 ~/.cc-switch/cc-switch.db。云模型供应商需先安装 CC Switch，或在终端运行 setup 脚本。
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={openCloudCreate}
          className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold shadow-sm disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> 添加云模型
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void openLocalConfig()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40"
        >
          <Cpu className="h-3.5 w-3.5" /> 配置本地模型
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void refreshAll()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", busy === "load" && "animate-spin")} /> 刷新
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void refreshCloudModels()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40"
        >
          <Cloud className="h-3.5 w-3.5" /> 刷新云模型
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void syncWorkbench()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40"
        >
          <Zap className="h-3.5 w-3.5" /> 同步 Workbench
        </button>
      </div>

      <div className="page-data-table page-data-table--flat w-full overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-full text-left text-[12px]">
          <thead className="border-b border-border bg-muted/30 text-muted-foreground">
            <tr>
              <th className="col-type px-3 py-2 font-medium">类型</th>
              <th className="col-name px-3 py-2 font-medium">名称</th>
              <th className="col-endpoint px-3 py-2 font-medium">端点</th>
              <th className="col-model px-3 py-2 font-medium">可用模型</th>
              <th className="col-key px-3 py-2 font-medium">Key</th>
              <th className="col-action px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="col-type px-3 py-2.5 align-top">
                  <span className="inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    云
                  </span>
                </td>
                <td className="col-name px-3 py-2.5 align-top">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.isCurrent ? (
                        <span className="shrink-0 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary">
                          当前
                        </span>
                      ) : null}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{p.id}</div>
                  </div>
                </td>
                <td className="col-endpoint px-3 py-2.5 align-top font-mono text-[10px] text-muted-foreground">
                  <div className="cell-2line break-all">{p.baseUrl || "—"}</div>
                </td>
                <td className="col-model px-3 py-2.5 align-top font-mono text-[10px] text-foreground">
                  <div className="cell-2line">{p.models.length ? p.models.join(", ") : "—"}</div>
                </td>
                <td className="col-key px-3 py-2.5 align-top text-muted-foreground">
                  <div className="cell-1line">{p.hasApiKey ? p.apiKeyPreview : "未配置"}</div>
                </td>
                <td className="col-action px-3 py-2.5 align-top text-right">
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => openCloudEdit(p)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-40"
                    >
                      <Pencil className="h-3 w-3" /> 修改
                    </button>
                    {!p.isCurrent ? (
                      <>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void activateProvider(p)}
                          className="rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-40"
                        >
                          启用
                        </button>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void deleteCloudProvider(p)}
                          className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" /> 删除
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {localModelCatalog.map((model) => (
              <tr key={model} className="border-t border-border/60 bg-secondary/5">
                <td className="col-type px-3 py-2.5 align-top">
                  <span className="inline-flex rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    本地
                  </span>
                </td>
                <td className="col-name px-3 py-2.5 align-top">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[11px] text-foreground">{model}</span>
                    {model === currentModelId ? (
                      <span className="shrink-0 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary">
                        当前
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="col-endpoint px-3 py-2.5 align-top font-mono text-[10px] text-muted-foreground">
                  <div className="cell-2line break-all">{ollamaBase}</div>
                </td>
                <td className="col-model px-3 py-2.5 align-top text-[10px] text-muted-foreground">Ollama</td>
                <td className="col-key px-3 py-2.5 align-top text-[10px] text-muted-foreground">—</td>
                <td className="col-action px-3 py-2.5 align-top text-right">
                  <button
                    type="button"
                    disabled={busy !== null || model === currentModelId}
                    title={model === currentModelId ? "当前模型不可删除" : undefined}
                    onClick={() => void removeLocalModel(model)}
                    className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  >
                    <Trash2 className="h-3 w-3" /> 删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        聊天页模型下拉与本页列表同步：仅展示通过「添加云模型」与「配置本地模型」自主添加的条目；当前使用的模型不可删除。
      </p>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={closeDrawer} />
          <div className="flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <div className="text-[13px] font-semibold text-foreground">
                  {cloudDrawer
                    ? drawer === "cloud-create"
                      ? "添加云模型"
                      : `编辑 · ${cloudForm.name || editingProviderId}`
                    : "配置本地模型"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {cloudDrawer
                    ? "写入 CC Switch，并合并到聊天页云模型列表"
                    : "测试 Ollama 连接后，勾选模型并点击完成添加到列表"}
                </div>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {cloudDrawer ? (
                <>
                  <CloudFormField label="供应商名称">
                    <input
                      value={cloudForm.name}
                      onChange={(e) => setCloudForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="例如 DeepSeek / 云梦 AI"
                      className={inputClass}
                    />
                  </CloudFormField>
                  <CloudFormField label="供应商 ID（可选）">
                    <input
                      value={cloudForm.providerId}
                      onChange={(e) => setCloudForm((f) => ({ ...f, providerId: e.target.value }))}
                      placeholder="yunmeng-claude"
                      readOnly={Boolean(editingProviderId)}
                      className={cn(inputClass, editingProviderId && "cursor-not-allowed bg-muted/40")}
                    />
                  </CloudFormField>
                  <CloudFormField label="默认模型 ID">
                    <input
                      value={cloudForm.defaultModel}
                      onChange={(e) => setCloudForm((f) => ({ ...f, defaultModel: e.target.value }))}
                      placeholder="deepseek-chat"
                      className={cn(inputClass, "font-mono text-[12px]")}
                    />
                  </CloudFormField>
                  <CloudFormField label="API 端点">
                    <input
                      value={cloudForm.endpoint}
                      onChange={(e) => setCloudForm((f) => ({ ...f, endpoint: e.target.value }))}
                      placeholder="https://api.example.com"
                      className={cn(inputClass, "font-mono text-[12px]")}
                    />
                  </CloudFormField>
                  <CloudFormField label="API Key">
                    <input
                      type="password"
                      value={cloudForm.apiKey}
                      onChange={(e) => setCloudForm((f) => ({ ...f, apiKey: e.target.value }))}
                      placeholder={editingProviderId ? "留空保留原 Key" : "sk-…"}
                      autoComplete="off"
                      className={cn(inputClass, "font-mono text-[12px]")}
                    />
                  </CloudFormField>
                  <CloudFormField label="额外模型 ID（逗号分隔）">
                    <input
                      value={cloudForm.extraModels}
                      onChange={(e) => setCloudForm((f) => ({ ...f, extraModels: e.target.value }))}
                      placeholder="model-a, model-b"
                      className={cn(inputClass, "font-mono text-[12px]")}
                    />
                  </CloudFormField>
                  <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={cloudForm.setAsCurrent}
                      onChange={(e) => setCloudForm((f) => ({ ...f, setAsCurrent: e.target.checked }))}
                      className="h-4 w-4 rounded border-border"
                    />
                    保存后立即设为当前 Claude Code 供应商
                  </label>
                </>
              ) : (
                <>
                  <CloudFormField label="Ollama 服务地址">
                    <input
                      value={ollamaBase}
                      onChange={(e) => {
                        setOllamaBase(e.target.value);
                        setLocalTest({ status: "idle", message: "", discovered: [] });
                      }}
                      className={cn(inputClass, "font-mono text-[12px]")}
                    />
                  </CloudFormField>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void testLocalConnection()}
                      className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", localTest.status === "testing" && "animate-spin")} />
                      测试连接
                    </button>
                  </div>
                  {localTest.status !== "idle" ? (
                    <div
                      className={cn(
                        "rounded-lg border px-3 py-2 text-[12px]",
                        localTest.status === "ok" && "border-success/30 bg-success/10 text-success",
                        localTest.status === "fail" && "border-destructive/30 bg-destructive/10 text-destructive",
                        localTest.status === "testing" && "border-border bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      {localTest.message}
                    </div>
                  ) : null}
                  {localTest.discovered.length > 0 ? (
                    <div>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[12px] font-medium text-foreground">
                          本机可用模型（勾选后点击完成添加）
                          {localPick.size > 0 ? (
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              已选 {localPick.size} 个
                            </span>
                          ) : null}
                        </div>
                        <div className="flex gap-2 text-[11px]">
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={selectAllLocalPick}
                            className="text-primary hover:underline disabled:opacity-40"
                          >
                            全选未添加
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null || localPick.size === 0}
                            onClick={() => setLocalPick(new Set())}
                            className="text-muted-foreground hover:underline disabled:opacity-40"
                          >
                            清空选择
                          </button>
                        </div>
                      </div>
                      <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1">
                        {localTest.discovered.map((model) => {
                          const added = localCatalogSet.has(model);
                          const checked = added || localPick.has(model);
                          return (
                            <label
                              key={model}
                              className={cn(
                                "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 font-mono text-[11.5px] transition",
                                added ? "cursor-default bg-success/10 text-success" : "hover:bg-secondary",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={busy !== null || added}
                                onChange={() => toggleLocalPick(model)}
                                className="h-4 w-4 shrink-0 rounded border-border"
                              />
                              <span className="min-w-0 flex-1 truncate">{model}</span>
                              {added ? (
                                <span className="inline-flex shrink-0 items-center gap-1 text-[10px]">
                                  <Check className="h-3 w-3" /> 已添加
                                </span>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {localModelCatalog.length > 0 ? (
                    <div>
                      <div className="mb-2 text-[12px] font-medium text-muted-foreground">已加入模型列表</div>
                      <div className="flex flex-wrap gap-1.5">
                        {localModelCatalog.map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[10.5px]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] hover:bg-secondary"
              >
                取消
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void (cloudDrawer ? saveCloudProvider() : finishLocalDrawer())}
                className="btn-gradient-primary rounded-lg px-4 py-1.5 text-[12.5px] font-semibold disabled:opacity-40"
              >
                {busy === "save" || busy === "local" ? "保存中…" : cloudDrawer ? "保存" : "完成"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function CloudFormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

/** @deprecated 使用 ModelsConnectionsPanel */
export function CcSwitchProvidersPanel(props: Props) {
  return <ModelsConnectionsPanel {...props} />;
}
