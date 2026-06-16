import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { c as createLucideIcon, A as AppShell, P as PageHeader, b as Settings } from "./app-shell-DfKeMRG5.js";
import { b as useHasDesktop, t as toast, M as MODELS_EMPTY_HINT, e as cn, h as MODELS_PANEL_FOOTER, g as getDesktop, B as BRIDGE_OFFLINE_TOAST, u as useDesktopReady, P as PAGE_DESC, c as WORKSPACE_API_MISSING, j as CONFIRM_WRITE_SECTION_HINT, k as CONFIRM_WRITE_FOOTER, i as isWebBridge, l as SETTINGS_SAVED_PROJECT, m as SETTINGS_TAB_HINT, G as GIT_PUSH_REASON_LABEL, n as GIT_PUSH_REASON_PLACEHOLDER, o as GIT_PUSH_HINT, p as GIT_PUSH_HINT_DETAIL } from "./router-CCRumuR1.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { c as chatSettingsPreservePayload, r as resolveCloudProviderCatalog } from "./model-catalog-BUhoFevp.js";
import { P as Plus } from "./plus-CUtIIuQz.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
import { P as Pencil } from "./pencil-hgqqcg0M.js";
import { T as Trash2 } from "./trash-2-BpzVwa3Q.js";
import { X } from "./x-CgW_RKjX.js";
import { C as Check } from "./check-CBqelC41.js";
import { P as PageRoot, c as SettingsLayout, d as SettingsNavItem } from "./page-layout-p7fHu6c0.js";
import { S as Save } from "./save-s2gnsGqd.js";
import { G as GitBranch } from "./git-branch-ZxeBwIad.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode$4 = [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
];
const Cloud = createLucideIcon("cloud", __iconNode$4);
const __iconNode$3 = [
  ["path", { d: "M12 20v2", key: "1lh1kg" }],
  ["path", { d: "M12 2v2", key: "tus03m" }],
  ["path", { d: "M17 20v2", key: "1rnc9c" }],
  ["path", { d: "M17 2v2", key: "11trls" }],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M2 17h2", key: "7oei6x" }],
  ["path", { d: "M2 7h2", key: "asdhe0" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
  ["path", { d: "M20 17h2", key: "1fpfkl" }],
  ["path", { d: "M20 7h2", key: "1o8tra" }],
  ["path", { d: "M7 20v2", key: "4gnj0m" }],
  ["path", { d: "M7 2v2", key: "1i4yhu" }],
  ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2", key: "1vbyd7" }],
  ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "1", key: "z9xiuo" }]
];
const Cpu = createLucideIcon("cpu", __iconNode$3);
const __iconNode$2 = [
  ["path", { d: "M12 15V3", key: "m9g1x1" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
];
const Download = createLucideIcon("download", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "M12 3v12", key: "1x0j5s" }],
  ["path", { d: "m17 8-5-5-5 5", key: "7q97r8" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }]
];
const Upload = createLucideIcon("upload", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      key: "1xq2db"
    }
  ]
];
const Zap = createLucideIcon("zap", __iconNode);
const EMPTY_CLOUD_FORM = {
  name: "",
  providerId: "",
  endpoint: "",
  apiKey: "",
  homepage: "",
  defaultModel: "",
  extraModels: "",
  setAsCurrent: true
};
function ModelsConnectionsPanel({ onSettingsUpdated }) {
  const desktop = useHasDesktop();
  const [providers, setProviders] = reactExports.useState([]);
  const [busy, setBusy] = reactExports.useState(null);
  const [drawer, setDrawer] = reactExports.useState("closed");
  const [editingProviderId, setEditingProviderId] = reactExports.useState(null);
  const [cloudForm, setCloudForm] = reactExports.useState(EMPTY_CLOUD_FORM);
  const [ollamaBase, setOllamaBase] = reactExports.useState("http://127.0.0.1:11434");
  const [localModelCatalog, setLocalModelCatalog] = reactExports.useState([]);
  const [currentModelId, setCurrentModelId] = reactExports.useState("");
  const [localPick, setLocalPick] = reactExports.useState(/* @__PURE__ */ new Set());
  const [localTest, setLocalTest] = reactExports.useState({ status: "idle", message: "", discovered: [] });
  const closeDrawer = reactExports.useCallback(() => {
    setDrawer("closed");
    setEditingProviderId(null);
    setCloudForm(EMPTY_CLOUD_FORM);
    setLocalPick(/* @__PURE__ */ new Set());
  }, []);
  const loadLocalSettings = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const s = await api.getChatSettings();
    const base = s.ollamaBase?.trim() || "http://127.0.0.1:11434";
    setOllamaBase(base);
    setCurrentModelId(s.model?.trim() || "");
    let catalog = [...s.localModelCatalog ?? []];
    if (!catalog.length && s.model?.trim()) {
      const probe = await api.listOllamaModels(base);
      const mid = s.model.trim();
      if (probe.ok && (probe.models ?? []).includes(mid)) {
        catalog = [mid];
        await api.saveChatSettings({
          ...chatSettingsPreservePayload(s),
          localModelCatalog: catalog
        });
      }
    }
    setLocalModelCatalog(catalog);
    setLocalTest({ status: "idle", message: "", discovered: [] });
  }, []);
  const refreshProviders = reactExports.useCallback(async () => {
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
      if (resolved.length !== stored.length || resolved.some((id, i) => id !== stored[i])) {
        const latest = await api.getChatSettings();
        await api.saveChatSettings({
          ...chatSettingsPreservePayload(latest),
          cloudProviderCatalog: resolved
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
  const refreshAll = reactExports.useCallback(async () => {
    await refreshProviders();
    await loadLocalSettings();
  }, [loadLocalSettings, refreshProviders]);
  reactExports.useEffect(() => {
    if (desktop) void refreshAll();
  }, [desktop, refreshAll]);
  const localCatalogSet = reactExports.useMemo(() => new Set(localModelCatalog), [localModelCatalog]);
  const openCloudCreate = () => {
    setEditingProviderId(null);
    setCloudForm(EMPTY_CLOUD_FORM);
    setDrawer("cloud-create");
  };
  const openCloudEdit = (p) => {
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
      setAsCurrent: p.isCurrent
    });
    setDrawer("cloud-edit");
  };
  const openLocalConfig = async () => {
    await loadLocalSettings();
    setLocalPick(/* @__PURE__ */ new Set());
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
    const { name, providerId, endpoint, apiKey, homepage, defaultModel: dm, extraModels, setAsCurrent } = cloudForm;
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
        id: targetId || void 0,
        name: name.trim(),
        endpoint: endpoint.trim(),
        apiKey: apiKey.trim(),
        homepage: homepage.trim(),
        sonnetModel: dm.trim(),
        haikuModel: dm.trim(),
        opusModel: dm.trim(),
        extraModels: extraModels.trim(),
        setCurrent: setAsCurrent,
        syncWorkbench: true
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
      ollamaBase: ollamaBase.trim()
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
          discovered
        });
        await saveOllamaBase();
      } else {
        setLocalTest({
          status: "fail",
          message: r.error || "无法连接或未安装模型",
          discovered: []
        });
      }
    } catch (e) {
      setLocalTest({
        status: "fail",
        message: e instanceof Error ? e.message : "连接失败",
        discovered: []
      });
    } finally {
      setBusy(null);
    }
  };
  const toggleLocalPick = (model) => {
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
  const deleteCloudProvider = async (p) => {
    if (p.isCurrent) {
      toast.error("不能删除当前启用的云模型");
      return;
    }
    const api = getDesktop();
    if (!api?.ccSwitchDeleteProvider) {
      toast.error(BRIDGE_OFFLINE_TOAST);
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
  const removeLocalModel = async (model) => {
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
      const nextMcp = s.localOllamaModel === model ? catalog[0] ?? "" : s.localOllamaModel ?? "";
      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        localModelCatalog: catalog,
        model: nextModel,
        localOllamaModel: nextMcp
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
      const catalog = toAdd.length > 0 ? [.../* @__PURE__ */ new Set([...s.localModelCatalog ?? [], ...toAdd])] : [...s.localModelCatalog ?? []];
      await api.saveChatSettings({
        ...chatSettingsPreservePayload(s),
        ollamaBase: ollamaBase.trim(),
        localModelCatalog: catalog,
        ...toAdd.length > 0 ? {
          model: s.model?.trim() || toAdd[0],
          localOllamaModel: s.localOllamaModel?.trim() || toAdd[0]
        } : {}
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
  const activateProvider = async (p) => {
    const api = getDesktop();
    if (!api?.ccSwitchSetCurrentProvider) return;
    setBusy("activate");
    try {
      const r = await api.ccSwitchSetCurrentProvider({
        providerId: p.id,
        model: p.models[0] || cloudForm.defaultModel.trim(),
        syncWorkbench: true
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full space-y-4", children: [
    providers.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-[12px] text-muted-foreground", children: MODELS_EMPTY_HINT }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: busy !== null,
          onClick: openCloudCreate,
          className: "btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold shadow-sm disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
            " 添加云模型"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: busy !== null,
          onClick: () => void openLocalConfig(),
          className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "h-3.5 w-3.5" }),
            " 配置本地模型"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: busy !== null,
          onClick: () => void refreshAll(),
          className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", busy === "load" && "animate-spin") }),
            " 刷新"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: busy !== null,
          onClick: () => void refreshCloudModels(),
          className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Cloud, { className: "h-3.5 w-3.5" }),
            " 刷新云模型"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: busy !== null,
          onClick: () => void syncWorkbench(),
          className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "h-3.5 w-3.5" }),
            " 同步到 Claude CLI"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "page-data-table page-data-table--flat w-full overflow-x-auto rounded-xl border border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-full text-left text-[12px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "border-b border-border bg-muted/30 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-type px-3 py-2 font-medium", children: "类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-name px-3 py-2 font-medium", children: "名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-endpoint px-3 py-2 font-medium", children: "端点" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-model px-3 py-2 font-medium", children: "可用模型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-key px-3 py-2 font-medium", children: "Key" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-action px-3 py-2 text-right font-medium", children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        providers.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-type px-3 py-2.5 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary", children: "云" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-name px-3 py-2.5 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: p.name }),
              p.isCurrent ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary", children: "当前" }) : null
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-muted-foreground", children: p.id })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-endpoint px-3 py-2.5 align-top font-mono text-[10px] text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cell-2line break-all", children: p.baseUrl || "—" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-model px-3 py-2.5 align-top font-mono text-[10px] text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cell-2line", children: p.models.length ? p.models.join(", ") : "—" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-key px-3 py-2.5 align-top text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cell-1line", children: p.hasApiKey ? p.apiKeyPreview : "未配置" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-action px-3 py-2.5 align-top text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                disabled: busy !== null,
                onClick: () => openCloudEdit(p),
                className: "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-40",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3 w-3" }),
                  " 修改"
                ]
              }
            ),
            !p.isCurrent ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  disabled: busy !== null,
                  onClick: () => void activateProvider(p),
                  className: "rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-40",
                  children: "启用"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  disabled: busy !== null,
                  onClick: () => void deleteCloudProvider(p),
                  className: "inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" }),
                    " 删除"
                  ]
                }
              )
            ] }) : null
          ] }) })
        ] }, p.id)),
        localModelCatalog.map((model) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/60 bg-secondary/5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-type px-3 py-2.5 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success", children: "本地" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-name px-3 py-2.5 align-top", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[11px] text-foreground", children: model }),
            model === currentModelId ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary", children: "当前" }) : null
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-endpoint px-3 py-2.5 align-top font-mono text-[10px] text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cell-2line break-all", children: ollamaBase }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-model px-3 py-2.5 align-top text-[10px] text-muted-foreground", children: "Ollama" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-key px-3 py-2.5 align-top text-[10px] text-muted-foreground", children: "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-action px-3 py-2.5 align-top text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              disabled: busy !== null || model === currentModelId,
              title: model === currentModelId ? "当前模型不可删除" : void 0,
              onClick: () => void removeLocalModel(model),
              className: "inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" }),
                " 删除"
              ]
            }
          ) })
        ] }, model))
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] text-muted-foreground", children: MODELS_PANEL_FOOTER }),
    drawerOpen ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: closeDrawer }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[13px] font-semibold text-foreground", children: cloudDrawer ? drawer === "cloud-create" ? "添加云模型" : `编辑 · ${cloudForm.name || editingProviderId}` : "配置本地模型" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: cloudDrawer ? "保存到项目并合并到聊天页云模型列表" : "测试 Ollama 连接后，勾选模型并点击完成添加到列表" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: closeDrawer, className: "rounded p-1.5 text-muted-foreground hover:bg-secondary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 space-y-3 overflow-y-auto p-5", children: cloudDrawer ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudFormField, { label: "供应商名称", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: cloudForm.name,
              onChange: (e) => setCloudForm((f) => ({ ...f, name: e.target.value })),
              placeholder: "例如 DeepSeek / 云梦 AI",
              className: inputClass
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudFormField, { label: "供应商 ID（可选）", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: cloudForm.providerId,
              onChange: (e) => setCloudForm((f) => ({ ...f, providerId: e.target.value })),
              placeholder: "yunmeng-claude",
              readOnly: Boolean(editingProviderId),
              className: cn(inputClass, editingProviderId && "cursor-not-allowed bg-muted/40")
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudFormField, { label: "默认模型 ID", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: cloudForm.defaultModel,
              onChange: (e) => setCloudForm((f) => ({ ...f, defaultModel: e.target.value })),
              placeholder: "deepseek-chat",
              className: cn(inputClass, "font-mono text-[12px]")
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudFormField, { label: "API 端点", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: cloudForm.endpoint,
              onChange: (e) => setCloudForm((f) => ({ ...f, endpoint: e.target.value })),
              placeholder: "https://api.example.com",
              className: cn(inputClass, "font-mono text-[12px]")
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudFormField, { label: "API Key", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "password",
              value: cloudForm.apiKey,
              onChange: (e) => setCloudForm((f) => ({ ...f, apiKey: e.target.value })),
              placeholder: editingProviderId ? "留空保留原 Key" : "sk-…",
              autoComplete: "off",
              className: cn(inputClass, "font-mono text-[12px]")
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudFormField, { label: "额外模型 ID（逗号分隔）", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: cloudForm.extraModels,
              onChange: (e) => setCloudForm((f) => ({ ...f, extraModels: e.target.value })),
              placeholder: "model-a, model-b",
              className: cn(inputClass, "font-mono text-[12px]")
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex cursor-pointer items-center gap-2 text-[12px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: cloudForm.setAsCurrent,
                onChange: (e) => setCloudForm((f) => ({ ...f, setAsCurrent: e.target.checked })),
                className: "h-4 w-4 rounded border-border"
              }
            ),
            "保存后立即设为当前 Claude Code 供应商"
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudFormField, { label: "Ollama 服务地址", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: ollamaBase,
              onChange: (e) => {
                setOllamaBase(e.target.value);
                setLocalTest({ status: "idle", message: "", discovered: [] });
              },
              className: cn(inputClass, "font-mono text-[12px]")
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              disabled: busy !== null,
              onClick: () => void testLocalConnection(),
              className: "btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", localTest.status === "testing" && "animate-spin") }),
                "测试连接"
              ]
            }
          ) }),
          localTest.status !== "idle" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: cn(
                "rounded-lg border px-3 py-2 text-[12px]",
                localTest.status === "ok" && "border-success/30 bg-success/10 text-success",
                localTest.status === "fail" && "border-destructive/30 bg-destructive/10 text-destructive",
                localTest.status === "testing" && "border-border bg-secondary/40 text-muted-foreground"
              ),
              children: localTest.message
            }
          ) : null,
          localTest.discovered.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[12px] font-medium text-foreground", children: [
                "本机可用模型（勾选后点击完成添加）",
                localPick.size > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1.5 font-normal text-muted-foreground", children: [
                  "已选 ",
                  localPick.size,
                  " 个"
                ] }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 text-[11px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    disabled: busy !== null,
                    onClick: selectAllLocalPick,
                    className: "text-primary hover:underline disabled:opacity-40",
                    children: "全选未添加"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    disabled: busy !== null || localPick.size === 0,
                    onClick: () => setLocalPick(/* @__PURE__ */ new Set()),
                    className: "text-muted-foreground hover:underline disabled:opacity-40",
                    children: "清空选择"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1", children: localTest.discovered.map((model) => {
              const added = localCatalogSet.has(model);
              const checked = added || localPick.has(model);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  className: cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 font-mono text-[11.5px] transition",
                    added ? "cursor-default bg-success/10 text-success" : "hover:bg-secondary"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "checkbox",
                        checked,
                        disabled: busy !== null || added,
                        onChange: () => toggleLocalPick(model),
                        className: "h-4 w-4 shrink-0 rounded border-border"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: model }),
                    added ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex shrink-0 items-center gap-1 text-[10px]", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-3 w-3" }),
                      " 已添加"
                    ] }) : null
                  ]
                },
                model
              );
            }) })
          ] }) : null,
          localModelCatalog.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 text-[12px] font-medium text-muted-foreground", children: "已加入模型列表" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: localModelCatalog.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[10.5px]",
                children: m
              },
              m
            )) })
          ] }) : null
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 border-t border-border px-5 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: closeDrawer,
              className: "rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] hover:bg-secondary",
              children: "取消"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              disabled: busy !== null,
              onClick: () => void (cloudDrawer ? saveCloudProvider() : finishLocalDrawer()),
              className: "btn-gradient-primary rounded-lg px-4 py-1.5 text-[12.5px] font-semibold disabled:opacity-40",
              children: busy === "save" || busy === "local" ? "保存中…" : cloudDrawer ? "保存" : "完成"
            }
          )
        ] })
      ] })
    ] }) : null
  ] });
}
const inputClass = "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
function CloudFormField({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[12px] font-medium text-muted-foreground", children: label }),
    children
  ] });
}
function Section({
  title,
  hint,
  children,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: cn("page-section", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-section-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[13.5px] font-semibold tracking-tight text-foreground", children: title }),
      hint && /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { children: hint })
    ] }),
    children
  ] });
}
function SettingsOverview({
  workspacePath,
  orchestrationMode,
  modelLabel,
  activeTab
}) {
  const wsShort = workspacePath.length > 48 ? `…${workspacePath.slice(-44)}` : workspacePath;
  const tabHint = SETTINGS_TAB_HINT;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-surface-elevated px-3 py-2.5 shadow-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "工作区" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 truncate font-mono text-[11.5px] text-foreground", title: workspacePath, children: wsShort }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10.5px] text-muted-foreground", children: "侧栏 · 工作目录" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-surface-elevated px-3 py-2.5 shadow-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "编排" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[13px] font-semibold text-foreground", children: orchestrationMode === "local-mcp" ? "本地 Ollama + MCP" : "Claude Code" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10.5px] text-muted-foreground", children: "聊天页切换" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-surface-elevated px-3 py-2.5 shadow-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "默认模型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 truncate font-mono text-[12px] font-semibold text-foreground", children: modelLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10.5px] text-muted-foreground", children: "模型与连接 Tab" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] leading-relaxed text-muted-foreground", children: tabHint[activeTab] })
  ] });
}
function SettingsPage() {
  const desktopReady = useDesktopReady();
  const desktop = useHasDesktop();
  const [workspacePath, setWorkspacePath] = reactExports.useState("(未载入)");
  const [modelSelect, setModelSelect] = reactExports.useState("");
  const [orchestrationModeSelect, setOrchestrationModeSelect] = reactExports.useState("claude-code");
  const [hint, setHint] = reactExports.useState("");
  const [defaultConfirmWritePathInput, setDefaultConfirmWritePathInput] = reactExports.useState("docs/prd.md");
  const [mcpConfigAbsolutePathInput, setMcpConfigAbsolutePathInput] = reactExports.useState("");
  const [settingsTab, setSettingsTab] = reactExports.useState("general");
  const refreshWorkspace = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const p = await api.getWorkspace();
    setWorkspacePath(p && p.trim() ? p.trim() : "（尚未选择）");
  }, []);
  const refreshSettingsSummary = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const s = await api.getChatSettings();
    setModelSelect(s.model || "");
    setOrchestrationModeSelect(s.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code");
    setMcpConfigAbsolutePathInput(s.mcpConfigAbsolutePath?.trim() ?? "");
  }, []);
  reactExports.useEffect(() => {
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
  reactExports.useEffect(() => {
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
      defaultConfirmWritePath: defaultConfirmWritePathInput.trim() || "docs/prd.md"
    });
    setHint("已保存：一键确认写入默认路径。");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PageRoot, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "应用设置", description: settingsTab === "general" ? PAGE_DESC.settings.general : settingsTab === "models" ? PAGE_DESC.settings.models : PAGE_DESC.settings.advanced }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsLayout, { nav: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsNavItem, { active: settingsTab === "general", onClick: () => setSettingsTab("general"), children: "通用" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsNavItem, { active: settingsTab === "models", onClick: () => setSettingsTab("models"), children: "模型与连接" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsNavItem, { active: settingsTab === "advanced", onClick: () => setSettingsTab("advanced"), children: "编排与高级" })
    ] }), children: [
      settingsTab === "general" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsOverview, { workspacePath, orchestrationMode: orchestrationModeSelect, modelLabel: modelSelect || "—", activeTab: settingsTab }) : null,
      desktopReady && !desktop && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-lg border border-border bg-warning/10 px-3 py-2 text-[12.5px] text-warning", children: WORKSPACE_API_MISSING }),
      hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-lg border border-border bg-primary-soft/30 px-3 py-2 text-[12.5px] text-foreground", children: hint }) : null,
      settingsTab === "general" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-xl space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "一键确认写入", hint: CONFIRM_WRITE_SECTION_HINT, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[12px] text-muted-foreground", htmlFor: "default-confirm-write-path", children: "默认相对路径" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "default-confirm-write-path", type: "text", value: defaultConfirmWritePathInput, onChange: (e) => setDefaultConfirmWritePathInput(e.target.value), disabled: !desktop, placeholder: "docs/prd.md", className: "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted-foreground disabled:opacity-50" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] leading-snug text-muted-foreground", children: CONFIRM_WRITE_FOOTER }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void saveGeneralSettings(), disabled: !desktop, className: "btn-gradient-primary mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
            " 保存"
          ] })
        ] }),
        desktopReady && desktop && isWebBridge() && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-border/70 bg-secondary/30 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground", children: SETTINGS_SAVED_PROJECT })
      ] }) : null,
      settingsTab === "models" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ModelsConnectionsPanel, { onSettingsUpdated: () => void refreshSettingsSummary() }) : null,
      settingsTab === "advanced" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsAdvancedTab, { desktop }) : null
    ] })
  ] }) });
}
function SettingsAdvancedTab({
  desktop
}) {
  function briefGitError(error, fallback = "操作失败") {
    const line = error?.split("\n").find((l) => l.trim())?.trim();
    return line || fallback;
  }
  function gitToast(text, tone = "success") {
    const opts = {
      duration: 2600
    };
    if (tone === "error") toast.error(text, opts);
    else if (tone === "warning") toast.warning(text, opts);
    else toast.message(text, opts);
  }
  const [personalGithubRepo, setPersonalGithubRepo] = reactExports.useState("");
  const [gitUserName, setGitUserName] = reactExports.useState("");
  const [gitUserEmail, setGitUserEmail] = reactExports.useState("");
  const [upstreamGithubRepo, setUpstreamGithubRepo] = reactExports.useState("https://github.com/anthropics/claude-code.git");
  const [pushReason, setPushReason] = reactExports.useState("");
  const [gitBusy, setGitBusy] = reactExports.useState(null);
  const [gitStatus, setGitStatus] = reactExports.useState(null);
  const [configDrawerOpen, setConfigDrawerOpen] = reactExports.useState(false);
  const refreshGitStatus = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.workbenchGitStatus) return;
    const r = await api.workbenchGitStatus();
    setGitStatus(r);
  }, []);
  reactExports.useEffect(() => {
    const api = getDesktop();
    if (!api || !desktop) return;
    void (async () => {
      const s = await api.getChatSettings();
      setPersonalGithubRepo(s.personalGithubRepo?.trim() ?? "");
      setGitUserName(s.gitUserName?.trim() ?? "");
      setGitUserEmail(s.gitUserEmail?.trim() ?? "");
      setUpstreamGithubRepo(s.upstreamGithubRepo?.trim() || "https://github.com/anthropics/claude-code.git");
      if (api.workbenchGitStatus) {
        const st = await api.workbenchGitStatus();
        setGitStatus(st);
        if (!s.gitUserName?.trim() && st.gitUserName) setGitUserName(st.gitUserName);
        if (!s.gitUserEmail?.trim() && st.gitUserEmail) setGitUserEmail(st.gitUserEmail);
      }
      const configured = Boolean(s.personalGithubRepo?.trim()) && Boolean(s.gitUserName?.trim()) && Boolean(s.gitUserEmail?.trim());
      setConfigDrawerOpen(!configured);
    })();
  }, [desktop]);
  const githubSettingsPayload = () => ({
    personalGithubRepo: personalGithubRepo.trim(),
    gitUserName: gitUserName.trim(),
    gitUserEmail: gitUserEmail.trim(),
    upstreamGithubRepo: upstreamGithubRepo.trim()
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
        upstreamGithubRepo: upstreamGithubRepo.trim() || void 0
      });
      if (!r.ok) {
        gitToast(briefGitError(r.error, "检测失败"), "error");
        return;
      }
      gitToast(r.hasUpdates ? "官方可能有更新，可同步。" : "已与官方最新一致。", r.hasUpdates ? "warning" : "success");
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
        upstreamGithubRepo: upstreamGithubRepo.trim() || void 0
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
        personalGithubRepo: personalGithubRepo.trim()
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
    setGitBusy("push");
    try {
      await api.workbenchGitSaveGithubSettings(githubSettingsPayload());
      const r = await api.workbenchGitPushPersonal({
        reason,
        personalGithubRepo: personalGithubRepo.trim()
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto w-full max-w-3xl space-y-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "GitHub 同步", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 shadow-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate font-mono text-[12px] text-foreground", children: personalRepoShort }),
          gitStatus?.ok ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranch, { className: "h-3 w-3" }),
              gitStatus.branch || "—"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("rounded-md px-2 py-0.5 text-[10px]", gitStatus.dirty ? "bg-warning/10 text-warning" : "bg-success/10 text-success"), children: gitStatus.dirty ? "有改动" : "干净" })
          ] }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !desktop, onClick: () => setConfigDrawerOpen(true), className: "btn-row shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-3.5 w-3.5" }),
          " 仓库配置"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-xl border border-border bg-surface-elevated p-4 shadow-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-[13px] font-semibold text-foreground", children: "官方 Claude Code" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !desktop || gitBusy !== null, onClick: () => void checkUpstreamUpdates(), className: "btn-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", gitBusy === "checkUpstream" && "animate-spin") }),
            gitBusy === "checkUpstream" ? "检测中…" : "检测官方更新"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !desktop || gitBusy !== null, onClick: () => void pullFromGithub(), className: "btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: cn("h-3.5 w-3.5", gitBusy === "pull" && "animate-pulse") }),
            gitBusy === "pull" ? "同步中…" : "同步官方"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-xl border border-border bg-surface-elevated p-4 shadow-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-[13px] font-semibold text-foreground", children: "个人仓库" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mb-1 block text-[11.5px] font-medium text-foreground/80", children: GIT_PUSH_REASON_LABEL }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: pushReason, onChange: (e) => setPushReason(e.target.value), disabled: !desktop, placeholder: GIT_PUSH_REASON_PLACEHOLDER, rows: 3, spellCheck: false, className: "w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !desktop || gitBusy !== null || !personalGithubRepo.trim() || !gitUserName.trim() || !gitUserEmail.trim(), onClick: () => void pullFromPersonal(), className: "btn-row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: cn("h-3.5 w-3.5", gitBusy === "pullPersonal" && "animate-pulse") }),
              gitBusy === "pullPersonal" ? "拉取中…" : "拉取"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !desktop || gitBusy !== null || !personalGithubRepo.trim() || !gitUserName.trim() || !gitUserEmail.trim(), onClick: () => void pushToPersonal(), className: "btn-row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: cn("h-3.5 w-3.5", gitBusy === "push" && "animate-pulse") }),
              gitBusy === "push" ? "推送中…" : "推送"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground sm:max-w-sm sm:text-right", children: [
            GIT_PUSH_HINT,
            /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { side: "left", children: GIT_PUSH_HINT_DETAIL })
          ] })
        ] })
      ] })
    ] }) }),
    configDrawerOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(GitHubConfigDrawer, { desktop, gitBusy, gitUserName, gitUserEmail, personalGithubRepo, upstreamGithubRepo, gitStatus, onClose: () => setConfigDrawerOpen(false), onGitUserNameChange: setGitUserName, onGitUserEmailChange: setGitUserEmail, onPersonalGithubRepoChange: setPersonalGithubRepo, onUpstreamGithubRepoChange: setUpstreamGithubRepo, onSave: () => void saveGithubSettings() }) : null
  ] });
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
  onSave
}) {
  reactExports.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full max-h-screen w-full max-w-md flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center justify-between border-b border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[14px] font-semibold text-foreground", children: "仓库配置" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: "个人 push / pull 与 Git 身份" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 space-y-4 overflow-y-auto p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mb-1 block text-[11.5px] font-medium text-foreground/80", children: "Git 用户名" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: gitUserName, onChange: (e) => onGitUserNameChange(e.target.value), disabled: !desktop, placeholder: "GitHub 提交者名称", spellCheck: false, className: "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mb-1 block text-[11.5px] font-medium text-foreground/80", children: "Git 邮箱" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: gitUserEmail, onChange: (e) => onGitUserEmailChange(e.target.value), disabled: !desktop, placeholder: "GitHub 账号邮箱", spellCheck: false, className: "h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mb-1 block text-[11.5px] font-medium text-foreground/80", children: "个人仓库 URL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: personalGithubRepo, onChange: (e) => onPersonalGithubRepoChange(e.target.value), disabled: !desktop, placeholder: "https://github.com/你的用户名/repo.git", spellCheck: false, className: "h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mb-1 block text-[11.5px] font-medium text-foreground/80", children: "官方 upstream" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: upstreamGithubRepo, onChange: (e) => onUpstreamGithubRepoChange(e.target.value), disabled: !desktop, spellCheck: false, className: "h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40" })
        ] }),
        gitStatus?.error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] text-destructive", children: gitStatus.error }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "btn-row", children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !desktop || gitBusy !== null, onClick: onSave, className: "btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-3.5 w-3.5" }),
          " ",
          gitBusy === "save" ? "保存中…" : "保存"
        ] })
      ] })
    ] })
  ] });
}
export {
  SettingsPage as component
};
