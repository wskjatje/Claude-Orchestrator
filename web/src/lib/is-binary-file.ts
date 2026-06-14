/** 与 server/workspace.mjs 保持一致的已知二进制扩展名 */
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

export function contentLooksBinary(text: string): boolean {
  const sample = text.slice(0, 8192);
  if (!sample.length) return false;
  let replacement = 0;
  let control = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0xfffd) replacement++;
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) control++;
  }
  if (replacement > 3 || replacement / sample.length > 0.01) return true;
  if (sample.length > 80 && control / sample.length > 0.05) return true;
  return false;
}

export function isBinaryFileResult(relPath: string, text: string | null | undefined, binary?: boolean): boolean {
  if (binary) return true;
  if (isBinaryPath(relPath)) return true;
  if (text != null && text.length > 0 && contentLooksBinary(text)) return true;
  return false;
}
