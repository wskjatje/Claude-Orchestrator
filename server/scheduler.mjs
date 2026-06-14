/**
 * Bridge 定时任务调度：按 enabled + interval/daily + lastRunAt 自动触发。
 */
const TICK_MS = Number(process.env.WORKBENCH_SCHEDULER_TICK_MS || 30_000)

/** @type {Set<string>} */
const running = new Set()

function parseDailyTime(dailyTime) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(dailyTime || '09:00').trim())
  if (!m) return { h: 9, min: 0 }
  return {
    h: Math.max(0, Math.min(23, parseInt(m[1], 10))),
    min: Math.max(0, Math.min(59, parseInt(m[2], 10))),
  }
}

export function isScheduledTaskDue(task, now = Date.now()) {
  if (!task?.enabled) return false
  const last = typeof task.lastRunAt === 'number' && task.lastRunAt > 0 ? task.lastRunAt : 0

  if (task.scheduleType === 'daily') {
    const { h, min } = parseDailyTime(task.dailyTime)
    const d = new Date(now)
    const slotMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, min, 0, 0).getTime()
    if (now < slotMs) return false
    return last < slotMs
  }

  const intervalMs = Math.max(1, task.intervalMinutes || 60) * 60 * 1000
  if (!last) return true
  return now - last >= intervalMs
}

/**
 * @param {{
 *   loadScheduledTasks: () => unknown[]
 *   runScheduledTaskWithMeta: (task: object, source: string) => Promise<{ ok?: boolean; error?: string }>
 *   appendAppLog?: (msg: string) => void
 * }} deps
 */
export function startTaskScheduler(deps) {
  const { loadScheduledTasks, runScheduledTaskWithMeta, appendAppLog } = deps

  async function runAuto(task) {
    if (running.has(task.id)) return
    running.add(task.id)
    try {
      await runScheduledTaskWithMeta(task, 'auto')
    } finally {
      running.delete(task.id)
    }
  }

  async function tick() {
    let tasks = []
    try {
      tasks = loadScheduledTasks()
    } catch {
      return
    }
    if (!Array.isArray(tasks)) return
    for (const task of tasks) {
      if (!isScheduledTaskDue(task)) continue
      void runAuto(task)
    }
  }

  void tick()
  const timer = setInterval(() => void tick(), TICK_MS)
  appendAppLog?.(`INFO scheduler loop started tickMs=${TICK_MS}`)
  console.log(`[bridge] scheduler tick every ${TICK_MS}ms`)

  return () => clearInterval(timer)
}
