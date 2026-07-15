import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CNY: "¥",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
};

function currencySymbol(c?: string): string {
  return CURRENCY_SYMBOLS[c || ""] || c || "$";
}

// keys that differ from their symbol (for display hints)
const CURRENCY_LABELS: Record<string, string> = {
  USD: "USD ($)",
  CNY: "CNY (¥)",
  EUR: "EUR (€)",
  JPY: "JPY (¥)",
  GBP: "GBP (£)",
};

type PricingEntryValue = { input: string; output: string; currency?: string };

type Props = {
  open: boolean;
  pricingEntries: Record<string, PricingEntryValue>;
  busy: string | null;
  onClose: () => void;
  onEntriesChange: (
    updater: (prev: Record<string, PricingEntryValue>) => Record<string, PricingEntryValue>,
  ) => void;
  onSave: () => void;
  onFillDefault: () => void;
};

export function PricingManagerDrawer({
  open,
  pricingEntries,
  busy,
  onClose,
  onEntriesChange,
  onSave,
  onFillDefault,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={onClose} />
      <div className="flex w-full max-w-xl flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[14px] font-semibold">模型单价管理</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              设置每个模型的单价，币种从供应商配置继承。再次点击「获取模型单价」将按最新供应商与内置默认价覆盖刷新。
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                <div
                  key={model}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface/50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[12px]">{model}</div>
                    {v.currency && v.currency !== "USD" ? (
                      <div className="mt-0.5 text-[10px] text-yellow-600 dark:text-yellow-400">
                        计价币种：{CURRENCY_LABELS[v.currency] || v.currency}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">币种：USD</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="mb-0.5 text-[10px] text-muted-foreground">
                        输入 {currencySymbol(v.currency)}
                      </div>
                      <input
                        value={v.input}
                        onChange={(e) =>
                          onEntriesChange((prev) => ({
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
                      <div className="mb-0.5 text-[10px] text-muted-foreground">
                        输出 {currencySymbol(v.currency)}
                      </div>
                      <input
                        value={v.output}
                        onChange={(e) =>
                          onEntriesChange((prev) => ({
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
            onClick={onClose}
            className="btn-ghost rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onFillDefault}
            disabled={busy !== null || Object.keys(pricingEntries).length === 0}
            className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            获取模型单价
          </button>
          <button
            type="button"
            disabled={busy !== null || Object.keys(pricingEntries).length === 0}
            onClick={onSave}
            className="btn-gradient-primary rounded-lg px-4 py-1.5 text-[12.5px] font-semibold disabled:opacity-40"
          >
            {busy === "save" ? "保存中…" : "保存单价"}
          </button>
        </div>
      </div>
    </div>
  );
}
