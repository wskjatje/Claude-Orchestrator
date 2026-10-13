import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getDesktop } from "@/lib/desktop-api";
import { openExternalUrl } from "@/lib/open-external";

export type GraphifyStatus = boolean | null;

export type GraphifyHealth = {
  graphJson: GraphifyStatus;
  graphHtml: GraphifyStatus;
  graphStatusHtml: GraphifyStatus;
  needsUpdate: boolean;
  cli: boolean | null;
  building: boolean;
  buildError: string | null;
};

export function useGraphifyHealth() {
  const [health, setHealth] = useState<GraphifyHealth>({
    graphJson: null,
    graphHtml: null,
    graphStatusHtml: null,
    needsUpdate: false,
    cli: null,
    building: false,
    buildError: null,
  });

  const checkFiles = useCallback(async (opts?: { preserveBuildError?: boolean }) => {
    const api = getDesktop();
    if (!api?.graphifyStatus) {
      setHealth((h) => ({
        ...h,
        graphJson: false,
        graphHtml: false,
        graphStatusHtml: false,
        needsUpdate: false,
        cli: false,
        buildError: "graphifyStatus 不可用（需更新桌面壳）",
      }));
      return;
    }
    try {
      const st = await api.graphifyStatus();
      if (!st?.ok) {
        setHealth((h) => ({
          ...h,
          graphJson: false,
          graphHtml: false,
          needsUpdate: false,
          cli: false,
          buildError: st?.error || "状态读取失败",
        }));
        return;
      }
      let graphStatusHtml: boolean | null = null;
      if (api.fileStat) {
        const statusHtml = await api.fileStat("graphify-out/graph-status.html");
        graphStatusHtml = statusHtml?.ok ? statusHtml.exists : false;
      }
      setHealth((h) => ({
        ...h,
        graphJson: Boolean(st.graphJson),
        graphHtml: Boolean(st.graphHtml),
        graphStatusHtml,
        needsUpdate: Boolean(st.needsUpdate),
        cli: Boolean(st.cli),
        // 构建刚失败时勿被「cli 已装」冲掉错误；无 cli 时展示安装引导
        buildError: opts?.preserveBuildError
          ? h.buildError
          : st.cli
            ? h.buildError && /构建失败|buildGraph|timeout|超时/i.test(h.buildError)
              ? h.buildError
              : null
            : st.cliError || null,
      }));
    } catch (e) {
      setHealth((h) => ({
        ...h,
        graphJson: false,
        graphHtml: false,
        buildError: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  useEffect(() => {
    void checkFiles();
  }, [checkFiles]);

  const buildGraph = useCallback(async () => {
    const api = getDesktop();
    if (!api?.buildGraph) {
      const msg = "buildGraph 不可用";
      setHealth((h) => ({ ...h, buildError: msg }));
      toast.error(msg);
      return;
    }
    setHealth((h) => ({ ...h, building: true, buildError: null }));
    try {
      const r = await api.buildGraph();
      if (!r?.ok) {
        const msg = r?.error || "构建失败";
        setHealth((h) => ({
          ...h,
          building: false,
          buildError: msg,
        }));
        toast.error(msg);
        await checkFiles({ preserveBuildError: true });
        return;
      }
      setHealth((h) => ({ ...h, building: false, buildError: null, needsUpdate: false }));
      toast.success("结构索引已更新");
      await checkFiles();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHealth((h) => ({
        ...h,
        building: false,
        buildError: msg,
      }));
      toast.error(msg);
    }
  }, [checkFiles]);

  const openGraphHtml = useCallback(async () => {
    const api = getDesktop();
    if (!api?.getWorkspace) return;
    const ws = (await api.getWorkspace()) || "";
    if (!ws) return;
    const fileUrl = "file://" + ws.replace(/\/+$/, "") + "/graphify-out/graph.html";
    await openExternalUrl(fileUrl);
  }, []);

  const openGraphStatusHtml = useCallback(async () => {
    const api = getDesktop();
    if (!api?.getWorkspace) return;
    const ws = (await api.getWorkspace()) || "";
    if (!ws) return;
    const fileUrl = "file://" + ws.replace(/\/+$/, "") + "/graphify-out/graph-status.html";
    await openExternalUrl(fileUrl);
  }, []);

  const buildStatusViz = useCallback(async () => {
    const api = getDesktop();
    if (!api?.buildStatusViz) return;
    const r = await api.buildStatusViz();
    if (!r?.ok) {
      const msg = r?.error || "状态图生成失败";
      setHealth((h) => ({ ...h, buildError: msg }));
      toast.error(msg);
      return;
    }
    await checkFiles();
  }, [checkFiles]);

  return {
    health,
    checkFiles,
    buildGraph,
    rebuildHtml: buildGraph,
    openGraphHtml,
    openGraphStatusHtml,
    buildStatusViz,
  };
}
