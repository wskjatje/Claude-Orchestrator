import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Circle, Cloud, Cpu, Pencil, Plus, RefreshCw, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { getDesktop } from "@/lib/desktop-api";
import { AUTO_MODEL_ID, chatSettingsPreservePayload, isAutoModelSelection, resolveCloudProviderCatalog } from "@/lib/model-catalog";
import { BRIDGE_OFFLINE_TOAST } from "@/lib/ui-copy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  inputPrice?: number;
  outputPrice?: number;
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
  inputPrice: string;
  outputPrice: string;
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
  inputPrice: "",
  outputPrice: "",
};

type Props = {
  onSettingsUpdated?: () => void;
};

type RowKey = `cloud:${string}` | `local:${string}`;

const rowKeyCloud = (id: string): RowKey => `cloud:${id}`;
const rowKeyLocal = (model: string): RowKey => `local:${model}`;

export function ModelsConnectionsPanel({ onSettingsUpdated }: Props) {
  const desktop = useHasDesktop();
  const [providers, setProviders] = useState<CcSwitchProvider[]>([]);
  const [busy, setBusy] = useState<"load" | "save" | "sync" | "local" | "batch" | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<RowKey>>(new Set());

  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [cloudForm, setCloudForm] = useState<CloudForm>(EMPTY_CLOUD_FORM);
  const [prevApiKeyPreview, setPrevApiKeyPreview] = useState<string>("");
  const [providerCustomOpen, setProviderCustomOpen] = useState(false);
  const [providerOptions, setProviderOptions] = useState<{ name: string; needsCcr: boolean; defaultEndpoint?: string; defaultInputPrice?: number; defaultOutputPrice?: number; canFetchModels?: boolean }[]>([]);

  const [showPricingManager, setShowPricingManager] = useState(false);
  const [pricingEntries, setPricingEntries] = useState<Record<string, { input: string; output: string }>>({});
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState("");

  const [ollamaBase, setOllamaBase] = useState("http://127.0.0.1:11434");
  const [localModelCatalog, setLocalModelCatalog] = useState<string[]>([]);
  const [currentModelId, setCurrentModelId] = useState("");
  const [chatEnabledCloudProviders, setChatEnabledCloudProviders] = useState<string[]>([]);
  const [chatEnabledLocalModels, setChatEnabledLocalModels] = useState<string[]>([]);
  const [localPick, setLocalPick] = useState<Set<string>>(new Set());
  const [localTest, setLocalTest] = useState<{
    status: "idle" | "testing" | "ok" | "fail";
    message: string;
    discovered: string[];
  }>({ status: "idle", message: "", discovered: [] });

  const [confirmDelete, setConfirmDelete] = useState<{
    type: "cloud" | "local";
    id: string;
    name: string;
  } | null>(null);

  const closeDrawer = useCallback(() => {
    setDrawer("closed");
    setEditingProviderId(null);
    setCloudForm(EMPTY_CLOUD_FORM);
    setPrevApiKeyPreview("");
    setLocalPick(new Set());
    setProviderCustomOpen(false);
  }, []);

  const loadLocalSettings = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const s = await api.getChatSettings();
    const base = s.ollamaBase?.trim() || "http://127.0.0.1:11434";
    setOllamaBase(base);
    setCurrentModelId(s.model?.trim() || "");
    setChatEnabledCloudProviders([...(s.chatEnabledCloudProviders ?? [])]);
    setChatEnabledLocalModels([...(s.chatEnabledLocalModels ?? [])]);
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

  // 打开云供应商抽屉时从服务端拉取完整的云供应商列表（含编辑模式）
  useEffect(() => {
    if (drawer !== "cloud-create" && drawer !== "cloud-edit") return;
    const api = getDesktop();
    if (!api?.ccSwitchListKnownProviders) return;
    let cancelled = false;
    api.ccSwitchListKnownProviders().then((r) => {
      if (cancelled || !r.ok) return;
      setProviderOptions(r.providers);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [drawer, editingProviderId]);

  const localCatalogSet = useMemo(() => new Set(localModelCatalog), [localModelCatalog]);
  const cloudChatEnabledSet = useMemo(() => new Set(chatEnabledCloudProviders), [chatEnabledCloudProviders]);
  const localChatEnabledSet = useMemo(() => new Set(chatEnabledLocalModels), [chatEnabledLocalModels]);

  const allRowKeys = useMemo(
    () => [...providers.map((p) => rowKeyCloud(p.id)), ...localModelCatalog.map((m) => rowKeyLocal(m))],
    [localModelCatalog, providers],
  );

  const toggleRowSelection = (key: RowKey) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAllRows = () => {
    setSelectedRows((prev) => (prev.size === allRowKeys.length ? new Set() : new Set(allRowKeys)));
  };

  const clearRowSelection = () => setSelectedRows(new Set());

  const selectedCloudIds = useMemo(
    () =>
      [...selectedRows]
        .filter((k): k is RowKey => k.startsWith("cloud:"))
        .map((k) => k.slice("cloud:".length)),
    [selectedRows],
  );

  const selectedLocalModels = useMemo(
    () =>
      [...selectedRows]
        .filter((k): k is RowKey => k.startsWith("local:"))
        .map((k) => k.slice("local:".length)),
    [selectedRows],
  );

  const pickChatModelAfterDisable = (
    mode: "claude-code" | "local-mcp",
    current: string,
    cloudModels: Set<string>,
    localModels: string[],
  ) => {
    const cur = current.trim();
    if (mode === "local-mcp") {
      if (cur && localModels.includes(cur)) return cur;
      return localModels[0] || AUTO_MODEL_ID;
    }
    if (cur && cloudModels.has(cur)) return cur;
    return cloudModels.values().next().value || AUTO_MODEL_ID;
  };

  const openCloudCreate = () => {
    setEditingProviderId(null);
    setCloudForm(EMPTY_CLOUD_FORM);
    setPrevApiKeyPreview("");
    setProviderCustomOpen(false);
    setDrawer("cloud-create");
  };

  const openCloudEdit = (p: CcSwitchProvider) => {
    const models = p.models.filter(Boolean);
    const preview = p.hasApiKey ? p.apiKeyPreview : "";
    setEditingProviderId(p.id);
    setPrevApiKeyPreview(preview);
    // 根据供应商名称取默认 API 端点，覆盖旧的 ccr 代理地址
    const match = providerOptions.find((o) => o.name === p.name);
    const storedUrl = p.baseUrl || "";
    const endpoint = (match?.defaultEndpoint && /127\.0\.0\.1:3456/.test(storedUrl))
      ? match.defaultEndpoint
      : storedUrl;
    setCloudForm({
      name: p.name,
      providerId: p.id,
      endpoint,
      apiKey: preview,
      homepage: p.websiteUrl || "",
      defaultModel: models[0] || "",
      extraModels: models.slice(1).join(", "),
      setAsCurrent: p.isCurrent,
      inputPrice: p.inputPrice ? String(p.inputPrice) : (match?.defaultInputPrice ? String(match.defaultInputPrice) : ""),
      outputPrice: p.outputPrice ? String(p.outputPrice) : (match?.defaultOutputPrice ? String(match.defaultOutputPrice) : ""),
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
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    const { name, providerId, endpoint, apiKey, homepage, defaultModel: dm, extraModels, setAsCurrent, inputPrice, outputPrice } =
      cloudForm;
    if (!name.trim() || !endpoint.trim() || !dm.trim()) {
      toast.error("请填写名称、API 端点与默认模型");
      return;
    }
    const trimmedId = providerId.trim();
    const targetId = editingProviderId || trimmedId;
    // 编辑时若未改动预览 Key，发送空串让后端保留原 Key
    const actualApiKey = editingProviderId && prevApiKeyPreview && apiKey.trim() === prevApiKeyPreview
      ? ""
      : apiKey.trim();
    if (!editingProviderId && !actualApiKey) {
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
        apiKey: actualApiKey,
        homepage: homepage.trim(),
        sonnetModel: dm.trim(),
        haikuModel: dm.trim(),
        opusModel: dm.trim(),
        extraModels: extraModels.trim(),
        setCurrent: setAsCurrent,
        inputPrice: Number(inputPrice) || undefined,
        outputPrice: Number(outputPrice) || undefined,
        syncWorkbench: true,
      });
      if (!r.ok) {
        toast.error(r.error || "保存失败");
        return;
      }
      if (setAsCurrent) {
        const latest = await api.getChatSettings();
        const nextCloud = [...new Set([...(latest.chatEnabledCloudProviders ?? []), r.providerId || targetId])];
        await api.saveChatSettings({
          ...chatSettingsPreservePayload(latest),
          chatEnabledCloudProviders: nextCloud,
          model: dm.trim() || latest.model,
        });
        setChatEnabledCloudProviders(nextCloud);
        setCurrentModelId(dm.trim() || latest.model?.trim() || "");
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

  const openPricingManager = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const s = await api.getChatSettings();
    const tokenPricing = s.tokenPricing || {};
    // 合并所有供应商的模型并保留现有定价
    const entries: Record<string, { input: string; output: string }> = {};
    for (const p of providers) {
      for (const m of p.models ?? []) {
        if (!m) continue;
        const existing = tokenPricing[m];
        entries[m] = {
          input: existing?.inputPer1M != null ? String(existing.inputPer1M) : "",
          output: existing?.outputPer1M != null ? String(existing.outputPer1M) : "",
        };
      }
    }
    // 补充只有 tokenPricing 中有但 providers 中不存在的模型
    for (const [m, v] of Object.entries(tokenPricing)) {
      if (!entries[m] && m) {
        entries[m] = {
          input: v?.inputPer1M != null ? String(v.inputPer1M) : "",
          output: v?.outputPer1M != null ? String(v.outputPer1M) : "",
        };
      }
    }
    setPricingEntries(entries);
    setShowPricingManager(true);
  }, [providers]);

  const savePricingEntries = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    setBusy("save");
    try {
      const s = await api.getChatSettings();
      const tokenPricing: Record<string, { inputPer1M: number; outputPer1M: number }> = {};
      for (const [model, v] of Object.entries(pricingEntries)) {
        const input = Number(v.input);
        const output = Number(v.output);
        if (input > 0 || output > 0) {
          tokenPricing[model] = { inputPer1M: input, outputPer1M: output };
        }
      }
      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        tokenPricing,
      });
      toast.success("模型单价已保存");
      setShowPricingManager(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(null);
    }
  }, [pricingEntries]);

  const handleFetchModels = useCallback(async () => {
    const api = getDesktop();
    if (!api?.ccSwitchFetchProviderModels) {
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    const { name, endpoint, apiKey } = cloudForm;
    if (!name.trim()) { toast.error("请先填写供应商名称"); return; }
    // 编辑时 key 未改动则发空串，后端自动查找已存储的 key
    const actualKey = editingProviderId && prevApiKeyPreview && apiKey.trim() === prevApiKeyPreview
      ? "" : apiKey.trim();
    // 捕获调用时正在编辑的供应商 ID，用于异步完成后校验一致性
    const callEditingId = editingProviderId;
    setFetchingModels(true);
    setFetchModelsError("");
    try {
      const r = await api.ccSwitchFetchProviderModels({
        providerName: name.trim(),
        endpoint: endpoint.trim() || undefined,
        apiKey: actualKey,
      });
      // 异步返回后若已切换为其他供应商编辑，放弃本次结果
      if (callEditingId !== editingProviderId) return;
      if (!r.ok || !Array.isArray(r.models) || r.models.length === 0) {
        setFetchModelsError(r.error || "未获取到模型，请检查 API Key 与端点");
        return;
      }
      // 通用启发式：从模型列表中自动推荐最适合聊天的默认模型
      const suggestDefault = (models: string[]): string => {
        const chatCandidates = models.filter((id) => {
          const l = id.toLowerCase();
          if (l.includes('embedding') || l.includes('embed')) return false;
          if (l.includes('moderation')) return false;
          if (l.includes('tts') || l === 'whisper-1') return false;
          if (l.includes('dall-e') || l.includes('dall·e')) return false;
          // 跳过 OpenAI 遗留非聊天基础模型（babbage/davinci/curie/ada），除非有 instruct/gpt 后缀
          if (/^(babbage|davinci|curie|ada)\b/i.test(l) && !/instruct|gpt/i.test(l)) return false;
          return true;
        });
        if (chatCandidates.length === 0) return models[0] || '';
        // 进一步优选：含常见聊天模型关键词的排前面
        const chatKeywords = /gpt|chat|claude|gemini|sonnet|opus|haiku|turbo|4o|4\.5|o1|o3|reasoner|flash|mini|pro|instruct/i;
        const preferred = chatCandidates.filter((id) => chatKeywords.test(id));
        return (preferred.length > 0 ? preferred[0] : chatCandidates[0]) || models[0] || '';
      };
      const first = suggestDefault(r.models);
      const rest = r.models.filter((m) => m !== first);
      setCloudForm((f) => ({
        ...f,
        defaultModel: first,
        extraModels: rest.join(", "),
        inputPrice: f.inputPrice || (r.defaultInputPrice ? String(r.defaultInputPrice) : ""),
        outputPrice: f.outputPrice || (r.defaultOutputPrice ? String(r.defaultOutputPrice) : ""),
      }));
      toast.success(`已获取 ${r.models.length} 个模型`);
    } catch (e) {
      setFetchModelsError(e instanceof Error ? e.message : "获取失败");
    } finally {
      setFetchingModels(false);
    }
  }, [cloudForm, editingProviderId, prevApiKeyPreview]);

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

  const deleteCloudProvider = (p: CcSwitchProvider) => {
    if (cloudChatEnabledSet.has(p.id)) {
      toast.error("请先在聊天中停用该供应商，再删除");
      return;
    }
    setConfirmDelete({ type: "cloud", id: p.id, name: p.name });
  };

  const deleteCloudProviderAction = async (id: string, name: string) => {
    const api = getDesktop();
    if (!api?.ccSwitchDeleteProvider) {
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    setBusy("save");
    try {
      const r = await api.ccSwitchDeleteProvider({ providerId: id });
      if (!r.ok) {
        toast.error(r.error || "删除失败");
        return;
      }
      toast.success(`已删除「${name}」`);
      await refreshProviders();
      onSettingsUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(null);
    }
  };

  const removeLocalModel = (model: string) => {
    if (localChatEnabledSet.has(model)) {
      toast.error("请先在聊天中停用该模型，再删除");
      return;
    }
    setConfirmDelete({ type: "local", id: model, name: model });
  };

  const deleteLocalModelAction = async (id: string) => {
    const api = getDesktop();
    if (!api) return;
    setBusy("local");
    try {
      const s = await api.getChatSettings();
      const catalog = (s.localModelCatalog ?? []).filter((m) => m !== id);
      const nextLocalEnabled = (s.chatEnabledLocalModels ?? []).filter((m) => m !== id);
      const nextModel = s.model === id ? catalog[0] ?? AUTO_MODEL_ID : s.model ?? "";
      const nextMcp =
        s.localOllamaModel === id ? catalog[0] ?? "" : s.localOllamaModel ?? "";
      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        localModelCatalog: catalog,
        chatEnabledLocalModels: nextLocalEnabled,
        model: nextModel,
        localOllamaModel: nextMcp,
      });
      setLocalModelCatalog(catalog);
      setChatEnabledLocalModels(nextLocalEnabled);
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

  const batchEnableSelected = async () => {
    if (selectedRows.size === 0) {
      toast.message("请先勾选要启用的条目");
      return;
    }

    const api = getDesktop();
    if (!api) return;

    const toEnableCloud = providers.filter(
      (p) => selectedCloudIds.includes(p.id) && !cloudChatEnabledSet.has(p.id),
    );
    const toEnableLocal = selectedLocalModels.filter((m) => !localChatEnabledSet.has(m));

    if (!toEnableCloud.length && !toEnableLocal.length) {
      toast.message("所选条目均已启用");
      return;
    }

    setBusy("batch");
    try {
      if (toEnableCloud.length && api.ccSwitchSetCurrentProvider) {
        const anchor = toEnableCloud[toEnableCloud.length - 1]!;
        const model = anchor.models[0] || "";
        const r = await api.ccSwitchSetCurrentProvider({
          providerId: anchor.id,
          model,
          syncWorkbench: false,
        });
        if (!r.ok) {
          toast.error(r.error || "批量启用失败");
          return;
        }
      }

      const s = await api.getChatSettings();
      const nextCloud = [...new Set([...chatEnabledCloudProviders, ...toEnableCloud.map((p) => p.id)])];
      const nextLocal = [...new Set([...chatEnabledLocalModels, ...toEnableLocal])];

      let nextModel = s.model?.trim() || currentModelId;
      if (toEnableCloud.length) {
        const anchor = toEnableCloud[toEnableCloud.length - 1]!;
        const cloudModel = anchor.models[0] || "";
        if (
          !nextModel ||
          isAutoModelSelection(nextModel) ||
          toEnableCloud.some((p) => p.models.includes(nextModel))
        ) {
          nextModel =
            nextModel && toEnableCloud.some((p) => p.models.includes(nextModel))
              ? nextModel
              : cloudModel || nextModel || AUTO_MODEL_ID;
        }
      }
      if (toEnableLocal.length && (!nextModel || isAutoModelSelection(nextModel))) {
        nextModel = toEnableLocal[0]!;
      }

      const nextLocalOllama =
        toEnableLocal.length > 0
          ? nextLocal.includes(s.localOllamaModel?.trim() ?? "")
            ? s.localOllamaModel
            : toEnableLocal[0]
          : s.localOllamaModel;

      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        chatEnabledCloudProviders: nextCloud,
        chatEnabledLocalModels: nextLocal,
        model: nextModel,
        localOllamaModel: nextLocalOllama ?? "",
      });

      setChatEnabledCloudProviders(nextCloud);
      setChatEnabledLocalModels(nextLocal);
      setCurrentModelId(nextModel);

      const parts: string[] = [];
      if (toEnableCloud.length) parts.push(`${toEnableCloud.length} 个云模型`);
      if (toEnableLocal.length) parts.push(`${toEnableLocal.length} 个本地模型`);
      toast.success(`已批量启用 ${parts.join("、")}`);

      if (toEnableCloud.length) await refreshProviders();
      clearRowSelection();
      onSettingsUpdated?.();
    } finally {
      setBusy(null);
    }
  };

  const batchDisableSelected = async () => {
    if (selectedRows.size === 0) {
      toast.message("请先勾选要停用的条目");
      return;
    }

    const api = getDesktop();
    if (!api) return;

    setBusy("batch");
    try {
      const s = await api.getChatSettings();
      let nextCloud = [...chatEnabledCloudProviders];
      let nextLocal = [...chatEnabledLocalModels];
      let disabledCloud = 0;
      let disabledLocal = 0;

      for (const id of selectedCloudIds) {
        if (!cloudChatEnabledSet.has(id)) continue;
        nextCloud = nextCloud.filter((x) => x !== id);
        disabledCloud += 1;
      }
      for (const model of selectedLocalModels) {
        if (!localChatEnabledSet.has(model)) continue;
        nextLocal = nextLocal.filter((m) => m !== model);
        disabledLocal += 1;
      }

      const total = disabledCloud + disabledLocal;
      if (!total) {
        toast.message("所选条目均未启用");
        return;
      }

      const nextCloudModels = new Set<string>();
      for (const prov of providers) {
        if (!nextCloud.includes(prov.id)) continue;
        for (const m of prov.models) if (m) nextCloudModels.add(m);
      }
      const cur = s.model?.trim() || currentModelId;
      let nextModel = cur;
      if (nextCloud.length) {
        nextModel = pickChatModelAfterDisable("claude-code", cur, nextCloudModels, []);
      } else if (nextLocal.length) {
        nextModel = pickChatModelAfterDisable("local-mcp", cur, new Set(), nextLocal);
      } else {
        nextModel = pickChatModelAfterDisable(
          s.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code",
          cur,
          nextCloudModels,
          nextLocal,
        );
      }

      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        chatEnabledCloudProviders: nextCloud,
        chatEnabledLocalModels: nextLocal,
        model: nextModel,
        localOllamaModel: nextLocal[0] || s.localOllamaModel,
        ...(nextCloud.length
          ? { orchestrationMode: "claude-code" as const }
          : nextLocal.length
            ? { orchestrationMode: "local-mcp" as const }
            : {}),
      });
      setChatEnabledCloudProviders(nextCloud);
      setChatEnabledLocalModels(nextLocal);
      setCurrentModelId(nextModel);
      toast.success(`已批量停用 ${total} 项`);
      clearRowSelection();
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
          <Zap className="h-3.5 w-3.5" /> 同步到 Claude CLI
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void openPricingManager()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40"
        >
          <span className="text-[13px]">$</span> 模型单价
        </button>
      </div>

      {allRowKeys.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/15 px-3 py-2">
          <span className="text-[11.5px] text-muted-foreground">
            已选 {selectedRows.size} / {allRowKeys.length}
          </span>
          <button
            type="button"
            disabled={busy !== null}
            onClick={toggleSelectAllRows}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-40"
          >
            {selectedRows.size === allRowKeys.length ? "取消全选" : "全选"}
          </button>
          <button
            type="button"
            disabled={busy !== null || selectedRows.size === 0}
            onClick={() => void batchEnableSelected()}
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-40"
          >
            <Zap className="h-3 w-3" /> 批量启用
          </button>
          <button
            type="button"
            disabled={busy !== null || selectedRows.size === 0}
            onClick={() => void batchDisableSelected()}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-40"
          >
            批量停用
          </button>
          <button
            type="button"
            disabled={busy !== null || selectedRows.size === 0}
            onClick={clearRowSelection}
            className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            清空选择
          </button>
        </div>
      ) : null}

      <div className="page-data-table page-data-table--flat w-full overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-full text-left text-[12px]">
          <thead className="border-b border-border bg-muted/30 text-muted-foreground">
            <tr>
              <th className="w-9 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allRowKeys.length > 0 && selectedRows.size === allRowKeys.length}
                  disabled={busy !== null || allRowKeys.length === 0}
                  onChange={toggleSelectAllRows}
                  className="h-3.5 w-3.5 rounded border-border"
                  aria-label="全选"
                />
              </th>
              <th className="col-type px-3 py-2 font-medium">类型</th>
              <th className="col-name px-3 py-2 font-medium">名称</th>
              <th className="col-endpoint px-3 py-2 font-medium">端点</th>
              <th className="col-model px-3 py-2 font-medium">可用模型</th>
              <th className="col-key px-3 py-2 font-medium">Key</th>
              <th className="col-status w-12 px-2 py-2 text-center font-medium">状态</th>
              <th className="col-action px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="px-2 py-2.5 align-top">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowKeyCloud(p.id))}
                    disabled={busy !== null}
                    onChange={() => toggleRowSelection(rowKeyCloud(p.id))}
                    className="h-3.5 w-3.5 rounded border-border"
                    aria-label={`选择 ${p.name}`}
                  />
                </td>
                <td className="col-type px-3 py-2.5 align-top">
                  <span className="inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    云
                  </span>
                </td>
                <td className="col-name px-3 py-2.5 align-top">
                  <div className="space-y-0.5">
                    <div className="font-medium text-foreground">{p.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{p.id}</div>
                  </div>
                </td>
                <td className="col-endpoint px-3 py-2.5 align-top font-mono text-[10px] text-muted-foreground">
                  <div className="cell-overflow break-all" title={p.baseUrl || "—"}>{p.baseUrl || "—"}</div>
                </td>
                <td className="col-model px-3 py-2.5 align-top font-mono text-[10px] text-foreground">
                  <div className="cell-overflow" title={p.models.length ? p.models.join(", ") : "—"}>{p.models.length ? p.models.join(", ") : "—"}</div>
                </td>
                <td className="col-key px-3 py-2.5 align-top text-muted-foreground">
                  <div className="cell-1line">{p.hasApiKey ? p.apiKeyPreview : "未配置"}</div>
                </td>
                <td className="col-status px-2 py-2.5 align-middle text-center">
                  <ChatEnableStatus enabled={cloudChatEnabledSet.has(p.id)} />
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
                    <button
                      type="button"
                      disabled={busy !== null || cloudChatEnabledSet.has(p.id)}
                      title={cloudChatEnabledSet.has(p.id) ? "请先批量停用" : undefined}
                      onClick={() => void deleteCloudProvider(p)}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" /> 删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {localModelCatalog.map((model) => (
              <tr key={model} className="border-t border-border/60 bg-secondary/5">
                <td className="px-2 py-2.5 align-top">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowKeyLocal(model))}
                    disabled={busy !== null}
                    onChange={() => toggleRowSelection(rowKeyLocal(model))}
                    className="h-3.5 w-3.5 rounded border-border"
                    aria-label={`选择 ${model}`}
                  />
                </td>
                <td className="col-type px-3 py-2.5 align-top">
                  <span className="inline-flex rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    本地
                  </span>
                </td>
                <td className="col-name px-3 py-2.5 align-top">
                  <span className="font-mono text-[11px] text-foreground">{model}</span>
                </td>
                <td className="col-endpoint px-3 py-2.5 align-top font-mono text-[10px] text-muted-foreground">
                  <div className="cell-overflow break-all" title={ollamaBase}>{ollamaBase}</div>
                </td>
                <td className="col-model px-3 py-2.5 align-top text-[10px] text-muted-foreground">Ollama</td>
                <td className="col-key px-3 py-2.5 align-top text-[10px] text-muted-foreground">—</td>
                <td className="col-status px-2 py-2.5 align-middle text-center">
                  <ChatEnableStatus enabled={localChatEnabledSet.has(model)} />
                </td>
                <td className="col-action px-3 py-2.5 align-top text-right">
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      disabled={busy !== null || localChatEnabledSet.has(model)}
                      title={localChatEnabledSet.has(model) ? "请先批量停用" : undefined}
                      onClick={() => void removeLocalModel(model)}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" /> 删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPricingManager ? (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={() => setShowPricingManager(false)} />
          <div className="flex w-full max-w-xl flex-col border-l border-border bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <div className="text-[14px] font-semibold">模型单价管理</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  设置每个模型的 $/1M tokens 单价。修改后仅影响新增的用量统计，历史费用不变。
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPricingManager(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {Object.keys(pricingEntries).length === 0 ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground">
                  暂无模型数据。请先添加云模型供应商。
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(pricingEntries).map(([model, v]) => (
                    <div key={model} className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface/50 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-[12px]">{model}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="mb-0.5 text-[10px] text-muted-foreground">输入</div>
                          <input
                            value={v.input}
                            onChange={(e) =>
                              setPricingEntries((prev) => ({
                                ...prev,
                                [model]: { ...prev[model], input: e.target.value },
                              }))
                            }
                            placeholder="默认"
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 w-20 rounded-md border border-border bg-surface px-2 text-[12px] font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <div className="mb-0.5 text-[10px] text-muted-foreground">输出</div>
                          <input
                            value={v.output}
                            onChange={(e) =>
                              setPricingEntries((prev) => ({
                                ...prev,
                                [model]: { ...prev[model], output: e.target.value },
                              }))
                            }
                            placeholder="默认"
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 w-20 rounded-md border border-border bg-surface px-2 text-[12px] font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => setShowPricingManager(false)}
                className="btn-ghost rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
              >
                取消
              </button>
              <button
                type="button"
                disabled={busy !== null || Object.keys(pricingEntries).length === 0}
                onClick={() => void savePricingEntries()}
                className="btn-gradient-primary rounded-lg px-4 py-1.5 text-[12.5px] font-semibold disabled:opacity-40"
              >
                {busy === "save" ? "保存中…" : "保存单价"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                    ? "保存到项目并合并到聊天页云模型列表"
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
                    {!providerCustomOpen || editingProviderId ? (
                      <select
                        value={cloudForm.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__custom__") {
                            setCloudForm((f) => ({ ...f, name: "", endpoint: "https://" }));
                            setProviderCustomOpen(true);
                          } else {
                            const match = providerOptions.find((p) => p.name === v);
                            const inputP = match?.defaultInputPrice ? String(match.defaultInputPrice) : "";
                            const outputP = match?.defaultOutputPrice ? String(match.defaultOutputPrice) : "";
                            setCloudForm((f) => ({ ...f, name: v }));
                            setProviderCustomOpen(false);
                            if (match?.defaultEndpoint) {
                              setCloudForm((f) => ({ ...f, name: v, endpoint: match.defaultEndpoint!, inputPrice: inputP, outputPrice: outputP }));
                            } else {
                              setCloudForm((f) => ({ ...f, name: v, endpoint: "", inputPrice: inputP, outputPrice: outputP }));
                            }
                          }
                        }}
                        disabled={Boolean(editingProviderId)}
                        className={cn(inputClass, editingProviderId && "cursor-not-allowed bg-muted/40")}
                      >
                        {editingProviderId && !providerOptions.some((p) => p.name === cloudForm.name) ? (
                          <option value={cloudForm.name}>
                            {cloudForm.name}
                          </option>
                        ) : (
                          <option value="" disabled>
                            {providerOptions.length ? "选择供应商…" : "加载中…"}
                          </option>
                        )}
                        {providerOptions.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                        {!editingProviderId ? (
                          <option value="__custom__">其他（自定义）</option>
                        ) : null}
                      </select>
                    ) : null}
                    {providerCustomOpen && !editingProviderId ? (
                      <input
                        value={cloudForm.name}
                        onChange={(e) => setCloudForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="输入自定义供应商名称"
                        className={cn(inputClass, providerCustomOpen && "mt-2")}
                        autoFocus={providerCustomOpen}
                        onFocus={() => setProviderCustomOpen(false)}
                      />
                    ) : null}
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
                  <CloudFormField label="API 端点">
                    <div className="relative">
                      <input
                        value={cloudForm.endpoint}
                        onChange={(e) => setCloudForm((f) => ({ ...f, endpoint: e.target.value }))}
                        placeholder="https://api.example.com"
                        className={cn(
                          inputClass,
                          "font-mono text-[12px]",
                        )}
                      />
                    </div>
                  </CloudFormField>
                  <CloudFormField label="API Key">
                    <input
                      type="password"
                      value={cloudForm.apiKey}
                      onChange={(e) => setCloudForm((f) => ({ ...f, apiKey: e.target.value }))}
                      onFocus={() => {
                        if (editingProviderId && prevApiKeyPreview && cloudForm.apiKey === prevApiKeyPreview) {
                          setCloudForm((f) => ({ ...f, apiKey: "" }));
                        }
                      }}
                      onBlur={() => {
                        if (editingProviderId && prevApiKeyPreview && !cloudForm.apiKey.trim()) {
                          setCloudForm((f) => ({ ...f, apiKey: prevApiKeyPreview }));
                        }
                      }}
                      placeholder={editingProviderId ? "留空保留原 Key" : "sk-…"}
                      autoComplete="off"
                      className={cn(inputClass, "font-mono text-[12px]")}
                    />
                    {editingProviderId && prevApiKeyPreview && (
                      <span className="text-[11px] text-muted-foreground">已配置 Key，留空保留原 Key</span>
                    )}
                  </CloudFormField>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={fetchingModels || busy !== null}
                      onClick={() => void handleFetchModels()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium transition hover:bg-secondary disabled:opacity-40"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", fetchingModels && "animate-spin")} />
                      {fetchingModels ? "获取中…" : "自动获取模型列表"}
                    </button>
                    {fetchModelsError ? (
                      <span className="text-[11px] text-destructive">{fetchModelsError}</span>
                    ) : null}
                  </div>
                  <CloudFormField label="默认模型 ID">
                    <input
                      value={cloudForm.defaultModel}
                      onChange={(e) => setCloudForm((f) => ({ ...f, defaultModel: e.target.value }))}
                      placeholder="deepseek-chat"
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
                  <CloudFormField label="输入单价 $/1M tokens（留空使用供应商默认）">
                    <input
                      value={cloudForm.inputPrice}
                      onChange={(e) => setCloudForm((f) => ({ ...f, inputPrice: e.target.value }))}
                      placeholder="留空自动"
                      type="number"
                      step="0.01"
                      min="0"
                      className={cn(inputClass, "font-mono text-[12px]")}
                    />
                  </CloudFormField>
                  <CloudFormField label="输出单价 $/1M tokens（留空使用供应商默认）">
                    <input
                      value={cloudForm.outputPrice}
                      onChange={(e) => setCloudForm((f) => ({ ...f, outputPrice: e.target.value }))}
                      placeholder="留空自动"
                      type="number"
                      step="0.01"
                      min="0"
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

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除{confirmDelete?.type === "cloud" ? "云模型" : "本地模型"}「{confirmDelete?.name}」？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const item = confirmDelete;
                setConfirmDelete(null);
                if (!item) return;
                if (item.type === "cloud") void deleteCloudProviderAction(item.id, item.name);
                else void deleteLocalModelAction(item.id);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function ChatEnableStatus({ enabled }: { enabled: boolean }) {
  const label = enabled ? "已启用（聊天可选）" : "未启用（聊天不可选）";
  if (!enabled) {
    return (
      <span
        title={label}
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 text-muted-foreground/55"
      >
        <Circle className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span title={label} aria-label={label} className="inline-flex h-6 w-6 items-center justify-center">
      <span className="h-2.5 w-2.5 rounded-full bg-success ring-2 ring-success/25" />
    </span>
  );
}

/** @deprecated 使用 ModelsConnectionsPanel */
export function CcSwitchProvidersPanel(props: Props) {
  return <ModelsConnectionsPanel {...props} />;
}
