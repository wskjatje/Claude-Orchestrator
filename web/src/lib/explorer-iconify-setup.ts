import { addCollection } from "@iconify/react";
import vscodeIcons from "@iconify-json/vscode-icons/icons.json";

let loaded = false;

/** 离线加载 vscode-icons，避免 CDN 回退到错误图标 */
export function ensureVscodeIcons() {
  if (loaded) return;
  addCollection(vscodeIcons);
  loaded = true;
}
