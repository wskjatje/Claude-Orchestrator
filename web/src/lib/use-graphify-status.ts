import { useCallback, useEffect, useState } from "react";
import { getDesktop } from "@/lib/desktop-api";
import { openExternalUrl } from "@/lib/open-external";

/** 图谱三态：null=检测中, false=不存在, true=存在 */
export type GraphifyStatus = boolean | null;

/** 图谱整体健康状态 */
export type GraphifyHealth = {
  /** graph.json 是否存在（技能可用） */
  graphJson: GraphifyStatus;
  /** graph.html 是否存在（交互式查看器） */
  graphHtml: GraphifyStatus;
  /** graph-status.html 是否存在（状态着色图） */
  graphStatusHtml: GraphifyStatus;
  /** 是否正在构建 */
  building: boolean;
  /** 最后一次构建错误信息 */
  buildError: string | null;
};

/**
 * 全量图谱状态 hook。
 * - 自动检测 graph.json 和 graph.html 的存在性
 * - 提供 buildGraph / openGraphHtml / buildStatusViz / openGraphStatusHtml 操作
 */
export function useGraphifyHealth() {
  const [health, setHealth] = useState<GraphifyHealth>({
    graphJson: null,
    graphHtml: null,
    graphStatusHtml: null,
    building: false,
    buildError: null,
  });

  /** 检测文件存在性 */
  const checkFiles = useCallback(async () => {
    const api = getDesktop();
    if (!api?.fileStat) {
      setHealth((h) => ({ ...h, graphJson: false, graphHtml: false }));
      return;
    }
    try {
      const [jsonStat, htmlStat, statusHtmlStat] = await Promise.all([
        api.fileStat("graphify-out/graph.json"),
        api.fileStat("graphify-out/graph.html"),
        api.fileStat("graphify-out/graph-status.html"),
      ]);
      setHealth((h) => ({
        ...h,
        graphJson: jsonStat?.ok ? jsonStat.exists : false,
        graphHtml: htmlStat?.ok ? htmlStat.exists : false,
        graphStatusHtml: statusHtmlStat?.ok ? statusHtmlStat.exists : false,
      }));
    } catch {
      setHealth((h) => ({ ...h, graphJson: false, graphHtml: false }));
    }
  }, []);

  // 初始检测
  useEffect(() => {
    void checkFiles();
  }, [checkFiles]);

  /** 构建知识图谱（update + export html） */
  const buildGraph = useCallback(async () => {
    const api = getDesktop();
    if (!api?.buildGraph) return;
    setHealth((h) => ({ ...h, building: true, buildError: null }));
    try {
      const r = await api.buildGraph();
      if (!r?.ok) {
        setHealth((h) => ({
          ...h,
          building: false,
          buildError: r?.error || "构建失败",
        }));
        return;
      }
      setHealth((h) => ({ ...h, building: false, buildError: null }));
      await checkFiles();
    } catch (e) {
      setHealth((h) => ({
        ...h,
        building: false,
        buildError: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [checkFiles]);

  /** 仅导出 HTML 查看器（已存在 graph.json 时） */
  const rebuildHtml = useCallback(async () => {
    const api = getDesktop();
    if (!api?.buildGraph) return;
    await buildGraph();
  }, [buildGraph]);

  /** 在系统浏览器中打开 graph.html */
  const openGraphHtml = useCallback(async () => {
    const api = getDesktop();
    if (!api?.getWorkspace) return;
    let ws = "";
    try {
      ws = (await api.getWorkspace()) || "";
    } catch {
      return;
    }
    if (!ws) return;
    const fileUrl =
      "file://" +
      ws.replace(/\/+$/, "") +
      "/graphify-out/graph.html";
    try {
      await openExternalUrl(fileUrl);
    } catch {
      // silent
    }
  }, []);

  /** 在系统浏览器中打开 graph-status.html */
  const openGraphStatusHtml = useCallback(async () => {
    const api = getDesktop();
    if (!api?.getWorkspace) return;
    let ws = "";
    try {
      ws = (await api.getWorkspace()) || "";
    } catch {
      return;
    }
    if (!ws) return;
    const fileUrl =
      "file://" +
      ws.replace(/\/+$/, "") +
      "/graphify-out/graph-status.html";
    try {
      await openExternalUrl(fileUrl);
    } catch {
      // silent
    }
  }, []);

  /** 生成状态着色图 */
  const buildStatusViz = useCallback(async () => {
    const api = getDesktop();
    if (!api?.buildStatusViz) return;
    try {
      await api.buildStatusViz();
      await checkFiles();
    } catch {
      // silent
    }
  }, [checkFiles]);

  return {
    health,
    checkFiles,
    buildGraph,
    rebuildHtml,
    openGraphHtml,
    buildStatusViz,
    openGraphStatusHtml,
  };
}
