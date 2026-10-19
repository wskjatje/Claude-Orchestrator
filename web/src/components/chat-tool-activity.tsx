import { useState } from "react";
import {
  FileText,
  Globe,
  Loader2,
  Pencil,
  RotateCw,
  Terminal,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { isPlausibleWorkspaceRelPath } from "@/lib/compress-agent-display";
import { PLAN_BUILD_BUTTON } from "@/lib/ui-copy";
import {
  runCommandInWorkbenchTerminalBridge,
  workbenchTerminalFocusTab,
} from "@/lib/workbench-terminal-run-bridge";

/** 统一时间线标签：Explored / Edited / Ran（对齐 Cursor） */
const TOOL_META: Record<string, { icon: typeof FileText; label: string }> = {
  Read: { icon: FileText, label: "Read" },
  Glob: { icon: FileText, label: "Glob" },
  Grep: { icon: FileText, label: "Grep" },
  Search: { icon: FileText, label: "Search" },
  Diagnostics: { icon: FileText, label: "Diagnostics" },
  Explored: { icon: FileText, label: "Explored" },
  Edit: { icon: Pencil, label: "Edited" },
  Write: { icon: Pencil, label: "Edited" },
  MultiEdit: { icon: Pencil, label: "Edited" },
  Edited: { icon: Pencil, label: "Edited" },
  Bash: { icon: Terminal, label: "Ran" },
  Ran: { icon: Terminal, label: "Ran" },
  run_command: { icon: Terminal, label: "Ran" },
  run_tests: { icon: Terminal, label: "Ran" },
  WebFetch: { icon: Globe, label: "WebFetch" },
  WebSearch: { icon: Globe, label: "WebSearch" },
};

/** Read/Search/Grep/Glob/Web* 一律进 Explored */
const EXPLORE_RE = /^(Read|Glob|Grep|Search|Diagnostics|WebFetch|WebSearch)$/i;

export type ToolActivityItem = {
  name: string;
  arg?: string;
  status?: "running" | "ok" | "fail";
  /** Bash/run_command 输出摘要（进终端卡正文） */
  output?: string;
  children?: ToolActivityItem[];
};

function toolMeta(name: string) {
  return TOOL_META[name] ?? { icon: Wrench, label: name };
}

async function rerunBashInTerminal(command: string) {
  const cmd = command.trim();
  if (!cmd) {
    toast.message("无命令可重跑");
    return;
  }
  workbenchTerminalFocusTab();
  const ok = await runCommandInWorkbenchTerminalBridge(cmd);
  if (ok) toast.success("已在终端重跑");
  else toast.error("终端未就绪，请先打开底栏终端");
}

/** 单行工具活动（无厚重气泡） */
export function ChatToolActivityRow({
  name,
  arg,
  status,
  onClick,
}: ToolActivityItem & { onClick?: () => void }) {
  const meta = toolMeta(name);
  const Icon = meta.icon;
  const displayArg = arg?.trim().replace(/^[`'"]|[`'"]$/g, "");
  const canRerun = /^(Bash|Ran|run_command|run_tests)$/i.test(name) && Boolean(displayArg);
  const body = (
    <>
      <Icon className="chat-tool-activity-icon" aria-hidden />
      <span className="chat-tool-activity-name">{meta.label}</span>
      {displayArg ? (
        <span className="chat-tool-activity-arg" title={displayArg}>
          {displayArg}
        </span>
      ) : null}
      {status === "running" ? (
        <Loader2 className="chat-tool-activity-status animate-spin" aria-hidden />
      ) : status === "fail" ? (
        <span className="chat-tool-activity-status chat-tool-activity-status--fail" aria-hidden />
      ) : null}
      {canRerun ? (
        <button
          type="button"
          className="chat-tool-activity-rerun ml-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[10.5px] text-muted-foreground/80 opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover/toolrow:opacity-100 focus-visible:opacity-100"
          title="在集成终端重跑此命令"
          aria-label="在终端重跑"
          onClick={(e) => {
            e.stopPropagation();
            void rerunBashInTerminal(displayArg || "");
          }}
        >
          <RotateCw className="h-3 w-3" aria-hidden />
          重跑
        </button>
      ) : null}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className="chat-tool-activity-row chat-tool-activity-row--clickable group/toolrow"
        onClick={onClick}
      >
        {body}
      </button>
    );
  }
  return <div className="chat-tool-activity-row group/toolrow">{body}</div>;
}

/** 已写入文件 = 轻量 Edit 行（点开进中栏 Review / 文件） */
export function ChatEditedFileRow({
  path,
  onOpen,
  onBuildFromPlan,
}: {
  path: string;
  onOpen?: () => void;
  onBuildFromPlan?: () => void;
}) {
  const fileName = path.split("/").pop() || path;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <ChatToolActivityRow name="Edited" arg={fileName} status="ok" onClick={onOpen} />
      {onBuildFromPlan ? (
        <button
          type="button"
          className="btn-row shrink-0 text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            onBuildFromPlan();
          }}
        >
          {PLAN_BUILD_BUTTON}
        </button>
      ) : null}
    </div>
  );
}

/**
 * 探索步骤始终折成「Explored N tools」（含仅 1 次）。
 * Edit / Write / Bash / MCP 保持顶层。
 */
export function collapseExploreTools(items: ToolActivityItem[]): ToolActivityItem[] {
  const out: ToolActivityItem[] = [];
  let exploreBuf: ToolActivityItem[] = [];

  const flushExplore = () => {
    if (!exploreBuf.length) return;
    out.push({
      name: "Explored",
      arg: `${exploreBuf.length} tool${exploreBuf.length === 1 ? "" : "s"}`,
      status: "ok",
      children: [...exploreBuf],
    });
    exploreBuf = [];
  };

  for (const item of items) {
    if (EXPLORE_RE.test(item.name)) exploreBuf.push(item);
    else {
      flushExplore();
      out.push(item);
    }
  }
  flushExplore();
  return out;
}

function formatExploredCaption(kids: ToolActivityItem[]): string {
  const files: string[] = [];
  let searches = 0;
  let lints = 0;
  for (const k of kids) {
    if (/^Diagnostics$/i.test(k.name)) {
      lints += 1;
      continue;
    }
    if (/^(Grep|Search|WebSearch|WebFetch)$/i.test(k.name)) {
      searches += 1;
      continue;
    }
    const raw = (k.arg || "").trim().replace(/^[`'"]|[`'"]$/g, "");
    if (!raw) continue;
    const name = raw.split("/").pop() || raw;
    if (name && !files.includes(name)) files.push(name);
  }
  const parts: string[] = [];
  if (files.length) parts.push(files.slice(0, 4).join(", "));
  if (searches) parts.push(`${searches} search${searches === 1 ? "" : "es"}`);
  if (lints) parts.push("lints");
  if (!parts.length) return `${kids.length} tool${kids.length === 1 ? "" : "s"}`;
  return parts.join(", ");
}

function ExploredRow({ item }: { item: ToolActivityItem }) {
  const [open, setOpen] = useState(false);
  const kids = item.children || [];
  const caption = formatExploredCaption(kids) || item.arg || "";
  return (
    <div className="chat-tool-activity-explored">
      <button
        type="button"
        className="chat-tool-activity-explored-btn chat-tool-activity-explored-btn--caption"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="chat-tool-activity-explored-label">Explored</span>
        {caption ? (
          <span className="chat-tool-activity-explored-caption" title={caption}>
            {caption}
          </span>
        ) : null}
      </button>
      {open && kids.length ? (
        <div className="chat-tool-activity-explored-body">
          {kids.map((ex, j) => (
            <ChatToolActivityRow key={`ex:${ex.name}:${ex.arg ?? ""}:${j}`} {...ex} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** 连续工具调用（默认密度） */
export function ChatToolActivityGroup({ items }: { items: ToolActivityItem[] }) {
  if (!items.length) return null;
  const collapsed = collapseExploreTools(items);

  return (
    <div className="chat-tool-activity-group">
      {collapsed.map((item, i) =>
        item.name === "Explored" && item.children?.length ? (
          <ExploredRow key={`explored:${i}`} item={item} />
        ) : (
          <ChatToolActivityRow key={`${item.name}:${item.arg ?? ""}:${i}`} {...item} />
        ),
      )}
    </div>
  );
}

export function isFileEditTool(name: string, arg?: string): boolean {
  const pathArg = arg?.trim().replace(/^[`'"]|[`'"]$/g, "") ?? "";
  return Boolean(
    pathArg &&
      /^(Edit|Write|MultiEdit|write_file|search_replace)$/i.test(name) &&
      isPlausibleWorkspaceRelPath(pathArg),
  );
}
