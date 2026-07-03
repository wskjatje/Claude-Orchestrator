import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  CLAUDE_CODE_MODEL_ALIASES,
  ensureDefaultWorkspace,
  getProjectDbInfo,
  loadChatSessions,
  loadChatSettings,
  loadScheduledTasks,
  loadUiPrefs,
  loadWorkspace,
  loadWorkspaceHistory,
  ensureWorkspaceInHistory,
  recordWorkspaceOpen,
  removeWorkspaceHistoryEntry,
  clearWorkspaceHistory,
  resetPersonalWorkbenchData,
  saveChatSessions,
  saveChatSettings,
  saveScheduledTasks,
  saveUiPrefs,
  saveWorkspace,
} from "./store.mjs";
import {
  abortClaudeCode,
  claudeCliStatus,
  runClaudeCodePrint,
  runClaudeDoctor,
} from "./claude-cli.mjs";
import {
  checkUpstreamUpdates,
  getWorkbenchGitStatus,
  commitCurrentBranch,
  pullClaudeCodeFromGithub,
  pullFromPersonalGithub,
  pushClaudeCodeToPersonalGithub,
  deployPersonalGithubArtifacts,
  savePersonalGithubSettings,
} from "./workbench-git-sync.mjs";
import {
  aggregateClaudeProjectUsage,
  listRecentClaudeProjectSessions,
} from "./claude-projects.mjs";
import {
  checkAllMcpServersAndPersist,
  checkOneMcpServerAndPersist,
  loadMcpHealthSnapshot,
  mcpConfigPathFromSettings,
  resolvedMcpConfigFile,
} from "./mcp-health-persist.mjs";
import {
  buildMcpServerConfig,
  bundledMcpPresetCommandLines,
  readMcpConfigFile,
  removeMcpServer,
  setMcpServerEnabled,
  upsertMcpServer,
} from "./claude-mcp-config.mjs";
import {
  formatUsd,
  estimateUsageCostUsd,
  getDefaultModelPricing,
} from "./token-pricing.mjs";
import {
  gitDiff,
  listPanelTree,
  readTextFile,
  shellSnapshot,
} from "./workspace.mjs";
import { lintWorkspaceFiles } from "./workspace-lint.mjs";
import {
  pickFolderNative,
  pickReferenceFilesNative,
} from "./native-dialog.mjs";
import { startTaskScheduler } from "./scheduler.mjs";
import {
  appLogFilePath,
  dailyReportsDir,
  orchestrationChainPath,
  PROJECT_DATA_DIR,
  PROJECT_DB_PATH,
  readGlobalClaudeEnv,
  scheduledTasksPath,
} from "./paths.mjs";

const require = createRequire(import.meta.url);
const cadBridge = require("./cad-bridge.cjs");
const cloudProviders = require("./cloud-providers.cjs");
const cloudDirect = require("./cloud-direct.cjs");
const projectDb = require("./project-db.cjs");
const projectLogs = require("./project-logs.cjs");
const agentExecRegistry = require("./agent-exec-registry.cjs");
const usageStats = require("./usage-stats.cjs");

const PROJECT_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

cloudProviders.attachDb(() =>
  projectDb.getDb(PROJECT_DB_PATH, PROJECT_DATA_DIR),
);

/** @type {Map<string, Set<(detail: unknown) => void>>} */
const eventSubs = new Map();

export function subscribeEvent(channel, fn) {
  if (!eventSubs.has(channel)) eventSubs.set(channel, new Set());
  eventSubs.get(channel).add(fn);
  return () => eventSubs.get(channel)?.delete(fn);
}

export function broadcast(channel, detail) {
  const subs = eventSubs.get(channel);
  if (!subs) return;
  for (const fn of subs) {
    try {
      fn(detail);
    } catch (e) {
      console.error("[handlers] broadcast subscriber 异常", e?.message);
    }
  }
}

cadBridge.init({
  loadWorkspace,
  loadChatSettings,
  loadChatSessions,
  saveChatSessions: (payload) => {
    const r = saveChatSessions(payload);
    broadcast("chat-sessions:changed", payload || {});
    return r;
  },
  loadScheduledTasks,
  saveScheduledTasks,
  runClaudeCodePrint,
  abortClaudeCode,
  broadcast,
  appLogFilePath,
  scheduledTasksPath,
  dailyReportsDir,
  orchestrationChainPath,
});

function appendBridgeAppLog(message) {
  try {
    const p = appLogFilePath();
    const ts = new Date().toISOString();
    const line = `[${ts}] ${String(message).replace(/\r?\n/g, " ")}`;
    if (p) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.appendFileSync(p, `${line}\n`, "utf8");
    }
    projectLogs.appendLogEntry({ ts, message: String(message), source: "app" });
  } catch (e) {
    console.warn("[log] appendBridgeAppLog 失败", e?.message || e);
  }
}

startTaskScheduler({
  loadScheduledTasks: () => cadBridge.listScheduledTasks(),
  runScheduledTaskWithMeta: cadBridge.runScheduledTaskWithMeta,
  appendAppLog: appendBridgeAppLog,
});

agentExecRegistry.reconcileWorkingOnStartup();

/** @type {Record<string, (...args: unknown[]) => Promise<unknown>>} */
export const handlers = {
  "workspace:get": async () => {
    const w = loadWorkspace() ?? ensureDefaultWorkspace();
    if (w) ensureWorkspaceInHistory(w);
    return w;
  },

  "workspace:choose": async (args) => {
    const manual = typeof args?.[0] === "string" ? args[0].trim() : "";
    const dir = manual || pickFolderNative() || "";
    if (!dir) return null;
    if (!fs.existsSync(dir)) {
      throw new Error(`路径不存在：${dir}`);
    }
    const resolved = path.resolve(dir);
    saveWorkspace(resolved);
    recordWorkspaceOpen(resolved);
    broadcast("workspace:changed", { workspace: resolved });
    return resolved;
  },

  "workspace:history:get": async () => loadWorkspaceHistory(),

  "workspace:history:remove": async (args) => {
    const target = typeof args?.[0] === "string" ? args[0] : "";
    return removeWorkspaceHistoryEntry(target);
  },

  "workspace:history:clear": async () => clearWorkspaceHistory(),

  "workspace:clear": async () => {
    saveWorkspace(null);
    broadcast("workspace:changed", { workspace: null });
    return null;
  },

  "reset:logout": async () => {
    try {
      const result = resetPersonalWorkbenchData();
      broadcast("chat-settings:changed", {});
      broadcast("chat-sessions:changed", {});
      return { ok: true, cleared: result.cleared };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  "workspace:listPanelTree": async () => listPanelTree(),
  "workspace:readTextFile": async (args) => readTextFile(args?.[0]),
  "workspace:lintFiles": async (args) =>
    lintWorkspaceFiles(args?.[0], {
      mode: args?.[1] === "open" ? "open" : "full",
    }),
  "workspace:getShellSnapshot": async () => shellSnapshot(),
  "workspace:getGitDiff": async () => gitDiff(),

  "chat-settings:get": async () => loadChatSettings(),
  "chat-settings:save": async (args) => {
    const next = saveChatSettings(args?.[0]);
    broadcast("chat-settings:changed", {});
    return next;
  },

  "ui-prefs:get": async () => ({ ok: true, prefs: loadUiPrefs() }),
  "ui-prefs:save": async (args) => {
    const prefs = saveUiPrefs(args?.[0] || {});
    broadcast("chat-settings:changed", {});
    return { ok: true, prefs };
  },

  "project-db:info": async () => ({ ok: true, ...getProjectDbInfo() }),

  "chat-sessions:get": async () => loadChatSessions(),
  "chat-sessions:save": async (args) => {
    const body = args?.[0] || {};
    // 冻结 costUsd：将当前单价写入每条有 usage 但无 costUsd 的消息
    const settings = loadChatSettings();
    const tokenPricing = settings.tokenPricing || {};
    if (Array.isArray(body.sessions)) {
      for (const sess of body.sessions) {
        if (!Array.isArray(sess.history)) continue;
        for (const msg of sess.history) {
          const u = msg?.usage;
          if (!u || typeof u !== "object") continue;
          if (typeof u.costUsd === "number") continue; // 已冻结
          const modelId = String(msg.modelId || sess.modelId || "").trim();
          if (modelId) {
            u.costUsd = estimateUsageCostUsd(u, modelId, tokenPricing);
          }
        }
      }
    }
    const r = saveChatSessions(body);
    broadcast("chat-sessions:changed", body);
    return r;
  },

  "usage:getSummary": async (args) => {
    const body = args?.[0] || {};
    const settings = loadChatSettings();
    const startMs = Number(body.startMs) > 0 ? Number(body.startMs) : 0;
    const endMs = Number(body.endMs) > 0 ? Number(body.endMs) : Date.now();
    let data = usageStats.getUsageSummary({ startMs, endMs });

    // 注册表为空或数据全零 → 从当前会话现场重建（避免每次保存都要硬编码调用）
    const isEmpty =
      !data ||
      !data.lastBuiltAt ||
      !data.summary ||
      (data.summary.apiTurns === 0 &&
        data.summary.msgUser === 0 &&
        data.summary.msgAssistant === 0);
    if (isEmpty) {
      const sess = loadChatSessions();
      if (sess.sessions?.length) {
        usageStats.rebuildFromSessions(sess.sessions || [], {
          tokenPricing: settings.tokenPricing || {},
          cloudModelCatalog: settings.cloudModelCatalog || [],
        });
        data = usageStats.getUsageSummary({ startMs, endMs });
      }
    }

    const claude = aggregateClaudeProjectUsage({
      workspacePath: null,
      startMs,
      endMs,
      tokenPricing: settings.tokenPricing || {},
    });
    const sessionCloud = data.summary?.sessionCloudCostUsd ?? 0;
    const cliCloud = claude.costUsd ?? 0;
    const cloudCostUsd = cliCloud + sessionCloud;
    const cloudTotalTok = Math.max(
      claude.totalTokens ?? 0,
      data.summary?.cloudTotalTok ?? 0,
    );
    const summary = {
      ...(data.summary || {}),
      cloudCostUsd,
      cliCostUsd: cliCloud,
      sessionCloudCostUsd: sessionCloud,
      localCostUsd: 0,
      cloudTotalTok,
      cloudTurns: Math.max(claude.turns ?? 0, data.summary?.cloudTurns ?? 0),
      cloudCostFormatted: formatUsd(cloudCostUsd),
      localCostFormatted: formatUsd(0),
    };
    return {
      ok: true,
      ...data,
      summary,
      claudeUsage: {
        inputTokens: claude.inputTokens,
        outputTokens: claude.outputTokens,
        totalTokens: claude.totalTokens,
        turns: claude.turns,
        costUsd: cliCloud,
        costUsdFormatted: formatUsd(cliCloud),
      },
    };
  },

  "usage:rebuild": async () => {
    const sess = loadChatSessions();
    const settings = loadChatSettings();
    const reg = usageStats.rebuildFromSessions(sess.sessions || [], {
      tokenPricing: settings.tokenPricing || {},
      cloudModelCatalog: settings.cloudModelCatalog || [],
    });
    return { ok: true, lastBuiltAt: reg.lastBuiltAt ?? null };
  },

  "claude-code:prompt": async (args) => {
    const p = args?.[0] || {};
    const requestId = typeof p.requestId === "string" ? p.requestId.trim() : "";
    const attachmentCount = Math.max(0, Number(p.attachmentCount) || 0);
    const attachments = Array.isArray(p.attachments) ? p.attachments : [];
    const timeoutMs =
      typeof p.timeoutMs === "number" && p.timeoutMs >= 0
        ? p.timeoutMs
        : undefined;
    return runClaudeCodePrint({
      prompt: p.prompt,
      model: p.model,
      requestId: p.requestId,
      timeoutMs,
      attachmentCount: attachmentCount || attachments.length,
      attachments,
      claudeSessionId: p.claudeSessionId,
      sessionName: p.sessionName,
      isNewClaudeSession: p.isNewClaudeSession,
      onDelta: requestId
        ? (chunk) => {
            broadcast("message_delta", { requestId, content: chunk });
          }
        : undefined,
    });
  },

  "claude-code:abort": async (args) => abortClaudeCode(args?.[0]),

  "claude-code:listModels": async (args) => {
    const settings = loadChatSettings();
    const fetchRemote = args?.[0]?.fetchRemote !== false;
    try {
      const pool = await cloudProviders.collectCloudModelPool({
        aliases: CLAUDE_CODE_MODEL_ALIASES,
        settings,
        fetchRemote,
      });
      const env = readGlobalClaudeEnv();
      for (const k of [
        "ANTHROPIC_DEFAULT_SONNET_MODEL",
        "ANTHROPIC_DEFAULT_OPUS_MODEL",
        "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      ]) {
        const m = String(env[k] || "").trim();
        if (m && m !== "#") pool.models.push(m);
      }
      const models = await cloudProviders.filterCloudModelList(
        [...new Set(pool.models)].filter((m) => m && m !== "#"),
        settings,
      );
      if (models.length) {
        const nextCatalog = await cloudProviders.filterCloudModelList(
          [...new Set(models)],
          settings,
        );
        if (
          JSON.stringify(settings.cloudModelCatalog || []) !==
          JSON.stringify(nextCatalog)
        ) {
          saveChatSettings({ ...settings, cloudModelCatalog: nextCatalog });
        }
      }
      return {
        ok: true,
        models: models.length ? models : [...CLAUDE_CODE_MODEL_ALIASES],
        providers: pool.providers,
        remoteModels: pool.remoteModels,
      };
    } catch (e) {
      const env = readGlobalClaudeEnv();
      const fromEnv = [
        env.ANTHROPIC_DEFAULT_SONNET_MODEL,
        env.ANTHROPIC_DEFAULT_OPUS_MODEL,
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
      ]
        .map((m) => String(m || "").trim())
        .filter((m) => m && m !== "#");
      const models = await cloudProviders.filterCloudModelList(
        [
          ...new Set([
            ...CLAUDE_CODE_MODEL_ALIASES,
            ...fromEnv,
            ...(settings.cloudModelCatalog || []),
            String(settings.model || "").trim(),
          ]),
        ].filter((m) => m && m !== "#"),
        settings,
      );
      return {
        ok: true,
        models: models.length ? models : [...CLAUDE_CODE_MODEL_ALIASES],
        error: e?.message || String(e),
      };
    }
  },

  "claude-code:cliStatus": async () => claudeCliStatus(),

  "claude-code:doctor": async () => runClaudeDoctor(),

  "cloud-direct:prompt": async (args) => {
    const p = args?.[0] || {};
    const result = await cloudDirect.directPrompt({
      prompt: p.prompt,
      model: p.model,
      requestId: p.requestId,
      timeoutMs: p.timeoutMs,
    });
    return result;
  },

  "cloud-direct:abort": async (args) => {
    const body = args?.[0] || {};
    return cloudDirect.directAbort(body?.requestId);
  },

  "claude-projects:listRecent": async (args) => {
    const body = args?.[0] || {};
    const workspace =
      typeof body.workspacePath === "string"
        ? body.workspacePath
        : loadWorkspace();
    const limit = Number(body.limit) > 0 ? Number(body.limit) : 12;
    const sessions = listRecentClaudeProjectSessions({
      workspacePath: workspace,
      limit,
    });
    return { ok: true, sessions };
  },

  "claude-projects:usageSummary": async (args) => {
    const body = args?.[0] || {};
    const settings = loadChatSettings();
    const workspace =
      typeof body.workspacePath === "string"
        ? body.workspacePath
        : loadWorkspace();
    const startMs = Number(body.startMs) > 0 ? Number(body.startMs) : 0;
    const endMs = Number(body.endMs) > 0 ? Number(body.endMs) : Date.now();
    const agg = aggregateClaudeProjectUsage({
      workspacePath: workspace,
      startMs,
      endMs,
      tokenPricing: settings.tokenPricing || {},
    });
    return {
      ok: true,
      ...agg,
      costUsdFormatted: formatUsd(agg.costUsd),
    };
  },

  "mcp:healthCheckAll": async () => {
    const configPath = mcpConfigPathFromSettings();
    const result = await checkAllMcpServersAndPersist(configPath);
    if (result.ok) {
      broadcast("mcp-health:changed", {
        configPath: result.path,
        okCount: result.okCount,
        total: result.total,
      });
    }
    return result;
  },

  "mcp:healthCheckOne": async (args) => {
    const name = String(args?.[0]?.name || "").trim();
    if (!name) return { ok: false, error: "缺少 name" };
    const configPath = mcpConfigPathFromSettings();
    const result = await checkOneMcpServerAndPersist(configPath, name);
    if (result.ok && result.server) {
      broadcast("mcp-health:changed", {
        configPath: resolvedMcpConfigFile(configPath).path,
        name,
      });
    }
    return result;
  },

  "mcp:getHealthSnapshot": async () => {
    const configPath = mcpConfigPathFromSettings();
    const read = resolvedMcpConfigFile(configPath);
    if (!read.ok)
      return {
        ok: false,
        error: read.error,
        snapshot: null,
        configPath: read.path ?? null,
      };
    const snapshot = loadMcpHealthSnapshot(read.path);
    return {
      ok: true,
      configPath: read.path,
      snapshot,
      missing: read.missing === true,
    };
  },

  "claude-code:chooseCliExecutable": async () => ({
    ok: true,
    path: loadChatSettings().claudeCliPath || "",
  }),

  "claude-code:restartDesktop": async () => ({ ok: true }),

  "workbench-git:status": async () => getWorkbenchGitStatus(),

  "workbench-git:checkUpstream": async (args) => {
    const body = args?.[0] && typeof args[0] === "object" ? args[0] : {};
    return checkUpstreamUpdates({
      upstreamGithubRepo: body.upstreamGithubRepo,
    });
  },

  "workbench-git:pullUpstream": async (args) => {
    const body = args?.[0] && typeof args[0] === "object" ? args[0] : {};
    const r = await pullClaudeCodeFromGithub({
      upstreamGithubRepo: body.upstreamGithubRepo,
    });
    return r;
  },

  "workbench-git:pullPersonal": async (args) => {
    const body = args?.[0] && typeof args[0] === "object" ? args[0] : {};
    const r = await pullFromPersonalGithub({
      personalGithubRepo: body.personalGithubRepo,
    });
    if (r.ok && r.deployed?.ok) {
      broadcast("orchestration:chain-status", { kind: "registry-changed" });
      broadcast("mcp-health:changed", {
        configPath: resolvedMcpConfigFile().path,
      });
    }
    return r;
  },

  "workbench-git:deployPersonal": async (args) => {
    const body = args?.[0] && typeof args[0] === "object" ? args[0] : {};
    const r = deployPersonalGithubArtifacts(body);
    if (r.ok) {
      broadcast("orchestration:chain-status", { kind: "registry-changed" });
      broadcast("mcp-health:changed", {
        configPath: resolvedMcpConfigFile().path,
      });
    }
    return r;
  },

  "workbench-git:pushPersonal": async (args) => {
    const body = args?.[0] && typeof args[0] === "object" ? args[0] : {};
    return pushClaudeCodeToPersonalGithub({
      reason: body.reason,
      message: body.message,
      personalGithubRepo: body.personalGithubRepo,
    });
  },

  "workbench-git:saveGithubSettings": async (args) => {
    const body = args?.[0] && typeof args[0] === "object" ? args[0] : {};
    savePersonalGithubSettings(body);
    broadcast("chat-settings:changed", {});
    return { ok: true };
  },

  "workbench-git:commitBranch": async (args) => {
    const body = args?.[0] && typeof args[0] === "object" ? args[0] : {};
    return commitCurrentBranch({ reason: body.reason });
  },

  "ollama:listModels": async (args) => {
    const base = String(args?.[0] || "http://127.0.0.1:11434").replace(
      /\/$/,
      "",
    );
    try {
      const res = await fetch(`${base}/api/tags`);
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      const models = (data.models || []).map((m) => m.name).filter(Boolean);
      return { ok: true, models };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  "system:localWallClock": async () => {
    const now = new Date();
    const tz = process.env.LOCAL_TIME_TZ || "Asia/Shanghai";
    const full = now
      .toLocaleString("sv-SE", { timeZone: tz })
      .replace("T", " ");
    return { ok: true, full, timezone: tz, timestamp: now.getTime() };
  },

  "shell:openExternal": async (args) => {
    const url = String(args?.[0] || "");
    if (url) {
      try {
        const parsed = new URL(url);
        // 只允许安全协议
        if (!["https:", "http:", "mailto:"].includes(parsed.protocol)) {
          return { ok: false, error: "不支持的协议" };
        }
      } catch {
        return { ok: false, error: "URL 格式无效" };
      }
      const { execFile } = await import("node:child_process");
      execFile("open", [url]);
    }
    return { ok: true };
  },

  /** 轻量级文件存在性检查（仅 stat，不读内容） */
  "workspace:fileStat": async (args) => {
    const rel = String(args?.[0] || "").replace(/^[/\\]+/, "");
    const wd = loadWorkspace();
    if (!wd || !rel || rel.includes("..")) {
      return { ok: false, exists: false, error: "无效路径或未选择工作区" };
    }
    let root;
    try { root = path.resolve(fs.realpathSync(wd)); } catch { return { ok: false, exists: false, error: "工作区路径无效" }; }
    const abs = path.resolve(root, rel);
    if (!abs.startsWith(root + path.sep) && abs !== root) {
      return { ok: false, exists: false, error: "路径越界" };
    }
    try {
      const stat = fs.statSync(abs);
      return { ok: true, exists: stat.isFile(), size: stat.isFile() ? stat.size : 0 };
    } catch (e) {
      // ENOENT（文件不存在）是正常预期，不记录日志
      if (e?.code !== "ENOENT") {
        console.warn("[handlers] fileStat 失败", e?.message || e);
      }
      return { ok: true, exists: false, size: 0 };
    }
  },

  /** 后台执行 graphify update 更新知识图谱（代码 AST 提取，无需 LLM） */
  "workspace:buildGraph": async () => {
    const wd = loadWorkspace();
    if (!wd) return { ok: false, error: "未选择工作区" };
    let output = "";
    const { execFile } = await import("node:child_process");
    try {
      const { stdout: updateOut } = await execFile("graphify", ["update", wd, "--no-cluster"], {
        timeout: 120_000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      output += updateOut || "";
    } catch (e) {
      return { ok: false, error: `图谱更新失败：${e?.message || e}`, output };
    }
    try {
      const { stdout: htmlOut } = await execFile("graphify", ["export", "html"], {
        cwd: wd,
        timeout: 30_000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      output += "\n" + (htmlOut || "");
    } catch (e) {
      console.warn("[handlers] HTML 导出失败", e?.message || e);
    }
    return { ok: true, output };
  },

  /** 生成状态着色图 HTML */
  "workspace:buildStatusViz": async () => {
    const wd = loadWorkspace();
    if (!wd) return { ok: false, error: "未选择工作区" };
    try {
      const { buildStatusHtml } = await import(path.join(__dirname, "vendor", "cad", "build-status-viz.js"));
      const r = buildStatusHtml(wd);
      return r;
    } catch (e) {
      return { ok: false, error: `生成状态可视化失败：${e?.message || e}` };
    }
  },

  /** 读取节点状态统计数据 */
  "workspace:nodeStatus": async () => {
    const wd = loadWorkspace();
    if (!wd) return { ok: false, error: "未选择工作区" };
    try {
      const { getStatusCounts } = await import(path.join(__dirname, "vendor", "cad", "node-status-tracker.js"));
      const counts = getStatusCounts(wd);
      return { ok: true, counts };
    } catch (e) {
      return { ok: false, error: `读取节点状态失败：${e?.message || e}` };
    }
  },

  "claudeConfig:bundledMcpCommandLines": async () => ({
    ok: true,
    lines: bundledMcpPresetCommandLines(),
  }),

  "claudeConfig:readJson": async (args) => {
    const name = args?.[0];
    if (name !== "mcp.json" && name !== "settings.json") {
      return { ok: false, error: "unsupported config" };
    }
    if (name === "settings.json") {
      const p = path.join(os.homedir(), ".claude", name);
      try {
        if (!fs.existsSync(p)) return { ok: true, missing: true, raw: null };
        const raw = fs.readFileSync(p, "utf8");
        return { ok: true, data: JSON.parse(raw), raw, path: p };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
    const settings = loadChatSettings();
    const customPath = settings.mcpConfigAbsolutePath?.trim() || "";
    const read = readMcpConfigFile(customPath);
    if (!read.ok) return { ok: false, error: read.error };
    if (read.missing)
      return { ok: true, missing: true, raw: null, path: read.path };
    return {
      ok: true,
      data: read.data,
      raw: read.raw,
      path: read.path,
      repaired: read.repaired === true,
      repairs: read.repairs ?? [],
      homeDir: os.homedir(),
    };
  },

  "claudeConfig:upsertMcpServer": async (args) => {
    const body = args?.[0] || {};
    const built = buildMcpServerConfig(body);
    if (!built.ok) return built;
    const settings = loadChatSettings();
    const customPath = settings.mcpConfigAbsolutePath?.trim() || "";
    return upsertMcpServer(customPath, body.name, built.config);
  },

  "claudeConfig:removeMcpServer": async (args) => {
    const name = String(args?.[0]?.name || "").trim();
    if (!name) return { ok: false, error: "缺少 name" };
    const settings = loadChatSettings();
    const customPath = settings.mcpConfigAbsolutePath?.trim() || "";
    return removeMcpServer(customPath, name);
  },

  "claudeConfig:setMcpServerEnabled": async (args) => {
    const body = args?.[0] || {};
    const name = String(body.name || "").trim();
    if (!name) return { ok: false, error: "缺少 name" };
    const settings = loadChatSettings();
    const customPath = settings.mcpConfigAbsolutePath?.trim() || "";
    return setMcpServerEnabled(customPath, name, body.enabled !== false);
  },

  "dialog:chooseReferenceFiles": async (args) => {
    const opts = args?.[0] && typeof args[0] === "object" ? args[0] : {};
    return pickReferenceFilesNative(opts);
  },

  "cc-switch:status": async () => ({
    ok: true,
    installed: true,
    source: "project",
    configured: cloudProviders.providersConfigured(),
  }),

  "cc-switch:providerNeedsCcr": async (args) => {
    try {
      const providerName = args?.[0]?.name || args?.[0]?.providerName || "";
      const result = cloudProviders.providerNeedsCcrProxy(providerName);
      return { ok: true, ...result };
    } catch (e) {
      return {
        ok: false,
        error: e.message,
        needsCcr: false,
        ccrEndpoint: "",
        reason: "",
      };
    }
  },

  "cc-switch:listKnownProviders": async () => {
    try {
      const providers = cloudProviders.listKnownProviders();
      return { ok: true, providers };
    } catch (e) {
      return { ok: false, error: e.message, providers: [] };
    }
  },

  "cc-switch:listProviders": async () => {
    try {
      const providers = cloudProviders.listProviders();
      return { ok: true, providers };
    } catch (e) {
      return { ok: false, error: e?.message || String(e), providers: [] };
    }
  },

  "cc-switch:upsertProvider": async (args) => {
    try {
      const body = args?.[0] || {};
      const result = cloudProviders.upsertProvider(body);
      if (result.ok && result.providerId) {
        const settings = loadChatSettings();
        const nextCatalog = [
          ...new Set([
            ...(settings.cloudProviderCatalog || []),
            result.providerId,
          ]),
        ];
        // 首供应商自动启用聊天
        const currEnabled = settings.chatEnabledCloudProviders || [];
        const nextEnabled = currEnabled.length
          ? currEnabled
          : [result.providerId];
        // 保存后重建 tokenPricing 表（覆盖所有供应商的模型 × 单价）
        const allProviders = cloudProviders.listProviders();
        const tokenPricing =
          cloudProviders.buildTokenPricingFromProviders(allProviders);
        saveChatSettings({
          ...settings,
          cloudProviderCatalog: nextCatalog,
          chatEnabledCloudProviders: nextEnabled,
          tokenPricing,
        });
        const providerName = String(body.name || "").trim();
        if (providerName && result.provider) {
          // CCR 同步已移除
        }
      }
      if (body.syncWorkbench !== false) {
        try {
          cloudProviders.syncProvidersToWorkbench({
            loadChatSettings,
            saveChatSettings,
            loadChatSessions,
            saveChatSessions,
          });
        } catch (e) {
          console.warn("[handlers] 云供应商同步失败", e?.message || e);
          /* 供应商已写入，同步可稍后手动 */
        }
      }
      broadcast("chat-settings:changed", {});
      return result;
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  "cc-switch:deleteProvider": async (args) => {
    try {
      const providerId = args?.[0]?.providerId;
      const result = cloudProviders.deleteProvider(providerId);
      if (result.ok && result.providerId) {
        const settings = loadChatSettings();
        const nextCatalog = (settings.cloudProviderCatalog || []).filter(
          (id) => id !== result.providerId,
        );
        const nextChatEnabled = (
          settings.chatEnabledCloudProviders || []
        ).filter((id) => id !== result.providerId);
        const allProviders = cloudProviders.listProviders();
        const tokenPricing =
          cloudProviders.buildTokenPricingFromProviders(allProviders);
        saveChatSettings({
          ...settings,
          cloudProviderCatalog: nextCatalog,
          chatEnabledCloudProviders: nextChatEnabled,
          tokenPricing,
        });
      }
      broadcast("chat-settings:changed", {});
      return result;
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  "cc-switch:setCurrentProvider": async (args) => {
    try {
      const body = args?.[0] || {};
      const r = cloudProviders.setCurrentProvider(body.providerId, body.model);
      if (body.syncWorkbench !== false) {
        cloudProviders.syncProvidersToWorkbench({
          loadChatSettings,
          saveChatSettings,
          loadChatSessions,
          saveChatSessions,
        });
      }
      broadcast("chat-settings:changed", {});
      return { ok: true, ...r };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  "cc-switch:syncWorkbench": async () => {
    try {
      const r = await cloudProviders.syncProvidersToWorkbench({
        loadChatSettings,
        saveChatSettings,
        loadChatSessions,
        saveChatSessions,
      });
      broadcast("chat-settings:changed", {});
      return r;
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  "cc-switch:fetchProviderModels": async (args) => {
    const body = args?.[0] || {};
    try {
      const r = await cloudProviders.fetchProviderModels({
        providerName: body.providerName || body.name,
        endpoint: body.endpoint,
        apiKey: body.apiKey,
      });
      return {
        ok: r.ok,
        models: r.models,
        error: r.error,
        defaultInputPrice: r.defaultInputPrice,
        defaultOutputPrice: r.defaultOutputPrice,
      };
    } catch (e) {
      return { ok: false, error: e?.message || String(e), models: [] };
    }
  },

  "default-model-pricing:get": async () => {
    return getDefaultModelPricing();
  },

  "cc-switch:refreshCloudModels": async (args) => {
    try {
      const settings = loadChatSettings();
      const fetchRemote = args?.[0]?.fetchRemote !== false;
      const pool = await cloudProviders.collectCloudModelPool({
        aliases: CLAUDE_CODE_MODEL_ALIASES,
        settings,
        fetchRemote,
      });
      const nextCatalog = await cloudProviders.filterCloudModelList(
        pool.models,
        settings,
      );
      saveChatSettings({ ...settings, cloudModelCatalog: nextCatalog });
      broadcast("chat-settings:changed", {});
      return {
        ok: true,
        models: pool.models,
        remoteModels: pool.remoteModels,
        providers: pool.providers,
        cloudModelCatalog: nextCatalog,
      };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  ...cadBridge.createHandlers(),

  "env:deployCheck": async () => {
    const { deployCheck } = await import("./env-deploy.mjs");
    return deployCheck();
  },

  "env:deployInstall": async () => {
    const { deployInstall } = await import("./env-deploy.mjs");
    return deployInstall();
  },

  "env:deployVerify": async () => {
    const { deployVerify } = await import("./env-deploy.mjs");
    return deployVerify();
  },
};

export async function dispatchRpc(channel, args = []) {
  const fn = handlers[channel];
  if (!fn) {
    return { ok: false, error: `未知 RPC: ${channel}` };
  }
  return fn(args);
}

ensureDefaultWorkspace();

try {
  const sess = loadChatSessions();
  const settings = loadChatSettings();
  // 启动时从已存储的供应商重建 tokenPricing 表
  const allProviders = cloudProviders.listProviders();
  const rebuiltPricing =
    cloudProviders.buildTokenPricingFromProviders(allProviders);
  if (Object.keys(rebuiltPricing).length > 0) {
    saveChatSettings({ ...settings, tokenPricing: rebuiltPricing });
  }
  // 启动时重建 cloudModelCatalog：仅保留当前供应商在册的模型，清除累积的过期条目
  const currentCloudModels = new Set();
  for (const p of allProviders) {
    for (const m of p.models || []) {
      const id = String(m || "").trim();
      if (id && id !== "#") currentCloudModels.add(id);
    }
  }
  if (currentCloudModels.size > 0) {
    const rebuilt = [...currentCloudModels].sort();
    const oldCatalog = settings.cloudModelCatalog || [];
    if (JSON.stringify(rebuilt) !== JSON.stringify(oldCatalog)) {
      saveChatSettings({ ...settings, cloudModelCatalog: rebuilt });
    }
  }
  const mergedPricing = { ...rebuiltPricing, ...(settings.tokenPricing || {}) };
  // 一次性回填：为已有 usage 但无 costUsd 的消息冻结费用
  let mutated = false;
  if (Array.isArray(sess.sessions)) {
    for (const ses of sess.sessions) {
      if (!Array.isArray(ses.history)) continue;
      for (const msg of ses.history) {
        const u = msg?.usage;
        if (!u || typeof u !== "object") continue;
        if (typeof u.costUsd === "number") continue;
        const modelId = String(msg.modelId || ses.modelId || "").trim();
        if (modelId) {
          u.costUsd = estimateUsageCostUsd(u, modelId, mergedPricing);
          mutated = true;
        }
      }
    }
  }
  if (mutated) saveChatSessions(sess);
  usageStats.rebuildFromSessions(sess.sessions || [], {
    tokenPricing: mergedPricing,
    cloudModelCatalog: settings.cloudModelCatalog || [],
  });
} catch (err) {
  console.error("[startup] 重建用量统计异常：", err);
}
