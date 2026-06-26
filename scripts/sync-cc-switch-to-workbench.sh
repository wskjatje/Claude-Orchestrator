#!/usr/bin/env bash
# 从 CC Switch 当前 Claude Code 供应商读取 env，写入 ~/.claude/settings.json，
# 并同步 Web Bridge 的 chat-settings.json（模型、ollamaBase 等）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export ROOT

python3 <<'PY'
import json
import os
import sqlite3
from pathlib import Path

home = Path.home()
root = Path(os.environ["ROOT"])
db = home / ".cc-switch" / "cc-switch.db"
wb = home / ".claude-workbench"
cs = home / ".claude" / "settings.json"
cc_switch_settings = home / ".cc-switch" / "settings.json"

if not db.exists():
    raise SystemExit("未找到 ~/.cc-switch/cc-switch.db，请先安装并配置 CC Switch")

conn = sqlite3.connect(db)
cols = [r[1] for r in conn.execute("PRAGMA table_info(providers)").fetchall()]
row = conn.execute(
    "SELECT * FROM providers WHERE app_type='claude' AND is_current=1 LIMIT 1"
).fetchone()
conn.close()

if not row:
    raise SystemExit("CC Switch 中无当前 Claude Code 供应商，请在 CC Switch 中启用一个 profile")

d = dict(zip(cols, row))
provider_id = d["id"]
cfg = json.loads(d.get("settings_config") or "{}")
env = dict(cfg.get("env") or {})
language = cfg.get("language") or "chinese"

# 合并项目治理项（不写死 provider / 模型）
project_cs = root / ".claude/settings.json"
project_env = {}
if project_cs.exists():
    try:
        project_env = json.loads(project_cs.read_text()).get("env") or {}
    except Exception:
        pass
for k, v in project_env.items():
    if k.startswith("CLAUDE_CODE_") or k in ("LANG", "LC_ALL"):
        env.setdefault(k, v)

# ~/.claude/settings.json
cs.parent.mkdir(parents=True, exist_ok=True)
global_cfg = json.loads(cs.read_text()) if cs.exists() else {}
global_cfg["language"] = language
global_cfg["env"] = env
if '$schema' not in global_cfg:
    global_cfg['$schema'] = 'https://json.schemastore.org/claude-code-settings.json'
cs.write_text(json.dumps(global_cfg, indent=2, ensure_ascii=False) + "\n")

# 解析模型与 Ollama base
model = (
    env.get("ANTHROPIC_DEFAULT_SONNET_MODEL")
    or env.get("ANTHROPIC_DEFAULT_HAIKU_MODEL")
    or env.get("ANTHROPIC_DEFAULT_OPUS_MODEL")
    or "sonnet"
)
if not model or str(model).strip() in ("", "#"):
    model = "sonnet"
base_url = env.get("ANTHROPIC_BASE_URL", "")
ollama_base = "http://127.0.0.1:11434"
if "11434" in base_url:
    ollama_base = base_url.rstrip("/")
elif base_url:
    ollama_base = "http://127.0.0.1:11434"

orchestration_mode = "claude-code"
if provider_id == "ollama-local" or "11434" in base_url:
    orchestration_mode = "claude-code"

# chat-settings.json
wb.mkdir(parents=True, exist_ok=True)
chat_path = wb / "chat-settings.json"
cur = {}
if chat_path.exists():
    try:
        cur = json.loads(chat_path.read_text())
    except Exception:
        pass

next_settings = {
    "ollamaBase": cur.get("ollamaBase") or ollama_base,
    "model": model,
    "localOllamaModel": env.get("ANTHROPIC_DEFAULT_SONNET_MODEL")
    if "11434" in base_url
    else cur.get("localOllamaModel") or "",
    "claudeCliPath": cur.get("claudeCliPath") or "",
    "orchestrationMode": cur.get("orchestrationMode") or orchestration_mode,
    "localAgentBasename": cur.get("localAgentBasename") or "",
    "defaultConfirmWritePath": cur.get("defaultConfirmWritePath") or "",
    "mcpConfigAbsolutePath": cur.get("mcpConfigAbsolutePath") or "",
    "devMcpOrchDebug": cur.get("devMcpOrchDebug") if "devMcpOrchDebug" in cur else False,
}
chat_path.write_text(json.dumps(next_settings, indent=2, ensure_ascii=False) + "\n")

# 同步已有会话的 modelId
sessions_path = wb / "chat-sessions.json"
if sessions_path.exists():
    try:
        sess = json.loads(sessions_path.read_text())
        changed = False
        for s in sess.get("sessions") or []:
            if isinstance(s, dict) and s.get("modelId") != model:
                s["modelId"] = model
                changed = True
        if changed:
            sessions_path.write_text(json.dumps(sess, indent=2, ensure_ascii=False) + "\n")
            print("已更新 chat-sessions.json 中所有会话 modelId →", model)
    except Exception as e:
        print("警告：chat-sessions 同步跳过:", e)

print("=== CC Switch → Workbench 同步完成 ===")
print("当前供应商:", provider_id)
print("BASE_URL:", base_url or "(Claude Official 默认)")
print("Web 界面 model:", model)
print("~/.claude/settings.json env 键:", ", ".join(sorted(env.keys())) or "(空)")
print("chat-settings:", chat_path)
print("")
print("请重启 Web Bridge（npm run web:dev:full）并刷新浏览器。")
PY

echo "==> 写入项目 SQLite（.claudecode/workbench.db）…"
node --input-type=module <<'NODE'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  loadChatSettings,
  saveChatSettings,
  loadChatSessions,
  saveChatSessions,
  getProjectDbInfo,
} from './server/store.mjs'

const legacyDir = path.join(os.homedir(), '.claude-workbench')
const settingsPath = path.join(legacyDir, 'chat-settings.json')
const sessionsPath = path.join(legacyDir, 'chat-sessions.json')

if (fs.existsSync(settingsPath)) {
  try {
    const patch = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    saveChatSettings({ ...loadChatSettings(), ...patch })
    console.log('chat-settings →', getProjectDbInfo().dbPath)
  } catch (e) {
    console.warn('chat-settings 写入 SQLite 跳过:', e?.message || e)
  }
}

if (fs.existsSync(sessionsPath)) {
  try {
    const sess = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'))
    if (Array.isArray(sess.sessions) && sess.sessions.length) {
      saveChatSessions(sess)
      console.log('chat-sessions →', getProjectDbInfo().dbPath)
    }
  } catch (e) {
    console.warn('chat-sessions 写入 SQLite 跳过:', e?.message || e)
  }
}
NODE
