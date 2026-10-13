import { getDesktop } from "@/lib/desktop-api";

const MAX_PREFIX = 1600;
const MAX_SUFFIX = 480;
const COOLDOWN_MS = 1200;
const CACHE_TTL_MS = 12_000;

/** 从模型回复中抽出纯续写文本（去掉围栏/旁白） */
export function sanitizeCompletionText(raw: string): string {
  let text = String(raw || "").trim();
  const fence = text.match(/^```(?:\w+)?\s*\n([\s\S]*?)```$/);
  if (fence?.[1] != null) text = fence[1].replace(/\n$/, "");
  if (/^(here|以下|补全|suggestion)/i.test(text.split("\n")[0] || "")) {
    text = text.split("\n").slice(1).join("\n").trim();
  }
  if (text.length > 800) text = text.slice(0, 800);
  return text;
}

let inflightRequestId: string | null = null;
let lastStartedAt = 0;
let cacheKey = "";
let cacheText: string | null = null;
let cacheAt = 0;

function completionKey(relPath: string, prefix: string, suffix: string) {
  // 用尾部前缀 + 短后缀，避免整段哈希成本
  const p = prefix.slice(-400);
  const s = suffix.slice(0, 120);
  return `${relPath}\0${p}\0${s}`;
}

async function abortInflight() {
  const id = inflightRequestId;
  if (!id) return;
  inflightRequestId = null;
  const api = getDesktop();
  try {
    await api?.claudeCodeAbort?.(id);
  } catch {
    /* ignore */
  }
}

/**
 * 真实模型续写（plan 模式）。
 * 全局单飞行 + cooldown + 短缓存；abort 会真正调 claudeCodeAbort。
 */
export async function fetchAiCompletionText(opts: {
  relPath: string;
  prefix: string;
  suffix: string;
  requestId?: string;
  signal?: AbortSignal;
}): Promise<string | null> {
  const api = getDesktop();
  if (!api?.claudeCodePrompt) return null;
  const prefix = opts.prefix.slice(-MAX_PREFIX);
  const suffix = opts.suffix.slice(0, MAX_SUFFIX);
  if (!prefix.trim()) return null;
  if (opts.signal?.aborted) return null;

  const key = completionKey(opts.relPath, prefix, suffix);
  const now = Date.now();
  if (key === cacheKey && cacheText && now - cacheAt < CACHE_TTL_MS) {
    return cacheText;
  }
  if (now - lastStartedAt < COOLDOWN_MS && inflightRequestId) {
    return null;
  }

  await abortInflight();
  if (opts.signal?.aborted) return null;

  const requestId = opts.requestId || `ghost-complete-${Date.now()}`;
  inflightRequestId = requestId;
  lastStartedAt = Date.now();

  const onAbort = () => {
    void abortInflight();
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const prompt = [
      "Code completion only. Output ONLY the text to insert at the cursor.",
      "No markdown fences, no explanation, no quotes.",
      `File: ${opts.relPath}`,
      "PREFIX<<<",
      prefix,
      ">>>PREFIX",
      "SUFFIX<<<",
      suffix,
      ">>>SUFFIX",
    ].join("\n");
    const r = await api.claudeCodePrompt({
      prompt,
      requestId,
      timeoutMs: 25_000,
      isNewClaudeSession: true,
      permissionMode: "plan",
    });
    if (opts.signal?.aborted || inflightRequestId !== requestId) return null;
    if (!r.ok || !r.content?.trim()) return null;
    const text = sanitizeCompletionText(r.content);
    if (!text) return null;
    cacheKey = key;
    cacheText = text;
    cacheAt = Date.now();
    return text;
  } catch {
    return null;
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
    if (inflightRequestId === requestId) inflightRequestId = null;
  }
}

export function slicePrefixSuffix(doc: string, pos: number) {
  return {
    prefix: doc.slice(Math.max(0, pos - MAX_PREFIX), pos),
    suffix: doc.slice(pos, Math.min(doc.length, pos + MAX_SUFFIX)),
  };
}
