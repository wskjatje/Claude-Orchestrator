import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  Sparkles,
  Search,
  FolderOpen,
  Power,
  AlertTriangle,
  X,
  FileCode2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";
import { useDesktopActionGate, useDesktopGate } from "@/hooks/use-desktop-ready";
import { DesktopGateBanner } from "@/components/desktop-gate-banner";
import { getDesktop } from "@/lib/desktop-api";
import {
  BRIDGE_OFFLINE_BANNER,
  DESKTOP_HYDRATING,
  EMPTY_STATE_OFFLINE,
  MSG_API_NOT_READY,
  PAGE_DESC,
  SKILLS_DISK_SYNC_HINT,
  SKILLS_EDITOR_HINT,
  SKILLS_EMPTY_DISK,
} from "@/lib/ui-copy";

export const Route = createFileRoute("/skills")({
  head: () => ({ meta: [{ title: "Skill · Claude Orchestrator" }] }),
  component: SkillsPage,
});

type Skill = {
  stem: string;
  basename: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
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
  enabled?: boolean;
}): Skill {
  const displayName = row.displayName?.trim() || row.name?.trim() || row.stem;
  return {
    stem: row.stem,
    basename: row.basename,
    name: displayName,
    description: row.description.trim() || "（可在 frontmatter 中加 description）",
    category: row.category?.trim() || "本机",
    enabled: row.enabled !== false,
  };
}

function SkillsPage() {
  const gate = useDesktopGate();
  const listApiReady = gate.phase === "ready" && !!getDesktop()?.listClaudeSkillMarkdown;
  const listGate = useDesktopActionGate(listApiReady);
  const folderGate = useDesktopActionGate(
    gate.phase === "ready" && !!getDesktop()?.openClaudeUserSubdir,
  );
  const [items, setItems] = useState<Skill[]>([]);
  const [listFromDisk, setListFromDisk] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [togglingStem, setTogglingStem] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("全部");
  const [detail, setDetail] = useState<Skill | null>(null);
  const [skillMd, setSkillMd] = useState<string | null>(null);
  const [skillMdErr, setSkillMdErr] = useState<string | null>(null);

  const filtered = items.filter(
    (s) =>
      (cat === "全部" || s.category === cat || (cat === "本机" && s.category === "项目")) &&
      (q === "" ||
        s.stem.includes(q.toLowerCase()) ||
        s.name.includes(q) ||
        s.description.includes(q)),
  );
  const reloadSkillList = useCallback(async () => {
    if (gate.phase !== "ready") return;
    const api = getDesktop();
    if (!api || !listApiReady) {
      setListFromDisk(false);
      setItems([]);
      setListErr(null);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setListErr(null);
    const r = await api.listClaudeSkillMarkdown();
    setListLoading(false);
    if (!r.ok || !r.items) {
      setListErr(r.error ?? "无法枚举技能目录");
      setListFromDisk(false);
      setItems([]);
      return;
    }
    setListFromDisk(true);
    setItems(r.items.map(diskSkillRowToSkill));
  }, [gate.phase, listApiReady]);

  const openSkillsFolder = useCallback(async () => {
    const api = getDesktop();
    if (!api?.openClaudeUserSubdir) {
      window.alert("当前环境无法打开系统文件夹。");
      return;
    }
    const r = await api.openClaudeUserSubdir("skills");
    if (!r.ok) window.alert(r.error ?? "无法打开文件夹");
  }, []);

  const toggleSkillEnabled = useCallback(async (skill: Skill, next: boolean) => {
    const api = getDesktop();
    if (!api?.setClaudeSkillMarkdownEnabled) {
      window.alert(MSG_API_NOT_READY);
      return;
    }
    setTogglingStem(skill.stem);
    try {
      const r = await api.setClaudeSkillMarkdownEnabled({
        basename: skill.basename || `${skill.stem}.md`,
        enabled: next,
      });
      if (!r.ok) {
        window.alert(r.error ?? "无法保存启用状态");
        return;
      }
      setItems((prev) =>
        prev.map((s) => (s.stem === skill.stem ? { ...s, enabled: next } : s)),
      );
      setDetail((d) => (d && d.stem === skill.stem ? { ...d, enabled: next } : d));
    } finally {
      setTogglingStem(null);
    }
  }, []);

  useEffect(() => {
    if (gate.phase !== "ready") return;
    void reloadSkillList();
  }, [gate.phase, reloadSkillList]);

  useEffect(() => {
    let cancelled = false;
    const api = getDesktop();
    if (!detail || !api || !listApiReady) {
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
  }, [detail, listApiReady]);

  const broken = items.filter((s) => s.warning).length;
  const enabledCount = items.filter((s) => s.enabled).length;

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
              disabled={listLoading || !listGate.canAct}
              title={!listGate.canAct ? listGate.blockHint : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", listLoading && "animate-spin")} /> 从本机刷新
            </button>
            <button
              type="button"
              onClick={() => void openSkillsFolder()}
              disabled={!folderGate.canAct}
              title={!folderGate.canAct ? folderGate.blockHint : "在访达中打开 ~/.claude/skills"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <FolderOpen className="h-3.5 w-3.5" /> 在 Finder 打开
            </button>
            <InfoHint side="left">{SKILLS_EDITOR_HINT}</InfoHint>
          </>
        }
      />

      <DesktopGateBanner offlineCopy={BRIDGE_OFFLINE_BANNER} />
      {gate.hasDesktop && (listFromDisk || listErr) ? (
        <div className="border-b border-border bg-surface-elevated/80 px-4 py-2.5 sm:px-6 lg:px-7">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {listFromDisk ? <>{SKILLS_DISK_SYNC_HINT}</> : null}
            {listErr ? <span className="mt-1 block text-destructive">{listErr}</span> : null}
          </p>
        </div>
      ) : null}

      <div className="px-4 py-5 sm:px-6 lg:px-7">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="总计技能" value={items.length} />
          <StatCard label="已启用" value={enabledCount} valueClass="text-success" />
          <StatCard
            label="缺少依赖"
            value={broken}
            valueClass={broken ? "text-warning" : undefined}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索技能名或描述…"
              className="h-8 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                  cat === c
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <button
              key={s.stem}
              onClick={() => setDetail(s)}
              className={cn(
                "group rounded-xl border border-border bg-surface-elevated p-4 text-left shadow-xs transition hover:border-primary/30",
                !s.enabled && "opacity-70",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    s.enabled ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[12.5px] font-semibold text-foreground">
                      {s.name}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {s.category}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]">
                {s.warning ? (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <AlertTriangle className="h-3 w-3" /> {s.warning}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "font-medium",
                      s.enabled ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    {s.enabled ? "● 已启用" : "○ 已停用"}
                  </span>
                )}
                <span
                  role="switch"
                  aria-checked={s.enabled}
                  title={s.enabled ? "停用（写入 frontmatter）" : "启用（写入 frontmatter）"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (togglingStem || !listGate.canAct) return;
                    void toggleSkillEnabled(s, !s.enabled);
                  }}
                  className={cn(
                    "inline-flex h-4 w-7 items-center rounded-full transition",
                    listGate.canAct && !togglingStem
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50",
                    s.enabled ? "bg-success" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3 w-3 transform rounded-full bg-white shadow transition",
                      s.enabled ? "translate-x-3.5" : "translate-x-0.5",
                    )}
                  />
                </span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-[12.5px] text-muted-foreground">
              {gate.phase === "hydrating" || listLoading
                ? DESKTOP_HYDRATING
                : gate.phase === "offline"
                  ? EMPTY_STATE_OFFLINE
                  : listFromDisk && items.length === 0 && !q
                    ? SKILLS_EMPTY_DISK
                    : "无匹配的技能"}
            </div>
          )}
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-foreground/25 backdrop-blur-sm"
            onClick={() => setDetail(null)}
          />
          <div className="flex w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    detail.enabled
                      ? "bg-primary-soft text-primary"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-foreground">{detail.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {detail.category} · {detail.stem}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <p className="text-[12.5px] leading-relaxed text-foreground/80">
                {detail.description}
              </p>
              {detail.warning && (
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
                  <div className="mb-1 inline-flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3 w-3" /> 依赖告警
                  </div>
                  {detail.warning}
                </div>
              )}
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <FileCode2 className="h-3 w-3" /> 本机文件（平铺）
                </div>
                <code className="font-mono text-[12px] text-foreground">
                  ~/.claude/skills/{detail.stem}.md
                </code>
                {(skillMd || skillMdErr) && (
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-code-bg/60 p-2 font-mono text-[11px] leading-relaxed">
                    {skillMdErr ? <span className="text-destructive">{skillMdErr}</span> : skillMd}
                  </pre>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                disabled={!listGate.canAct || togglingStem === detail.stem}
                onClick={() => void toggleSkillEnabled(detail, !detail.enabled)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
              >
                <Power className="h-3.5 w-3.5" /> {detail.enabled ? "停用" : "启用"}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium text-foreground transition hover:bg-secondary"
                onClick={() => void openSkillsFolder()}
              >
                <FolderOpen className="h-3.5 w-3.5" /> 在 Finder 打开
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 shadow-xs">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-[22px] font-bold tracking-tight text-foreground", valueClass)}>
        {value}
      </div>
    </div>
  );
}
