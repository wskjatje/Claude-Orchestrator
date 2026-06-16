import { g as getDesktop } from "./router-CCRumuR1.js";
async function openExternalUrl(url) {
  const d = getDesktop();
  if (d?.openExternal) {
    await d.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
export {
  openExternalUrl as o
};
