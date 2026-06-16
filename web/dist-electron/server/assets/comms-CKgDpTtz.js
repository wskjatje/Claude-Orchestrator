import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Co3Cn06u.js";
import { A as AppShell, P as PageHeader, S as Search, e as Server } from "./app-shell-DfKeMRG5.js";
import { P as PageRoot, e as PageBanner } from "./page-layout-p7fHu6c0.js";
import { I as InfoHint } from "./info-hint-DBFq4Cb3.js";
import { b as useHasDesktop, B as BRIDGE_OFFLINE_TOAST, t as toast, a5 as MSG_API_NOT_READY, P as PAGE_DESC, e as cn, a6 as MCP_INFO_HINT, w as BRIDGE_OFFLINE_BANNER, a7 as MCP_EMPTY_BANNER, g as getDesktop, a8 as MSG_API_OUTDATED } from "./router-CCRumuR1.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
import { P as Plus } from "./plus-CUtIIuQz.js";
import { P as Power } from "./power-DJyGZDzR.js";
import { C as CircleCheck, a as CircleAlert } from "./circle-check-jaO9U0RF.js";
import { C as Circle } from "./circle-gfZSUK0O.js";
import { X } from "./x-CgW_RKjX.js";
import { A as Activity } from "./activity-CjqKWzj-.js";
import { P as Pencil } from "./pencil-hgqqcg0M.js";
import { T as Trash2 } from "./trash-2-BpzVwa3Q.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const MCP_PRESET_COMMAND_LINES = {
  filesystem: "npx -y @modelcontextprotocol/server-filesystem ~/",
  fetch: "uvx mcp-server-fetch",
  memory: "npx -y @modelcontextprotocol/server-memory",
  sanshengliubu: "node __BUNDLED_SANSHENGLIUBU__"
};
const MCP_PRESETS = [
  {
    name: "filesystem",
    label: "文件系统",
    desc: "读写本机目录（默认 ~/）",
    commandLine: MCP_PRESET_COMMAND_LINES.filesystem
  },
  {
    name: "fetch",
    label: "网页抓取",
    desc: "获取网页正文（需安装 uv）",
    commandLine: MCP_PRESET_COMMAND_LINES.fetch
  },
  {
    name: "memory",
    label: "记忆",
    desc: "记住对话里的重要信息",
    commandLine: MCP_PRESET_COMMAND_LINES.memory
  },
  {
    name: "sanshengliubu",
    label: "三省六部",
    desc: "编排底层工具：local_time、Agent 索引、治理顺序",
    commandLine: MCP_PRESET_COMMAND_LINES.sanshengliubu
  }
];
function collapseHomeInToken(token, homeDir) {
  if (!homeDir) return token;
  if (token === homeDir) return "~";
  if (token.startsWith(`${homeDir}/`)) return `~/${token.slice(homeDir.length + 1)}`;
  return token;
}
function formatStdioCommandLine(command, args, homeDir = "") {
  if (!command) return "";
  const parts = [command, ...args.map((a) => collapseHomeInToken(String(a), homeDir))];
  return parts.join(" ");
}
function resolveMcpCommandLine(name, commandBin, args, homeDir = "") {
  const raw = formatStdioCommandLine(commandBin, args, homeDir);
  if (/@modelcontextprotocol\/server-fetch\b/.test(raw)) {
    return MCP_PRESET_COMMAND_LINES.fetch;
  }
  if (name === "fetch" && commandBin === "npx") {
    return MCP_PRESET_COMMAND_LINES.fetch;
  }
  if (name === "filesystem" && /@modelcontextprotocol\/server-filesystem/.test(raw)) {
    return MCP_PRESET_COMMAND_LINES.filesystem;
  }
  if (name === "memory" && /@modelcontextprotocol\/server-memory/.test(raw)) {
    return MCP_PRESET_COMMAND_LINES.memory;
  }
  return raw;
}
function presetCommandLine(name, bundledLines) {
  if (name === "sanshengliubu" && bundledLines?.sanshengliubu) {
    return bundledLines.sanshengliubu;
  }
  return MCP_PRESET_COMMAND_LINES[name];
}
function resolvePresetCommandLineForForm(name, bundledLines) {
  const line = presetCommandLine(name, bundledLines);
  if (line && line !== MCP_PRESET_COMMAND_LINES.sanshengliubu) return line;
  if (name === "sanshengliubu" && bundledLines?.sanshengliubu) return bundledLines.sanshengliubu;
  return line ?? "";
}
const EMPTY_FORM = {
  name: "",
  transport: "stdio",
  commandLine: "",
  url: ""
};
const MCP_TEMPLATES = MCP_PRESETS;
function mcpDisplayName(name) {
  return MCP_PRESETS.find((p) => p.name === name)?.label ?? name;
}
function templateToForm(t, bundledLines) {
  return {
    name: t.name,
    transport: "stdio",
    commandLine: resolvePresetCommandLineForForm(t.name, bundledLines) || t.commandLine,
    url: ""
  };
}
function buildUpsertPayload(form) {
  const name = form.name.trim();
  if (!name) return {
    error: "请填写名称"
  };
  if (form.transport === "stdio") {
    const parsed = parseStdioCommand(form.commandLine);
    if (!parsed) return {
      error: "请填写启动命令"
    };
    return {
      name,
      transport: "stdio",
      command: parsed.command,
      args: parsed.args
    };
  }
  const url = form.url.trim();
  if (!url) return {
    error: "请填写 URL"
  };
  return {
    name,
    transport: form.transport,
    url
  };
}
function mcpSaveErrorMessage(error) {
  const msg = error?.trim() || "保存失败";
  if (msg.includes("未知 RPC")) {
    return MSG_API_OUTDATED;
  }
  return msg;
}
function transportLabel(t) {
  if (t === "stdio") return "本地命令";
  if (t === "http") return "HTTP";
  if (t === "sse") return "SSE";
  return t;
}
function parseStdioCommand(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((p) => p.replace(/^['"]|['"]$/g, "")) ?? [];
  if (!parts.length) return null;
  return {
    command: parts[0],
    args: parts.slice(1)
  };
}
function applyHealthSnapshot(rows, snapshot) {
  const servers = snapshot?.servers;
  if (!servers || typeof servers !== "object") return rows;
  return rows.map((row) => {
    const hit = servers[row.name];
    if (!hit) return row;
    return {
      ...row,
      status: row.enabled ? String(hit.status || "unknown") : "disabled",
      last_health_at: hit.last_health_at ?? row.last_health_at,
      healthError: row.enabled ? hit.error ?? null : null
    };
  });
}
function mcpServersFromClaudeJson(data, homeDir = "") {
  if (!data || typeof data !== "object") return [];
  const ms = data.mcpServers;
  if (!ms || typeof ms !== "object") return [];
  return Object.entries(ms).map(([name, cfg]) => {
    const c = cfg && typeof cfg === "object" ? cfg : {};
    const typeRaw = typeof c.type === "string" ? c.type : "stdio";
    const transport = typeRaw === "http" || typeRaw === "sse" ? typeRaw : "stdio";
    const commandBin = typeof c.command === "string" ? c.command : null;
    const args = Array.isArray(c.args) ? c.args.map(String) : [];
    const url = typeof c.url === "string" ? c.url : null;
    const enabled = c.disabled !== true;
    const command = transport === "stdio" ? resolveMcpCommandLine(name, commandBin, args, homeDir) : url;
    return {
      id: `local-${name}`,
      name,
      enabled,
      transport,
      command,
      commandBin,
      args,
      url,
      status: enabled ? "unknown" : "disabled",
      last_health_at: null,
      healthError: null
    };
  });
}
function rowToForm(row) {
  return {
    name: row.name,
    transport: row.transport,
    commandLine: row.transport === "stdio" ? row.command ?? "" : "",
    url: row.url ?? ""
  };
}
function McpPage() {
  const hasDesktopApi = useHasDesktop();
  const [rows, setRows] = reactExports.useState([]);
  const [configPath, setConfigPath] = reactExports.useState(null);
  const [localErr, setLocalErr] = reactExports.useState(null);
  const [localMissing, setLocalMissing] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [drawerMode, setDrawerMode] = reactExports.useState("closed");
  const [form, setForm] = reactExports.useState(EMPTY_FORM);
  const [checking, setChecking] = reactExports.useState(null);
  const [toggling, setToggling] = reactExports.useState(null);
  const [q, setQ] = reactExports.useState("");
  const [activeId, setActiveId] = reactExports.useState(null);
  const [bundledLines, setBundledLines] = reactExports.useState({});
  const load = reactExports.useCallback(async () => {
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
  const openView = (row) => {
    setActiveId(row.id);
    setDrawerMode("view");
    setForm(EMPTY_FORM);
  };
  const openEdit = (row) => {
    setDrawerMode("edit");
    setActiveId(row.id);
    setForm(rowToForm(row));
  };
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const enabledCount = reactExports.useMemo(() => rows.filter((r) => r.enabled).length, [rows]);
  const onlineCount = reactExports.useMemo(() => rows.filter((r) => r.enabled && r.status === "ok").length, [rows]);
  const persistMcp = reactExports.useCallback(async (payload) => {
    const api = getDesktop();
    if (!api?.upsertClaudeMcpServer) {
      toast.error(MSG_API_NOT_READY);
      return {
        ok: false
      };
    }
    setSaving(true);
    const r = await api.upsertClaudeMcpServer(payload);
    setSaving(false);
    if (!r.ok) {
      toast.error(mcpSaveErrorMessage(r.error));
      return {
        ok: false
      };
    }
    toast.success(`已添加 ${r.name ?? payload.name}`);
    await load();
    setActiveId(`local-${r.name ?? payload.name}`);
    setDrawerMode("view");
    setForm(EMPTY_FORM);
    return {
      ok: true,
      name: r.name ?? payload.name
    };
  }, [load]);
  const filtered = reactExports.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((s) => s.name.toLowerCase().includes(term) || mcpDisplayName(s.name).toLowerCase().includes(term) || (s.command ?? "").toLowerCase().includes(term) || (s.url ?? "").toLowerCase().includes(term));
  }, [rows, q]);
  const missingTemplates = reactExports.useMemo(() => {
    const installed = new Set(rows.map((r) => r.name));
    return MCP_TEMPLATES.filter((t) => !installed.has(t.name));
  }, [rows]);
  const filteredMissingTemplates = reactExports.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return missingTemplates;
    return missingTemplates.filter((t) => t.name.toLowerCase().includes(term) || t.label.toLowerCase().includes(term) || t.desc.toLowerCase().includes(term) || t.commandLine.toLowerCase().includes(term));
  }, [missingTemplates, q]);
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
  const applyTemplate = (template) => {
    setDrawerMode("create");
    setActiveId(null);
    setForm(templateToForm(template, bundledLines));
  };
  const addTemplate = async (template) => {
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
  const removeServer = async (row) => {
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
  const toggleEnabled = async (row, e) => {
    e?.stopPropagation();
    const api = getDesktop();
    if (!api?.setClaudeMcpServerEnabled) {
      toast.error(MSG_API_NOT_READY);
      return;
    }
    setToggling(row.id);
    try {
      const nextEnabled = !row.enabled;
      const r = await api.setClaudeMcpServerEnabled({
        name: row.name,
        enabled: nextEnabled
      });
      if (!r.ok) {
        toast.error(r.error || "操作失败");
        return;
      }
      toast.success(nextEnabled ? `已启用 ${row.name}` : `已停用 ${row.name}`);
      await load();
      if (activeId === row.id) {
        setDrawerMode("view");
      }
    } finally {
      setToggling(null);
    }
  };
  const runHealthCheck = async (row) => {
    if (!row.enabled) {
      toast.info(`${row.name} 已停用，请先启用再检查`);
      return;
    }
    setChecking(row.id);
    setRows((arr) => arr.map((item) => item.id === row.id ? {
      ...item,
      status: "checking"
    } : item));
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
      setRows((arr) => arr.map((item) => item.id === row.id ? {
        ...item,
        status: r.server.status,
        last_health_at: r.server.last_health_at ?? (/* @__PURE__ */ new Date()).toISOString(),
        healthError: r.server.error ?? null
      } : item));
    } finally {
      setChecking(null);
    }
  };
  const drawerOpen = drawerMode !== "closed";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { variant: "fill", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PageRoot, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "MCP 服务器", description: PAGE_DESC.comms, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !hasDesktopApi || loading, onClick: () => void load(), className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-secondary disabled:opacity-40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", loading && "animate-spin") }),
        " 刷新"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !hasDesktopApi, onClick: openCreate, className: "btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold shadow-sm disabled:opacity-40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
        " 添加"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoHint, { side: "left", children: MCP_INFO_HINT })
    ] }) }),
    !hasDesktopApi && /* @__PURE__ */ jsxRuntimeExports.jsx(PageBanner, { className: "border-warning/30 bg-warning/10 text-warning", children: BRIDGE_OFFLINE_BANNER }),
    hasDesktopApi && !localErr && rows.length === 0 && !loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(PageBanner, { children: MCP_EMPTY_BANNER }) : null,
    localErr ? /* @__PURE__ */ jsxRuntimeExports.jsxs(PageBanner, { className: "border-destructive/30 bg-destructive/10 text-destructive", children: [
      "读取配置失败：",
      localErr
    ] }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 grid grid-cols-2 gap-3 md:grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(McpStatCard, { label: "服务器", value: rows.length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(McpStatCard, { label: "已启用", value: enabledCount, valueClass: "text-success" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(McpStatCard, { label: "在线", value: onlineCount, valueClass: onlineCount ? "text-success" : void 0 })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-[220px] max-w-md flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "搜索名称或命令…", className: "h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[12px] text-muted-foreground", children: [
          "已配置 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: filtered.length }),
          " 个",
          filteredMissingTemplates.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            " ",
            "· 可添加 ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: filteredMissingTemplates.length }),
            " 个内置模板"
          ] }) : null
        ] })
      ] }),
      filtered.length === 0 && filteredMissingTemplates.length === 0 && !loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border py-16 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { className: "mx-auto mb-3 h-10 w-10 text-muted-foreground/40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] font-medium text-foreground", children: rows.length === 0 ? "还没有 MCP 服务器" : "没有匹配结果" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] text-muted-foreground", children: rows.length === 0 ? "点击添加或使用常用模板" : "试试调整搜索关键词" }),
        rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: !hasDesktopApi, onClick: openCreate, className: "btn-gradient-primary mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-semibold disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
          " 添加 MCP"
        ] }) : null
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3", children: [
        filtered.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => openView(s), className: cn("group rounded-xl border bg-surface-elevated p-4 text-left shadow-xs transition hover:border-primary/30", s.enabled ? "border-border" : "border-border opacity-75", activeId === s.id && drawerOpen && "border-primary/40 ring-1 ring-primary/20"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", s.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12.5px] font-semibold text-foreground", children: mcpDisplayName(s.name) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[10px] text-muted-foreground", children: [
                  "(",
                  s.name,
                  ")"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground", children: transportLabel(s.transport) }),
                !s.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground", children: "已停用" }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground", children: s.command ?? s.url ?? "—" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "button", onClick: (e) => void toggleEnabled(s, e), className: cn("cursor-pointer rounded-md p-1.5 transition disabled:opacity-40", s.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary", toggling === s.id && "animate-pulse opacity-60"), title: s.enabled ? "停用" : "启用", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3.5 w-3.5" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between border-t border-border pt-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: s.status }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "点击查看详情" })
          ] })
        ] }, s.id)),
        filteredMissingTemplates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4 shadow-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12.5px] font-semibold text-foreground", children: t.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary", children: "内置模板" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: t.desc }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 font-mono text-[10.5px] text-muted-foreground", children: resolvePresetCommandLineForForm(t.name, bundledLines) || t.commandLine })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between border-t border-border/60 pt-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-muted-foreground", children: t.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: !hasDesktopApi || saving, onClick: () => void addTemplate(t), className: "rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:opacity-40", children: "一键添加" })
          ] })
        ] }, `preset-${t.name}`))
      ] })
    ] }),
    drawerOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(McpDrawer, { mode: drawerMode, active, form, configPath, rows, saving, checking, toggling, hasDesktopApi, onClose: closeDrawer, onFormChange: setForm, onSave: () => void saveServer(), onEdit: active ? () => openEdit(active) : void 0, onRemove: active ? () => void removeServer(active) : void 0, onHealthCheck: active ? () => void runHealthCheck(active) : void 0, onToggleEnabled: active ? () => void toggleEnabled(active) : void 0, onApplyTemplate: applyTemplate, onAddTemplate: (t) => void addTemplate(t), bundledLines }) : null
  ] }) });
}
function McpStatCard({
  label,
  value,
  valueClass
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-surface-elevated p-4 shadow-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] font-medium uppercase tracking-wider text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("mt-1 text-[22px] font-bold tracking-tight text-foreground", valueClass), children: value })
  ] });
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
  bundledLines
}) {
  const isForm = mode === "create" || mode === "edit";
  const title = mode === "create" ? "添加 MCP 服务器" : mode === "edit" ? `编辑 · ${form.name || "—"}` : active?.name ?? "—";
  const subtitle = mode === "create" ? "填写后保存，会自动创建或更新本机配置文件" : configPath ? configPath.replace(/^\/Users\/[^/]+/, "~") : "~/.claude/mcp.json";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-foreground/30 backdrop-blur-xs", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[13px] font-semibold", children: title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[11px] text-muted-foreground", children: subtitle })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded p-1.5 text-muted-foreground hover:bg-secondary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 space-y-4 overflow-y-auto p-5", children: isForm ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        mode === "create" ? /* @__PURE__ */ jsxRuntimeExports.jsx(McpTemplatePicker, { templates: MCP_TEMPLATES, existingNames: rows.map((r) => r.name), bundledLines, disabled: !hasDesktopApi || saving, onFill: onApplyTemplate, onAdd: onAddTemplate }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(McpFormFields, { form, nameDisabled: mode === "edit", commandPlaceholder: resolvePresetCommandLineForForm(form.name.trim(), bundledLines) || "", onChange: onFormChange })
      ] }) : active ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "传输" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[13px] font-semibold", children: transportLabel(active.transport) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "运行状态" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: active.status }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-surface px-3 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground", children: "启用状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-[13px] font-semibold", active.enabled ? "text-success" : "text-muted-foreground"), children: active.enabled ? "已启用" : "已停用" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: toggling === active.id, onClick: onToggleEnabled, className: cn("inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] transition hover:bg-secondary disabled:opacity-40", active.enabled ? "text-success" : "text-muted-foreground"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3 w-3" }),
              active.enabled ? "停用" : "启用"
            ] })
          ] })
        ] }),
        active.status === "error" && active.healthError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] leading-relaxed text-destructive", children: active.healthError }) : null,
        active.last_health_at ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
          "最近检查：",
          new Date(active.last_health_at).toLocaleString()
        ] }) : null,
        active.command ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1.5 text-[11px] font-medium text-muted-foreground", children: "启动命令" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "overflow-x-auto rounded-lg border border-border bg-code-bg/70 p-3 font-mono text-[11px] leading-relaxed text-foreground", children: active.command })
        ] }) : null,
        active.url && active.transport !== "stdio" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1.5 text-[11px] font-medium text-muted-foreground", children: "服务 URL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "overflow-x-auto rounded-lg border border-border bg-code-bg/70 p-3 font-mono text-[11px] leading-relaxed text-foreground", children: active.url })
        ] }) : null
      ] }) : null }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-2 border-t border-border px-5 py-3", children: isForm ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: !hasDesktopApi || saving, onClick: onSave, className: "btn-gradient-primary inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-[12.5px] font-semibold disabled:opacity-40", children: saving ? "保存中…" : "保存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-secondary", children: "取消" })
      ] }) : active ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onHealthCheck, disabled: checking === active.id || !active.enabled, className: "btn-row disabled:opacity-40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: cn("h-3 w-3", checking === active.id && "animate-pulse") }),
          " 健康检查"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onEdit, className: "btn-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3 w-3" }),
          " 编辑"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onToggleEnabled, disabled: toggling === active.id, className: "btn-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3 w-3" }),
          " ",
          active.enabled ? "停用" : "启用"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onRemove, className: "btn-row text-destructive", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" }),
          " 删除"
        ] })
      ] }) : null })
    ] })
  ] });
}
function McpTemplatePicker({
  templates,
  existingNames,
  bundledLines,
  disabled,
  onFill,
  onAdd
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/80 bg-surface-elevated/50 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 text-[12px] font-medium text-foreground", children: "常用模板" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-[11px] leading-relaxed text-muted-foreground", children: "点「一键添加」即可，首次使用会自动下载所需组件。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: templates.map((t) => {
      const exists = existingNames.includes(t.name);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[12.5px] font-medium text-foreground", children: [
            t.label,
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[11px] text-muted-foreground", children: [
              "(",
              t.name,
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: t.desc }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate font-mono text-[10.5px] text-foreground/80", children: resolvePresetCommandLineForForm(t.name, bundledLines) || t.commandLine })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled, onClick: () => onFill(t), className: "rounded-md border border-border px-2 py-1 text-[11px] hover:bg-secondary disabled:opacity-40", children: "填入表单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", disabled: disabled || exists, onClick: () => onAdd(t), className: "rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/15 disabled:opacity-40", children: exists ? "已添加" : "一键添加" })
      ] }, t.name);
    }) })
  ] });
}
function McpFormFields({
  form,
  nameDisabled,
  commandPlaceholder = "",
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-[12px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-medium text-muted-foreground", children: "名称" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.name, disabled: nameDisabled, onChange: (e) => onChange({
        ...form,
        name: e.target.value
      }), placeholder: "filesystem", className: "h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono outline-none focus:border-primary disabled:opacity-60" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "字母开头，可含数字、-、_" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-medium text-muted-foreground", children: "连接方式" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.transport, onChange: (e) => onChange({
        ...form,
        transport: e.target.value
      }), className: "h-9 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "stdio", children: "本地命令（推荐）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "http", children: "网络地址 http" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "sse", children: "网络地址 sse" })
      ] })
    ] }),
    form.transport === "stdio" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-medium text-muted-foreground", children: "启动命令" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.commandLine, onChange: (e) => onChange({
        ...form,
        commandLine: e.target.value
      }), rows: 3, placeholder: commandPlaceholder || "例如 npx -y @modelcontextprotocol/server-memory", className: "w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] outline-none focus:border-primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "保存后写入本机 mcp.json；内置模板默认使用最新包版本。" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-medium text-muted-foreground", children: "服务 URL" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.url, onChange: (e) => onChange({
        ...form,
        url: e.target.value
      }), placeholder: "https://example.com/mcp", className: "h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono outline-none focus:border-primary" })
    ] })
  ] });
}
function StatusBadge({
  status
}) {
  if (status === "disabled") return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "h-3 w-3" }),
    " 已停用"
  ] });
  if (status === "checking") return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-3 w-3 animate-spin" }),
    " 检查中"
  ] });
  if (status === "ok") return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[10.5px] font-medium text-success", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3 w-3" }),
    " 在线"
  ] });
  if (status === "error") return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10.5px] font-medium text-destructive", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-3 w-3" }),
    " 异常"
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "h-3 w-3" }),
    " 未知"
  ] });
}
export {
  McpPage as component
};
