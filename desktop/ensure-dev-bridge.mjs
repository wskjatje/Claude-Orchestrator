/**
 * Electron 开发模式：若本机 Bridge 未运行则自动拉起（与 run-dev.mjs 行为对齐）。
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getBridgeHealthUrl,
  getWorkbenchHttpPort,
} from "../server/bridge-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** @type {import('node:child_process').ChildProcess | null} */
let bridgeChild = null;

async function waitUrl(url, attempts = 80, ms = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, ms));
  }
  return false;
}

export async function ensureDevBridge() {
  const health = getBridgeHealthUrl();
  // 先等待已有 Bridge（如 run-dev / 单独 npm run bridge）
  if (await waitUrl(health, 16, 250)) return true;

  if (!bridgeChild) {
    const script = path.join(ROOT, "server", "index.mjs");
    const preload = path.join(ROOT, "scripts", "ensure-dev-native-preload.mjs");
    console.log(
      `[desktop] 本机 Bridge 未在 :${getWorkbenchHttpPort()} 就绪，正在启动…`,
    );
    bridgeChild = spawn(
      process.execPath,
      ["--import", preload, script],
      {
        cwd: ROOT,
        env: { ...process.env, MCP_STARTUP_HEALTH: "delayed" },
        stdio: "inherit",
      },
    );
    bridgeChild.on("exit", () => {
      bridgeChild = null;
    });
  }

  return waitUrl(health, 120, 250);
}

export function stopDevBridge() {
  if (!bridgeChild) return;
  try {
    bridgeChild.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  bridgeChild = null;
}
