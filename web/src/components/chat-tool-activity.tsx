import { useState } from "react";
import {
  FileText,
  Globe,
  Loader2,
  Pencil,
  Terminal,
  Wrench,
} from "lucide-react";
import { isPlausibleWorkspaceRelPath } from "@/lib/compress-agent-display";

const TOOL_META: Record<string, { icon: typeof FileText; label: string }> = {
  Read: { icon: FileText, label: "Read" },
  Glob: { icon: FileText, label: "Glob" },
  Grep: { icon: FileText, label: "Grep" },
  Search: { icon: FileText, label: "Search" },
  Diagnostics: { icon: FileText, label: "Diagnostics" },
  Explored: { icon: FileText, label: "Explored" },
  Edit: { icon: Pencil, label: "Edit" },
  Write: { icon: Pencil, label: "Write" },
  MultiEdit: { icon: Pencil, label: "Edit" },
  Bash: { icon: Terminal, label: "Bash" },
  WebFetch: { icon: Globe, label: "WebFetch" },
  WebSearch: { icon: Globe, label: "WebSearch" },
};

/** Read/Search/Grep/Glob/Web* 一律进 Explored */
const EXPLORE_RE = /^(Read|Glob|Grep|Search|Diagnostics|WebFetch|WebSearch)$/i;

export type ToolActivityItem = {
  name: string;
  arg?: string;
  status?: "running" | "ok" | "fail";
  children?: ToolActivityItem[];
};

function toolMeta(name: string) {
  return TOOL_META[name] ?? { icon: Wrench, label: name };
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
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className="chat-tool-activity-row chat-tool-activity-row--clickable"
        onClick={onClick}
      >
        {body}
      </button>
    );
  }
  return <div className="chat-tool-activity-row">{body}</div>;
}

/** 已写入文件 = 轻量 Edit 行（点开进中栏 Review / 文件） */
export function ChatEditedFileRow({
  path,
  onOpen,
}: {
  path: string;
  onOpen?: () => void;
}) {
  const fileName = path.split("/").pop() || path;
  return (
    <ChatToolActivityRow name="Edit" arg={fileName} status="ok" onClick={onOpen} />
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
