import { X } from "lucide-react";

export function GithubDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const repos = [
    { name: "EPLB", desc: "EP 间并行动态负载均衡" },
    { name: "deepseek", desc: "面向 MoE 与 EP 的通信相关参考" },
    { name: "lighthouse", desc: "网络应用质量与性能" },
    { name: "blog", desc: "数据结构与算法笔记" },
    { name: "notekit", desc: "支持手绘的 Markdown 笔记" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-foreground">引入开源仓库</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              目前仅支持在终端手动克隆公开仓库；此处可记录常用 GitHub 链接便于复制。
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          type="text"
          placeholder="输入仓库 URL 或搜索…"
          className="mt-5 h-10 w-full rounded-xl border border-border bg-secondary px-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-3 text-[11px] text-muted-foreground">最近使用的仓库</p>
        <div className="mt-2 space-y-1 overflow-y-auto">
          {repos.map((r) => (
            <button
              key={r.name}
              onClick={() => {
                navigator.clipboard.writeText(`https://github.com/barry/${r.name}`);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-secondary"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-[12px] font-semibold text-foreground">
                <span className="text-amber-500">{r.name[0]}</span>
              </span>
              <div>
                <div className="text-[13px] font-medium text-foreground">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">{r.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
