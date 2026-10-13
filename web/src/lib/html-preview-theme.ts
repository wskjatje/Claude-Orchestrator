/** 将本地 HTML 预览包进昼夜底色壳（不改页面自带样式优先级过高的规则时，至少统一默认底） */

export function wrapHtmlForWorkbenchPreview(html: string, isDark: boolean): string {
  const bg = isDark ? "#181818" : "#fcfcfc";
  const fg = isDark ? "#d4d4d4" : "#141414";
  const scheme = isDark ? "dark" : "light";
  const inject =
    `<meta name="color-scheme" content="${scheme}">` +
    `<style data-workbench-preview-theme>` +
    `html{color-scheme:${scheme}}` +
    `html,body{background-color:${bg};color:${fg}}` +
    `</style>`;

  const src = String(html || "");
  if (/<head[\s>]/i.test(src)) {
    return src.replace(/<head([^>]*)>/i, `<head$1>${inject}`);
  }
  if (/<html[\s>]/i.test(src)) {
    return src.replace(/<html([^>]*)>/i, `<html$1><head>${inject}</head>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${inject}</head><body>${src}</body></html>`;
}
