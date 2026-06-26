import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { PageBanner, PageRoot } from "@/components/page-layout";
import {
  Plus,
  Activity,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Circle,
  Server,
  Pencil,
  Power,
  X,
  Search,
} from "lucide-react";
import { InfoHint } from "@/components/info-hint";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { toast } from "sonner";
import {
  BRIDGE_OFFLINE_BANNER,
  BRIDGE_OFFLINE_TOAST,
  MCP_EMPTY_BANNER,
  MCP_INFO_HINT,
  MSG_API_NOT_READY,
  MSG_API_OUTDATED,
  PAGE_DESC,
} from "@/lib/ui-copy";
import {
  MCP_PRESETS,
  MCP_TEMPLATE_ENV,
  type McpPresetMeta,
  resolvePresetCommandLineForForm,
  resolveMcpCommandLine,
} from "@/lib/mcp-presets";

export const Route = createFileRoute("/comms")({
  head: () => ({ meta: [{ title: "MCP 服务器 · Claude Orchestrator" }] }),
  component: McpPage,
});

type Transport = "stdio" | "http" | "sse";

type McpRow = {
  id: string;
  name: string;
  enabled: boolean;
  transport: Transport;
  command: string | null;
  commandBin: string | null;
  args: string[];
  url: string | null;
  env: Record<string, string>;
  status: string;
  last_health_at: string | null;
  healthError: string | null;
};

type DrawerMode = "closed" | "view" | "create" | "edit";

type McpForm = {
  name: string;
  transport: Transport;
  commandLine: string;
  url: string;
  env: Record<string, string>;
};

const EMPTY_FORM: McpForm = { name: "", transport: "stdio", commandLine: "", url: "", env: {} };

type McpTemplate = McpPresetMeta;

/** 内置 MCP 模板（不锁定版本） */
const MCP_TEMPLATES: McpTemplate[] = MCP_PRESETS;

function mcpDisplayName(name: string): string {
  return MCP_PRESETS.find((p) => p.name === name)?.label ?? name;
}

function templateToForm(t: McpTemplate, bundledLines?: Record<string, string>): McpForm {
  return {
    name: t.name,
    transport: "stdio",
    commandLine: resolvePresetCommandLineForForm(t.name, bundledLines) || t.commandLine,
    url: "",
    env: { ...(MCP_TEMPLATE_ENV[t.name] ?? {}) },
  };
}

function buildUpsertPayload(form: McpForm): Parameters<
  NonNullable<ReturnType<typeof getDesktop>["upsertClaudeMcpServer"]>
>[0] | { error: string } {
  const name = form.name.trim();
  if (!name) return { error: "请填写名称" };
  const hasEnv = form.env && Object.keys(form.env).length > 0;
  if (form.transport === "stdio") {
    const parsed = parseStdioCommand(form.commandLine);
    if (!parsed) return { error: "请填写启动命令" };
    const payload: Record<string, unknown> = { name, transport: "stdio", command: parsed.command, args: parsed.args };
    if (hasEnv) payload.env = form.env;
    return payload as Parameters<NonNullable<ReturnType<typeof getDesktop>["upsertClaudeMcpServer"]>>[0];
  }
  const url = form.url.trim();
  if (!url) return { error: "请填写 URL" };
  const payload: Record<string, unknown> = { name, transport: form.transport, url };
  if (hasEnv) payload.env = form.env;
  return payload as Parameters<NonNullable<ReturnType<typeof getDesktop>["upsertClaudeMcpServer"]>>[0];
}

function mcpSaveErrorMessage(error: string | null | undefined): string {
  const msg = error?.trim() || "保存失败";
  if (msg.includes("未知 RPC")) {
    return MSG_API_OUTDATED;
  }
  return msg;
}

function transportLabel(t: Transport): string {
  if (t === "stdio") return "本地命令";
  if (t === "http") return "HTTP";
  if (t === "sse") return "SSE";
  return t;
}

function parseStdioCommand(input: string): { command: string; args: string[] } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts =
    trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((p) => p.replace(/^['"]|['"]$/g, "")) ?? [];
  if (!parts.length) return null;
  return { command: parts[0], args: parts.slice(1) };
}

function applyHealthSnapshot(
  rows: McpRow[],
  snapshot: {
    servers?: Record<
      string,
      { status?: string; error?: string | null; last_health_at?: string | null }
    >;
  } | null,
): McpRow[] {
  const servers = snapshot?.servers;
  if (!servers || typeof servers !== "object") return rows;
  return rows.map((row) => {
    const hit = servers[row.name];
    if (!hit) return row;
    return {
      ...row,
      status: row.enabled ? String(hit.status || "unknown") : "disabled",
      last_health_at: hit.last_health_at ?? row.last_health_at,
      healthError: row.enabled ? hit.error ?? null : null,
    };
  });
}

function mcpServersFromClaudeJson(data: unknown, homeDir = ""): McpRow[] {
  if (!data || typeof data !== "object") return [];
  const ms = (data as { mcpServers?: Record<string, unknown> }).mcpServers;
  if (!ms || typeof ms !== "object") return [];
  return Object.entries(ms).map(([name, cfg]) => {
    const c = cfg && typeof cfg === "object" ? (cfg as Record<string, unknown>) : {};
    const typeRaw = typeof c.type === "string" ? c.type : "stdio";
    const transport: Transport = typeRaw === "http" || typeRaw === "sse" ? typeRaw : "stdio";
    const commandBin = typeof c.command === "string" ? c.command : null;
    const args = Array.isArray(c.args) ? c.args.map(String) : [];
    const url = typeof c.url === "string" ? c.url : null;
    const enabled = c.disabled !== true;
    const envRaw = c.env && typeof c.env === "object" ? (c.env as Record<string, unknown>) : {};
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(envRaw)) {
      if (typeof v === "string") env[k] = v;
    }
    const command =
      transport === "stdio"
        ? resolveMcpCommandLine(name, commandBin, args, homeDir)
        : url;
    return {
      id: `local-${name}`,
      name,
      enabled,
      transport,
      command,
      commandBin,
      args,
      url,
      env,
      status: enabled ? "unknown" : "disabled",
      last_health_at: null,
      healthError: null,
    };
  });
}

function rowToForm(row: McpRow): McpForm {
  return {
    name: row.name,
    transport: row.transport,
    commandLine: row.transport === "stdio" ? row.command ?? "" : "",
    url: row.url ?? "",
    env: row.env ?? {},
  };
}

function McpPage() {
  const hasDesktopApi = useHasDesktop();
  const [rows, setRows] = useState<McpRow[]>([]);
  const [configPath, setConfigPath] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localMissing, setLocalMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("closed");
  const [form, setForm] = useState<McpForm>(EMPTY_FORM);
  const [checking, setChecking] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bundledLines, setBundledLines] = useState<Record<string, string>>({});
  const [refreshingAll, setRefreshingAll] = useState(false);
  const initialLoaded = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const api = getDesktop();
    if (!api?.readClaudeConfigJson) {
      setLocalErr(BRIDGE_OFFLINE_TOAST);
      setRows([]);
      setLoading(false);
      return;
    }
    if (api.bundledMcpCommandLines) {
      const br = await api.bundledMcpCommandLines();
      if (br.ok && br.lines) setBundledLines(br.lines);
    }
    const r = await api.readClaudeConfigJson("mcp.json");
    if (!r.ok) {
      setLocalErr(r.error ?? "读取失败");
      setRows([]);
      setConfigPath(r.path ?? null);
      setLocalMissing(false);
    } else if (r.missing) {
      setLocalMissing(true);
      setLocalErr(null);
      setConfigPath(r.path ?? "~/.claude/mcp.json");
      setRows([]);
    } else {
      setLocalMissing(false);
      setLocalErr(null);
      setConfigPath(r.path ?? null);
      const resolvedHome = typeof r.homeDir === "string" ? r.homeDir : "";
      let nextRows = mcpServersFromClaudeJson(r.data, resolvedHome);
      if (api.mcpGetHealthSnapshot) {
        const snap = await api.mcpGetHealthSnapshot();
        if (snap.ok && snap.snapshot) {
          nextRows = applyHealthSnapshot(nextRows, snap.snapshot);
        }
      }
      setRows(nextRows);
    }
    setLoading(false);
  }, [hasDesktopApi]);

  const closeDrawer = () => {
    setDrawerMode("closed");
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setDrawerMode("create");
    setActiveId(null);
    setForm(EMPTY_FORM);
  };

  const openView = (row: McpRow) => {
    setActiveId(row.id);
    setDrawerMode("view");
    setForm(EMPTY_FORM);
  };

  const openEdit = (row: McpRow) => {
    setDrawerMode("edit");
    setActiveId(row.id);
    setForm(rowToForm(row));
  };

  useEffect(() => {
    void (async () => {
      await load();
      if (!initialLoaded.current) {
        initialLoaded.current = true;
        // 首次加载后自动全量健康检查（不阻塞页面渲染）
        await runHealthCheckAll();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledCount = useMemo(() => rows.filter((r) => r.enabled).length, [rows]);
  const onlineCount = useMemo(() => rows.filter((r) => r.enabled && r.status === "ok").length, [rows]);

  const runHealthCheck = async (row: McpRow) => {
    if (!row.enabled) {
      toast.info(`${row.name} 已停用，请先启用再检查`);
      return;
    }
    setChecking(row.id);
    setRows((arr) =>
      arr.map((item) => (item.id === row.id ? { ...item, status: "checking" } : item)),
    );
    try {
      const api = getDesktop();
      if (!api?.mcpHealthCheckOne) {
        toast.error("当前环境不支持健康检查");
        return;
      }
      const r = await api.mcpHealthCheckOne(row.name);
      if (!r.ok || !r.server) {
        toast.error(r.error || "健康检查失败");
        return;
      }
      if (r.repaired) {
        const detail = r.repairs?.length ? r.repairs.join("；") : "已修正已知配置问题";
        toast.info(`已自动修复 MCP 配置：${detail}`);
      }
      if (r.server.status === "ok") {
        toast.info(`${row.name} 在线`);
      } else {
        toast.error(r.server.error || `${row.name} 异常`);
      }
      setRows((arr) =>
        arr.map((item) =>
          item.id === row.id
            ? {
                ...item,
                status: r.server!.status,
                last_health_at: r.server!.last_health_at ?? new Date().toISOString(),
                healthError: r.server!.error ?? null,
              }
            : item,
        ),
      );
    } finally {
      setChecking(null);
    }
  };

  const runHealthCheckAll = useCallback(async () => {
    const api = getDesktop();
    if (!api?.mcpHealthCheckAll) return;
    setRefreshingAll(true);
    // 将所有启用 MCP 设为 checking 状态
    setRows((arr) => arr.map((r) => (r.enabled ? { ...r, status: "checking" as const } : r)));
    try {
      const r = await api.mcpHealthCheckAll();
      if (r.ok) {
        // 全量检查完成后重新读取快照更新 UI
        await load();
      }
    } finally {
      setRefreshingAll(false);
    }
  }, [load]);

  const persistMcp = useCallback(
    async (payload: Parameters<NonNullable<ReturnType<typeof getDesktop>["upsertClaudeMcpServer"]>>[0]) => {
      const api = getDesktop();
      if (!api?.upsertClaudeMcpServer) {
        toast.error(MSG_API_NOT_READY);
        return { ok: false as const };
      }
      setSaving(true);
      const r = await api.upsertClaudeMcpServer(payload);
      setSaving(false);
      if (!r.ok) {
        toast.error(mcpSaveErrorMessage(r.error));
        return { ok: false as const };
      }
      toast.success(`已添加 ${r.name ?? payload.name}`);
      await load();
      const addedName = r.name ?? payload.name;
      setActiveId(`local-${addedName}`);
      setDrawerMode("view");
      setForm(EMPTY_FORM);
      // 添加后自动触发健康检查
      const healthRow: McpRow = { id: `local-${addedName}`, name: addedName, enabled: true } as McpRow;
      await runHealthCheck(healthRow);
      return { ok: true as const, name: addedName };
    },
    [load, runHealthCheck],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        mcpDisplayName(s.name).toLowerCase().includes(term) ||
        (s.command ?? "").toLowerCase().includes(term) ||
        (s.url ?? "").toLowerCase().includes(term),
    );
  }, [rows, q]);

  const active = rows.find((s) => s.id === activeId) ?? null;

  const saveServer = async () => {
    const built = buildUpsertPayload(form);
    if ("error" in built) {
      toast.warning(built.error);
      return;
    }
    setSaving(true);
    const api = getDesktop();
    if (!api?.upsertClaudeMcpServer) {
      setSaving(false);
      toast.error(MSG_API_NOT_READY);
      return;
    }
    const r = await api.upsertClaudeMcpServer(built);
    setSaving(false);
    if (!r.ok) {
      toast.error(mcpSaveErrorMessage(r.error));
      return;
    }
    toast.success(drawerMode === "create" ? "已添加 MCP 服务器" : "已更新 MCP 服务器");
    setDrawerMode("view");
    setForm(EMPTY_FORM);
    await load();
    setActiveId(`local-${r.name ?? built.name}`);
  };

  const applyTemplate = (template: McpTemplate) => {
    setDrawerMode("create");
    setActiveId(null);
    setForm(templateToForm(template, bundledLines));
  };

  const addTemplate = async (template: McpTemplate) => {
    if (rows.some((r) => r.name === template.name)) {
      toast.info(`${template.name} 已在列表中`);
      setActiveId(`local-${template.name}`);
      setDrawerMode("view");
      return;
    }
    const built = buildUpsertPayload(templateToForm(template, bundledLines));
    if ("error" in built) {
      toast.warning(built.error);
      return;
    }
    await persistMcp(built);
  };

  const removeServer = async (row: McpRow) => {
    const api = getDesktop();
    if (!api?.removeClaudeMcpServer) {
      toast.error(BRIDGE_OFFLINE_TOAST);
      return;
    }
    const r = await api.removeClaudeMcpServer(row.name);
    if (!r.ok) {
      toast.error(r.error || "删除失败");
      return;
    }
    toast.success(`已移除 ${row.name}`);
    if (activeId === row.id) {
      setActiveId(null);
      closeDrawer();
    }
    await load();
  };

  const toggleEnabled = async (row: McpRow, e?: MouseEvent) => {
    e?.stopPropagation();
    const api = getDesktop();
    if (!api?.setClaudeMcpServerEnabled) {
      toast.error(MSG_API_NOT_READY);
      return;
    }
    setToggling(row.id);
    try {
      const nextEnabled = !row.enabled;
      const r = await api.setClaudeMcpServerEnabled({ name: row.name, enabled: nextEnabled });
      if (!r.ok) {
        toast.error(r.error || "操作失败");
        return;
      }
      toast.success(nextEnabled ? `已启用 ${row.name}` : `已停用 ${row.name}`);
      await load();
      if (activeId === row.id) {
        setDrawerMode("view");
      }
      // 启用后自动触发健康检查
      if (nextEnabled) {
        await runHealthCheck({ ...row, enabled: true, id: `local-${row.name}` });
      }
    } finally {
      setToggling(null);
    }
  };

  const drawerOpen = drawerMode !== "closed";

  return (
    <AppShell variant="fill">
      <PageRoot>
        <PageHeader
          title="MCP 服务器"
          description={PAGE_DESC.comms}
          actions={
            <>
              <button
                type="button"
                disabled={!hasDesktopApi || loading || refreshingAll}
                onClick={() => { void load(); void runHealthCheckAll(); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", (loading || refreshingAll) && "animate-spin")} /> {refreshingAll ? "检查中…" : "刷新"}
              </button>
              <button
                type="button"
                disabled={!hasDesktopApi}
                onClick={openCreate}
                className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold shadow-sm disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> 添加
              </button>
              <InfoHint side="left">{MCP_INFO_HINT}</InfoHint>
            </>
          }
        />

        {!hasDesktopApi && (
          <PageBanner className="border-warning/30 bg-warning/10 text-warning">
            {BRIDGE_OFFLINE_BANNER}
          </PageBanner>
        )}
        {hasDesktopApi && !localErr && rows.length === 0 && !loading ? (
          <PageBanner>{MCP_EMPTY_BANNER}</PageBanner>
        ) : null}
        {localErr ? (
          <PageBanner className="border-destructive/30 bg-destructive/10 text-destructive">
            读取配置失败：{localErr}
          </PageBanner>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-7">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <McpStatCard label="服务器" value={rows.length} />
            <McpStatCard label="已启用" value={enabledCount} valueClass="text-success" />
            <McpStatCard label="在线" value={onlineCount} valueClass={onlineCount ? "text-success" : undefined} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索名称或命令…"
                className="h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <span className="text-[12px] text-muted-foreground">
              已配置 <b className="text-foreground">{filtered.length}</b> 个
            </span>
          </div>

          {filtered.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Server className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-[13px] font-medium text-foreground">
                {rows.length === 0 ? "还没有 MCP 服务器" : "没有匹配结果"}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {rows.length === 0 ? "点击添加或使用常用模板" : "试试调整搜索关键词"}
              </p>
              {rows.length === 0 ? (
                <button
                  type="button"
                  disabled={!hasDesktopApi}
                  onClick={openCreate}
                  className="btn-gradient-primary mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-semibold disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> 添加 MCP
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openView(s)}
                  className={cn(
                    "group rounded-xl border bg-surface-elevated p-4 text-left shadow-xs transition hover:border-primary/30",
                    s.enabled ? "border-border" : "border-border opacity-75",
                    activeId === s.id && drawerOpen && "border-primary/40 ring-1 ring-primary/20",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        s.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      <Server className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[12.5px] font-semibold text-foreground">
                          {mcpDisplayName(s.name)}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">({s.name})</span>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {transportLabel(s.transport)}
                        </span>
                        {!s.enabled ? (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            已停用
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
                        {s.command ?? s.url ?? "—"}
                      </p>
                    </div>
                    <span
                      role="button"
                      onClick={(e) => void toggleEnabled(s, e)}
                      className={cn(
                        "cursor-pointer rounded-md p-1.5 transition disabled:opacity-40",
                        s.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary",
                        toggling === s.id && "animate-pulse opacity-60",
                      )}
                      title={s.enabled ? "停用" : "启用"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                    <StatusBadge status={s.status} />
                    <span className="text-[11px] text-muted-foreground">点击查看详情</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {drawerOpen ? (
          <McpDrawer
            mode={drawerMode}
            active={active}
            form={form}
            configPath={configPath}
            rows={rows}
            saving={saving}
            checking={checking}
            toggling={toggling}
            hasDesktopApi={hasDesktopApi}
            onClose={closeDrawer}
            onFormChange={setForm}
            onSave={() => void saveServer()}
            onEdit={active ? () => openEdit(active) : undefined}
            onRemove={active ? () => void removeServer(active) : undefined}
            onHealthCheck={active ? () => void runHealthCheck(active) : undefined}
            onToggleEnabled={active ? () => void toggleEnabled(active) : undefined}
            onApplyTemplate={applyTemplate}
            onAddTemplate={(t) => void addTemplate(t)}
            bundledLines={bundledLines}
          />
        ) : null}
      </PageRoot>
    </AppShell>
  );
}

function McpStatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 shadow-xs">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-[22px] font-bold tracking-tight text-foreground", valueClass)}>{value}</div>
    </div>
  );
}

function McpDrawer({
  mode,
  active,
  form,
  configPath,
  rows,
  saving,
  checking,
  toggling,
  hasDesktopApi,
  onClose,
  onFormChange,
  onSave,
  onEdit,
  onRemove,
  onHealthCheck,
  onToggleEnabled,
  onApplyTemplate,
  onAddTemplate,
  bundledLines,
}: {
  mode: DrawerMode;
  active: McpRow | null;
  form: McpForm;
  configPath: string | null;
  rows: McpRow[];
  saving: boolean;
  checking: string | null;
  toggling: string | null;
  hasDesktopApi: boolean;
  bundledLines: Record<string, string>;
  onClose: () => void;
  onFormChange: (next: McpForm) => void;
  onSave: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onHealthCheck?: () => void;
  onToggleEnabled?: () => void;
  onApplyTemplate: (t: McpTemplate) => void;
  onAddTemplate: (t: McpTemplate) => void;
}) {
  const isForm = mode === "create" || mode === "edit";
  const title =
    mode === "create" ? "添加 MCP 服务器" : mode === "edit" ? `编辑 · ${form.name || "—"}` : active?.name ?? "—";
  const subtitle =
    mode === "create"
      ? "填写后保存，会自动创建或更新本机配置文件"
      : configPath
        ? configPath.replace(/^\/Users\/[^/]+/, "~")
        : "~/.claude/mcp.json";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/25 backdrop-blur-sm" onClick={onClose} />
      <div className="flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Server className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{title}</div>
              <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {isForm ? (
            <>
              {mode === "create" ? (
                <McpTemplatePicker
                  templates={MCP_TEMPLATES}
                  existingNames={rows.map((r) => r.name)}
                  bundledLines={bundledLines}
                  disabled={!hasDesktopApi || saving}
                  onFill={onApplyTemplate}
                  onAdd={onAddTemplate}
                />
              ) : null}
              <McpFormFields
                form={form}
                nameDisabled={mode === "edit"}
                commandPlaceholder={resolvePresetCommandLineForForm(form.name.trim(), bundledLines) || ""}
                onChange={onFormChange}
              />
            </>
          ) : active ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                  <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">传输</div>
                  <div className="mt-0.5 text-[13px] font-semibold">{transportLabel(active.transport)}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                  <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">运行状态</div>
                  <div className="mt-1">
                    <StatusBadge status={active.status} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">启用状态</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className={cn("text-[13px] font-semibold", active.enabled ? "text-success" : "text-muted-foreground")}>
                    {active.enabled ? "已启用" : "已停用"}
                  </span>
                  <button
                    type="button"
                    disabled={toggling === active.id}
                    onClick={onToggleEnabled}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] transition hover:bg-secondary disabled:opacity-40",
                      active.enabled ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    <Power className="h-3 w-3" />
                    {active.enabled ? "停用" : "启用"}
                  </button>
                </div>
              </div>

              {active.status === "error" && active.healthError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] leading-relaxed text-destructive">
                  {active.healthError}
                </div>
              ) : null}

              {active.last_health_at ? (
                <p className="text-[11px] text-muted-foreground">
                  最近检查：{new Date(active.last_health_at).toLocaleString()}
                </p>
              ) : null}

              {active.command ? (
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">启动命令</div>
                  <pre className="overflow-x-auto rounded-lg border border-border bg-code-bg/70 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                    {active.command}
                  </pre>
                </div>
              ) : null}

              {active.url && active.transport !== "stdio" ? (
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">服务 URL</div>
                  <pre className="overflow-x-auto rounded-lg border border-border bg-code-bg/70 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                    {active.url}
                  </pre>
                </div>
              ) : null}

              {active.env && Object.keys(active.env).length > 0 ? (
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">环境变量</div>
                  <div className="space-y-1">
                    {Object.entries(active.env).map(([k, v]) => (
                      <div key={k} className="flex gap-2 rounded border border-border bg-code-bg/40 px-2.5 py-1.5 font-mono text-[11px]">
                        <span className="shrink-0 text-primary">{k}</span>
                        <span className="text-muted-foreground">=</span>
                        <span className="break-all text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          {isForm ? (
            <>
              <button
                type="button"
                disabled={!hasDesktopApi || saving}
                onClick={onSave}
                className="btn-gradient-primary inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40"
              >
                {saving ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-secondary"
              >
                取消
              </button>
            </>
          ) : active ? (
            <>
              <button
                type="button"
                onClick={onHealthCheck}
                disabled={checking === active.id || !active.enabled}
                className="btn-row disabled:opacity-40"
              >
                <Activity className={cn("h-3 w-3", checking === active.id && "animate-pulse")} /> 健康检查
              </button>
              <button type="button" onClick={onEdit} className="btn-row">
                <Pencil className="h-3 w-3" /> 编辑
              </button>
              <button type="button" onClick={onToggleEnabled} disabled={toggling === active.id} className="btn-row">
                <Power className="h-3 w-3" /> {active.enabled ? "停用" : "启用"}
              </button>
              <button type="button" onClick={onRemove} className="btn-row text-destructive">
                <Trash2 className="h-3 w-3" /> 删除
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function McpTemplatePicker({
  templates,
  existingNames,
  bundledLines,
  disabled,
  onFill,
  onAdd,
}: {
  templates: McpTemplate[];
  existingNames: string[];
  bundledLines?: Record<string, string>;
  disabled?: boolean;
  onFill: (t: McpTemplate) => void;
  onAdd: (t: McpTemplate) => void;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-surface-elevated/50 p-3">
      <div className="mb-2 text-[12px] font-medium text-foreground">常用模板</div>
      <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
        点「一键添加」即可，首次使用会自动下载所需组件。
      </p>
      <div className="space-y-2">
        {templates.map((t) => {
          const exists = existingNames.includes(t.name);
          return (
            <div
              key={t.name}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-foreground">
                  {t.label}{" "}
                  <span className="font-mono text-[11px] text-muted-foreground">({t.name})</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                {MCP_TEMPLATE_ENV[t.name] ? (
                  <div className="mt-0.5 text-[10.5px] text-warning/80">
                    需填环境变量：{Object.keys(MCP_TEMPLATE_ENV[t.name]).join("、")}
                  </div>
                ) : null}
                <div className="mt-1 truncate font-mono text-[10.5px] text-foreground/80">
                  {resolvePresetCommandLineForForm(t.name, bundledLines) || t.commandLine}
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onFill(t)}
                className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-secondary disabled:opacity-40"
              >
                填入表单
              </button>
              <button
                type="button"
                disabled={disabled || exists}
                onClick={() => onAdd(t)}
                className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/15 disabled:opacity-40"
              >
                {exists ? "已添加" : "一键添加"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function McpFormFields({
  form,
  nameDisabled,
  commandPlaceholder = "",
  onChange,
}: {
  form: McpForm;
  nameDisabled?: boolean;
  commandPlaceholder?: string;
  onChange: (next: McpForm) => void;
}) {
  return (
    <div className="space-y-3 text-[12px]">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">名称</label>
        <input
          value={form.name}
          disabled={nameDisabled}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="filesystem"
          className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono outline-none focus:border-primary disabled:opacity-60"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">字母开头，可含数字、-、_</p>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">连接方式</label>
        <select
          value={form.transport}
          onChange={(e) =>
            onChange({ ...form, transport: e.target.value as Transport })
          }
          className="h-9 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary"
        >
          <option value="stdio">本地命令（推荐）</option>
          <option value="http">网络地址 http</option>
          <option value="sse">网络地址 sse</option>
        </select>
      </div>
      {form.transport === "stdio" ? (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">启动命令</label>
          <textarea
            value={form.commandLine}
            onChange={(e) => onChange({ ...form, commandLine: e.target.value })}
            rows={3}
            placeholder={commandPlaceholder || "例如 npx -y @modelcontextprotocol/server-memory"}
            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            保存后写入本机 mcp.json；内置模板默认使用最新包版本。
          </p>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">服务 URL</label>
          <input
            value={form.url}
            onChange={(e) => onChange({ ...form, url: e.target.value })}
            placeholder="https://example.com/mcp"
            className="h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono outline-none focus:border-primary"
          />
        </div>
      )}
      {/* 环境变量 */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">环境变量</label>
          <button
            type="button"
            onClick={() => {
              const next = { ...form.env };
              const key = `VAR_${Object.keys(next).length}`;
              next[key] = "";
              onChange({ ...form, env: next });
            }}
            className="text-[11px] text-primary hover:underline"
          >
            + 添加
          </button>
        </div>
        {Object.keys(form.env).length === 0 ? (
          <p className="text-[11px] text-muted-foreground/60">（可选）无环境变量</p>
        ) : (
          <div className="space-y-1.5">
            {Object.entries(form.env).map(([k, v], i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  value={k}
                  onChange={(e) => {
                    const next = { ...form.env };
                    delete next[k];
                    next[e.target.value] = v;
                    onChange({ ...form, env: next });
                  }}
                  placeholder="KEY"
                  className="h-7 w-2/5 rounded border border-border bg-surface px-2 font-mono text-[11px] outline-none focus:border-primary"
                />
                <input
                  value={v}
                  onChange={(e) => {
                    const next = { ...form.env, [k]: e.target.value };
                    onChange({ ...form, env: next });
                  }}
                  placeholder="VALUE"
                  className="h-7 flex-1 rounded border border-border bg-surface px-2 font-mono text-[11px] outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...form.env };
                    delete next[k];
                    onChange({ ...form, env: next });
                  }}
                  className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                  title="删除"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "disabled")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
        <Power className="h-3 w-3" /> 已停用
      </span>
    );
  if (status === "checking")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" /> 检查中
      </span>
    );
  if (status === "ok")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[10.5px] font-medium text-success">
        <CheckCircle2 className="h-3 w-3" /> 在线
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10.5px] font-medium text-destructive">
        <AlertCircle className="h-3 w-3" /> 异常
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
      <Circle className="h-3 w-3" /> 未知
    </span>
  );
}
