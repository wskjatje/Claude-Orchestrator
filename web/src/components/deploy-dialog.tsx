import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, CircleAlert, Info, Loader2, Play, RefreshCw, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { toast } from "sonner";

type CheckItem = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
  hint: string;
};

type Phase = "idle" | "checking" | "installing" | "done";

const IconOk = () => <Check className="h-3.5 w-3.5 text-emerald-500" />;
const IconWarn = () => <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />;
const IconError = () => <CircleAlert className="h-3.5 w-3.5 text-red-500" />;
const IconSpin = () => <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;

function StatusIcon({ status }: { status: CheckItem["status"] }) {
  if (status === "ok") return <IconOk />;
  if (status === "warn") return <IconWarn />;
  return <IconError />;
}

function CheckRow({ item, phase }: { item: CheckItem; phase: Phase }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[12px]",
        item.status === "ok" && "border-emerald-500/20 bg-emerald-500/5",
        item.status === "warn" && "border-amber-500/20 bg-amber-500/10",
        item.status === "error" && "border-red-500/20 bg-red-500/10",
        phase === "checking" && "animate-pulse",
      )}
    >
      {phase === "checking" && true ? <IconSpin /> : <StatusIcon status={item.status} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-foreground">{item.label}</span>
          <span
            className={cn(
              "font-mono text-[11px]",
              item.status === "ok" && "text-emerald-600",
              item.status === "warn" && "text-amber-600",
              item.status === "error" && "text-red-600",
            )}
          >
            {item.detail}
          </span>
        </div>
        {item.hint && (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.hint}</p>
        )}
      </div>
    </div>
  );
}

type LogLine = string;

function LogBlock({ logs }: { logs: LogLine[] }) {
  if (!logs.length) return null;
  return (
    <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-surface-elevated p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
      {logs.map((line, i) => (
        <div key={i} className={cn(line.startsWith("  ✓") && "text-emerald-600", line.startsWith("  ✗") && "text-red-500")}>
          {line}
        </div>
      ))}
    </div>
  );
}

export function DeployDialog({
  open,
  onOpenChange,
  onReady,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 环境就绪后的回调（部署个人仓库等后续操作） */
  onReady?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const busy = phase === "checking" || phase === "installing";
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollLogs = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 滚动到底部
  useEffect(() => {
    if (logs.length) scrollLogs();
  }, [logs.length]);

  const runCheck = useCallback(async () => {
    const api = getDesktop();
    if (!api?.envDeployCheck) {
      toast.error("当前环境未加载部署检查功能");
      return;
    }
    setPhase("checking");
    setError(null);
    setLogs([]);
    setSummary(null);

    try {
      const r = await api.envDeployCheck();
      setChecks(r.checks || []);
      setPhase("done");
      if (!r.ok) {
        setSummary(`发现 ${r.summary.error} 项问题，${r.summary.warn} 项警告`);
      } else {
        setSummary(r.summary.warn > 0 ? `全部通过（${r.summary.warn} 项警告）` : "全部通过，环境就绪");
      }
    } catch (e) {
      setPhase("done");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const runInstall = useCallback(async () => {
    const api = getDesktop();
    if (!api?.envDeployInstall) return;

    setPhase("installing");
    setError(null);
    setLogs([]);

    try {
      const r = await api.envDeployInstall();
      if (r.logs) setLogs(r.logs);
      if (r.error) setError(r.error);
      setSummary(r.summary || null);
      // 安装后更新检查结果
      if (r.recheck) setChecks(r.recheck);
      setPhase("done");
      if (r.ok) {
        toast.success("依赖安装完成");
      } else {
        toast.warning("部分依赖安装失败，请查看日志");
      }
    } catch (e) {
      setPhase("done");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // 打开时自动检查
  useEffect(() => {
    if (open && phase === "idle") {
      void runCheck();
    }
  }, [open, phase, runCheck]);

  // 重置
  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setChecks([]);
      setLogs([]);
      setError(null);
      setSummary(null);
    }
  }, [open]);

  const needsInstall = checks.some((c) => c.status === "error" || c.status === "warn");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            部署到本地
          </DialogTitle>
          <DialogDescription>
            自动检查项目环境依赖，确保可以正常使用。需要依赖完整才能运行 Web UI 和桌面端。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* 检查结果 */}
          {checks.length > 0 && (
            <div className="space-y-2">
              {checks.map((c) => (
                <CheckRow key={c.id} item={c} phase={phase} />
              ))}
            </div>
          )}

          {/* 摘要 */}
          {summary && (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-[12px]",
                error ? "border-red-500/20 bg-red-500/10 text-red-600" : "border-border/70 bg-secondary/30 text-foreground",
              )}
            >
              {error ? (
                <div className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{summary}</span>
                </div>
              )}
            </div>
          )}

          {/* 安装日志 */}
          <LogBlock logs={logs} />
          <div ref={logsEndRef} />
        </div>

        {/* 按钮组 */}
        <div className="flex items-center justify-end gap-2">
          {busy ? (
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {phase === "checking" ? "检查中…" : "安装中…"}
            </span>
          ) : (
            <>
              {checks.length > 0 && (
                <button
                  type="button"
                  onClick={() => void runCheck()}
                  disabled={busy}
                  className="btn-row"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重新检查
                </button>
              )}
              {phase === "done" && needsInstall && (
                <button
                  type="button"
                  onClick={() => void runInstall()}
                  disabled={busy}
                  className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                >
                  <Play className="h-3.5 w-3.5" />
                  安装缺失依赖
                </button>
              )}
              {phase === "done" && !needsInstall && (
                <>
                  {onReady ? (
                    <button
                      type="button"
                      onClick={() => { onReady(); onOpenChange(false); }}
                      className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                    >
                      <Play className="h-3.5 w-3.5" />
                      继续
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                    >
                      <X className="h-3.5 w-3.5" />
                      关闭
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
