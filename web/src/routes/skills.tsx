import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Sparkles, Search, FolderOpen, Power, AlertTriangle, X, FileCode2, Hash, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { getDesktop } from "@/lib/desktop-api";
import { DEMO_LIST_BANNER, LOCAL_ONLY_HINT, PAGE_DESC, SKILLS_EDITOR_HINT } from "@/lib/ui-copy";

export const Route = createFileRoute("/skills")({
  head: () => ({ meta: [{ title: "Skill · Claude Orchestrator" }] }),
  component: SkillsPage,
});

type Skill = {
  stem: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  calls: number;
  warning?: string;
};

const CATS = ["全部", "工程", "写作", "集成", "分析", "媒体", "本机"] as const;

function diskSkillRowToSkill(row: {
  basename: string;
  stem: string;
  description: string;
  displayName?: string;
  name?: string;
  category?: "项目" | "通用" | "实验" | string;
}): Skill {
  const displayName =
    row.displayName?.trim() ||
    row.name?.trim() ||
    row.stem;
  return {
    stem: row.stem,
    name: displayName,
    description:
      row.description.trim() ||
      "（可在 frontmatter 中加 description）",
    category: row.category?.trim() || "本机",
    enabled: true,
    calls: 0,
  };
}

function SkillsPage() {
  const hasDesktopApi = useHasDesktop();
  const [items, setItems] = useState<Skill[]>([]);
  const [listFromDisk, setListFromDisk] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("全部");
  const [detail, setDetail] = useState<Skill | null>(null);
  const [skillMd, setSkillMd] = useState<string | null>(null);
  const [skillMdErr, setSkillMdErr] = useState<string | null>(null);

  const filtered = items.filter(s =>
    (cat === "全部" || s.category === cat || (cat === "本机" && s.category === "项目")) &&
    (q === "" ||
      s.stem.includes(q.toLowerCase()) ||
      s.name.includes(q) ||
      s.description.includes(q))
  );
  const toggle = (stem: string) =>
    setItems(arr => arr.map(s => s.stem === stem ? { ...s, enabled: !s.enabled } : s));

  const reloadSkillList = useCallback(async () => {
    const api = getDesktop();
    if (!api || !hasDesktopApi) {
      setListFromDisk(false);
      setItems([]);
      setListErr(null);
      return;
    }
    setListLoading(true);
    setListErr(null);
    const r = await api.listClaudeSkillMarkdown();
    setListLoading(false);
    if (!r.ok || !r.items) {
      setListErr(r.error ?? "无法枚举技能目录");
      setListFromDisk(false);
      return;
    }
    setListFromDisk(true);
    setItems(r.items.map(diskSkillRowToSkill));
  }, [hasDesktopApi]);

  const openSkillsFolder = useCallback(async () => {
    const api = getDesktop();
    if (!api?.openClaudeUserSubdir) {
      window.alert("当前环境无法打开系统文件夹。");
      return;
    }
    const r = await api.openClaudeUserSubdir("skills");
    if (!r.ok) window.alert(r.error ?? "无法打开文件夹");
  }, []);

  useEffect(() => {
    if (!hasDesktopApi) return;
    void reloadSkillList();
  }, [hasDesktopApi, reloadSkillList]);

  useEffect(() => {
    let cancelled = false;
    const api = getDesktop();
    if (!detail || !api || !hasDesktopApi) {
      setSkillMd(null);
      setSkillMdErr(null);
      return;
    }
    void api.readClaudeSkillMarkdown(`${detail.stem}.md`).then((r) => {
      if (cancelled) return;
      if (r.ok && r.content) {
        setSkillMd(r.content);
        setSkillMdErr(null);
      } else {
        setSkillMd(null);
        setSkillMdErr(r.error ?? "无法读取");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [detail?.stem, hasDesktopApi]);

  const enabled = items.filter(s => s.enabled).length;
  const broken = items.filter(s => s.warning).length;

  return (
    <AppShell>
      <PageHeader
        title="Skill"
        description={PAGE_DESC.skills}
        actions={
          <>
            <button
              type="button"
              onClick={() => void reloadSkillList()}
              disabled={listLoading || !hasDesktopApi}
              title={!hasDesktopApi ? LOCAL_ONLY_HINT : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", listLoading && "animate-spin")} /> 从本机刷新
            </button>
            <button
              type="button"
              onClick={() => void openSkillsFolder()}
              disabled={!hasDesktopApi}
              title={!hasDesktopApi ? LOCAL_ONLY_HINT : "在访达中打开 ~/.claude/skills"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <FolderOpen className="h-3.5 w-3.5" /> 在 Finder 打开
            </button>
            <InfoHint side="left">{SKILLS_EDITOR_HINT}</InfoHint>
          </>
        }
      />

      {hasDesktopApi && (
        <div className="border-b border-border bg-surface-elevated/80 px-4 py-2.5 sm:px-6 lg:px-7">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {listFromDisk ? <>已与 Claude Code Skill 目录同步。</> : <>{DEMO_LIST_BANNER}</>}
            {listErr ? <span className="mt-1 block text-destructive">{listErr}</span> : null}
          </p>
        </div>
      )}

      <div className="px-4 py-5 sm:px-6 lg:px-7">
        {/* 顶部统计 */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="总计技能" value={items.length} />
          <StatCard label="已启用" value={enabled} valueClass="text-success" />
          <StatCard label="本周调用" value={items.reduce((a, s) => a + s.calls, 0)} />
          <StatCard label="缺少依赖" value={broken} valueClass={broken ? "text-warning" : undefined} />
        </div>

        {/* 工具栏 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜索技能名或描述…"
              className="h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5">
            {CATS.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                  cat === c ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* 技能网格 */}
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(s => (
            <button
              key={s.stem}
              onClick={() => setDetail(s)}
              className={cn(
                "group rounded-xl border bg-surface-elevated p-4 text-left shadow-xs transition hover:border-primary/30",
                s.enabled ? "border-border" : "border-border opacity-75",
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  s.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground",
                )}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[12.5px] font-semibold text-foreground">{s.name}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{s.category}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{s.description}</p>
                </div>
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); toggle(s.stem); }}
                  className={cn(
                    "cursor-pointer rounded-md p-1.5 transition",
                    s.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary",
                  )}
                  title={s.enabled ? "停用" : "启用"}
                >
                  <Power className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]">
                <span className="text-muted-foreground">本周 {s.calls} 次调用</span>
                {s.warning ? (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <AlertTriangle className="h-3 w-3" /> {s.warning}
                  </span>
                ) : (
                  <span className={cn("font-medium", s.enabled ? "text-success" : "text-muted-foreground")}>
                    {s.enabled ? "● 已启用" : "○ 已停用"}
                  </span>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-[12.5px] text-muted-foreground">
              {listFromDisk && items.length === 0 && !q
                ? "~/.claude/skills 下暂无 .md，可在此目录添加。"
                : "无匹配的技能"}
            </div>
          )}
        </div>
      </div>

      {/* 详情抽屉 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={() => setDetail(null)} />
          <div className="flex w-full max-w-md flex-col border-l border-border bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", detail.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground")}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-foreground">{detail.name}</div>
                  <div className="text-[11px] text-muted-foreground">{detail.category} · {detail.stem}</div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <p className="text-[12.5px] leading-relaxed text-foreground/80">{detail.description}</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                  <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">本周调用</div>
                  <div className="mt-0.5 text-[16px] font-bold tabular-nums text-foreground">{detail.calls}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                  <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">状态</div>
                  <div className={cn("mt-0.5 text-[13px] font-semibold", detail.enabled ? "text-success" : "text-muted-foreground")}>
                    {detail.enabled ? "已启用" : "已停用"}
                  </div>
                </div>
              </div>
              {detail.warning && (
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
                  <div className="mb-1 inline-flex items-center gap-1 font-medium"><AlertTriangle className="h-3 w-3" /> 依赖告警</div>
                  {detail.warning}
                </div>
              )}
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <FileCode2 className="h-3 w-3" /> 本机文件（平铺）
                </div>
                <code className="font-mono text-[12px] text-foreground">~/.claude/skills/{detail.stem}.md</code>
                {(skillMd || skillMdErr) && (
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-code-bg/60 p-2 font-mono text-[11px] leading-relaxed">
                    {skillMdErr ? <span className="text-destructive">{skillMdErr}</span> : skillMd}
                  </pre>
                )}
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Hash className="h-3 w-3" /> 最近调用
                </div>
                {detail.calls > 0 ? (
                  <ul className="space-y-1 text-[12px] text-muted-foreground">
                    <li className="flex justify-between border-b border-border py-1.5"><span>2 小时前</span><span className="text-success">成功</span></li>
                    <li className="flex justify-between border-b border-border py-1.5"><span>昨天 16:42</span><span className="text-success">成功</span></li>
                    <li className="flex justify-between py-1.5"><span>3 天前</span><span className="text-success">成功</span></li>
                  </ul>
                ) : (
                  <div className="rounded border border-dashed border-border py-6 text-center text-[12px] text-muted-foreground">尚无调用记录</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
              <button
                onClick={() => { toggle(detail.stem); setDetail(d => d ? { ...d, enabled: !d.enabled } : d); }}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition",
                  detail.enabled
                    ? "border border-border bg-surface text-foreground hover:bg-secondary"
                    : "text-primary-foreground shadow-sm hover:opacity-95",
                )}
                style={!detail.enabled ? { backgroundImage: "var(--gradient-primary)" } : undefined}
              >
                <Power className="h-3.5 w-3.5" /> {detail.enabled ? "停用" : "启用"}
              </button>
              <button className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium text-foreground transition hover:bg-secondary">
                <FileCode2 className="h-3.5 w-3.5" /> 在编辑器中打开
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: number | string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 shadow-xs">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-[22px] font-bold tracking-tight text-foreground", valueClass)}>{value}</div>
    </div>
  );
}
