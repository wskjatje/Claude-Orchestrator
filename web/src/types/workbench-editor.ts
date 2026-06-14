export type WorkbenchFileTab = {
  id: string;
  kind: "file";
  relPath: string;
  label: string;
  content: string;
  /** 上次保存或从磁盘读取的内容，用于 dirty 判断 */
  savedContent: string;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  error: string | null;
  truncated: boolean;
  /** 二进制文件以十六进制查看，不可文本编辑 */
  binary: boolean;
  size?: number;
  /** 二进制预览（base64，最多约 256KB） */
  binaryBase64?: string | null;
  previewBytes?: number;
};

export type WorkbenchBrowserTab = {
  id: string;
  kind: "browser";
  url: string;
  label: string;
  /** blob: URLs created for local HTML preview — revoke on close */
  blobUrl?: string | null;
};

export type WorkbenchEditorTab = WorkbenchFileTab | WorkbenchBrowserTab;

export function isFileTab(tab: WorkbenchEditorTab): tab is WorkbenchFileTab {
  return tab.kind === "file";
}

export function isBrowserTab(tab: WorkbenchEditorTab): tab is WorkbenchBrowserTab {
  return tab.kind === "browser";
}

export function fileNameFromRel(relPath: string): string {
  return relPath.split("/").pop() || relPath;
}

export function normalizeBrowserUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "about:blank";
  if (/^(https?:|blob:|data:|about:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
