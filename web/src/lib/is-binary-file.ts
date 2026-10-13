/**
 * 与 server/workspace.mjs BINARY_* 保持一致。
 * 策略：扩展名命中 → 按二进制打开（图片/PDF 走专用预览，其余 hex）；
 * 内容嗅探仅在「强证据」时升级为二进制，避免 UTF-8/少量控制符误判。
 */
const BINARY_EXT = new Set([
  "lockb",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "bmp",
  "icns",
  "avif",
  "heic",
  "heif",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "dat",
  "wasm",
  "pyc",
  "class",
  "o",
  "a",
  "zip",
  "gz",
  "tar",
  "rar",
  "7z",
  "bz2",
  "xz",
  "zst",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "mp3",
  "mp4",
  "avi",
  "mov",
  "wav",
  "flac",
  "webm",
  "mkv",
  "m4a",
  "sqlite",
  "db",
  "sqlite3",
  "dmg",
  "iso",
  "img",
]);

/** 完整文件名匹配（双扩展名 lockb 等） */
const BINARY_NAMES = new Set(["bun.lockb", ".ds_store"]);

function fileBase(relPath: string): string {
  return (relPath.split("/").pop() ?? relPath).toLowerCase();
}

function fileExt(relPath: string): string {
  const base = fileBase(relPath);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1);
}

export function isBinaryPath(relPath: string): boolean {
  const base = fileBase(relPath);
  if (BINARY_NAMES.has(base)) return true;
  return BINARY_EXT.has(fileExt(relPath));
}

/**
 * 文本侧嗅探：须有强二进制证据才判 true。
 * - NUL / 大量 U+FFFD → 二进制
 * - UTF-16 BOM → 当文本（不因高字节误判）
 * - 控制字符比例阈值更高，避免源码里偶发控制符进 hex
 */
export function contentLooksBinary(text: string): boolean {
  const sample = text.slice(0, 8192);
  if (!sample.length) return false;

  // UTF-16 LE/BE BOM
  const c0 = sample.charCodeAt(0);
  const c1 = sample.length > 1 ? sample.charCodeAt(1) : 0;
  if (c0 === 0xfeff) return false;
  if (c0 === 0xfffe) return false;
  if (sample.length >= 2 && c0 === 0 && c1 !== 0) {
    // 可能是 UTF-16 LE 无 BOM：每隔一字为 0 的 ASCII 串仍可当文本试开
    let nulPairs = 0;
    const lim = Math.min(sample.length - 1, 200);
    for (let i = 0; i < lim; i += 2) {
      if (sample.charCodeAt(i) !== 0 && sample.charCodeAt(i + 1) === 0) nulPairs++;
    }
    if (nulPairs > 40) return false;
  }

  let replacement = 0;
  let control = 0;
  let nul = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0) nul++;
    if (c === 0xfffd) replacement++;
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) control++;
  }
  if (nul > 0) return true;
  if (replacement > 8 || (sample.length > 40 && replacement / sample.length > 0.02)) return true;
  if (sample.length > 200 && control / sample.length > 0.12) return true;
  return false;
}

export function isBinaryFileResult(
  relPath: string,
  text: string | null | undefined,
  binary?: boolean,
): boolean {
  if (binary) return true;
  if (isBinaryPath(relPath)) return true;
  if (text != null && text.length > 0 && contentLooksBinary(text)) return true;
  return false;
}

export { BINARY_EXT, BINARY_NAMES };
