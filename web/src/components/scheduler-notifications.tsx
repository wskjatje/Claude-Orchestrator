import { useEffect } from "react";
import { toast } from "sonner";
import { getDesktop } from "@/lib/desktop-api";
import { useDesktopReady } from "@/hooks/use-desktop-ready";

/** 订阅 Bridge 定时任务桌面通知 */
export function SchedulerNotifications() {
  const ready = useDesktopReady();

  useEffect(() => {
    if (!ready) return;
    const api = getDesktop();
    if (!api?.onSchedulerToast) return;
    return api.onSchedulerToast((data) => {
      toast(data.title || "定时任务", {
        description: data.body || undefined,
        duration: 8000,
      });
    });
  }, [ready]);

  return null;
}
