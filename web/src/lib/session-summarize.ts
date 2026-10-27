/** 对齐 Cursor /summarize：界面保留全文；模型侧用摘要+近尾（modelHistory） */

import {
  compactDialogueBody,
  isSummarizeSlashCommand,
} from "../../../shared/compact-summary.mjs";
import { COMPACT_FORCE_KEEP_RECENT } from "../../../shared/context-budget.mjs";
import { hasMeasuredContextParts } from "@/lib/context-parts";

export { isSummarizeSlashCommand };

export type CompactableMsg = {
  role: string;
  content: string;
  ts?: number;
  name?: string;
  [key: string]: unknown;
};

/**
 * 压缩「发给模型」的基线；不改动展示用 history。
 * @returns null 若不足压缩（对话太短）
 */
export function summarizeSessionHistory(
  history: CompactableMsg[],
): {
  modelHistory: CompactableMsg[];
  notice: string;
  beforeChars: number;
  afterChars: number;
} | null {
  const dialogue = (history || []).filter(
    (m) => m && (m.role === "user" || m.role === "assistant"),
  );
  const packed = compactDialogueBody(dialogue, {
    force: true,
    keepRecent: COMPACT_FORCE_KEEP_RECENT,
  });
  if (!packed) return null;

  const modelHistory: CompactableMsg[] = packed.messages.map((m) => ({
    role: m.role,
    content: m.content,
    ts: Date.now(),
  }));

  const notice =
    `已压缩上下文（${packed.beforeChars}→${packed.afterChars} 字符）。` +
    `界面仍保留完整对话；之后发给模型的是摘要与近 ${COMPACT_FORCE_KEEP_RECENT} 轮。`;

  return {
    modelHistory,
    notice,
    beforeChars: packed.beforeChars,
    afterChars: packed.afterChars,
  };
}

/** 取发送 prior 的基线：有 modelHistory 且非编辑截断时用压缩基线 */
export function resolveModelPriorBase<T extends CompactableMsg>(
  sess: { history: T[]; modelHistory?: T[] | null },
  editCutoff: number | null | undefined,
): T[] {
  if (editCutoff != null) {
    return sess.history.slice(0, editCutoff);
  }
  if (Array.isArray(sess.modelHistory) && sess.modelHistory.length > 0) {
    return sess.modelHistory;
  }
  return sess.history;
}

/**
 * 在展示 history 追加新轮后，同步延长 modelHistory。
 * 用 coreLen（摘要刚写完时的长度）避免多次 patch 重复追加。
 * 编辑截断（clear）时清空。
 */
export function nextModelHistoryPatch<T extends CompactableMsg>(
  prevModel: T[] | null | undefined,
  coreLen: number | null | undefined,
  displayBeforeLen: number,
  nextDisplayHistory: T[],
  opts?: { clear?: boolean },
): { modelHistory: T[] | null | undefined; modelHistoryCoreLen: number | null | undefined } {
  if (opts?.clear) {
    return { modelHistory: null, modelHistoryCoreLen: null };
  }
  if (!prevModel?.length) {
    return { modelHistory: prevModel, modelHistoryCoreLen: coreLen };
  }
  const core = Math.min(
    Math.max(0, typeof coreLen === "number" && Number.isFinite(coreLen) ? coreLen : prevModel.length),
    prevModel.length,
  );
  const mapAdded = (m: CompactableMsg): T => {
    const usage =
      m.usage && typeof m.usage === "object"
        ? (m.usage as CompactableMsg["usage"])
        : undefined;
    const contextParts =
      m.contextParts && typeof m.contextParts === "object"
        ? (m.contextParts as CompactableMsg["contextParts"])
        : undefined;
    return {
      role: m.role,
      content: String(m.content || ""),
      ...(typeof m.ts === "number" ? { ts: m.ts } : {}),
      ...(m.name ? { name: String(m.name) } : {}),
      // 占用环读 modelHistory：必须带上接口 usage，否则会误标「字符粗估」
      ...(usage ? { usage } : {}),
      // 规则/MCP 分桶同理：否则明细读不到注入实测
      ...(contextParts ? { contextParts } : {}),
      ...(typeof m.billingSource === "string"
        ? { billingSource: m.billingSource }
        : {}),
      ...(typeof m.modelId === "string" && m.modelId
        ? { modelId: m.modelId }
        : {}),
      ...(typeof m.latencyMs === "number" ? { latencyMs: m.latencyMs } : {}),
    } as T;
  };
  const added = nextDisplayHistory
    .slice(Math.max(0, displayBeforeLen))
    .map(mapAdded);
  // 保留 core 之后已追加的轮次。发送分两阶段：先写 user，再写 user+assistant；
  // 若仍用「core + 本轮 added」会丢掉 summarize 后更早的对话。
  const post = prevModel.slice(core);
  let newPost: T[];
  const last = post[post.length - 1];
  const firstAdded = added[0];
  if (
    last &&
    firstAdded &&
    last.role === "user" &&
    firstAdded.role === "user" &&
    String(last.content || "") === String(firstAdded.content || "")
  ) {
    newPost = [...post.slice(0, -1), ...added];
  } else {
    newPost = [...post, ...added];
  }
  return {
    modelHistory: [...prevModel.slice(0, core), ...newPost],
    modelHistoryCoreLen: core,
  };
}

function isRealApiUsage(u: unknown): boolean {
  if (!u || typeof u !== "object") return false;
  const o = u as {
    estimated?: boolean;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  if (o.estimated === true) return false;
  const p = Number(o.prompt_tokens);
  const c = Number(o.completion_tokens);
  return (Number.isFinite(p) && p > 0) || (Number.isFinite(c) && c > 0);
}

/**
 * 占用环优先用 modelHistory（窗内内容），但 summarize 后旧尾可能缺 usage / contextParts。
 * 从全量 history 回填最近一次接口用量与实测分桶到 prior 末条助手。
 */
export function hydrateContextHistoryUsage<T extends CompactableMsg>(
  priorBase: T[] | null | undefined,
  fullHistory: T[] | null | undefined,
): T[] {
  const base = Array.isArray(priorBase) ? priorBase : [];
  const full = Array.isArray(fullHistory) ? fullHistory : [];
  if (!base.length) return full.slice();

  let donorUsage: unknown = null;
  if (!base.some((m) => isRealApiUsage(m.usage))) {
    for (let i = full.length - 1; i >= 0; i--) {
      if (isRealApiUsage(full[i]?.usage)) {
        donorUsage = full[i]!.usage;
        break;
      }
    }
  }

  let donorParts: unknown = null;
  if (!base.some((m) => hasMeasuredContextParts(m.contextParts))) {
    for (let i = full.length - 1; i >= 0; i--) {
      if (hasMeasuredContextParts(full[i]?.contextParts)) {
        donorParts = full[i]!.contextParts;
        break;
      }
    }
  }

  if (!donorUsage && !donorParts) return base;

  const out = base.map((m) => ({ ...m }));
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i]?.role !== "assistant") continue;
    out[i] = {
      ...out[i]!,
      ...(donorUsage ? { usage: donorUsage } : {}),
      ...(donorParts ? { contextParts: donorParts } : {}),
    } as T;
    break;
  }
  return out;
}

/** /summarize 成功写入的助手通知（用于确定性重建锚点，禁止模糊匹配） */
export function isSummarizeNoticeContent(content: string): boolean {
  const t = String(content || "").trim();
  return (
    /^已压缩上下文（\d+→\d+ 字符）/.test(t) && t.includes("界面仍保留完整对话")
  );
}

function mapHistoryMsgForModel<T extends CompactableMsg>(m: CompactableMsg): T {
  const usage =
    m.usage && typeof m.usage === "object"
      ? (m.usage as CompactableMsg["usage"])
      : undefined;
  const contextParts =
    m.contextParts && typeof m.contextParts === "object"
      ? (m.contextParts as CompactableMsg["contextParts"])
      : undefined;
  return {
    role: m.role,
    content: String(m.content || ""),
    ...(typeof m.ts === "number" ? { ts: m.ts } : {}),
    ...(m.name ? { name: String(m.name) } : {}),
    ...(usage ? { usage } : {}),
    ...(contextParts ? { contextParts } : {}),
    ...(typeof m.billingSource === "string" ? { billingSource: m.billingSource } : {}),
    ...(typeof m.modelId === "string" && m.modelId ? { modelId: m.modelId } : {}),
    ...(typeof m.latencyMs === "number" ? { latencyMs: m.latencyMs } : {}),
  } as T;
}

/**
 * 从展示 history 按「最后一次完整 /summarize 通知」确定性重建 modelHistory。
 * 锚点必须是：user=/summarize + assistant=压缩通知；否则返回 null（禁止瞎猜）。
 */
export function rebuildModelHistoryFromDisplayHistory<T extends CompactableMsg>(
  history: T[] | null | undefined,
): { modelHistory: T[]; modelHistoryCoreLen: number } | null {
  const list = Array.isArray(history) ? history : [];
  let noticeIdx = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (
      list[i]?.role === "assistant" &&
      isSummarizeNoticeContent(String(list[i]?.content || ""))
    ) {
      noticeIdx = i;
      break;
    }
  }
  if (noticeIdx < 1) return null;
  const userIdx = noticeIdx - 1;
  const userMsg = list[userIdx];
  if (
    !userMsg ||
    userMsg.role !== "user" ||
    !isSummarizeSlashCommand(String(userMsg.content || ""))
  ) {
    return null;
  }
  const packed = summarizeSessionHistory(list.slice(0, userIdx));
  if (!packed) return null;
  const core = packed.modelHistory.map((m) => mapHistoryMsgForModel<T>(m));
  const post = list.slice(noticeIdx + 1).map((m) => mapHistoryMsgForModel<T>(m));
  return {
    modelHistory: [...core, ...post],
    modelHistoryCoreLen: core.length,
  };
}

/**
 * 仅当「通知后展示轮次」多于当前 modelHistory 的 post-core 时判定损坏。
 * 不因 usage 缺失单独重建（那由 hydrateContextHistoryUsage 处理）。
 */
export function needsModelHistoryRebuild<T extends CompactableMsg>(sess: {
  history?: T[] | null;
  modelHistory?: T[] | null;
  modelHistoryCoreLen?: number | null;
}): boolean {
  const rebuilt = rebuildModelHistoryFromDisplayHistory(sess.history);
  if (!rebuilt) return false;
  const mh = Array.isArray(sess.modelHistory) ? sess.modelHistory : [];
  if (!mh.length) return rebuilt.modelHistory.length > rebuilt.modelHistoryCoreLen;
  const core = Math.min(
    Math.max(
      0,
      typeof sess.modelHistoryCoreLen === "number" &&
        Number.isFinite(sess.modelHistoryCoreLen)
        ? sess.modelHistoryCoreLen
        : mh.length,
    ),
    mh.length,
  );
  const postLen = mh.length - core;
  const rebuiltPost = rebuilt.modelHistory.length - rebuilt.modelHistoryCoreLen;
  return rebuiltPost > postLen;
}

/** 损坏则返回修复后的会话字段；否则原样 */
export function repairSessionModelHistoryIfNeeded<T extends CompactableMsg>(sess: {
  history?: T[] | null;
  modelHistory?: T[] | null;
  modelHistoryCoreLen?: number | null;
}): {
  modelHistory: T[] | null | undefined;
  modelHistoryCoreLen: number | null | undefined;
  repaired: boolean;
} {
  if (!needsModelHistoryRebuild(sess)) {
    return {
      modelHistory: sess.modelHistory,
      modelHistoryCoreLen: sess.modelHistoryCoreLen,
      repaired: false,
    };
  }
  const rebuilt = rebuildModelHistoryFromDisplayHistory(sess.history);
  if (!rebuilt) {
    return {
      modelHistory: sess.modelHistory,
      modelHistoryCoreLen: sess.modelHistoryCoreLen,
      repaired: false,
    };
  }
  return {
    modelHistory: rebuilt.modelHistory,
    modelHistoryCoreLen: rebuilt.modelHistoryCoreLen,
    repaired: true,
  };
}
