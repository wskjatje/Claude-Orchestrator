import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, ChevronDown, ChevronUp, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBridge } from "@/hooks/use-bridge";
import { getDesktop, hasDesktop, isWebBridge } from "@/lib/desktop-api";
import { loadUiPrefsFromProjectDb, saveUiPrefsToProjectDb } from "@/lib/ui-prefs";
import { pingWebBridgeHealth } from "@/lib/install-desktop-bridge";
import { toast } from "sonner";
import { MSG_BRIDGE_OFFLINE, OPENCLAW_TOKEN_PLACEHOLDER, OPENCLAW_TOKEN_UNAVAILABLE } from "@/lib/ui-copy";

const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:18789";

export function OverviewBridgeBar() {
  const bridge = useBridge();
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
  const [bridgeToken, setBridgeToken] = useState("");
  const [tokenHint, setTokenHint] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [localSecret, setLocalSecret] = useState("");
  const [defaultSessionTag, setDefaultSessionTag] = useState("claude:main");
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const [doctorRunning, setDoctorRunning] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [doctorOutput, setDoctorOutput] = useState("");

  useEffect(() => {
    if (!hasDesktop()) return;
    void loadUiPrefsFromProjectDb().then((prefs) => {
      setBridgeUrl(prefs.bridgeUrl || DEFAULT_BRIDGE_URL);
      setLocalSecret(prefs.localSecret || "");
      setDefaultSessionTag(prefs.defaultSessionTag || "claude:main");
    });
  }, []);

  const loadGatewayToken = useCallback(async () => {
    const api = getDesktop();
    if (!api?.getOpenclawGatewayToken) {
      setTokenHint(OPENCLAW_TOKEN_UNAVAILABLE);
      return "";
    }
    const r = await api.getOpenclawGatewayToken();
    if (r.ok && r.token) {
      setBridgeToken(r.token);
      setTokenHint("已自动读取本机 OpenClaw 网关令牌。");
      return r.token;
    }
    setTokenHint(`自动读取失败：${r.error || "未知错误"}（可手动输入）`);
    return "";
  }, []);

  useEffect(() => {
    if (!hasDesktop()) return;
    void loadGatewayToken();
  }, [loadGatewayToken]);

  const buildBridgeUrlWithToken = useCallback((rawUrl: string, rawToken: string) => {
    const u = rawUrl.trim();
    const token = rawToken.trim();
    if (!u) return u;
    try {
      const parsed = new URL(u);
      if (token) parsed.searchParams.set("token", token);
      else parsed.searchParams.delete("token");
      return parsed.toString();
    } catch {
      return u;
    }
  }, []);

  const persistOverviewPrefs = useCallback(
    async (patch?: { bridgeUrl?: string; localSecret?: string; defaultSessionTag?: string }) => {
      await saveUiPrefsToProjectDb({
        bridgeUrl: patch?.bridgeUrl ?? bridgeUrl,
        localSecret: patch?.localSecret ?? localSecret,
        defaultSessionTag: patch?.defaultSessionTag ?? defaultSessionTag,
      });
    },
    [bridgeUrl, localSecret, defaultSessionTag],
  );

  const connectBridge = useCallback(async () => {
    await persistOverviewPrefs();
    if (isWebBridge()) {
      const ok = await pingWebBridgeHealth();
      toast[ok ? "success" : "error"](
        ok ? "本机服务已连接" : MSG_BRIDGE_OFFLINE,
        { id: "overview-bridge" },
      );
      return;
    }
    const latest = await loadGatewayToken();
    const finalToken = (latest || bridgeToken).trim();
    bridge.setUrl(buildBridgeUrlWithToken(bridgeUrl, finalToken));
      toast.success("已保存连接地址", { id: "overview-bridge" });
  }, [bridge, bridgeToken, bridgeUrl, buildBridgeUrlWithToken, loadGatewayToken, persistOverviewPrefs]);

  const runDoctor = useCallback(async () => {
    const api = getDesktop();
    if (!api?.claudeCodeDoctor) {
      toast.error("诊断工具不可用，请先连接本机服务");
      return;
    }
    setDoctorRunning(true);
    setDoctorOpen(true);
    setDoctorOutput("正在运行 claude doctor…");
    try {
      const r = await api.claudeCodeDoctor();
      setDoctorOutput(r.content?.trim() || r.error?.trim() || "（无输出）");
      if (!r.ok) toast.warning(r.error || "doctor 检查未完全通过");
      else toast.success("doctor 检查完成");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDoctorOutput(msg);
      toast.error(msg);
    } finally {
      setDoctorRunning(false);
    }
  }, []);

  const status = bridge.online ? "在线" : bridge.connecting ? "连接中" : "离线";
  const statusColor = bridge.online ? "bg-success" : bridge.connecting ? "bg-warning" : "bg-muted-foreground/40";
  const statusText = bridge.online ? "text-success" : bridge.connecting ? "text-warning" : "text-muted-foreground";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xs">
      <div className="border-b border-border/60 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">本机服务</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">连接状态与 Claude Code 健康检查</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {bridge.online && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            )}
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", statusColor)} />
          </span>
          <span className={cn("text-[13px] font-semibold", statusText)}>本机服务 {status}</span>
        </div>
        <div className="hidden h-4 w-px bg-border md:block" />
        <code className="max-w-[12rem] truncate font-mono text-[12px] text-muted-foreground sm:max-w-xs">
          {bridgeUrl}
        </code>
        <span className="hidden text-[11.5px] text-muted-foreground lg:inline">
          {bridge.version ?? "未知"} · 心跳 {isWebBridge() ? "4" : "10"} 秒
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void connectBridge()}
            className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-glow"
          >
            {bridge.online ? "重新连接" : "连接"}
          </button>
          <button
            type="button"
            disabled={!hasDesktop() || doctorRunning}
            onClick={() => void runDoctor()}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <Stethoscope className={cn("h-3.5 w-3.5", doctorRunning && "animate-pulse")} />
            claude doctor
          </button>
          <button
            type="button"
            onClick={() => setBridgeOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            高级 {bridgeOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>
      {doctorOpen && (
        <div className="border-t border-border bg-surface/40 px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-foreground">claude doctor 输出</span>
            <button
              type="button"
              onClick={() => setDoctorOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              收起
            </button>
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-secondary/30 p-3 font-mono text-[11px] text-foreground/85">
            {doctorOutput || "（无输出）"}
          </pre>
        </div>
      )}
      {bridgeOpen && (
        <div className="grid grid-cols-1 gap-3 border-t border-border bg-surface/40 px-5 py-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="WebSocket 地址">
            <input
              type="text"
              value={bridgeUrl}
              onChange={(e) => setBridgeUrl(e.target.value)}
              onBlur={() => void persistOverviewPrefs({ bridgeUrl })}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>
          <Field label="桥接令牌">
            <SecretInput
              show={showToken}
              onToggle={() => setShowToken(!showToken)}
              value={bridgeToken}
              onChange={setBridgeToken}
              placeholder={isWebBridge() ? OPENCLAW_TOKEN_PLACEHOLDER : "自动读取 ~/.openclaw/openclaw.json"}
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-muted-foreground">
                {tokenHint || "优先自动读取本机 gateway.auth.token。"}
              </span>
              {!isWebBridge() && (
                <button
                  type="button"
                  onClick={() => void loadGatewayToken()}
                  className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary"
                >
                  自动获取
                </button>
              )}
            </div>
          </Field>
          <Field label="本机密码（不上传）">
            <SecretInput
              show={showSecret}
              onToggle={() => setShowSecret(!showSecret)}
              value={localSecret}
              onChange={setLocalSecret}
              onBlur={() => void persistOverviewPrefs({ localSecret })}
              placeholder="系统或共享密码"
            />
          </Field>
          <Field label="默认会话标签">
            <input
              type="text"
              value={defaultSessionTag}
              onChange={(e) => setDefaultSessionTag(e.target.value)}
              onBlur={() => void persistOverviewPrefs({ defaultSessionTag })}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SecretInput({
  show,
  onToggle,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  show: boolean;
  onToggle: () => void;
  value?: string;
  onChange?: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-surface px-3 pr-9 font-mono text-[12px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:text-foreground"
      >
        {show ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
