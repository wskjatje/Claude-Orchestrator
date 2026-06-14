#!/usr/bin/env bash
# 修正 CC Switch 中「Gemini Native」供应商 env，并设为当前 Claude Code provider。
# 前提：ccr start 已运行（http://127.0.0.1:3456）。
set -euo pipefail

MODEL="${1:-gemini-2.5-flash}"
ROUTER_BASE="${GEMINI_ROUTER_BASE:-http://127.0.0.1:3456}"

python3 <<PY
import json, sqlite3
from pathlib import Path

home = Path.home()
env = {
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_AUTH_TOKEN": "gemini",
    "ANTHROPIC_BASE_URL": "${ROUTER_BASE}",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "${MODEL}",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "${MODEL}",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "${MODEL}",
    "CLAUDE_CODE_DISABLE_1M_CONTEXT": "1",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "8192",
    "LANG": "zh_CN.UTF-8",
    "LC_ALL": "zh_CN.UTF-8",
}
settings = {"language": "chinese", "env": env}

db = home / ".cc-switch" / "cc-switch.db"
conn = sqlite3.connect(db)
conn.execute("UPDATE providers SET is_current=0 WHERE app_type='claude'")
conn.execute(
    "UPDATE providers SET is_current=1, settings_config=? WHERE id='gemini-native-new' AND app_type='claude'",
    (json.dumps(settings, ensure_ascii=False),),
)
conn.commit()
conn.close()

cc = json.loads((home / ".cc-switch" / "settings.json").read_text())
cc["currentProviderClaude"] = "gemini-native-new"
(home / ".cc-switch" / "settings.json").write_text(json.dumps(cc, indent=2, ensure_ascii=False) + "\n")

cs = home / ".claude" / "settings.json"
d = json.loads(cs.read_text()) if cs.exists() else {}
d["\$schema"] = "https://json.schemastore.org/claude-code-settings.json"
d["language"] = "chinese"
d["env"] = env
cs.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print("已切换到 gemini-native-new，模型:", "${MODEL}")
print("BASE_URL:", "${ROUTER_BASE}")
print("请退出 CC Switch 后重新打开，再用 CC Switch 启动 Claude Code。")
PY
