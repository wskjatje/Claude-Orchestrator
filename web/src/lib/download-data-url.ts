/** 触发浏览器下载 data URL 文件（如聊天图片附件）。 */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || "image.png";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
