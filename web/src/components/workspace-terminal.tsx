import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RefreshCw, TerminalSquare } from "lucide-react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { useTheme } from "@/hooks/use-theme";
import { buildXtermTheme } from "@/lib/terminal-theme";
import {
  WORKBENCH_MONO_FONT,
  WORKBENCH_TERMINAL_FONT_SIZE,
  WORKBENCH_TERMINAL_LINE_HEIGHT,
} from "@/lib/workbench-fonts";
import {
  connectWorkspaceTerminal,
  type TerminalServerMessage,
} from "@/lib/workspace-terminal-client";
import { appendOutputRaw } from "@/lib/workbench-output-log";
import { scanTextForPorts } from "@/lib/workbench-ports-registry";
import { useWorkbenchComposerBridgeOptional } from "@/contexts/workbench-composer-bridge-context";
import {
  getTerminalSelectionLineRange,
  inferTerminalSourceLabel,
} from "@/lib/terminal-selection-meta";
import { TerminalAddToChatButton } from "@/components/terminal-add-to-chat-button";

const MIN_TERMINAL_COLS = 24;
const MIN_TERMINAL_ROWS = 2;
const MIN_HOST_WIDTH = 48;
const MIN_HOST_HEIGHT = 16;

function hostReadyForFit(host: HTMLDivElement): boolean {
  return host.clientWidth >= MIN_HOST_WIDTH && host.clientHeight >= MIN_HOST_HEIGHT;
}

function terminalDimensionsReady(term: Terminal, host: HTMLDivElement): boolean {
  return (
    hostReadyForFit(host) &&
    term.cols >= MIN_TERMINAL_COLS &&
    term.rows >= MIN_TERMINAL_ROWS
  );
}

async function loadXtermModules() {
  const [xtermMod, fitMod] = await Promise.all([
    import("@xterm/xterm"),
    import("@xterm/addon-fit"),
  ]);
  await import("@xterm/xterm/css/xterm.css");
  type XTermExport = typeof import("@xterm/xterm");
  type FitExport = typeof import("@xterm/addon-fit");
  const xtermPkg = xtermMod as XTermExport & { default?: XTermExport };
  const fitPkg = fitMod as FitExport & { default?: FitExport };
  const TerminalCtor = xtermPkg.Terminal ?? xtermPkg.default?.Terminal ?? xtermPkg.default;
  const FitAddonCtor = fitPkg.FitAddon ?? fitPkg.default?.FitAddon ?? fitPkg.default;
  if (!TerminalCtor || !FitAddonCtor) {
    throw new Error("无法加载 xterm 模块");
  }
  return {
    Terminal: TerminalCtor as typeof Terminal,
    FitAddon: FitAddonCtor as typeof FitAddon,
  };
}

function shortenHomeInPath(abs: string): string {
  const m = abs.match(/^(\/Users\/[^/]+)(\/.*)?$/);
  if (m) return `~${m[2] ?? ""}` || "~";
  const w = abs.match(/^(\/home\/[^/]+)(\/.*)?$/);
  if (w) return `~${w[2] ?? ""}` || "~";
  return abs;
}

function clearTerminalHost(host: HTMLDivElement) {
  host.replaceChildren();
}

function waitForTerminalFit(
  fit: FitAddon,
  term: Terminal,
  host: HTMLDivElement,
  maxAttempts = 20,
): Promise<void> {
  return new Promise((resolve) => {
    const attempt = (n: number) => {
      if (n >= maxAttempts) {
        resolve();
        return;
      }
      if (host.clientHeight < MIN_HOST_HEIGHT || host.clientWidth < MIN_HOST_WIDTH) {
        requestAnimationFrame(() => attempt(n + 1));
        return;
      }
      try {
        fit.fit();
      } catch {
        requestAnimationFrame(() => attempt(n + 1));
        return;
      }
      const ready = terminalDimensionsReady(term, host);
      if (ready || n >= maxAttempts - 1) resolve();
      else requestAnimationFrame(() => attempt(n + 1));
    };
    requestAnimationFrame(() => attempt(0));
  });
}

function syncTerminalSize(
  fit: FitAddon,
  term: Terminal,
  session: ReturnType<typeof connectWorkspaceTerminal> | null,
  attempt = 0,
) {
  try {
    const host = term.element?.parentElement as HTMLDivElement | null;
    if (!host || !hostReadyForFit(host)) {
      if (attempt < 24) {
        requestAnimationFrame(() => syncTerminalSize(fit, term, session, attempt + 1));
      }
      return;
    }

    const prevRows = term.rows;
    const prevCols = term.cols;
    fit.fit();

    if (!terminalDimensionsReady(term, host)) {
      if (attempt < 24) {
        requestAnimationFrame(() => syncTerminalSize(fit, term, session, attempt + 1));
      }
      return;
    }

    if (term.rows !== prevRows || term.cols !== prevCols) {
      session?.resize(term.cols, term.rows);
    }
    term.scrollToBottom();
  } catch {
    if (attempt < 24) {
      requestAnimationFrame(() => syncTerminalSize(fit, term, session, attempt + 1));
    }
  }
}

export type WorkspaceTerminalMeta = {
  cwdLabel: string;
  cwdFull: string | null;
  shellLabel: string;
  status: "idle" | "connecting" | "ready" | "closed" | "error";
  hint: string | null;
};

export type WorkspaceTerminalHandle = {
  restart: () => void;
  kill: () => void;
  /** 关闭页签：销毁 PTY/WebSocket，不写入退出提示 */
  dispose: () => void;
  focus: () => void;
  clear: () => void;
  /** 向 Shell 发送一行命令（类 Cursor Agent 运行） */
  runCommand: (command: string) => boolean;
  isReady: () => boolean;
};

export const WorkspaceTerminal = forwardRef<
  WorkspaceTerminalHandle,
  {
    active: boolean;
    /** 失活时不销毁 PTY（多终端切换） */
    keepAlive?: boolean;
    /** 当前会话是否在面板中可见（keepAlive 时用于隐藏非激活标签） */
    visible?: boolean;
    /** 是否接收键盘焦点（拆分终端时仅聚焦窗格 focus） */
    focused?: boolean;
    /** Shell 路径或别名（bash / zsh / /bin/zsh） */
    shell?: string;
    variant?: "sidebar" | "bottom" | "panel";
    hideChrome?: boolean;
    onMetaChange?: (meta: WorkspaceTerminalMeta) => void;
    renderChrome?: (api: {
      meta: WorkspaceTerminalMeta;
      restart: () => void;
      kill: () => void;
      focus: () => void;
    }) => ReactNode;
  }
>(function WorkspaceTerminal(
  {
    active,
    keepAlive = false,
    visible = true,
    focused = true,
    shell,
    variant = "sidebar",
    hideChrome = false,
    onMetaChange,
    renderChrome,
  },
  ref,
) {
  const shellPathRef = useRef(shell);
  shellPathRef.current = shell;
  const hasDesktop = useHasDesktop();
  const composerBridge = useWorkbenchComposerBridgeOptional();
  const { resolved: themeResolved } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionRef = useRef<ReturnType<typeof connectWorkspaceTerminal> | null>(null);
  const mountGenRef = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const disposingRef = useRef(false);
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const [selectionText, setSelectionText] = useState("");
  const [cwdLabel, setCwdLabel] = useState("（加载工作区…）");
  const [cwdFull, setCwdFull] = useState<string | null>(null);
  const [shellLabel, setShellLabel] = useState("zsh");
  const [status, setStatus] = useState<WorkspaceTerminalMeta["status"]>("idle");
  const [hint, setHint] = useState<string | null>(null);

  const meta: WorkspaceTerminalMeta = { cwdLabel, cwdFull, shellLabel, status, hint };

  useEffect(() => {
    onMetaChange?.(meta);
  }, [cwdLabel, cwdFull, shellLabel, status, hint, onMetaChange]);

  const teardown = () => {
    if (resizeDebounceRef.current) {
      clearTimeout(resizeDebounceRef.current);
      resizeDebounceRef.current = null;
    }
    selectionDisposableRef.current?.dispose();
    selectionDisposableRef.current = null;
    setSelectionText("");
    sessionRef.current?.close();
    sessionRef.current = null;
    termRef.current?.dispose();
    termRef.current = null;
    fitRef.current = null;
    if (containerRef.current) clearTerminalHost(containerRef.current);
  };

  const schedulePtyResize = useCallback((cols: number, rows: number) => {
    if (cols < MIN_TERMINAL_COLS || rows < MIN_TERMINAL_ROWS) return;
    if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
    resizeDebounceRef.current = setTimeout(() => {
      resizeDebounceRef.current = null;
      sessionRef.current?.resize(cols, rows);
    }, 120);
  }, []);

  const applyTheme = useCallback(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.theme = buildXtermTheme(themeResolved);
    if (term.rows > 0) term.refresh(0, term.rows - 1);
  }, [themeResolved]);

  const mountTerminal = async (mountGen: number, opts?: { clearScreen?: boolean }) => {
    if (!active || !hasDesktop || !containerRef.current) return;
    if (mountGen !== mountGenRef.current) return;

    if (termRef.current && sessionRef.current && keepAlive && !opts?.clearScreen) {
      applyTheme();
      const term = termRef.current;
      const fit = fitRef.current;
      const host = containerRef.current;
      if (term && fit && host) {
        void waitForTerminalFit(fit, term, host).then(() => {
          if (mountGen !== mountGenRef.current) return;
          syncTerminalSize(fit, term, sessionRef.current);
          if (visible && focused) term.focus();
        });
      }
      return;
    }

    teardown();
    if (mountGen !== mountGenRef.current) return;

    disposingRef.current = false;
    setStatus("connecting");
    setHint(null);

    let cwd: string | undefined;
    try {
      const api = getDesktop();
      const ws = api ? await api.getWorkspace() : null;
      if (mountGen !== mountGenRef.current) return;
      if (ws) {
        cwd = ws;
        setCwdFull(ws);
        setCwdLabel(shortenHomeInPath(ws));
      } else {
        setCwdFull(null);
        setCwdLabel("（未选择工作区，使用 Bridge 默认目录）");
      }
    } catch {
      if (mountGen !== mountGenRef.current) return;
      setCwdFull(null);
      setCwdLabel("（无法读取工作区）");
    }

    const { Terminal: TerminalCtor, FitAddon: FitAddonCtor } = await loadXtermModules();
    if (mountGen !== mountGenRef.current || !containerRef.current) return;

    const host = containerRef.current;
    clearTerminalHost(host);

    const term = new TerminalCtor({
      cursorBlink: true,
      cursorStyle: "block",
      cursorWidth: 1,
      fontSize: WORKBENCH_TERMINAL_FONT_SIZE,
      lineHeight: WORKBENCH_TERMINAL_LINE_HEIGHT,
      fontFamily: WORKBENCH_MONO_FONT,
      letterSpacing: 0,
      theme: buildXtermTheme(themeResolved),
      scrollback: 10000,
      allowTransparency: false,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      fastScrollModifier: "alt",
    });
    const fit = new FitAddonCtor();
    term.loadAddon(fit);
    term.open(host);
    if (opts?.clearScreen) term.clear();

    await waitForTerminalFit(fit, term, host);
    if (mountGen !== mountGenRef.current) {
      term.dispose();
      clearTerminalHost(host);
      return;
    }

    termRef.current = term;
    fitRef.current = fit;

    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (mod && key === "c" && term.hasSelection()) return false;
      if (mod && key === "v") return false;
      return true;
    });

    const onMsg = (msg: TerminalServerMessage) => {
      if (mountGen !== mountGenRef.current) return;
      if (msg.type === "terminal:output") {
        term.write(msg.data);
        term.scrollToBottom();
        const plain = msg.data.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
        if (plain.trim()) {
          appendOutputRaw("terminal", plain);
          scanTextForPorts(plain, "终端");
        }
      } else if (msg.type === "terminal:started") {
        setStatus("ready");
        if (msg.cwd) {
          setCwdFull(msg.cwd);
          setCwdLabel(shortenHomeInPath(msg.cwd));
        }
        if (msg.shell) {
          const base = msg.shell.split("/").pop() || msg.shell;
          setShellLabel(base);
        }
        if (msg.warning) setHint(msg.warning);
        term.scrollToBottom();
      } else if (msg.type === "terminal:error") {
        setStatus("error");
        setHint(msg.error || "终端启动失败");
        term.writeln(`\r\n\x1b[31m[terminal] ${msg.error || "error"}\x1b[0m`);
      } else if (msg.type === "terminal:exit") {
        if (disposingRef.current || mountGen !== mountGenRef.current) return;
        setStatus("connecting");
        session.restart();
      }
    };

    const cols = term.cols;
    const rows = term.rows;
    const session = connectWorkspaceTerminal({
      cwd,
      shell: shellPathRef.current,
      cols,
      rows,
      onMessage: onMsg,
      onOpen: () => setStatus("connecting"),
      onClose: () => setStatus("closed"),
      onError: (err) => {
        setStatus("error");
        setHint(err);
      },
    });
    sessionRef.current = session;

    term.onData((data) => session.sendInput(data));

    selectionDisposableRef.current?.dispose();
    selectionDisposableRef.current = term.onSelectionChange(() => {
      if (mountGen !== mountGenRef.current) return;
      const sel = term.getSelection()?.trim() ?? "";
      setSelectionText(sel);
    });

    const ro = new ResizeObserver(() => {
      if (mountGen !== mountGenRef.current) return;
      if (!activeRef.current) return;
      try {
        if (!hostReadyForFit(host)) return;
        const prevRows = term.rows;
        const prevCols = term.cols;
        fit.fit();
        if (!terminalDimensionsReady(term, host)) return;
        if (term.rows !== prevRows || term.cols !== prevCols) {
          schedulePtyResize(term.cols, term.rows);
        }
        term.scrollToBottom();
      } catch {
        /* ignore */
      }
    });
    ro.observe(host);
    const parentEl = host.parentElement;
    if (parentEl) ro.observe(parentEl);

    return () => {
      ro.disconnect();
    };
  };

  useEffect(() => {
    if (!active) {
      if (!keepAlive) {
        mountGenRef.current += 1;
        teardown();
        setStatus("idle");
      }
      return;
    }
    const mountGen = ++mountGenRef.current;
    let cleanupResize: (() => void) | undefined;
    void mountTerminal(mountGen).then((fn) => {
      if (mountGen === mountGenRef.current) cleanupResize = fn;
    });
    return () => {
      if (!keepAlive) {
        mountGenRef.current += 1;
        cleanupResize?.();
        teardown();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount when tab activates
  }, [active, keepAlive, hasDesktop, shell]);

  useEffect(() => {
    if (!active || !visible || !termRef.current) return;
    const term = termRef.current;
    const fit = fitRef.current;
    const host = containerRef.current;
    if (!fit || !host) return;
    let cancelled = false;
    void waitForTerminalFit(fit, term, host).then(() => {
      if (cancelled) return;
      syncTerminalSize(fit, term, sessionRef.current);
      if (focused) term.focus();
    });
    return () => {
      cancelled = true;
    };
  }, [active, visible, focused]);

  useEffect(() => {
    applyTheme();
  }, [applyTheme, themeResolved]);

  useEffect(() => () => teardown(), []);

  const restart = useCallback(() => {
    disposingRef.current = false;
    const mountGen = ++mountGenRef.current;
    void mountTerminal(mountGen, { clearScreen: true });
  }, [active, hasDesktop, themeResolved]);

  const kill = useCallback(() => {
    sessionRef.current?.kill();
  }, []);

  const dispose = useCallback(() => {
    disposingRef.current = true;
    mountGenRef.current += 1;
    teardown();
    setStatus("idle");
  }, []);

  const focus = useCallback(() => {
    try {
      const term = termRef.current;
      const fit = fitRef.current;
      if (term && fit) syncTerminalSize(fit, term, sessionRef.current);
      term?.focus();
    } catch {
      /* ignore */
    }
  }, []);

  const clear = useCallback(() => {
    termRef.current?.clear();
  }, []);

  const runCommand = useCallback(
    (command: string) => {
      const line = command.trim();
      if (!line || status !== "ready" || !sessionRef.current) return false;
      sessionRef.current.sendInput(`${line}\r`);
      termRef.current?.scrollToBottom();
      termRef.current?.focus();
      return true;
    },
    [status],
  );

  const isReady = useCallback(() => status === "ready" && Boolean(sessionRef.current), [status]);

  useImperativeHandle(
    ref,
    () => ({ restart, kill, dispose, focus, clear, runCommand, isReady }),
    [restart, kill, dispose, focus, clear, runCommand, isReady],
  );

  const addSelectionToChat = useCallback(() => {
    const term = termRef.current;
    const text = term?.getSelection()?.trim() ?? selectionText.trim();
    if (!text || !composerBridge) return;
    const lineRange = term ? getTerminalSelectionLineRange(term) : undefined;
    composerBridge.addTerminalSelectionToChat({
      text,
      sourceLabel: inferTerminalSourceLabel(shellLabel, text),
      startLine: lineRange?.startLine,
      endLine: lineRange?.endLine,
    });
    term?.clearSelection();
    setSelectionText("");
  }, [composerBridge, selectionText, shellLabel]);

  useEffect(() => {
    if (!active || !composerBridge) return;
    const onKey = (ev: KeyboardEvent) => {
      if (!(ev.metaKey || ev.ctrlKey) || ev.key.toLowerCase() !== "l") return;
      const term = termRef.current;
      if (!term?.hasSelection()) return;
      const sel = term.getSelection()?.trim();
      if (!sel) return;
      ev.preventDefault();
      addSelectionToChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, composerBridge, addSelectionToChat]);

  if (!hasDesktop) {
    return (
      <div className="p-4 text-[12px] text-muted-foreground">
        浏览器预览模式无法打开本机终端。请通过 Web Bridge（npm run web:dev:full）使用。
      </div>
    );
  }

  const isPanel = variant === "panel";
  const showInlineChrome = isPanel && renderChrome && !hideChrome;

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      {showInlineChrome ? renderChrome({ meta, restart, kill, focus }) : null}
      {variant === "sidebar" ? (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
            <TerminalSquare className="h-3.5 w-3.5 text-primary" />
            <span
              className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground"
              title={cwdLabel}
            >
              {cwdLabel}
            </span>
            <span
              className={cn(
                "text-[10px]",
                status === "ready"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {status === "ready"
                ? "已连接"
                : status === "connecting"
                  ? "连接中…"
                  : status === "error"
                    ? "错误"
                    : "未连接"}
            </span>
            <button
              type="button"
              onClick={restart}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="重启终端"
              aria-label="重启终端"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          {hint ? (
            <div className="shrink-0 border-b border-border px-2 py-1 text-[10.5px] text-amber-700 dark:text-amber-300">
              {hint}
            </div>
          ) : null}
        </>
      ) : null}
      {variant === "bottom" && hint ? (
        <div className="shrink-0 border-b border-border px-2 py-1 text-[10px] text-amber-700 dark:text-amber-300">
          {hint}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1">
        {active && selectionText && composerBridge ? (
          <TerminalAddToChatButton onClick={addSelectionToChat} />
        ) : null}
        <div
          ref={containerRef}
          className={cn(
            "workbench-xterm workbench-xterm--panel min-h-0 h-full w-full overflow-hidden",
            isPanel ? "bg-[var(--terminal-bg)]" : "bg-code-bg p-2",
            !visible && "hidden",
          )}
          onClick={focus}
        />
      </div>
    </div>
  );
});
