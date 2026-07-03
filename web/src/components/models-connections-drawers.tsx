import { useCallback, type ReactNode } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CNY: "¥",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
};

function currencySymbol(c: string): string {
  return CURRENCY_SYMBOLS[c] || c || "$";
}

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  云模型供应商编辑/新建抽屉                                             */
/* ------------------------------------------------------------------ */

export type CloudForm = {
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
  currency: string;
};

type CloudDrawerProps = {
  drawer: "closed" | "cloud-create" | "cloud-edit" | "local";
  cloudForm: CloudForm;
  editingProviderId: string | null;
  prevApiKeyPreview: string;
  fetchingModels: boolean;
  fetchModelsError: string;
  busy: string | null;
  providerOptions: {
    name: string;
    needsCcr: boolean;
    defaultEndpoint?: string;
    defaultInputPrice?: number;
    defaultOutputPrice?: number;
    canFetchModels?: boolean;
  }[];
  providerCustomOpen: boolean;
  onClose: () => void;
  onFormChange: (patch: Partial<CloudForm>) => void;
  onFetchModels: () => void;
  onSave: () => void;
  onToggleCustom: (open: boolean) => void;
  onSelectPreset: (name: string) => void;
};

export function CloudProviderDrawer({
  drawer,
  cloudForm,
  editingProviderId,
  prevApiKeyPreview,
  fetchingModels,
  fetchModelsError,
  busy,
  providerOptions,
  providerCustomOpen,
  onClose,
  onFormChange,
  onFetchModels,
  onSave,
  onToggleCustom,
  onSelectPreset,
}: CloudDrawerProps) {
  const isOpen = drawer === "cloud-create" || drawer === "cloud-edit";
  if (!isOpen) return null;

  const isEditing = Boolean(editingProviderId);

  const handlePresetSelect = useCallback(
    (value: string) => {
      if (value === "__custom__") {
        onFormChange({ name: "", endpoint: "https://" });
        onToggleCustom(true);
      } else {
        onToggleCustom(false);
        onSelectPreset(value);
      }
    },
    [onFormChange, onSelectPreset, onToggleCustom],
  );

  return (
    <FormFrame
      title={
        drawer === "cloud-create" ? "添加云模型" : `编辑 · ${cloudForm.name || editingProviderId}`
      }
      subtitle="保存到项目并合并到聊天页云模型列表"
      busy={busy}
      onClose={onClose}
      onSave={onSave}
      saveLabel={busy === "save" ? "保存中…" : "保存"}
    >
      <FormField label="供应商名称">
        {!providerCustomOpen || isEditing ? (
          <select
            value={cloudForm.name}
            onChange={(e) => handlePresetSelect(e.target.value)}
            disabled={isEditing}
            className={cn(inputClass, isEditing && "cursor-not-allowed bg-muted/40")}
          >
            {isEditing && !providerOptions.some((p) => p.name === cloudForm.name) ? (
              <option value={cloudForm.name}>{cloudForm.name}</option>
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
            {!isEditing ? <option value="__custom__">其他（自定义）</option> : null}
          </select>
        ) : null}
        {providerCustomOpen && !isEditing ? (
          <input
            value={cloudForm.name}
            onChange={(e) => onFormChange({ name: e.target.value })}
            placeholder="输入自定义供应商名称"
            className={cn(inputClass, "mt-2")}
            autoFocus
          />
        ) : null}
      </FormField>

      <FormField label="供应商 ID（可选）">
        <input
          value={cloudForm.providerId}
          onChange={(e) => onFormChange({ providerId: e.target.value })}
          placeholder="yunmeng-claude"
          readOnly={isEditing}
          className={cn(inputClass, isEditing && "cursor-not-allowed bg-muted/40")}
        />
      </FormField>

      <FormField label="API 端点">
        <input
          value={cloudForm.endpoint}
          onChange={(e) => onFormChange({ endpoint: e.target.value })}
          placeholder="https://api.example.com"
          className={cn(inputClass, "font-mono text-[12px]")}
        />
      </FormField>

      <FormField label="API Key">
        <input
          type="password"
          value={cloudForm.apiKey}
          onChange={(e) => onFormChange({ apiKey: e.target.value })}
          onFocus={() => {
            if (isEditing && prevApiKeyPreview && cloudForm.apiKey === prevApiKeyPreview) {
              onFormChange({ apiKey: "" });
            }
          }}
          onBlur={() => {
            if (isEditing && prevApiKeyPreview && !cloudForm.apiKey.trim()) {
              onFormChange({ apiKey: prevApiKeyPreview });
            }
          }}
          placeholder={isEditing ? "留空保留原 Key" : "sk-…"}
          autoComplete="off"
          className={cn(inputClass, "font-mono text-[12px]")}
        />
        {isEditing && prevApiKeyPreview ? (
          <span className="text-[11px] text-muted-foreground">已配置 Key，留空保留原 Key</span>
        ) : null}
      </FormField>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={fetchingModels || busy !== null}
          onClick={onFetchModels}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium transition hover:bg-secondary disabled:opacity-40"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", fetchingModels && "animate-spin")} />
          {fetchingModels ? "获取中…" : "自动获取模型列表"}
        </button>
        {fetchModelsError ? (
          <span className="text-[11px] text-destructive">{fetchModelsError}</span>
        ) : null}
      </div>

      <FormField label="默认模型 ID">
        <input
          value={cloudForm.defaultModel}
          onChange={(e) => onFormChange({ defaultModel: e.target.value })}
          placeholder="deepseek-chat"
          className={cn(inputClass, "font-mono text-[12px]")}
        />
      </FormField>

      <FormField label="额外模型 ID（逗号分隔）">
        <input
          value={cloudForm.extraModels}
          onChange={(e) => onFormChange({ extraModels: e.target.value })}
          placeholder="model-a, model-b"
          className={cn(inputClass, "font-mono text-[12px]")}
        />
      </FormField>

      <FormField label="币种（单价以该币种计价）">
        <select
          value={cloudForm.currency}
          onChange={(e) => onFormChange({ currency: e.target.value })}
          className={cn(inputClass, "font-mono text-[12px]")}
        >
          <option value="USD">USD ($)</option>
          <option value="CNY">CNY (¥)</option>
          <option value="EUR">EUR (€)</option>
          <option value="JPY">JPY (¥)</option>
          <option value="GBP">GBP (£)</option>
        </select>
        <div className="mt-1 text-[10.5px] text-muted-foreground">
          所选币种仅用于输入单价，实际费用按 USD 换算后展示
        </div>
      </FormField>

      <FormField
        label={`输入单价 ${currencySymbol(cloudForm.currency)}/1M tokens（留空使用供应商默认）`}
      >
        <input
          value={cloudForm.inputPrice}
          onChange={(e) => onFormChange({ inputPrice: e.target.value })}
          placeholder="留空自动"
          type="number"
          step="0.01"
          min="0"
          className={cn(inputClass, "font-mono text-[12px]")}
        />
      </FormField>

      <FormField
        label={`输出单价 ${currencySymbol(cloudForm.currency)}/1M tokens（留空使用供应商默认）`}
      >
        <input
          value={cloudForm.outputPrice}
          onChange={(e) => onFormChange({ outputPrice: e.target.value })}
          placeholder="留空自动"
          type="number"
          step="0.01"
          min="0"
          className={cn(inputClass, "font-mono text-[12px]")}
        />
      </FormField>

      <label className="flex cursor-pointer items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={cloudForm.setAsCurrent}
          onChange={(e) => onFormChange({ setAsCurrent: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        保存后立即设为当前 Claude Code 供应商
      </label>
    </FormFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  本地模型配置抽屉                                                     */
/* ------------------------------------------------------------------ */

export type LocalTestState = {
  status: "idle" | "testing" | "ok" | "fail";
  message: string;
  discovered: string[];
};

type LocalDrawerProps = {
  drawer: "closed" | "cloud-create" | "cloud-edit" | "local";
  ollamaBase: string;
  localTest: LocalTestState;
  localPick: Set<string>;
  localModelCatalog: string[];
  localCatalogSet: Set<string>;
  busy: string | null;
  onClose: () => void;
  onOllamaBaseChange: (val: string) => void;
  onTestConnection: () => void;
  onTogglePick: (model: string) => void;
  onSelectAllPick: () => void;
  onClearPick: () => void;
  onFinish: () => void;
};

export function LocalModelDrawer({
  drawer,
  ollamaBase,
  localTest,
  localPick,
  localModelCatalog,
  localCatalogSet,
  busy,
  onClose,
  onOllamaBaseChange,
  onTestConnection,
  onTogglePick,
  onSelectAllPick,
  onClearPick,
  onFinish,
}: LocalDrawerProps) {
  if (drawer !== "local") return null;

  return (
    <FormFrame
      title="配置本地模型"
      subtitle="测试 Ollama 连接后，勾选模型并点击完成添加到列表"
      busy={busy}
      onClose={onClose}
      onSave={onFinish}
      saveLabel={busy === "local" ? "保存中…" : "完成"}
    >
      <FormField label="Ollama 服务地址">
        <input
          value={ollamaBase}
          onChange={(e) => {
            onOllamaBaseChange(e.target.value);
          }}
          className={cn(inputClass, "font-mono text-[12px]")}
        />
      </FormField>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={onTestConnection}
          className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", localTest.status === "testing" && "animate-spin")}
          />
          测试连接
        </button>
      </div>

      {localTest.status !== "idle" ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-[12px]",
            localTest.status === "ok" && "border-success/30 bg-success/10 text-success",
            localTest.status === "fail" &&
              "border-destructive/30 bg-destructive/10 text-destructive",
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
                onClick={onSelectAllPick}
                className="text-primary hover:underline disabled:opacity-40"
              >
                全选未添加
              </button>
              <button
                type="button"
                disabled={busy !== null || localPick.size === 0}
                onClick={onClearPick}
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
                    onChange={() => onTogglePick(model)}
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
    </FormFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  共用的抽屉框架 — 遮罩层 + 侧栏 + 底部操作栏                          */
/* ------------------------------------------------------------------ */

function FormFrame({
  title,
  subtitle,
  busy,
  onClose,
  onSave,
  saveLabel,
  children,
}: {
  title: string;
  subtitle: string;
  busy: string | null;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={onClose} />
      <div className="flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[13px] font-semibold text-foreground">{title}</div>
            <div className="text-[11px] text-muted-foreground">{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">{children}</div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] hover:bg-secondary"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={onSave}
            className="btn-gradient-primary rounded-lg px-4 py-1.5 text-[12.5px] font-semibold disabled:opacity-40"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
