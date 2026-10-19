import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  requestOpenGitScmPanel,
  requestOpenOutlinePanel,
  requestOpenSearchPanel,
  requestPrefillComposer,
  requestWorkbenchInteractionMode,
  requestWorkbenchLayoutToggle,
  requestWorkbenchQuickOpen,
  requestWorkbenchSideTab,
} from "@/lib/workbench-side-tab";
import { setWorkbenchInteractionMode } from "@/lib/workbench-interaction-mode";
import { focusBottomPanel } from "@/lib/workbench-panel-init";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import {
  hasSessionHistoryCheckpoint,
  requestRestoreSessionCheckpoint,
  subscribeSessionHistoryCheckpoint,
} from "@/lib/session-history-checkpoint";
import { getActiveEditorView } from "@/lib/codemirror-ide-handlers";
import { showCallHierarchyAt } from "@/lib/codemirror-ide-extensions";
import { toast } from "sonner";

type Cmd = {
  id: string;
  label: string;
  keywords?: string;
  run: () => void;
};

/**
 * Cmd/Ctrl+Shift+P：仅注册已接线的工作台动作（无扩展市场、无灰项占位）。
 */
export function WorkbenchCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ws = useWorkbenchWorkspace();
  const [query, setQuery] = useState("");
  const hasCheckpoint = useSyncExternalStore(
    subscribeSessionHistoryCheckpoint,
    () => hasSessionHistoryCheckpoint(),
    () => false,
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const commands = useMemo((): Cmd[] => {
    const close = () => onOpenChange(false);
    const list: Cmd[] = [
      {
        id: "quick-open",
        label: "转到文件…",
        keywords: "go to file open",
        run: () => {
          close();
          requestWorkbenchQuickOpen();
        },
      },
      {
        id: "save",
        label: "保存当前文件",
        keywords: "save",
        run: () => {
          close();
          const active = ws.editorTabs.find((t) => t.id === ws.activeEditorTabId);
          if (active?.kind === "file") void ws.saveFileTab(active.id);
        },
      },
      {
        id: "explorer",
        label: "显示资源管理器",
        keywords: "files explorer",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("left", { ensure: true });
          requestWorkbenchSideTab("files");
        },
      },
      {
        id: "search",
        label: "显示搜索",
        keywords: "search find",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("left", { ensure: true });
          requestOpenSearchPanel();
        },
      },
      {
        id: "git",
        label: "显示源代码管理",
        keywords: "git scm",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("left", { ensure: true });
          requestOpenGitScmPanel();
        },
      },
      {
        id: "outline",
        label: "显示大纲",
        keywords: "outline symbols documentSymbol",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("left", { ensure: true });
          requestOpenOutlinePanel();
        },
      },
      {
        id: "call-hierarchy",
        label: "显示调用层次结构",
        keywords: "call hierarchy incoming outgoing",
        run: () => {
          close();
          const view = getActiveEditorView();
          if (!view) {
            toast.message("请先打开可编辑的源文件");
            return;
          }
          void showCallHierarchyAt(view, view.state.selection.main.head);
        },
      },
      {
        id: "toggle-left",
        label: "切换左侧栏",
        keywords: "sidebar",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("left");
        },
      },
      {
        id: "toggle-chat",
        label: "切换聊天面板",
        keywords: "chat panel",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("chat");
        },
      },
      {
        id: "toggle-terminal",
        label: "切换终端",
        keywords: "terminal",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("terminal");
          focusBottomPanel("terminal");
        },
      },
      {
        id: "problems",
        label: "打开问题面板",
        keywords: "problems diagnostics",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("terminal", { ensure: true });
          focusBottomPanel("problems");
        },
      },
      {
        id: "problems-to-chat",
        label: "将问题添加到对话 (@problems)",
        keywords: "problems composer",
        run: () => {
          close();
          requestWorkbenchLayoutToggle("chat", { ensure: true });
          requestPrefillComposer("@problems ");
        },
      },
      {
        id: "mode-ask",
        label: "切换到 Ask 模式",
        keywords: "ask readonly",
        run: () => {
          close();
          setWorkbenchInteractionMode("ask");
          requestWorkbenchInteractionMode("ask");
        },
      },
      {
        id: "mode-plan",
        label: "切换到 Plan 模式",
        keywords: "plan",
        run: () => {
          close();
          setWorkbenchInteractionMode("plan");
          requestWorkbenchInteractionMode("plan");
        },
      },
      {
        id: "mode-agent",
        label: "切换到 Agent 模式",
        keywords: "agent",
        run: () => {
          close();
          setWorkbenchInteractionMode("agent");
          requestWorkbenchInteractionMode("agent");
        },
      },
    ];
    if (hasCheckpoint) {
      list.push({
        id: "restore-checkpoint",
        label: "恢复会话检查点",
        keywords: "undo truncate checkpoint restore",
        run: () => {
          close();
          requestRestoreSessionCheckpoint();
        },
      });
    }
    return list;
  }, [onOpenChange, ws, hasCheckpoint]);

  const q = query.trim().toLowerCase();
  const filtered = !q
    ? commands
    : commands.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          (c.keywords && c.keywords.includes(q)),
      );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="输入命令…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>无匹配命令</CommandEmpty>
        <CommandGroup heading="工作台">
          {filtered.map((c) => (
            <CommandItem key={c.id} value={`${c.label} ${c.keywords || ""}`} onSelect={() => c.run()}>
              {c.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
