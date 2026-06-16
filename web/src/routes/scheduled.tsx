import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  DetailActions,
  DetailBody,
  DetailPane,
  ListCard,
  ListDetailLayout,
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
import { Plus, Save, Play, Trash2, Clock } from "lucide-react";
import { getDesktop, hasDesktop } from "@/lib/desktop-api";
import type { ScheduledTask } from "@/types/desktop";
import { PAGE_DESC, SCHEDULED_BANNER_ONLINE, SCHEDULED_OFFLINE } from "@/lib/ui-copy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scheduled")({
  head: () => ({ meta: [{ title: "定时任务 · Claude Orchestrator" }] }),
  component: ScheduledPage,
});

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
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState("");
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScheduledTask | null>(null);

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
  const isNew = Boolean(draft && !tasks.some((t) => t.id === draft.id));
  const isDirty = draft !== null;

  const patchEditing = (patch: Partial<ScheduledTask>) => {
    if (draft) setDraft({ ...draft, ...patch });
    else if (active) setDraft({ ...active, ...patch });
  };

  const openNew = () => {
    const t = defaultTask();
    setDraft(t);
    setActiveId(t.id);
  };

  const selectTask = (t: ScheduledTask) => {
    setDraft(null);
    setActiveId(t.id);
  };

  const saveChanges = () => {
    if (!draft) return;
    const exists = tasks.some((t) => t.id === draft.id);
    const next = exists ? tasks.map((t) => (t.id === draft.id ? draft : t)) : [...tasks, draft];
    setDraft(null);
    applyTasks(next);
  };

  const discardChanges = () => {
    setDraft(null);
    if (isNew) setActiveId(null);
  };

  const deleteActive = () => {
    if (!activeId) return;
    const next = tasks.filter((t) => t.id !== activeId);
    setActiveId(null);
    setDraft(null);
    applyTasks(next);
  };

  const enabledCount = tasks.filter((t) => t.enabled).length;

  return (
    <AppShell variant="fill">
      <PageRoot>
        <PageHeader
          title="定时任务"
          description={PAGE_DESC.scheduled}
          actions={
            <button
              type="button"
              onClick={() => openNew()}
              disabled={!hasDesktop() || loading}
              className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold shadow-sm transition hover:opacity-95 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> 添加任务
            </button>
          }
        />

        <PageBanner className={!hasDesktop() ? "border-warning/30 bg-warning/10 text-warning" : undefined}>
          {!hasDesktop()
            ? SCHEDULED_OFFLINE
            : SCHEDULED_BANNER_ONLINE}
        </PageBanner>

        {hint ? (
          <div className="shrink-0 border-b border-primary/20 bg-primary-soft/25 px-4 py-2 text-[12px] text-foreground sm:px-5 lg:px-6">
            {hint}
          </div>
        ) : null}

        <ListDetailLayout detailWidth="420px" list={
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
                  <div className="grid grid-cols-1 gap-2">
                      {filtered.map((t) => (
                        <ListCard
                          key={t.id}
                          active={activeId === t.id}
                          onClick={() => selectTask(t)}
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
                      {filtered.length === 0 && (
                        <ListEmpty>暂无任务，点击「添加任务」创建。</ListEmpty>
                      )}
                  </div>
                )}
              </ListScrollArea>
            </ListPane>
          }
          detail={
            <DetailPane empty="选择左侧任务，或添加新任务。">
              {editing ? (
                <DetailBody>
                  <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border pb-4">
                    <div className="min-w-0 flex-1">
                      <input
                        value={editing.name}
                        onChange={(e) => patchEditing({ name: e.target.value })}
                        className="w-full border-0 bg-transparent p-0 text-[16px] font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                        placeholder="任务名称"
                      />
                      <p className="mt-1 text-[11.5px] text-muted-foreground">{taskSummary(editing)}</p>
                      <p
                        className={cn(
                          "mt-0.5 text-[11px]",
                          editing.lastRunError ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        上次执行 · {formatLastRun(editing)}
                      </p>
                    </div>
                    <label className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                        启用
                      </span>
                      <ToggleSwitch
                        checked={editing.enabled}
                        onChange={(en) => {
                          if (isNew) {
                            patchEditing({ enabled: en });
                            return;
                          }
                          applyTasks(tasks.map((t) => (t.id === editing.id ? { ...t, enabled: en } : t)));
                          setDraft(null);
                        }}
                      />
                    </label>
                  </div>

                  <section className="shrink-0 space-y-3">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      调度
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="类型" className="col-span-2 sm:col-span-1">
                        <select
                          value={editing.scheduleType}
                          onChange={(e) =>
                            patchEditing({ scheduleType: e.target.value as ScheduledTask["scheduleType"] })
                          }
                          className={fieldInputClass}
                        >
                          <option value="interval">固定间隔</option>
                          <option value="daily">每日时刻</option>
                        </select>
                      </Field>
                      {editing.scheduleType === "interval" ? (
                        <Field label="间隔（分钟）" className="col-span-2 sm:col-span-1">
                          <input
                            type="number"
                            min={1}
                            value={editing.intervalMinutes}
                            onChange={(e) =>
                              patchEditing({
                                intervalMinutes: Math.max(1, parseInt(e.target.value, 10) || 60),
                              })
                            }
                            className={cn(fieldInputClass, "font-mono")}
                          />
                        </Field>
                      ) : (
                        <Field label="时间 HH:MM" className="col-span-2 sm:col-span-1">
                          <input
                            value={editing.dailyTime}
                            onChange={(e) => patchEditing({ dailyTime: e.target.value })}
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
                        value={editing.action}
                        onChange={(e) => patchEditing({ action: e.target.value as ScheduledTask["action"] })}
                        className={fieldInputClass}
                      >
                        <option value="toast">桌面通知</option>
                        <option value="log">写应用日志</option>
                        <option value="reportAppend">定时问询（Claude → 日报）</option>
                      </select>
                    </Field>
                    <Field label="文案 / 问询要点" className="flex min-h-0 flex-1 flex-col">
                      <textarea
                        value={editing.payload}
                        onChange={(e) => patchEditing({ payload: e.target.value })}
                        placeholder="通知内容或交给模型的问询要点…"
                        className={cn(
                          fieldInputClass,
                          "min-h-[120px] flex-1 resize-none py-2 leading-relaxed",
                        )}
                      />
                    </Field>
                    {editing.action === "reportAppend" ? (
                      <Field label="关联会话 ID（可选）" className="shrink-0">
                        <input
                          value={editing.chatSessionId}
                          onChange={(e) => patchEditing({ chatSessionId: e.target.value })}
                          placeholder="s0"
                          className={cn(fieldInputClass, "font-mono")}
                        />
                      </Field>
                    ) : null}
                  </section>

                  <div className="mt-auto shrink-0 border-t border-border pt-4">
                    <p className="mb-3 font-mono text-[10px] text-muted-foreground/80">{editing.id}</p>
                    <DetailActions className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {isDirty ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveChanges()}
                            className="btn-gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {isNew ? "创建任务" : "保存修改"}
                          </button>
                          <button
                            type="button"
                            onClick={() => discardChanges()}
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium hover:bg-secondary"
                          >
                            取消
                          </button>
                        </>
                      ) : !isNew ? (
                        <button
                          type="button"
                          onClick={() => void runNow(editing.id)}
                          disabled={!hasDesktop()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-medium hover:bg-secondary disabled:opacity-40"
                        >
                          <Play className="h-3.5 w-3.5" /> 立即执行
                        </button>
                      ) : null}
                      {!isNew ? (
                        <button
                          type="button"
                          onClick={() => deleteActive()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12.5px] font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> 删除
                        </button>
                      ) : null}
                    </div>
                    </DetailActions>
                  </div>
                </DetailBody>
              ) : null}
            </DetailPane>
          }
        />
      </PageRoot>
    </AppShell>
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
