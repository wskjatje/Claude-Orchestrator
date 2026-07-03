import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENT_ARTIFACT_PATHS } from "@/lib/agent-artifact-paths";

/** Agent 选择条目 */
type AgentEntry = {
  stem: string;
  label: string;
};

/** stem → 中文显示名 */
function stemToLabel(stem: string): string {
  const SPECIAL: Record<string, string> = {
    "product-manager": "产品经理",
    "project-manager": "项目经理",
    "software-architect": "架构师",
    "frontend-engineer": "前端工程师",
    "backend-engineer": "后端工程师",
    "qa-engineer": "测试工程师",
    "devops-engineer": "运维工程师",
    "code-reviewer": "代码审查",
    "design-ui-designer": "UI 设计师",
    "design-ux-architect": "UX 架构师",
    "ui-ux-designer": "UI/UX 设计师",
  };
  return SPECIAL[stem] || stem;
}

/** 从 AGENT_ARTIFACT_PATHS 派生 Agent 下拉列表 */
function deriveAgentList(): AgentEntry[] {
  const seen = new Set<string>();
  const list: AgentEntry[] = [];
  for (const stem of Object.keys(AGENT_ARTIFACT_PATHS)) {
    if (seen.has(stem) || stem.includes("deprecated")) continue;
    seen.add(stem);
    list.push({ stem, label: stemToLabel(stem) });
  }
  const extras: AgentEntry[] = [{ stem: "code-reviewer", label: "代码审查" }];
  for (const e of extras) {
    if (!seen.has(e.stem)) {
      seen.add(e.stem);
      list.push(e);
    }
  }
  list.sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
  return list;
}

export type ParallelDispatchConfig = {
  agents: string[];
  task: string;
  needSynthesis: boolean;
  synthesisStem: string;
};

export function ParallelDispatchDialog({
  open,
  presetAgents,
  defaultTask,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  presetAgents?: string[];
  defaultTask?: string;
  onConfirm: (config: ParallelDispatchConfig) => void;
  onCancel: () => void;
}) {
  const agentOptions = useMemo(() => deriveAgentList(), []);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(presetAgents ?? []));
  const [task, setTask] = useState(defaultTask ?? "");
  const [needSynth, setNeedSynth] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const prevPresetRef = useRef(presetAgents);
  useEffect(() => {
    const prev = prevPresetRef.current;
    prevPresetRef.current = presetAgents;
    if (presetAgents && presetAgents.length > 0) {
      const prevKey = [...(prev ?? [])].sort().join(",");
      const currKey = [...presetAgents].sort().join(",");
      if (currKey !== prevKey) {
        setSelected(new Set(presetAgents));
      }
    }
  }, [presetAgents]);

  // defaultTask 变化时同步更新
  useEffect(() => {
    if (defaultTask) setTask(defaultTask);
  }, [defaultTask]);

  // 关闭弹窗时重置状态
  useEffect(() => {
    if (!open) {
      setSubmitting(false);
    }
  }, [open]);

  const toggleAgent = useCallback(
    (stem: string) => {
      if (submitting) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(stem)) next.delete(stem);
        else next.add(stem);
        return next;
      });
    },
    [submitting],
  );

  const canConfirm = selected.size >= 2 && task.trim().length > 0 && !submitting;

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    setSubmitting(true);
    onConfirm({
      agents: [...selected],
      task: task.trim(),
      needSynthesis: needSynth,
      synthesisStem: "project-manager",
    });
  }, [canConfirm, selected, task, needSynth, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border/80 bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h2 className="text-[14px] font-semibold">并行发布</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3">
          {/* 任务描述 */}
          <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
            任务描述
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="描述要让多个 Agent 同时执行的任务…"
            rows={3}
            disabled={submitting}
            className="w-full resize-none rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Agent 选择 */}
          <label className="mb-1.5 mt-4 block text-[12px] font-medium text-muted-foreground">
            选择执行 Agent（至少选 2 个）
          </label>
          <div className="flex flex-wrap gap-1.5">
            {agentOptions.map((agent) => (
              <button
                key={agent.stem}
                type="button"
                onClick={() => toggleAgent(agent.stem)}
                disabled={submitting}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11.5px] transition",
                  selected.has(agent.stem)
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                  submitting && "cursor-not-allowed opacity-50",
                )}
              >
                {agent.label}
              </button>
            ))}
          </div>

          {/* 汇总选项 */}
          <div className="mt-4 flex items-center gap-2">
            <input
              id="needSynth"
              type="checkbox"
              checked={needSynth}
              onChange={(e) => setNeedSynth(e.target.checked)}
              disabled={submitting}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/30 disabled:cursor-not-allowed"
            />
            <label htmlFor="needSynth" className="text-[12px] text-muted-foreground">
              执行完毕后生成汇总
            </label>
          </div>

          {/* 提交中提示 */}
          {submitting && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12px] text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>并行任务已提交，各 Agent 执行完成后结果将显示在对话中…</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 border-t border-border/50 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className={cn(
              "rounded-lg px-4 py-1.5 text-[12px] font-medium transition",
              canConfirm
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "cursor-not-allowed bg-muted/40 text-muted-foreground/50",
            )}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                提交中…
              </span>
            ) : (
              "开始并行执行"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
