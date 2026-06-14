/** 将 base64 解码为 Uint8Array */
export function base64ToBytes(base64: string): Uint8Array {
  if (!base64) return new Uint8Array(0);
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "avif", "icns"]);

export function imageMimeForPath(relPath: string): string | null {
  const base = (relPath.split("/").pop() ?? relPath).toLowerCase();
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1) : "";
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "ico":
    case "icns":
      return "image/x-icon";
    case "bmp":
      return "image/bmp";
    case "avif":
      return "image/avif";
    default:
      return IMAGE_EXT.has(ext) ? `image/${ext}` : null;
  }
}

export function formatFileSize(bytes?: number): string | null {
  if (bytes == null || !Number.isFinite(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** VS Code 风格十六进制转储 */
export function formatHexDump(bytes: Uint8Array, bytesPerLine = 16): string {
  if (!bytes.length) return "（空文件）";
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += bytesPerLine) {
    const chunk = bytes.subarray(offset, offset + bytesPerLine);
    const addr = offset.toString(16).padStart(8, "0");
    const hex = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ")
      .padEnd(bytesPerLine * 3 - 1, " ");
    const ascii = Array.from(chunk)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`${addr}  ${hex}  |${ascii}|`);
  }
  return lines.join("\n");
}

export function dataUrlFromBase64(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`;
}
