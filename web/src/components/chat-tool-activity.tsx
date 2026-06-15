import { FileText, Globe, Loader2, Pencil, Terminal, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOL_META: Record<string, { icon: typeof FileText; label: string }> = {
  Read: { icon: FileText, label: "Read" },
  Glob: { icon: FileText, label: "Glob" },
  Grep: { icon: FileText, label: "Grep" },
  Search: { icon: FileText, label: "Search" },
  Edit: { icon: Pencil, label: "Edit" },
  Write: { icon: Pencil, label: "Write" },
  MultiEdit: { icon: Pencil, label: "Edit" },
  Bash: { icon: Terminal, label: "Bash" },
  WebFetch: { icon: Globe, label: "WebFetch" },
  WebSearch: { icon: Globe, label: "WebSearch" },
};

export type ToolActivityItem = {
  name: string;
  arg?: string;
  status?: "running" | "ok" | "fail";
};

function toolMeta(name: string) {
  return TOOL_META[name] ?? { icon: Wrench, label: name };
}

/** Cursor 式单行工具活动（无厚重气泡） */
export function ChatToolActivityRow({ name, arg, status }: ToolActivityItem) {
  const meta = toolMeta(name);
  const Icon = meta.icon;
  const displayArg = arg?.trim().replace(/^[`'"]|[`'"]$/g, "");

  return (
    <div className="chat-tool-activity-row">
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
    </div>
  );
}

/** 连续工具调用合并为 Cursor 式紧凑列表 */
export function ChatToolActivityGroup({ items }: { items: ToolActivityItem[] }) {
  if (!items.length) return null;
  return (
    <div className="chat-tool-activity-group">
      {items.map((item, i) => (
        <ChatToolActivityRow key={`${item.name}:${item.arg ?? ""}:${i}`} {...item} />
      ))}
    </div>
  );
}

export function isFileEditTool(name: string, arg?: string): boolean {
  const pathArg = arg?.trim().replace(/^[`'"]|[`'"]$/g, "") ?? "";
  return Boolean(pathArg && /^(Edit|Write|MultiEdit)$/i.test(name) && /\.\w+$/.test(pathArg));
}
