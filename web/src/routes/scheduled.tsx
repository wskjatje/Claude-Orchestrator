import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  DetailActions,
  DetailBody,
  ListCard,
  ListEmpty,
  ListPane,
  ListScrollArea,
  ListSearch,
  ListStats,
  ListToolbar,
  PageBanner,
  PageRoot,
  ToggleSwitch,
} from "@/components/page-layout";
import { Plus, Save, Play, Trash2, Clock, X } from "lucide-react";
import { getDesktop } from "@/lib/desktop-api";
import type { ScheduledTask } from "@/types/desktop";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { PAGE_DESC, SCHEDULED_OFFLINE } from "@/lib/ui-copy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scheduled")({
  head: () => ({ meta: [{ title: "定时任务 · Claude Orchestrator" }] }),
  component: ScheduledPage,
});

type DrawerMode = "closed" | "create" | "detail";

function taskSummary(t: ScheduledTask): string {
  const sched =
    t.scheduleType === "interval" ? `每 ${t.intervalMinutes} 分钟` : `每天 ${t.dailyTime}`;
  const act =
    t.action === "toast" ? "桌面通知" : t.action === "log" ? "写应用日志" : "定时问询";
  return `${sched} · ${act}`;
}

function defaultTask(): ScheduledTask {
  return {
    id: `t${Date.now()}`,
    name: "新任务",
    enabled: false,
    scheduleType: "interval",
    intervalMinutes: 60,
    dailyTime: "09:00",
    action: "toast",
    payload: "",
    chatSessionId: "",
  };
}

function formatLastRun(t: ScheduledTask, short = false): string {
  if (!t.lastRunAt) return short ? "未执行" : "尚未执行";
  const when = new Date(t.lastRunAt).toLocaleString(undefined, {
    hour12: false,
    month: short ? "numeric" : "2-digit",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (t.lastRunError) return short ? "上次失败" : `${when} · ${t.lastRunError}`;
  return when;
}

function ScheduledPage() {
  const hasDesktopApi = useHasDesktop();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState("");
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScheduledTask | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("closed");
  const [createDraft, setCreateDraft] = useState<ScheduledTask | null>(null);

  const load = useCallback(async () => {
    const api = getDesktop();
    if (!api) {
      setLoading(false);
      return;
    }
    const r = await api.scheduledTasksGet();
    if (r.ok && Array.isArray(r.tasks)) setTasks(r.tasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const api = getDesktop();
    if (!api?.onScheduledTasksChanged) return;
    return api.onScheduledTasksChanged((data) => {
      if (Array.isArray(data?.tasks)) setTasks(data.tasks);
    });
  }, []);

  const persist = async (next: ScheduledTask[]) => {
    const api = getDesktop();
    if (!api) return;
    const r = await api.scheduledTasksSave(next);
    if (!r.ok) setHint(r.error || "保存失败");
    else {
      setHint("已保存");
      if (r.tasks) setTasks(r.tasks);
    }
  };

  const applyTasks = (next: ScheduledTask[]) => {
    setTasks(next);
    void persist(next);
  };

  const runNow = async (id: string) => {
    const api = getDesktop();
    if (!api) return;
    const r = await api.scheduledTasksRunNow(id);
    setHint(r.ok ? "已触发执行" : r.error || "执行失败");
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tasks;
    return tasks.filter(
      (t) => t.name.toLowerCase().includes(s) || taskSummary(t).toLowerCase().includes(s),
    );
  }, [tasks, q]);

  const active = tasks.find((t) => t.id === activeId) ?? null;
  const editing = draft ?? active;
  const isDirty = draft !== null;

  const closeDrawer = () => {
    setDrawerMode("closed");
    setCreateDraft(null);
    setDraft(null);
    setActiveId(null);
  };

  const patchEditing = (patch: Partial<ScheduledTask>) => {
    if (draft) setDraft({ ...draft, ...patch });
    else if (active) setDraft({ ...active, ...patch });
  };

  const openCreateDrawer = () => {
    setCreateDraft(defaultTask());
    setDraft(null);
    setActiveId(null);
    setDrawerMode("create");
  };

  const saveNewTask = () => {
    if (!createDraft) return;
    applyTasks([...tasks, createDraft]);
    setActiveId(createDraft.id);
    setCreateDraft(null);
    setDrawerMode("detail");
  };

  const openDetailDrawer = (t: ScheduledTask) => {
    setDraft(null);
    setActiveId(t.id);
    setCreateDraft(null);
    setDrawerMode("detail");
  };

  const saveChanges = () => {
    if (!draft) return;
    const next = tasks.map((t) => (t.id === draft.id ? draft : t));
    setDraft(null);
    applyTasks(next);
  };

  const discardChanges = () => {
    setDraft(null);
  };

  const deleteActive = () => {
    if (!activeId) return;
    const next = tasks.filter((t) => t.id !== activeId);
    applyTasks(next);
    closeDrawer();
  };

  const enabledCount = tasks.filter((t) => t.enabled).length;
  const drawerOpen = drawerMode !== "closed";

  return (
    <AppShell variant="fill">
      <PageRoot>
        <PageHeader
          title="定时任务"
          description={PAGE_DESC.scheduled}
          actions={
            <button
              type="button"
              onClick={() => openCreateDrawer()}
              disabled={!hasDesktopApi || loading}
              className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold shadow-sm transition hover:opacity-95 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> 添加任务
            </button>
          }
        />

        {!hasDesktopApi ? (
          <PageBanner className="border-warning/30 bg-warning/10 text-warning">
            {SCHEDULED_OFFLINE}
          </PageBanner>
        ) : null}

        {hint ? (
          <div className="shrink-0 border-b border-primary/20 bg-primary-soft/25 px-4 py-2 text-[12px] text-foreground sm:px-5 lg:px-6">
            {hint}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">
          <ListPane>
            <ListToolbar>
              <ListSearch value={q} onChange={setQ} placeholder="搜索任务…" />
              <ListStats>
                <span>
                  共 <b className="text-foreground">{tasks.length}</b>
                </span>
                <span>
                  启用 <b className="text-success">{enabledCount}</b>
                </span>
              </ListStats>
            </ListToolbar>
            <ListScrollArea>
              {loading ? (
                <p className="text-[12px] text-muted-foreground">加载中…</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((t) => (
                    <ListCard
                      key={t.id}
                      active={activeId === t.id && drawerMode === "detail"}
                      onClick={() => openDetailDrawer(t)}
                      icon={Clock}
                      title={t.name}
                      badge={t.enabled ? "启用" : undefined}
                      description={taskSummary(t)}
                      trailing={
                        <ToggleSwitch
                          checked={t.enabled}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(en) => {
                            applyTasks(tasks.map((x) => (x.id === t.id ? { ...x, enabled: en } : x)));
                          }}
                        />
                      }
                    >
                      <p
                        className={cn(
                          "mt-1.5 text-[11px]",
                          t.lastRunError ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {formatLastRun(t, true)}
                      </p>
                    </ListCard>
                  ))}
                  {filtered.length === 0 ? (
                    <ListEmpty>暂无任务，点击「添加任务」创建。</ListEmpty>
                  ) : null}
                </div>
              )}
            </ListScrollArea>
          </ListPane>
        </div>

        {drawerOpen ? (
          <ScheduledTaskDrawer
            title={drawerMode === "create" ? "添加定时任务" : editing?.name ?? "任务详情"}
            subtitle={
              drawerMode === "create"
                ? "保存后立即加入任务列表"
                : editing
                  ? taskSummary(editing)
                  : undefined
            }
            onClose={closeDrawer}
          >
            {drawerMode === "create" && createDraft ? (
              <ScheduledTaskEditor
                task={createDraft}
                onPatch={(patch) => setCreateDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
                onToggleEnabled={(en) =>
                  setCreateDraft((prev) => (prev ? { ...prev, enabled: en } : prev))
                }
                footer={
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium hover:bg-secondary"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => saveNewTask()}
                      className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold"
                    >
                      <Save className="h-3.5 w-3.5" /> 创建任务
                    </button>
                  </div>
                }
              />
            ) : null}

            {drawerMode === "detail" && active && editing ? (
              <ScheduledTaskEditor
                task={editing}
                onPatch={patchEditing}
                showLastRun
                footer={
                  <DetailActions className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {isDirty ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveChanges()}
                            className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold"
                          >
                            <Save className="h-3.5 w-3.5" /> 保存修改
                          </button>
                          <button
                            type="button"
                            onClick={() => discardChanges()}
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium hover:bg-secondary"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void runNow(editing.id)}
                          disabled={!hasDesktopApi}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium hover:bg-secondary disabled:opacity-40"
                        >
                          <Play className="h-3.5 w-3.5" /> 立即执行
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteActive()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12.5px] font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> 删除
                      </button>
                    </div>
                  </DetailActions>
                }
                onToggleEnabled={(en) => {
                  if (draft) {
                    patchEditing({ enabled: en });
                    return;
                  }
                  applyTasks(tasks.map((t) => (t.id === editing.id ? { ...t, enabled: en } : t)));
                  setDraft(null);
                }}
              />
            ) : null}
          </ScheduledTaskDrawer>
        ) : null}
      </PageRoot>
    </AppShell>
  );
}

function ScheduledTaskDrawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-xs" onClick={onClose} />
      <div className="flex h-full max-h-screen w-full max-w-lg flex-col border-l border-border bg-surface-elevated shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <div className="min-w-0 pr-3">
            <div className="truncate text-[14px] font-semibold text-foreground">{title}</div>
            {subtitle ? (
              <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ScheduledTaskEditor({
  task,
  onPatch,
  onToggleEnabled,
  showLastRun = false,
  footer,
}: {
  task: ScheduledTask;
  onPatch: (patch: Partial<ScheduledTask>) => void;
  onToggleEnabled: (enabled: boolean) => void;
  showLastRun?: boolean;
  footer?: ReactNode;
}) {
  return (
    <DetailBody>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          <input
            value={task.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            className="w-full border-0 bg-transparent p-0 text-[16px] font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
            placeholder="任务名称"
          />
          <p className="mt-1 text-[11.5px] text-muted-foreground">{taskSummary(task)}</p>
          {showLastRun ? (
            <p
              className={cn(
                "mt-0.5 text-[11px]",
                task.lastRunError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              上次执行 · {formatLastRun(task)}
            </p>
          ) : null}
        </div>
        <label className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            启用
          </span>
          <ToggleSwitch checked={task.enabled} onChange={onToggleEnabled} />
        </label>
      </div>

      <section className="shrink-0 space-y-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">调度</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="类型" className="col-span-2 sm:col-span-1">
            <select
              value={task.scheduleType}
              onChange={(e) => onPatch({ scheduleType: e.target.value as ScheduledTask["scheduleType"] })}
              className={fieldInputClass}
            >
              <option value="interval">固定间隔</option>
              <option value="daily">每日时刻</option>
            </select>
          </Field>
          {task.scheduleType === "interval" ? (
            <Field label="间隔（分钟）" className="col-span-2 sm:col-span-1">
              <input
                type="number"
                min={1}
                value={task.intervalMinutes}
                onChange={(e) =>
                  onPatch({ intervalMinutes: Math.max(1, parseInt(e.target.value, 10) || 60) })
                }
                className={cn(fieldInputClass, "font-mono")}
              />
            </Field>
          ) : (
            <Field label="时间 HH:MM" className="col-span-2 sm:col-span-1">
              <input
                value={task.dailyTime}
                onChange={(e) => onPatch({ dailyTime: e.target.value })}
                className={cn(fieldInputClass, "font-mono")}
                placeholder="09:00"
              />
            </Field>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <h4 className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          动作
        </h4>
        <Field label="类型" className="shrink-0">
          <select
            value={task.action}
            onChange={(e) => onPatch({ action: e.target.value as ScheduledTask["action"] })}
            className={fieldInputClass}
          >
            <option value="toast">桌面通知</option>
            <option value="log">写应用日志</option>
            <option value="reportAppend">定时问询（Claude → 日报）</option>
          </select>
        </Field>
        <Field label="文案 / 问询要点" className="flex min-h-0 flex-1 flex-col">
          <textarea
            value={task.payload}
            onChange={(e) => onPatch({ payload: e.target.value })}
            placeholder="通知内容或交给模型的问询要点…"
            className={cn(fieldInputClass, "min-h-[120px] flex-1 resize-none py-2 leading-relaxed")}
          />
        </Field>
        {task.action === "reportAppend" ? (
          <Field label="关联会话 ID（可选）" className="shrink-0">
            <input
              value={task.chatSessionId}
              onChange={(e) => onPatch({ chatSessionId: e.target.value })}
              placeholder="s0"
              className={cn(fieldInputClass, "font-mono")}
            />
          </Field>
        ) : null}
      </section>

      <div className="mt-auto shrink-0 border-t border-border pt-4">
        <p className="mb-3 font-mono text-[10px] text-muted-foreground/80">{task.id}</p>
        {footer}
      </div>
    </DetailBody>
  );
}

const fieldInputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-[12.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 shrink-0 text-[11px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
