import type { PriorTurn, UserImageAttachment } from "@/lib/ollama-messages";

/** 与 Claude Code / Cursor 一致：粘贴大图最长边缩至 2000px */
export const CHAT_IMAGE_MAX_EDGE_PX = 2000;

/** Claude Code 单轮 inline 附图上限（与 Cursor/Claude Code 文档量级一致） */
export const CHAT_INLINE_IMAGE_MAX = 32;

const VISION_MODEL_RE =
  /claude|sonnet|opus|haiku|gemini|gpt-4o|gpt-4\.1|gpt-5|vision|vl|llava|moondream|minicpm-v|gemma3/i;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** 从 DataTransfer（拖拽 / 部分浏览器粘贴）提取图片 File */
export function collectImageFilesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const out: File[] = [];
  if (dt.files?.length) {
    for (let i = 0; i < dt.files.length; i++) {
      const f = dt.files[i];
      if (f?.type.startsWith("image/")) out.push(f);
    }
  }
  if (out.length) return out;
  for (let i = 0; i < dt.items.length; i++) {
    const it = dt.items[i];
    if (it.kind !== "file") continue;
    const f = it.getAsFile();
    if (f?.type.startsWith("image/")) out.push(f);
  }
  return out;
}

/** 历史 user 轮附图（Cursor：同会话追问仍保留 vision 上下文） */
export function collectPriorUserAttachments(prior: PriorTurn[]): UserImageAttachment[] {
  const out: UserImageAttachment[] = [];
  for (const m of prior) {
    if (m.role !== "user" || !m.attachments?.length) continue;
    for (const a of m.attachments) {
      if (a?.kind === "image" && a.dataUrl?.startsWith("data:")) out.push(a);
    }
  }
  return out;
}

export function mergeInlineAttachments(
  prior: UserImageAttachment[],
  current: UserImageAttachment[] | undefined,
  max = CHAT_INLINE_IMAGE_MAX,
): { attachments: UserImageAttachment[]; truncated: boolean } {
  const merged = [...prior, ...(current ?? [])];
  if (merged.length <= max) return { attachments: merged, truncated: false };
  return { attachments: merged.slice(-max), truncated: true };
}

export async function normalizePendingImageFiles(
  files: File[],
  startIndex = 0,
): Promise<(UserImageAttachment & { id: string })[]> {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  const out: (UserImageAttachment & { id: string })[] = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const f = imageFiles[i];
    const dataUrl = await readFileAsDataUrl(f);
    const normalized = await downscaleDataUrlForChat(dataUrl);
    out.push({
      id: crypto.randomUUID(),
      kind: "image",
      name: f.name || `image-${startIndex + i + 1}.png`,
      mime: normalized.mime,
      dataUrl: normalized.dataUrl,
    });
  }
  return out;
}

/** 批量插入 [Image #N] token（旧版兼容，Cursor 已不再插入文本标记） */
export function insertImageChipTokens(text: string, startIndex: number, count: number, cursor: number): string {
  let next = text;
  let pos = cursor;
  for (let i = 0; i < count; i++) {
    next = insertImageChipToken(next, startIndex + i + 1, pos);
    pos = next.length;
  }
  return next;
}

/** DeepSeek 等 Anthropic 兼容端点不支持 Claude Code 原生 vision block */
export function modelSupportsChatVision(opts: {
  orchMode: "claude-code" | "local-mcp";
  modelId: string;
  providerBaseUrl?: string;
}): boolean {
  const model = String(opts.modelId || "").trim();
  if (!model || model.toLowerCase() === "auto") return true;
  if (opts.orchMode === "local-mcp") {
    return VISION_MODEL_RE.test(model);
  }
  const base = String(opts.providerBaseUrl || "").toLowerCase();
  if (/deepseek\.com/.test(base)) return false;
  if (/^deepseek-|^qwen(?!.*vl)/i.test(model)) return false;
  if (!base || /api\.anthropic\.com|claude\.ai/.test(base)) return true;
  return VISION_MODEL_RE.test(model);
}

export function visionRequiredError(modelLabel: string): string {
  return `当前模型「${modelLabel}」不支持图片。请切换到支持视觉的模型（如 Claude Sonnet、Gemini），或改用「本地 MCP」并安装 Ollama 视觉模型。`;
}

/** 读取 dataUrl 尺寸并按 Cursor/Claude Code 规则缩小 */
export async function downscaleDataUrlForChat(
  dataUrl: string,
  maxEdge = CHAT_IMAGE_MAX_EDGE_PX,
): Promise<{ dataUrl: string; mime: string }> {
  if (!dataUrl.startsWith("data:image/")) return { dataUrl, mime: "image/png" };
  const mimeMatch = dataUrl.match(/^data:([^;]+);/);
  const mime = mimeMatch?.[1] || "image/png";

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = Math.min(1, maxEdge / Math.max(w, h, 1));
      if (scale >= 1) {
        resolve({ dataUrl, mime });
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ dataUrl, mime });
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const outMime = mime.includes("jpeg") || mime.includes("jpg") ? "image/jpeg" : "image/png";
      resolve({ dataUrl: canvas.toDataURL(outMime, 0.92), mime: outMime });
    };
    img.onerror = () => resolve({ dataUrl, mime });
    img.src = dataUrl;
  });
}

export async function normalizePendingImage(
  file: File,
  dataUrl: string,
  index: number,
): Promise<UserImageAttachment & { id: string }> {
  const scaled = await downscaleDataUrlForChat(dataUrl);
  return {
    id: crypto.randomUUID(),
    kind: "image",
    name: file.name || `image-${index + 1}.png`,
    mime: scaled.mime,
    dataUrl: scaled.dataUrl,
  };
}

/** Cursor 式：在输入框插入 [Image #N] 占位，便于 positional 引用 */
export function insertImageChipToken(text: string, imageIndex: number, cursor: number): string {
  const token = `[Image #${imageIndex}] `;
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  const sep = before.length && !/\s$/.test(before) ? " " : "";
  return `${before}${sep}${token}${after}`;
}

export function imageChipLabel(index: number): string {
  return `[Image #${index}]`;
}
