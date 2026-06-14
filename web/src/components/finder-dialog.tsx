import { useEffect, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Share2,
  AppWindow,
  Folder,
  FileText,
  FileCode2,
  FileArchive,
  Cloud,
  Columns3,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FileItem = {
  name: string;
  type: "folder" | "file" | "zip" | "code" | "doc";
  hasChildren?: boolean;
  selected?: boolean;
  dimmed?: boolean;
};

const sidebarItems = [
  { icon: Clock, label: "最近使用", group: "" },
  { icon: Share2, label: "共享", group: "" },
  { icon: AppWindow, label: "应用程序", group: "个人收藏" },
  { icon: Folder, label: "工作文件", group: "" },
  { icon: Folder, label: "学习文件", group: "" },
  { icon: Folder, label: "个人文件", group: "" },
  { icon: Folder, label: "其他文件", group: "" },
  { icon: Folder, label: "桌面", group: "" },
  { icon: FileText, label: "文稿", group: "" },
  { icon: Folder, label: "下载", group: "" },
  { icon: Cloud, label: "iCloud 云盘", group: "位置" },
];

const middleColumn: FileItem[] = [
  { name: "图片", type: "folder", hasChildren: true },
  { name: "文稿", type: "folder", hasChildren: true },
  { name: "下载", type: "folder", hasChildren: true },
  { name: "音乐", type: "folder", hasChildren: true },
  { name: "影片", type: "folder", hasChildren: true },
  { name: "桌面", type: "folder", hasChildren: true },
  { name: "ai_completion", type: "folder", hasChildren: true },
  { name: "Applications", type: "folder", hasChildren: true },
  { name: "Applications (Parallels)", type: "folder", hasChildren: true },
  { name: "AweSun", type: "folder", hasChildren: true },
  { name: "cc-switch", type: "folder", hasChildren: true },
  { name: "Claude code", type: "folder", hasChildren: true },
  { name: "Claude code.zip", type: "zip", dimmed: true },
  { name: "openclaw", type: "folder", hasChildren: true, selected: true },
];

const rightColumn: FileItem[] = [
  { name: "AGENTS.md", type: "doc" },
  { name: "appcast.xml", type: "code" },
  { name: "apps", type: "folder", hasChildren: true },
  { name: "assets", type: "folder", hasChildren: true },
  { name: "CHANGELOG.md", type: "doc" },
  { name: "check-localstorage.html", type: "code" },
  { name: "CLAUDE.md", type: "doc" },
  { name: "CONTRIBUTING.md", type: "doc" },
  { name: "dist", type: "folder", hasChildren: true },
  { name: "dist-runtime", type: "folder", hasChildren: true },
  { name: "docker-compose.yml", type: "code" },
  { name: "docker-setup.sh", type: "file", dimmed: true },
  { name: "Dockerfile", type: "file", dimmed: true },
  { name: "Dockerfile.sandbox", type: "file", dimmed: true },
];

function fileIcon(item: FileItem) {
  switch (item.type) {
    case "folder":
      return <Folder className="h-4 w-4 fill-[#7BB7F0] text-[#5BA3E8]" />;
    case "zip":
      return <FileArchive className="h-4 w-4 text-[#9B9B9B]" />;
    case "code":
      return <FileCode2 className="h-4 w-4 text-[#7BB7F0]" />;
    case "doc":
      return <FileText className="h-4 w-4 text-[#7BB7F0]" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function Column({ items, showChevron }: { items: FileItem[]; showChevron?: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin py-1.5">
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between gap-2 px-2.5 py-[3px] text-[13px]",
            item.selected
              ? "rounded-md bg-[#0A6CFE] text-white mx-1"
              : item.dimmed
                ? "text-[#A8A8A8]"
                : "text-[#1d1d1f] hover:bg-black/[0.04]",
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {item.selected ? (
              <Folder className="h-4 w-4 shrink-0 fill-white/90 text-white" />
            ) : (
              <span className="shrink-0">{fileIcon(item)}</span>
            )}
            <span className="truncate">{item.name}</span>
          </div>
          {showChevron && item.hasChildren && (
            <ChevronRight className={cn("h-3 w-3 shrink-0", item.selected ? "text-white" : "text-[#8A8A8A]")} />
          )}
        </div>
      ))}
    </div>
  );
}

export function FinderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex h-[640px] w-[920px] max-w-[94vw] flex-col overflow-hidden rounded-xl border border-black/10 bg-[#ECECEC] shadow-2xl",
          "transition-all duration-200",
          mounted ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}
      >
        {/* Title bar */}
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-black/10 bg-gradient-to-b from-[#E8E8E8] to-[#D9D9D9] px-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]"
            >
              <X className="h-2 w-2 text-[#7d0007] opacity-0 group-hover:opacity-100" strokeWidth={3} />
            </button>
            <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <span className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>

          <div className="ml-3 flex items-center gap-1">
            <button className="flex h-6 w-7 items-center justify-center rounded-md text-[#8A8A8A] hover:bg-black/[0.06]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[#C4C4C4]">|</span>
            <button className="flex h-6 w-7 items-center justify-center rounded-md text-[#8A8A8A] hover:bg-black/[0.06]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="ml-2 flex items-center gap-1 rounded-md border border-black/10 bg-white px-1.5 py-0.5">
            <Columns3 className="h-3.5 w-3.5 text-[#5A5A5A]" />
            <ChevronDown className="h-3 w-3 text-[#8A8A8A]" />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-black/10 bg-white px-1.5 py-0.5">
            <LayoutGrid className="h-3.5 w-3.5 text-[#5A5A5A]" />
            <ChevronDown className="h-3 w-3 text-[#8A8A8A]" />
          </div>

          <div className="ml-2 flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2 py-0.5 text-[13px] text-[#1d1d1f]">
              <Folder className="h-3.5 w-3.5 fill-[#7BB7F0] text-[#5BA3E8]" />
              <span className="font-medium">openclaw</span>
              <ChevronDown className="h-3 w-3 text-[#8A8A8A]" />
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-black/10 bg-white px-2 py-0.5">
            <Search className="h-3 w-3 text-[#8A8A8A]" />
            <input
              placeholder="搜索"
              className="w-32 bg-transparent text-[12.5px] text-[#1d1d1f] outline-none placeholder:text-[#A8A8A8]"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="w-[180px] shrink-0 overflow-y-auto scrollbar-thin border-r border-black/10 bg-[#E8E8E8] py-2">
            <SidebarGroup
              items={sidebarItems.filter((i, idx) => idx < 2)}
            />
            <SidebarLabel label="个人收藏" />
            <SidebarGroup items={sidebarItems.filter((i, idx) => idx >= 2 && idx < 10)} />
            <SidebarLabel label="位置" />
            <SidebarGroup items={sidebarItems.filter((i, idx) => idx >= 10)} />
          </aside>

          {/* Columns */}
          <div className="flex min-w-0 flex-1 bg-white">
            <div className="flex flex-1 border-r border-black/10">
              <Column items={middleColumn} showChevron />
            </div>
            <div className="flex flex-1 border-r border-black/10">
              <Column items={rightColumn} />
            </div>
            <div className="w-[150px] bg-white" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex h-14 shrink-0 items-center justify-between border-t border-black/10 bg-[#ECECEC] px-4">
          <button className="rounded-md border border-black/15 bg-white px-3 py-1 text-[12.5px] font-medium text-[#1d1d1f] shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-black/[0.03]">
            显示选项
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-black/15 bg-white px-4 py-1 text-[12.5px] font-medium text-[#1d1d1f] shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:bg-black/[0.03]"
            >
              取消
            </button>
            <button className="rounded-md border border-[#0A6CFE] bg-[#0A6CFE] px-4 py-1 text-[12.5px] font-medium text-white opacity-50 shadow-sm">
              打开
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
      {label}
    </div>
  );
}

function SidebarGroup({ items }: { items: typeof sidebarItems }) {
  return (
    <ul className="space-y-px px-2">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <li
            key={i}
            className="flex cursor-default items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-[#1d1d1f] hover:bg-black/[0.05]"
          >
            <Icon className="h-3.5 w-3.5 text-[#5A5A5A]" />
            <span className="truncate">{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}